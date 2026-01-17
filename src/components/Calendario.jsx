import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlarmas } from '../contexts/AlarmasContext';
import Footer from './Footer';

function Calendario() {
  const navigate = useNavigate();
  const { recordatorios, agregarRecordatorio, actualizarRecordatorio, eliminarRecordatorio, isLoading, cargarRecordatorios } = useAlarmas();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [mostrarRecordatorios, setMostrarRecordatorios] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'pendiente', 'ejecutado'
  const [guardando, setGuardando] = useState(false);
  
  // Estados para edición
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);
  const [recordatorioEditando, setRecordatorioEditando] = useState(null);
  
  // Form state
  const [nuevoRecordatorio, setNuevoRecordatorio] = useState({
    asunto: '',
    hora: '',
    prioridad: 'media'
  });

  // Obtener fecha actual
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();
  const diaActual = hoy.getDate();

  // Nombres de meses y días
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Calcular días del mes
  const diasDelMes = useMemo(() => {
    const primerDia = new Date(anioActual, mesActual, 1).getDay();
    const ultimoDia = new Date(anioActual, mesActual + 1, 0).getDate();
    
    const dias = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < primerDia; i++) {
      dias.push(null);
    }
    
    // Días del mes
    for (let dia = 1; dia <= ultimoDia; dia++) {
      dias.push(dia);
    }
    
    return dias;
  }, [mesActual, anioActual]);

  // Abrir modal para agregar recordatorio
  const abrirModal = (dia) => {
    if (!dia) return;
    setDiaSeleccionado(dia);
    setModalAbierto(true);
    setNuevoRecordatorio({
      asunto: '',
      hora: '',
      prioridad: 'media'
    });
  };

  // Cerrar modal
  const cerrarModal = () => {
    setModalAbierto(false);
    setDiaSeleccionado(null);
  };

  // Abrir modal de edición
  const abrirModalEdicion = (recordatorio) => {
    setRecordatorioEditando({
      ...recordatorio,
      asunto: recordatorio.asunto,
      hora: recordatorio.hora,
      prioridad: recordatorio.prioridad,
      estado: recordatorio.estado
    });
    setModalEdicionAbierto(true);
  };

  // Cerrar modal de edición
  const cerrarModalEdicion = () => {
    setModalEdicionAbierto(false);
    setRecordatorioEditando(null);
  };

  // Actualizar recordatorio editado
  const actualizarRecordatorioEditado = async () => {
    if (!recordatorioEditando.asunto || !recordatorioEditando.hora) {
      alert('⚠️ Por favor completa todos los campos');
      return;
    }

    setGuardando(true);
    try {
      await actualizarRecordatorio(recordatorioEditando.id, {
        asunto: recordatorioEditando.asunto,
        hora: recordatorioEditando.hora,
        prioridad: recordatorioEditando.prioridad,
        estado: recordatorioEditando.estado
      });
      
      cerrarModalEdicion();
    } catch (error) {
      console.error('Error al actualizar recordatorio:', error);
    } finally {
      setGuardando(false);
    }
  };

  // Guardar recordatorio
  const guardarRecordatorio = async () => {
    if (!nuevoRecordatorio.asunto || !nuevoRecordatorio.hora) {
      alert('⚠️ Por favor completa todos los campos');
      return;
    }

    setGuardando(true);
    try {
      const recordatorio = {
        dia: diaSeleccionado,
        mes: mesActual,
        anio: anioActual,
        fecha: `${diaSeleccionado}/${mesActual + 1}/${anioActual}`,
        ...nuevoRecordatorio
      };

      await agregarRecordatorio(recordatorio);
      cerrarModal();
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setGuardando(false);
    }
  };

  // Obtener recordatorios de un día específico
  const obtenerRecordatoriosDia = (dia) => {
    return recordatorios.filter(r => 
      r.dia === dia && r.mes === mesActual && r.anio === anioActual
    );
  };

  // Obtener color según prioridad
  const getColorPrioridad = (prioridad) => {
    switch(prioridad) {
      case 'alta': return 'bg-red-500/80';
      case 'media': return 'bg-yellow-500/80';
      case 'baja': return 'bg-green-500/80';
      default: return 'bg-gray-500/80';
    }
  };

  // Filtrar recordatorios del mes actual
  const recordatoriosMesActual = recordatorios
    .filter(r => r.mes === mesActual && r.anio === anioActual)
    .filter(r => {
      if (filtroEstado === 'todos') return true;
      return r.estado === filtroEstado;
    })
    .sort((a, b) => {
      // Ordenar por día y luego por hora
      if (a.dia !== b.dia) return a.dia - b.dia;
      return a.hora.localeCompare(b.hora);
    });

  // Contar recordatorios por estado
  const contarPorEstado = (estado) => {
    return recordatorios.filter(r => 
      r.mes === mesActual && 
      r.anio === anioActual && 
      r.estado === estado
    ).length;
  };

  const totalPendientes = contarPorEstado('pendiente');
  const totalEjecutados = contarPorEstado('ejecutado');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a3d1a' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
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

          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              📅 Calendario Mi Caja
            </h1>
            <p className="text-green-200 text-lg md:text-xl italic animate-fade-in-delayed">
              Organiza y gestiona tus recordatorios
            </p>
          </div>

          {/* Indicador de carga */}
          {isLoading && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                <span className="text-white text-lg">Cargando recordatorios...</span>
              </div>
            </div>
          )}

          {/* Calendario */}
          {!isLoading && (
            <>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6">
            {/* Header del calendario */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {nombresMeses[mesActual]} {anioActual}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
                  <span className="text-sm text-yellow-300 font-semibold">
                    ⏰ {totalPendientes} Pendiente{totalPendientes !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/50">
                  <span className="text-sm text-green-300 font-semibold">
                    ✅ {totalEjecutados} Ejecutado{totalEjecutados !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {nombresDias.map((dia) => (
                <div
                  key={dia}
                  className="text-center text-sm md:text-base font-semibold text-green-300 py-2"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-2">
              {diasDelMes.map((dia, index) => {
                const recordatoriosDia = dia ? obtenerRecordatoriosDia(dia) : [];
                const esHoy = dia === diaActual;
                
                return (
                  <div
                    key={index}
                    onClick={() => abrirModal(dia)}
                    className={`
                      relative min-h-[80px] md:min-h-[100px] p-2 rounded-lg border transition-all duration-200
                      ${dia ? 'cursor-pointer hover:bg-white/10 hover:scale-105 hover:shadow-lg' : 'cursor-default'}
                      ${esHoy ? 'bg-green-500/20 border-green-400' : 'bg-white/5 border-white/10'}
                      ${!dia ? 'opacity-0' : ''}
                    `}
                  >
                    {dia && (
                      <>
                        <div className={`text-sm md:text-base font-semibold ${esHoy ? 'text-green-300' : 'text-white'}`}>
                          {dia}
                        </div>
                        
                        {/* Indicador de recordatorios */}
                        {recordatoriosDia.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {recordatoriosDia.slice(0, 2).map((rec) => (
                              <div
                                key={rec.id}
                                className={`text-xs px-1 py-0.5 rounded truncate ${getColorPrioridad(rec.prioridad)} text-white`}
                                title={`${rec.hora} - ${rec.asunto}`}
                              >
                                {rec.hora} {rec.asunto}
                              </div>
                            ))}
                            {recordatoriosDia.length > 2 && (
                              <div className="text-xs text-gray-300">
                                +{recordatoriosDia.length - 2} más
                              </div>
                            )}
                          </div>
                        )}

                        {/* Indicador visual de que es hoy */}
                        {esHoy && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista de recordatorios */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setMostrarRecordatorios(!mostrarRecordatorios)}
              >
                <h3 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  📋 Recordatorios de {nombresMeses[mesActual]}
                </h3>
                <button className="text-white hover:text-green-300 transition-colors">
                  {mostrarRecordatorios ? '▼' : '▶'}
                </button>
              </div>
            </div>

            {/* Filtros */}
            {mostrarRecordatorios && (
              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  onClick={() => setFiltroEstado('todos')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                    filtroEstado === 'todos'
                      ? 'bg-green-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Todos ({totalPendientes + totalEjecutados})
                </button>
                <button
                  onClick={() => setFiltroEstado('pendiente')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                    filtroEstado === 'pendiente'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  ⏰ Pendientes ({totalPendientes})
                </button>
                <button
                  onClick={() => setFiltroEstado('ejecutado')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                    filtroEstado === 'ejecutado'
                      ? 'bg-green-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  ✅ Ejecutados ({totalEjecutados})
                </button>
              </div>
            )}

            {mostrarRecordatorios && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {recordatoriosMesActual.length === 0 ? (
                  <p className="text-gray-300 text-center py-8">
                    No hay recordatorios para este mes. ¡Haz clic en un día para agregar uno!
                  </p>
                ) : (
                  recordatoriosMesActual.map((rec) => (
                    <div
                      key={rec.id}
                      className={`border rounded-lg p-3 hover:bg-white/10 transition-all ${
                        rec.estado === 'ejecutado' 
                          ? 'bg-white/5 border-green-500/30 opacity-60'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${getColorPrioridad(rec.prioridad)}`}>
                              {rec.prioridad.toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              rec.estado === 'ejecutado' 
                                ? 'bg-green-500/80 text-white'
                                : 'bg-yellow-500/80 text-white'
                            }`}>
                              {rec.estado === 'ejecutado' ? '✅ EJECUTADO' : '⏰ PENDIENTE'}
                            </span>
                            <span className="text-sm text-gray-300">
                              {rec.fecha}
                            </span>
                            <span className="text-sm font-semibold text-green-300">
                              {rec.hora}
                            </span>
                          </div>
                          <p className={`font-medium ${rec.estado === 'ejecutado' ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {rec.asunto}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => abrirModalEdicion(rec)}
                            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all text-sm"
                            title="Editar recordatorio"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => eliminarRecordatorio(rec.id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all text-sm"
                            title="Eliminar recordatorio"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Modal para agregar recordatorio */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20 w-full max-w-md"
            style={{ backgroundColor: 'rgba(31, 74, 31, 0.95)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                📝 Nuevo Recordatorio
              </h3>
              <button
                onClick={cerrarModal}
                className="text-white hover:text-red-300 text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-green-300 font-semibold mb-4">
                Fecha: {diaSeleccionado} de {nombresMeses[mesActual]} {anioActual}
              </p>

              {/* Asunto */}
              <div className="mb-4">
                <label className="block text-white text-sm font-semibold mb-2">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={nuevoRecordatorio.asunto}
                  onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, asunto: e.target.value })}
                  placeholder="Ej: Reunión con proveedor"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              {/* Hora */}
              <div className="mb-4">
                <label className="block text-white text-sm font-semibold mb-2">
                  Hora *
                </label>
                <input
                  type="time"
                  value={nuevoRecordatorio.hora}
                  onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, hora: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              {/* Prioridad */}
              <div className="mb-4">
                <label className="block text-white text-sm font-semibold mb-2">
                  Prioridad
                </label>
                <select
                  value={nuevoRecordatorio.prioridad}
                  onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, prioridad: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  <option value="baja" className="bg-gray-800">🟢 Baja</option>
                  <option value="media" className="bg-gray-800">🟡 Media</option>
                  <option value="alta" className="bg-gray-800">🔴 Alta</option>
                </select>
              </div>

              {/* Estado (solo informativo) */}
              <div className="mb-4">
                <label className="block text-white text-sm font-semibold mb-2">
                  Estado Inicial
                </label>
                <div className="w-full px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏰</span>
                    <span className="text-yellow-300 font-semibold">Pendiente</span>
                  </div>
                  <span className="text-xs text-yellow-300/70">Por defecto</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  💡 El estado cambiará a "Ejecutado" cuando presiones "Listo" en la alarma
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={cerrarModal}
                disabled={guardando}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarRecordatorio}
                disabled={guardando}
                className="flex-1 px-4 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {guardando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar recordatorio */}
      {modalEdicionAbierto && recordatorioEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20 w-full max-w-md"
            style={{ backgroundColor: 'rgba(31, 74, 31, 0.95)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                ✏️ Editar Recordatorio
              </h3>
              <button
                onClick={cerrarModalEdicion}
                className="text-white hover:text-red-300 text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-green-300 font-semibold mb-4">
                Fecha: {recordatorioEditando.fecha}
              </p>

              {/* Asunto */}
              <div className="mb-4">
                <label className="block text-white text-sm font-semibold mb-2">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={recordatorioEditando.asunto}
                  onChange={(e) => setRecordatorioEditando({ ...recordatorioEditando, asunto: e.target.value })}
                  placeholder="Ej: Reunión con proveedor"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              {/* Hora */}
              <div className="mb-4">
                <label className="block text-white text-sm font-semibold mb-2">
                  Hora *
                </label>
                <input
                  type="time"
                  value={recordatorioEditando.hora}
                  onChange={(e) => setRecordatorioEditando({ ...recordatorioEditando, hora: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              {/* Prioridad */}
              <div className="mb-4">
                <label className="block text-white text-sm font-semibold mb-2">
                  Prioridad
                </label>
                <select
                  value={recordatorioEditando.prioridad}
                  onChange={(e) => setRecordatorioEditando({ ...recordatorioEditando, prioridad: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  <option value="baja" className="bg-gray-800">🟢 Baja</option>
                  <option value="media" className="bg-gray-800">🟡 Media</option>
                  <option value="alta" className="bg-gray-800">🔴 Alta</option>
                </select>
              </div>

              {/* Estado (editable) */}
              <div className="mb-4">
                <label className="block text-white text-sm font-semibold mb-2">
                  Estado
                </label>
                <select
                  value={recordatorioEditando.estado}
                  onChange={(e) => setRecordatorioEditando({ ...recordatorioEditando, estado: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  <option value="pendiente" className="bg-gray-800">⏰ Pendiente</option>
                  <option value="ejecutado" className="bg-gray-800">✅ Ejecutado</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  💡 Puedes cambiar manualmente el estado del recordatorio
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={cerrarModalEdicion}
                disabled={guardando}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                onClick={actualizarRecordatorioEditado}
                disabled={guardando}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {guardando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Actualizando...</span>
                  </>
                ) : (
                  'Actualizar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Calendario;
