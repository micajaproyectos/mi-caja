import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Footer from './Footer';

export default function RegistroAsistencia() {
  // ⚠️ IMPORTANTE: Este componente NO ejecuta escritura automática en localStorage
  // Solo se escriben datos cuando el usuario hace clic explícitamente en "Registrar Entrada"
  // Las funciones de lectura (obtenerEntradasPendientes, obtenerUltimaEntradaHoy, etc.)
  // solo leen datos existentes, no crean nuevos registros
  // 
  // ✅ OPTIMIZACIONES IMPLEMENTADAS:
  // - useMemo para estadisticas: evita recálculos innecesarios
  // - useMemo para ultimaEntradaHoy: evita llamadas a localStorage en cada render
  // - useMemo para entradasPendientesVisual: listado visual de entradas pendientes
  // - Validaciones robustas: todas las funciones validan parámetros antes de operar
  // - Validación de empleado: requiere al menos 2 caracteres para activar funciones de localStorage
  
  const navigate = useNavigate();
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaActual, setFechaActual] = useState('');
  const [horaActual, setHoraActual] = useState('');
  const [empleado, setEmpleado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  // Función para obtener la fecha actual en formato YYYY-MM-DD en Santiago, Chile
  const obtenerFechaActual = () => {
    const fecha = new Date();
    const fechaSantiago = fecha.toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago'
    });
    return fechaSantiago; // Formato YYYY-MM-DD
  };

  // Función para obtener la hora actual en Santiago, Chile
  const obtenerHoraActual = () => {
    return new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Santiago'
    });
  };

  // Función para obtener la hora actual en formato HH:MM para registros
  const obtenerHoraActualFormato = () => {
    const fecha = new Date();
    // Convertir a hora de Santiago, Chile
    const horaSantiago = fecha.toLocaleString('en-US', {
      timeZone: 'America/Santiago',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    return horaSantiago;
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

  // Cargar asistencias desde la tabla asistencia
  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('asistencia')
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

  // Función para calcular horas trabajadas entre dos horarios (formato HH:MM para mostrar)
  const calcularTotalHoras = (horaEntrada, horaSalida) => {
    if (!horaEntrada || !horaSalida) return null;
    
    const [horaEnt, minEnt] = horaEntrada.split(':').map(Number);
    const [horaSal, minSal] = horaSalida.split(':').map(Number);
    
    let horas = horaSal - horaEnt;
    let minutos = minSal - minEnt;
    
    if (minutos < 0) {
      horas -= 1;
      minutos += 60;
    }
    
    if (horas < 0) {
      horas += 24; // Asumimos que es el mismo día
    }
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  // Función para calcular horas trabajadas en formato decimal para Supabase
  const calcularTotalHorasDecimal = (horaEntrada, horaSalida) => {
    if (!horaEntrada || !horaSalida) return null;
    
    const [horaEnt, minEnt] = horaEntrada.split(':').map(Number);
    const [horaSal, minSal] = horaSalida.split(':').map(Number);
    
    let horas = horaSal - horaEnt;
    let minutos = minSal - minEnt;
    
    if (minutos < 0) {
      horas -= 1;
      minutos += 60;
    }
    
    if (horas < 0) {
      horas += 24; // Asumimos que es el mismo día
    }
    
    // Convertir a decimal (ej: 1:30 = 1.5 horas)
    const horasDecimal = horas + (minutos / 60);
    return parseFloat(horasDecimal.toFixed(2));
  };

  // Función para obtener la clave de localStorage
  const obtenerClaveLocalStorage = (empleado, fecha) => {
    // Validar que existan empleado y fecha, y que empleado tenga al menos 2 caracteres
    if (!empleado || !fecha || empleado.trim().length < 2) {
      console.warn('⚠️ Intento de obtener clave de localStorage sin empleado válido o fecha');
      return null;
    }
    return `asistencia_${empleado}_${fecha}`;
  };

  // Función para guardar entrada en localStorage
  const guardarEntradaLocal = (empleado, fecha, hora) => {
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    
    // Validar que la clave sea válida
    if (!clave) {
      console.error('❌ No se puede guardar entrada: clave de localStorage inválida');
      throw new Error('Clave de localStorage inválida');
    }
    
    const entradasExistentes = JSON.parse(localStorage.getItem(clave) || '[]');
    
    const nuevaEntrada = {
      hora_entrada: hora,
      sincronizado: false
    };
    
    entradasExistentes.push(nuevaEntrada);
    localStorage.setItem(clave, JSON.stringify(entradasExistentes));
    
    console.log('💾 Entrada guardada en localStorage:', nuevaEntrada);
    return nuevaEntrada;
  };

  // Función para obtener entradas pendientes
  const obtenerEntradasPendientes = (empleado, fecha) => {
    // Validar que existan empleado y fecha antes de proceder
    if (!empleado || !fecha || empleado.trim().length < 2) {
      console.log('🔍 No se pueden obtener entradas pendientes: empleado inválido o fecha faltante');
      return [];
    }
    
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    if (!clave) {
      console.log('🔍 No se pueden obtener entradas pendientes: clave inválida');
      return [];
    }
    
    const entradas = JSON.parse(localStorage.getItem(clave) || '[]');
    
    // Filtrar entradas que tienen hora_entrada pero no hora_salida
    const pendientes = entradas.filter(entrada => 
      entrada.hora_entrada && !entrada.hora_salida && !entrada.sincronizado
    );
    
    console.log('🔍 Entradas pendientes encontradas:', pendientes);
    return pendientes;
  };

  // Función para eliminar entrada pendiente del localStorage
  const eliminarEntradaPendiente = (empleado, fecha, horaEntrada) => {
    if (!empleado || !fecha || empleado.trim().length < 2) {
      console.warn('⚠️ No se puede eliminar entrada pendiente: empleado inválido');
      return;
    }
    
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    if (!clave) {
      console.warn('⚠️ No se puede eliminar entrada pendiente: clave inválida');
      return;
    }
    
    const entradas = JSON.parse(localStorage.getItem(clave) || '[]');
    
    // Encontrar y marcar como sincronizada la entrada específica
    const entradasActualizadas = entradas.map(entrada => {
      if (entrada.hora_entrada === horaEntrada && !entrada.sincronizado) {
        return { ...entrada, sincronizado: true };
      }
      return entrada;
    });
    
    localStorage.setItem(clave, JSON.stringify(entradasActualizadas));
    console.log('🗑️ Entrada marcada como sincronizada en localStorage');
  };

  // Función para obtener todas las entradas de localStorage (para mostrar en la interfaz)
  const obtenerTodasLasEntradas = (empleado, fecha) => {
    // Validar que existan empleado y fecha antes de proceder
    if (!empleado || !fecha || empleado.trim().length < 2) {
      return [];
    }
    
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    if (!clave) {
      return [];
    }
    
    return JSON.parse(localStorage.getItem(clave) || '[]');
  };

  // Función para obtener la última hora de entrada registrada hoy
  const obtenerUltimaEntradaHoy = (empleado, fecha) => {
    if (!empleado || !fecha || empleado.trim().length < 2) return null;
    
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    if (!clave) return null;
    
    const entradas = JSON.parse(localStorage.getItem(clave) || '[]');
    
    // Filtrar entradas que tienen hora_entrada (sin importar si están sincronizadas)
    const entradasConHora = entradas.filter(entrada => entrada.hora_entrada);
    
    if (entradasConHora.length === 0) return null;
    
    // Retornar la última entrada registrada
    const ultimaEntrada = entradasConHora[entradasConHora.length - 1];
    return ultimaEntrada.hora_entrada;
  };

  // Registrar hora de entrada
  const registrarEntrada = async () => {
    if (!empleado) {
      alert('❌ Por favor ingresa el nombre del empleado');
      return;
    }

    try {
      setLoading(true);
      const horaActual = obtenerHoraActualFormato();
      
      console.log('📝 Registrando entrada para:', empleado, 'fecha:', fechaActual, 'hora:', horaActual);
      
      // Guardar entrada en localStorage
      const entradaGuardada = guardarEntradaLocal(empleado, fechaActual, horaActual);
      
             console.log('✅ Hora de entrada registrada localmente:', entradaGuardada);
       alert(`✅ Hora de entrada registrada localmente: ${horaActual}\n\nLa entrada se sincronizará con el servidor cuando registres la salida.`);
       
       // Forzar re-render para mostrar la nueva entrada
       setEmpleado(empleado);
      
    } catch (error) {
      console.error('Error al registrar entrada:', error);
      alert('❌ Error al registrar la hora de entrada');
    } finally {
      setLoading(false);
    }
  };

  // Registrar hora de salida
  const registrarSalida = async () => {
    if (!empleado) {
      alert('❌ Por favor ingresa el nombre del empleado');
      return;
    }

    try {
      setLoading(true);
      const horaActual = obtenerHoraActualFormato();
      
      console.log('🔍 Buscando entradas pendientes para:', empleado, 'fecha:', fechaActual);
      
      // Buscar entradas pendientes en localStorage
      const entradasPendientes = obtenerEntradasPendientes(empleado, fechaActual);

      if (!entradasPendientes || entradasPendientes.length === 0) {
        alert('❌ No hay registros de entrada pendientes para este empleado en la fecha actual');
        return;
      }

      // Tomar la última entrada pendiente
      const entradaPendiente = entradasPendientes[entradasPendientes.length - 1];
      console.log('📝 Entrada pendiente a completar:', entradaPendiente);
      
             const totalHorasFormato = calcularTotalHoras(entradaPendiente.hora_entrada, horaActual);
       const totalHorasDecimal = calcularTotalHorasDecimal(entradaPendiente.hora_entrada, horaActual);
       console.log('⏰ Total horas calculadas (formato):', totalHorasFormato);
       console.log('⏰ Total horas calculadas (decimal):', totalHorasDecimal);

       // Crear registro completo para enviar a Supabase
       const registroCompleto = {
         empleado: empleado,
         fecha: fechaActual,
         hora_entrada: entradaPendiente.hora_entrada,
         hora_salida: horaActual,
         total_horas: totalHorasDecimal
       };
      
      console.log('📋 Registro completo a enviar:', registroCompleto);

      // Enviar a Supabase
      const { data, error } = await supabase
        .from('asistencia')
        .insert([registroCompleto])
        .select('*');

      if (error) {
        console.error('Error en inserción a Supabase:', error);
        throw error;
      }

             // Marcar entrada como sincronizada en localStorage
       eliminarEntradaPendiente(empleado, fechaActual, entradaPendiente.hora_entrada);

              console.log('✅ Hora de salida registrada exitosamente:', data);
        cargarAsistencias();
        
        // Forzar re-render para actualizar el listado visual
        setEmpleado(empleado);
        
        alert(`✅ Hora de salida registrada: ${horaActual}\nTotal horas trabajadas: ${totalHorasFormato}\n\nRegistro sincronizado con el servidor.`);
      
    } catch (error) {
      console.error('Error al registrar salida:', error);
      alert('❌ Error al registrar la hora de salida');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroFecha('');
  };

  // Función para limpiar entradas pendientes del localStorage
  const limpiarEntradasPendientes = () => {
    if (empleado && fechaActual && empleado.trim().length >= 2) {
      const clave = obtenerClaveLocalStorage(empleado, fechaActual);
      if (clave) {
        localStorage.removeItem(clave);
        console.log('🧹 Entradas pendientes eliminadas del localStorage');
        alert('✅ Entradas pendientes eliminadas del localStorage');
      } else {
        console.warn('⚠️ No se pueden limpiar entradas pendientes: clave inválida');
        alert('❌ No se pueden limpiar entradas pendientes');
      }
    } else {
      console.warn('⚠️ No se pueden limpiar entradas pendientes: empleado inválido');
      alert('❌ No se pueden limpiar entradas pendientes: empleado inválido');
    }
  };

  // Función para mostrar información de debug
  const mostrarInfoDebug = () => {
    if (empleado && fechaActual && empleado.trim().length >= 2) {
      const entradas = obtenerTodasLasEntradas(empleado, fechaActual);
      const pendientes = obtenerEntradasPendientes(empleado, fechaActual);
      
      console.log('🔍 Información de debug:');
      console.log('Empleado:', empleado);
      console.log('Fecha:', fechaActual);
      console.log('Todas las entradas:', entradas);
      console.log('Entradas pendientes:', pendientes);
      
      alert(`🔍 Información de Debug:\n\nEmpleado: ${empleado}\nFecha: ${fechaActual}\n\nTodas las entradas: ${JSON.stringify(entradas, null, 2)}\n\nEntradas pendientes: ${JSON.stringify(pendientes, null, 2)}`);
    } else {
      alert('❌ No se puede mostrar debug: empleado inválido o fecha faltante');
    }
  };

  // Función para convertir horas decimales a formato HH:MM
  const convertirHorasDecimalesAFormato = (horasDecimales) => {
    if (!horasDecimales || horasDecimales === 0) return '';
    
    const horas = Math.floor(horasDecimales);
    const minutos = Math.round((horasDecimales - horas) * 60);
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
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
        convertirHorasDecimalesAFormato(asistencia.total_horas) || '',
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

  // Calcular horas trabajadas por empleado (evitando duplicados por nombre)
  const horasPorEmpleado = useMemo(() => {
    // Crear un Map para evitar duplicados por nombre (case-insensitive)
    const empleadosMap = new Map();
    
    asistencias.forEach(asistencia => {
      if (asistencia.empleado && asistencia.total_horas) {
        const nombreNormalizado = asistencia.empleado.toLowerCase().trim();
        
        if (empleadosMap.has(nombreNormalizado)) {
          // Sumar horas al empleado existente
          const empleadoExistente = empleadosMap.get(nombreNormalizado);
          empleadoExistente.total_horas += asistencia.total_horas;
          empleadoExistente.registros += 1;
        } else {
          // Crear nuevo empleado
          empleadosMap.set(nombreNormalizado, {
            nombre: asistencia.empleado, // Mantener nombre original
            total_horas: asistencia.total_horas,
            registros: 1
          });
        }
      }
    });
    
    // Convertir Map a array y ordenar por total de horas (descendente)
    return Array.from(empleadosMap.values())
      .sort((a, b) => b.total_horas - a.total_horas);
  }, [asistencias]);

  // Calcular estadísticas del día (mantener para otras funcionalidades)
  const estadisticas = useMemo(() => {
    const asistenciasHoy = asistencias.filter(a => a.fecha === fechaActual);
    const entradasServidor = asistenciasHoy.filter(a => a.hora_entrada).length;
    const salidasServidor = asistenciasHoy.filter(a => a.hora_salida).length;
    
    // Obtener entradas pendientes del localStorage solo si hay empleado válido
    let entradasPendientesCount = 0;
    if (empleado && fechaActual && empleado.trim().length >= 2) {
      const entradasPendientes = obtenerEntradasPendientes(empleado, fechaActual);
      entradasPendientesCount = entradasPendientes.length;
    }
    
    const entradas = entradasServidor + entradasPendientesCount;
    const salidas = salidasServidor;
    const total = asistenciasHoy.length + entradasPendientesCount;
    
    return { entradas, salidas, total, entradasPendientes: entradasPendientesCount };
  }, [asistencias, empleado, fechaActual]);

  // Memoizar la última entrada para evitar llamadas innecesarias
  const ultimaEntradaHoy = useMemo(() => {
    if (!empleado || !fechaActual || empleado.trim().length < 2) return null;
    return obtenerUltimaEntradaHoy(empleado, fechaActual);
  }, [empleado, fechaActual]);

  // Memoizar todas las entradas pendientes para el listado visual
  const entradasPendientesVisual = useMemo(() => {
    if (!empleado || !fechaActual || empleado.trim().length < 2) return [];
    return obtenerEntradasPendientes(empleado, fechaActual);
  }, [empleado, fechaActual]);

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
            📋 Registro de Asistencia
          </h1>

          {/* Reloj y fecha actual */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6 md:mb-8">
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {horaActual}
              </div>
              <div className="text-base md:text-xl text-gray-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {new Date(fechaActual).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>

          {/* Horas trabajadas por empleado */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-4 md:mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              ⏰ Horas Trabajadas por Empleado
            </h2>
            
            {horasPorEmpleado.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <div className="text-gray-300 text-sm md:text-base">📭 No hay registros de horas trabajadas</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {horasPorEmpleado.map((empleado, index) => (
                  <div
                    key={`${empleado.nombre}_${index}`}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4"
                  >
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-bold text-white mb-1 truncate" title={empleado.nombre}>
                        👤 {empleado.nombre}
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-green-400 mb-1">
                        {convertirHorasDecimalesAFormato(empleado.total_horas)}
                      </div>
                      <div className="text-gray-300 text-xs md:text-sm">
                        {empleado.registros} registro{empleado.registros !== 1 ? 's' : ''}
                      </div>
                      <div className="text-gray-400 text-xs">
                        Total horas: {empleado.total_horas.toFixed(2)}h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Resumen total */}
            {horasPorEmpleado.length > 0 && (
              <div className="mt-4 md:mt-6 pt-4 border-t border-white/20">
                <div className="text-center">
                  <div className="text-lg md:text-xl font-bold text-white">
                    📊 Total General: {convertirHorasDecimalesAFormato(
                      horasPorEmpleado.reduce((total, emp) => total + emp.total_horas, 0)
                    )}
                  </div>
                  <div className="text-gray-300 text-sm">
                    {horasPorEmpleado.length} empleado{horasPorEmpleado.length !== 1 ? 's' : ''} registrado{horasPorEmpleado.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Formulario de registro */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                📝 Registrar Asistencia
              </h2>
              
              <div className="space-y-4 md:space-y-6">
                {/* Nombre del empleado */}
                <div>
                  <label className="block text-white font-medium mb-2 text-sm md:text-base" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    👤 Nombre del Empleado
                  </label>
                  <input
                    type="text"
                    value={empleado}
                    onChange={(e) => setEmpleado(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-sm md:text-base"
                    placeholder="Ingresa el nombre del empleado"
                    required
                  />
                </div>

                {/* Botones de entrada y salida */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {/* Botón de entrada */}
                  <button
                    onClick={registrarEntrada}
                    disabled={loading || !empleado}
                    className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm md:text-base"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {loading ? '⏳ Registrando...' : '📥 Registrar Entrada'}
                  </button>

                  {/* Botón de salida */}
                  <button
                    onClick={registrarSalida}
                    disabled={loading || !empleado}
                    className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm md:text-base"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {loading ? '⏳ Registrando...' : '📤 Registrar Salida'}
                  </button>
                </div>

                {/* Listado visual de entradas pendientes */}
                {empleado && entradasPendientesVisual.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 md:p-4">
                    <div className="mb-3">
                      <h3 className="text-base md:text-lg font-semibold text-white text-center">
                        📋 Entradas Pendientes de Sincronización
                      </h3>
                      <p className="text-xs text-gray-400 text-center">
                        Estas entradas se sincronizarán automáticamente al registrar la salida
                      </p>
                    </div>
                    
                    <div className="space-y-2 max-h-40 md:max-h-48 overflow-y-auto">
                      {entradasPendientesVisual.map((entrada, index) => (
                        <div
                          key={`${entrada.hora_entrada}_${index}`}
                          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2 md:p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white text-sm truncate">
                                👤 {empleado}
                              </div>
                              <div className="text-xs text-gray-400">
                                🕒 Entrada: {entrada.hora_entrada}
                              </div>
                              <div className="text-xs text-gray-400">
                                📅 Fecha: {new Date(fechaActual).toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                            <div className="ml-2 md:ml-3 flex-shrink-0">
                              <div className="px-2 py-1 bg-yellow-500/30 border border-yellow-500/50 rounded-full">
                                <span className="text-xs text-yellow-300 font-medium">
                                  ⏳ Pendiente
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <div className="text-xs text-gray-400 text-center">
                        💡 Registra la salida para sincronizar automáticamente con el servidor
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de asistencias */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-6 gap-3">
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center sm:text-left" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  📋 Registro de Asistencias
                </h2>
                <button
                  onClick={exportarCSV}
                  className="px-3 md:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 text-sm md:text-base"
                >
                  📊 Exportar CSV
                </button>
              </div>

              {/* Filtros y controles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                  placeholder="Filtrar por fecha"
                />
                <button
                  onClick={limpiarFiltros}
                  className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 text-sm md:text-base"
                >
                  🔄 Limpiar Filtros
                </button>
              </div>

              {/* Botones adicionales */}
              {empleado && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                  <button
                    onClick={mostrarInfoDebug}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 text-xs md:text-sm"
                  >
                    🔍 Debug Info
                  </button>
                  <button
                    onClick={limpiarEntradasPendientes}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 text-xs md:text-sm"
                  >
                    🧹 Limpiar Pendientes
                  </button>
                  <div className="px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-center">
                    <div className="text-yellow-300 text-xs md:text-sm">
                      📊 Pendientes: {estadisticas.entradasPendientes}
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de asistencias */}
              <div className="max-h-80 md:max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-white text-sm md:text-base">⏳ Cargando asistencias...</div>
                  </div>
                ) : error ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-red-400 text-sm md:text-base">❌ {error}</div>
                  </div>
                ) : asistencias.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-gray-300 text-sm md:text-base">📭 No hay registros de asistencia</div>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {asistencias.map((asistencia) => (
                      <div
                        key={asistencia.id}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 md:p-4"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm md:text-base truncate">
                              {asistencia.empleado}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">
                              {new Date(asistencia.fecha).toLocaleDateString('es-ES')}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">
                              Entrada: {asistencia.hora_entrada || 'No registrada'} | 
                              Salida: {asistencia.hora_salida || 'No registrada'}
                            </div>
                            {asistencia.total_horas && (
                              <div className="text-xs md:text-sm text-green-400 font-medium">
                                Total: {convertirHorasDecimalesAFormato(asistencia.total_horas)} horas
                              </div>
                            )}
                          </div>
                          <div className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
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
      
      {/* Footer */}
      <Footer />
    </div>
  );
} 