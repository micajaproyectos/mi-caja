import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { obtenerFechaHoyChile, formatearFechaCortaChile } from '../lib/dateUtils.js';
import { useSessionData } from '../lib/useSessionData.js';
import Footer from './Footer';

const VentaRapida = () => {
  const [venta, setVenta] = useState({
    fecha: obtenerFechaHoyChile(),
    monto: '',
    tipo_pago: 'efectivo'
  });
  
  const [loading, setLoading] = useState(false);
  const [ventasRegistradas, setVentasRegistradas] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  
  // Estados para los filtros
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroTipoPago, setFiltroTipoPago] = useState('');
  
  // Estados para edición
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEdicion, setValoresEdicion] = useState({
    fecha_cl: '',
    monto: '',
    tipo_pago: ''
  });

  // Función para cargar ventas rápidas registradas
  const cargarVentasRapidas = async () => {
    setLoadingVentas(true);
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setVentasRegistradas([]);
        return;
      }

      const { data, error } = await supabase
        .from('venta_rapida')
        .select('id, fecha_cl, monto, tipo_pago, created_at')
        .eq('usuario_id', usuarioId)
        .order('fecha_cl', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error al cargar ventas rápidas:', error);
        setVentasRegistradas([]);
      } else {
        setVentasRegistradas(data || []);
      }
    } catch (error) {
      console.error('❌ Error inesperado al cargar ventas rápidas:', error);
      setVentasRegistradas([]);
    } finally {
      setLoadingVentas(false);
    }
  };

  // Función para recargar datos
  const recargarDatos = useCallback(() => {
    cargarVentasRapidas();
  }, []);

  // Hook para gestionar cambios de sesión
  useSessionData(recargarDatos, 'VentaRapida');

  // Establecer fecha actual y cargar ventas al cargar el componente
  useEffect(() => {
    const fechaActual = obtenerFechaHoyChile();
    setVenta(prev => ({
      ...prev,
      fecha: fechaActual
    }));
    recargarDatos();
  }, [recargarDatos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVenta(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const registrarVentaRapida = async (e) => {
    e.preventDefault();
    
    // Validar campos requeridos
    if (!venta.monto || parseFloat(venta.monto) <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    setLoading(true);

    try {
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.');
        setLoading(false);
        return;
      }

      const ventaParaInsertar = {
        fecha_cl: venta.fecha,
        monto: parseFloat(venta.monto),
        tipo_pago: venta.tipo_pago,
        usuario_id: usuarioId
      };

      const { error } = await supabase
        .from('venta_rapida')
        .insert([ventaParaInsertar]);

      if (error) {
        console.error('Error al registrar venta rápida:', error);
        alert('Error al registrar la venta rápida: ' + error.message);
        return;
      }

      alert('✅ Venta rápida registrada exitosamente');

      // Limpiar formulario
      setVenta({
        fecha: obtenerFechaHoyChile(),
        monto: '',
        tipo_pago: 'efectivo'
      });

      // Recargar la tabla de ventas
      await cargarVentasRapidas();

    } catch (error) {
      console.error('Error inesperado al registrar venta rápida:', error);
      alert('Error inesperado al registrar la venta rápida');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear el tipo de pago
  const formatearTipoPago = (tipo) => {
    const tipos = {
      'efectivo': 'Efectivo',
      'debito': 'Débito',
      'credito': 'Crédito',
      'transferencia': 'Transferencia'
    };
    return tipos[tipo] || tipo;
  };

  // Función para filtrar ventas según los filtros aplicados
  const filtrarVentas = useCallback(() => {
    let ventasFiltradas = [...ventasRegistradas];
    const fechaActual = obtenerFechaHoyChile();

    // Si no hay filtros activos, mostrar solo las ventas del día actual
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago) {
      ventasFiltradas = ventasFiltradas.filter(venta => {
        const fechaVenta = venta.fecha_cl;
        return fechaVenta === fechaActual;
      });
    } else {
      // Filtrar por día específico (si se selecciona)
      if (filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = venta.fecha_cl;
          return fechaVenta === filtroDia;
        });
      }

      // Filtrar por mes (si se selecciona)
      if (filtroMes && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = venta.fecha_cl;
          if (!fechaVenta) return false;
          
          const [year, month] = fechaVenta.split('-');
          const mesVenta = parseInt(month);
          const mesFiltro = parseInt(filtroMes);
          return mesVenta === mesFiltro;
        });
      }

      // Filtrar por año (si se selecciona)
      if (filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = venta.fecha_cl;
          if (!fechaVenta) return false;
          
          const year = fechaVenta.split('-')[0];
          return parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Si hay mes y año seleccionados (sin día específico)
      if (filtroMes && filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = venta.fecha_cl;
          if (!fechaVenta) return false;
          
          const [year, month] = fechaVenta.split('-');
          return parseInt(month) === parseInt(filtroMes) && 
                 parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Filtrar por tipo de pago
      if (filtroTipoPago) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          return venta.tipo_pago === filtroTipoPago;
        });
      }
    }

    return ventasFiltradas;
  }, [ventasRegistradas, filtroDia, filtroMes, filtroAnio, filtroTipoPago]);

  const ventasFiltradas = filtrarVentas();

  // Calcular el total de ventas filtradas
  const totalVentas = ventasFiltradas.reduce((sum, venta) => sum + parseFloat(venta.monto || 0), 0);

  // Calcular sumatorias por tipo de pago (usando ventas filtradas)
  const calcularSumatoriasPorTipoPago = () => {
    const sumatorias = {
      total: {
        cantidad: ventasFiltradas.length,
        monto: 0
      },
      efectivo: {
        cantidad: 0,
        monto: 0
      },
      debito: {
        cantidad: 0,
        monto: 0
      },
      credito: {
        cantidad: 0,
        monto: 0
      },
      transferencia: {
        cantidad: 0,
        monto: 0
      }
    };

    ventasFiltradas.forEach(venta => {
      const monto = parseFloat(venta.monto || 0);
      sumatorias.total.monto += monto;

      if (venta.tipo_pago === 'efectivo') {
        sumatorias.efectivo.cantidad++;
        sumatorias.efectivo.monto += monto;
      } else if (venta.tipo_pago === 'debito') {
        sumatorias.debito.cantidad++;
        sumatorias.debito.monto += monto;
      } else if (venta.tipo_pago === 'credito') {
        sumatorias.credito.cantidad++;
        sumatorias.credito.monto += monto;
      } else if (venta.tipo_pago === 'transferencia') {
        sumatorias.transferencia.cantidad++;
        sumatorias.transferencia.monto += monto;
      }
    });

    return sumatorias;
  };

  const sumatorias = calcularSumatoriasPorTipoPago();

  // Función para obtener meses únicos de las ventas registradas
  const obtenerMesesUnicos = () => {
    const meses = ventasRegistradas.map(venta => {
      if (!venta.fecha_cl) return null;
      const [year, month] = venta.fecha_cl.split('-');
      return { mes: parseInt(month), anio: parseInt(year) };
    }).filter(m => m !== null);

    const mesesUnicos = Array.from(new Set(meses.map(m => m.mes))).sort((a, b) => a - b);
    
    const nombresMeses = [
      '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return mesesUnicos.map(mes => ({
      valor: mes.toString(),
      nombre: nombresMeses[mes]
    }));
  };

  // Función para obtener años únicos de las ventas registradas
  const obtenerAniosUnicos = () => {
    const anios = ventasRegistradas.map(venta => {
      if (!venta.fecha_cl) return null;
      const [year] = venta.fecha_cl.split('-');
      return parseInt(year);
    }).filter(a => a !== null);

    return Array.from(new Set(anios)).sort((a, b) => b - a);
  };

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroDia('');
    setFiltroMes('');
    setFiltroAnio('');
    setFiltroTipoPago('');
  };

  // Función para iniciar edición
  const iniciarEdicion = (venta) => {
    setEditandoId(venta.id);
    setValoresEdicion({
      fecha_cl: venta.fecha_cl,
      monto: venta.monto.toString(),
      tipo_pago: venta.tipo_pago
    });
  };

  // Función para cancelar edición
  const cancelarEdicion = () => {
    setEditandoId(null);
    setValoresEdicion({
      fecha_cl: '',
      monto: '',
      tipo_pago: ''
    });
  };

  // Función para manejar cambios en edición
  const handleEdicionChange = (campo, valor) => {
    setValoresEdicion(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Función para guardar edición
  const guardarEdicion = async (id) => {
    try {
      // Validaciones
      if (!valoresEdicion.fecha_cl || !valoresEdicion.monto || !valoresEdicion.tipo_pago) {
        alert('⚠️ Todos los campos son obligatorios');
        return;
      }

      if (parseFloat(valoresEdicion.monto) <= 0) {
        alert('⚠️ El monto debe ser mayor a 0');
        return;
      }

      setLoading(true);

      const { error } = await supabase
        .from('venta_rapida')
        .update({
          fecha_cl: valoresEdicion.fecha_cl,
          monto: parseFloat(valoresEdicion.monto),
          tipo_pago: valoresEdicion.tipo_pago
        })
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar venta rápida:', error);
        alert('❌ Error al actualizar la venta rápida: ' + error.message);
        return;
      }

      alert('✅ Venta rápida actualizada exitosamente');
      cancelarEdicion();
      await cargarVentasRapidas();

    } catch (error) {
      console.error('Error inesperado al actualizar venta rápida:', error);
      alert('❌ Error inesperado al actualizar la venta rápida');
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar venta
  const eliminarVenta = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta venta rápida?')) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('venta_rapida')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar venta rápida:', error);
        alert('❌ Error al eliminar la venta rápida: ' + error.message);
        return;
      }

      alert('✅ Venta rápida eliminada exitosamente');
      await cargarVentasRapidas();

    } catch (error) {
      console.error('Error inesperado al eliminar venta rápida:', error);
      alert('❌ Error inesperado al eliminar la venta rápida');
    } finally {
      setLoading(false);
    }
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
        <div className="max-w-4xl mx-auto">
          {/* Botón de regreso */}
          <div className="mb-4 md:mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium text-sm md:text-base"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-lg md:text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          {/* Título con icono de rayo */}
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <span className="text-5xl md:text-6xl">⚡</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Venta Rápida
            </h1>
            <p className="text-gray-300 text-sm md:text-base mt-2">
              Registra tus ventas diarias de forma simple y rápida
            </p>
          </div>

          {/* Formulario de Venta Rápida */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
            <form onSubmit={registrarVentaRapida} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fecha */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={venta.fecha}
                    onChange={handleChange}
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Monto */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Monto
                  </label>
                  <input
                    type="number"
                    name="monto"
                    value={venta.monto}
                    onChange={handleChange}
                    placeholder="Ingresa el monto"
                    step="1"
                    min="0"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Tipo de Pago */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-white">
                    Tipo de Pago
                  </label>
                  <select
                    name="tipo_pago"
                    value={venta.tipo_pago}
                    onChange={handleChange}
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                    required
                  >
                    <option value="efectivo" className="bg-gray-800">Efectivo</option>
                    <option value="debito" className="bg-gray-800">Débito</option>
                    <option value="credito" className="bg-gray-800">Crédito</option>
                    <option value="transferencia" className="bg-gray-800">Transferencia</option>
                  </select>
                </div>
              </div>

              {/* Vista previa del monto */}
              {venta.monto && parseFloat(venta.monto) > 0 && (
                <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/30">
                  <div className="text-center">
                    <p className="text-sm text-yellow-200 mb-1">Monto a registrar:</p>
                    <p className="text-2xl md:text-3xl font-bold text-yellow-300">
                      ${parseFloat(venta.monto).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              )}

              {/* Botón de Registro */}
              <div className="flex justify-center mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 md:py-4 px-8 md:px-12 rounded-xl transition-all duration-200 flex items-center space-x-2 md:space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-sm md:text-base"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-white"></div>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">⚡</span>
                      <span>Registrar Venta Rápida</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de Ventas Rápidas Registradas */}
          <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <h2 className="text-xl md:text-2xl font-semibold text-yellow-400 mb-4 md:mb-6 text-center">
              Ventas Rápidas Registradas
            </h2>

            {/* Filtros de fecha y tipo de pago */}
            <div className="mb-4 md:mb-6 bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
              <h3 className="text-base md:text-lg font-semibold text-yellow-300 mb-3 md:mb-4 text-center">
                Filtros
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Filtro por día específico */}
                <div>
                  <label className="block text-gray-200 font-medium mb-1 md:mb-2 text-xs md:text-sm">
                    Día específico:
                  </label>
                  <input
                    type="date"
                    value={filtroDia}
                    onChange={(e) => setFiltroDia(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm md:text-base"
                  />
                </div>

                {/* Filtro por mes */}
                <div>
                  <label className="block text-gray-200 font-medium mb-1 md:mb-2 text-xs md:text-sm">
                    Mes:
                  </label>
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los meses</option>
                    {obtenerMesesUnicos().map(mes => (
                      <option key={mes.valor} value={mes.valor} className="bg-gray-800 text-white">
                        {mes.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por año */}
                <div>
                  <label className="block text-gray-200 font-medium mb-1 md:mb-2 text-xs md:text-sm">
                    Año:
                  </label>
                  <select
                    value={filtroAnio}
                    onChange={(e) => setFiltroAnio(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los años</option>
                    {obtenerAniosUnicos().map(anio => (
                      <option key={anio} value={anio} className="bg-gray-800 text-white">
                        {anio}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por tipo de pago */}
                <div>
                  <label className="block text-gray-200 font-medium mb-1 md:mb-2 text-xs md:text-sm">
                    Tipo de Pago:
                  </label>
                  <select
                    value={filtroTipoPago}
                    onChange={(e) => setFiltroTipoPago(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los tipos</option>
                    <option value="efectivo" className="bg-gray-800 text-white">Efectivo</option>
                    <option value="debito" className="bg-gray-800 text-white">Débito</option>
                    <option value="credito" className="bg-gray-800 text-white">Crédito</option>
                    <option value="transferencia" className="bg-gray-800 text-white">Transferencia</option>
                  </select>
                </div>
              </div>

              {/* Botón para limpiar filtros */}
              {(filtroDia || filtroMes || filtroAnio || filtroTipoPago) && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={limpiarFiltros}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <span>🗑️</span>
                    <span>Limpiar Filtros</span>
                  </button>
                </div>
              )}

              {/* Indicador de filtros activos */}
              {!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago && (
                <div className="mt-4 text-center">
                  <p className="text-blue-200 text-xs md:text-sm">
                    ℹ️ Mostrando ventas del día actual. Usa los filtros para ver más registros.
                  </p>
                </div>
              )}
            </div>

            {loadingVentas ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
                <span className="ml-3 text-white">Cargando ventas...</span>
              </div>
            ) : ventasFiltradas.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="text-4xl md:text-6xl mb-3 md:mb-4">📋</div>
                <p className="text-gray-300 text-base md:text-lg">
                  {ventasRegistradas.length === 0 
                    ? 'No hay ventas rápidas registradas'
                    : 'No hay ventas que coincidan con los filtros seleccionados'
                  }
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {ventasRegistradas.length === 0 
                    ? 'Registra tu primera venta usando el formulario de arriba'
                    : 'Intenta cambiar o limpiar los filtros'
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="bg-white/10 backdrop-blur-sm">
                        <th className="text-white font-semibold p-2 md:p-4 text-left">Fecha</th>
                        <th className="text-white font-semibold p-2 md:p-4 text-left">Monto</th>
                        <th className="text-white font-semibold p-2 md:p-4 text-left">Tipo de Pago</th>
                        <th className="text-white font-semibold p-2 md:p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasFiltradas.map((ventaItem, index) => {
                        const estaEditando = editandoId === ventaItem.id;
                        return (
                          <tr key={ventaItem.id || index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                            {/* Fecha */}
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {estaEditando ? (
                                <input
                                  type="date"
                                  value={valoresEdicion.fecha_cl}
                                  onChange={(e) => handleEdicionChange('fecha_cl', e.target.value)}
                                  className="w-full p-1 md:p-2 bg-white/10 border border-yellow-400 rounded text-white text-xs md:text-sm"
                                />
                              ) : (
                                formatearFechaCortaChile(ventaItem.fecha_cl)
                              )}
                            </td>
                            
                            {/* Monto */}
                            <td className="text-yellow-300 p-2 md:p-4 font-bold text-xs md:text-sm">
                              {estaEditando ? (
                                <input
                                  type="number"
                                  value={valoresEdicion.monto}
                                  onChange={(e) => handleEdicionChange('monto', e.target.value)}
                                  className="w-24 md:w-28 p-1 md:p-2 bg-white/10 border border-yellow-400 rounded text-white text-xs md:text-sm"
                                  step="1"
                                  min="0"
                                />
                              ) : (
                                `$${parseFloat(ventaItem.monto).toLocaleString('es-CL')}`
                              )}
                            </td>
                            
                            {/* Tipo de Pago */}
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {estaEditando ? (
                                <select
                                  value={valoresEdicion.tipo_pago}
                                  onChange={(e) => handleEdicionChange('tipo_pago', e.target.value)}
                                  className="w-full p-1 md:p-2 bg-white/10 border border-yellow-400 rounded text-white text-xs md:text-sm"
                                  style={{ colorScheme: 'dark' }}
                                >
                                  <option value="efectivo" className="bg-gray-800">Efectivo</option>
                                  <option value="debito" className="bg-gray-800">Débito</option>
                                  <option value="credito" className="bg-gray-800">Crédito</option>
                                  <option value="transferencia" className="bg-gray-800">Transferencia</option>
                                </select>
                              ) : (
                                formatearTipoPago(ventaItem.tipo_pago)
                              )}
                            </td>
                            
                            {/* Acciones */}
                            <td className="p-2 md:p-4">
                              {estaEditando ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => guardarEdicion(ventaItem.id)}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                    title="Guardar cambios"
                                  >
                                    ✅
                                  </button>
                                  <button
                                    onClick={cancelarEdicion}
                                    disabled={loading}
                                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                    title="Cancelar edición"
                                  >
                                    ❌
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => iniciarEdicion(ventaItem)}
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                    title="Editar venta"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => eliminarVenta(ventaItem.id)}
                                    disabled={loading}
                                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                    title="Eliminar venta"
                                  >
                                    🗑️
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

                {/* Sumatorias por Tipo de Pago */}
                <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
                  <h4 className="text-blue-300 font-bold text-base md:text-lg mb-3 md:mb-4 text-center">
                    Resumen por Tipo de Pago
                  </h4>
                  
                  <div className="space-y-2 md:space-y-3">
                    {/* Total */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-blue-400 text-lg md:text-xl mr-3">📊</span>
                        <div>
                          <p className="text-blue-200 text-sm md:text-base font-medium">Total</p>
                          <p className="text-blue-300 text-xs md:text-sm">{sumatorias.total.cantidad} {sumatorias.total.cantidad === 1 ? 'venta' : 'ventas'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-300 font-bold text-lg md:text-xl">
                          ${sumatorias.total.monto.toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Efectivo */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-green-400 text-lg md:text-xl mr-3">💵</span>
                        <div>
                          <p className="text-green-200 text-sm md:text-base font-medium">Efectivo</p>
                          <p className="text-green-300 text-xs md:text-sm">{sumatorias.efectivo.cantidad} {sumatorias.efectivo.cantidad === 1 ? 'venta' : 'ventas'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-300 font-bold text-lg md:text-xl">
                          ${sumatorias.efectivo.monto.toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Débito */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-purple-400 text-lg md:text-xl mr-3">💳</span>
                        <div>
                          <p className="text-purple-200 text-sm md:text-base font-medium">Débito</p>
                          <p className="text-purple-300 text-xs md:text-sm">{sumatorias.debito.cantidad} {sumatorias.debito.cantidad === 1 ? 'venta' : 'ventas'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-300 font-bold text-lg md:text-xl">
                          ${sumatorias.debito.monto.toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Crédito */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-orange-400 text-lg md:text-xl mr-3">💳</span>
                        <div>
                          <p className="text-orange-200 text-sm md:text-base font-medium">Crédito</p>
                          <p className="text-orange-300 text-xs md:text-sm">{sumatorias.credito.cantidad} {sumatorias.credito.cantidad === 1 ? 'venta' : 'ventas'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-300 font-bold text-lg md:text-xl">
                          ${sumatorias.credito.monto.toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Transferencia */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-indigo-400 text-lg md:text-xl mr-3">📱</span>
                        <div>
                          <p className="text-indigo-200 text-sm md:text-base font-medium">Transferencia</p>
                          <p className="text-indigo-300 text-xs md:text-sm">{sumatorias.transferencia.cantidad} {sumatorias.transferencia.cantidad === 1 ? 'venta' : 'ventas'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-indigo-300 font-bold text-lg md:text-xl">
                          ${sumatorias.transferencia.monto.toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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

export default VentaRapida;

