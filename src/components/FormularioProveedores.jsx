import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { 
  obtenerFechaHoyChile, 
  formatearFechaChile,
  formatearFechaCortaChile
} from '../lib/dateUtils.js';
import Footer from './Footer';

const FormularioProveedores = () => {
  const navigate = useNavigate();
  
  // Estado del formulario
  const [proveedor, setProveedor] = useState({
    fecha: obtenerFechaHoyChile(),
    nombre_proveedor: '',
    monto: '',
    estado: 'Pendiente'
  });

  // Estados para la gestión de datos
  const [proveedoresRegistrados, setProveedoresRegistrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [error, setError] = useState(null);

  // Estados para filtros
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Opciones para el selector de estado
  const opcionesEstado = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Pagado', label: 'Pagado' }
  ];

  // Opciones para el selector de meses
  const opcionesMeses = [
    { value: '', label: 'Todos los meses' },
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];

  // Función para obtener la fecha actual en Chile
  const obtenerFechaActual = () => {
    const fechaFormateada = obtenerFechaHoyChile();
    console.log('📅 Fecha actual generada (Chile):', fechaFormateada);
    return fechaFormateada;
  };

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

  // Cargar proveedores desde Supabase
  const cargarProveedores = async () => {
    try {
      setLoadingDatos(true);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setProveedoresRegistrados([]);
        return;
      }

      let query = supabase
        .from('proveedores')
        .select('id, fecha, fecha_cl, nombre_proveedor, monto, estado, fecha_pago, usuario_id, created_at')
        .eq('usuario_id', usuarioId) // 🔒 FILTRO CRÍTICO POR USUARIO
        .order('fecha_cl', { ascending: false })
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (busquedaProveedor) {
        query = query.ilike('nombre_proveedor', `%${busquedaProveedor}%`);
      }
      if (filtroFecha) {
        query = query.eq('fecha_cl', filtroFecha);
      }
      if (filtroMes) {
        // Filtrar por mes usando el formato YYYY-MM
        const fechaActual = new Date();
        const year = fechaActual.getFullYear();
        const mesFormateado = filtroMes.padStart(2, '0');
        const fechaInicio = `${year}-${mesFormateado}-01`;
        
        // Calcular la fecha final del mes correctamente
        const fechaFin = new Date(year, parseInt(filtroMes), 0); // Último día del mes
        const fechaFinFormateada = fechaFin.toISOString().split('T')[0];
        
        query = query.gte('fecha_cl', fechaInicio).lte('fecha_cl', fechaFinFormateada);
      }
      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log(`📋 Proveedores cargados para usuario ${usuarioId}:`, data?.length || 0);
      console.log('🔍 Filtros aplicados:', { busquedaProveedor, filtroFecha, filtroMes, filtroEstado });
      setProveedoresRegistrados(data || []);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      setError('Error al cargar los proveedores registrados');
      setProveedoresRegistrados([]);
    } finally {
      setLoadingDatos(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarProveedores();
  }, [busquedaProveedor, filtroFecha, filtroMes, filtroEstado]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProveedor(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Registrar proveedor
  const registrarProveedor = async (e) => {
    e.preventDefault();
    
    if (!proveedor.nombre_proveedor.trim()) {
      alert('❌ Por favor ingresa el nombre del proveedor');
      return;
    }

    if (!proveedor.monto || Number(proveedor.monto) <= 0) {
      alert('❌ Por favor ingresa un monto válido');
      return;
    }

    try {
      setLoading(true);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.');
        setLoading(false);
        return;
      }
      
      const fechaActual = obtenerFechaActual();
      const nuevoProveedor = {
        fecha: fechaActual,
        // fecha_cl: NO ENVIAR - es columna generada automáticamente por PostgreSQL
        nombre_proveedor: proveedor.nombre_proveedor.trim(),
        monto: Number(proveedor.monto),
        estado: proveedor.estado,
        usuario_id: usuarioId // 🔒 AGREGAR USER ID PARA SEGURIDAD
      };

      const { data, error } = await supabase
        .from('proveedores')
        .insert([nuevoProveedor])
        .select('*');

      if (error) throw error;

      console.log('✅ Proveedor registrado exitosamente:', data);
      alert(`✅ Proveedor registrado exitosamente:\n\n📋 ${nuevoProveedor.nombre_proveedor}\n💰 $${formatearNumero(nuevoProveedor.monto)}\n📅 ${formatearFechaMostrar(nuevoProveedor.fecha)}\n📊 Estado: ${nuevoProveedor.estado}`);

      // Limpiar formulario
      setProveedor({
        fecha: '',
        nombre_proveedor: '',
        monto: '',
        estado: 'Pendiente'
      });

      // Recargar datos
      await cargarProveedores();

    } catch (error) {
      console.error('Error al registrar proveedor:', error);
      alert('❌ Error al registrar el proveedor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar proveedor
  const eliminarProveedor = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro de proveedor? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }
      
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId); // 🔒 SEGURIDAD: Solo eliminar registros del usuario actual
      
      if (error) {
        console.error('❌ Error al eliminar proveedor:', error);
        alert('❌ Error al eliminar el registro: ' + error.message);
        return;
      }
      
      console.log('✅ Registro de proveedor eliminado exitosamente');
      alert('✅ Registro de proveedor eliminado exitosamente');
      await cargarProveedores(); // Recargar la lista
    } catch (error) {
      console.error('❌ Error inesperado al eliminar proveedor:', error);
      alert('❌ Error inesperado al eliminar el registro');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado del proveedor
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      setLoading(true);
      console.log('🔄 Iniciando cambio de estado:', { id, nuevoEstado });
      
      // Preparar datos para actualización
      const datosActualizar = { estado: nuevoEstado };
      if (nuevoEstado === 'Pagado') {
        const fechaPago = obtenerFechaActual();
        datosActualizar.fecha_pago = fechaPago;
        console.log('📅 Fecha de pago asignada:', fechaPago);
      } else {
        datosActualizar.fecha_pago = null;
        console.log('🧹 Fecha de pago limpiada');
      }
      console.log('📋 Datos a actualizar:', datosActualizar);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      // Verificar que el registro existe y pertenece al usuario antes de actualizar
      const { data: registroExistente, error: errorVerificacion } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .eq('usuario_id', usuarioId) // 🔒 SEGURIDAD: Solo actualizar registros del usuario actual
        .single();
        
      if (errorVerificacion) {
        console.error('❌ Error al verificar registro:', errorVerificacion);
        alert('❌ Error al verificar el registro: ' + errorVerificacion.message);
        return;
      }
      console.log('📋 Registro encontrado:', registroExistente);
      
      // Intentar actualización con retorno de datos
      console.log('🔄 Ejecutando actualización...');
      const { data, error, count } = await supabase
        .from('proveedores')
        .update(datosActualizar)
        .eq('id', id)
        .eq('usuario_id', usuarioId) // 🔒 SEGURIDAD: Solo actualizar registros del usuario actual
        .select('*');
        
      console.log('📊 Resultado de actualización:', { data, error, count });
      
      if (error) {
        console.error('❌ Error al cambiar estado:', error);
        console.error('❌ Detalles completos del error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          schema: error.schema,
          table: error.table,
          column: error.column,
          dataType: error.dataType,
          constraint: error.constraint
        });
        alert('❌ Error al cambiar el estado: ' + error.message);
        return;
      }
      
      // Verificar si la actualización fue exitosa
      if (data && data.length > 0) {
        console.log('✅ Estado actualizado exitosamente:', data[0]);
        console.log('✅ Fecha de pago registrada:', data[0].fecha_pago);
        
        if (nuevoEstado === 'Pagado') {
          alert(`✅ Proveedor marcado como pagado\n📅 Fecha de pago: ${formatearFechaMostrar(data[0].fecha_pago)}`);
        } else {
          alert(`✅ Proveedor marcado como pendiente`);
        }
      } else {
        console.warn('⚠️ La actualización no devolvió datos');
        console.warn('⚠️ Esto puede indicar un problema con las políticas RLS');
        
        // Intentar verificar si la actualización se realizó sin retorno de datos
        const { data: verificacionPost, error: errorVerificacionPost } = await supabase
          .from('proveedores')
          .select('*')
          .eq('id', id)
          .single();
          
        if (errorVerificacionPost) {
          console.error('❌ Error al verificar después de actualización:', errorVerificacionPost);
          alert('❌ Error al verificar la actualización: ' + errorVerificacionPost.message);
          return;
        }
        
        console.log('📋 Estado después de actualización:', verificacionPost);
        
        if (verificacionPost.estado === nuevoEstado) {
          console.log('✅ La actualización fue exitosa (verificada)');
          if (nuevoEstado === 'Pagado') {
            alert(`✅ Proveedor marcado como pagado\n📅 Fecha de pago: ${formatearFechaMostrar(verificacionPost.fecha_pago || obtenerFechaActual())}`);
          } else {
            alert(`✅ Proveedor marcado como pendiente`);
          }
        } else {
          console.error('❌ La actualización no se aplicó correctamente');
          alert('❌ La actualización no se aplicó correctamente. Verifica las políticas RLS.');
        }
      }
      
      // Recargar datos
      await cargarProveedores();
      
    } catch (error) {
      console.error('❌ Error inesperado al cambiar estado:', error);
      console.error('❌ Stack trace:', error.stack);
      alert('❌ Error inesperado al cambiar el estado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setBusquedaProveedor('');
    setFiltroFecha('');
    setFiltroMes('');
    setFiltroEstado('');
  };



  // Exportar datos a CSV
  const exportarCSV = () => {
    const headers = ['Fecha Registro', 'Nombre del Proveedor', 'Monto', 'Estado', 'Fecha Pago'];
    const csvContent = [
      headers.join(','),
      ...proveedoresRegistrados.map(prov => [
        formatearFechaCortaChile(prov.fecha_cl || prov.fecha),
        prov.nombre_proveedor,
        prov.monto,
        prov.estado,
        prov.fecha_pago ? formatearFechaMostrar(prov.fecha_pago) : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `proveedores_${obtenerFechaActual()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calcular estadísticas
  const estadisticas = {
    total: proveedoresRegistrados.length,
    pendientes: proveedoresRegistrados.filter(p => p.estado === 'Pendiente').length,
    pagados: proveedoresRegistrados.filter(p => p.estado === 'Pagado').length,
    montoTotal: proveedoresRegistrados.reduce((sum, p) => sum + Number(p.monto), 0),
    montoPendiente: proveedoresRegistrados
      .filter(p => p.estado === 'Pendiente')
      .reduce((sum, p) => sum + Number(p.monto), 0),
    montoPagado: proveedoresRegistrados
      .filter(p => p.estado === 'Pagado')
      .reduce((sum, p) => sum + Number(p.monto), 0)
  };

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

          {/* Título principal */}
          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            🏢 Registro de Proveedores
          </h1>



          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {/* Formulario de registro - Horizontal */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                📝 Registrar Proveedor
              </h2>
              
              <form onSubmit={registrarProveedor} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
                {/* Nombre del proveedor */}
                <div>
                  <label className="block text-white font-semibold mb-3 text-sm md:text-base" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    🏢 Nombre del Proveedor
                  </label>
                  <input
                    type="text"
                    name="nombre_proveedor"
                    value={proveedor.nombre_proveedor}
                    onChange={handleChange}
                    className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-sm md:text-base font-medium"
                    placeholder="Ingresa el nombre del proveedor"
                    required
                  />
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-white font-semibold mb-3 text-sm md:text-base" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    💰 Monto
                  </label>
                  <input
                    type="number"
                    name="monto"
                    value={proveedor.monto}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-sm md:text-base font-medium"
                    placeholder="Ingresa el monto"
                    required
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-white font-semibold mb-3 text-sm md:text-base" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    📊 Estado
                  </label>
                  <select
                    name="estado"
                    value={proveedor.estado}
                    onChange={handleChange}
                    className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-sm md:text-base font-medium"
                  >
                    {opcionesEstado.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botón de registro */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm md:text-base"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg md:text-xl">📝</span>
                      <span>{loading ? '⏳ Registrando...' : 'Registrar'}</span>
                    </div>
                    <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de proveedores - Completa */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              {/* Header con título y exportar */}
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center sm:text-left" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  📋 Proveedores Registrados
                </h2>
                <button
                  onClick={exportarCSV}
                  className="group relative px-3 md:px-4 py-1.5 md:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-all duration-200 text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm md:text-base">📊</span>
                    <span>Exportar CSV</span>
                  </div>
                </button>
              </div>

              {/* Sección de filtros */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6 mb-6">
                <h3 className="text-lg md:text-xl font-bold text-white mb-4 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  🔍 Filtros y Búsqueda
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-4">
                  <div>
                    <label className="block text-white font-medium mb-2 text-sm md:text-base">
                      🔍 Buscar Proveedor
                    </label>
                    <input
                      type="text"
                      value={busquedaProveedor}
                      onChange={(e) => setBusquedaProveedor(e.target.value)}
                      className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                      placeholder="Buscar por nombre..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-medium mb-2 text-sm md:text-base">
                      📅 Filtrar por Fecha
                    </label>
                    <input
                      type="date"
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                      className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-medium mb-2 text-sm md:text-base">
                      📆 Filtrar por Mes
                    </label>
                    <select
                      value={filtroMes}
                      onChange={(e) => setFiltroMes(e.target.value)}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    >
                      {opcionesMeses.map(opcion => (
                        <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                          {opcion.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white font-medium mb-2 text-sm md:text-base">
                      📊 Filtrar por Estado
                    </label>
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    >
                      <option value="" className="bg-gray-800 text-white">Todos los estados</option>
                      {opcionesEstado.map(opcion => (
                        <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                          {opcion.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={limpiarFiltros}
                      className="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 text-sm md:text-base font-medium"
                    >
                      🔄 Limpiar Filtros
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de proveedores */}
              <div className="max-h-96 md:max-h-[500px] overflow-y-auto">
                {loadingDatos ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-white text-sm md:text-base">⏳ Cargando proveedores...</div>
                  </div>
                ) : error ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-red-400 text-sm md:text-base">❌ {error}</div>
                  </div>
                ) : proveedoresRegistrados.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-gray-300 text-sm md:text-base">📭 No hay proveedores registrados</div>
                  </div>
                                  ) : (
                    <div className="overflow-x-auto">
                      {/* Leyenda de botones */}
                      <div className="flex items-center justify-center gap-6 mb-4 p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                            <span className="text-xs">⏳</span>
                          </div>
                          <span className="text-white text-sm font-medium">Pendiente</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                            <span className="text-xs">✅</span>
                          </div>
                          <span className="text-white text-sm font-medium">Pagado</span>
                        </div>
                      </div>

                      {/* Tabla real con estructura HTML table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="sticky top-0 bg-gradient-to-r from-green-600/30 to-green-700/30 backdrop-blur-md border-2 border-green-400/40 rounded-xl z-10">
                            <tr>
                              <th className="text-white font-semibold p-2 md:p-3 text-xs md:text-sm text-center">Fecha</th>
                              <th className="text-white font-semibold p-2 md:p-3 text-xs md:text-sm text-center">Proveedor</th>
                              <th className="text-white font-semibold p-2 md:p-3 text-xs md:text-sm text-center">Monto</th>
                              <th className="text-white font-semibold p-2 md:p-3 text-xs md:text-sm text-center w-20">Estado</th>
                              <th className="text-white font-semibold p-2 md:p-3 text-xs md:text-sm text-center w-24">Fecha Pago</th>
                              <th className="text-white font-semibold p-2 md:p-3 text-xs md:text-sm text-center w-32">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proveedoresRegistrados.map((prov) => (
                              <tr key={prov.id} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                                {/* Fecha */}
                                <td className="text-white p-2 md:p-3 text-xs md:text-sm font-medium text-center">
                                  {formatearFechaCortaChile(prov.fecha_cl || prov.fecha)}
                                </td>

                                {/* Proveedor */}
                                <td className="text-white p-2 md:p-3 text-xs md:text-base font-bold text-center">
                                  {prov.nombre_proveedor}
                                </td>

                                {/* Monto */}
                                <td className="text-green-300 p-2 md:p-3 text-sm md:text-lg font-bold text-center">
                                  ${formatearNumero(prov.monto)}
                                </td>

                                {/* Estado */}
                                <td className="p-2 md:p-3 text-center">
                                  <div className={`px-2 py-1.5 rounded-lg text-sm font-bold flex-shrink-0 shadow-lg w-20 mx-auto ${
                                    prov.estado === 'Pagado'
                                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-2 border-green-300 shadow-green-500/50'
                                      : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-2 border-yellow-300 shadow-yellow-500/50'
                                  }`}>
                                    <div className="flex items-center justify-center">
                                      <span className="text-sm">
                                        {prov.estado === 'Pagado' ? '✅' : '⏳'}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Fecha de Pago */}
                                <td className="text-white p-2 md:p-3 text-xs md:text-sm font-medium text-center">
                                  {prov.fecha_pago ? formatearFechaMostrar(prov.fecha_pago) : '-'}
                                </td>

                                {/* Acciones */}
                                <td className="p-2 md:p-3 text-center">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    {/* Botón para cambiar estado */}
                                    <button
                                      onClick={() => cambiarEstado(prov.id, prov.estado === 'Pendiente' ? 'Pagado' : 'Pendiente')}
                                      disabled={loading}
                                      className={`${
                                        prov.estado === 'Pendiente' 
                                          ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl animate-pulse' 
                                          : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl'
                                      } disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed border-2 border-white/30 hover:border-white/50 min-w-[55px] max-w-[65px] relative overflow-hidden`}
                                      title={prov.estado === 'Pendiente' ? 'Marcar como Pagado' : 'Marcar como Pendiente'}
                                    >
                                     {prov.estado === 'Pendiente' && (
                                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                                     )}
                                     <div className="flex items-center justify-center gap-0.5 relative z-10">
                                       <span className="text-xs">
                                         {prov.estado === 'Pendiente' ? '✅' : '⏳'}
                                       </span>
                                     </div>
                                   </button>
                                   
                                    {/* Botón eliminar */}
                                    <button
                                      onClick={() => eliminarProveedor(prov.id)}
                                      disabled={loading}
                                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed border-2 border-white/30 hover:border-white/50 min-w-[55px] max-w-[65px]"
                                      title="Eliminar registro"
                                    >
                                     <div className="flex items-center gap-0.5 justify-center">
                                       <span className="text-xs">🗑️</span>
                                     </div>
                                   </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-4 md:mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              📊 Estadísticas Generales
            </h2>
            
            {/* Estadísticas reorganizadas: Cantidades a la izquierda, Montos a la derecha */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {/* COLUMNA IZQUIERDA - SOLO CANTIDADES */}
              <div className="space-y-3 md:space-y-4">
                  {/* Total Registros */}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 text-center h-20 md:h-24 flex flex-col justify-center">
                    <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                      {estadisticas.total}
                    </div>
                    <div className="text-gray-300 text-xs md:text-sm">Total</div>
                  </div>
                  
                  {/* Pendientes */}
                  <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-3 md:p-4 text-center h-20 md:h-24 flex flex-col justify-center">
                    <div className="text-2xl md:text-3xl font-bold text-yellow-400 mb-1">
                      {estadisticas.pendientes}
                    </div>
                    <div className="text-yellow-300 text-xs md:text-sm">Pendientes</div>
                  </div>
                  
                  {/* Pagados */}
                  <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-3 md:p-4 text-center h-20 md:h-24 flex flex-col justify-center">
                    <div className="text-2xl md:text-3xl font-bold text-green-400 mb-1">
                      {estadisticas.pagados}
                    </div>
                    <div className="text-green-300 text-xs md:text-sm">Pagados</div>
                  </div>
              </div>
              
              {/* COLUMNA DERECHA - SOLO MONTOS */}
              <div className="space-y-3 md:space-y-4">
                  {/* Monto Total */}
                  <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-3 md:p-4 text-center h-20 md:h-24 flex flex-col justify-center">
                    <div className="text-lg md:text-xl font-bold text-blue-400 mb-1">
                      ${formatearNumero(estadisticas.montoTotal)}
                    </div>
                    <div className="text-blue-300 text-xs md:text-sm">Total</div>
                  </div>
                  
                  {/* Por Pagar */}
                  <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-3 md:p-4 text-center h-20 md:h-24 flex flex-col justify-center">
                    <div className="text-lg md:text-xl font-bold text-red-400 mb-1">
                      ${formatearNumero(estadisticas.montoPendiente)}
                    </div>
                    <div className="text-blue-300 text-xs md:text-sm">Por Pagar</div>
                  </div>
                  
                  {/* Pagado */}
                  <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-3 md:p-4 text-center h-20 md:h-24 flex flex-col justify-center">
                    <div className="text-lg md:text-xl font-bold text-green-400 mb-1">
                      ${formatearNumero(estadisticas.montoPagado)}
                    </div>
                    <div className="text-green-300 text-xs md:text-sm">Pagado</div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default FormularioProveedores; 