import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function RegistroAsistencia() {
  const navigate = useNavigate();
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaActual, setFechaActual] = useState('');
  const [horaActual, setHoraActual] = useState('');
  const [empleado, setEmpleado] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSalida, setHoraSalida] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const obtenerFechaActual = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Función para obtener la hora actual
  const obtenerHoraActual = () => {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Actualizar fecha y hora cada segundo
  useEffect(() => {
    const actualizarTiempo = () => {
      setFechaActual(obtenerFechaActual());
      setHoraActual(obtenerHoraActual());
    };

    actualizarTiempo();
    const intervalId = setInterval(actualizarTiempo, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Cargar asistencias desde la vista vista_asistencia
  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('vista_asistencia')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora_entrada', { ascending: false });

      // Aplicar filtro por fecha si está activo
      if (filtroFecha) {
        query = query.eq('fecha', filtroFecha);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAsistencias(data || []);
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
      setError('Error al cargar el registro de asistencias');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarAsistencias();
  }, [filtroFecha]);

  // Registrar asistencia
  const registrarAsistencia = async (e) => {
    e.preventDefault();
    
    if (!empleado) {
      alert('Por favor ingresa el nombre del empleado');
      return;
    }

    if (!horaEntrada && !horaSalida) {
      alert('Por favor ingresa al menos una hora (entrada o salida)');
      return;
    }

    try {
      setLoading(true);
      
      // Buscar si ya existe un registro para este empleado en la fecha actual
      const { data: registroExistente, error: errorBusqueda } = await supabase
        .from('asistencia')
        .select('*')
        .eq('empleado', empleado)
        .eq('fecha', fechaActual)
        .single();

      if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
        throw errorBusqueda;
      }

      let resultado;

      if (registroExistente) {
        // Actualizar registro existente
        const datosActualizar = {};
        
        if (horaEntrada) {
          if (registroExistente.hora_entrada) {
            alert('❌ Este empleado ya tiene registrada una hora de entrada para hoy');
            return;
          }
          datosActualizar.hora_entrada = horaEntrada;
        }
        
        if (horaSalida) {
          if (!registroExistente.hora_entrada && !horaEntrada) {
            alert('❌ No se puede registrar salida sin entrada previa');
            return;
          }
          if (registroExistente.hora_salida) {
            alert('❌ Este empleado ya tiene registrada una hora de salida para hoy');
            return;
          }
          datosActualizar.hora_salida = horaSalida;
        }

        const { data, error } = await supabase
          .from('asistencia')
          .update(datosActualizar)
          .eq('id', registroExistente.id)
          .select();

        if (error) throw error;
        resultado = data;
      } else {
        // Crear nuevo registro
        if (horaSalida && !horaEntrada) {
          alert('❌ No se puede registrar salida sin entrada previa');
          return;
        }

        const nuevaAsistencia = {
          empleado: empleado,
          fecha: fechaActual,
          hora_entrada: horaEntrada || null,
          hora_salida: horaSalida || null,
          total_horas: null // Se calcula automáticamente por el trigger
        };

        const { data, error } = await supabase
          .from('asistencia')
          .insert([nuevaAsistencia])
          .select();

        if (error) throw error;
        resultado = data;
      }

      console.log('✅ Asistencia registrada exitosamente:', resultado);
      
      // Limpiar formulario
      setEmpleado('');
      setHoraEntrada('');
      setHoraSalida('');
      
      // Recargar asistencias
      cargarAsistencias();
      
      alert('✅ Asistencia registrada exitosamente');
      
    } catch (error) {
      console.error('Error al registrar asistencia:', error);
      alert('❌ Error al registrar la asistencia');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroFecha('');
  };

  // Exportar datos a CSV
  const exportarCSV = () => {
    const headers = ['Empleado', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Total Horas', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...asistencias.map(asistencia => [
        asistencia.empleado || '',
        asistencia.fecha,
        asistencia.hora_entrada || '',
        asistencia.hora_salida || '',
        asistencia.total_horas || '',
        asistencia.estado || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asistencias_${fechaActual}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calcular estadísticas del día
  const calcularEstadisticasDia = () => {
    const asistenciasHoy = asistencias.filter(a => a.fecha === fechaActual);
    const entradas = asistenciasHoy.filter(a => a.hora_entrada).length;
    const salidas = asistenciasHoy.filter(a => a.hora_salida).length;
    
    return { entradas, salidas, total: asistenciasHoy.length };
  };

  const estadisticas = calcularEstadisticasDia();

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
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Botón de regreso */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          {/* Título principal */}
          <h1 className="text-6xl font-bold text-white text-center drop-shadow-lg mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            📋 Registro de Asistencia
          </h1>

          {/* Reloj y fecha actual */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20 mb-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {horaActual}
              </div>
              <div className="text-xl text-gray-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {new Date(fechaActual).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>

          {/* Estadísticas del día */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">📥</div>
                <div className="text-2xl font-bold text-white">{estadisticas.entradas}</div>
                <div className="text-gray-300">Entradas</div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400 mb-2">📤</div>
                <div className="text-2xl font-bold text-white">{estadisticas.salidas}</div>
                <div className="text-gray-300">Salidas</div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">📊</div>
                <div className="text-2xl font-bold text-white">{estadisticas.total}</div>
                <div className="text-gray-300">Total Registros</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulario de registro */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-6 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                📝 Registrar Asistencia
              </h2>
              
              <form onSubmit={registrarAsistencia} className="space-y-6">
                {/* Nombre del empleado */}
                <div>
                  <label className="block text-white font-medium mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    👤 Nombre del Empleado
                  </label>
                  <input
                    type="text"
                    value={empleado}
                    onChange={(e) => setEmpleado(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                    placeholder="Ingresa el nombre del empleado"
                    required
                  />
                </div>

                {/* Hora de entrada */}
                <div>
                  <label className="block text-white font-medium mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    📥 Hora de Entrada
                  </label>
                  <input
                    type="time"
                    value={horaEntrada}
                    onChange={(e) => setHoraEntrada(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Hora de salida */}
                <div>
                  <label className="block text-white font-medium mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    📤 Hora de Salida
                  </label>
                  <input
                    type="time"
                    value={horaSalida}
                    onChange={(e) => setHoraSalida(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Botón de registro */}
                <button
                  type="submit"
                  disabled={loading || !empleado}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {loading ? '⏳ Registrando...' : '✅ Registrar Asistencia'}
                </button>
              </form>
            </div>

            {/* Lista de asistencias */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  📋 Registro de Asistencias
                </h2>
                <button
                  onClick={exportarCSV}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                >
                  📊 Exportar CSV
                </button>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  placeholder="Filtrar por fecha"
                />
                <button
                  onClick={limpiarFiltros}
                  className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                >
                  🔄 Limpiar Filtros
                </button>
              </div>

              {/* Lista de asistencias */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-white">⏳ Cargando asistencias...</div>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="text-red-400">❌ {error}</div>
                  </div>
                ) : asistencias.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-300">📭 No hay registros de asistencia</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {asistencias.map((asistencia) => (
                      <div
                        key={asistencia.id}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {asistencia.empleado}
                            </div>
                            <div className="text-sm text-gray-400">
                              {new Date(asistencia.fecha).toLocaleDateString('es-ES')}
                            </div>
                            <div className="text-sm text-gray-400">
                              Entrada: {asistencia.hora_entrada || 'No registrada'} | 
                              Salida: {asistencia.hora_salida || 'No registrada'}
                            </div>
                            {asistencia.total_horas && (
                              <div className="text-sm text-green-400 font-medium">
                                Total: {asistencia.total_horas} horas
                              </div>
                            )}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            asistencia.estado === 'Completo'
                              ? 'bg-green-100 text-green-800'
                              : asistencia.estado === 'Solo Entrada'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {asistencia.estado === 'Completo' ? '✅ Completo' : 
                             asistencia.estado === 'Solo Entrada' ? '📥 Solo Entrada' : 
                             '❌ Sin Registro'}
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
    </div>
  );
} 