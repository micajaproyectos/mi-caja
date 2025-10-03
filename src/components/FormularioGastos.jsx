import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { 
  obtenerFechaHoyChile, 
  formatearFechaChile,
  formatearFechaCortaChile,
  obtenerAniosUnicos
} from '../lib/dateUtils.js';
import Footer from './Footer';

const FormularioGastos = () => {
  const navigate = useNavigate();
  
  // Log de inicialización (solo en desarrollo y una vez)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 FormularioGastos: Componente iniciando...');
  }
  
  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const obtenerFechaActual = () => {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Estado del formulario
  const [gasto, setGasto] = useState({
    fecha: obtenerFechaActual(), // Inicializar con fecha actual
    tipo_gasto: '',
    detalle: '',
    monto: '',
    forma_pago: ''
  });

  // Estados para la gestión de datos
  const [gastosRegistrados, setGastosRegistrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(false); // Cambiado a false para testing
  const [error, setError] = useState(null);

  // Estados para filtros
  const [busquedaDetalle, setBusquedaDetalle] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1); // Mes actual por defecto
  const [filtroAnio, setFiltroAnio] = useState(2025); // Año 2025 por defecto
  const [filtroTipoGasto, setFiltroTipoGasto] = useState('');
  const [filtroFormaPago, setFiltroFormaPago] = useState('');

  // Estados para edición inline
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEdicion, setValoresEdicion] = useState({
    fecha: '',
    tipo_gasto: '',
    detalle: '',
    monto: '',
    forma_pago: ''
  });

  // Opciones para los selectores
  const opcionesTipoGasto = [
    { value: 'Fijo', label: 'Fijo' },
    { value: 'Variable', label: 'Variable' }
  ];

  const opcionesFormaPago = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Débito', label: 'Débito' },
    { value: 'Transferencia', label: 'Transferencia' }
  ];

  // Función para formatear números
  const formatearNumero = (numero) => {
    return Number(numero).toLocaleString('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Función para formatear fecha para mostrar
  const formatearFechaMostrar = (fechaString) => {
    if (!fechaString) return '';
    const fecha = new Date(fechaString);
    const year = fecha.getUTCFullYear();
    const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const day = String(fecha.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  // Función para obtener meses únicos
  const obtenerMesesUnicos = () => {
    return [
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Septiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' }
    ];
  };

  // Función para obtener años únicos basado en los gastos registrados
  const obtenerAniosUnicosLocal = () => {
    const anios = new Set();
    
    // Solo incluir el año 2025 por defecto
    anios.add(2025);
    
    // Solo agregar años FUTUROS (posteriores a 2025) si hay gastos en esos años
    gastosRegistrados.forEach(gasto => {
      const fechaGasto = gasto.fecha_cl || gasto.fecha;
      if (fechaGasto) {
        const anio = parseInt(fechaGasto.split('-')[0]);
        // Solo agregar si es un año futuro (mayor a 2025)
        if (!isNaN(anio) && anio > 2025) {
          anios.add(anio);
        }
      }
    });
    
    // Convertir a array y ordenar de mayor a menor
    return Array.from(anios).sort((a, b) => b - a);
  };

  // Función para cargar gastos registrados filtrados por usuario
  const cargarGastos = async () => {
    // Log de función (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 cargarGastos: Función llamada');
  }
    try {
      setLoadingDatos(true);
      setError(null);
      
      // Obtener usuario autenticado
      const usuario = await authService.getCurrentUser();
      if (!usuario) {
        if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 No hay usuario autenticado');
      }
        setGastosRegistrados([]);
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Usuario autenticado:', usuario.id);
      }
      
      // Consultar gastos desde Supabase
      const { data: gastos, error } = await supabase
        .from('gasto')
        .select('*')
        .eq('usuario_id', usuario.id)
        .order('fecha_cl', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar gastos desde Supabase:', error);
        setError('Error al cargar los gastos desde la base de datos');
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Gastos cargados desde Supabase:', gastos?.length || 0);
      }
      setGastosRegistrados(gastos || []);
      
    } catch (error) {
      console.error('Error inesperado al cargar gastos:', error);
      setError('Error inesperado al cargar los datos');
    } finally {
      setLoadingDatos(false);
    }
  };

  // Función para manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setGasto(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para registrar un nuevo gasto
  const registrarGasto = async (e) => {
    e.preventDefault();
    // Log de función (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 registrarGasto: Función llamada');
    }
    
    // Validaciones
    if (!gasto.fecha || !gasto.tipo_gasto || !gasto.detalle || !gasto.monto || !gasto.forma_pago) {
      setError('Por favor, complete todos los campos');
      return;
    }

    if (Number(gasto.monto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (process.env.NODE_ENV !== 'production') {
        console.log('💰 Registrando gasto:', gasto);
      }

      // Obtener usuario autenticado
      const usuario = await authService.getCurrentUser();
      if (!usuario) {
        setError('No hay usuario autenticado');
        return;
      }

      // Preparar datos para insertar en Supabase
      const datosGasto = {
        fecha: gasto.fecha,
        // fecha_cl es una columna generada automáticamente, no se puede insertar manualmente
        tipo_gasto: gasto.tipo_gasto,
        detalle: gasto.detalle,
        monto: Number(gasto.monto),
        forma_pago: gasto.forma_pago,
        usuario_id: usuario.id
      };

      // Insertar en Supabase
      const { data: nuevoGasto, error } = await supabase
        .from('gasto')
        .insert(datosGasto)
        .select()
        .single();

      if (error) {
        console.error('Error al insertar gasto en Supabase:', error);
        setError('Error al registrar el gasto en la base de datos');
        return;
      }

      // Actualizar estado local
      setGastosRegistrados(prev => [nuevoGasto, ...prev]);

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Gasto registrado exitosamente en Supabase:', nuevoGasto);
      }

      // Limpiar formulario
      setGasto({
        fecha: obtenerFechaActual(),
        tipo_gasto: '',
        detalle: '',
        monto: '',
        forma_pago: ''
      });

    } catch (error) {
      console.error('Error inesperado al registrar gasto:', error);
      setError('Error inesperado al registrar el gasto');
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar un gasto
  const eliminarGasto = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este gasto?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Eliminar de Supabase
      const { error } = await supabase
        .from('gasto')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar gasto de Supabase:', error);
        setError('Error al eliminar el gasto de la base de datos');
        return;
      }

      // Actualizar estado local
      setGastosRegistrados(prev => prev.filter(g => g.id !== id));
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Gasto eliminado exitosamente de Supabase');
      }

    } catch (error) {
      console.error('Error inesperado al eliminar gasto:', error);
      setError('Error inesperado al eliminar el gasto');
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar la edición de un gasto
  const iniciarEdicion = (gasto) => {
    console.log('🔍 Iniciando edición de gasto:', gasto.id, 'Tipo:', typeof gasto.id);
    setEditandoId(gasto.id);
    setValoresEdicion({
      fecha: gasto.fecha_cl || gasto.fecha,
      tipo_gasto: gasto.tipo_gasto,
      detalle: gasto.detalle,
      monto: gasto.monto.toString(),
      forma_pago: gasto.forma_pago
    });
  };

  // Función para cancelar la edición
  const cancelarEdicion = () => {
    setEditandoId(null);
    setValoresEdicion({
      fecha: '',
      tipo_gasto: '',
      detalle: '',
      monto: '',
      forma_pago: ''
    });
  };

  // Función para manejar cambios en los campos editables
  const handleEdicionChange = (campo, valor) => {
    setValoresEdicion(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Función para guardar la edición
  const guardarEdicion = async (id) => {
    try {
      // Validaciones
      if (!valoresEdicion.fecha || !valoresEdicion.tipo_gasto || !valoresEdicion.detalle || 
          !valoresEdicion.monto || !valoresEdicion.forma_pago) {
        alert('⚠️ Todos los campos son obligatorios');
        return;
      }

      if (parseFloat(valoresEdicion.monto) <= 0) {
        alert('⚠️ El monto debe ser mayor a 0');
        return;
      }

      // Validar que el ID sea válido
      if (!id) {
        alert('❌ Error: ID del gasto no válido');
        return;
      }

      setLoading(true);

      // Obtener el usuario_id del usuario autenticado
      const usuario = await authService.getCurrentUser();
      if (!usuario) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      // Log para debugging
      console.log('🔍 Editando gasto con ID:', id, 'Tipo:', typeof id);

      // Intentar la actualización
      let query = supabase
        .from('gasto')
        .update({
          fecha: valoresEdicion.fecha,
          tipo_gasto: valoresEdicion.tipo_gasto,
          detalle: valoresEdicion.detalle.trim(),
          monto: parseFloat(valoresEdicion.monto),
          forma_pago: valoresEdicion.forma_pago
        })
        .eq('usuario_id', usuario.id); // 🔒 SEGURIDAD: Solo editar gastos del usuario actual

      // Intentar usar el ID tal como viene
      const { error } = await query.eq('id', id);

      if (error) {
        console.error('❌ Error al actualizar gasto:', error);
        alert('❌ Error al actualizar el gasto: ' + error.message);
        return;
      }

      alert('✅ Gasto actualizado exitosamente');
      cancelarEdicion();
      await cargarGastos();

    } catch (error) {
      console.error('❌ Error inesperado al actualizar gasto:', error);
      alert('❌ Error inesperado al actualizar el gasto');
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar todos los filtros (excepto mes y año actual)
  const limpiarFiltros = () => {
    setBusquedaDetalle('');
    setFiltroFecha('');
    setFiltroMes(new Date().getMonth() + 1); // Volver al mes actual
    setFiltroAnio(2025); // Volver al año 2025
    setFiltroTipoGasto('');
    setFiltroFormaPago('');
  };

  // Filtrar gastos
  const gastosFiltrados = gastosRegistrados.filter(item => {
    // Filtro por detalle (búsqueda de texto)
    const coincideDetalle = !busquedaDetalle || 
      item.detalle?.toLowerCase().includes(busquedaDetalle.toLowerCase());
    
    // Obtener fecha para filtros (priorizar fecha_cl, fallback a fecha)
    const fechaFiltro = item.fecha_cl || item.fecha;
    
    // Filtro por fecha específica
    const coincideFecha = !filtroFecha || fechaFiltro === filtroFecha;
    
    // Filtro por mes (siempre aplicado, por defecto mes actual)
    const coincideMes = (() => {
      if (!fechaFiltro) return false;
      if (!filtroMes) return true; // Mostrar todos los meses del año seleccionado
      const [, month] = fechaFiltro.split('-');
      return parseInt(month) === parseInt(filtroMes);
    })();
    
    // Filtro por año (siempre aplicado, por defecto año actual)
    const coincideAnio = (() => {
      if (!fechaFiltro) return false;
      const year = fechaFiltro.split('-')[0];
      return parseInt(year) === parseInt(filtroAnio);
    })();
    
    // Filtro por tipo de gasto
    const coincideTipoGasto = !filtroTipoGasto || item.tipo_gasto === filtroTipoGasto;
    
    // Filtro por forma de pago
    const coincideFormaPago = !filtroFormaPago || item.forma_pago === filtroFormaPago;
    
    // Todos los filtros deben coincidir
    return coincideDetalle && coincideFecha && coincideMes && coincideAnio && coincideTipoGasto && coincideFormaPago;
  });

  // Log de debugging para filtros (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production' && (filtroMes || filtroAnio || filtroTipoGasto || filtroFormaPago)) {
    console.log('🔍 Estado de filtros:', {
      filtros: { filtroMes, filtroAnio, filtroTipoGasto, filtroFormaPago },
      totalRegistros: gastosRegistrados.length,
      totalFiltrados: gastosFiltrados.length,
      gastosFiltrados: gastosFiltrados.map(g => ({
        id: g.id,
        detalle: g.detalle,
        fecha: g.fecha_cl || g.fecha,
        tipo_gasto: g.tipo_gasto,
        forma_pago: g.forma_pago
      }))
    });
  }

  // Calcular totales
  const totalGastos = gastosFiltrados.reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
  const totalGastosFijos = gastosFiltrados
    .filter(item => item.tipo_gasto === 'Fijo')
    .reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
  const totalGastosVariables = gastosFiltrados
    .filter(item => item.tipo_gasto === 'Variable')
    .reduce((sum, item) => sum + (Number(item.monto) || 0), 0);

  // Cargar datos al montar el componente
  useEffect(() => {
    // Log de montaje (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 useEffect: Componente montado');
  }
    cargarGastos();
    // Establecer fecha actual por defecto
    setGasto(prev => ({
      ...prev,
      fecha: obtenerFechaActual()
    }));
  }, []);

  // Log cuando cambien los filtros (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Filtros actualizados:', {
        busquedaDetalle,
        filtroFecha,
        filtroMes,
        filtroAnio,
        filtroTipoGasto,
        filtroFormaPago
      });
    }
  }, [busquedaDetalle, filtroFecha, filtroMes, filtroAnio, filtroTipoGasto, filtroFormaPago]);

  // Log de renderizado (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 FormularioGastos: Renderizando componente...');
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#1a3d1a' }}>
      {/* Fondo degradado moderno */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          background: `
            linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
            radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `
        }}
      />

      {/* Efecto de vidrio esmerilado adicional */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/5"></div>

      {/* Contenido principal */}
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Botón de regreso */}
          <div className="mb-4 md:mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium text-sm md:text-base"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-lg md:text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Control de Gastos
          </h1>

          {/* Formulario de registro */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-semibold text-green-400 mb-4 md:mb-6 text-center">
              Registrar Nuevo Gasto
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={registrarGasto} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                {/* Fecha */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={gasto.fecha}
                    onChange={handleChange}
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                    required
                  />
                </div>

                {/* Tipo de Gasto */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Tipo de Gasto
                  </label>
                  <select
                    name="tipo_gasto"
                    value={gasto.tipo_gasto}
                    onChange={handleChange}
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                    required
                  >
                    <option value="">Seleccionar tipo</option>
                    {opcionesTipoGasto.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Forma de Pago */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Forma de Pago
                  </label>
                  <select
                    name="forma_pago"
                    value={gasto.forma_pago}
                    onChange={handleChange}
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                    required
                  >
                    <option value="">Seleccionar método</option>
                    {opcionesFormaPago.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detalle */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Detalle
                </label>
                <input
                  type="text"
                  name="detalle"
                  value={gasto.detalle}
                  onChange={handleChange}
                  placeholder="Descripción del gasto..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                  required
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Monto
                </label>
                <input
                  type="number"
                  name="monto"
                  value={gasto.monto}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                  required
                />
              </div>

              {/* Botón de registro */}
              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg transition-colors flex items-center mx-auto text-sm md:text-base"
                >
                  <span className="mr-2">💰</span>
                  {loading ? 'Registrando...' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>

          {/* Filtros */}
          {gastosRegistrados.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-semibold text-green-400 mb-4 text-center">
                Filtros de Búsqueda
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6 mb-4">
                {/* Búsqueda por detalle */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Buscar por detalle
                  </label>
                  <input
                    type="text"
                    value={busquedaDetalle}
                    onChange={(e) => setBusquedaDetalle(e.target.value)}
                    placeholder="Buscar en detalles..."
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                  />
                </div>

                {/* Filtro por fecha */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Filtrar por fecha
                  </label>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                  />
                </div>

                {/* Filtro por mes */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Filtrar por mes
                  </label>
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                  >
                    <option value="">Todos los meses</option>
                    {obtenerMesesUnicos().map(mes => (
                      <option key={mes.value} value={mes.value} className="bg-gray-800 text-white">
                        {mes.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por año */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Filtrar por año
                  </label>
                  <select
                    value={filtroAnio}
                    onChange={(e) => setFiltroAnio(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                  >
                    <option value="">Todos los años</option>
                    {obtenerAniosUnicosLocal().map(anio => (
                      <option key={anio} value={anio} className="bg-gray-800 text-white">
                        {anio}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por tipo de gasto */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Tipo de gasto
                  </label>
                  <select
                    value={filtroTipoGasto}
                    onChange={(e) => setFiltroTipoGasto(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                  >
                    <option value="">Todos los tipos</option>
                    {opcionesTipoGasto.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por forma de pago */}
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Forma de pago
                  </label>
                  <select
                    value={filtroFormaPago}
                    onChange={(e) => setFiltroFormaPago(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-xs md:text-sm"
                  >
                    <option value="">Todos los métodos</option>
                    {opcionesFormaPago.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filtros activos */}
              {(busquedaDetalle || filtroFecha || filtroTipoGasto || filtroFormaPago || 
                filtroMes !== new Date().getMonth() + 1 || filtroAnio !== 2025) && (
                <div className="mb-4">
                  <p className="text-gray-300 text-sm mb-2">Filtros activos:</p>
                  <div className="flex flex-wrap gap-2">
                    {busquedaDetalle && (
                      <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs">
                        <span>🔍 "{busquedaDetalle}"</span>
                        <button onClick={() => setBusquedaDetalle('')} className="text-blue-400 hover:text-white">✕</button>
                      </span>
                    )}
                    {filtroFecha && (
                      <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs">
                        <span>📅 {formatearFechaMostrar(filtroFecha)}</span>
                        <button onClick={() => setFiltroFecha('')} className="text-green-400 hover:text-white">✕</button>
                      </span>
                    )}
                    {filtroMes !== new Date().getMonth() + 1 && (
                      <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs">
                        <span>📆 {obtenerMesesUnicos().find(m => m.value === Number(filtroMes))?.label}</span>
                        <button onClick={() => setFiltroMes(new Date().getMonth() + 1)} className="text-purple-400 hover:text-white">✕</button>
                      </span>
                    )}
                    {filtroAnio !== 2025 && (
                      <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs">
                        <span>📅 {filtroAnio}</span>
                        <button onClick={() => setFiltroAnio(2025)} className="text-yellow-400 hover:text-white">✕</button>
                      </span>
                    )}
                    {filtroTipoGasto && (
                      <span className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full text-xs">
                        <span>🏷️ {filtroTipoGasto}</span>
                        <button onClick={() => setFiltroTipoGasto('')} className="text-indigo-400 hover:text-white">✕</button>
                      </span>
                    )}
                    {filtroFormaPago && (
                      <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full text-xs">
                        <span>💳 {filtroFormaPago}</span>
                        <button onClick={() => setFiltroFormaPago('')} className="text-orange-400 hover:text-white">✕</button>
                      </span>
                    )}
                  </div>
                  
                  {/* Botón para limpiar todos los filtros */}
                  <div className="mt-3 text-center">
                    <button
                      onClick={limpiarFiltros}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      🧹 Limpiar Filtros
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabla de gastos registrados */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <h3 className="text-lg md:text-xl font-semibold text-green-400 mb-4 md:mb-6 text-center">
              Gastos Registrados
            </h3>
            


            {loadingDatos ? (
              <div className="text-center py-6 md:py-8">
                <div className="inline-block animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-green-400"></div>
                <p className="text-white mt-3 md:mt-4 text-sm md:text-base">Cargando gastos...</p>
              </div>
            ) : gastosRegistrados.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <div className="text-gray-400 text-3xl md:text-4xl mb-3 md:mb-4">💰</div>
                <p className="text-gray-300 text-base md:text-lg font-bold">No hay gastos registrados</p>
                <p className="text-gray-500 mt-2 text-sm md:text-base">
                  Registra tu primer gasto usando el formulario de arriba
                </p>
              </div>
            ) : gastosFiltrados.length === 0 && filtroMes === new Date().getMonth() + 1 && filtroAnio === 2025 && 
               !busquedaDetalle && !filtroFecha && !filtroTipoGasto && !filtroFormaPago ? (
              <div className="text-center py-6 md:py-8">
                <div className="text-yellow-400 text-3xl md:text-4xl mb-3 md:mb-4">📅</div>
                <p className="text-yellow-300 text-base md:text-lg font-bold">No hay gastos este mes</p>
                <p className="text-gray-400 mt-2 text-sm md:text-base">
                  <span className="text-blue-400">Usa los filtros para ver otros períodos</span>
                </p>
              </div>
            ) : (
              <>
                {/* Información de filtros aplicados */}
                {(busquedaDetalle || filtroFecha || filtroTipoGasto || filtroFormaPago || 
                  filtroMes !== new Date().getMonth() + 1 || filtroAnio !== 2025) && (
                  <div className="mb-4 p-3 bg-blue-600/20 backdrop-blur-sm rounded-lg border border-blue-500/30">
                    <p className="text-blue-200 text-sm text-center">
                      <strong>Filtros aplicados:</strong> 
                      {busquedaDetalle && ` Búsqueda: "${busquedaDetalle}"`}
                      {filtroFecha && ` Fecha: ${formatearFechaMostrar(filtroFecha)}`}
                      {filtroMes !== new Date().getMonth() + 1 && ` Mes: ${obtenerMesesUnicos().find(m => m.value === parseInt(filtroMes))?.label}`}
                      {filtroAnio !== 2025 && ` Año: ${filtroAnio}`}
                      {filtroTipoGasto && ` Tipo: ${filtroTipoGasto}`}
                      {filtroFormaPago && ` Pago: ${filtroFormaPago}`}
                      {` | Mostrando ${gastosFiltrados.length} de ${gastosRegistrados.length} registros totales`}
                    </p>
                  </div>
                )}

                {/* Estadísticas */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 md:gap-6 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-center">
                      <p className="text-gray-300 text-xs md:text-sm font-medium">Total Gastos</p>
                      <p className="text-white text-lg md:text-xl font-bold">
                        ${formatearNumero(totalGastos)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-center">
                      <p className="text-gray-300 text-xs md:text-sm font-medium">Gastos Fijos</p>
                      <p className="text-blue-300 text-lg md:text-xl font-bold">
                        ${formatearNumero(totalGastosFijos)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-center">
                      <p className="text-gray-300 text-xs md:text-sm font-medium">Gastos Variables</p>
                      <p className="text-green-300 text-lg md:text-xl font-bold">
                        ${formatearNumero(totalGastosVariables)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-center">
                      <p className="text-gray-300 text-xs md:text-sm font-medium">Registros</p>
                      <p className="text-green-300 text-lg md:text-xl font-bold">
                        {gastosFiltrados.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mensaje cuando no hay resultados después de filtrar */}
                {gastosFiltrados.length === 0 && (busquedaDetalle || filtroFecha || filtroTipoGasto || filtroFormaPago || 
                  filtroMes !== new Date().getMonth() + 1 || filtroAnio !== 2025) ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-yellow-400 text-3xl md:text-4xl mb-3 md:mb-4">🔍</div>
                    <p className="text-yellow-300 text-base md:text-lg font-bold">No se encontraron gastos con los filtros aplicados</p>
                    <p className="text-gray-400 mt-2 text-sm md:text-base">
                      Intenta con otros filtros o <button onClick={limpiarFiltros} className="text-blue-400 hover:text-blue-300 underline">limpiar todos los filtros</button>
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="bg-white/10 backdrop-blur-sm">
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Fecha</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Tipo</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Detalle</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Monto</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Forma Pago</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gastosFiltrados.map((item, index) => {
                          const estaEditando = editandoId === item.id;
                          
                          return (
                            <tr key={item.id || index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                              {/* Fecha */}
                              <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                                {estaEditando ? (
                                  <input
                                    type="date"
                                    value={valoresEdicion.fecha}
                                    onChange={(e) => handleEdicionChange('fecha', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  formatearFechaMostrar(item.fecha_cl || item.fecha)
                                )}
                              </td>

                              {/* Tipo de Gasto */}
                              <td className="p-2 md:p-4">
                                {estaEditando ? (
                                  <select
                                    value={valoresEdicion.tipo_gasto}
                                    onChange={(e) => handleEdicionChange('tipo_gasto', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  >
                                    <option value="Fijo" className="bg-gray-800 text-white">Fijo</option>
                                    <option value="Variable" className="bg-gray-800 text-white">Variable</option>
                                  </select>
                                ) : (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    item.tipo_gasto === 'Fijo' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {item.tipo_gasto}
                                  </span>
                                )}
                              </td>

                              {/* Detalle */}
                              <td className="text-white p-2 md:p-4 font-medium text-xs md:text-sm truncate max-w-32 md:max-w-48">
                                {estaEditando ? (
                                  <input
                                    type="text"
                                    value={valoresEdicion.detalle}
                                    onChange={(e) => handleEdicionChange('detalle', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Detalle del gasto"
                                  />
                                ) : (
                                  item.detalle || 'Sin detalle'
                                )}
                              </td>

                              {/* Monto */}
                              <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm font-semibold">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="1"
                                    value={valoresEdicion.monto}
                                    onChange={(e) => handleEdicionChange('monto', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="0"
                                  />
                                ) : (
                                  `$${formatearNumero(item.monto)}`
                                )}
                              </td>

                              {/* Forma de Pago */}
                              <td className="p-2 md:p-4">
                                {estaEditando ? (
                                  <select
                                    value={valoresEdicion.forma_pago}
                                    onChange={(e) => handleEdicionChange('forma_pago', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  >
                                    <option value="Efectivo" className="bg-gray-800 text-white">Efectivo</option>
                                    <option value="Débito" className="bg-gray-800 text-white">Débito</option>
                                    <option value="Transferencia" className="bg-gray-800 text-white">Transferencia</option>
                                  </select>
                                ) : (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    item.forma_pago === 'Efectivo' 
                                      ? 'bg-green-100 text-green-800'
                                      : item.forma_pago === 'Débito'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {item.forma_pago}
                                  </span>
                                )}
                              </td>

                              {/* Acciones */}
                              <td className="p-2 md:p-4">
                                {estaEditando ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => guardarEdicion(item.id)}
                                      disabled={loading}
                                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Guardar cambios"
                                    >
                                      ✅
                                    </button>
                                    <button
                                      onClick={cancelarEdicion}
                                      disabled={loading}
                                      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Cancelar edición"
                                    >
                                      ❌
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => iniciarEdicion(item)}
                                      disabled={loading}
                                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Editar gasto"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => eliminarGasto(item.id)}
                                      disabled={loading}
                                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                    >
                                      🗑️ Eliminar
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default FormularioGastos; 