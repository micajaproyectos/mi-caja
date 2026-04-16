import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { obtenerFechaHoyChile } from '../lib/dateUtils.js';
import Footer from './Footer';

export default function GestionCocina() {
  const navigate = useNavigate();
  
  // Refs para debounce de alarma y recarga
  const ultimaVezSonidoRef = useRef(0);
  const recargarTimeoutRef = useRef(null);
  const sonidoPendienteRef = useRef(false);
  const channelRef = useRef(null);
  const reconectarTimeoutRef = useRef(null);

  // Estado de unlock de audio (autoplay policy)
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false);

  // Estados
  const [pedidosCocina, setPedidosCocina] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actualizandoPedido, setActualizandoPedido] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  
  // Estados para filtros
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(''); // '', 'pendiente', 'terminado', 'anulado'
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);

  // Función para cargar pedidos desde la base de datos
  const cargarPedidosCocina = async () => {
    try {
      setLoading(true);

      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('pedidos_cocina')
        .select('*') // Incluye todos los campos: id, usuario_id, cliente_id, fecha_cl, mesa, producto, unidad, cantidad, comentarios, estado, hora_inicio_pedido, hora_termino
        .eq('usuario_id', usuarioId)
        .order('hora_inicio_pedido', { ascending: false });

      if (error) {
        console.error('❌ Error al cargar pedidos:', error);
        return;
      }

      setPedidosCocina(data || []);
      console.log('✅ Pedidos de cocina cargados:', data?.length || 0);

    } catch (error) {
      console.error('❌ Error inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar estado de un pedido
  const cambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
    try {
      if (nuevoEstado === 'terminado') {
        // Usar función RPC que guarda hora de Santiago (igual que hora_inicio)
        const { error } = await supabase.rpc('marcar_pedido_terminado', {
          pedido_id: pedidoId
        });

        if (error) {
          console.error('❌ Error al marcar terminado:', error);
          throw new Error('Error al actualizar el estado del pedido');
        }
      } else {
        // Marcar como pendiente y limpiar hora_termino
        const { error } = await supabase
          .from('pedidos_cocina')
          .update({ 
            estado: 'pendiente',
            hora_termino: null 
          })
          .eq('id', pedidoId);

        if (error) {
          console.error('❌ Error al actualizar estado:', error);
          throw new Error('Error al actualizar el estado del pedido');
        }
      }

      console.log(`✅ Pedido ${pedidoId} marcado como ${nuevoEstado}`);

    } catch (error) {
      console.error('❌ Error inesperado:', error);
      throw error; // Re-lanzar error para que lo maneje cambiarEstadoMesa
    }
  };

  // Función para reproducir sonido de alarma cuando llega un nuevo pedido
  const playAlarmSound = useCallback(() => {
    try {
      // Verificar si los sonidos están habilitados
      const soundsPref = localStorage.getItem('soundsEnabled');
      if (soundsPref === 'false') return;

      // Verificar que la página esté visible
      if (document.visibilityState !== 'visible') return;

      // Debounce: evitar múltiples sonidos por el batch insert (N filas = N eventos)
      const ahora = Date.now();
      if (ahora - ultimaVezSonidoRef.current < 2000) return;
      ultimaVezSonidoRef.current = ahora;

      const audio = new Audio('/sounds/alarma-cocina.mp3');
      audio.volume = 0.7;

      audio.play().catch(error => {
        console.warn('No se pudo reproducir el sonido de alarma:', error);
        if (error.name === 'NotAllowedError') {
          console.info('Permisos de audio bloqueados. El usuario debe interactuar primero con la página.');
        } else if (error.name === 'NotSupportedError' || error.code === 4) {
          console.info('Archivo de sonido no encontrado. Por favor, agrega alarma-cocina.mp3 en public/sounds/');
        }
      });

    } catch (error) {
      console.warn('Error al reproducir sonido de alarma:', error);
    }
  }, []);

  // Cargar datos al montar y configurar suscripción en tiempo real
  useEffect(() => {
    cargarPedidosCocina();

    const suscribir = () => {
      // Limpiar canal anterior si existe
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel('pedidos_cocina_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pedidos_cocina'
          },
          (payload) => {
            console.log('🔄 Cambio detectado en pedidos_cocina:', payload);

            // Reproducir sonido solo cuando llega un nuevo pedido (INSERT)
            // playAlarmSound tiene debounce interno — ignora duplicados del batch
            if (payload.eventType === 'INSERT') {
              if (document.visibilityState !== 'visible') {
                sonidoPendienteRef.current = true;
              } else {
                playAlarmSound();
              }
            }

            // Debounce de recarga: colapsa N eventos del batch en una sola llamada
            if (recargarTimeoutRef.current) clearTimeout(recargarTimeoutRef.current);
            recargarTimeoutRef.current = setTimeout(() => {
              cargarPedidosCocina();
            }, 500);
          }
        )
        .subscribe((status) => {
          // Reconectar si el canal se desconecta (OS suspende WebSocket por batería)
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Canal Realtime desconectado, reconectando en 5s...');
            if (reconectarTimeoutRef.current) clearTimeout(reconectarTimeoutRef.current);
            reconectarTimeoutRef.current = setTimeout(() => suscribir(), 5000);
          }
        });

      channelRef.current = channel;
    };

    suscribir();

    // Reconectar también al volver la pantalla visible (por si el WS fue suspendido)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reintento de sonido pendiente
        if (sonidoPendienteRef.current) {
          sonidoPendienteRef.current = false;
          playAlarmSound();
        }
        // Verificar estado del canal y reconectar si es necesario
        const estado = channelRef.current?.state;
        if (estado === 'closed' || estado === 'errored' || !channelRef.current) {
          console.warn('⚠️ Canal inactivo al volver visible, reconectando...');
          suscribir();
          cargarPedidosCocina();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (recargarTimeoutRef.current) clearTimeout(recargarTimeoutRef.current);
      if (reconectarTimeoutRef.current) clearTimeout(reconectarTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Función para filtrar pedidos
  const filtrarPedidos = useCallback(() => {
    let pedidosFiltrados = [...pedidosCocina];
    const fechaActual = obtenerFechaHoyChile();

    // Si no hay filtros activos, mostrar solo pedidos del día actual
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroEstado) {
      pedidosFiltrados = pedidosFiltrados.filter(pedido => {
        return pedido.fecha_cl === fechaActual;
      });
    } else {
      // Filtrar por día específico
      if (filtroDia) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          return pedido.fecha_cl === filtroDia;
        });
      }

      // Filtrar por mes
      if (filtroMes && !filtroDia) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          const [, month] = pedido.fecha_cl.split('-');
          return parseInt(month) === parseInt(filtroMes);
        });
      }

      // Filtrar por año
      if (filtroAnio && !filtroDia) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          const [year] = pedido.fecha_cl.split('-');
          return parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Mes y año juntos
      if (filtroMes && filtroAnio && !filtroDia) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          const [year, month] = pedido.fecha_cl.split('-');
          return parseInt(month) === parseInt(filtroMes) && parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Filtrar por estado
      if (filtroEstado) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          return pedido.estado === filtroEstado;
        });
      }
    }

    setPedidosFiltrados(pedidosFiltrados);
  }, [pedidosCocina, filtroDia, filtroMes, filtroAnio, filtroEstado]);

  // Aplicar filtros cuando cambien los datos o filtros
  useEffect(() => {
    filtrarPedidos();
  }, [filtrarPedidos]);

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroDia('');
    setFiltroMes('');
    setFiltroAnio('');
    setFiltroEstado('');
  };

  // Función para obtener años únicos de los pedidos
  const obtenerAniosUnicos = () => {
    const anios = new Set();
    anios.add(2025); // Año por defecto
    
    pedidosCocina.forEach(pedido => {
      if (pedido.fecha_cl) {
        const anio = parseInt(pedido.fecha_cl.split('-')[0]);
        if (!isNaN(anio) && anio > 2025) {
          anios.add(anio);
        }
      }
    });
    
    return Array.from(anios).sort((a, b) => b - a);
  };

  // Nombres de meses
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Separar pedidos filtrados por estado (solo los que tienen estado definido)
  const pedidosPendientes = pedidosFiltrados.filter(p => p.estado === 'pendiente');
  const pedidosTerminados = pedidosFiltrados.filter(p => p.estado === 'terminado');
  const pedidosAnulados = pedidosFiltrados.filter(p => p.estado === 'anulado');
  
  // Obtener TODOS los productos de un pedido (incluyendo filas sin estado)
  const obtenerProductosCompletosDelPedido = (pedidoPrincipal) => {
    return pedidosCocina.filter(p => 
      p.mesa === pedidoPrincipal.mesa && 
      p.fecha_cl === pedidoPrincipal.fecha_cl &&
      Math.abs(new Date(p.hora_inicio_pedido) - new Date(pedidoPrincipal.hora_inicio_pedido)) < 5000 // Mismo grupo (dentro de 5 segundos)
    );
  };

  // Agrupar pedidos por mesa (solo para tarjetas - PENDIENTES)
  const agruparPorMesa = (pedidos) => {
    const grupos = {};
    const idsYaProcesados = new Set();
    pedidos.forEach(pedidoPrincipal => {
      if (idsYaProcesados.has(pedidoPrincipal.id)) return;
      const mesaKey = `${pedidoPrincipal.mesa}_${pedidoPrincipal.hora_inicio_pedido}`;
      if (!grupos[mesaKey]) {
        const todosLosProductos = obtenerProductosCompletosDelPedido(pedidoPrincipal);
        todosLosProductos.forEach(p => idsYaProcesados.add(p.id));
        grupos[mesaKey] = {
          mesa: pedidoPrincipal.mesa,
          pedidos: todosLosProductos,
          hora_inicio: pedidoPrincipal.hora_inicio_pedido,
          estado: pedidoPrincipal.estado,
          id_principal: pedidoPrincipal.id
        };
      }
    });
    return Object.values(grupos);
  };

  // Agrupar solo PENDIENTES para las tarjetas
  const mesasAgrupadasPendientes = agruparPorMesa(pedidosPendientes);

  // Contar totales (en grupos, no en filas individuales)
  const totalPendientes = mesasAgrupadasPendientes.length;
  const totalTerminados = pedidosTerminados.length;
  const totalAnulados = pedidosAnulados.length;

  // Función para calcular tiempo transcurrido
  const calcularTiempoTranscurrido = (horaInicio) => {
    if (!horaInicio) return '0s';
    
    // La hora guardada es Santiago marcada como UTC
    // Obtenemos hora actual de Santiago
    const ahora = new Date();
    const ahoraEnSantiago = new Date(ahora.toLocaleString("en-US", {timeZone: "America/Santiago"}));
    
    // El timestamp guardado tiene hora de Santiago pero está marcado como UTC
    // Lo parseamos directamente como está
    const inicio = new Date(horaInicio);
    
    // Ajustamos sumando 3 horas al inicio para compensar el offset
    const inicioAjustado = new Date(inicio.getTime() + (3 * 60 * 60 * 1000));
    
    // Ahora calculamos la diferencia
    const diff = Math.floor((ahoraEnSantiago - inicioAjustado) / 1000);
    
    if (diff < 0) return '0s'; // Por si acaso
    
    const horas = Math.floor(diff / 3600);
    const minutos = Math.floor((diff % 3600) / 60);
    const segundos = diff % 60;
    
    if (horas > 0) {
      return `${horas}h ${minutos}m ${segundos}s`;
    } else if (minutos > 0) {
      return `${minutos}m ${segundos}s`;
    }
    return `${segundos}s`;
  };

  // Actualizar temporizadores cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      // Forzar re-render para actualizar los temporizadores
      setPedidosCocina(prev => [...prev]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Función para cambiar estado de un grupo específico de pedidos (enviados juntos)
  const cambiarEstadoMesa = async (mesa, nuevoEstado) => {
    try {
      setActualizandoPedido(mesa.id_principal); // Bloquear botón mientras procesa
      
      // Obtener solo los productos de ESTE envío específico (mismo grupo)
      // Usa la misma lógica que obtenerProductosCompletosDelPedido
      const pedidosDelGrupo = pedidosCocina.filter(p => 
        p.mesa === mesa.mesa && 
        p.fecha_cl === mesa.pedidos[0].fecha_cl &&
        Math.abs(new Date(p.hora_inicio_pedido) - new Date(mesa.hora_inicio)) < 5000 // Mismo grupo (dentro de 5 segundos)
      );
      
      console.log(`🔄 Cambiando estado de ${pedidosDelGrupo.length} productos a ${nuevoEstado}...`);
      
      // Cambiar estado solo de los pedidos de este grupo específico
      // IMPORTANTE: Usar await para esperar cada actualización
      for (const pedido of pedidosDelGrupo) {
        await cambiarEstadoPedido(pedido.id, nuevoEstado);
      }
      
      console.log(`✅ Todos los productos actualizados a ${nuevoEstado}`);

      // Si se marcó como terminado, crear notificación en Supabase
      if (nuevoEstado === 'terminado') {
        try {
          // Obtener usuario_id
          const usuarioId = await authService.getCurrentUserId();
          if (!usuarioId) {
            console.error('❌ No hay usuario autenticado para crear notificación');
            return;
          }

          // Obtener cliente_id para el INSERT (requerido por RLS)
          const { data: usuarioData, error: usuarioError } = await supabase
            .from('usuarios')
            .select('cliente_id')
            .eq('usuario_id', usuarioId)
            .single();

          if (usuarioError || !usuarioData) {
            console.error('❌ Error al obtener cliente_id:', usuarioError);
            return;
          }

          const cliente_id = usuarioData.cliente_id;

          // Extraer información de productos para la notificación
          const productos = mesa.pedidos.map(pedido => ({
            producto: pedido.producto,
            cantidad: pedido.cantidad,
            unidad: pedido.unidad || ''
          }));
          
          // Insertar notificación en Supabase
          const { error: notificacionError } = await supabase
            .from('notificaciones_pedidos_terminados')
            .insert([{
              usuario_id: usuarioId,
              cliente_id: cliente_id,
              mesa: mesa.mesa,
              productos: productos
            }]);

          if (notificacionError) {
            console.error('❌ Error al crear notificación:', notificacionError);
          } else {
            console.log('✅ Notificación creada exitosamente');
          }
        } catch (error) {
          console.error('❌ Error inesperado al crear notificación:', error);
        }
      }

      // Recargar pedidos manualmente para asegurar actualización inmediata
      await cargarPedidosCocina();

    } catch (error) {
      console.error('❌ Error al cambiar estado de la mesa:', error);
      alert('❌ Error al actualizar el estado del pedido');
    } finally {
      setActualizandoPedido(null); // Desbloquear botón
    }
  };

  // Función para anular un pedido (cambiar estado de terminado a anulado)
  const anularPedido = async (pedidoId) => {
    try {
      setActualizandoPedido(pedidoId);

      const { error } = await supabase
        .from('pedidos_cocina')
        .update({ estado: 'anulado' })
        .eq('id', pedidoId);

      if (error) {
        console.error('❌ Error al anular pedido:', error);
        alert('❌ Error al anular el pedido');
        return;
      }

      console.log(`✅ Pedido ${pedidoId} anulado`);
      setEditandoId(null);

    } catch (error) {
      console.error('❌ Error inesperado:', error);
      alert('❌ Error al anular el pedido');
    } finally {
      setActualizandoPedido(null);
    }
  };

  // Función para eliminar un pedido (solo del usuario actual)
  const eliminarPedido = async (pedidoId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setActualizandoPedido(pedidoId);

      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      // Obtener el cliente_id del usuario autenticado para satisfacer la política RLS
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('Error al obtener cliente_id del usuario:', usuarioError);
        alert('❌ Error: No se pudo obtener la información del usuario.');
        return;
      }

      const cliente_id = usuarioData.cliente_id;

      const { error } = await supabase
        .from('pedidos_cocina')
        .delete()
        .eq('id', pedidoId)
        .eq('usuario_id', usuarioId) // 🔒 SEGURIDAD: Solo eliminar pedidos del usuario actual
        .eq('cliente_id', cliente_id); // 🔒 SEGURIDAD: Solo eliminar pedidos del cliente actual

      if (error) {
        console.error('❌ Error al eliminar pedido:', error);
        alert('❌ Error al eliminar el pedido: ' + error.message);
        return;
      }

      alert('✅ Pedido eliminado exitosamente');
      
      // Recargar la lista de pedidos
      await cargarPedidosCocina();
      
    } catch (error) {
      console.error('❌ Error general al eliminar pedido:', error);
      alert('❌ Error al eliminar pedido: ' + error.message);
    } finally {
      setActualizandoPedido(null);
      setEditandoId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1a3d1a' }}>
      {/* Header con navegación */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white/10"
          >
            <svg 
              className="w-6 h-6 text-white transition-transform group-hover:-translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-white font-medium">Volver al Inicio</span>
          </button>
        </div>
      </div>

      {/* Título principal */}
      <div className="relative z-10 text-center py-6 md:py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">
          Gestión de Cocina
        </h1>
        <p className="text-gray-300 text-lg md:text-xl px-4">
          Pedidos en tiempo real
        </p>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex-1 py-4 px-4 md:px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          
          {/* Estadísticas y botón recargar */}
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Contadores (reflejan filtros activos) */}
            <div className="flex gap-4 flex-wrap justify-center">
              <div className="px-6 py-3 rounded-lg bg-orange-600 shadow-lg">
                <span className="text-white font-bold text-lg">⏳ Pendientes: {totalPendientes}</span>
              </div>
              <div className="px-6 py-3 rounded-lg bg-green-600 shadow-lg">
                <span className="text-white font-bold text-lg">✅ Terminados: {totalTerminados}</span>
              </div>
              <div className="px-6 py-3 rounded-lg bg-red-600 shadow-lg">
                <span className="text-white font-bold text-lg">❌ Anulados: {totalAnulados}</span>
              </div>
            </div>

            {/* Botones derecha */}
            <div className="flex gap-2 items-center">
              {/* Unlock de audio — requerido por autoplay policy del browser */}
              <button
                onClick={() => {
                  const audio = new Audio('/sounds/alarma-cocina.mp3');
                  audio.volume = 0.01;
                  audio.play()
                    .then(() => { audio.pause(); setAudioDesbloqueado(true); })
                    .catch(() => setAudioDesbloqueado(false));
                }}
                title="Activar alertas de sonido"
                className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  audioDesbloqueado
                    ? 'bg-green-700/50 text-green-300 cursor-default'
                    : 'bg-yellow-600/80 hover:bg-yellow-500 text-white animate-pulse'
                }`}
              >
                {audioDesbloqueado ? '🔔' : '🔕'}
              </button>

              {/* Botón recargar */}
              <button
                onClick={cargarPedidosCocina}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:scale-100"
              >
                {loading ? '⏳ Cargando...' : '🔄 Recargar'}
              </button>
            </div>
          </div>

          {/* Título sección de tarjetas */}
          <h2 className="text-2xl md:text-3xl font-bold text-orange-400 mb-4 text-center">
            ⏳ Pedidos Pendientes
          </h2>

          {/* Grid de pedidos PENDIENTES (agrupados por mesa) */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p className="text-white text-xl">Cargando pedidos...</p>
            </div>
          ) : mesasAgrupadasPendientes.length === 0 ? (
            <div className="text-center py-12 mb-8">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-gray-300 text-2xl font-bold mb-2">
                No hay pedidos pendientes
              </p>
              <p className="text-gray-400 text-lg">
                Los pedidos nuevos aparecerán aquí en tiempo real
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {mesasAgrupadasPendientes.map((mesa) => (
                <div 
                  key={mesa.id_principal}
                  className={`rounded-2xl p-6 border-4 shadow-2xl transition-all duration-300 hover:scale-105 ${
                    mesa.estado === 'pendiente' 
                      ? 'bg-orange-500/20 border-orange-500' 
                      : 'bg-green-500/20 border-green-500'
                  }`}
                >
                  {/* Header de la mesa */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-3xl font-bold text-white">
                      {mesa.mesa}
                    </h3>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                      mesa.estado === 'pendiente'
                        ? 'bg-orange-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}>
                      {mesa.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Terminado'}
                    </span>
                  </div>

                  {/* Temporizador */}
                  <div className="mb-4 text-center">
                    <div className={`text-4xl font-bold ${
                      mesa.estado === 'pendiente' ? 'text-orange-300' : 'text-green-300'
                    }`}>
                      ⏱️ {calcularTiempoTranscurrido(mesa.hora_inicio)}
                    </div>
                    <p className="text-gray-300 text-sm mt-1">
                      Inicio: {(() => {
                        // Mostrar hora UTC tal como está en Supabase (sin conversión)
                        const timestamp = new Date(mesa.hora_inicio).toISOString();
                        // Extraer solo HH:mm:ss del formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
                        return timestamp.split('T')[1].split('.')[0];
                      })()}
                    </p>
                  </div>

                  {/* Lista de productos */}
                  <div className="mb-4 bg-black/30 rounded-xl p-4 max-h-64 overflow-y-auto">
                    <h4 className="text-white font-bold text-lg mb-3 sticky top-0 bg-black/50 py-2 rounded">
                      Productos ({mesa.pedidos.length}):
                    </h4>
                    {mesa.pedidos.map((pedido) => (
                      <div 
                        key={pedido.id} 
                        className="text-gray-200 py-2 px-3 mb-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-lg">{pedido.producto}</span>
                          <span className="text-2xl font-bold text-yellow-300">x{pedido.cantidad}</span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          Unidad: {pedido.unidad}
                        </div>
                        {pedido.comentarios && (
                          <div className="text-sm text-blue-300 mt-2 font-medium">
                            💬 {pedido.comentarios}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => cambiarEstadoMesa(mesa, 'pendiente')}
                      disabled={mesa.estado === 'pendiente' || actualizandoPedido === mesa.id_principal}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 disabled:scale-100"
                    >
                      {actualizandoPedido === mesa.id_principal ? '⏳ Procesando...' : '⏳ Pendiente'}
                    </button>
                    <button
                      onClick={() => cambiarEstadoMesa(mesa, 'terminado')}
                      disabled={mesa.estado === 'terminado' || actualizandoPedido === mesa.id_principal}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 disabled:scale-100"
                    >
                      {actualizandoPedido === mesa.id_principal ? '⏳ Procesando...' : '✅ Terminado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabla de Historial (Terminados y Anulados) */}
          <div className="mt-12">
            <h2 className="text-2xl md:text-3xl font-bold text-green-400 mb-4 text-center">
              Historial de Pedidos
            </h2>
            
            {/* Filtros integrados a la tabla */}
            <div className="mb-6 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
              <h3 className="text-lg md:text-xl font-semibold text-green-400 mb-4 text-center">
                Filtros de Búsqueda
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Filtro por día específico */}
                <div>
                  <label className="block text-gray-200 font-medium mb-2 text-xs md:text-sm">
                    Día específico:
                  </label>
                  <input
                    type="date"
                    value={filtroDia}
                    onChange={(e) => setFiltroDia(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                  />
                </div>

                {/* Filtro por mes */}
                <div>
                  <label className="block text-gray-200 font-medium mb-2 text-xs md:text-sm">
                    Mes:
                  </label>
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los meses</option>
                    {nombresMeses.map((mes, index) => (
                      <option key={index + 1} value={index + 1} className="bg-gray-800 text-white">
                        {mes}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por año */}
                <div>
                  <label className="block text-gray-200 font-medium mb-2 text-xs md:text-sm">
                    Año:
                  </label>
                  <select
                    value={filtroAnio}
                    onChange={(e) => setFiltroAnio(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
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

                {/* Filtro por estado */}
                <div>
                  <label className="block text-gray-200 font-medium mb-2 text-xs md:text-sm">
                    Estado:
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los estados</option>
                    <option value="terminado" className="bg-gray-800 text-white">✅ Terminado</option>
                    <option value="anulado" className="bg-gray-800 text-white">❌ Anulado</option>
                  </select>
                </div>
              </div>

              {/* Botón limpiar filtros */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={limpiarFiltros}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🧹 Limpiar Filtros
                </button>
              </div>

              {/* Información de filtros activos */}
              <div className="mt-4 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                <p className="text-blue-200 text-xs md:text-sm text-center">
                  {!filtroDia && !filtroMes && !filtroAnio && !filtroEstado ? (
                    <strong>Mostrando pedidos del día actual</strong>
                  ) : (
                    <>
                      <strong>Filtros activos:</strong>
                      {filtroDia && ` Día: ${(() => {
                        const [year, month, day] = filtroDia.split('-');
                        return `${day}/${month}/${year}`;
                      })()}`}
                      {filtroMes && ` Mes: ${nombresMeses[parseInt(filtroMes) - 1]}`}
                      {filtroAnio && ` Año: ${filtroAnio}`}
                      {filtroEstado && ` Estado: ${filtroEstado === 'terminado' ? '✅ Terminado' : '❌ Anulado'}`}
                    </>
                  )}
                  {` | Mostrando ${pedidosFiltrados.length} de ${pedidosCocina.length} registros totales`}
                </p>
              </div>
            </div>
            
            {pedidosTerminados.length === 0 && pedidosAnulados.length === 0 ? (
              <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                <p className="text-gray-400 text-lg">
                  No hay pedidos en el historial aún
                </p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-900/95 backdrop-blur-sm">
                      <tr className="border-b border-white/20">
                        <th className="text-gray-200 font-semibold p-3 text-sm">Fecha</th>
                        <th className="text-gray-200 font-semibold p-3 text-sm">Mesa</th>
                        <th className="text-gray-200 font-semibold p-3 text-sm">Producto</th>
                        <th className="text-gray-200 font-semibold p-3 text-sm">Cantidad</th>
                        <th className="text-gray-200 font-semibold p-3 text-sm">Hora Inicio</th>
                        <th className="text-gray-200 font-semibold p-3 text-sm">Hora Término</th>
                        <th className="text-gray-200 font-semibold p-3 text-sm">Estado</th>
                        <th className="text-gray-200 font-semibold p-3 text-sm">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Agrupar pedidos terminados Y anulados por pedido completo
                        const gruposHistorial = [];
                        const idsYaProcesados = new Set();

                        // Agregar terminados
                        pedidosTerminados.forEach(pedidoPrincipal => {
                          if (idsYaProcesados.has(pedidoPrincipal.id)) return;
                          const productosDelPedido = obtenerProductosCompletosDelPedido(pedidoPrincipal);
                          productosDelPedido.forEach(p => idsYaProcesados.add(p.id));
                          gruposHistorial.push({
                            pedidoPrincipal: pedidoPrincipal,
                            productos: productosDelPedido,
                            hora_termino: pedidoPrincipal.hora_termino
                          });
                        });

                        // Agregar anulados
                        pedidosAnulados.forEach(pedidoPrincipal => {
                          if (idsYaProcesados.has(pedidoPrincipal.id)) return;
                          const productosDelPedido = obtenerProductosCompletosDelPedido(pedidoPrincipal);
                          productosDelPedido.forEach(p => idsYaProcesados.add(p.id));
                          gruposHistorial.push({
                            pedidoPrincipal: pedidoPrincipal,
                            productos: productosDelPedido,
                            hora_termino: pedidoPrincipal.hora_termino
                          });
                        });
                        
                        // Ordenar GRUPOS por hora_termino descendente (más recientes primero)
                        gruposHistorial.sort((a, b) => {
                          return new Date(b.hora_termino) - new Date(a.hora_termino);
                        });

                        // Renderizar cada grupo completo
                        const filas = [];
                        gruposHistorial.forEach((grupo) => {
                          grupo.productos.forEach((pedido, indexEnGrupo) => {
                            const esUltimoDelGrupo = indexEnGrupo === grupo.productos.length - 1;

                            filas.push(
                              <tr 
                                key={pedido.id} 
                                className={`hover:bg-white/5 transition-colors ${
                                  esUltimoDelGrupo ? 'border-b-2 border-white/20' : 'border-b border-white/10'
                                }`}
                              >
                          <td className="text-gray-200 p-3 text-sm">
                            {(() => {
                              const [year, month, day] = pedido.fecha_cl.split('-');
                              return `${day}/${month}/${year}`;
                            })()}
                          </td>
                          <td className="text-gray-200 p-3 text-sm font-bold">
                            {pedido.estado ? pedido.mesa : ''}
                          </td>
                          <td className="text-white p-3 text-sm font-medium">
                            <div>{pedido.producto}</div>
                            {pedido.comentarios && (
                              <div className="text-blue-300 text-xs mt-1 font-medium">
                                💬 {pedido.comentarios}
                              </div>
                            )}
                          </td>
                          <td className="text-gray-200 p-3 text-sm">
                            {pedido.cantidad} {pedido.unidad}
                          </td>
                          <td className="text-gray-300 p-3 text-sm">
                            {pedido.estado && pedido.hora_inicio_pedido ? (() => {
                              const timestamp = new Date(pedido.hora_inicio_pedido).toISOString();
                              return timestamp.split('T')[1].split('.')[0];
                            })() : ''}
                          </td>
                          <td className="text-green-300 p-3 text-sm font-medium">
                            {pedido.estado && pedido.hora_termino ? (() => {
                              const timestamp = new Date(pedido.hora_termino).toISOString();
                              return timestamp.split('T')[1].split('.')[0];
                            })() : ''}
                          </td>
                          <td className="p-3">
                            {pedido.estado && (
                              editandoId === pedido.id ? (
                                <select
                                  value={pedido.estado}
                                  onChange={(e) => {
                                    if (e.target.value === 'anulado' && pedido.estado === 'terminado') {
                                      if (confirm('¿Estás seguro de anular este pedido?')) {
                                        anularPedido(pedido.id);
                                      }
                                    }
                                  }}
                                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                                >
                                  <option value="terminado">✅ Terminado</option>
                                  <option value="anulado">❌ Anulado</option>
                                </select>
                              ) : (
                                <span className={`text-xs font-bold ${
                                  pedido.estado === 'terminado' ? 'text-green-300' : 'text-red-300'
                                }`}>
                                  {pedido.estado === 'terminado' ? '✅ Terminado' : '❌ Anulado'}
                                </span>
                              )
                            )}
                          </td>
                          <td className="p-3">
                            {pedido.estado && (
                              <div className="flex items-center gap-2">
                                {editandoId === pedido.id ? (
                                  <button
                                    onClick={() => setEditandoId(null)}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs transition-all"
                                    title="Cancelar edición"
                                  >
                                    ❌
                                  </button>
                                ) : pedido.estado === 'terminado' ? (
                                  <button
                                    onClick={() => setEditandoId(pedido.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-all"
                                    title="Editar estado"
                                  >
                                    ✏️ Editar
                                  </button>
                                ) : null}
                                <button
                                  onClick={() => eliminarPedido(pedido.id)}
                                  disabled={actualizandoPedido === pedido.id}
                                  className="text-red-400 hover:text-red-300 text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                                  title="Eliminar pedido"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                            );
                          });
                        });
                        
                        return filas;
                      })()}
                    </tbody>
                  </table>
                </div>
                
                {/* Contador de historial */}
                <div className="mt-4 text-center flex gap-6 justify-center">
                  <p className="text-gray-300 text-sm">
                    Terminados: <span className="font-bold text-green-400">{pedidosTerminados.length}</span>
                  </p>
                  <p className="text-gray-300 text-sm">
                    Anulados: <span className="font-bold text-red-400">{pedidosAnulados.length}</span>
                  </p>
                  <p className="text-gray-300 text-sm">
                    Total: <span className="font-bold text-blue-400">{pedidosTerminados.length + pedidosAnulados.length}</span>
                  </p>
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
