import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { obtenerFechaHoyChile } from '../lib/dateUtils.js';
import Footer from './Footer';

export default function Transporte() {
  const navigate = useNavigate();
  
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [registros, setRegistros] = useState([]);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    fecha: '',
    destino: '',
    estado: '',
    nombre: ''
  });

  // Estados para el popup de confirmación de entrega
  const [mostrarPopupEntrega, setMostrarPopupEntrega] = useState(false);
  const [registroEntrega, setRegistroEntrega] = useState(null);
  const [nombreQuienRetiro, setNombreQuienRetiro] = useState('');

  // Estado del formulario de entrega
  const [entrega, setEntrega] = useState({
    fecha_entrega: obtenerFechaHoyChile(),
    destino: '',
    nombre_entrega: '',
    nombre_retira: '',
    tipo_carga: '', // bultos, kg, unidades
    cantidad: '',
    comentarios: '',
    estado: 'en_transito' // pendiente, en_transito, entregado
  });

  // Tipos de carga disponibles
  const tiposCarga = ['Bultos', 'Kg', 'Unidades'];

  // Manejar cambios en el formulario de entrega
  const handleEntregaChange = (e) => {
    const { name, value } = e.target;
    setEntrega(prev => ({
      ...prev,
      [name]: value
    }));
  };


  // Validar formulario
  const validarFormulario = () => {
    if (!entrega.fecha_entrega) {
      alert('Por favor ingrese la fecha de entrega');
      return false;
    }
    if (!entrega.destino.trim()) {
      alert('Por favor ingrese el destino');
      return false;
    }
    if (!entrega.nombre_entrega.trim()) {
      alert('Por favor ingrese el nombre de quien entrega');
      return false;
    }
    if (!entrega.nombre_retira.trim()) {
      alert('Por favor ingrese el nombre de quien retira');
      return false;
    }
    if (!entrega.tipo_carga) {
      alert('Por favor seleccione el tipo de carga');
      return false;
    }
    if (!entrega.cantidad || entrega.cantidad <= 0) {
      alert('Por favor ingrese una cantidad válida');
      return false;
    }
    return true;
  };

  // Cargar registros desde Supabase
  // Cargar registros desde Supabase (memoizado para evitar re-creaciones)
  const cargarRegistros = useCallback(async () => {
    try {
      setLoading(true);
      
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('No hay usuario autenticado');
        setRegistros([]);
        return;
      }

      const { data, error } = await supabase
        .from('transporte')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('fecha_entrega', { ascending: false });

      if (error) {
        console.error('Error al cargar registros:', error);
        return;
      }

      setRegistros(data || []);
    } catch (error) {
      console.error('Error inesperado al cargar registros:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Sin dependencias, la función es estable

  // Cargar registros SOLO al montar el componente (una vez al ingresar)
  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros]);

  // Registrar nueva entrega
  const registrarEntrega = async () => {
    if (!validarFormulario()) return;

    try {
      setLoading(true);
      
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('Error: Usuario no autenticado');
        return;
      }

      console.log('🔍 Usuario ID obtenido:', usuarioId);

      // Si el estado es "entregado" al registrar, guardar fecha/hora actual
      let fechaHoraEntrega = null;
      if (entrega.estado === 'entregado') {
        const fechaHoraChile = new Date().toLocaleString('en-US', { 
          timeZone: 'America/Santiago' 
        });
        fechaHoraEntrega = new Date(fechaHoraChile).toISOString();
      }

      const datosEntrega = {
        fecha_entrega: entrega.fecha_entrega,
        destino: entrega.destino,
        nombre_entrega: entrega.nombre_entrega,
        nombre_retira: entrega.nombre_retira,
        tipo_carga: entrega.tipo_carga,
        cantidad: Number(entrega.cantidad),
        comentarios: entrega.comentarios || null,
        estado: entrega.estado,
        fecha_hora_entrega: fechaHoraEntrega,
        usuario_id: usuarioId,
        cliente_id: usuarioId
      };

      console.log('📦 Datos a insertar:', datosEntrega);

      const { data, error } = await supabase
        .from('transporte')
        .insert([datosEntrega])
        .select();

      if (error) {
        console.error('❌ Error al guardar entrega:', error);
        console.error('❌ Detalles del error:', JSON.stringify(error, null, 2));
        alert('Error al guardar entrega: ' + error.message);
        return;
      }

      console.log('✅ Entrega guardada exitosamente:', data);

      alert('Entrega registrada exitosamente');
      
      // Recargar registros
      await cargarRegistros();
      
      // Limpiar formulario
      setEntrega({
        fecha_entrega: obtenerFechaHoyChile(),
        destino: '',
        nombre_entrega: '',
        nombre_retira: '',
        tipo_carga: '',
        cantidad: '',
        comentarios: '',
        estado: 'en_transito'
      });
    } catch (error) {
      console.error('Error inesperado al registrar entrega:', error);
      alert('Error inesperado al registrar entrega');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado
  const cambiarEstado = async (id, nuevoEstado) => {
    // Si cambia a "entregado", mostrar popup para capturar nombre de quien retira
    if (nuevoEstado === 'entregado') {
      const registro = registros.find(r => r.id === id);
      setRegistroEntrega({ id, registro });
      setNombreQuienRetiro('');
      setMostrarPopupEntrega(true);
      return;
    }

    // Si cambia de "entregado" a "en_transito", limpiar datos de entrega
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('Error: Usuario no autenticado');
        return;
      }

      const { error } = await supabase
        .from('transporte')
        .update({ 
          estado: nuevoEstado,
          fecha_hora_entrega: null,
          nombre_retiro: null
        })
        .eq('id', id)
        .eq('usuario_id', usuarioId);

      if (error) {
        console.error('Error al actualizar estado:', error);
        alert('Error al actualizar estado');
        return;
      }

      // Actualizar estado local
      setRegistros(prev => prev.map(reg => 
        reg.id === id ? { 
          ...reg, 
          estado: nuevoEstado,
          fecha_hora_entrega: null,
          nombre_retiro: null
        } : reg
      ));
    } catch (error) {
      console.error('Error inesperado al actualizar estado:', error);
      alert('Error inesperado al actualizar estado');
    }
  };

  // Confirmar entrega desde el popup
  const confirmarEntrega = async () => {
    if (!nombreQuienRetiro.trim()) {
      alert('Por favor ingrese el nombre de quien retira');
      return;
    }

    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('Error: Usuario no autenticado');
        return;
      }

      // Obtener fecha/hora actual en zona horaria de Santiago, Chile
      const fechaHoraChile = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Santiago' 
      });
      const fechaHoraISO = new Date(fechaHoraChile).toISOString();

      const { error } = await supabase
        .from('transporte')
        .update({ 
          estado: 'entregado',
          fecha_hora_entrega: fechaHoraISO,
          nombre_retiro: nombreQuienRetiro.trim()
        })
        .eq('id', registroEntrega.id)
        .eq('usuario_id', usuarioId);

      if (error) {
        console.error('Error al confirmar entrega:', error);
        alert('Error al confirmar entrega');
        return;
      }

      // Actualizar estado local
      setRegistros(prev => prev.map(reg => 
        reg.id === registroEntrega.id ? { 
          ...reg, 
          estado: 'entregado',
          fecha_hora_entrega: fechaHoraISO,
          nombre_retiro: nombreQuienRetiro.trim()
        } : reg
      ));

      // Cerrar popup
      setMostrarPopupEntrega(false);
      setRegistroEntrega(null);
      setNombreQuienRetiro('');
      
      alert('✅ Entrega confirmada exitosamente');
    } catch (error) {
      console.error('Error inesperado al confirmar entrega:', error);
      alert('Error inesperado al confirmar entrega');
    }
  };

  // Cancelar popup de entrega
  const cancelarPopupEntrega = () => {
    setMostrarPopupEntrega(false);
    setRegistroEntrega(null);
    setNombreQuienRetiro('');
  };

  // Eliminar registro
  const eliminarRegistro = async (id) => {
    if (!confirm('¿Está seguro de eliminar este registro?')) {
      return;
    }

    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('Error: Usuario no autenticado');
        return;
      }

      const { error } = await supabase
        .from('transporte')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId);

      if (error) {
        console.error('Error al eliminar registro:', error);
        alert('Error al eliminar registro');
        return;
      }

      // Actualizar estado local
      setRegistros(prev => prev.filter(reg => reg.id !== id));
      alert('Registro eliminado exitosamente');
    } catch (error) {
      console.error('Error inesperado al eliminar registro:', error);
      alert('Error inesperado al eliminar registro');
    }
  };

  // Función para obtener el color del badge según el estado
  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'en_transito':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'entregado':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Filtrar registros
  const registrosFiltrados = registros.filter(registro => {
    // Filtro por fecha
    if (filtros.fecha && registro.fecha_entrega !== filtros.fecha) {
      return false;
    }
    
    // Filtro por destino
    if (filtros.destino && !registro.destino.toLowerCase().includes(filtros.destino.toLowerCase())) {
      return false;
    }
    
    // Filtro por estado
    if (filtros.estado && registro.estado !== filtros.estado) {
      return false;
    }
    
    // Filtro por nombre (busca en quien entrega y quien retira)
    if (filtros.nombre) {
      const nombreBusqueda = filtros.nombre.toLowerCase();
      const coincideEntrega = registro.nombre_entrega.toLowerCase().includes(nombreBusqueda);
      const coincideRetira = registro.nombre_retira.toLowerCase().includes(nombreBusqueda);
      if (!coincideEntrega && !coincideRetira) {
        return false;
      }
    }
    
    return true;
  });

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      fecha: '',
      destino: '',
      estado: '',
      nombre: ''
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a3d1a' }}>
      {/* Estilos personalizados para scrollbar */}
      <style>{`
        .scroll-container::-webkit-scrollbar {
          width: 6px;
        }
        .scroll-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .scroll-container::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #10b981 0%, #059669 100%);
          border-radius: 10px;
        }
        .scroll-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #059669 0%, #047857 100%);
        }
      `}</style>

      {/* Fondo degradado */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          background: `
            linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
            radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%)
          `
        }}
      />

      {/* Popup de confirmación de entrega */}
      {mostrarPopupEntrega && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl max-w-md w-full p-4 sm:p-6">
            <div className="space-y-4">
              {/* Título */}
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl">📦</span>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Confirmar Entrega
                </h3>
              </div>

              {/* Información de la carga */}
              {registroEntrega?.registro && (
                <div className="bg-white/5 rounded-lg p-3 space-y-2 text-sm">
                  <p className="text-gray-300">
                    <span className="font-semibold text-white">Destino:</span>{' '}
                    {registroEntrega.registro.destino}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold text-white">Entrega:</span>{' '}
                    {registroEntrega.registro.nombre_entrega}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold text-white">Retira (programado):</span>{' '}
                    {registroEntrega.registro.nombre_retira}
                  </p>
                </div>
              )}

              {/* Input para nombre de quien retira */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de quien retira <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nombreQuienRetiro}
                  onChange={(e) => setNombreQuienRetiro(e.target.value)}
                  placeholder="Ingrese el nombre completo"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 text-sm sm:text-base"
                  autoFocus
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={cancelarPopupEntrega}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 sm:py-2.5 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEntrega}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 sm:py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg text-sm sm:text-base"
                >
                  Confirmar Entrega
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Botón Volver al Inicio */}
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
          <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-3 sm:mb-4 md:mb-6 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            🚛 Gestión de Transporte
          </h1>

          <p className="text-gray-300 text-xs sm:text-sm md:text-base text-center mb-4 sm:mb-6 md:mb-8">
            Control de encomiendas y envíos
          </p>

          {/* Formulario de Entrega */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 border border-white/20 shadow-2xl mb-4 sm:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                <span>📦</span>
                <span>Registrar Entrega</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-4">
                {/* Fecha Entrega */}
                <div>
                  <label className="block text-green-200 text-sm md:text-base font-medium mb-2">
                    Fecha Entrega
                  </label>
                  <input
                    type="date"
                    name="fecha_entrega"
                    value={entrega.fecha_entrega}
                    onChange={handleEntregaChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                {/* Destino */}
                <div>
                  <label className="block text-green-200 text-sm md:text-base font-medium mb-2">
                    Destino
                  </label>
                  <input
                    type="text"
                    name="destino"
                    value={entrega.destino}
                    onChange={handleEntregaChange}
                    placeholder="Ciudad o lugar de destino"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                {/* Quien Entrega */}
                <div>
                  <label className="block text-green-200 text-sm md:text-base font-medium mb-2">
                    Quien Entrega
                  </label>
                  <input
                    type="text"
                    name="nombre_entrega"
                    value={entrega.nombre_entrega}
                    onChange={handleEntregaChange}
                    placeholder="Nombre completo"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                {/* Quien Retira */}
                <div>
                  <label className="block text-green-200 text-sm md:text-base font-medium mb-2">
                    Quien Retira
                  </label>
                  <input
                    type="text"
                    name="nombre_retira"
                    value={entrega.nombre_retira}
                    onChange={handleEntregaChange}
                    placeholder="Nombre completo"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-green-200 text-sm md:text-base font-medium mb-2">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={entrega.estado}
                    onChange={handleEntregaChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  >
                    <option value="en_transito" className="bg-gray-800">En Tránsito</option>
                    <option value="entregado" className="bg-gray-800">Entregado</option>
                  </select>
                </div>
              </div>

              {/* Subtítulo: Información de la Carga */}
              <div className="mt-8 mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
                  <span>📋</span>
                  <span>Información de la Carga</span>
                </h3>
                <div className="h-px bg-gradient-to-r from-green-500/50 to-transparent mt-2"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-4">
                {/* Tipo de Carga */}
                <div>
                  <label className="block text-green-200 text-sm md:text-base font-medium mb-2">
                    Tipo de Carga
                  </label>
                  <select
                    name="tipo_carga"
                    value={entrega.tipo_carga}
                    onChange={handleEntregaChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  >
                    <option value="" className="bg-gray-800">Seleccione tipo</option>
                    {tiposCarga.map((tipo, index) => (
                      <option key={index} value={tipo} className="bg-gray-800">
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-green-200 text-sm md:text-base font-medium mb-2">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    value={entrega.cantidad}
                    onChange={handleEntregaChange}
                    placeholder="0"
                    min="1"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                {/* Comentarios */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-green-200 text-sm md:text-base font-medium mb-2">
                    Comentarios
                  </label>
                  <textarea
                    name="comentarios"
                    value={entrega.comentarios}
                    onChange={handleEntregaChange}
                    placeholder="Detalles adicionales sobre la carga..."
                    rows="3"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-base resize-none"
                  />
                </div>
              </div>

              {/* Botón Registrar */}
              <div className="mt-6">
                <button
                  onClick={registrarEntrega}
                  disabled={loading}
                  className="w-full md:w-auto md:ml-auto md:block px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-base md:text-lg"
                >
                  {loading ? 'Registrando...' : '✓ Registrar Entrega'}
                </button>
              </div>
            </div>

          {/* Registros */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 border border-white/20 shadow-2xl">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 md:mb-6 flex items-center gap-2">
                <span>📦</span>
                <span>Registros de Entregas</span>
                {registros.length > 0 && (
                  <span className="text-xs sm:text-sm md:text-base font-normal text-gray-300">
                    ({registrosFiltrados.length} de {registros.length})
                  </span>
                )}
              </h2>

              {/* Filtros */}
              {registros.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 md:p-4 mb-4 md:mb-6">
                  <h3 className="text-base md:text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span>🔍</span>
                    <span>Filtros de Búsqueda</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Filtro por Fecha */}
                    <div>
                      <label className="block text-green-200 text-xs md:text-sm font-medium mb-1.5">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={filtros.fecha}
                        onChange={(e) => setFiltros(prev => ({ ...prev, fecha: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>

                    {/* Filtro por Destino */}
                    <div>
                      <label className="block text-green-200 text-xs md:text-sm font-medium mb-1.5">
                        Destino
                      </label>
                      <input
                        type="text"
                        value={filtros.destino}
                        onChange={(e) => setFiltros(prev => ({ ...prev, destino: e.target.value }))}
                        placeholder="Buscar destino..."
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>

                    {/* Filtro por Estado */}
                    <div>
                      <label className="block text-green-200 text-xs md:text-sm font-medium mb-1.5">
                        Estado
                      </label>
                      <select
                        value={filtros.estado}
                        onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        <option value="" className="bg-gray-800">Todos</option>
                        <option value="en_transito" className="bg-gray-800">En Tránsito</option>
                        <option value="entregado" className="bg-gray-800">Entregado</option>
                      </select>
                    </div>

                    {/* Filtro por Nombre */}
                    <div>
                      <label className="block text-green-200 text-xs md:text-sm font-medium mb-1.5">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={filtros.nombre}
                        onChange={(e) => setFiltros(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Entrega o retira..."
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Botón Limpiar Filtros */}
                  {(filtros.fecha || filtros.destino || filtros.estado || filtros.nombre) && (
                    <div className="mt-3 flex justify-center">
                      <button
                        onClick={limpiarFiltros}
                        className="px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-lg transition-all duration-200 text-xs md:text-sm font-medium shadow-md hover:shadow-lg"
                      >
                        🗑️ Limpiar Filtros
                      </button>
                    </div>
                  )}
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="text-white text-lg">Cargando registros...</div>
                </div>
              ) : registros.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl md:text-6xl mb-4">📭</div>
                  <p className="text-gray-300 text-base md:text-lg">No hay registros aún</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Registra tu primera entrega para comenzar
                  </p>
                </div>
              ) : registrosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl md:text-6xl mb-4">🔍</div>
                  <p className="text-gray-300 text-base md:text-lg">No se encontraron resultados</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              ) : (
                <>
                  {/* Indicador de scroll cuando hay más de 20 registros */}
                  {registrosFiltrados.length > 20 && (
                    <div className="mb-2 flex items-center justify-between bg-blue-600/20 border border-blue-500/40 rounded-lg px-3 py-1.5">
                      <span className="text-blue-200 text-xs font-medium">
                        📊 {registrosFiltrados.length} registros
                      </span>
                      <span className="text-blue-300 text-[10px] animate-pulse">
                        ⬇️ Desliza para ver más
                      </span>
                    </div>
                  )}
                  
                  <div 
                    className="space-y-1.5 scroll-container" 
                    style={{ 
                      maxHeight: registrosFiltrados.length > 20 ? '600px' : 'none',
                      overflowY: registrosFiltrados.length > 20 ? 'auto' : 'visible',
                      paddingRight: registrosFiltrados.length > 20 ? '4px' : '0',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#10b981 rgba(255,255,255,0.1)'
                    }}
                  >
                  {registrosFiltrados.map((registro) => (
                    <div
                      key={registro.id}
                      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-md p-2 sm:p-2.5 hover:bg-white/15 transition-all duration-200"
                    >
                      {/* Header: Destino, Fecha y Acciones */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-1">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className="text-sm sm:text-base flex-shrink-0">📍</span>
                          <span className="font-bold text-white text-xs sm:text-sm truncate" title={registro.destino}>
                            {registro.destino}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">
                            📅 {registro.fecha_entrega}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-1 flex-shrink-0">
                          <select
                            value={registro.estado}
                            onChange={(e) => cambiarEstado(registro.id, e.target.value)}
                            className={`px-2 sm:px-1.5 py-1 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border min-w-[90px] sm:min-w-[85px] ${obtenerColorEstado(registro.estado)}`}
                            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                          >
                            <option value="en_transito" className="bg-gray-800">🚛 Tránsito</option>
                            <option value="entregado" className="bg-gray-800">✅ Entregado</option>
                          </select>
                          <button
                            onClick={() => eliminarRegistro(registro.id)}
                            className="bg-red-600/80 hover:bg-red-700 text-white px-2 sm:px-1.5 py-1 sm:py-0.5 rounded text-xs sm:text-[10px] transition-all duration-200 min-w-[32px]"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Línea horizontal con toda la información principal */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-1 mb-1">
                        {/* Quien Entrega */}
                        <div className="bg-white/5 rounded p-1.5 sm:p-1 border border-white/10">
                          <div className="text-green-300 text-[10px] sm:text-[9px] font-medium mb-0.5">👤 Entrega</div>
                          <div className="text-white text-xs sm:text-[10px] font-medium truncate" title={registro.nombre_entrega}>
                            {registro.nombre_entrega}
                          </div>
                        </div>

                        {/* Quien Retira */}
                        <div className="bg-white/5 rounded p-1.5 sm:p-1 border border-white/10">
                          <div className="text-blue-300 text-[10px] sm:text-[9px] font-medium mb-0.5">👥 Retira</div>
                          <div className="text-white text-xs sm:text-[10px] font-medium truncate" title={registro.nombre_retira}>
                            {registro.nombre_retira}
                          </div>
                        </div>

                        {/* Carga */}
                        <div className="bg-gradient-to-r from-green-700/40 to-green-900/40 rounded p-1.5 sm:p-1 border border-green-500/30">
                          <div className="text-green-200 text-[10px] sm:text-[9px] font-medium mb-0.5">📦 Carga</div>
                          <div className="text-white text-xs sm:text-[10px] font-bold truncate" title={`${registro.cantidad} ${registro.tipo_carga}`}>
                            {registro.cantidad} {registro.tipo_carga}
                          </div>
                        </div>

                        {/* Comentarios */}
                        <div className="bg-white/5 rounded p-1.5 sm:p-1 border border-white/10">
                          <div className="text-yellow-300 text-[10px] sm:text-[9px] font-medium mb-0.5">💬 Nota</div>
                          <div className="text-gray-300 text-xs sm:text-[10px] italic truncate" title={registro.comentarios || 'Sin comentarios'}>
                            {registro.comentarios || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Información de entrega (solo cuando está entregado) */}
                      {registro.estado === 'entregado' && registro.fecha_hora_entrega && (
                        <div className="bg-gradient-to-r from-green-600/30 to-green-700/30 rounded p-1.5 sm:p-1 border border-green-500/40">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                            <div className="flex items-center gap-1.5 sm:gap-1">
                              <span className="text-green-300 text-xs sm:text-[9px] font-semibold">✅</span>
                              <span className="text-white text-xs sm:text-[10px] font-bold">
                                {new Date(registro.fecha_hora_entrega).toLocaleString('es-CL', { 
                                  timeZone: 'America/Santiago',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                }).replace(',', ' •')}
                              </span>
                            </div>
                            {registro.nombre_retiro && (
                              <div className="flex items-center gap-1.5 sm:gap-1 pl-0 sm:pl-2 border-l-0 sm:border-l border-green-500/40">
                                <span className="text-green-300 text-xs sm:text-[9px] font-semibold">👤</span>
                                <span className="text-white text-xs sm:text-[10px] font-bold truncate" title={registro.nombre_retiro}>
                                  {registro.nombre_retiro}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  </div>
                </>
              )}

              {/* Resumen Visual Compacto */}
              {registros.length > 0 && (
                <div className="mt-4 md:mt-6">
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {/* En Tránsito */}
                    <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 backdrop-blur-sm border border-blue-500/40 rounded-lg p-3 md:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl md:text-2xl">🚛</span>
                        <div className="text-blue-200 text-xs font-semibold uppercase">
                          Tránsito
                        </div>
                      </div>
                      <div className="text-white text-2xl md:text-3xl font-bold">
                        {registros.filter(r => r.estado === 'en_transito').length}
                      </div>
                    </div>

                    {/* Entregados */}
                    <div className="bg-gradient-to-br from-green-600/30 to-green-800/30 backdrop-blur-sm border border-green-500/40 rounded-lg p-3 md:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl md:text-2xl">✅</span>
                        <div className="text-green-200 text-xs font-semibold uppercase">
                          Entregados
                        </div>
                      </div>
                      <div className="text-white text-2xl md:text-3xl font-bold">
                        {registros.filter(r => r.estado === 'entregado').length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}


