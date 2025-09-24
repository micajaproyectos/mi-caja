import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { useSessionData } from '../lib/useSessionData.js';
import { 
  obtenerFechaHoyChile, 
  formatearFechaChile,
  formatearFechaCortaChile,
  obtenerMesesUnicos,
  validarFechaISO
} from '../lib/dateUtils.js';
import Footer from './Footer';

const RegistroInventario = () => {
  const [inventario, setInventario] = useState({
    fecha_ingreso: obtenerFechaHoyChile(),
    producto: '',
    cantidad: '',
    unidad: '',
    costo_total: '',
    porcentaje_ganancia: '' // Campo para cálculos (no se guarda en BD)
  });

  const [inventarioRegistrado, setInventarioRegistrado] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // Opciones para el selector de unidad
  const opcionesUnidad = [
    { value: 'kg', label: 'Kg' },
    { value: 'gr', label: 'Gr' },
    { value: 'unidad', label: 'Unidad' }
  ];

  // Función para normalizar fecha a YYYY-MM-DD sin zona horaria
  const normalizarFecha = (fechaString) => {
    if (!fechaString) return '';
    
    // Si la fecha ya está en formato YYYY-MM-DD, retornarla directamente
    if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
      return fechaString;
    }
    
    // Para fechas del input type="date", ya vienen en formato YYYY-MM-DD
    // Solo necesitamos asegurarnos de que se mantenga así
    if (typeof fechaString === 'string' && fechaString.includes('-')) {
      const partes = fechaString.split('-');
      if (partes.length === 3) {
        const [year, month, day] = partes;
        const fechaNormalizada = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return fechaNormalizada;
      }
    }
    
    // Fallback: usar Date pero con cuidado
    try {
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) {
        console.error('❌ Fecha inválida:', fechaString);
        return fechaString;
      }
      
      // Usar métodos locales para evitar problemas de zona horaria
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const resultado = `${year}-${month}-${day}`;
      
      return resultado;
    } catch (error) {
      console.error('❌ Error al normalizar fecha:', error);
      return fechaString;
    }
  };

  // Función para crear fecha con zona horaria local
  const crearFechaConZonaHoraria = (fechaString) => {
    if (!fechaString) return '';
    
    // Crear fecha en zona horaria local
    const fecha = new Date(fechaString + 'T00:00:00');
    
    // Obtener offset de zona horaria en minutos
    const offset = fecha.getTimezoneOffset();
    
    // Crear fecha ISO con offset local
    const fechaLocal = new Date(fecha.getTime() - (offset * 60 * 1000));
    
    return fechaLocal.toISOString();
  };

  // Función para obtener año y mes de una fecha sin zona horaria
  const obtenerAnioMes = (fechaString) => {
    if (!fechaString) return '';
    const fecha = new Date(fechaString);
    // Usar UTC para evitar conversión de zona horaria
    const year = fecha.getUTCFullYear();
    // getUTCMonth() devuelve 0-11, necesitamos 1-12 para comparar con input type="month"
    const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const resultado = `${year}-${month}`;
    return resultado;
  };

  // Función para extraer fecha sin zona horaria para filtros
  const extraerFechaSinZonaHoraria = (fechaString) => {
    if (!fechaString) return '';
    const fecha = new Date(fechaString);
    const year = fecha.getUTCFullYear();
    const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const day = String(fecha.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtrar productos por nombre, fecha y mes usando fecha_cl
  const productosFiltrados = inventarioRegistrado.filter(item => {
    const coincideNombre = item.producto.toLowerCase().includes(busquedaProducto.toLowerCase());
    
    // Usar fecha_ingreso para filtros (fecha seleccionada por el usuario)
    const fechaFiltro = extraerFechaSinZonaHoraria(item.fecha_ingreso);
    
    // Filtro por fecha específica
    const coincideFecha = !filtroFecha || fechaFiltro === filtroFecha;
    
    // Filtro por mes
    const anioMesItem = fechaFiltro ? fechaFiltro.substring(0, 7) : obtenerAnioMes(item.fecha_ingreso);
    const coincideMes = !filtroMes || anioMesItem === filtroMes;
    

    
    return coincideNombre && coincideFecha && coincideMes;
  });

  // Limitar productos mostrados a 30 si no se ha activado "Ver todo"
  const productosAMostrar = mostrarTodos ? productosFiltrados : productosFiltrados.slice(0, 30);

  // Función para recargar datos
  const recargarDatos = useCallback(() => {
    cargarInventario();
  }, []);

  // Hook para gestionar cambios de sesión
  useSessionData(recargarDatos, 'RegistroInventario');

  // Establecer fecha actual al cargar el componente usando fecha Chile
  useEffect(() => {
    const fechaActual = obtenerFechaHoyChile();
    setInventario(prev => ({
      ...prev,
      fecha_ingreso: fechaActual
    }));
    recargarDatos();
  }, [recargarDatos]);

  // Resetear mostrarTodos cuando se apliquen filtros
  useEffect(() => {
    if (busquedaProducto || filtroFecha || filtroMes) {
      setMostrarTodos(false);
    }
  }, [busquedaProducto, filtroFecha, filtroMes]);

  const cargarInventario = async () => {
    try {
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setInventarioRegistrado([]);
        return;
      }

      const { data, error } = await supabase
        .from('inventario')
        .select('id, fecha_ingreso, fecha_cl, producto, cantidad, unidad, costo_total, precio_unitario, precio_venta, usuario_id, created_at')
        .eq('usuario_id', usuarioId) // 🔒 FILTRO CRÍTICO POR USUARIO
        .order('fecha_ingreso', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error en consulta Supabase:', error);
        alert(`Error al cargar el inventario: ${error.message}`);
        setInventarioRegistrado([]);
        return;
      }

      setInventarioRegistrado(data || []);
    } catch (error) {
      console.error('Error inesperado al cargar inventario:', error);
      alert('Error inesperado al cargar el inventario');
      setInventarioRegistrado([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInventario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calcularPrecios = () => {
    const cantidad = parseFloat(inventario.cantidad) || 0;
    const costoTotal = parseFloat(inventario.costo_total) || 0;
    const porcentajeGanancia = parseFloat(inventario.porcentaje_ganancia) || 0;

    if (cantidad > 0 && costoTotal > 0) {
      const precioUnitario = (costoTotal / cantidad) * 1.19;
      const precioVenta = precioUnitario * (1 + porcentajeGanancia);
      
      // Redondear precio_venta al múltiplo de $10 más cercano
      const precioVentaRedondeado = Math.round(precioVenta / 10) * 10;
      
      return {
        precio_unitario: precioUnitario.toFixed(2),
        precio_venta: precioVentaRedondeado.toString()
      };
    }
    
    return {
      precio_unitario: '0.00',
      precio_venta: '0'
    };
  };

  const registrarInventario = async (e) => {
    e.preventDefault();
    
    // Validar campos requeridos
    if (!inventario.producto || !inventario.cantidad || !inventario.unidad || 
        !inventario.costo_total || !inventario.porcentaje_ganancia) {
      alert('Por favor completa todos los campos');
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

      // Calcular precios automáticamente
      const precios = calcularPrecios();
      
      // Crear fecha con zona horaria local para evitar desfases
      const fechaConZonaHoraria = crearFechaConZonaHoraria(inventario.fecha_ingreso);
      
      const inventarioParaInsertar = {
        fecha_ingreso: fechaConZonaHoraria,
        // fecha_cl: NO ENVIAR - es columna generada automáticamente por PostgreSQL
        producto: inventario.producto,
        cantidad: parseFloat(inventario.cantidad) || 0,
        unidad: inventario.unidad,
        costo_total: parseFloat(inventario.costo_total) || 0,
        precio_unitario: parseFloat(precios.precio_unitario) || 0,
        precio_venta: parseFloat(precios.precio_venta) || 0,
        usuario_id: usuarioId // 🔒 AGREGAR USER ID PARA SEGURIDAD
      };

      const { error } = await supabase
        .from('inventario')
        .insert([inventarioParaInsertar]);

      if (error) {
        console.error('Error al registrar inventario:', error);
        alert('Error al registrar el inventario: ' + error.message);
        return;
      }

      alert('Inventario registrado exitosamente');

      // Limpiar formulario
      setInventario({
        fecha_ingreso: new Date().toISOString().split('T')[0],
        producto: '',
        cantidad: '',
        unidad: '',
        costo_total: '',
        porcentaje_ganancia: '' // Campo para cálculos (no se guarda en BD)
      });

      // Recargar inventario
      await cargarInventario();

    } catch (error) {
      console.error('Error inesperado al registrar inventario:', error);
      alert('Error inesperado al registrar el inventario');
    } finally {
      setLoading(false);
    }
  };

  const eliminarInventario = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto del inventario?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar inventario:', error);
        alert('Error al eliminar el producto del inventario');
        return;
      }

      alert('Producto eliminado del inventario');
      await cargarInventario();

    } catch (error) {
      console.error('Error inesperado al eliminar inventario:', error);
      alert('Error inesperado al eliminar el producto');
    }
  };

  const preciosCalculados = calcularPrecios();

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
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium text-sm md:text-base"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-lg md:text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Gestión de Inventario
          </h1>

          {/* Formulario de Registro */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-green-400 text-center">
              Agregar Producto al Inventario
            </h2>
            
            <form onSubmit={registrarInventario} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Fecha de Ingreso */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    name="fecha_ingreso"
                    value={inventario.fecha_ingreso}
                    onChange={handleChange}
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Producto */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Producto
                  </label>
                  <input
                    type="text"
                    name="producto"
                    value={inventario.producto}
                    onChange={handleChange}
                    placeholder="Nombre del producto"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Cantidad */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    value={inventario.cantidad}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Unidad */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Unidad
                  </label>
                  <select
                    name="unidad"
                    value={inventario.unidad}
                    onChange={handleChange}
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                    required
                  >
                    <option value="" className="bg-gray-800">Seleccionar unidad</option>
                    {opcionesUnidad.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800">
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Costo Total */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Costo Total
                  </label>
                  <input
                    type="number"
                    name="costo_total"
                    value={inventario.costo_total}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Porcentaje de Ganancia - Para cálculos (no se guarda en BD) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Porcentaje de Ganancia
                  </label>
                  <input
                    type="number"
                    name="porcentaje_ganancia"
                    value={inventario.porcentaje_ganancia}
                    onChange={handleChange}
                    placeholder="0.30 (30%)"
                    step="0.01"
                    min="0"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>
              </div>

              {/* Cálculos Automáticos */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 mt-4 md:mt-6 border border-white/10">
                <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-yellow-400 text-center">
                  Cálculos Automáticos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Precio Unitario (con IVA 19%)
                    </label>
                    <p className="text-xl md:text-2xl font-bold text-green-400">
                      ${preciosCalculados.precio_unitario}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Precio de Venta (redondeado a $10)
                    </label>
                    <p className="text-xl md:text-2xl font-bold text-blue-400">
                      ${preciosCalculados.precio_venta}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón de Registro */}
              <div className="flex justify-center mt-6 md:mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 md:py-4 px-8 md:px-12 rounded-xl transition-all duration-200 flex items-center space-x-2 md:space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-sm md:text-base"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-white"></div>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <> 
                      <span>Registrar Producto</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de Inventario */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-green-400 text-center">
              Inventario Registrado
            </h2>
            
            {/* Barra de búsqueda */}
            {inventarioRegistrado.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filtro por nombre */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-lg"></span>
                    </div>
                    <input
                      type="text"
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      placeholder="Buscar producto por nombre..."
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    />
                    {busquedaProducto && (
                      <button
                        onClick={() => setBusquedaProducto('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="text-lg">✕</span>
                      </button>
                    )}
                  </div>

                  {/* Filtro por fecha específica */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-lg"></span>
                    </div>
                    <input
                      type="date"
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                      placeholder="Filtrar por día específico"
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    />
                    {filtroFecha && (
                      <button
                        onClick={() => setFiltroFecha('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="text-lg">✕</span>
                      </button>
                    )}
                  </div>

                  {/* Filtro por mes */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-lg"></span>
                    </div>
                    <input
                      type="month"
                      value={filtroMes}
                      onChange={(e) => setFiltroMes(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    />
                    {filtroMes && (
                      <button
                        onClick={() => setFiltroMes('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="text-lg">✕</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Información de filtros activos */}
                {(busquedaProducto || filtroFecha || filtroMes) && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-300">Filtros activos:</span>
                    {busquedaProducto && (
                      <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs">
                        <span>"{busquedaProducto}"</span>
                        <button
                          onClick={() => setBusquedaProducto('')}
                          className="text-green-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                                         {filtroFecha && (
                       <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs">
                         <span>{(() => {
                           // Función para mostrar fecha sin desfase de zona horaria
                           const [year, month, day] = filtroFecha.split('-');
                           return `${day}/${month}/${year}`;
                         })()}</span>
                         <button
                           onClick={() => setFiltroFecha('')}
                           className="text-blue-400 hover:text-white"
                         >
                           ✕
                         </button>
                       </span>
                     )}
                                         {filtroMes && (
                       <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs">
                         <span>{(() => {
                           // Función para mostrar mes sin desfase de zona horaria
                           const [year, month] = filtroMes.split('-');
                           const monthNames = [
                             'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
                           ];
                           const monthIndex = parseInt(month) - 1; // Convertir 1-12 a 0-11
                           return `${monthNames[monthIndex]} de ${year}`;
                         })()}</span>
                         <button
                           onClick={() => setFiltroMes('')}
                           className="text-purple-400 hover:text-white"
                         >
                           ✕
                         </button>
                       </span>
                     )}
                    <button
                      onClick={() => {
                        setBusquedaProducto('');
                        setFiltroFecha('');
                        setFiltroMes('');
                        setMostrarTodos(false);
                      }}
                      className="text-gray-400 hover:text-white text-xs underline"
                    >
                      Limpiar todos
                    </button>
                  </div>
                )}
                
                {/* Contador de resultados */}
                {(busquedaProducto || filtroFecha || filtroMes) && (
                  <div className="mt-2 text-sm text-gray-300">
                    Mostrando {productosFiltrados.length} de {inventarioRegistrado.length} productos
                  </div>
                )}
                
                {/* Contador cuando no hay filtros activos */}
                {!busquedaProducto && !filtroFecha && !filtroMes && (
                  <div className="mt-2 text-sm text-gray-300">
                    Mostrando {productosAMostrar.length} de {inventarioRegistrado.length} productos
                    {!mostrarTodos && productosFiltrados.length > 30 && (
                      <span className="text-green-300 ml-2">(limitado a 30)</span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {inventarioRegistrado.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="text-4xl md:text-6xl mb-3 md:mb-4"></div>
                <p className="text-gray-300 text-base md:text-lg">
                  No hay productos registrados en el inventario
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Agrega tu primer producto usando el formulario de arriba
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="bg-white/10 backdrop-blur-sm">
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Fecha de Ingreso</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Producto</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Cantidad</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Unidad</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Costo Total</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Precio Unitario</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Precio Venta</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosAMostrar.map((item, index) => (
                      <tr key={item.id || index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                                                 <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                           {formatearFechaCortaChile(item.fecha_ingreso)}
                         </td>
                        <td className="text-white p-2 md:p-4 font-medium text-xs md:text-sm truncate max-w-20 md:max-w-32">
                          {item.producto}
                        </td>
                        <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                          {item.cantidad}
                        </td>
                        <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                          {item.unidad}
                        </td>
                        <td className="text-green-300 p-2 md:p-4 font-bold text-xs md:text-sm">
                          ${parseFloat(item.costo_total).toLocaleString()}
                        </td>
                        <td className="text-blue-300 p-2 md:p-4 font-bold text-xs md:text-sm">
                          ${parseFloat(item.precio_unitario).toLocaleString()}
                        </td>
                        <td className="text-yellow-300 p-2 md:p-4 font-bold text-xs md:text-sm">
                          ${parseFloat(item.precio_venta).toLocaleString()}
                        </td>
                        <td className="p-2 md:p-4">
                          <button
                            onClick={() => eliminarInventario(item.id)}
                            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Botón "Ver todo" cuando hay más de 30 productos y no se están mostrando todos */}
                {!mostrarTodos && productosFiltrados.length > 30 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setMostrarTodos(true)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center mx-auto text-sm"
                    >
                      <span className="mr-2"></span>
                      Ver todos los productos ({productosFiltrados.length})
                    </button>
                  </div>
                )}
                
                {/* Botón "Ver menos" cuando se están mostrando todos */}
                {mostrarTodos && productosFiltrados.length > 30 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setMostrarTodos(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center mx-auto text-sm"
                    >
                      <span className="mr-2"></span>
                      Ver solo los primeros 30
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default RegistroInventario;