import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { 
  obtenerFechaHoyChile, 
  formatearFechaCortaChile
} from '../lib/dateUtils.js';
import Footer from './Footer';
import BarcodeScanner from './BarcodeScanner';

// Modo DEBUG: Solo activo en desarrollo (detecta si es localhost)
const IS_DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Función de log condicional para debugging
const debugLog = (...args) => {
  if (IS_DEBUG) {
    console.log(...args);
  }
};

export default function Pedidos() {
  const navigate = useNavigate();
  
  // Estados principales
  const [pedido, setPedido] = useState({
    fecha: obtenerFechaHoyChile(),
    tipo_pago: '',
    total_pedido: 0,
  });
  
  // Estado para el producto actual que se está agregando
  const [productoActual, setProductoActual] = useState({
    producto: '',
    cantidad: '',
    unidad: '',
    precio_unitario: '',
    subtotal: 0,
    comentarios: '',
  });
  
  // Estados para búsqueda de productos del inventario
  const [productosInventario, setProductosInventario] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  
  // Ref para el input de búsqueda
  const searchInputRef = useRef(null);
  // Ref para guardar la última búsqueda y re-filtrar cuando se carguen los productos
  const ultimaBusquedaRef = useRef('');
  // Ref para debounce de búsqueda (optimización de rendimiento)
  const busquedaTimeoutRef = useRef(null);
  // Ref para rastrear productos en proceso de guardado (protección contra Realtime)
  const productosGuardandoRef = useRef(new Set());
  // Ref para rastrear cambios recientes en mesas (protección contra Realtime)
  const ultimoCambioMesasRef = useRef(null);
  // Ref para timeout de Realtime de mesas
  const realtimeMesasTimeoutRef = useRef(null);
  // Ref para siempre tener la versión actual de cargarMesasDesdeSupabase (evita stale closure)
  const cargarMesasRef = useRef(null);
  // Ref para rastrear comentarios que están siendo editados (protección contra Realtime)
  const comentariosEnEdicionRef = useRef({});
  
  // Estados para código de barras
  const [mostrarScannerPedidos, setMostrarScannerPedidos] = useState(false);
  
  // Estados para gestión de mesas
  // Inicializar con cache de localStorage para carga instantánea
  const [mesas, setMesas] = useState(() => {
    try {
      const cached = localStorage.getItem('mesasPedidos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error al cargar mesas del cache:', error);
    }
    return ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4']; // Fallback solo para primera vez
  });
  const [mesaSeleccionada, setMesaSeleccionada] = useState(() => {
    try {
      const cached = localStorage.getItem('mesasPedidos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0];
        }
      }
    } catch (error) {
      console.error('Error al cargar mesa seleccionada del cache:', error);
    }
    return 'Mesa 1';
  });
  const [cantidadMesas, setCantidadMesas] = useState(4);
  // Inicializar productos desde cache para carga instantánea
  const [productosPorMesa, setProductosPorMesa] = useState(() => {
    try {
      const cached = localStorage.getItem('productosPorMesa');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error al cargar productos del cache:', error);
    }
    return {};
  });
  const [datosInicialCargados, setDatosInicialCargados] = useState(false);
  const [mesasInicialCargadas, setMesasInicialCargadas] = useState(false);
  const [loadingMesas, setLoadingMesas] = useState(false); // NO mostrar spinner inicial, cargar en background
  
  // Estados para edición de nombres de mesas
  const [mesaEditando, setMesaEditando] = useState(null);
  const [nombreMesaTemporal, setNombreMesaTemporal] = useState('');
  
  // Estados para drag and drop de mesas
  const [mesaArrastrando, setMesaArrastrando] = useState(null);
  const [posicionActual, setPosicionActual] = useState({ x: 0, y: 0 });
  const [indiceArrastrando, setIndiceArrastrando] = useState(null);
  const [esArrastrando, setEsArrastrando] = useState(false);
  const posicionInicialRef = useRef({ x: 0, y: 0 });
  
  // Estado para bloquear/desbloquear el movimiento de pestañas
  const [mesasBloqueadas, setMesasBloqueadas] = useState(() => {
    try {
      const cached = localStorage.getItem('mesasBloqueadas');
      return cached === 'true';
    } catch (error) {
      return false;
    }
  });
  
  // Estados para selección de productos para enviar a cocina
  // Inicializar desde cache para carga instantánea
  const [productosSeleccionadosParaCocina, setProductosSeleccionadosParaCocina] = useState(() => {
    try {
      const cached = localStorage.getItem('productosSeleccionadosParaCocina');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error al cargar selectores de cocina del cache:', error);
    }
    return {};
  });
  
  // Estados para selección de productos para pago
  const [productosSeleccionadosParaPago, setProductosSeleccionadosParaPago] = useState({});
  
  // Estado para productos enviados a cocina (información para mostrar)
  const [productosEnviadosACocina, setProductosEnviadosACocina] = useState({});
  
  // Estado para notificación toast (cierre automático)
  const [notificacionToast, setNotificacionToast] = useState({ visible: false, mensaje: '', tipo: 'success' });
  
  // Función helper para mostrar notificaciones toast
  const mostrarToast = (mensaje, tipo = 'success', duracion = 3000) => {
    setNotificacionToast({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacionToast(prev => ({ ...prev, visible: false }));
    }, duracion);
  };
  
  // Estados para propina
  const [propinaActiva, setPropinaActiva] = useState(false);
  const [porcentajePropina, setPorcentajePropina] = useState(10);
  const [propinaManual, setPropinaManual] = useState(null); // null = usar %, número = monto fijo
  
  // Estados para el cálculo de vuelto (solo frontend)
  const [montoPagado, setMontoPagado] = useState('');
  const [mostrarVuelto, setMostrarVuelto] = useState(false);
  const [calculadoraColapsada, setCalculadoraColapsada] = useState(false);
  
  // Estados para cuadrar caja (solo frontend)
  const [cajaInicial, setCajaInicial] = useState(() => {
    // Cargar caja inicial desde localStorage al inicializar
    const fechaActual = obtenerFechaHoyChile();
    const cajaGuardada = localStorage.getItem('cajaInicial');
    const fechaGuardada = localStorage.getItem('cajaInicialFecha');
    
    // Si hay caja guardada y es del mismo día, usarla
    if (cajaGuardada && fechaGuardada === fechaActual) {
      return cajaGuardada;
    }
    
    // Si es un día diferente o no hay datos, limpiar
    localStorage.removeItem('cajaInicial');
    localStorage.removeItem('cajaInicialFecha');
    return '';
  });
  
  // Estados para filtros
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroTipoPago, setFiltroTipoPago] = useState('');
  const [filtroPersonalizadoInicio, setFiltroPersonalizadoInicio] = useState('');
  const [filtroPersonalizadoFin, setFiltroPersonalizadoFin] = useState('');
  
  // Estado para años disponibles (se calcula automáticamente)
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  
  // Estado para pedidos filtrados
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  
  // Estados para la tabla de pedidos registrados
  const [pedidosRegistrados, setPedidosRegistrados] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  
  // Estado para control de envío a cocina
  const [enviandoACocina, setEnviandoACocina] = useState(false);
  
  // Estado para prevenir doble clic en registro de pedido
  const [registrandoPedido, setRegistrandoPedido] = useState(false);
  
  // Ref para verificación síncrona inmediata (previene doble ejecución)
  const registrandoPedidoRef = useRef(false);

  // Estados para edición inline
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEdicion, setValoresEdicion] = useState({
    fecha_cl: '',
    mesa: '',
    producto: '',
    unidad: '',
    cantidad: '',
    precio: '',
    total: '',
    total_final: '',
    propina: '',
    tipo_pago: '',
    estado: '',
    comentarios: ''
  });

  // Estado para pantalla completa
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  
  // Estado para notificación de dispositivos táctiles
  const [notificacionTactil, setNotificacionTactil] = useState(false);
  
  // Estado para notificaciones de pedidos terminados desde cocina
  const [notificacionesPedidosTerminados, setNotificacionesPedidosTerminados] = useState([]);
  
  // Ref para debounce de Realtime (evita flash visual)
  const realtimeTimeoutRef = useRef(null);
  
  // Ref para controlar el debounce del sonido (evita múltiples sonidos simultáneos)
  const ultimaVezSonidoRef = useRef(0);

  // Función para detectar dispositivos táctiles (tablets/móviles) y navegadores específicos
  const esDispositivoTactil = () => {
    // Detectar iOS/iPadOS
    const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Detectar Android tablets
    const esAndroidTablet = /Android/.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent);
    
    // Detectar Chrome en tablets/dispositivos táctiles
    const esChromeEnTablet = /Chrome/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
    
    // Detectar cualquier dispositivo táctil
    const esDeviceTactil = navigator.maxTouchPoints > 1 || 'ontouchstart' in window;
    
    return esIOS || esAndroidTablet || esChromeEnTablet || esDeviceTactil;
  };
  
  // Función para obtener información específica del navegador/dispositivo  
  const obtenerInfoDispositivo = () => {
    const userAgent = navigator.userAgent;
    
    if (/Chrome/.test(userAgent) && navigator.maxTouchPoints > 1) {
      return { navegador: 'Chrome', tipo: 'tablet' };
    }
    if (/Safari/.test(userAgent) && /iPhone|iPad|iPod/.test(userAgent)) {
      return { navegador: 'Safari', tipo: 'iOS' };
    }
    if (/Android/.test(userAgent)) {
      return { navegador: 'Android', tipo: 'tablet' };
    }
    
    return { navegador: 'Navegador', tipo: 'dispositivo táctil' };
  };
  

  // Estados para estadísticas de pedidos
  const [estadisticasPedidos, setEstadisticasPedidos] = useState({
    total: { cantidad: 0, monto: 0 },
    efectivo: { cantidad: 0, monto: 0 },
    debito: { cantidad: 0, monto: 0 },
    transferencia: { cantidad: 0, monto: 0 },
    propinas: 0
  });
  
  // Función para cargar pedidos registrados desde Supabase
  const cargarPedidosRegistrados = async () => {
    try {
      setLoadingPedidos(true);
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setPedidosRegistrados([]);
        return;
      }

      // Reducir logs para mejor rendimiento
      if (IS_DEBUG) console.log('🔍 Cargando pedidos registrados');

      // Cargar TODOS los pedidos del usuario (sin filtro de fecha)
      // Intentar consulta con fecha_cl primero
      let { data, error } = await supabase
        .from('pedidos')
        .select('id, fecha, fecha_cl, mesa, producto, unidad, cantidad, precio, total, total_final, propina, estado, tipo_pago, comentarios, usuario_id, created_at')
        .eq('usuario_id', usuarioId) // 🔒 FILTRO CRÍTICO POR USUARIO
        .order('fecha_cl', { ascending: false })
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      // Si hay error con fecha_cl, usar consulta sin fecha_cl
      if (error && error.message?.includes('fecha_cl')) {
        console.warn('⚠️ Columna fecha_cl no existe en pedidos, usando fecha');
        
        const fallbackResult = await supabase
          .from('pedidos')
          .select('id, fecha, mesa, producto, unidad, cantidad, precio, total, total_final, propina, estado, tipo_pago, comentarios, usuario_id, created_at')
          .eq('usuario_id', usuarioId)
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false });
        
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('❌ Error al cargar pedidos registrados:', error);
        debugLog('🔍 Detalles del error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setPedidosRegistrados([]);
      } else {
        if (IS_DEBUG) console.log('✅ Pedidos:', data?.length || 0);
        setPedidosRegistrados(data || []);
        // No inicializar filtrados aquí, dejar que el efecto lo haga
      }
    } catch (error) {
      console.error('❌ Error general al cargar pedidos registrados:', error);
      setPedidosRegistrados([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Función para cargar productos del inventario filtrados por usuario
  const cargarProductosInventario = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setProductosInventario([]);
        return;
      }

      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('producto', { ascending: true });

      if (error) {
        console.error('Error al cargar productos del inventario:', error);
        setProductosInventario([]);
        return;
      }

      const productosCargados = data || [];
      setProductosInventario(productosCargados);
    } catch (error) {
      console.error('Error inesperado al cargar productos del inventario:', error);
      setProductosInventario([]);
    }
  };

  // ============================================================
  // FUNCIONES DE SINCRONIZACIÓN CON SUPABASE (PRODUCTOS TEMPORALES)
  // ============================================================

  // Función para cargar productos temporales desde Supabase
  const cargarProductosTemporales = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      
      if (!usuarioId) {
        setDatosInicialCargados(true);
        return;
      }

      const { data, error } = await supabase
        .from('productos_mesas_temp')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error al cargar productos temporales:', error);
        setDatosInicialCargados(true);
        return;
      }

      // PROTECCIÓN CRÍTICA: Validar integridad de datos antes de actualizar
      const productosLocalesCount = Object.values(productosPorMesa).reduce((sum, arr) => sum + arr.length, 0);
      const productosSupabaseCount = data?.length || 0;
      
      // Si no hay datos en Supabase
      if (!data || data.length === 0) {
        // Solo borrar productos si es la carga inicial
        if (!datosInicialCargados) {
          setProductosPorMesa({});
          debugLog('✅ Primera carga: No hay productos en Supabase');
        } else if (productosLocalesCount > 0) {
          // Si había productos locales y Supabase devuelve 0, NO sobrescribir
          debugLog(`🛡️ PROTECCIÓN: Bloqueando borrado. Local=${productosLocalesCount}, Supabase=${productosSupabaseCount}`);
          console.warn('⚠️ Supabase devolvió 0 productos pero hay productos locales. Manteniendo estado actual.');
        }
        setDatosInicialCargados(true);
        return;
      }
      
      // PROTECCIÓN: Si Supabase tiene menos del 50% de productos que el local, validar
      if (datosInicialCargados && productosLocalesCount > 5 && productosSupabaseCount < productosLocalesCount * 0.5) {
        console.warn(`⚠️ Discrepancia de datos detectada: Local=${productosLocalesCount}, Supabase=${productosSupabaseCount}`);
        debugLog('🛡️ Posible error de red o sincronización. Fusionando datos en lugar de sobrescribir.');
      }

      // Convertir datos usando reduce (más rápido que forEach)
      const productosPorMesaTemp = data.reduce((acc, item) => {
        if (!acc[item.mesa]) {
          acc[item.mesa] = [];
        }
        acc[item.mesa].push({
          id: item.producto_id,
          producto: item.producto,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
          comentarios: item.comentarios || ''
        });
        return acc;
      }, {});

      // PROTECCIÓN: Fusionar con productos que están siendo guardados
      // Para evitar que se pierdan productos recién agregados
      setProductosPorMesa(prev => {
        const merged = { ...productosPorMesaTemp };
        
        // Agregar productos locales que están en proceso de guardado
        Object.keys(prev).forEach(mesa => {
          const productosLocales = prev[mesa] || [];
          productosLocales.forEach(producto => {
            // Si el producto está siendo guardado y NO está en Supabase aún, mantenerlo
            if (productosGuardandoRef.current.has(producto.id)) {
              const yaExiste = merged[mesa]?.some(p => p.id === producto.id);
              if (!yaExiste) {
                if (!merged[mesa]) merged[mesa] = [];
                merged[mesa].push(producto);
                debugLog('🔒 Protegiendo producto en guardado:', producto.producto);
              }
            }
          });
        });
        
        // 🛡️ PROTECCIÓN: Preservar comentarios que están siendo editados
        Object.keys(merged).forEach(mesa => {
          if (merged[mesa]) {
            merged[mesa] = merged[mesa].map(producto => {
              // Si este producto tiene un comentario siendo editado, usar ese en lugar del de Supabase
              if (comentariosEnEdicionRef.current.hasOwnProperty(producto.id)) {
                debugLog('🔒 Protegiendo comentario en edición:', producto.producto);
                return {
                  ...producto,
                  comentarios: comentariosEnEdicionRef.current[producto.id]
                };
              }
              return producto;
            });
          }
        });
        
        return merged;
      });
      
      setDatosInicialCargados(true);
      
      // Limpiar selecciones de cocina que ya no existen (IDs inválidos)
      setProductosSeleccionadosParaCocina(prev => {
        const limpio = {};
        Object.keys(prev).forEach(mesa => {
          const productosMesa = productosPorMesaTemp[mesa] || [];
          const idsValidos = productosMesa.map(p => p.id);
          const seleccionadosMesa = prev[mesa] || [];
          // Filtrar solo los IDs que existen en los productos actuales
          const seleccionadosValidos = seleccionadosMesa.filter(id => idsValidos.includes(id));
          if (seleccionadosValidos.length > 0) {
            limpio[mesa] = seleccionadosValidos;
          }
        });
        return limpio;
      });
      
      if (IS_DEBUG) console.log('✅ Productos:', Object.keys(productosPorMesaTemp).length, 'mesas');

    } catch (error) {
      console.error('Error inesperado al cargar productos temporales:', error);
      setDatosInicialCargados(true);
    }
  };

  // Función para guardar un producto en Supabase
  const guardarProductoEnSupabase = async (mesa, producto) => {
    // Registrar que este producto está siendo guardado
    productosGuardandoRef.current.add(producto.id);
    
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        productosGuardandoRef.current.delete(producto.id);
        return;
      }

      // Obtener cliente_id para el INSERT (requerido por RLS)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      const { error } = await supabase
        .from('productos_mesas_temp')
        .insert([{
          usuario_id: usuarioId,
          cliente_id: usuarioData?.cliente_id || null,
          mesa: mesa,
          producto: producto.producto,
          cantidad: producto.cantidad,
          unidad: producto.unidad,
          precio_unitario: parseFloat(producto.precio_unitario),
          subtotal: parseFloat(producto.subtotal),
          comentarios: producto.comentarios || null,
          producto_id: producto.id
        }]);

      if (error) {
        console.error('Error al guardar producto en Supabase:', error);
        productosGuardandoRef.current.delete(producto.id);
        throw error; // Propagar error para manejo en agregarProductoAMesa
      }

      debugLog('✅ Producto guardado en Supabase:', producto.producto);
      
      // Marcar como completado después de 2 segundos (tiempo para que Realtime se sincronice)
      setTimeout(() => {
        productosGuardandoRef.current.delete(producto.id);
      }, 2000);

    } catch (error) {
      console.error('Error inesperado al guardar producto:', error);
      productosGuardandoRef.current.delete(producto.id);
      throw error; // Propagar error
    }
  };

  // Función para eliminar un producto de Supabase
  const eliminarProductoDeSupabase = async (productoId) => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        return;
      }

      const { error } = await supabase
        .from('productos_mesas_temp')
        .delete()
        .eq('producto_id', productoId)
        .eq('usuario_id', usuarioId);

      if (error) {
        console.error('Error al eliminar producto de Supabase:', error);
        return;
      }

      debugLog('✅ Producto eliminado de Supabase:', productoId);

    } catch (error) {
      console.error('Error inesperado al eliminar producto:', error);
    }
  };

  // Función para limpiar productos de una mesa en Supabase (después de pagar)
  const limpiarMesaEnSupabase = async (mesa, productosIds) => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        return;
      }

      // Si se proporcionan IDs específicos, eliminar solo esos
      if (productosIds && productosIds.length > 0) {
        const { error } = await supabase
          .from('productos_mesas_temp')
          .delete()
          .eq('usuario_id', usuarioId)
          .eq('mesa', mesa)
          .in('producto_id', productosIds);

        if (error) {
          console.error('Error al limpiar productos específicos:', error);
          return;
        }
      } else {
        // Si no hay IDs, limpiar toda la mesa
        const { error } = await supabase
          .from('productos_mesas_temp')
          .delete()
          .eq('usuario_id', usuarioId)
          .eq('mesa', mesa);

        if (error) {
          console.error('Error al limpiar mesa en Supabase:', error);
          return;
        }
      }

      debugLog('✅ Mesa limpiada en Supabase:', mesa);

    } catch (error) {
      console.error('Error inesperado al limpiar mesa:', error);
    }
  };

  // Función para actualizar comentarios en Supabase
  const actualizarComentariosEnSupabase = async (productoId, comentarios) => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      const { error } = await supabase
        .from('productos_mesas_temp')
        .update({ comentarios: comentarios || null })
        .eq('producto_id', productoId)
        .eq('usuario_id', usuarioId);

      if (error) {
        console.error('Error al actualizar comentarios en Supabase:', error);
      }

    } catch (error) {
      console.error('Error inesperado al actualizar comentarios:', error);
    }
  };

  // ============================================================
  // FUNCIONES DE SINCRONIZACIÓN DE MESAS
  // ============================================================

  // Función para cargar mesas desde Supabase (sin bloquear UI, actualización silenciosa)
  const cargarMesasDesdeSupabase = async (fromRealtime = false) => {
    try {
      // 🛡️ PROTECCIÓN: Si viene de Realtime y hubo un cambio muy reciente (< 3 segundos), esperar
      if (fromRealtime && ultimoCambioMesasRef.current) {
        const tiempoDesdeUltimoCambio = Date.now() - ultimoCambioMesasRef.current;
        if (tiempoDesdeUltimoCambio < 3000) { // 3 segundos de protección
          debugLog(`⏸️ Realtime bloqueado: cambio reciente hace ${tiempoDesdeUltimoCambio}ms`);
          // Reintentar después de que pase el tiempo de protección
          setTimeout(() => cargarMesasRef.current(true), 3500);
          return;
        }
      }
      
      // Evitar carga múltiple (solo si no viene de Realtime)
      if (!fromRealtime && mesasInicialCargadas) {
        return;
      }
      
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        setMesasInicialCargadas(true);
        return;
      }

      // Reducir logs para mejor rendimiento

      const { data, error } = await supabase
        .from('mesas_config')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('orden', { ascending: true });

      if (error) {
        console.error('Error al cargar mesas desde Supabase:', error);
        setMesasInicialCargadas(true);
        return;
      }

      if (data && data.length > 0) {
        const mesasArray = data.map(m => m.nombre_mesa);
        
        // Verificar si hay un orden guardado en localStorage
        let mesasOrdenadas = mesasArray;
        try {
          const cached = localStorage.getItem('mesasPedidos');
          if (cached) {
            const mesasCached = JSON.parse(cached);
            // Si las mesas en cache tienen el mismo contenido (mismas mesas, posiblemente diferente orden)
            const mesasCachedSet = new Set(mesasCached);
            const mesasArraySet = new Set(mesasArray);
            const tienenMismoContenido = 
              mesasCachedSet.size === mesasArraySet.size &&
              [...mesasCachedSet].every(mesa => mesasArraySet.has(mesa));
            
            // Si tienen el mismo contenido, usar el orden de localStorage
            if (tienenMismoContenido && Array.isArray(mesasCached)) {
              // Filtrar y ordenar según el orden de localStorage
              mesasOrdenadas = mesasCached.filter(mesa => mesasArraySet.has(mesa));
              // Agregar cualquier mesa nueva que no esté en cache al final
              const mesasNuevas = mesasArray.filter(mesa => !mesasCachedSet.has(mesa));
              mesasOrdenadas = [...mesasOrdenadas, ...mesasNuevas];
            }
          }
        } catch (error) {
          console.error('Error al leer orden de localStorage:', error);
        }
        
        // 🛡️ VALIDACIÓN CRÍTICA: Protección contra pérdida de mesas
        const cantidadActual = mesas.length;
        const cantidadNueva = mesasOrdenadas.length;
        
        // Actualizar silenciosamente solo si hay cambios
        const mesasActualesStr = JSON.stringify(mesas);
        const mesasNuevasStr = JSON.stringify(mesasOrdenadas);
        
        if (mesasActualesStr !== mesasNuevasStr) {
          // 🛡️ PROTECCIÓN: Validar antes de sobrescribir
          if (!mesasInicialCargadas) {
            // Primera carga: aceptar lo que venga de Supabase
            console.log(`✅ Primera carga de mesas: ${cantidadNueva} mesas desde Supabase`);
            setMesas(mesasOrdenadas);
            localStorage.setItem('mesasPedidos', JSON.stringify(mesasOrdenadas));
          } else if (cantidadNueva >= cantidadActual) {
            // Actualización válida: misma cantidad o más mesas
            console.log(`✅ Actualización válida: ${cantidadActual} → ${cantidadNueva} mesas`);
            setMesas(mesasOrdenadas);
            localStorage.setItem('mesasPedidos', JSON.stringify(mesasOrdenadas));
          } else if (fromRealtime) {
            // Viene de Realtime y hay MENOS mesas: probablemente una eliminación legítima
            console.log(`⚠️ Eliminación Realtime: ${cantidadActual} → ${cantidadNueva} mesas`);
            setMesas(mesasOrdenadas);
            localStorage.setItem('mesasPedidos', JSON.stringify(mesasOrdenadas));
          } else {
            // 🚨 BLOQUEO: Supabase tiene menos mesas y no viene de Realtime
            console.error(`🛑 BLOQUEADO: No actualizar mesas. Supabase=${cantidadNueva}, Local=${cantidadActual}`);
            console.error('Posible error de red o query incompleto. Manteniendo mesas locales.');
            // NO actualizar estado, mantener las mesas actuales
            return; // Salir sin actualizar
          }
          
          // Solo cambiar la mesa seleccionada si ya no existe en el nuevo array
          if (!mesasOrdenadas.includes(mesaSeleccionada)) {
            setMesaSeleccionada(mesasOrdenadas[0]);
          }
          if (IS_DEBUG) console.log('🔄 Mesas actualizadas');
        }
        
        setMesasInicialCargadas(true);
      } else {
        // Supabase devolvió 0 mesas
        if (!mesasInicialCargadas && mesas.length === 0) {
          // Primera carga y no hay mesas locales: inicializar por defecto
          debugLog('📝 No hay mesas en Supabase ni local. Inicializando por defecto...');
          setMesasInicialCargadas(true);
          inicializarMesasPorDefecto();
        } else if (mesas.length > 0) {
          // 🚨 Ya tenemos mesas locales: NO borrarlas
          console.error('🛑 BLOQUEADO: Supabase devolvió 0 mesas pero tenemos ' + mesas.length + ' mesas locales.');
          console.error('Posible error de red. Manteniendo mesas locales para evitar pérdida de datos.');
          setMesasInicialCargadas(true);
          // NO llamar a inicializarMesasPorDefecto ni limpiar mesas
        } else {
          // No hay mesas en ningún lado
          setMesasInicialCargadas(true);
          inicializarMesasPorDefecto();
        }
      }

    } catch (error) {
      console.error('Error inesperado al cargar mesas:', error);
      setMesasInicialCargadas(true);
    }
  };

  // Función para inicializar mesas por defecto en Supabase (solo crear en DB, no actualizar estado)
  const inicializarMesasPorDefecto = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      // Obtener cliente_id para el INSERT (requerido por RLS)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      const mesasDefault = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4'];
      
      // Crear mesas en Supabase
      const mesasParaInsertar = mesasDefault.map((nombre, index) => ({
        usuario_id: usuarioId,
        cliente_id: usuarioData?.cliente_id || null,
        nombre_mesa: nombre,
        orden: index
      }));

      const { error } = await supabase
        .from('mesas_config')
        .insert(mesasParaInsertar);

      if (error) {
        console.error('Error al crear mesas por defecto en Supabase:', error);
      } else {
        debugLog('✅ Mesas por defecto creadas en Supabase (background)');
      }

    } catch (error) {
      console.error('Error al inicializar mesas por defecto:', error);
    }
  };

  // Función para guardar nuevas mesas en Supabase
  const guardarMesasEnSupabase = async (nuevasMesas) => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      // Obtener cliente_id para el INSERT (requerido por RLS)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      // Preparar mesas para insertar (solo las nuevas)
      const mesasParaInsertar = nuevasMesas.map((nombre, index) => ({
        usuario_id: usuarioId,
        cliente_id: usuarioData?.cliente_id || null,
        nombre_mesa: nombre,
        orden: mesas.length + index // Continuar desde el último orden
      }));

      const { error } = await supabase
        .from('mesas_config')
        .upsert(mesasParaInsertar, { onConflict: 'usuario_id,nombre_mesa' });

      if (error) {
        console.error('Error al guardar mesas en Supabase:', error);
      } else {
        debugLog('✅ Mesas guardadas en Supabase:', nuevasMesas.length);
      }

    } catch (error) {
      console.error('Error inesperado al guardar mesas:', error);
    }
  };

  // Función para eliminar una mesa de Supabase
  const eliminarMesaDeSupabase = async (nombreMesa) => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      const { error } = await supabase
        .from('mesas_config')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('nombre_mesa', nombreMesa);

      if (error) {
        console.error('Error al eliminar mesa de Supabase:', error);
      } else {
        debugLog('✅ Mesa eliminada de Supabase:', nombreMesa);
      }

    } catch (error) {
      console.error('Error inesperado al eliminar mesa:', error);
    }
  };

  // Función para renombrar una mesa en Supabase
  const renombrarMesaEnSupabase = async (nombreAntiguo, nombreNuevo) => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      const { error } = await supabase
        .from('mesas_config')
        .update({ nombre_mesa: nombreNuevo })
        .eq('usuario_id', usuarioId)
        .eq('nombre_mesa', nombreAntiguo);

      if (error) {
        console.error('Error al renombrar mesa en Supabase:', error);
      } else {
        debugLog('✅ Mesa renombrada en Supabase:', nombreAntiguo, '→', nombreNuevo);
      }

    } catch (error) {
      console.error('Error inesperado al renombrar mesa:', error);
    }
  };

  // Función para actualizar el orden de las mesas en Supabase
  const actualizarOrdenMesasEnSupabase = async (mesasOrdenadas) => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.warn('No se puede actualizar orden: usuario no autenticado');
        return;
      }

      // Actualizar el orden de cada mesa
      const actualizaciones = mesasOrdenadas.map((nombreMesa, i) => 
        supabase
          .from('mesas_config')
          .update({ orden: i })
          .eq('usuario_id', usuarioId)
          .eq('nombre_mesa', nombreMesa)
      );

      // Ejecutar todas las actualizaciones en paralelo
      await Promise.all(actualizaciones);

      debugLog('✅ Orden de mesas actualizado en Supabase');

    } catch (error) {
      console.error('Error al actualizar orden de mesas:', error);
      // No lanzar el error, solo loguearlo para no interrumpir la experiencia del usuario
    }
  };

  // ============================================================
  // FIN FUNCIONES DE SINCRONIZACIÓN
  // ============================================================

  // Función para normalizar texto (eliminar acentos y convertir a minúsculas)
  const normalizarTexto = (texto) => {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .trim();
  };

  // Función mejorada y OPTIMIZADA para filtrar productos según la búsqueda
  const filtrarProductos = (busqueda) => {
    if (!busqueda.trim()) {
      setProductosFiltrados([]);
      return;
    }

    if (productosInventario.length === 0) {
      setProductosFiltrados([]);
      return;
    }

    const busquedaNormalizada = normalizarTexto(busqueda);
    
    // OPTIMIZACIÓN CRÍTICA: Normalizar todos los productos una sola vez ANTES de filtrar
    // Esto evita normalizaciones repetidas en filter y sort, mejorando significativamente el rendimiento
    const productosNormalizados = productosInventario.map(producto => ({
      ...producto,
      nombreNormalizado: normalizarTexto(producto.producto)
    }));
        
        // Coincidencia simple: todas las palabras deben estar en el nombre
        const palabrasBusqueda = busquedaNormalizada.split(/\s+/).filter(p => p.length > 0);
    
    // Filtrado más eficiente usando nombres ya normalizados
    const filtrados = productosNormalizados
      .filter(producto => {
        return palabrasBusqueda.every(palabra => producto.nombreNormalizado.includes(palabra));
      })
      .sort((a, b) => {
        // Ordenar por: 1) coincidencias al inicio, 2) longitud del nombre
        // Ya no necesitamos normalizar de nuevo, el nombre ya está normalizado
        const aComienza = a.nombreNormalizado.startsWith(busquedaNormalizada);
        const bComienza = b.nombreNormalizado.startsWith(busquedaNormalizada);
        
        if (aComienza && !bComienza) return -1;
        if (!aComienza && bComienza) return 1;
        
        // Si ambos o ninguno comienzan con la búsqueda, ordenar por longitud
        return a.nombreNormalizado.length - b.nombreNormalizado.length;
      })
      .slice(0, 50) // Limitar a 50 resultados para mejor rendimiento
      .map(producto => {
        // Remover el campo temporal antes de guardar en el estado
        const { nombreNormalizado, ...productoSinNormalizado } = producto;
        return productoSinNormalizado;
      });

    setProductosFiltrados(filtrados);
  };

  // Función para seleccionar un producto del inventario
  const seleccionarProducto = (producto) => {
    const cantidad = '1';
    const precio = parseFloat(producto.precio_venta) || 0;
    const cantidadNum = 1;
    const subtotal = +(cantidadNum * precio).toFixed(2);
    
    setProductoActual({
      ...productoActual,
      producto: producto.producto,
      precio_unitario: producto.precio_venta.toString(),
      unidad: producto.unidad,
      cantidad: cantidad,
      subtotal: subtotal,
      comentarios: ''
    });
    setBusquedaProducto(producto.producto);
    setMostrarDropdown(false);
  };

  // Función para buscar producto por código de barras
  const buscarProductoPorCodigo = async (codigo) => {
    try {
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      // Buscar producto en el inventario por código_interno
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('codigo_interno', parseInt(codigo))
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          alert(`❌ No se encontró ningún producto con el código ${codigo}`);
        } else {
          console.error('Error al buscar producto por código:', error);
          alert('❌ Error al buscar el producto');
        }
        return;
      }

      if (data) {
        // Completar el formulario con los datos del producto encontrado
        const cantidad = '1';
        const precio = parseFloat(data.precio_venta) || 0;
        const cantidadNum = 1;
        const subtotal = +(cantidadNum * precio).toFixed(2);
        
        setProductoActual({
          ...productoActual,
          producto: data.producto,
          precio_unitario: data.precio_venta.toString(),
          unidad: data.unidad,
          cantidad: cantidad,
          subtotal: subtotal,
          comentarios: ''
        });
        setBusquedaProducto(data.producto);
        
        // Cerrar dropdown si está abierto
        setMostrarDropdown(false);
      }
    } catch (error) {
      console.error('Error inesperado al buscar producto por código:', error);
      alert('❌ Error inesperado al buscar el producto');
    }
  };

  // Función para manejar cambios en la búsqueda de productos (CON DEBOUNCE)
  const handleBusquedaProducto = (e) => {
    const valor = e.target.value;

    // Actualizar el estado inmediatamente (para que el usuario vea su escritura)
    setBusquedaProducto(valor);
    setProductoActual({
      ...productoActual,
      producto: valor
    });
    
    // Guardar la última búsqueda en el ref
    ultimaBusquedaRef.current = valor;
    
    // OPTIMIZACIÓN: Limpiar timeout anterior
    if (busquedaTimeoutRef.current) {
      clearTimeout(busquedaTimeoutRef.current);
    }
    
    if (valor.trim()) {
      // OPTIMIZACIÓN: Aplicar debounce de 100ms antes de filtrar (reducido de 200ms)
      // Esto mejora la respuesta percibida mientras mantiene buen rendimiento
      busquedaTimeoutRef.current = setTimeout(() => {
        if (productosInventario.length > 0) {
          filtrarProductos(valor);
          setMostrarDropdown(true);
        } else {
          setProductosFiltrados([]);
          setMostrarDropdown(true);
        }
      }, 100); // Reducido de 200ms a 100ms para mejor respuesta
    } else {
      // Búsqueda vacía, limpiar todo inmediatamente (sin debounce)
      setProductosFiltrados([]);
      setMostrarDropdown(false);
      ultimaBusquedaRef.current = '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si es un campo del pedido principal
    if (name === 'fecha' || name === 'tipo_pago') {
      const updatedPedido = { ...pedido, [name]: value };
      setPedido(updatedPedido);
    } else {
      // Si es un campo del producto actual
      const updatedProducto = { ...productoActual, [name]: value };

      if (name === 'cantidad' || name === 'precio_unitario') {
        const cantidad = parseFloat(
          name === 'cantidad' ? value : productoActual.cantidad
        ) || 0;
        const precio = parseFloat(
          name === 'precio_unitario' ? value : productoActual.precio_unitario
        ) || 0;
        updatedProducto.subtotal = +(cantidad * precio).toFixed(2);
      }

      setProductoActual(updatedProducto);
    }
  };

  // Función para agregar un producto a la mesa seleccionada
  const agregarProductoAMesa = async () => {
    if (!productoActual.producto || !productoActual.cantidad || !productoActual.precio_unitario) {
      alert('Por favor completa todos los campos del producto');
      return;
    }

    const nuevoProducto = {
      ...productoActual,
      id: Date.now() // ID único para identificar el producto
    };

    // Agregar producto a la mesa seleccionada
    setProductosPorMesa(prev => ({
      ...prev,
      [mesaSeleccionada]: [...(prev[mesaSeleccionada] || []), nuevoProducto]
    }));
    
    // Limpiar el formulario INMEDIATAMENTE (antes de guardar en Supabase)
    setProductoActual({
      producto: '',
      cantidad: '',
      unidad: '',
      precio_unitario: '',
      subtotal: 0,
      comentarios: '',
    });
    
    // Limpiar también el campo de búsqueda y el dropdown
    setBusquedaProducto('');
    setProductosFiltrados([]);
    setMostrarDropdown(false);
    
    // PROTECCIÓN: Guardar en Supabase con manejo de errores mejorado
    try {
      await guardarProductoEnSupabase(mesaSeleccionada, nuevoProducto);
      debugLog('✅ Producto agregado y sincronizado correctamente');
    } catch (err) {
      console.error('⚠️ Error al sincronizar producto con Supabase:', err);
      // El producto ya está en el estado local, así que sigue siendo visible para el usuario
      // Solo loguear el error sin alertar (evita interrumpir la experiencia del usuario)
    }
    
    // El guardado en localStorage se hace automáticamente por el useEffect
  };

  // Función para actualizar comentarios de un producto (solo local - para onChange)
  const actualizarComentariosProducto = (mesa, productoId, comentarios) => {
    // 🛡️ Registrar que este comentario está siendo editado
    comentariosEnEdicionRef.current[productoId] = comentarios.toUpperCase();
    
    setProductosPorMesa(prev => ({
      ...prev,
      [mesa]: prev[mesa].map(p => 
        p.id === productoId 
          ? { ...p, comentarios: comentarios.toUpperCase() }
          : p
      )
    }));
  };
  
  // Función para guardar comentarios en Supabase (solo cuando termina de escribir - para onBlur)
  const guardarComentariosEnSupabase = async (productoId, comentarios) => {
    await actualizarComentariosEnSupabase(productoId, comentarios.toUpperCase());
    
    // 🛡️ Limpiar el ref después de guardar (dar tiempo para la sincronización)
    setTimeout(() => {
      delete comentariosEnEdicionRef.current[productoId];
    }, 2000); // 2 segundos de buffer
  };

  // Función para eliminar un producto de una mesa
  const eliminarProducto = async (mesa, productoId) => {
    setProductosPorMesa(prev => ({
      ...prev,
      [mesa]: prev[mesa].filter(p => p.id !== productoId)
    }));
    
    // Eliminar de Supabase (sincronización multi-dispositivo)
    await eliminarProductoDeSupabase(productoId);
    
    // También eliminar de seleccionados para cocina si estaba seleccionado
    setProductosSeleccionadosParaCocina(prev => {
      const nuevosSeleccionados = { ...prev };
      if (nuevosSeleccionados[mesa]) {
        nuevosSeleccionados[mesa] = nuevosSeleccionados[mesa].filter(id => id !== productoId);
      }
      return nuevosSeleccionados;
    });
    
    // También eliminar de seleccionados para pago si estaba seleccionado
    setProductosSeleccionadosParaPago(prev => {
      const nuevosSeleccionados = { ...prev };
      if (nuevosSeleccionados[mesa]) {
        nuevosSeleccionados[mesa] = nuevosSeleccionados[mesa].filter(id => id !== productoId);
      }
      return nuevosSeleccionados;
    });
  };

  // Función para alternar selección de un producto para cocina
  const toggleSeleccionProductoCocina = (mesa, productoId) => {
    setProductosSeleccionadosParaCocina(prev => {
      const mesaSeleccionados = prev[mesa] || [];
      const yaSeleccionado = mesaSeleccionados.includes(productoId);
      
      return {
        ...prev,
        [mesa]: yaSeleccionado 
          ? mesaSeleccionados.filter(id => id !== productoId)
          : [...mesaSeleccionados, productoId]
      };
    });
  };

  // Función para seleccionar/deseleccionar todos los productos de una mesa
  const toggleSeleccionarTodosParaCocina = (mesa) => {
    const productos = productosPorMesa[mesa] || [];
    const seleccionados = productosSeleccionadosParaCocina[mesa] || [];
    
    if (seleccionados.length === productos.length) {
      // Si todos están seleccionados, deseleccionar todos
      setProductosSeleccionadosParaCocina(prev => ({
        ...prev,
        [mesa]: []
      }));
    } else {
      // Seleccionar todos
      setProductosSeleccionadosParaCocina(prev => ({
        ...prev,
        [mesa]: productos.map(p => p.id)
      }));
    }
  };

  // Función para alternar selección de un producto para pago
  const toggleSeleccionProductoPago = (mesa, productoId) => {
    setProductosSeleccionadosParaPago(prev => {
      const mesaSeleccionados = prev[mesa] || [];
      const yaSeleccionado = mesaSeleccionados.includes(productoId);
      
      return {
        ...prev,
        [mesa]: yaSeleccionado 
          ? mesaSeleccionados.filter(id => id !== productoId)
          : [...mesaSeleccionados, productoId]
      };
    });
  };

  // Función para seleccionar/deseleccionar todos los productos de una mesa para pago
  const toggleSeleccionarTodosParaPago = (mesa) => {
    const productos = productosPorMesa[mesa] || [];
    const seleccionados = productosSeleccionadosParaPago[mesa] || [];
    
    if (seleccionados.length === productos.length) {
      // Si todos están seleccionados, deseleccionar todos
      setProductosSeleccionadosParaPago(prev => ({
        ...prev,
        [mesa]: []
      }));
    } else {
      // Seleccionar todos
      setProductosSeleccionadosParaPago(prev => ({
        ...prev,
        [mesa]: productos.map(p => p.id)
      }));
    }
  };

  // Función para calcular el total de una mesa (solo productos seleccionados para pago)
  const calcularTotalMesa = (mesa) => {
    const productos = productosPorMesa[mesa] || [];
    const productosSeleccionados = productosSeleccionadosParaPago[mesa] || [];
    
    // Si hay productos seleccionados, calcular solo esos
    if (productosSeleccionados.length > 0) {
      return productos
        .filter(p => productosSeleccionados.includes(p.id))
        .reduce((total, producto) => total + (parseFloat(producto.subtotal) || 0), 0);
    }
    
    // Si no hay seleccionados, calcular todos (comportamiento por defecto)
    return productos.reduce((total, producto) => total + (parseFloat(producto.subtotal) || 0), 0);
  };

  // Función para calcular el total con propina
  const calcularTotalConPropina = (mesa) => {
    const subtotal = calcularTotalMesa(mesa);
    return subtotal + calcularPropina(mesa);
  };

  // Función para calcular solo la propina
  const calcularPropina = (mesa) => {
    if (!propinaActiva) return 0;
    if (propinaManual !== null) return propinaManual;
    const subtotal = calcularTotalMesa(mesa);
    return Math.round((subtotal * porcentajePropina) / 100);
  };

  // Función para calcular el vuelto
  const calcularVuelto = () => {
    if (!mesaSeleccionada) return 0;
    const totalMesa = calcularTotalConPropina(mesaSeleccionada);
    const montoPagadoNum = parseFloat(montoPagado) || 0;
    return montoPagadoNum - totalMesa;
  };

  // Función para calcular el acumulado real desde los pedidos registrados del día
  // Usa la misma lógica que calcularEstadisticasPedidos para que cuadre con las estadísticas
  const calcularAcumuladoReal = () => {
    const fechaActual = obtenerFechaHoyChile();
    
    // Filtrar pedidos del día actual
    const pedidosHoy = pedidosRegistrados.filter(pedido => {
      const fechaPedido = pedido.fecha_cl || pedido.fecha;
      return fechaPedido === fechaActual;
    });

    // Solo considerar pedidos completos (con total_final > 0, con mesa y estado pagado)
    const pedidosCompletos = pedidosHoy.filter(pedido => 
      pedido.total_final && parseFloat(pedido.total_final) > 0 &&
      pedido.mesa && pedido.estado === 'pagado'
    );

    // Filtrar solo pedidos de efectivo y sumar total_final
    const acumulado = pedidosCompletos
      .filter(pedido => pedido.tipo_pago === 'efectivo')
      .reduce((total, pedido) => {
        // Solo contar una vez por pedido (usar la primera fila de cada pedido)
        // Como ya filtramos por mesa y estado, cada pedido se cuenta una vez
        const monto = parseFloat(pedido.total_final) || 0;
        return total + monto;
      }, 0);

    return acumulado;
  };

  // Función para calcular el total de caja (caja inicial + acumulado real)
  const calcularTotalCaja = () => {
    const cajaInicialNum = parseFloat(cajaInicial) || 0;
    return cajaInicialNum + calcularAcumuladoReal();
  };

  // Función para agregar mesas
  const agregarMesas = async () => {
    if (cantidadMesas <= 0) {
      alert('La cantidad de mesas debe ser mayor a 0');
      return;
    }

    // 🛡️ Marcar timestamp del cambio para protección contra Realtime
    ultimoCambioMesasRef.current = Date.now();

    const nuevasMesas = [];
    for (let i = 1; i <= cantidadMesas; i++) {
      nuevasMesas.push(`Mesa ${mesas.length + i}`);
    }
    
    const mesasActualizadas = [...mesas, ...nuevasMesas];
    setMesas(mesasActualizadas);
    setCantidadMesas(4); // Resetear a 4
    
    // Guardar en localStorage PRIMERO (cache secundario)
    localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));
    
    // Guardar en Supabase (sincronización multi-dispositivo)
    await guardarMesasEnSupabase(nuevasMesas);
  };

  // Función para eliminar una mesa
  const eliminarMesa = async (mesaAEliminar) => {
    // 📋 LOG DE AUDITORÍA
    console.log(`🗑️ Eliminando mesa: "${mesaAEliminar}" a las ${new Date().toLocaleString('es-CL')}`);
    console.log(`📊 Estado antes: ${mesas.length} mesas totales`);
    
    // No permitir eliminar si solo queda una mesa
    if (mesas.length <= 1) {
      alert('Debe mantener al menos una mesa');
      return;
    }

    // 🛡️ Marcar timestamp del cambio para protección contra Realtime
    ultimoCambioMesasRef.current = Date.now();

    // Si la mesa a eliminar es la seleccionada, cambiar a otra mesa
    if (mesaSeleccionada === mesaAEliminar) {
      const mesaIndex = mesas.findIndex(mesa => mesa === mesaAEliminar);
      const nuevaMesaSeleccionada = mesas[mesaIndex - 1] || mesas[mesaIndex + 1];
      setMesaSeleccionada(nuevaMesaSeleccionada);
    }

    // Eliminar la mesa y sus productos
    const mesasActualizadas = mesas.filter(mesa => mesa !== mesaAEliminar);
    setMesas(mesasActualizadas);
    
    // Eliminar productos de la mesa eliminada
    setProductosPorMesa(prev => {
      const nuevosProductos = { ...prev };
      delete nuevosProductos[mesaAEliminar];
      return nuevosProductos;
    });

    // Actualizar localStorage PRIMERO (cache secundario)
    localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));

    // Eliminar de Supabase (sincronización multi-dispositivo)
    await eliminarMesaDeSupabase(mesaAEliminar);
    await limpiarMesaEnSupabase(mesaAEliminar); // Eliminar también los productos de la mesa

    // Actualizar orden de las mesas restantes
    await actualizarOrdenMesasEnSupabase(mesasActualizadas);
    
    // 📋 LOG DE AUDITORÍA - CONFIRMACIÓN
    console.log(`✅ Mesa "${mesaAEliminar}" eliminada exitosamente`);
    console.log(`📊 Estado después: ${mesasActualizadas.length} mesas restantes`);
    
    // El guardado de productos en localStorage se hace automáticamente por el useEffect
  };

  // Función para iniciar edición de nombre de mesa
  const iniciarEdicionNombreMesa = (mesa) => {
    setMesaEditando(mesa);
    setNombreMesaTemporal(mesa);
  };

  // Función para guardar nombre de mesa editado
  const guardarNombreMesa = async (mesaAntigua) => {
    if (!nombreMesaTemporal.trim()) {
      alert('El nombre de la mesa no puede estar vacío');
      return;
    }

    const nuevoNombre = nombreMesaTemporal.trim();

    // Validar que el nuevo nombre no exista en otra mesa
    if (nuevoNombre !== mesaAntigua && mesas.includes(nuevoNombre)) {
      alert(`Ya existe una mesa con el nombre "${nuevoNombre}". Elige otro nombre.`);
      return;
    }

    // 🛡️ Marcar timestamp del cambio para protección contra Realtime
    ultimoCambioMesasRef.current = Date.now();

    // Actualizar productosPorMesa con el nuevo nombre
    if (productosPorMesa[mesaAntigua]) {
      setProductosPorMesa(prev => {
        const nuevosProductos = { ...prev };
        nuevosProductos[nombreMesaTemporal] = nuevosProductos[mesaAntigua];
        delete nuevosProductos[mesaAntigua];
        return nuevosProductos;
      });
    }

    // Actualizar selectores de cocina con el nuevo nombre
    if (productosSeleccionadosParaCocina[mesaAntigua]) {
      setProductosSeleccionadosParaCocina(prev => {
        const nuevosSeleccionados = { ...prev };
        nuevosSeleccionados[nombreMesaTemporal] = nuevosSeleccionados[mesaAntigua];
        delete nuevosSeleccionados[mesaAntigua];
        return nuevosSeleccionados;
      });
    }

    // Actualizar selectores de pago con el nuevo nombre
    if (productosSeleccionadosParaPago[mesaAntigua]) {
      setProductosSeleccionadosParaPago(prev => {
        const nuevosSeleccionados = { ...prev };
        nuevosSeleccionados[nombreMesaTemporal] = nuevosSeleccionados[mesaAntigua];
        delete nuevosSeleccionados[mesaAntigua];
        return nuevosSeleccionados;
      });
    }

    // Actualizar el array de mesas
    setMesas(prevMesas => prevMesas.map(m => m === mesaAntigua ? nombreMesaTemporal : m));
    
    // Actualizar mesa seleccionada si era la que se editó
    if (mesaSeleccionada === mesaAntigua) {
      setMesaSeleccionada(nombreMesaTemporal);
    }

    // Actualizar localStorage PRIMERO (cache secundario)
    const mesasActualizadas = mesas.map(m => m === mesaAntigua ? nombreMesaTemporal : m);
    localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));

    // Renombrar en Supabase (sincronización multi-dispositivo)
    await renombrarMesaEnSupabase(mesaAntigua, nombreMesaTemporal);

    // Limpiar estados de edición
    setMesaEditando(null);
    setNombreMesaTemporal('');
  };

  // Función para cancelar edición de nombre de mesa
  const cancelarEdicionNombreMesa = () => {
    setMesaEditando(null);
    setNombreMesaTemporal('');
  };

  // Funciones para drag and drop de mesas
  const iniciarArrastre = useCallback((e, mesa, indice) => {
    // No iniciar drag si las mesas están bloqueadas
    if (mesasBloqueadas) return;
    
    // No iniciar drag si se está editando
    if (mesaEditando === mesa) return;
    
    // Prevenir comportamiento por defecto
    e.preventDefault();
    e.stopPropagation();
    
    // Obtener posición inicial (soporta tanto mouse como touch)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setMesaArrastrando(mesa);
    setIndiceArrastrando(indice);
    posicionInicialRef.current = { x: clientX, y: clientY };
    setPosicionActual({ x: clientX, y: clientY });
    setEsArrastrando(false); // Se activará después de un threshold de movimiento
  }, [mesaEditando, mesasBloqueadas]);

  const moverArrastre = useCallback((e) => {
    if (!mesaArrastrando || indiceArrastrando === null) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Obtener posición actual
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Actualizar posición actual
    setPosicionActual({ x: clientX, y: clientY });
    
    // Activar drag solo si hay movimiento significativo (threshold de 10px)
    const deltaX = Math.abs(clientX - posicionInicialRef.current.x);
    const deltaY = Math.abs(clientY - posicionInicialRef.current.y);
    if ((deltaX > 10 || deltaY > 10)) {
      // Usar función de actualización para evitar problemas de closure
      setEsArrastrando(prev => {
        if (!prev) return true;
        return prev;
      });
    }
  }, [mesaArrastrando, indiceArrastrando]);

  const finalizarArrastre = useCallback((e) => {
    if (!mesaArrastrando || indiceArrastrando === null) {
      // Limpiar estados si no había drag activo
      setMesaArrastrando(null);
      setIndiceArrastrando(null);
      setEsArrastrando(false);
      return;
    }
    
    // Si no se activó el drag (click normal), no hacer nada
    if (!esArrastrando) {
      setMesaArrastrando(null);
      setIndiceArrastrando(null);
      setEsArrastrando(false);
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Obtener el elemento sobre el que se soltó
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    
    // Encontrar el índice del elemento sobre el que se soltó
    // Primero intentar con elementsFromPoint
    const elementos = document.elementsFromPoint(clientX, clientY);
    let nuevoIndice = indiceArrastrando;
    
    // Buscar el contenedor de otra mesa (excluyendo el que se está arrastrando)
    for (const elemento of elementos) {
      const indiceAttr = elemento.getAttribute('data-mesa-indice');
      if (indiceAttr !== null) {
        const indiceEncontrado = parseInt(indiceAttr, 10);
        // Solo usar si es diferente al que se está arrastrando
        if (indiceEncontrado !== indiceArrastrando) {
          nuevoIndice = indiceEncontrado;
          break;
        }
      }
    }
    
    // Si no se encontró un elemento diferente, calcular basándose en la posición X
    if (nuevoIndice === indiceArrastrando) {
      // Buscar todos los elementos de mesas y calcular cuál está más cerca
      const todosLosElementos = document.querySelectorAll('[data-mesa-indice]');
      let indiceMasCercano = indiceArrastrando;
      let distanciaMinima = Infinity;
      
      todosLosElementos.forEach((elemento) => {
        const indice = parseInt(elemento.getAttribute('data-mesa-indice'), 10);
        if (indice !== indiceArrastrando) {
          const rect = elemento.getBoundingClientRect();
          const centroX = rect.left + rect.width / 2;
          const distancia = Math.abs(clientX - centroX);
          
          if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            indiceMasCercano = indice;
          }
        }
      });
      
      nuevoIndice = indiceMasCercano;
    }
    
    // Reordenar mesas si el índice cambió
    if (nuevoIndice !== indiceArrastrando && nuevoIndice >= 0 && nuevoIndice < mesas.length) {
      // 🛡️ Marcar timestamp del cambio para protección contra Realtime
      ultimoCambioMesasRef.current = Date.now();
      
      setMesas(prevMesas => {
        const mesasReordenadas = [...prevMesas];
        const [mesaMovida] = mesasReordenadas.splice(indiceArrastrando, 1);
        mesasReordenadas.splice(nuevoIndice, 0, mesaMovida);
        
        // Guardar nuevo orden en localStorage PRIMERO (prioridad)
        localStorage.setItem('mesasPedidos', JSON.stringify(mesasReordenadas));
        
        // Actualizar orden en Supabase de forma asíncrona (no bloquea)
        if (typeof actualizarOrdenMesasEnSupabase === 'function') {
          actualizarOrdenMesasEnSupabase(mesasReordenadas).catch(err => {
            console.error('Error al actualizar orden en Supabase:', err);
            // No es crítico, el orden ya está en localStorage
          });
        }
        
        return mesasReordenadas;
      });
    }
    
    // Limpiar estados
    setMesaArrastrando(null);
    setIndiceArrastrando(null);
    setEsArrastrando(false);
  }, [mesaArrastrando, indiceArrastrando, esArrastrando, mesas]);

  // Effect para manejar event listeners globales durante el drag
  useEffect(() => {
    // Activar listeners cuando se inicia el arrastre (mesaArrastrando no es null)
    if (!mesaArrastrando && indiceArrastrando === null) return;
    
    const handleMouseMove = (e) => {
      moverArrastre(e);
    };
    
    const handleMouseUp = (e) => {
      finalizarArrastre(e);
    };
    
    const handleTouchMove = (e) => {
      moverArrastre(e);
    };
    
    const handleTouchEnd = (e) => {
      finalizarArrastre(e);
    };
    
    // Agregar listeners globales
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    // Limpiar listeners al desmontar o cuando termine el drag
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mesaArrastrando, indiceArrastrando, moverArrastre, finalizarArrastre]);

  // Función para obtener el nombre de la mesa (ahora la columna mesa guarda texto)
  const obtenerNombreMesa = (valorMesa) => {
    // Si valorMesa ya es un string (texto), retornarlo directamente
    if (typeof valorMesa === 'string') {
      return valorMesa;
    }
    
    // Si es un número (para compatibilidad con registros antiguos)
    if (typeof valorMesa === 'number') {
      return `Mesa ${valorMesa}`;
    }
    
    // Si es null o undefined, retornar un valor por defecto
    return '-';
  };

  // Función para cambiar estado de pedido
  const cambiarEstadoPedido = (mesa, nuevoEstado) => {
    // Aquí se implementaría la lógica para cambiar el estado del pedido completo de la mesa
    console.log(`Cambiando estado de ${mesa} a ${nuevoEstado}`);
  };

  // Función para calcular años disponibles de los pedidos registrados (MEMOIZADA)
  const aniosDisponiblesMemo = useMemo(() => {
    const anios = new Set();
    
    // Solo incluir el año 2025 por defecto
    anios.add(2025);
    
    // Solo agregar años FUTUROS (posteriores a 2025) si hay pedidos en esos años
    pedidosRegistrados.forEach(pedido => {
      const fechaPedido = pedido.fecha_cl || pedido.fecha;
      if (fechaPedido) {
        const anio = parseInt(fechaPedido.split('-')[0]);
        // Solo agregar si es un año futuro (mayor a 2025)
        if (!isNaN(anio) && anio > 2025) {
          anios.add(anio);
        }
      }
    });
    
    const aniosArray = Array.from(anios).sort((a, b) => b - a); // Orden descendente
    return aniosArray;
  }, [pedidosRegistrados]);

  // Función para compatibilidad (mantiene la misma interfaz)
  const calcularAniosDisponibles = useCallback(() => {
    setAniosDisponibles(aniosDisponiblesMemo);
  }, [aniosDisponiblesMemo]);

  // Función para aplicar filtros a los pedidos registrados (MEMOIZADA)
  const pedidosFiltradosMemo = useMemo(() => {
    let filtrados = [...pedidosRegistrados];
    const fechaActual = obtenerFechaHoyChile();

    // FILTRO PERSONALIZADO (tiene prioridad sobre otros filtros)
    if (filtroPersonalizadoInicio && filtroPersonalizadoFin) {
      filtrados = filtrados.filter(pedido => {
        if (!pedido.created_at) return false;
        
        const timestampPedido = new Date(pedido.created_at);
        const timestampInicio = new Date(filtroPersonalizadoInicio);
        const timestampFin = new Date(filtroPersonalizadoFin);
        
        return timestampPedido >= timestampInicio && timestampPedido <= timestampFin;
      });
      
      // Si hay filtro de tipo de pago, aplicarlo también
      if (filtroTipoPago) {
        filtrados = filtrados.filter(pedido => pedido.tipo_pago === filtroTipoPago);
      }
      
      return filtrados;
    }

    // Si no hay filtros de fecha activos, mostrar solo los pedidos del día actual
    if (!filtroFecha && !filtroMes && !filtroAnio) {
      filtrados = filtrados.filter(pedido => {
        const fechaPedido = pedido.fecha_cl || pedido.fecha;
        return fechaPedido === fechaActual;
      });
    } else {
      // Filtro por fecha específica
      if (filtroFecha) {
        filtrados = filtrados.filter(pedido => {
          const fechaPedido = pedido.fecha_cl || pedido.fecha;
          return fechaPedido === filtroFecha;
        });
      }

      // Filtro por mes (si se selecciona y no hay fecha específica)
      if (filtroMes && !filtroFecha) {
        filtrados = filtrados.filter(pedido => {
          let fechaPedido = pedido.fecha_cl || pedido.fecha;
          if (!fechaPedido && pedido.created_at) {
            const fechaCreated = new Date(pedido.created_at);
            fechaPedido = fechaCreated.toISOString().split('T')[0];
          }
          if (!fechaPedido) return false;
          const [, month] = fechaPedido.split('-');
          return parseInt(month) === parseInt(filtroMes);
        });
      }

      // Filtro por año (sin fecha específica)
      if (filtroAnio && !filtroFecha) {
        filtrados = filtrados.filter(pedido => {
          let fechaPedido = pedido.fecha_cl || pedido.fecha;
          if (!fechaPedido && pedido.created_at) {
            const fechaCreated = new Date(pedido.created_at);
            fechaPedido = fechaCreated.toISOString().split('T')[0];
          }
          if (!fechaPedido) return false;
          const year = fechaPedido.split('-')[0];
          return parseInt(year) === parseInt(filtroAnio);
        });
      }
    }

    // Filtro por tipo de pago: se aplica siempre al final, sobre lo que ya está filtrado por fecha
    if (filtroTipoPago) {
      filtrados = filtrados.filter(pedido => pedido.tipo_pago === filtroTipoPago);
    }

    return filtrados;
  }, [pedidosRegistrados, filtroFecha, filtroMes, filtroAnio, filtroTipoPago, filtroPersonalizadoInicio, filtroPersonalizadoFin]);

  // Función para compatibilidad (mantiene la misma interfaz)
  const aplicarFiltros = useCallback(() => {
    setPedidosFiltrados(pedidosFiltradosMemo);
  }, [pedidosFiltradosMemo]);

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroMes('');
    setFiltroAnio('');
    setFiltroTipoPago('');
    setFiltroPersonalizadoInicio('');
    setFiltroPersonalizadoFin('');
    // No llamar setPedidosFiltrados directamente
    // Los efectos se encargarán de aplicar los filtros correctamente
  };

  // Función para calcular estadísticas dinámicas según filtros aplicados (MEMOIZADA)
  const estadisticasPedidosMemo = useMemo(() => {
    // Usar pedidosFiltradosMemo en lugar de recalcular los filtros
    const pedidosFiltrados = pedidosFiltradosMemo;

    // Solo considerar pedidos con total_final (pedidos completos)
    const pedidosCompletos = pedidosFiltrados.filter(pedido => 
      pedido.total_final && pedido.total_final > 0
    );

    // Calcular estadísticas
    const estadisticas = {
      total: { cantidad: 0, monto: 0 },
      efectivo: { cantidad: 0, monto: 0 },
      debito: { cantidad: 0, monto: 0 },
      transferencia: { cantidad: 0, monto: 0 },
      propinas: 0
    };

    // Agrupar por tipo de pago y calcular totales
    pedidosCompletos.forEach(pedido => {
      const monto = parseFloat(pedido.total_final) || 0;
      const propina = parseFloat(pedido.propina) || 0;
      
      // Solo contar una vez por pedido (usar la primera fila de cada pedido)
      if (pedido.mesa && pedido.estado === 'pagado') {
        estadisticas.total.cantidad++;
        estadisticas.total.monto += monto;
        estadisticas.propinas += propina;

        switch (pedido.tipo_pago) {
          case 'efectivo':
            estadisticas.efectivo.cantidad++;
            estadisticas.efectivo.monto += monto;
            break;
          case 'debito':
            estadisticas.debito.cantidad++;
            estadisticas.debito.monto += monto;
            break;
          case 'transferencia':
            estadisticas.transferencia.cantidad++;
            estadisticas.transferencia.monto += monto;
            break;
        }
      }
    });

    return estadisticas;
  }, [pedidosFiltradosMemo]);

  // Función para compatibilidad (mantiene la misma interfaz)
  const calcularEstadisticasPedidos = () => estadisticasPedidosMemo;

  // Función para obtener el título dinámico del resumen
  const obtenerTituloResumenPedidos = () => {
    // Si hay filtro personalizado, mostrarlo con prioridad
    if (filtroPersonalizadoInicio && filtroPersonalizadoFin) {
      const formatearFechaHora = (fechaISO) => {
        const fecha = new Date(fechaISO);
        const opciones = {
          timeZone: 'America/Santiago',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };
        return fecha.toLocaleString('es-CL', opciones);
      };
      
      return `Resumen de Pedidos - ${formatearFechaHora(filtroPersonalizadoInicio)} hasta ${formatearFechaHora(filtroPersonalizadoFin)}`;
    }
    
    if (!filtroFecha && !filtroMes && !filtroAnio && !filtroTipoPago) {
      return `Resumen de Pedidos - ${(() => {
        const fechaActual = obtenerFechaHoyChile();
        const [year, month, day] = fechaActual.split('-');
        return `${day}/${month}/${year}`;
      })()}`;
    }

    let titulo = 'Resumen de Pedidos - ';
    const partes = [];

    if (filtroFecha) {
      const [year, month, day] = filtroFecha.split('-');
      partes.push(`${day}/${month}/${year}`);
    }

    if (filtroMes) {
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      partes.push(meses[parseInt(filtroMes) - 1]);
    }

    if (filtroAnio) {
      partes.push(filtroAnio);
    }

    if (filtroTipoPago) {
      const tiposPago = {
        'efectivo': 'Efectivo',
        'debito': 'Débito',
        'transferencia': 'Transferencia'
      };
      partes.push(tiposPago[filtroTipoPago] || filtroTipoPago);
    }

    return titulo + partes.join(' - ');
  };

  // Función para validar fecha (similar a RegistroVenta.jsx)
  const validarFecha = (fechaString) => {
    if (!fechaString) return false;
    
    try {
      // Verificar formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
        return false;
      }
      
      const fecha = new Date(fechaString);
      return !isNaN(fecha.getTime());
    } catch (error) {
      return false;
    }
  };

  // Función para eliminar un pedido (solo del usuario actual)
  const eliminarPedido = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoadingPedidos(true);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId); // 🔒 SEGURIDAD: Solo eliminar pedidos del usuario actual

      if (error) {
        console.error('❌ Error al eliminar pedido:', error);
        mostrarToast('❌ Error al eliminar el pedido: ' + error.message, 'error', 4000);
        return;
      }

      // Pedido eliminado exitosamente
      mostrarToast('✅ Pedido eliminado exitosamente', 'success');
      
      // Recargar la lista de pedidos
      await cargarPedidosRegistrados();
      
    } catch (error) {
      console.error('❌ Error general al eliminar pedido:', error);
      mostrarToast('❌ Error al eliminar pedido: ' + error.message, 'error', 4000);
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Función para iniciar edición
  const iniciarEdicion = (pedido) => {
    setEditandoId(pedido.id);
    setValoresEdicion({
      fecha_cl: pedido.fecha_cl || pedido.fecha,
      mesa: pedido.mesa ? pedido.mesa.toString() : '',
      producto: pedido.producto,
      unidad: pedido.unidad,
      cantidad: pedido.cantidad,
      precio: pedido.precio ? pedido.precio.toString() : '',
      total: pedido.total ? pedido.total.toString() : '',
      total_final: pedido.total_final ? pedido.total_final.toString() : '',
      propina: pedido.propina ? pedido.propina.toString() : '',
      tipo_pago: pedido.tipo_pago || '',
      estado: pedido.estado || '',
      comentarios: pedido.comentarios || ''
    });
  };

  // Función para cancelar edición
  const cancelarEdicion = () => {
    setEditandoId(null);
    setValoresEdicion({
      fecha_cl: '',
      mesa: '',
      producto: '',
      unidad: '',
      cantidad: '',
      precio: '',
      total: '',
      total_final: '',
      propina: '',
      tipo_pago: '',
      estado: '',
      comentarios: ''
    });
  };

  // Función para manejar cambios en edición
  const handleEdicionChange = (campo, valor) => {
    setValoresEdicion(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Función para alternar pantalla completa usando la API del navegador
  const togglePantallaCompleta = async () => {
    try {
      if (!document.fullscreenElement) {
        // Entrar a pantalla completa
        await document.documentElement.requestFullscreen();
        setPantallaCompleta(true);
        
        // Mostrar notificación específica para dispositivos táctiles
        if (esDispositivoTactil()) {
          setNotificacionTactil(true);
          setTimeout(() => setNotificacionTactil(false), 5000);
        }
      } else {
        // Salir de pantalla completa
        await document.exitFullscreen();
        setPantallaCompleta(false);
      }
    } catch (error) {
      console.error('Error al cambiar modo pantalla completa:', error);
      // Fallback al comportamiento anterior si la API no está disponible
      setPantallaCompleta(!pantallaCompleta);
    }
  };

  // Función para guardar edición
  const guardarEdicion = async (id) => {
    try {
      // Validaciones básicas
      if (!valoresEdicion.fecha_cl || !valoresEdicion.producto || !valoresEdicion.cantidad || 
          !valoresEdicion.unidad || !valoresEdicion.precio) {
        alert('⚠️ Los campos fecha, producto, cantidad, unidad y precio son obligatorios');
        return;
      }

      if (parseFloat(valoresEdicion.cantidad) <= 0) {
        alert('⚠️ La cantidad debe ser mayor a 0');
        return;
      }

      if (parseFloat(valoresEdicion.precio) <= 0) {
        alert('⚠️ El precio debe ser mayor a 0');
        return;
      }

      setLoadingPedidos(true);

      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      const { error } = await supabase
        .from('pedidos')
        .update({
          fecha: valoresEdicion.fecha_cl,
          mesa: valoresEdicion.mesa || null,
          producto: valoresEdicion.producto.trim(),
          unidad: valoresEdicion.unidad,
          cantidad: valoresEdicion.cantidad,
          precio: parseFloat(valoresEdicion.precio),
          total: valoresEdicion.total ? parseFloat(valoresEdicion.total) : null,
          total_final: valoresEdicion.total_final ? parseFloat(valoresEdicion.total_final) : null,
          propina: valoresEdicion.propina ? parseFloat(valoresEdicion.propina) : null,
          tipo_pago: valoresEdicion.tipo_pago || null,
          estado: valoresEdicion.estado || null,
          comentarios: valoresEdicion.comentarios ? valoresEdicion.comentarios.toUpperCase().trim() : null
        })
        .eq('id', id)
        .eq('usuario_id', usuarioId); // 🔒 SEGURIDAD: Solo editar pedidos del usuario actual

      if (error) {
        console.error('❌ Error al actualizar pedido:', error);
        mostrarToast('❌ Error al actualizar el pedido: ' + error.message, 'error', 4000);
        return;
      }

      mostrarToast('✅ Pedido actualizado exitosamente', 'success');
      cancelarEdicion();
      await cargarPedidosRegistrados();

    } catch (error) {
      console.error('❌ Error inesperado al actualizar pedido:', error);
      mostrarToast('❌ Error inesperado al actualizar el pedido', 'error', 4000);
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Función para enviar pedido a cocina (INDEPENDIENTE del pago) - SOLO PRODUCTOS SELECCIONADOS
  const enviarACocina = async (mesa) => {
    // Validar que haya productos seleccionados
    const seleccionados = productosSeleccionadosParaCocina[mesa] || [];
    
    if (seleccionados.length === 0) {
      alert('❌ Por favor selecciona al menos un producto para enviar a cocina');
      return;
    }

    try {
      setEnviandoACocina(true);

      // Obtener usuario_id
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      // Obtener cliente_id para el INSERT (requerido por RLS)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      const cliente_id = usuarioData?.cliente_id || null;

      // Siempre calcular la fecha actual de Chile al momento de guardar (no usar estado montado)
      const fechaCl = obtenerFechaHoyChile();

      // Usar el nombre completo de la mesa (ahora la columna mesa acepta texto)
      const nombreMesaCompleto = mesa;

      // Filtrar solo los productos seleccionados
      const productosAEnviar = productosPorMesa[mesa].filter(p => seleccionados.includes(p.id));

      // Preparar todos los productos en un solo batch (mismo hora_inicio_pedido garantizado por PostgreSQL)
      const pedidosParaInsertar = productosAEnviar.map(producto => ({
        usuario_id: usuarioId,
        cliente_id: cliente_id,
        fecha_cl: fechaCl,
        mesa: String(nombreMesaCompleto),
        producto: producto.producto,
        unidad: producto.unidad,
        cantidad: parseFloat(producto.cantidad) || 0,
        comentarios: producto.comentarios ? producto.comentarios.toUpperCase().trim() : null,
        estado: 'pendiente' // Todas las filas del grupo tienen estado desde el inicio
      }));

      console.log('Insertando en pedidos_cocina:', pedidosParaInsertar.length, 'productos');

      const { error } = await supabase
        .from('pedidos_cocina')
        .insert(pedidosParaInsertar);

      if (error) {
        console.error('❌ Error al enviar a cocina:', error);
        alert('❌ Error al enviar pedido a cocina: ' + error.message);
        return;
      }

      // Mostrar notificación toast que se cierra automáticamente
      const mensajeExito = `✅ ${productosAEnviar.length} producto(s) de ${mesa} enviados a cocina`;
      setNotificacionToast({ visible: true, mensaje: mensajeExito, tipo: 'success' });
      
      // Cerrar automáticamente después de 3 segundos
      setTimeout(() => {
        setNotificacionToast(prev => ({ ...prev, visible: false }));
      }, 3000);
      
      console.log(`🍳 ${productosAEnviar.length} productos enviados a cocina`);

      // Guardar productos enviados para mostrar en la lista informativa
      setProductosEnviadosACocina(prev => {
        const productosEnviados = productosAEnviar.map(p => ({
          producto: p.producto,
          cantidad: p.cantidad,
          unidad: p.unidad || ''
        }));
        return {
          ...prev,
          [mesa]: [...(prev[mesa] || []), ...productosEnviados]
        };
      });

      // NO limpiar selección para mantener visualización de productos enviados

    } catch (error) {
      console.error('❌ Error inesperado al enviar a cocina:', error);
      alert('❌ Error al enviar a cocina');
    } finally {
      setEnviandoACocina(false);
    }
  };

  // Función para registrar pedido en Supabase
  const registrarPedido = async (mesa) => {
    // Prevenir doble clic - verificación síncrona inmediata con useRef
    if (registrandoPedidoRef.current) {
      console.log('⚠️ Intento de doble registro bloqueado');
      return;
    }
    
    // Marcar inmediatamente como procesando (síncrono)
    registrandoPedidoRef.current = true;
    setRegistrandoPedido(true);

    // Validar fecha primero
    if (!validarFecha(pedido.fecha)) {
      alert('❌ Por favor ingresa una fecha válida en formato YYYY-MM-DD');
      registrandoPedidoRef.current = false;
      setRegistrandoPedido(false);
      return;
    }

    // Validar que haya productos seleccionados para pago
    const productosSeleccionados = productosSeleccionadosParaPago[mesa] || [];
    if (productosSeleccionados.length === 0) {
      alert('❌ Por favor selecciona al menos un producto para pagar');
      registrandoPedidoRef.current = false;
      setRegistrandoPedido(false);
      return;
    }

    // Validar que se haya seleccionado un tipo de pago
    if (!pedido.tipo_pago) {
      alert('❌ Por favor selecciona un método de pago');
      registrandoPedidoRef.current = false;
      setRegistrandoPedido(false);
      return;
    }

    // Validar que el monto pagado sea suficiente (solo si se ingresó y es efectivo)
    if (pedido.tipo_pago === 'efectivo' && montoPagado !== '') {
      const montoPagadoNum = parseFloat(montoPagado) || 0;
      const totalConPropina = calcularTotalConPropina(mesa);
      if (montoPagadoNum < totalConPropina) {
        alert(`❌ El monto pagado ($${montoPagadoNum.toLocaleString('es-CL')}) es insuficiente. Total: $${totalConPropina.toLocaleString('es-CL')}`);
        registrandoPedidoRef.current = false;
        setRegistrandoPedido(false);
        return;
      }
    }

    // Validar que la fecha esté presente
    if (!pedido.fecha) {
      alert('❌ Por favor completa la fecha del pedido');
      registrandoPedidoRef.current = false;
      setRegistrandoPedido(false);
      return;
    }

    // Obtener el usuario_id del usuario autenticado
    const usuarioId = await authService.getCurrentUserId();
    if (!usuarioId) {
      alert('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      registrandoPedidoRef.current = false;
      setRegistrandoPedido(false);
      return;
    }

    // Obtener cliente_id para el INSERT (requerido por RLS)
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('cliente_id')
      .eq('usuario_id', usuarioId)
      .single();

    const cliente_id = usuarioData?.cliente_id || null;

    // Usar el nombre completo de la mesa (ahora la columna mesa acepta texto)
    const nombreMesaCompleto = mesa;

    // Calcular el total final de la mesa (con propina si está activa)
    const totalFinal = calcularTotalConPropina(mesa);

    try {
      // Filtrar solo los productos seleccionados para pago
      const productosAPagar = productosPorMesa[mesa].filter(p => productosSeleccionados.includes(p.id));
      
      // Calcular propina una sola vez (fuera del bucle)
      const propinaValue = calcularPropina(mesa);
      
      // Siempre calcular la fecha actual de Chile al momento de guardar (no usar estado montado)
      const fechaCl = obtenerFechaHoyChile();

      // Preparar TODOS los pedidos para insertar en una sola operación (BATCH INSERT)
      const pedidosParaInsertar = productosAPagar.map((producto, i) => {
        return {
          fecha: fechaCl,
          fecha_cl: fechaCl,
          // Mesa solo en la primera fila
          mesa: i === 0 ? nombreMesaCompleto : null,
          producto: producto.producto,
          unidad: producto.unidad,
          cantidad: producto.cantidad.toString(),
          precio: parseFloat(producto.precio_unitario) || 0,
          total: parseFloat(producto.subtotal) || 0,
          // total_final solo en la primera fila
          total_final: i === 0 ? totalFinal : null,
          // Estado solo en la primera fila
          estado: i === 0 ? 'pagado' : null,
          // Tipo de pago solo en la primera fila
          tipo_pago: i === 0 ? pedido.tipo_pago : null,
          // Propina solo en la primera fila
          propina: i === 0 ? propinaValue : null,
          // Comentarios del producto (normalizado a mayúsculas)
          comentarios: producto.comentarios ? producto.comentarios.toUpperCase().trim() : null,
          usuario_id: usuarioId,
          cliente_id: cliente_id
        };
      });

      // INSERTAR TODOS LOS PEDIDOS EN UNA SOLA OPERACIÓN (mucho más rápido)
      console.log('📝 Insertando pedidos:', pedidosParaInsertar.length, 'productos');
      const { error, data } = await supabase
        .from('pedidos')
        .insert(pedidosParaInsertar)
        .select();
      
      if (data) {
        console.log('✅ Pedidos insertados:', data.length, 'filas');
      }

      if (error) {
        console.error('Error al registrar pedidos:', error);
        alert('Error al registrar pedido: ' + error.message);
        registrandoPedidoRef.current = false;
        setRegistrandoPedido(false);
        return;
      }

      // Mostrar notificación toast que desaparece automáticamente
      mostrarToast(`✅ ${productosAPagar.length} producto(s) de ${mesa} registrado(s). Total: $${totalFinal.toLocaleString()}`, 'success');
       
       // Limpiar solo los productos PAGADOS, dejar los pendientes en la mesa
       const productosPendientes = productosPorMesa[mesa].filter(p => !productosSeleccionados.includes(p.id));
       
       setProductosPorMesa(prev => {
         const nuevosProductos = { ...prev };
         
         if (productosPendientes.length > 0) {
           nuevosProductos[mesa] = productosPendientes;
         } else {
           // Si no quedan productos, eliminar la mesa completa
           delete nuevosProductos[mesa];
         }
         return nuevosProductos;
       });
       
       // Limpiar selección de productos para pago después de registrar
       setProductosSeleccionadosParaPago(prev => ({
         ...prev,
         [mesa]: []
       }));
       
       // Limpiar selectores de cocina SOLO si se registró todo el pedido completo
       if (productosPendientes.length === 0) {
         setProductosSeleccionadosParaCocina(prev => {
           const nuevosSeleccionados = { ...prev };
           if (nuevosSeleccionados[mesa]) {
             delete nuevosSeleccionados[mesa];
           }
           return nuevosSeleccionados;
         });
       }

       // Limpiar el tipo de pago y campos de vuelto
       setPedido(prev => ({
         ...prev,
         tipo_pago: ''
       }));

       // Limpiar campos de vuelto
       setMontoPagado('');
       setMostrarVuelto(false);

       // Limpiar propina al registrar
       setPropinaActiva(false);
       setPorcentajePropina(10);
       setPropinaManual(null);

       // El guardado en localStorage se hace automáticamente por los useEffect

      // Limpiar productos pagados de Supabase (sincronización multi-dispositivo)
      await limpiarMesaEnSupabase(mesa, productosSeleccionados);

      // Recargar la tabla de pedidos registrados en segundo plano (sin await para mejor UX)
      // Esto permite que el usuario vea el feedback inmediatamente
      // mientras los pedidos se recargan en segundo plano
      cargarPedidosRegistrados().catch(error => {
        console.error('Error al recargar pedidos (no crítico):', error);
      });

    } catch (error) {
      console.error('Error general al registrar pedido:', error);
      alert('❌ Error al registrar pedido: ' + error.message);
    } finally {
      // Siempre limpiar el estado de procesamiento, incluso si hay error
      registrandoPedidoRef.current = false;
      setRegistrandoPedido(false);
    }
  };

  // Mantener el ref actualizado con la función más reciente en cada render
  cargarMesasRef.current = cargarMesasDesdeSupabase;

  // Cargar datos al montar el componente
  useEffect(() => {
    // Cargar productos temporales INMEDIATAMENTE (prioridad crítica)
    cargarProductosTemporales().catch(err => {
      console.error('Error al cargar productos temporales:', err);
    });
    
    // Cargar mesas en paralelo (prioridad alta)
    cargarMesasDesdeSupabase().catch(err => {
      console.error('Error al cargar mesas:', err);
    });
    
    // Cargar inventario y pedidos en background (no bloquean UI)
    cargarProductosInventario().catch(err => {
      console.error('Error al cargar inventario:', err);
    });
    
    cargarPedidosRegistrados().catch(err => {
      console.error('Error al cargar pedidos:', err);
    });

    // Configurar suscripciones Realtime para sincronización automática entre dispositivos
    
    // Suscripción 1: productos_mesas_temp
    const channelProductos = supabase
      .channel('productos_mesas_temp_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'productos_mesas_temp'
        },
        (payload) => {
          // PROTECCIÓN: Debounce más largo para evitar race conditions
          if (realtimeTimeoutRef.current) {
            clearTimeout(realtimeTimeoutRef.current);
          }
          realtimeTimeoutRef.current = setTimeout(() => {
            // Solo recargar si no hay productos guardándose activamente
            if (productosGuardandoRef.current.size === 0) {
              cargarProductosTemporales();
              debugLog('🔄 Realtime: Recargando productos');
            } else {
              debugLog('⏸️ Realtime: Esperando a que termine el guardado...');
              // Reintentar después de 2 segundos
              setTimeout(() => cargarProductosTemporales(), 2000);
            }
          }, 1500); // Aumentado a 1.5 segundos para mejor estabilidad
        }
      )
      .subscribe();

    // Suscripción 2: mesas_config
    const channelMesas = supabase
      .channel('mesas_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'mesas_config'
        },
        (payload) => {
          // 🛡️ PROTECCIÓN: Debounce para evitar race conditions
          if (realtimeMesasTimeoutRef.current) {
            clearTimeout(realtimeMesasTimeoutRef.current);
          }
          realtimeMesasTimeoutRef.current = setTimeout(() => {
            cargarMesasRef.current(true);
            debugLog('🔄 Realtime: Recargando mesas');
          }, 2000); // 2 segundos de debounce para permitir que se propague el cambio
        }
      )
      .subscribe();

    // Recargar datos cuando la página vuelve a ser visible (fix para tablets en inactividad)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 Página visible nuevamente, recargando mesas y productos...');
        // fromRealtime=true para saltar el guard de mesasInicialCargadas
        // (la protección de 3s no aplica si no hubo cambio reciente del usuario)
        cargarMesasRef.current(true);
        cargarProductosTemporales();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: desuscribir al desmontar y limpiar timeouts
    return () => {
      if (realtimeTimeoutRef.current) {
        clearTimeout(realtimeTimeoutRef.current);
      }
      if (realtimeMesasTimeoutRef.current) {
        clearTimeout(realtimeMesasTimeoutRef.current);
      }
      supabase.removeChannel(channelProductos);
      supabase.removeChannel(channelMesas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Función para cargar notificaciones de pedidos terminados desde Supabase
  const cargarNotificacionesPedidosTerminados = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        return;
      }

      const { data, error } = await supabase
        .from('notificaciones_pedidos_terminados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error al cargar notificaciones:', error);
        return;
      }

      setNotificacionesPedidosTerminados(data || []);
    } catch (error) {
      console.error('❌ Error inesperado al cargar notificaciones:', error);
    }
  };

  // Función para eliminar una notificación
  const eliminarNotificacion = async (notificacionId) => {
    // Actualizar UI inmediatamente sin esperar a Supabase
    setNotificacionesPedidosTerminados(prev => prev.filter(n => n.id !== notificacionId));

    try {
      const { error } = await supabase
        .from('notificaciones_pedidos_terminados')
        .delete()
        .eq('id', notificacionId);

      if (error) {
        console.error('❌ Error al eliminar notificación:', error);
      }
    } catch (error) {
      console.error('❌ Error inesperado al eliminar notificación:', error);
    }
  };

  // Función para reproducir sonido de alarma cuando llega una notificación de pedido terminado
  // Con debounce para evitar múltiples sonidos simultáneos cuando hay varias notificaciones juntas
  const playAlarmSoundPedidos = useCallback(() => {
    try {
      // Verificar si los sonidos están habilitados
      const soundsPref = localStorage.getItem('soundsEnabled');
      if (soundsPref === 'false') return;

      // Verificar que la página esté visible
      if (document.visibilityState !== 'visible') {
        return;
      }

      // Debounce: Solo reproducir si pasaron al menos 2 segundos desde el último sonido
      const ahora = Date.now();
      const tiempoDesdeUltimoSonido = ahora - ultimaVezSonidoRef.current;
      const DEBOUNCE_TIEMPO = 2000;

      if (tiempoDesdeUltimoSonido < DEBOUNCE_TIEMPO) {
        return;
      }
      
      // Actualizar la última vez que se reprodujo el sonido
      ultimaVezSonidoRef.current = ahora;

      // Usar HTML5 Audio con archivo de sonido
      const audio = new Audio('/sounds/alarma-pedidos.wav');
      audio.volume = 0.7; // 70% de volumen (ajustable según necesidad)
      
      // Reproducir el sonido
      audio.play().catch(error => {
        // Si falla (permisos del navegador, archivo no encontrado, etc.)
        console.warn('No se pudo reproducir el sonido de alarma de pedidos:', error);
        
        if (error.name === 'NotAllowedError') {
          console.info('Permisos de audio bloqueados. El usuario debe interactuar primero con la página.');
        } else if (error.name === 'NotSupportedError' || error.code === 4) {
          console.info('Archivo de sonido no encontrado. Por favor, verifica que alarma-pedidos.wav esté en public/sounds/');
        }
      });
      
    } catch (error) {
      // Silenciar errores de audio (navegador no soporta, etc.)
      console.warn('Error al reproducir sonido de alarma de pedidos:', error);
    }
  }, []);

  // Cargar notificaciones y configurar Realtime (separado del useEffect anterior)
  useEffect(() => {
    cargarNotificacionesPedidosTerminados();

    // Configurar suscripción Realtime para notificaciones
    const channelNotificaciones = supabase
      .channel('notificaciones_pedidos_terminados_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notificaciones_pedidos_terminados'
        },
        (payload) => {
          // Reproducir sonido solo cuando llega una nueva notificación (INSERT)
          if (payload.eventType === 'INSERT') {
            playAlarmSoundPedidos();
          }

          // Recargar notificaciones cuando hay cambios
          cargarNotificacionesPedidosTerminados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelNotificaciones);
    };
  }, []);

  // Guardar productos en localStorage cuando cambien (solo después de cargar datos iniciales)
  // Usar debounce implícito con timeout para no bloquear la UI
  useEffect(() => {
    if (datosInicialCargados) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('productosPorMesa', JSON.stringify(productosPorMesa));
      }, 100); // Pequeño delay para no bloquear
      
      return () => clearTimeout(timeoutId);
    }
  }, [productosPorMesa, datosInicialCargados]);

  // Guardar selectores de cocina en localStorage cuando cambien
  // Usar debounce implícito con timeout para no bloquear la UI
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('productosSeleccionadosParaCocina', JSON.stringify(productosSeleccionadosParaCocina));
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [productosSeleccionadosParaCocina]);

  // Las mesas ahora se sincronizan con Supabase, no necesitamos guardar en localStorage
  // El localStorage solo se usa como cache secundario en las funciones individuales

  // Aplicar filtros cuando cambien los valores de filtro O los pedidos registrados
  useEffect(() => {
    // Actualizar estado con valores memoizados (evita recálculos innecesarios)
    setPedidosFiltrados(pedidosFiltradosMemo);
    setAniosDisponibles(aniosDisponiblesMemo);
    setEstadisticasPedidos(estadisticasPedidosMemo);
  }, [pedidosFiltradosMemo, aniosDisponiblesMemo, estadisticasPedidosMemo]);

  // Escuchar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      const estaEnFullscreen = !!document.fullscreenElement;
      const estadoAnterior = pantallaCompleta;
      
      // Sincronizar el estado con el estado real de fullscreen
      setPantallaCompleta(estaEnFullscreen);
      
      // Si estamos en un dispositivo táctil y se salió automáticamente de fullscreen 
      // (no fue por acción del usuario), mostrar notificación
      if (esDispositivoTactil() && estadoAnterior && !estaEnFullscreen) {
        setNotificacionTactil(false); // Ocultar notificación anterior si existe
        setTimeout(() => {
          setNotificacionTactil(true);
          setTimeout(() => setNotificacionTactil(false), 4000);
        }, 500);
      }
    };

    // Agregar el listener para cambios de fullscreen
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Cleanup: remover el listener cuando el componente se desmonte
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [pantallaCompleta]);

  // Re-filtrar productos cuando se cargan los productos del inventario si hay una búsqueda activa
  // Esto soluciona el problema cuando el usuario escribe antes de que se carguen los productos
  useEffect(() => {
    // Si hay productos cargados Y hay una búsqueda guardada, re-filtrar automáticamente
    if (productosInventario.length > 0 && ultimaBusquedaRef.current.trim()) {
      filtrarProductos(ultimaBusquedaRef.current);
      setMostrarDropdown(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productosInventario.length]);


  // Cerrar dropdown al hacer clic fuera (soporte para móviles y desktop)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mostrarDropdown && searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        // Verificar si el clic fue en el dropdown
        const dropdown = document.querySelector('[data-dropdown-productos]');
        if (dropdown && !dropdown.contains(event.target)) {
          setMostrarDropdown(false);
        }
      }
    };

    // Escuchar tanto eventos de mouse como táctiles para mejor compatibilidad móvil
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mostrarDropdown]);

  // Opciones de unidad
  const opcionesUnidad = [
    { value: 'unidad', label: 'Unidad', icon: '📦' },
    { value: 'kg', label: 'Kilogramo', icon: '⚖️' },
  ];

  return (
    <div className={`${pantallaCompleta ? 'fixed inset-0 z-50 bg-black' : 'min-h-screen relative overflow-hidden'}`} style={{ backgroundColor: pantallaCompleta ? '#000000' : '#1a3d1a' }}>
      {/* Notificación para dispositivos táctiles */}
      {notificacionTactil && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-orange-600/95 backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-lg border border-orange-400/30 max-w-sm text-center animate-bounce">
          <div className="flex items-center gap-2">
            <span>📱</span>
            <div className="text-sm">
              <div className="font-semibold">{obtenerInfoDispositivo().navegador} en {obtenerInfoDispositivo().tipo}</div>
              <div className="text-xs opacity-90">La pantalla completa puede cerrarse al usar campos de texto</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Notificaciones tipo banda de pedidos terminados desde cocina */}
      {notificacionesPedidosTerminados.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[70] bg-green-600/95 backdrop-blur-md border-b-2 border-green-400/50 animate-slide-down py-1.5">
          <div 
            className="overflow-x-auto"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.2) transparent',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex gap-2 px-2" style={{ minWidth: 'max-content' }}>
              {notificacionesPedidosTerminados.map((notificacion) => (
                <div 
                  key={notificacion.id}
                  className="flex items-center gap-1.5 bg-green-800/90 rounded-md px-2.5 py-1.5 flex-shrink-0 border border-green-300/40"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <div className="text-sm animate-pulse">✅</div>
                  <span className="font-bold text-xs text-white">
                    {notificacion.mesa}:
                  </span>
                  {notificacion.productos && notificacion.productos.length > 0 && (
                    <span className="text-xs text-green-100">
                      {notificacion.productos.map((item, index) => (
                        <span key={index}>
                          {item.producto}
                          <span className="font-bold text-yellow-200 mx-0.5">x{item.cantidad}</span>
                          {index < notificacion.productos.length - 1 && <span className="mx-1 text-green-300">•</span>}
                        </span>
                      ))}
                    </span>
                  )}
                  <button
                    onClick={() => eliminarNotificacion(notificacion.id)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 font-bold text-xs ml-0.5"
                    aria-label="Cerrar notificación"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Fondo degradado moderno */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          background: `
            linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
            radial-gradient(circle at 20% 80%, rgba(45, 74, 39, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `
        }}
      />

      {/* Efecto de vidrio esmerilado adicional */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/5"></div>

      {/* Contenido principal */}
      <div className={`${pantallaCompleta ? 'h-full overflow-y-auto' : 'relative z-10 p-3 sm:p-4 md:p-8'}`}>
        <div className={`${pantallaCompleta ? 'h-full px-3 sm:px-4 py-4' : 'max-w-7xl mx-auto'}`}>
          {/* Botón de regreso */}
          {!pantallaCompleta && (
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
          )}

          {/* Header con título y botón pantalla completa */}
          <div className="text-center mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Sistema de Pedidos
                </h1>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={togglePantallaCompleta}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                  title={pantallaCompleta ? "Salir de pantalla completa (ESC)" : "Pantalla completa"}
                >
                  {pantallaCompleta ? (
                    <span className="flex items-center gap-2">
                      <span>⛶</span>
                      <span className="hidden md:inline">Salir</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>⛶</span>
                      <span className="hidden md:inline">Pantalla Completa</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Formulario de Pedido */}
          <div className="relative z-40 p-2 md:p-3 mb-3">
            {/* Título con Fecha */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-4">
              {/* Fecha clickeable */}
              <div className="relative group">
                <button
                  onClick={() => document.getElementById('fecha-pedido-hidden').showPicker?.()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 hover:border-green-400/50 transition-all text-white text-sm cursor-pointer"
                  title="Clic para cambiar fecha"
                >
                  <span>📅</span>
                  <span className="font-medium">{formatearFechaCortaChile(pedido.fecha)}</span>
                </button>
                <input
                  id="fecha-pedido-hidden"
                  type="date"
                  name="fecha"
                  value={pedido.fecha}
                  onChange={handleChange}
                  className="absolute opacity-0 pointer-events-none"
                />
              </div>
              
              {/* Título */}
              <h2 className="text-xl md:text-2xl font-bold text-green-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Nuevo Pedido
              </h2>
            </div>

            {/* Búsqueda de Producto y Controles en una línea */}
            <div className="mb-4">
              {/* Label con botón de escanear */}
              <div className="flex items-center gap-2 mb-2">
                <label className="text-white font-medium text-sm">Buscar Producto</label>
                <button
                  type="button"
                  onClick={() => setMostrarScannerPedidos(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-xs"
                  title="Escanear código de barras"
                >
                  <span>📷</span>
                  <span>Escanear</span>
                </button>
              </div>
              
              {/* Input, Cantidad y Botón Agregar en una línea */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end relative">
                {/* Input de búsqueda */}
                <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    value={busquedaProducto}
                    onChange={handleBusquedaProducto}
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                    placeholder="🔍 Escribe el nombre del producto..."
                  />
                  
                  {/* Dropdown de productos filtrados */}
                  {mostrarDropdown && productosFiltrados.length > 0 && (
                    <div
                      data-dropdown-productos
                      className="absolute left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-md border-2 border-blue-400/60 rounded-xl sm:rounded-2xl shadow-2xl max-h-[200px] sm:max-h-80 overflow-y-auto z-50 w-full"
                    >
                      {productosFiltrados.map((producto, index) => (
                        <div
                          key={producto.id || index}
                          onClick={() => seleccionarProducto(producto)}
                          onTouchStart={(e) => {
                            e.currentTarget._touchStartY = e.touches[0].clientY;
                          }}
                          onTouchEnd={(e) => {
                            const deltaY = Math.abs(e.changedTouches[0].clientY - (e.currentTarget._touchStartY || 0));
                            if (deltaY < 10) {
                              e.preventDefault();
                              seleccionarProducto(producto);
                            }
                          }}
                          className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-blue-600/30 active:bg-blue-600/50 cursor-pointer border-b border-white/10 last:border-b-0 transition-all duration-200 touch-manipulation"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold text-sm sm:text-lg mb-1 truncate">{producto.producto}</div>
                              <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                                <span className="text-green-300 font-medium">
                                  ${parseFloat(producto.precio_venta).toLocaleString()}
                                </span>
                                <span className="text-blue-300 font-medium">
                                  {producto.unidad}
                                </span>
                              </div>
                            </div>
                            <div className="text-blue-400 text-lg sm:text-xl ml-2">→</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Control de Cantidad y Botón Agregar juntos en móvil */}
                <div className="flex gap-2 items-center">
                  {/* Control de Cantidad */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const nuevaCantidad = Math.max(0, (parseInt(productoActual.cantidad) || 0) - 1);
                        handleChange({ target: { name: 'cantidad', value: nuevaCantidad.toString() } });
                      }}
                      className="px-2 py-2 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors text-xs sm:text-sm font-bold min-w-[28px] sm:min-w-[32px]"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      name="cantidad"
                      value={productoActual.cantidad}
                      onChange={handleChange}
                      onWheel={(e) => e.target.blur()}
                      readOnly
                      className="w-10 sm:w-12 px-1 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-xs sm:text-sm text-center"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nuevaCantidad = (parseInt(productoActual.cantidad) || 0) + 1;
                        handleChange({ target: { name: 'cantidad', value: nuevaCantidad.toString() } });
                      }}
                      className="px-2 py-2 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors text-xs sm:text-sm font-bold min-w-[28px] sm:min-w-[32px]"
                    >
                      +
                    </button>
                  </div>

                  {/* Botón Agregar */}
                  <button
                    onClick={agregarProductoAMesa}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm whitespace-nowrap"
                  >
                    ➕ Agregar
                  </button>
                </div>
              </div>
            </div>


          </div>

          {/* Sección de Gestión de Mesas y Productos */}
          <section className="relative z-10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-3 sm:p-4 md:p-8 border border-white/20">
            
            {/* Gestión de Mesas */}
            <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base sm:text-lg font-bold text-green-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    🪑 Gestión de Mesas
                  </h2>
                  
                  {/* Botón de bloqueo/desbloqueo */}
                  <button
                    onClick={() => {
                      const nuevoEstado = !mesasBloqueadas;
                      setMesasBloqueadas(nuevoEstado);
                      localStorage.setItem('mesasBloqueadas', nuevoEstado.toString());
                      mostrarToast(
                        nuevoEstado 
                          ? '🔒 Pestañas bloqueadas - No se pueden mover' 
                          : '🔓 Pestañas desbloqueadas - Puedes reorganizarlas',
                        'success',
                        2000
                      );
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium ${
                      mesasBloqueadas
                        ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30'
                        : 'bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30'
                    }`}
                    title={mesasBloqueadas ? 'Clic para desbloquear y reorganizar pestañas' : 'Clic para bloquear pestañas'}
                  >
                    <span className="text-base">{mesasBloqueadas ? '🔒' : '🔓'}</span>
                    <span className="hidden sm:inline">{mesasBloqueadas ? 'Bloqueado' : 'Desbloqueado'}</span>
                  </button>
                </div>
                
                {/* Pestañas de Mesas con botón + */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center gap-1">
                    <div className="flex overflow-x-auto gap-1 pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent flex-1" style={{ scrollbarWidth: 'thin' }}>
                    {mesas.map((mesa, indice) => (
                      <div
                        key={mesa}
                        data-mesa-indice={indice}
                        onMouseDown={(e) => iniciarArrastre(e, mesa, indice)}
                        onTouchStart={(e) => iniciarArrastre(e, mesa, indice)}
                        className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium transition-all duration-200 text-xs whitespace-nowrap flex-shrink-0 border-b-2 ${
                          mesaSeleccionada === mesa
                            ? 'bg-white/20 text-white border-green-400 shadow-md'
                            : 'bg-white/5 text-white/80 hover:bg-white/10 border-transparent'
                        } ${
                          mesasBloqueadas
                            ? 'cursor-default'
                            : mesaArrastrando === mesa
                            ? esArrastrando
                              ? 'opacity-50 cursor-grabbing z-50'
                              : 'cursor-grabbing z-50'
                            : mesaEditando !== mesa
                            ? 'cursor-grab active:cursor-grabbing'
                            : ''
                        }`}
                        style={
                          mesaArrastrando === mesa
                            ? {
                                transform: `translate(${posicionActual.x - posicionInicialRef.current.x}px, ${posicionActual.y - posicionInicialRef.current.y}px)`,
                                position: 'relative',
                                zIndex: 50
                              }
                            : {}
                        }
                      >
                        {mesaEditando === mesa ? (
                          // Modo edición
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={nombreMesaTemporal}
                              onChange={(e) => setNombreMesaTemporal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  guardarNombreMesa(mesa);
                                } else if (e.key === 'Escape') {
                                  cancelarEdicionNombreMesa();
                                }
                              }}
                              autoFocus
                              className="px-2 py-1 rounded text-sm bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-green-400"
                              style={{ width: '150px' }}
                            />
                            <button
                              onClick={() => guardarNombreMesa(mesa)}
                              className="text-green-300 hover:text-green-200 text-sm"
                              title="Guardar (Enter)"
                            >
                              ✅
                            </button>
                            {/* Botón de eliminar mesa - solo visible en modo edición */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // 🛡️ Confirmación doble para evitar eliminaciones accidentales
                                if (confirm(`¿Eliminar "${mesa}" y todos sus productos?\n\nEsta acción no se puede deshacer.`)) {
                                  eliminarMesa(mesa);
                                }
                              }}
                              className="text-red-400 hover:text-red-300 text-sm hover:scale-110 transition-all duration-200"
                              title="Eliminar mesa"
                            >
                              🗑️
                            </button>
                          </div>
                        ) : (
                          // Modo visualización
                          <>
                            <button
                              onClick={(e) => {
                                // No seleccionar si se está arrastrando
                                if (esArrastrando && mesaArrastrando === mesa) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return;
                                }
                                setMesaSeleccionada(mesa);
                                setPedido(prev => ({ ...prev, tipo_pago: '' }));
                              }}
                              className="flex-1 text-left"
                            >
                              {mesa}
                            </button>
                            
                            {/* Botón de editar nombre */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                iniciarEdicionNombreMesa(mesa);
                              }}
                              className={`text-sm hover:scale-110 transition-all duration-200 ${
                                mesaSeleccionada === mesa
                                  ? 'text-blue-300 hover:text-blue-200'
                                  : 'text-blue-400 hover:text-blue-300'
                              }`}
                              title="Editar nombre de mesa"
                            >
                              ✏️
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* Botón para agregar nueva mesa */}
                    <button
                      onClick={async () => {
                        // 🛡️ Marcar timestamp del cambio para protección contra Realtime
                        ultimoCambioMesasRef.current = Date.now();
                        
                        const nuevaMesa = `Mesa ${mesas.length + 1}`;
                        const mesasActualizadas = [...mesas, nuevaMesa];
                        setMesas(mesasActualizadas);
                        
                        // Guardar en localStorage PRIMERO (backup instantáneo)
                        localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));
                        
                        // Guardar en Supabase usando la función existente
                        await guardarMesasEnSupabase([nuevaMesa]);
                        
                        debugLog('✅ Nueva mesa agregada:', nuevaMesa);
                      }}
                      className="flex items-center justify-center px-3 py-1.5 rounded-t-lg font-medium transition-all duration-200 text-xs whitespace-nowrap flex-shrink-0 border-b-2 border-transparent bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-blue-200"
                      title="Agregar nueva mesa"
                    >
                      ➕
                    </button>
                  </div>
                  </div>
                </div>

                {/* Contenido de la Mesa Seleccionada */}
                {mesaSeleccionada && (
                  <div className="p-3 sm:p-4 border-t border-white/10">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                      🪑 {mesaSeleccionada}
                    </h3>
                    
                    {(!productosPorMesa[mesaSeleccionada] || productosPorMesa[mesaSeleccionada].length === 0) ? (
                      <p className="text-gray-400 text-center py-6">No hay productos en esta mesa</p>
                    ) : (
                      <div className="space-y-4">
                    {/* Encabezados de columnas */}
                    <div className="hidden sm:flex flex-row items-center py-2 px-2">
                      <div className="flex-1">
                        <p className="text-orange-300 text-base font-medium text-center">🍳 Envíos a Cocina</p>
                      </div>
                      <div className="hidden sm:block w-px bg-white/20 mx-3 sm:mx-4 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-green-300 text-base font-medium text-center">💰 Centro de Pago</p>
                      </div>
                    </div>
                    {/* Lista de productos de la mesa */}
                    <div className="space-y-2">
                      {productosPorMesa[mesaSeleccionada].map((producto) => {
                        const estaSeleccionadoCocina = (productosSeleccionadosParaCocina[mesaSeleccionada] || []).includes(producto.id);
                        const estaSeleccionadoPago = (productosSeleccionadosParaPago[mesaSeleccionada] || []).includes(producto.id);
                        
                        return (
                          <div 
                            key={producto.id} 
                            className="flex flex-col sm:flex-row sm:items-center py-1 sm:py-1.5 px-2 gap-1.5 transition-all duration-200 border-b border-white/30"
                          >
                            {/* Checkbox para Cocina y contenido principal */}
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={estaSeleccionadoCocina}
                                onChange={() => toggleSeleccionProductoCocina(mesaSeleccionada, producto.id)}
                                className="w-5 h-5 sm:w-6 sm:h-6 lg:w-4 lg:h-4 mt-1 text-orange-600 bg-white/10 border-orange-400 rounded focus:ring-orange-500 focus:ring-1 cursor-pointer flex-shrink-0"
                                title="Enviar a cocina"
                              />
                              
                              <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-white font-medium text-sm">{producto.producto}</p>
                                        <p className="text-gray-300 text-xs">
                                          {producto.cantidad} {producto.unidad} - ${parseFloat(producto.precio_unitario).toLocaleString()}
                                        </p>
                                      </div>
                                  {/* Campo de comentarios */}
                                  <input
                                    type="text"
                                    value={producto.comentarios || ''}
                                    onFocus={(e) => {
                                      // 🛡️ Registrar que este comentario está siendo editado
                                      comentariosEnEdicionRef.current[producto.id] = e.target.value.toUpperCase();
                                    }}
                                    onChange={(e) => actualizarComentariosProducto(mesaSeleccionada, producto.id, e.target.value)}
                                    onBlur={(e) => {
                                      // Guardar en Supabase solo cuando termina de escribir (sincronización multi-dispositivo)
                                      const comentariosUpper = e.target.value.toUpperCase();
                                      guardarComentariosEnSupabase(producto.id, comentariosUpper);
                                    }}
                                    className="w-full px-2 py-0.5 rounded-none bg-transparent text-white placeholder-gray-400 focus:outline-none border-0 border-b border-white/30 focus:border-green-400 text-xs sm:text-sm"
                                    placeholder="Comentarios..."
                                    style={{ textTransform: 'uppercase' }}
                                  />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Línea divisoria visual centrada */}
                            <div className="hidden sm:block w-px bg-white/20 mx-2 sm:mx-3 self-stretch flex-shrink-0"></div>
                            
                            {/* Checkbox para Pago y valores */}
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-1 sm:flex-shrink-0">
                              {/* Checkbox para Pago */}
                              <input
                                type="checkbox"
                                checked={estaSeleccionadoPago}
                                onChange={() => toggleSeleccionProductoPago(mesaSeleccionada, producto.id)}
                                className="w-5 h-5 sm:w-6 sm:h-6 lg:w-4 lg:h-4 text-green-600 bg-white/10 border-green-400 rounded focus:ring-green-500 focus:ring-1 cursor-pointer"
                                title="Seleccionar para pago"
                              />
                              <span className="text-green-400 font-bold text-sm whitespace-nowrap">
                                ${parseFloat(producto.subtotal).toLocaleString()}
                              </span>
                              <button
                                onClick={() => eliminarProducto(mesaSeleccionada, producto.id)}
                                className="text-red-400 hover:text-red-300 text-xl sm:text-2xl lg:text-lg font-bold"
                                title="Eliminar producto"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Controles de selección para cocina y pago - Layout horizontal */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {/* Tarjeta Cocina - Izquierda */}
                      <div className="bg-orange-500/10 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-orange-400/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-orange-300 text-xs sm:text-sm font-medium">🍳 <span className="hidden xs:inline">Seleccionar para </span>Cocina:</span>
                            <span className="text-orange-200 text-xs">
                              ({(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length}/{productosPorMesa[mesaSeleccionada].length})
                            </span>
                            <span className="text-gray-400 text-xs italic">Selecciona para enviar a cocina</span>
                          </div>
                          <button
                            onClick={() => enviarACocina(mesaSeleccionada)}
                            disabled={enviandoACocina || (productosSeleccionadosParaCocina[mesaSeleccionada] || []).length === 0}
                            className={`text-xs font-medium px-3 py-1 rounded-lg transition-all duration-200 ${
                              enviandoACocina || (productosSeleccionadosParaCocina[mesaSeleccionada] || []).length === 0
                                ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                : 'bg-orange-600 hover:bg-orange-700 text-white'
                            }`}
                          >
                            {enviandoACocina 
                              ? '⏳ Enviando...' 
                              : `🍳 Enviar ${(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length > 0 
                                  ? `(${(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length})` 
                                  : ''}`
                            }
                          </button>
                        </div>
                        
                        {/* Lista de productos enviados a cocina (informativa) */}
                        {(productosEnviadosACocina[mesaSeleccionada] || []).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-orange-400/20">
                            <div className="text-orange-300 text-xs font-semibold mb-1">✅ Enviados a cocina:</div>
                            <div className="space-y-1 max-h-24 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                              {productosEnviadosACocina[mesaSeleccionada].map((producto, index) => (
                                <div key={index} className="text-xs text-orange-200/80 flex items-center gap-1">
                                  <span>•</span>
                                  <span className="truncate">{producto.producto}</span>
                                  <span className="text-orange-300 font-semibold">x{producto.cantidad}</span>
                                  {producto.unidad && <span className="text-orange-200/60">{producto.unidad}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tarjeta Pago - Derecha */}
                      <div className="bg-green-500/10 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-green-400/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-green-300 text-xs sm:text-sm font-medium">💰 Dividir Pago:</span>
                            <span className="text-green-200 text-xs">
                              ({(productosSeleccionadosParaPago[mesaSeleccionada] || []).length}/{productosPorMesa[mesaSeleccionada].length})
                            </span>
                            <span className="text-gray-400 text-xs italic">Selecciona para dividir la cuenta</span>
                          </div>
                          <button
                            onClick={() => toggleSeleccionarTodosParaPago(mesaSeleccionada)}
                            className="text-green-300 hover:text-green-200 text-xs font-medium underline whitespace-nowrap"
                          >
                            {(productosSeleccionadosParaPago[mesaSeleccionada] || []).length === productosPorMesa[mesaSeleccionada].length
                              ? '❌ Deseleccionar'
                              : '💰 Pagar Todo'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Resumen de la mesa */}
                    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/30">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-1">
                        <div className="text-white text-xs sm:text-sm">
                          <span className="font-medium">
                            {((productosSeleccionadosParaPago[mesaSeleccionada] || []).length > 0 
                              ? `Seleccionados: ${(productosSeleccionadosParaPago[mesaSeleccionada] || []).length}/${productosPorMesa[mesaSeleccionada].length}`
                              : `Total: ${productosPorMesa[mesaSeleccionada].length} productos`)}
                          </span>
                        </div>
                        <div className="text-green-400 font-bold text-base sm:text-lg">
                          Subtotal: ${calcularTotalMesa(mesaSeleccionada).toLocaleString()}
                        </div>
                      </div>
                       
                       {/* Campo de Propina */}
                       <div className="flex items-center justify-between mb-1 p-1 bg-transparent rounded-lg border-0">
                         <div className="flex items-center gap-3">
                           <input
                             type="checkbox"
                             checked={propinaActiva}
                             onChange={(e) => {
                               setPropinaActiva(e.target.checked);
                               if (!e.target.checked) setPropinaManual(null);
                             }}
                             className="w-4 h-4 text-green-600 bg-white/10 border-white/20 rounded focus:ring-green-500 focus:ring-2"
                           />
                           <span className="text-white text-sm font-medium">💡 Propina</span>
                         </div>

                         {propinaActiva && (
                           <div className="flex items-center gap-2">
                             <input
                               type="number"
                               min="0"
                               max="50"
                               value={porcentajePropina}
                               onChange={(e) => {
                                 setPorcentajePropina(parseFloat(e.target.value) || 0);
                                 setPropinaManual(null); // al cambiar %, volver al cálculo automático
                               }}
                               onWheel={(e) => e.target.blur()}
                               disabled={propinaManual !== null}
                               className={`w-16 px-2 py-1 rounded border text-center text-xs transition-opacity ${propinaManual !== null ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40' : 'border-white/20 bg-white/10 text-white'}`}
                             />
                             <span className="text-white text-xs">%</span>
                             <input
                               type="number"
                               min="0"
                               value={propinaManual !== null ? propinaManual : Math.round(calcularPropina(mesaSeleccionada))}
                               onChange={(e) => { const v = parseFloat(e.target.value); setPropinaManual(isNaN(v) ? null : v); }}
                               onWheel={(e) => e.target.blur()}
                               className="w-24 px-2 py-1 rounded border border-yellow-400/40 bg-yellow-400/10 text-yellow-400 text-center text-xs font-medium"
                               title="Edita para ingresar monto fijo. Borra el valor para volver al modo porcentaje"
                             />
                           </div>
                         )}
                       </div>
                       
                       {/* Total Final */}
                       <div className="flex justify-end items-center gap-2 pt-3 border-t border-white/20">
                         <span className="text-white font-medium">Total Mesa:</span>
                         <div className="text-green-400 font-bold text-lg">
                           ${calcularTotalConPropina(mesaSeleccionada).toLocaleString()}
                         </div>
                       </div>
                      
                      {/* Calculadora de Vuelto (solo para Efectivo) */}
                      {pedido.tipo_pago === 'efectivo' && productosPorMesa[mesaSeleccionada] && productosPorMesa[mesaSeleccionada].length > 0 && calcularTotalConPropina(mesaSeleccionada) > 0 && (
                        <div className="mt-4 mb-4 bg-blue-500/20 backdrop-blur-sm rounded-xl p-2 md:p-3 lg:p-4 border border-blue-400/30">
                          <h4 className="text-blue-200 font-semibold mb-2 md:mb-3 text-sm md:text-base flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🧮</span>
                              <span>Calculadora de Vuelto</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCalculadoraColapsada(!calculadoraColapsada)}
                              className="text-blue-300 hover:text-blue-100 transition-colors duration-200 p-1 rounded hover:bg-blue-400/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              title={calculadoraColapsada ? "Expandir calculadora" : "Colapsar calculadora"}
                            >
                              {calculadoraColapsada ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </button>
                          </h4>
                          
                          <div className={`space-y-2 md:space-y-3 overflow-hidden transition-all duration-300 ease-in-out ${
                            calculadoraColapsada ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
                          }`}>
                            {/* Primera fila: Total de la venta, Caja Inicial y Monto pagado */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                              {/* Total de la venta (solo lectura) */}
                              <div>
                                <label className="block text-blue-100 text-xs md:text-sm mb-1.5">
                                  Total de la venta:
                                </label>
                                <div className="bg-white/10 border border-blue-400/50 rounded-lg p-2 md:p-3 text-center flex items-center justify-center">
                                  <p className="text-blue-300 text-lg md:text-xl lg:text-2xl font-bold">
                                    ${calcularTotalConPropina(mesaSeleccionada).toLocaleString('es-CL')}
                                  </p>
                                </div>
                              </div>

                              {/* Caja Inicial */}
                              <div>
                                <label className="block text-blue-100 text-xs md:text-sm mb-1.5">
                                  Caja Inicial:
                                </label>
                                <input
                                  type="number"
                                  value={cajaInicial}
                                  onChange={(e) => {
                                    const valor = e.target.value;
                                    setCajaInicial(valor);
                                    // Guardar en localStorage con la fecha actual
                                    const fechaActual = obtenerFechaHoyChile();
                                    localStorage.setItem('cajaInicial', valor);
                                    localStorage.setItem('cajaInicialFecha', fechaActual);
                                  }}
                                  onWheel={(e) => e.target.blur()}
                                  placeholder="Ej: 20000"
                                  step="100"
                                  min="0"
                                  className="w-full p-2 md:p-3 bg-white/10 border border-blue-400/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                                />
                              </div>

                              {/* Monto pagado por el cliente */}
                              <div>
                                <label className="block text-blue-100 text-xs md:text-sm mb-1.5">
                                  Monto pagado por el cliente:
                                </label>
                                <input
                                  type="number"
                                  value={montoPagado}
                                  onChange={(e) => {
                                    setMontoPagado(e.target.value);
                                    setMostrarVuelto(e.target.value !== '');
                                  }}
                                  onWheel={(e) => e.target.blur()}
                                  placeholder="Ingresa el monto recibido"
                                  step="100"
                                  min="0"
                                  className="w-full p-2 md:p-3 bg-white/10 border border-blue-400/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                                />
                              </div>
                            </div>

                            {/* Segunda fila: Acumulado, Total en Caja y Vuelto */}
                            <div className={`grid grid-cols-1 gap-2 md:gap-3 ${mostrarVuelto && montoPagado ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                              {/* Acumulado del Día */}
                              <div>
                                <label className="block text-blue-100 text-xs md:text-sm mb-1.5">
                                  Acumulado del Día:
                                </label>
                                <div className="bg-white/10 border border-green-400/50 rounded-lg p-2 md:p-3 text-center flex items-center justify-center">
                                  <p className="text-green-300 text-lg md:text-xl lg:text-2xl font-bold">
                                    ${calcularAcumuladoReal().toLocaleString('es-CL')}
                                  </p>
                                </div>
                              </div>

                              {/* Total en Caja */}
                              <div>
                                <label className="block text-blue-100 text-xs md:text-sm mb-1.5">
                                  Total en Caja:
                                </label>
                                <div className="bg-white/10 border border-blue-400/50 rounded-lg p-2 md:p-3 text-center flex items-center justify-center">
                                  <p className="text-blue-300 text-lg md:text-xl lg:text-2xl font-bold">
                                    ${calcularTotalCaja().toLocaleString('es-CL')}
                                  </p>
                                </div>
                              </div>

                              {/* Vuelto a entregar (solo si hay monto pagado) */}
                              {mostrarVuelto && montoPagado && (
                                <div>
                                  <label className="block text-blue-100 text-xs md:text-sm mb-1.5">
                                    Vuelto a entregar:
                                  </label>
                                  <div className={`${calcularVuelto() >= 0 ? 'bg-green-500/20 border-green-400/50' : 'bg-red-500/20 border-red-400/50'} border rounded-lg p-2 md:p-3 text-center flex items-center justify-center flex-col`}>
                                    <p className={`${calcularVuelto() >= 0 ? 'text-green-300' : 'text-red-300'} text-lg md:text-xl lg:text-2xl font-bold`}>
                                      {calcularVuelto() >= 0 ? (
                                        `$${calcularVuelto().toLocaleString('es-CL')}`
                                      ) : (
                                        `Falta: $${Math.abs(calcularVuelto()).toLocaleString('es-CL')}`
                                      )}
                                    </p>
                                    {calcularVuelto() < 0 && (
                                      <p className="text-red-200 text-xs mt-1">
                                        ⚠️ Insuficiente
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Tipo de Pago - Solo visible cuando hay productos */}
                      <div className="mt-4 pt-3 border-t border-white/20">
                        <h4 className="text-white font-medium mb-3 text-center">💳 Método de Pago</h4>
                                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPedido({...pedido, tipo_pago: 'efectivo'});
                              // No limpiar campos de vuelto al seleccionar efectivo
                            }}
                            className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                              pedido.tipo_pago === 'efectivo' 
                                ? 'bg-green-600 border-green-500 text-white' 
                                : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-green-400 text-base mb-1">💵</div>
                              <p className="font-medium text-xs">Efectivo</p>
                            </div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setPedido({...pedido, tipo_pago: 'debito'});
                              // Limpiar campos de vuelto al cambiar a débito
                              setMontoPagado('');
                              setMostrarVuelto(false);
                            }}
                            className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                              pedido.tipo_pago === 'debito' 
                                ? 'bg-green-600 border-green-500 text-white' 
                                : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-blue-400 text-base mb-1">💳</div>
                              <p className="font-medium text-xs">Débito</p>
                            </div>
                          </button>
                          
                          
                          
                          <button
                            type="button"
                            onClick={() => {
                              setPedido({...pedido, tipo_pago: 'transferencia'});
                              // Limpiar campos de vuelto al cambiar a transferencia
                              setMontoPagado('');
                              setMostrarVuelto(false);
                            }}
                            className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                              pedido.tipo_pago === 'transferencia' 
                                ? 'bg-green-600 border-green-500 text-white' 
                                : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-purple-400 text-base mb-1">📱</div>
                              <p className="font-medium text-xs">Transferencia</p>
                            </div>
                          </button>
                          
                          {/* Botón Registrar Pago */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!registrandoPedido && !registrandoPedidoRef.current) {
                                registrarPedido(mesaSeleccionada);
                              }
                            }}
                            disabled={(productosSeleccionadosParaPago[mesaSeleccionada] || []).length === 0 || registrandoPedido || !pedido.tipo_pago}
                            className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                              (productosSeleccionadosParaPago[mesaSeleccionada] || []).length === 0 || registrandoPedido || !pedido.tipo_pago
                                ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 border-green-500 text-white hover:bg-green-700'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-base mb-1">💳</div>
                              <p className="font-medium text-xs">
                                {registrandoPedido 
                                  ? '⏳ Registrando...' 
                                  : `Registrar Pago ${((productosSeleccionadosParaPago[mesaSeleccionada] || []).length > 0 
                                      ? `(${(productosSeleccionadosParaPago[mesaSeleccionada] || []).length})` 
                                      : '')}`
                                }
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
                )}
              </>

           </div>
          </section>

           {/* Tabla de Pedidos Registrados */}
           <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mt-6">
                           <div className="mb-6">
               <h2 className="text-xl md:text-2xl font-bold text-green-400 text-center mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Pedidos Registrados
                </h2>
                
                {/* Filtros */}
                <div className="mb-4">
                  <h3 className="text-green-400 font-medium mb-3">Filtros</h3>
                  
                  {/* Filtros Estándar */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                     {/* Filtro por Fecha Específica */}
                     <div>
                      <label className="block text-white text-xs mb-1">Fecha</label>
                       <input
                         type="date"
                         value={filtroFecha}
                         onChange={(e) => {
                           setFiltroFecha(e.target.value);
                           // Limpiar filtro personalizado si se usa otro filtro
                           if (e.target.value) {
                             setFiltroPersonalizadoInicio('');
                             setFiltroPersonalizadoFin('');
                           }
                         }}
                         className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                       />
                     </div>

                    {/* Filtro por Mes */}
                    <div>
                     <label className="block text-white text-xs mb-1">Mes</label>
                      <select
                        value={filtroMes}
                        onChange={(e) => {
                          setFiltroMes(e.target.value);
                          // Limpiar filtro personalizado si se usa otro filtro
                          if (e.target.value) {
                            setFiltroPersonalizadoInicio('');
                            setFiltroPersonalizadoFin('');
                          }
                        }}
                        className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                      >
                        <option value="">Todos</option>
                        {[
                          { value: '1', label: 'Enero' },
                          { value: '2', label: 'Febrero' },
                          { value: '3', label: 'Marzo' },
                          { value: '4', label: 'Abril' },
                          { value: '5', label: 'Mayo' },
                          { value: '6', label: 'Junio' },
                          { value: '7', label: 'Julio' },
                          { value: '8', label: 'Agosto' },
                          { value: '9', label: 'Septiembre' },
                          { value: '10', label: 'Octubre' },
                          { value: '11', label: 'Noviembre' },
                          { value: '12', label: 'Diciembre' }
                        ].map(mes => (
                          <option key={mes.value} value={mes.value}>{mes.label}</option>
                        ))}
                      </select>
                    </div>

                                         {/* Filtro por Año */}
                     <div>
                      <label className="block text-white text-xs mb-1">Año</label>
                       <select
                         value={filtroAnio}
                         onChange={(e) => {
                           setFiltroAnio(e.target.value);
                           // Limpiar filtro personalizado si se usa otro filtro
                           if (e.target.value) {
                             setFiltroPersonalizadoInicio('');
                             setFiltroPersonalizadoFin('');
                           }
                         }}
                         className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                       >
                         {aniosDisponibles.map(anio => (
                           <option key={anio} value={anio.toString()}>{anio}</option>
                         ))}
                       </select>
                     </div>

                    {/* Filtro por Tipo de Pago */}
                    <div>
                      <label className="block text-white text-xs mb-1">Tipo de Pago</label>
                      <select
                        value={filtroTipoPago}
                        onChange={(e) => setFiltroTipoPago(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                      >
                        <option value="">Todos</option>
                        <option value="efectivo">💵 Efectivo</option>
                        <option value="debito">💳 Débito</option>
                        <option value="transferencia">📱 Transferencia</option>
                      </select>
                    </div>

                    {/* Botón Limpiar Filtros */}
                    <div className="flex items-end">
                      <button
                        onClick={limpiarFiltros}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        🧹 Limpiar
                      </button>
                    </div>
                  </div>
                  
                  {/* Filtro Personalizado - Rango de Fecha/Hora */}
                  <div className="border-t border-white/10 pt-3">
                    <h4 className="text-white text-sm mb-2 font-medium">🕐 Filtro Personalizado (Rango de Fecha y Hora)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white text-xs mb-1">Desde (Fecha y Hora)</label>
                        <input
                          type="datetime-local"
                          value={filtroPersonalizadoInicio}
                          onChange={(e) => {
                            setFiltroPersonalizadoInicio(e.target.value);
                            // Limpiar otros filtros si se usa el personalizado
                            if (e.target.value) {
                              setFiltroFecha('');
                              setFiltroMes('');
                              setFiltroAnio('');
                            }
                          }}
                          className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-xs mb-1">Hasta (Fecha y Hora)</label>
                        <input
                          type="datetime-local"
                          value={filtroPersonalizadoFin}
                          onChange={(e) => {
                            setFiltroPersonalizadoFin(e.target.value);
                            // Limpiar otros filtros si se usa el personalizado
                            if (e.target.value) {
                              setFiltroFecha('');
                              setFiltroMes('');
                              setFiltroAnio('');
                            }
                          }}
                          className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                      </div>
                    </div>
                    {filtroPersonalizadoInicio && filtroPersonalizadoFin && (
                      <p className="text-green-400 text-xs mt-2">
                        ✓ Mostrando pedidos desde {new Date(filtroPersonalizadoInicio).toLocaleString('es-CL', { timeZone: 'America/Santiago' })} 
                        {' '}hasta {new Date(filtroPersonalizadoFin).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
             
             {loadingPedidos ? (
               <div className="text-center py-8">
                 <div className="text-white text-lg">🔄 Cargando pedidos...</div>
               </div>
                           ) : pedidosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-lg">
                    {pedidosRegistrados.length === 0 ? '📭 No hay pedidos registrados' : '🔍 No hay pedidos que coincidan con los filtros'}
                  </div>
                  <p className="text-gray-500 text-sm mt-2">
                    {pedidosRegistrados.length === 0 ? 'Los pedidos aparecerán aquí después de registrarlos' : 'Intenta ajustar los filtros de búsqueda'}
                  </p>
                </div>
              ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                      <thead className="text-white bg-white/10 rounded-lg">
                        <tr>
                          <th className="px-4 py-3 rounded-l-lg">Fecha</th>
                          <th className="px-4 py-3">Mesa</th>
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">Comentarios</th>
                          <th className="px-4 py-3">Cantidad</th>
                          <th className="px-4 py-3">Precio</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Total Final</th>
                          <th className="px-4 py-3">Propina</th>
                          <th className="px-4 py-3">Tipo Pago</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 rounded-r-lg">Acciones</th>
                        </tr>
                      </thead>
                                       <tbody className="text-white">
                      {pedidosFiltrados.map((pedido, index) => {
                        const estaEditando = editandoId === pedido.id;
                        
                        // Determinar si esta fila es el inicio de un nuevo pedido
                        // La primera fila de cada pedido tiene total_final
                        // Entonces ponemos línea gruesa ANTES de filas con total_final (excepto la primera del todo)
                        const esInicioDePedido = index > 0 && pedido.total_final !== null;
                        
                        return (
                          <Fragment key={index}>
                            <tr 
                              className={`hover:bg-white/5 transition-colors ${
                                esInicioDePedido 
                                  ? 'border-t border-green-500/40' 
                                  : index === 0 
                                    ? '' 
                                    : 'border-t border-white/5'
                              }`}
                            >
                              {/* Fecha */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <input
                                    type="date"
                                    value={valoresEdicion.fecha_cl}
                                    onChange={(e) => handleEdicionChange('fecha_cl', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  <div className="text-sm">
                                    {pedido.fecha ? (() => {
                                      const [year, month, day] = pedido.fecha.split('-');
                                      const fechaFormateada = `${day}/${month}/${year}`;
                                      return fechaFormateada;
                                    })() : 'N/A'}
                                  </div>
                                )}
                              </td>

                              {/* Mesa */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <input
                                    type="text"
                                    value={valoresEdicion.mesa}
                                    onChange={(e) => handleEdicionChange('mesa', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Nombre de la mesa"
                                  />
                                ) : (
                                  pedido.mesa ? (
                                    <span className="text-blue-300 text-xs">
                                      {obtenerNombreMesa(pedido.mesa)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )
                                )}
                              </td>

                              {/* Producto */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <div className="flex flex-col gap-1">
                                    <input
                                      type="text"
                                      value={valoresEdicion.producto}
                                      onChange={(e) => handleEdicionChange('producto', e.target.value)}
                                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    />
                                    <select
                                      value={valoresEdicion.unidad}
                                      onChange={(e) => handleEdicionChange('unidad', e.target.value)}
                                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    >
                                      <option value="unidad">📦 Unidad</option>
                                      <option value="kg">⚖️ Kg</option>
                                    </select>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium">{pedido.producto}</div>
                                    <div className="text-gray-400 text-xs">{pedido.unidad}</div>
                                  </div>
                                )}
                              </td>

                              {/* Comentarios */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <input
                                    type="text"
                                    value={valoresEdicion.comentarios || ''}
                                    onChange={(e) => handleEdicionChange('comentarios', e.target.value)}
                                    onBlur={(e) => {
                                      // Asegurar que se guarde en mayúsculas
                                      const comentariosUpper = e.target.value.toUpperCase();
                                      handleEdicionChange('comentarios', comentariosUpper);
                                    }}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Comentarios..."
                                    style={{ textTransform: 'uppercase' }}
                                  />
                                ) : (
                                  pedido.comentarios ? (
                                    <span className="text-blue-300 text-xs">
                                      {pedido.comentarios}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )
                                )}
                              </td>

                              {/* Cantidad */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <input
                                    type="text"
                                    value={valoresEdicion.cantidad}
                                    onChange={(e) => handleEdicionChange('cantidad', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  <span className="bg-gray-600/20 text-gray-300 px-2 py-1 rounded text-xs">
                                    {pedido.cantidad}
                                  </span>
                                )}
                              </td>

                              {/* Precio */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.precio}
                                    onChange={(e) => handleEdicionChange('precio', e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  <span className="text-green-400 font-medium">
                                    ${parseFloat(pedido.precio).toLocaleString()}
                                  </span>
                                )}
                              </td>

                              {/* Total */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.total}
                                    onChange={(e) => handleEdicionChange('total', e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  <span className="text-yellow-400 font-medium">
                                    ${parseFloat(pedido.total).toLocaleString()}
                                  </span>
                                )}
                              </td>

                              {/* Total Final */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.total_final || ''}
                                    onChange={(e) => handleEdicionChange('total_final', e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Total final"
                                  />
                                ) : (
                                  pedido.total_final ? (
                                    <span className="text-green-300 font-bold text-sm">
                                      ${parseFloat(pedido.total_final).toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )
                                )}
                              </td>

                              {/* Propina */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.propina || ''}
                                    onChange={(e) => handleEdicionChange('propina', e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Propina"
                                  />
                                ) : (
                                  pedido.propina ? (
                                    <span className="bg-yellow-600/20 text-yellow-300 px-2 py-1 rounded font-medium text-sm">
                                      ${parseFloat(pedido.propina).toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )
                                )}
                              </td>

                              {/* Tipo de Pago */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <select
                                    value={valoresEdicion.tipo_pago}
                                    onChange={(e) => handleEdicionChange('tipo_pago', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  >
                                    <option value="">Sin tipo</option>
                                    <option value="efectivo">💵 Efectivo</option>
                                    <option value="debito">💳 Débito</option>
                                    <option value="transferencia">📱 Transferencia</option>
                                  </select>
                                ) : (
                                  pedido.tipo_pago ? (
                                    <span className={`text-xs ${
                                      pedido.tipo_pago === 'efectivo' 
                                        ? 'text-green-300' 
                                        : pedido.tipo_pago === 'debito'
                                        ? 'text-blue-300'
                                        : 'text-purple-300'
                                    }`}>
                                      {pedido.tipo_pago === 'efectivo' ? '💵 Efectivo' : 
                                       pedido.tipo_pago === 'debito' ? '💳 Débito' : 
                                       pedido.tipo_pago === 'transferencia' ? '📱 Transferencia' : 
                                       pedido.tipo_pago}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )
                                )}
                              </td>

                              {/* Estado */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <select
                                    value={valoresEdicion.estado}
                                    onChange={(e) => handleEdicionChange('estado', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  >
                                    <option value="">Sin estado</option>
                                    <option value="pagado">✅ Pagado</option>
                                    <option value="pendiente">⏳ Pendiente</option>
                                  </select>
                                ) : (
                                  pedido.estado ? (
                                    <span className={`text-xs ${
                                      pedido.estado === 'pagado' 
                                        ? 'text-green-300' 
                                        : 'text-gray-300'
                                    }`}>
                                      {pedido.estado === 'pagado' ? '✅ Pagado' : pedido.estado}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )
                                )}
                              </td>

                              {/* Acciones */}
                              <td className="px-4 py-3">
                                {estaEditando ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => guardarEdicion(pedido.id)}
                                      disabled={loadingPedidos}
                                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Guardar cambios"
                                    >
                                      ✅
                                    </button>
                                    <button
                                      onClick={cancelarEdicion}
                                      disabled={loadingPedidos}
                                      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Cancelar edición"
                                    >
                                      ❌
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => iniciarEdicion(pedido)}
                                      disabled={loadingPedidos}
                                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Editar pedido"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => eliminarPedido(pedido.id)}
                                      disabled={loadingPedidos}
                                      className="text-red-500 hover:text-red-400 disabled:text-gray-600 text-lg font-bold transition-colors"
                                      title="Eliminar pedido"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                   </tbody>
                 </table>
               </div>
             )}

             {/* Sección de Estadísticas de Pedidos */}
             {pedidosFiltrados.length > 0 && (
               <div className="mt-4 md:mt-6 p-4 md:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                 <h4 className="text-blue-300 font-bold text-base md:text-lg mb-3 md:mb-4 text-center">{obtenerTituloResumenPedidos()}</h4>
                 
                 {/* Listado de estadísticas */}
                 <div className="space-y-2 md:space-y-3">
                   {/* Total */}
                   <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                     <div className="flex items-center">
                       <span className="text-blue-400 text-lg md:text-xl mr-3">📊</span>
                       <div>
                         <p className="text-blue-200 text-sm md:text-base font-medium">Total</p>
                         <p className="text-blue-300 text-xs md:text-sm">{estadisticasPedidos.total.cantidad} pedidos</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-blue-300 font-bold text-lg md:text-xl">
                         ${estadisticasPedidos.total.monto.toLocaleString()}
                       </p>
                     </div>
                   </div>
                   
                   {/* Efectivo */}
                   <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                     <div className="flex items-center">
                       <span className="text-green-400 text-lg md:text-xl mr-3">💵</span>
                       <div>
                         <p className="text-green-200 text-sm md:text-base font-medium">Efectivo</p>
                         <p className="text-green-300 text-xs md:text-sm">{estadisticasPedidos.efectivo.cantidad} pedidos</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-green-300 font-bold text-lg md:text-xl">
                         ${estadisticasPedidos.efectivo.monto.toLocaleString()}
                       </p>
                     </div>
                   </div>
                   
                   {/* Débito */}
                   <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                     <div className="flex items-center">
                       <span className="text-purple-400 text-lg md:text-xl mr-3">💳</span>
                       <div>
                         <p className="text-purple-200 text-sm md:text-base font-medium">Débito</p>
                         <p className="text-purple-300 text-xs md:text-sm">{estadisticasPedidos.debito.cantidad} pedidos</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-purple-300 font-bold text-lg md:text-xl">
                         ${estadisticasPedidos.debito.monto.toLocaleString()}
                       </p>
                     </div>
                   </div>
                   
                   {/* Transferencia */}
                   <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                     <div className="flex items-center">
                       <span className="text-indigo-400 text-lg md:text-xl mr-3">📱</span>
                       <div>
                         <p className="text-indigo-200 text-sm md:text-base font-medium">Transferencia</p>
                         <p className="text-indigo-300 text-xs md:text-sm">{estadisticasPedidos.transferencia.cantidad} pedidos</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-indigo-300 font-bold text-lg md:text-xl">
                         ${estadisticasPedidos.transferencia.monto.toLocaleString()}
                       </p>
                     </div>
                   </div>
                   
                   {/* Propinas */}
                   <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                     <div className="flex items-center">
                       <span className="text-yellow-400 text-lg md:text-xl mr-3">💡</span>
                       <div>
                         <p className="text-yellow-200 text-sm md:text-base font-medium">Propinas</p>
                         <p className="text-yellow-300 text-xs md:text-sm">Total de propinas del período</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-yellow-300 font-bold text-lg md:text-xl">
                         ${estadisticasPedidos.propinas.toLocaleString()}
                       </p>
                     </div>
                   </div>
                   
                   {/* Total en Caja */}
                   <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                     <div className="flex items-center">
                       <span className="text-blue-400 text-lg md:text-xl mr-3">💰</span>
                       <div>
                         <p className="text-blue-200 text-sm md:text-base font-medium">Total en Caja</p>
                         <p className="text-blue-300 text-xs md:text-sm">Caja inicial + acumulado</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-blue-300 font-bold text-lg md:text-xl">
                         ${calcularTotalCaja().toLocaleString()}
                       </p>
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>
       
      {/* Footer */}
      {!pantallaCompleta && <Footer />}

      {/* Modal del Escáner de Código de Barras */}
      <BarcodeScanner
        isOpen={mostrarScannerPedidos}
        onScan={(code) => {
          buscarProductoPorCodigo(code);
          setMostrarScannerPedidos(false);
        }}
        onClose={() => setMostrarScannerPedidos(false)}
        title="Escanear Código de Producto"
      />

      {/* Notificación Toast (cierre automático) */}
      {notificacionToast.visible && (
        <div className="fixed top-20 right-4 z-50 animate-[slideIn_0.3s_ease-out]">
          <div className={`rounded-lg shadow-2xl p-4 border ${
            notificacionToast.tipo === 'success' 
              ? 'bg-green-600 border-green-400' 
              : 'bg-red-600 border-red-400'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {notificacionToast.tipo === 'success' ? '✅' : '❌'}
              </span>
              <p className="text-white font-medium text-sm">
                {notificacionToast.mensaje}
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
