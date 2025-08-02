import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Footer from './Footer';

const FormularioProveedores = () => {
  const navigate = useNavigate();
  
  // Estado del formulario
  const [proveedor, setProveedor] = useState({
    fecha: '',
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
  const [filtroEstado, setFiltroEstado] = useState('');

  // Opciones para el selector de estado
  const opcionesEstado = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Pagado', label: 'Pagado' }
  ];

  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const obtenerFechaActual = () => {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const fechaFormateada = `${year}-${month}-${day}`;
    console.log('📅 Fecha actual generada:', fechaFormateada);
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
      let query = supabase
        .from('proveedores')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (busquedaProveedor) {
        query = query.ilike('nombre_proveedor', `%${busquedaProveedor}%`);
      }
      if (filtroFecha) {
        query = query.eq('fecha', filtroFecha);
      }
      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('📋 Proveedores cargados:', data);
      setProveedoresRegistrados(data || []);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      setError('Error al cargar los proveedores registrados');
    } finally {
      setLoadingDatos(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarProveedores();
  }, [busquedaProveedor, filtroFecha, filtroEstado]);

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
      
      const nuevoProveedor = {
        fecha: obtenerFechaActual(),
        nombre_proveedor: proveedor.nombre_proveedor.trim(),
        monto: Number(proveedor.monto),
        estado: proveedor.estado
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
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);
      
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
      
      // Preparar los datos a actualizar
      const datosActualizar = { estado: nuevoEstado };
      
      // Si se está marcando como pagado, agregar la fecha de pago
      if (nuevoEstado === 'Pagado') {
        const fechaPago = obtenerFechaActual();
        datosActualizar.fecha_pago = fechaPago;
        console.log('📅 Fecha de pago asignada:', fechaPago);
      } else {
        // Si se está marcando como pendiente, limpiar la fecha de pago
        datosActualizar.fecha_pago = null;
        console.log('🧹 Fecha de pago limpiada');
      }
      
      console.log('📋 Datos a actualizar:', datosActualizar);
      
      const { data, error } = await supabase
        .from('proveedores')
        .update(datosActualizar)
        .eq('id', id)
        .select('*');
      
      if (error) {
        console.error('❌ Error al cambiar estado:', error);
        alert('❌ Error al cambiar el estado: ' + error.message);
        return;
      }
      
      console.log('✅ Estado actualizado exitosamente:', data);
      if (nuevoEstado === 'Pagado') {
        alert(`✅ Proveedor marcado como pagado\n📅 Fecha de pago: ${formatearFechaMostrar(obtenerFechaActual())}`);
      } else {
        alert(`✅ Proveedor marcado como pendiente`);
      }
      await cargarProveedores(); // Recargar la lista
    } catch (error) {
      console.error('❌ Error inesperado al cambiar estado:', error);
      alert('❌ Error inesperado al cambiar el estado');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setBusquedaProveedor('');
    setFiltroFecha('');
    setFiltroEstado('');
  };

  // Función de prueba para verificar la actualización de fecha_pago
  const probarActualizacionFechaPago = async (id) => {
    try {
      console.log('🧪 Probando actualización de fecha_pago para ID:', id);
      
      const fechaPago = obtenerFechaActual();
      console.log('📅 Fecha de pago a asignar:', fechaPago);
      
      const { data, error } = await supabase
        .from('proveedores')
        .update({ 
          estado: 'Pagado',
          fecha_pago: fechaPago 
        })
        .eq('id', id)
        .select('*');
      
      if (error) {
        console.error('❌ Error en prueba:', error);
        alert('❌ Error en prueba: ' + error.message);
        return;
      }
      
      console.log('✅ Prueba exitosa:', data);
      alert(`✅ Prueba exitosa\n📅 Fecha de pago: ${data[0]?.fecha_pago}`);
      
      await cargarProveedores();
    } catch (error) {
      console.error('❌ Error en prueba:', error);
      alert('❌ Error en prueba: ' + error.message);
    }
  };

  // Exportar datos a CSV
  const exportarCSV = () => {
    const headers = ['Fecha Registro', 'Nombre del Proveedor', 'Monto', 'Estado', 'Fecha Pago'];
    const csvContent = [
      headers.join(','),
      ...proveedoresRegistrados.map(prov => [
        formatearFechaMostrar(prov.fecha),
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

          {/* Estadísticas */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-4 md:mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              📊 Estadísticas Generales
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {estadisticas.total}
                </div>
                <div className="text-gray-300 text-xs md:text-sm">Total Registros</div>
              </div>
              
              <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-3 md:p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-yellow-400 mb-1">
                  {estadisticas.pendientes}
                </div>
                <div className="text-yellow-300 text-xs md:text-sm">Pendientes</div>
              </div>
              
              <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-3 md:p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-green-400 mb-1">
                  {estadisticas.pagados}
                </div>
                <div className="text-green-300 text-xs md:text-sm">Pagados</div>
              </div>
              
              <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-3 md:p-4 text-center">
                <div className="text-lg md:text-xl font-bold text-blue-400 mb-1">
                  ${formatearNumero(estadisticas.montoTotal)}
                </div>
                <div className="text-blue-300 text-xs">Monto Total</div>
              </div>
              
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-3 md:p-4 text-center">
                <div className="text-lg md:text-xl font-bold text-red-400 mb-1">
                  ${formatearNumero(estadisticas.montoPendiente)}
                </div>
                <div className="text-red-300 text-xs">Por Pagar</div>
              </div>
              
              <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-3 md:p-4 text-center">
                <div className="text-lg md:text-xl font-bold text-green-400 mb-1">
                  ${formatearNumero(estadisticas.montoPagado)}
                </div>
                <div className="text-green-300 text-xs">Pagado</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Formulario de registro */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                📝 Registrar Proveedor
              </h2>
              
              <form onSubmit={registrarProveedor} className="space-y-6 md:space-y-8">
                {/* Nombre del proveedor */}
                <div>
                  <label className="block text-white font-semibold mb-3 text-base md:text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    🏢 Nombre del Proveedor
                  </label>
                  <input
                    type="text"
                    name="nombre_proveedor"
                    value={proveedor.nombre_proveedor}
                    onChange={handleChange}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-base md:text-lg font-medium"
                    placeholder="Ingresa el nombre del proveedor"
                    required
                  />
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-white font-semibold mb-3 text-base md:text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    💰 Monto
                  </label>
                  <input
                    type="number"
                    name="monto"
                    value={proveedor.monto}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-base md:text-lg font-medium"
                    placeholder="Ingresa el monto"
                    required
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-white font-semibold mb-3 text-base md:text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    📊 Estado
                  </label>
                  <select
                    name="estado"
                    value={proveedor.estado}
                    onChange={handleChange}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-base md:text-lg font-medium"
                  >
                    {opcionesEstado.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botón de registro */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full px-6 md:px-8 py-4 md:py-5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base md:text-lg"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl md:text-2xl">📝</span>
                    <span>{loading ? '⏳ Registrando...' : 'Registrar Proveedor'}</span>
                  </div>
                  <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </form>
            </div>

            {/* Lista de proveedores */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              {/* Header con título y exportar */}
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center sm:text-left" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  📋 Proveedores Registrados
                </h2>
                <button
                  onClick={exportarCSV}
                  className="group relative px-4 md:px-6 py-2 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 text-sm md:text-base font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <span>Exportar CSV</span>
                  </div>
                </button>
              </div>

              {/* Sección de filtros */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6 mb-6">
                <h3 className="text-lg md:text-xl font-bold text-white mb-4 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  🔍 Filtros y Búsqueda
                </h3>
                
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                   {/* Botón de prueba temporal */}
                   <div className="col-span-full">
                     <button
                       onClick={() => {
                         if (proveedoresRegistrados.length > 0) {
                           const primerProveedor = proveedoresRegistrados[0];
                           probarActualizacionFechaPago(primerProveedor.id);
                         } else {
                           alert('❌ No hay proveedores para probar');
                         }
                       }}
                       className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 text-sm md:text-base font-medium"
                     >
                       🧪 Probar Actualización Fecha Pago
                     </button>
                   </div>
                  <div>
                    <label className="block text-white font-medium mb-2 text-sm md:text-base">
                      🔍 Buscar Proveedor
                    </label>
                    <input
                      type="text"
                      value={busquedaProveedor}
                      onChange={(e) => setBusquedaProveedor(e.target.value)}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
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
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    />
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
              <div className="max-h-80 md:max-h-96 overflow-y-auto">
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
                  <div className="space-y-2 md:space-y-3">
                    {proveedoresRegistrados.map((prov) => (
                      <div
                        key={prov.id}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 md:p-4"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm md:text-base truncate">
                              🏢 {prov.nombre_proveedor}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">
                              📅 Registro: {formatearFechaMostrar(prov.fecha)}
                            </div>
                            {prov.fecha_pago && (
                              <div className="text-xs md:text-sm text-green-400">
                                💳 Pago: {formatearFechaMostrar(prov.fecha_pago)}
                              </div>
                            )}
                            <div className="text-sm md:text-base text-green-400 font-medium">
                              💰 ${formatearNumero(prov.monto)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                              prov.estado === 'Pagado'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {prov.estado === 'Pagado' ? '✅ Pagado' : '⏳ Pendiente'}
                            </div>
                            
                            {/* Botón para cambiar estado */}
                            <button
                              onClick={() => cambiarEstado(prov.id, prov.estado === 'Pendiente' ? 'Pagado' : 'Pendiente')}
                              disabled={loading}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 md:px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                              title={prov.estado === 'Pendiente' ? 'Marcar como Pagado' : 'Marcar como Pendiente'}
                            >
                              {prov.estado === 'Pendiente' ? '✅' : '⏳'}
                            </button>
                            
                            <button
                              onClick={() => eliminarProveedor(prov.id)}
                              disabled={loading}
                              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 md:px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                              title="Eliminar registro"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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