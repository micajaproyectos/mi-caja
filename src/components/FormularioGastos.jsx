import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { supabase } from '../lib/supabaseClient';
// import { authService } from '../lib/authService.js';
// import { 
//   obtenerFechaHoyChile, 
//   formatearFechaChile,
//   formatearFechaCortaChile,
//   obtenerAniosUnicos
// } from '../lib/dateUtils.js';
import Footer from './Footer';

const FormularioGastos = () => {
  const navigate = useNavigate();
  
  console.log('🔍 FormularioGastos: Componente iniciando...');
  
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
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroTipoGasto, setFiltroTipoGasto] = useState('');
  const [filtroFormaPago, setFiltroFormaPago] = useState('');

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

  // Función para obtener años únicos
  const obtenerAniosUnicosLocal = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  };

  // Función para cargar gastos registrados filtrados por usuario
  const cargarGastos = async () => {
    console.log('🔍 cargarGastos: Función llamada');
    try {
      setLoadingDatos(true);
      setError(null);
      
      // Simular datos para testing
      const datosSimulados = [
        {
          id: 1,
          fecha: '2024-01-15',
          fecha_cl: '2024-01-15',
          tipo_gasto: 'Fijo',
          detalle: 'Alquiler oficina',
          monto: 150000,
          forma_pago: 'Transferencia',
          usuario_id: 'test-user'
        }
      ];
      
      setGastosRegistrados(datosSimulados);
      console.log('✅ Gastos simulados cargados:', datosSimulados.length);
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
    console.log('🔍 registrarGasto: Función llamada');
    
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

      console.log('💰 Registrando gasto:', gasto);

      // Simular registro exitoso
      const nuevoGasto = {
        id: Date.now(),
        ...gasto,
        monto: Number(gasto.monto),
        usuario_id: 'test-user'
      };

      setGastosRegistrados(prev => [nuevoGasto, ...prev]);

      console.log('✅ Gasto registrado exitosamente:', nuevoGasto);

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

      setGastosRegistrados(prev => prev.filter(g => g.id !== id));
      console.log('✅ Gasto eliminado exitosamente');

    } catch (error) {
      console.error('Error inesperado al eliminar gasto:', error);
      setError('Error inesperado al eliminar el gasto');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar gastos
  const gastosFiltrados = gastosRegistrados.filter(item => {
    const coincideDetalle = item.detalle?.toLowerCase().includes(busquedaDetalle.toLowerCase());
    
    const fechaFiltro = item.fecha_cl || item.fecha;
    const coincideFecha = !filtroFecha || fechaFiltro === filtroFecha;
    
    const coincideMes = !filtroMes || (() => {
      if (!fechaFiltro) return false;
      const [year, month] = fechaFiltro.split('-');
      return parseInt(month) === Number(filtroMes);
    })();
    
    const coincideAnio = !filtroAnio || (() => {
      if (!fechaFiltro) return false;
      const year = fechaFiltro.split('-')[0];
      return parseInt(year) === Number(filtroAnio);
    })();
    
    const coincideTipoGasto = !filtroTipoGasto || item.tipo_gasto === filtroTipoGasto;
    const coincideFormaPago = !filtroFormaPago || item.forma_pago === filtroFormaPago;
    
    return coincideDetalle && coincideFecha && coincideMes && coincideAnio && coincideTipoGasto && coincideFormaPago;
  });

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
    console.log('🔍 useEffect: Componente montado');
    cargarGastos();
    // Establecer fecha actual por defecto
    setGasto(prev => ({
      ...prev,
      fecha: obtenerFechaActual()
    }));
  }, []);

  console.log('🔍 FormularioGastos: Renderizando componente...');

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
            💰 Control de Gastos
          </h1>

          {/* Formulario de registro */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-semibold text-green-400 mb-4 md:mb-6 text-center">
              📝 Registrar Nuevo Gasto
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={registrarGasto} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Fecha */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    📅 Fecha
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={gasto.fecha}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                </div>

                {/* Tipo de Gasto */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    🏷️ Tipo de Gasto
                  </label>
                  <select
                    name="tipo_gasto"
                    value={gasto.tipo_gasto}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
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
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    💳 Forma de Pago
                  </label>
                  <select
                    name="forma_pago"
                    value={gasto.forma_pago}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
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
                  📝 Detalle
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
                  💵 Monto
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
                🔍 Filtros de Búsqueda
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 mb-4">
                {/* Búsqueda por detalle */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    🔍 Buscar por detalle
                  </label>
                  <input
                    type="text"
                    value={busquedaDetalle}
                    onChange={(e) => setBusquedaDetalle(e.target.value)}
                    placeholder="Buscar en detalles..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                  />
                </div>

                {/* Filtro por fecha */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    📅 Filtrar por fecha
                  </label>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
                  />
                </div>

                {/* Filtro por mes */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    📆 Filtrar por mes
                  </label>
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
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
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    📅 Filtrar por año
                  </label>
                  <select
                    value={filtroAnio}
                    onChange={(e) => setFiltroAnio(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
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
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    🏷️ Tipo de gasto
                  </label>
                  <select
                    value={filtroTipoGasto}
                    onChange={(e) => setFiltroTipoGasto(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
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
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    💳 Forma de pago
                  </label>
                  <select
                    value={filtroFormaPago}
                    onChange={(e) => setFiltroFormaPago(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
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
              {(busquedaDetalle || filtroFecha || filtroMes || filtroAnio || filtroTipoGasto || filtroFormaPago) && (
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
                    {filtroMes && (
                      <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs">
                        <span>📆 {obtenerMesesUnicos().find(m => m.value === Number(filtroMes))?.label}</span>
                        <button onClick={() => setFiltroMes('')} className="text-purple-400 hover:text-white">✕</button>
                      </span>
                    )}
                    {filtroAnio && (
                      <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs">
                        <span>📅 {filtroAnio}</span>
                        <button onClick={() => setFiltroAnio('')} className="text-yellow-400 hover:text-white">✕</button>
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
                </div>
              )}
            </div>
          )}

          {/* Tabla de gastos registrados */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <h3 className="text-lg md:text-xl font-semibold text-green-400 mb-4 md:mb-6 text-center">
              📊 Gastos Registrados
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
            ) : (
              <>
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

                {/* Tabla */}
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
                      {gastosFiltrados.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                          <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                            {formatearFechaMostrar(item.fecha_cl || item.fecha)}
                          </td>
                          <td className="p-2 md:p-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.tipo_gasto === 'Fijo' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {item.tipo_gasto}
                            </span>
                          </td>
                          <td className="text-white p-2 md:p-4 font-medium text-xs md:text-sm truncate max-w-32 md:max-w-48">
                            {item.detalle || 'Sin detalle'}
                          </td>
                          <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm font-semibold">
                            ${formatearNumero(item.monto)}
                          </td>
                          <td className="p-2 md:p-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.forma_pago === 'Efectivo' 
                                ? 'bg-green-100 text-green-800'
                                : item.forma_pago === 'Débito'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.forma_pago}
                            </span>
                          </td>
                          <td className="p-2 md:p-4">
                            <button
                              onClick={() => eliminarGasto(item.id)}
                              disabled={loading}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
                            >
                              🗑️ Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

export default FormularioGastos; 