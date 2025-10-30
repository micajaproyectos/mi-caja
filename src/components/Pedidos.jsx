import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { 
  obtenerFechaHoyChile, 
  formatearFechaCortaChile
} from '../lib/dateUtils.js';
import Footer from './Footer';

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
  
  // Refs y estado para el portal del dropdown
  const searchInputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Estados para gestión de mesas
  const [mesas, setMesas] = useState(['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4']); // Inicializar con mesas por defecto
  const [mesaSeleccionada, setMesaSeleccionada] = useState('Mesa 1'); // Seleccionar la primera por defecto
  const [cantidadMesas, setCantidadMesas] = useState(4);
  const [productosPorMesa, setProductosPorMesa] = useState({});
  const [datosInicialCargados, setDatosInicialCargados] = useState(false);
  const [mesasInicialCargadas, setMesasInicialCargadas] = useState(false);
  
  // Estados para edición de nombres de mesas
  const [mesaEditando, setMesaEditando] = useState(null);
  const [nombreMesaTemporal, setNombreMesaTemporal] = useState('');
  
  // Estados para selección de productos para enviar a cocina
  const [productosSeleccionadosParaCocina, setProductosSeleccionadosParaCocina] = useState({});
  
  // Estados para selección de productos para pago
  const [productosSeleccionadosParaPago, setProductosSeleccionadosParaPago] = useState({});
  
  // Estados para propina
  const [propinaActiva, setPropinaActiva] = useState(false);
  const [porcentajePropina, setPorcentajePropina] = useState(10);
  
  // Estados para el cálculo de vuelto (solo frontend)
  const [montoPagado, setMontoPagado] = useState('');
  const [mostrarVuelto, setMostrarVuelto] = useState(false);
  
  // Estados para filtros
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroTipoPago, setFiltroTipoPago] = useState('');
  
  // Estado para años disponibles (se calcula automáticamente)
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  
  // Estado para pedidos filtrados
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  
  // Estados para la tabla de pedidos registrados
  const [pedidosRegistrados, setPedidosRegistrados] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  
  // Estado para control de envío a cocina
  const [enviandoACocina, setEnviandoACocina] = useState(false);

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

      // Obtener el cliente_id del usuario autenticado para satisfacer la política RLS
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('Error al obtener cliente_id del usuario:', usuarioError);
        setPedidosRegistrados([]);
        return;
      }

      const cliente_id = usuarioData.cliente_id;

      // Cargar TODOS los pedidos del usuario (sin filtro de fecha)
      // Intentar consulta con fecha_cl primero
      let { data, error } = await supabase
        .from('pedidos')
        .select('id, fecha, fecha_cl, mesa, producto, unidad, cantidad, precio, total, total_final, propina, estado, tipo_pago, comentarios, usuario_id, created_at')
        .eq('usuario_id', usuarioId) // 🔒 FILTRO CRÍTICO POR USUARIO
        .eq('cliente_id', cliente_id) // 🔒 FILTRO CRÍTICO POR CLIENTE
        .order('fecha_cl', { ascending: false })
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      // Si hay error con fecha_cl, usar consulta sin fecha_cl
      if (error && error.message?.includes('fecha_cl')) {
        console.warn('⚠️ Columna fecha_cl no existe en pedidos, usando fecha');
        const fallbackQuery = await supabase
          .from('pedidos')
          .select('id, fecha, mesa, producto, unidad, cantidad, precio, total, total_final, propina, estado, tipo_pago, comentarios, usuario_id, created_at')
          .eq('usuario_id', usuarioId)
          .eq('cliente_id', cliente_id)
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false });
        
        data = fallbackQuery.data;
        error = fallbackQuery.error;
      }

      if (error) {
        console.error('❌ Error al cargar pedidos registrados:', error);
        setPedidosRegistrados([]);
      } else {
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

      setProductosInventario(data || []);
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
      // DEBUG: Verificar sesión de Supabase
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      debugLog('🔐 DEBUG - Sesión de Supabase:', {
        tieneSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        errorSession: sessionError
      });

      const usuarioId = await authService.getCurrentUserId();
      debugLog('👤 DEBUG - Usuario ID obtenido:', usuarioId);
      
      if (!usuarioId) {
        debugLog('⚠️ No hay usuario autenticado para cargar productos temporales');
        return;
      }

      debugLog('📡 Consultando Supabase para usuario:', usuarioId);

      const { data, error } = await supabase
        .from('productos_mesas_temp')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error al cargar productos temporales:', error);
        debugLog('🔍 DEBUG - Detalles del error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return;
      }

      debugLog('📊 Datos recibidos de Supabase:', data);
      debugLog('🔢 DEBUG - Total de registros:', data?.length || 0);

      // Convertir datos de Supabase al formato local (productosPorMesa)
      const productosPorMesaTemp = {};
      (data || []).forEach(item => {
        if (!productosPorMesaTemp[item.mesa]) {
          productosPorMesaTemp[item.mesa] = [];
        }
        productosPorMesaTemp[item.mesa].push({
          id: item.producto_id,
          producto: item.producto,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
          comentarios: item.comentarios || ''
        });
      });

      setProductosPorMesa(productosPorMesaTemp);
      debugLog('✅ Productos temporales cargados desde Supabase:', Object.keys(productosPorMesaTemp).length, 'mesas');
      
      // Marcar que los datos iniciales ya fueron cargados
      setDatosInicialCargados(true);

    } catch (error) {
      console.error('Error inesperado al cargar productos temporales:', error);
      // Marcar como cargados incluso si hay error para no bloquear la app
      setDatosInicialCargados(true);
    }
  };

  // Función para guardar un producto en Supabase
  const guardarProductoEnSupabase = async (mesa, producto) => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        return;
      }

      // Obtener cliente_id
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('❌ Error al obtener cliente_id del usuario:', {
          error: usuarioError,
          code: usuarioError?.code,
          message: usuarioError?.message,
          details: usuarioError?.details,
          hint: usuarioError?.hint
        });
        alert('❌ Error: No se puede acceder a los datos del usuario. Verifica las políticas RLS de la tabla usuarios.');
        return;
      }

      const { error } = await supabase
        .from('productos_mesas_temp')
        .insert([{
          usuario_id: usuarioId,
          cliente_id: usuarioData.cliente_id,
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
        return;
      }

      debugLog('✅ Producto guardado en Supabase:', producto.producto);

    } catch (error) {
      console.error('Error inesperado al guardar producto:', error);
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

  // Función para cargar mesas desde Supabase
  const cargarMesasDesdeSupabase = async () => {
    try {
      // Evitar carga múltiple
      if (mesasInicialCargadas) return;
      
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        debugLog('⚠️ No hay usuario autenticado para cargar mesas');
        setMesasInicialCargadas(true);
        return;
      }

      debugLog('📡 Cargando mesas desde Supabase para usuario:', usuarioId);

      const { data, error } = await supabase
        .from('mesas_config')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('orden', { ascending: true });

      if (error) {
        console.error('Error al cargar mesas desde Supabase:', error);
        setMesasInicialCargadas(true);
        // Mantener las mesas por defecto que ya están en el estado
        return;
      }

      if (data && data.length > 0) {
        const mesasArray = data.map(m => m.nombre_mesa);
        setMesas(mesasArray);
        
        // Solo cambiar la selección si la mesa actual no existe en las nuevas
        if (!mesasArray.includes(mesaSeleccionada)) {
          setMesaSeleccionada(mesasArray[0]);
        }
        
        debugLog('✅ Mesas cargadas desde Supabase:', mesasArray.length);
        setMesasInicialCargadas(true);
      } else {
        // Si no hay mesas en Supabase, crear las por defecto de forma asíncrona
        debugLog('📝 No hay mesas en Supabase, creando mesas por defecto...');
        setMesasInicialCargadas(true);
        // Inicializar en background sin bloquear
        inicializarMesasPorDefecto();
      }

    } catch (error) {
      console.error('Error inesperado al cargar mesas:', error);
      setMesasInicialCargadas(true);
    }
  };

  // Función para inicializar mesas por defecto en Supabase
  const inicializarMesasPorDefecto = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      // Obtener cliente_id (opcional)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      const mesasDefault = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4'];
      
      // Crear mesas en Supabase
      const mesasParaInsertar = mesasDefault.map((nombre, index) => ({
        usuario_id: usuarioId,
        cliente_id: usuarioData?.cliente_id || null, // Permitir null si no hay cliente_id
        nombre_mesa: nombre,
        orden: index
      }));

      const { error } = await supabase
        .from('mesas_config')
        .insert(mesasParaInsertar);

      if (error) {
        console.error('Error al crear mesas por defecto:', error);
        // Si falla, usar mesas locales
        setMesas(mesasDefault);
        setMesaSeleccionada(mesasDefault[0]);
      } else {
        debugLog('✅ Mesas por defecto creadas en Supabase');
        setMesas(mesasDefault);
        setMesaSeleccionada(mesasDefault[0]);
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

      // Obtener cliente_id (opcional)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      // Preparar mesas para insertar (solo las nuevas)
      const mesasParaInsertar = nuevasMesas.map((nombre, index) => ({
        usuario_id: usuarioId,
        cliente_id: usuarioData?.cliente_id || null, // Permitir null si no hay cliente_id
        nombre_mesa: nombre,
        orden: mesas.length + index // Continuar desde el último orden
      }));

      const { error } = await supabase
        .from('mesas_config')
        .insert(mesasParaInsertar);

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
      if (!usuarioId) return;

      // Actualizar el orden de cada mesa
      for (let i = 0; i < mesasOrdenadas.length; i++) {
        await supabase
          .from('mesas_config')
          .update({ orden: i })
          .eq('usuario_id', usuarioId)
          .eq('nombre_mesa', mesasOrdenadas[i]);
      }

      debugLog('✅ Orden de mesas actualizado en Supabase');

    } catch (error) {
      console.error('Error al actualizar orden de mesas:', error);
    }
  };

  // ============================================================
  // FIN FUNCIONES DE SINCRONIZACIÓN
  // ============================================================

  // Función para filtrar productos según la búsqueda
  const filtrarProductos = (busqueda) => {
    if (!busqueda.trim()) {
      setProductosFiltrados([]);
      return;
    }

    const filtrados = productosInventario.filter(producto =>
      producto.producto.toLowerCase().includes(busqueda.toLowerCase())
    );
    setProductosFiltrados(filtrados);
  };

  // Función para seleccionar un producto del inventario
  const seleccionarProducto = (producto) => {
    setProductoActual({
      ...productoActual,
      producto: producto.producto,
      precio_unitario: producto.precio_venta.toString(),
      unidad: producto.unidad,
      subtotal: 0,
      comentarios: ''
    });
    setBusquedaProducto(producto.producto);
    setMostrarDropdown(false);
  };

  // Función para manejar cambios en la búsqueda de productos
  const handleBusquedaProducto = (e) => {
    const valor = e.target.value;
    setBusquedaProducto(valor);
    setProductoActual({
      ...productoActual,
      producto: valor
    });
    
    if (valor.trim()) {
      filtrarProductos(valor);
      setMostrarDropdown(true);
      
      // Calcular posición del dropdown para el portal
      if (searchInputRef.current) {
        const rect = searchInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    } else {
      setProductosFiltrados([]);
      setMostrarDropdown(false);
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
    
    // Guardar en Supabase (sincronización multi-dispositivo)
    await guardarProductoEnSupabase(mesaSeleccionada, nuevoProducto);
    
    // Limpiar el formulario de producto
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

    // Guardar en localStorage (cache secundario)
    const productosGuardados = {
      ...productosPorMesa,
      [mesaSeleccionada]: [...(productosPorMesa[mesaSeleccionada] || []), nuevoProducto]
    };
    localStorage.setItem('productosPorMesa', JSON.stringify(productosGuardados));
  };

  // Función para actualizar comentarios de un producto (solo local - para onChange)
  const actualizarComentariosProducto = (mesa, productoId, comentarios) => {
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
    if (propinaActiva) {
      const propina = (subtotal * porcentajePropina) / 100;
      return subtotal + propina;
    }
    return subtotal;
  };

  // Función para calcular solo la propina
  const calcularPropina = (mesa) => {
    const subtotal = calcularTotalMesa(mesa);
    if (propinaActiva) {
      return (subtotal * porcentajePropina) / 100;
    }
    return 0;
  };

  // Función para calcular el vuelto
  const calcularVuelto = () => {
    if (!mesaSeleccionada) return 0;
    const totalMesa = calcularTotalConPropina(mesaSeleccionada);
    const montoPagadoNum = parseFloat(montoPagado) || 0;
    return montoPagadoNum - totalMesa;
  };

  // Función para agregar mesas
  const agregarMesas = async () => {
    if (cantidadMesas <= 0) {
      alert('La cantidad de mesas debe ser mayor a 0');
      return;
    }

    const nuevasMesas = [];
    for (let i = 1; i <= cantidadMesas; i++) {
      nuevasMesas.push(`Mesa ${mesas.length + i}`);
    }
    
    const mesasActualizadas = [...mesas, ...nuevasMesas];
    setMesas(mesasActualizadas);
    setCantidadMesas(4); // Resetear a 4
    
    // Guardar en Supabase (sincronización multi-dispositivo)
    await guardarMesasEnSupabase(nuevasMesas);
    
    // Guardar en localStorage (cache secundario)
    localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));
  };

  // Función para eliminar una mesa
  const eliminarMesa = async (mesaAEliminar) => {
    // No permitir eliminar si solo queda una mesa
    if (mesas.length <= 1) {
      alert('Debe mantener al menos una mesa');
      return;
    }

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

    // Eliminar de Supabase (sincronización multi-dispositivo)
    await eliminarMesaDeSupabase(mesaAEliminar);
    await limpiarMesaEnSupabase(mesaAEliminar); // Eliminar también los productos de la mesa

    // Actualizar orden de las mesas restantes
    await actualizarOrdenMesasEnSupabase(mesasActualizadas);

    // Actualizar localStorage de mesas (cache secundario)
    localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));
    
    // Actualizar localStorage de productos (cache secundario)
    const productosGuardados = { ...productosPorMesa };
    delete productosGuardados[mesaAEliminar];
    localStorage.setItem('productosPorMesa', JSON.stringify(productosGuardados));
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

    // Renombrar en Supabase (sincronización multi-dispositivo)
    await renombrarMesaEnSupabase(mesaAntigua, nombreMesaTemporal);

    // Actualizar localStorage (cache secundario)
    const mesasActualizadas = mesas.map(m => m === mesaAntigua ? nombreMesaTemporal : m);
    localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));

    // Limpiar estados de edición
    setMesaEditando(null);
    setNombreMesaTemporal('');
  };

  // Función para cancelar edición de nombre de mesa
  const cancelarEdicionNombreMesa = () => {
    setMesaEditando(null);
    setNombreMesaTemporal('');
  };

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

  // Función para calcular años disponibles de los pedidos registrados
  const calcularAniosDisponibles = useCallback(() => {
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
    setAniosDisponibles(aniosArray);
  }, [pedidosRegistrados]);

  // Función para aplicar filtros a los pedidos registrados
  const aplicarFiltros = useCallback(() => {
    let filtrados = [...pedidosRegistrados];
    const fechaActual = obtenerFechaHoyChile();

    // Si no hay filtros activos, mostrar solo los pedidos del día actual
    if (!filtroFecha && !filtroMes && !filtroAnio && !filtroTipoPago) {
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
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaPedido = pedido.fecha_cl || pedido.fecha;
          
          if (!fechaPedido && pedido.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(pedido.created_at);
            fechaPedido = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaPedido) return false;
          
          const [year, month] = fechaPedido.split('-');
          const mesPedido = parseInt(month);
          const mesFiltro = parseInt(filtroMes);
          return mesPedido === mesFiltro;
        });
      }

      // Filtro por año (siempre aplicarlo cuando hay filtros activos)
      if (filtroAnio && !filtroFecha) {
        filtrados = filtrados.filter(pedido => {
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaPedido = pedido.fecha_cl || pedido.fecha;
          
          if (!fechaPedido && pedido.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(pedido.created_at);
            fechaPedido = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaPedido) return false;
          const year = fechaPedido.split('-')[0];
          return parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Si hay mes y año seleccionados (sin fecha específica)
      if (filtroMes && filtroAnio && !filtroFecha) {
        filtrados = filtrados.filter(pedido => {
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaPedido = pedido.fecha_cl || pedido.fecha;
          
          if (!fechaPedido && pedido.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(pedido.created_at);
            fechaPedido = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaPedido) return false;
          const [year, month] = fechaPedido.split('-');
          return parseInt(month) === parseInt(filtroMes) && 
                 parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Filtro por tipo de pago
      if (filtroTipoPago) {
        filtrados = filtrados.filter(pedido => {
          return pedido.tipo_pago === filtroTipoPago;
        });
      }
    }

    setPedidosFiltrados(filtrados);
  }, [pedidosRegistrados, filtroFecha, filtroMes, filtroAnio, filtroTipoPago]);

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroMes('');
    setFiltroAnio('');
    setFiltroTipoPago('');
    // No llamar setPedidosFiltrados directamente
    // Los efectos se encargarán de aplicar los filtros correctamente
  };

  // Función para calcular estadísticas dinámicas según filtros aplicados
  const calcularEstadisticasPedidos = useCallback(() => {
    let pedidosFiltrados = [...pedidosRegistrados];
    const fechaActual = obtenerFechaHoyChile();

    // Aplicar los mismos filtros que en aplicarFiltros()
    // Si no hay filtros activos, mostrar solo los pedidos del día actual
    if (!filtroFecha && !filtroMes && !filtroAnio && !filtroTipoPago) {
      pedidosFiltrados = pedidosFiltrados.filter(pedido => {
        const fechaPedido = pedido.fecha_cl || pedido.fecha;
        return fechaPedido === fechaActual;
      });
    } else {
      // Filtro por fecha específica
      if (filtroFecha) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          const fechaPedido = pedido.fecha_cl || pedido.fecha;
          return fechaPedido === filtroFecha;
        });
      }

      // Filtro por mes
      if (filtroMes && !filtroFecha) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          let fechaPedido = pedido.fecha_cl || pedido.fecha;
          
          if (!fechaPedido && pedido.created_at) {
            const fechaCreated = new Date(pedido.created_at);
            fechaPedido = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaPedido) return false;
          
          const [year, month] = fechaPedido.split('-');
          const mesPedido = parseInt(month);
          const mesFiltro = parseInt(filtroMes);
          return mesPedido === mesFiltro;
        });
      }

      // Filtro por año (siempre aplicarlo cuando hay filtros activos)
      if (filtroAnio && !filtroFecha) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
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

      // Si hay mes y año seleccionados
      if (filtroMes && filtroAnio && !filtroFecha) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          let fechaPedido = pedido.fecha_cl || pedido.fecha;
          
          if (!fechaPedido && pedido.created_at) {
            const fechaCreated = new Date(pedido.created_at);
            fechaPedido = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaPedido) return false;
          const [year, month] = fechaPedido.split('-');
          return parseInt(month) === parseInt(filtroMes) && 
                 parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Filtro por tipo de pago
      if (filtroTipoPago) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
          return pedido.tipo_pago === filtroTipoPago;
        });
      }
    }

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
  }, [pedidosRegistrados, filtroFecha, filtroMes, filtroAnio, filtroTipoPago]);

  // Función para obtener el título dinámico del resumen
  const obtenerTituloResumenPedidos = () => {
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
         .from('pedidos')
         .delete()
         .eq('id', id)
         .eq('usuario_id', usuarioId) // 🔒 SEGURIDAD: Solo eliminar pedidos del usuario actual
         .eq('cliente_id', cliente_id); // 🔒 SEGURIDAD: Solo eliminar pedidos del cliente actual

      if (error) {
        console.error('❌ Error al eliminar pedido:', error);
        alert('❌ Error al eliminar el pedido: ' + error.message);
        return;
      }

      alert('✅ Pedido eliminado exitosamente');
      
      // Recargar la lista de pedidos
      await cargarPedidosRegistrados();
      
    } catch (error) {
      console.error('❌ Error general al eliminar pedido:', error);
      alert('❌ Error al eliminar pedido: ' + error.message);
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
        .eq('usuario_id', usuarioId) // 🔒 SEGURIDAD: Solo editar pedidos del usuario actual
        .eq('cliente_id', cliente_id); // 🔒 SEGURIDAD: Solo editar pedidos del cliente actual

      if (error) {
        console.error('❌ Error al actualizar pedido:', error);
        alert('❌ Error al actualizar el pedido: ' + error.message);
        return;
      }

      alert('Pedido actualizado exitosamente');
      cancelarEdicion();
      await cargarPedidosRegistrados();

    } catch (error) {
      console.error('❌ Error inesperado al actualizar pedido:', error);
      alert('❌ Error inesperado al actualizar el pedido');
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

      // Obtener cliente_id
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('Error al obtener cliente_id:', usuarioError);
        alert('❌ Error al obtener información del usuario');
        return;
      }

      const cliente_id = usuarioData.cliente_id;

      // Calcular fecha_cl en zona horaria de Chile
      const fechaChile = new Date().toLocaleString("en-US", {timeZone: "America/Santiago"});
      const fechaCl = new Date(fechaChile).toISOString().split('T')[0];

      // Usar el nombre completo de la mesa (ahora la columna mesa acepta texto)
      const nombreMesaCompleto = mesa;

      // Filtrar solo los productos seleccionados
      const productosAEnviar = productosPorMesa[mesa].filter(p => seleccionados.includes(p.id));

      // Insertar cada producto seleccionado en pedidos_cocina
      for (let i = 0; i < productosAEnviar.length; i++) {
        const producto = productosAEnviar[i];
        
        const pedidoCocina = {
          usuario_id: usuarioId,
          cliente_id: cliente_id,
          fecha_cl: fechaCl,
          mesa: String(nombreMesaCompleto),  // Forzar a string
          // hora_inicio_pedido se genera automáticamente con DEFAULT de la tabla
          producto: producto.producto,
          unidad: producto.unidad,
          cantidad: parseFloat(producto.cantidad) || 0,
          // Comentarios del producto (normalizado a mayúsculas)
          comentarios: producto.comentarios ? producto.comentarios.toUpperCase().trim() : null
        };

        // Solo la primera fila tiene estado (igual que total_final en RegistroVenta)
        if (i === 0) {
          pedidoCocina.estado = 'pendiente';
        }

        console.log('Insertando en pedidos_cocina:', pedidoCocina);

        const { error } = await supabase
          .from('pedidos_cocina')
          .insert([pedidoCocina]);

        if (error) {
          console.error('❌ Error al enviar a cocina:', error);
          alert('❌ Error al enviar pedido a cocina: ' + error.message);
          return;
        }
      }

      alert(`✅ ${productosAEnviar.length} producto(s) de ${mesa} enviados a cocina exitosamente`);
      console.log(`🍳 ${productosAEnviar.length} productos enviados a cocina`);

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
    // Validar fecha primero
    if (!validarFecha(pedido.fecha)) {
      alert('❌ Por favor ingresa una fecha válida en formato YYYY-MM-DD');
      return;
    }

    // Validar que haya productos seleccionados para pago
    const productosSeleccionados = productosSeleccionadosParaPago[mesa] || [];
    if (productosSeleccionados.length === 0) {
      alert('❌ Por favor selecciona al menos un producto para pagar');
      return;
    }

    // Validar que se haya seleccionado un tipo de pago
    if (!pedido.tipo_pago) {
      alert('❌ Por favor selecciona un método de pago');
      return;
    }

    // Validar que la fecha esté presente
    if (!pedido.fecha) {
      alert('❌ Por favor completa la fecha del pedido');
      return;
    }

         // Obtener el usuario_id del usuario autenticado
     const usuarioId = await authService.getCurrentUserId();
     if (!usuarioId) {
       alert('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.');
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
       alert('❌ Error: No se pudo obtener la información del usuario. Verifica la configuración de la tabla usuarios.');
       return;
     }

     const cliente_id = usuarioData.cliente_id;

     // Verificar que cliente_id esté presente (requerido por la política RLS)
     if (!cliente_id) {
       console.error('❌ Error: cliente_id es requerido para la política RLS');
       alert('❌ Error: No se pudo obtener el cliente_id del usuario. Verifica la configuración de la tabla usuarios.');
       return;
     }

     // Usar el nombre completo de la mesa (ahora la columna mesa acepta texto)
     const nombreMesaCompleto = mesa;

           // Calcular el total final de la mesa (con propina si está activa)
      const totalFinal = calcularTotalConPropina(mesa);

    try {
      // Filtrar solo los productos seleccionados para pago
      const productosAPagar = productosPorMesa[mesa].filter(p => productosSeleccionados.includes(p.id));
      
      // Registrar cada producto seleccionado como una fila individual en la tabla pedidos
      for (let i = 0; i < productosAPagar.length; i++) {
        const producto = productosAPagar[i];
                 // Calcular fecha_cl en zona horaria de Chile
         const fechaChile = new Date().toLocaleString("en-US", {timeZone: "America/Santiago"});
         const fechaCl = new Date(fechaChile).toISOString().split('T')[0]; // Formato YYYY-MM-DD
         
                             // Preparar campos que solo van en la primera fila
          let totalFinalValue = null;
          let estadoValue = null;
          let mesaValue = null;
          let tipoPagoValue = null;
          let propinaValue = null;
          
          if (i === 0) {
            totalFinalValue = totalFinal; // Solo el valor numérico del total
            estadoValue = 'pagado'; // Estado solo en la primera fila
            mesaValue = nombreMesaCompleto; // Mesa solo en la primera fila (nombre completo)
            tipoPagoValue = pedido.tipo_pago; // Tipo de pago solo en la primera fila
            propinaValue = calcularPropina(mesa); // Propina solo en la primera fila
          }
          
          const pedidoParaInsertar = {
            fecha: pedido.fecha,
            fecha_cl: fechaCl, // Fecha en zona horaria de Chile
            mesa: mesaValue, // Mesa solo en la primera fila
            producto: producto.producto,
            unidad: producto.unidad,
            cantidad: producto.cantidad.toString(), // Convertir a string como especifica la tabla
            precio: parseFloat(producto.precio_unitario) || 0,
            total: parseFloat(producto.subtotal) || 0,
            // Solo incluir total_final en la primera fila (i === 0) como valor numérico
            total_final: totalFinalValue,
            estado: estadoValue, // Estado solo en la primera fila
            tipo_pago: tipoPagoValue, // Tipo de pago solo en la primera fila
            propina: propinaValue, // Propina solo en la primera fila
            // Comentarios del producto (normalizado a mayúsculas)
            comentarios: producto.comentarios ? producto.comentarios.toUpperCase().trim() : null,
            // Agregar el usuario_id del usuario autenticado
            usuario_id: usuarioId,
            // IMPORTANTE: La política RLS requiere que cliente_id coincida con usuarios.cliente_id
            cliente_id: cliente_id, // Campo OBLIGATORIO para la política RLS
            // created_at se genera automáticamente con default: now()
          };



        const { error } = await supabase
          .from('pedidos')
          .insert([pedidoParaInsertar]);

        if (error) {
          console.error('Error al registrar producto del pedido:', error);
          alert('Error al registrar pedido: ' + error.message);
          return;
        }
      }

             alert(`✅ ${productosAPagar.length} producto(s) de ${mesa} registrado(s) correctamente. Total: $${totalFinal.toLocaleString()}`);
       
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

       // Actualizar localStorage con solo los productos pendientes
       const productosGuardados = { ...productosPorMesa };
       
       if (productosPendientes.length > 0) {
         productosGuardados[mesa] = productosPendientes;
       } else {
         delete productosGuardados[mesa];
       }
       localStorage.setItem('productosPorMesa', JSON.stringify(productosGuardados));
       
       // Si se registró todo el pedido, limpiar selectores de cocina en localStorage
       if (productosPendientes.length === 0) {
         const selectoresCocina = JSON.parse(localStorage.getItem('productosSeleccionadosParaCocina') || '{}');
         delete selectoresCocina[mesa];
         localStorage.setItem('productosSeleccionadosParaCocina', JSON.stringify(selectoresCocina));
       }

       // Limpiar productos pagados de Supabase (sincronización multi-dispositivo)
       await limpiarMesaEnSupabase(mesa, productosSeleccionados);

       // Recargar la tabla de pedidos registrados
       cargarPedidosRegistrados();

    } catch (error) {
      console.error('Error general al registrar pedido:', error);
      alert('❌ Error al registrar pedido: ' + error.message);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarProductosInventario();
    cargarPedidosRegistrados();
    
    // Cargar productos desde Supabase (PRIORIDAD: sincronización multi-dispositivo)
    cargarProductosTemporales();
    
    // Cargar mesas desde Supabase en background (no bloquear el render)
    // Las mesas ya tienen valores por defecto, esta carga es para sincronizar
    setTimeout(() => cargarMesasDesdeSupabase(), 100);
    
    // Cargar selectores de cocina guardados en localStorage
    const seleccionadosCocina = localStorage.getItem('productosSeleccionadosParaCocina');
    if (seleccionadosCocina) {
      try {
        setProductosSeleccionadosParaCocina(JSON.parse(seleccionadosCocina));
      } catch (error) {
        console.error('Error al cargar selectores de cocina del localStorage:', error);
      }
    }

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
          debugLog('🔄 Cambio detectado en productos_mesas_temp:', payload);
          // Recargar productos cuando hay cambios
          cargarProductosTemporales();
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
          debugLog('🔄 Cambio detectado en mesas_config:', payload);
          // Resetear flag para permitir recarga
          setMesasInicialCargadas(false);
          // Recargar mesas cuando hay cambios (solo si no son del mismo usuario)
          setTimeout(() => cargarMesasDesdeSupabase(), 500);
        }
      )
      .subscribe();

    // Cleanup: desuscribir al desmontar
    return () => {
      supabase.removeChannel(channelProductos);
      supabase.removeChannel(channelMesas);
    };
  }, []);

  // Guardar productos en localStorage cuando cambien (solo después de cargar datos iniciales)
  useEffect(() => {
    if (datosInicialCargados) {
      localStorage.setItem('productosPorMesa', JSON.stringify(productosPorMesa));
    }
  }, [productosPorMesa, datosInicialCargados]);

  // Guardar selectores de cocina en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('productosSeleccionadosParaCocina', JSON.stringify(productosSeleccionadosParaCocina));
  }, [productosSeleccionadosParaCocina]);

  // Las mesas ahora se sincronizan con Supabase, no necesitamos guardar en localStorage
  // El localStorage solo se usa como cache secundario en las funciones individuales

  // Aplicar filtros cuando cambien los valores de filtro
  useEffect(() => {
    aplicarFiltros();
  }, [aplicarFiltros]);

  // Aplicar filtros cuando cambien los pedidos registrados
  useEffect(() => {
    // No inicializar directamente con todos los pedidos
    // Dejar que aplicarFiltros() maneje la lógica
    aplicarFiltros();
    calcularAniosDisponibles(); // Calcular años disponibles cuando cambien los pedidos
  }, [pedidosRegistrados, calcularAniosDisponibles, aplicarFiltros]);

  // Actualizar estadísticas cuando cambien los filtros o pedidos
  useEffect(() => {
    const nuevasEstadisticas = calcularEstadisticasPedidos();
    setEstadisticasPedidos(nuevasEstadisticas);
  }, [calcularEstadisticasPedidos]);

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
      <div className={`${pantallaCompleta ? 'h-full overflow-y-auto' : 'relative z-10 p-4 md:p-8'}`}>
        <div className={`${pantallaCompleta ? 'h-full px-4 py-4' : 'max-w-7xl mx-auto'}`}>
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
           <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-green-400 text-center mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
               Nuevo Pedido
             </h2>

             {/* Fecha y Búsqueda en la misma fila */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               {/* Fecha */}
               <div>
                 <label className="block text-white font-medium mb-2 text-sm">Fecha</label>
                 <input
                   type="date"
                   name="fecha"
                   value={pedido.fecha}
                   onChange={handleChange}
                   className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                 />
               </div>

               {/* Búsqueda de Producto */}
               <div>
                 <label className="block text-white font-medium mb-2 text-sm">Buscar Producto</label>
                 <input
                   ref={searchInputRef}
                   type="text"
                   value={busquedaProducto}
                   onChange={handleBusquedaProducto}
                   className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                   placeholder="🔍 Escribe el nombre del producto..."
                 />
               </div>
             </div>
               
             {/* Campos del producto */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
               <div>
                 <label className="block text-white font-medium mb-2 text-sm">Unidad</label>
                 <select
                   name="unidad"
                   value={productoActual.unidad}
                   onChange={handleChange}
                   className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                 >
                   <option value="">Seleccione unidad</option>
                   {opcionesUnidad.map(opcion => (
                     <option key={opcion.value} value={opcion.value}>
                       {opcion.icon} {opcion.label}
                     </option>
                   ))}
                 </select>
               </div>

               <div>
                 <label className="block text-white font-medium mb-2 text-sm">Cantidad</label>
                 <input
                   type="number"
                   step="0.01"
                   name="cantidad"
                   value={productoActual.cantidad}
                   onChange={handleChange}
                   className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                   placeholder="0.00"
                 />
               </div>

               <div>
                 <label className="block text-white font-medium mb-2 text-sm">Precio</label>
                 <input
                   type="number"
                   step="0.01"
                   name="precio_unitario"
                   value={productoActual.precio_unitario}
                   onChange={handleChange}
                   className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                   placeholder="0.00"
                 />
               </div>

               <div className="flex items-end">
                 <button
                   onClick={agregarProductoAMesa}
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"
                 >
                   ➕ Agregar a Mesa
                 </button>
               </div>
             </div>


          </div>

          {/* Dropdown de productos filtrados - Portal */}
          {mostrarDropdown && productosFiltrados.length > 0 && createPortal(
            <div 
              className="fixed z-[9999] bg-gray-900/95 backdrop-blur-md border-2 border-blue-400/60 rounded-2xl shadow-2xl max-h-80 overflow-y-auto"
              style={{ 
                top: dropdownPosition.top + 12,
                left: dropdownPosition.left,
                width: dropdownPosition.width
              }}
            >
              {productosFiltrados.map((producto, index) => (
                <div
                  key={producto.id || index}
                  onClick={() => seleccionarProducto(producto)}
                  className="px-6 py-4 hover:bg-blue-600/30 cursor-pointer border-b border-white/10 last:border-b-0 transition-all duration-200 hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg mb-1">{producto.producto}</div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-300 font-medium">
                          ${parseFloat(producto.precio_venta).toLocaleString()}
                        </span>
                        <span className="text-blue-300 font-medium">
                          {producto.unidad}
                        </span>
                      </div>
                    </div>
                    <div className="text-blue-400 text-xl">→</div>
                  </div>
                </div>
              ))}
            </div>,
            document.body
          )}

                     {/* Sección de Gestión de Mesas y Productos */}
           <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <h2 className="text-xl md:text-2xl font-bold text-green-400 text-center mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Gestión de Mesas y Productos
            </h2>
            
                                                   {/* Gestión de Mesas */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
               <div className="flex items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <label className="text-white text-sm whitespace-nowrap">Cantidad:</label>
                   <input
                     type="number"
                     min="1"
                     max="20"
                     value={cantidadMesas}
                     onChange={(e) => setCantidadMesas(parseInt(e.target.value) || 1)}
                     className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-center text-sm"
                   />
                 </div>
                 
                 <button
                   onClick={agregarMesas}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
                 >
                   ➕ Agregar
                 </button>
                 
                 <span className="text-gray-300 text-sm whitespace-nowrap">
                   Total: {mesas.length} mesas
                 </span>
               </div>
             </div>

            {/* Pestañas de Mesas */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 justify-center">
                {mesas.map(mesa => (
                  <div
                    key={mesa}
                    className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      mesaSeleccionada === mesa
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
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
                          title="Guardar"
                        >
                          ✅
                        </button>
                        <button
                          onClick={cancelarEdicionNombreMesa}
                          className="text-red-300 hover:text-red-200 text-sm"
                          title="Cancelar"
                        >
                          ❌
                        </button>
                      </div>
                    ) : (
                      // Modo visualización
                      <>
                        <button
                          onClick={() => setMesaSeleccionada(mesa)}
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
                          className={`text-xs hover:scale-110 transition-all duration-200 ${
                            mesaSeleccionada === mesa
                              ? 'text-blue-200 hover:text-blue-100'
                              : 'text-blue-400 hover:text-blue-300'
                          }`}
                          title="Editar nombre de mesa"
                        >
                          ✏️
                        </button>
                        
                        {/* Botón de eliminar mesa */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarMesa(mesa);
                          }}
                          className={`ml-1 text-xs hover:scale-110 transition-all duration-200 ${
                            mesaSeleccionada === mesa
                              ? 'text-red-200 hover:text-red-100'
                              : 'text-red-400 hover:text-red-300'
                          }`}
                          title="Eliminar mesa"
                        >
                          ❌
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

                         {/* Contenido de la Mesa Seleccionada */}
             {mesaSeleccionada && (
               <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">
                  🪑 {mesaSeleccionada}
                </h3>
                
                {(!productosPorMesa[mesaSeleccionada] || productosPorMesa[mesaSeleccionada].length === 0) ? (
                  <p className="text-gray-400 text-center py-6">No hay productos en esta mesa</p>
                ) : (
                  <div className="space-y-4">
                    {/* Controles de selección para cocina */}
                    <div className="bg-orange-500/10 backdrop-blur-sm rounded-lg p-3 border border-orange-400/30 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-300 text-sm font-medium">🍳 Seleccionar para Cocina:</span>
                          <span className="text-orange-200 text-xs">
                            ({(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length} de {productosPorMesa[mesaSeleccionada].length})
                          </span>
                        </div>
                        <button
                          onClick={() => toggleSeleccionarTodosParaCocina(mesaSeleccionada)}
                          className="text-orange-300 hover:text-orange-200 text-xs font-medium underline"
                        >
                          {(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length === productosPorMesa[mesaSeleccionada].length
                            ? '❌ Deseleccionar todos'
                            : '✅ Seleccionar todos'}
                        </button>
                      </div>
                    </div>

                    {/* Controles de selección para pago */}
                    <div className="bg-green-500/10 backdrop-blur-sm rounded-lg p-3 border border-green-400/30 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-green-300 text-sm font-medium">💰 Seleccionar para Pago:</span>
                          <span className="text-green-200 text-xs">
                            ({(productosSeleccionadosParaPago[mesaSeleccionada] || []).length} de {productosPorMesa[mesaSeleccionada].length})
                          </span>
                        </div>
                        <button
                          onClick={() => toggleSeleccionarTodosParaPago(mesaSeleccionada)}
                          className="text-green-300 hover:text-green-200 text-xs font-medium underline"
                        >
                          {(productosSeleccionadosParaPago[mesaSeleccionada] || []).length === productosPorMesa[mesaSeleccionada].length
                            ? '❌ Deseleccionar todos'
                            : '✅ Seleccionar todos'}
                        </button>
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
                            className={`flex items-center justify-between py-3 px-2 transition-all duration-200 ${
                              estaSeleccionadoPago 
                                ? 'bg-green-500/20 border border-green-400/50 rounded-lg shadow-lg' 
                                : estaSeleccionadoCocina
                                ? 'bg-orange-500/20 border border-orange-400/50 rounded-lg shadow-lg'
                                : ''
                            }`}
                          >
                            {/* Checkbox para Cocina (a la izquierda) */}
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="checkbox"
                                checked={estaSeleccionadoCocina}
                                onChange={() => toggleSeleccionProductoCocina(mesaSeleccionada, producto.id)}
                                className="w-4 h-4 text-orange-600 bg-white/10 border-orange-400 rounded focus:ring-orange-500 focus:ring-1 cursor-pointer"
                                title="Enviar a cocina"
                              />
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-medium">{producto.producto}</p>
                                  {/* Campo de comentarios */}
                                  <input
                                    type="text"
                                    value={producto.comentarios || ''}
                                    onChange={(e) => actualizarComentariosProducto(mesaSeleccionada, producto.id, e.target.value)}
                                    onBlur={(e) => {
                                      // Guardar en Supabase solo cuando termina de escribir (sincronización multi-dispositivo)
                                      const comentariosUpper = e.target.value.toUpperCase();
                                      guardarComentariosEnSupabase(producto.id, comentariosUpper);
                                    }}
                                    className="flex-1 max-w-xs px-2 py-1 rounded border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                    placeholder="Comentarios..."
                                    style={{ textTransform: 'uppercase' }}
                                  />
                                </div>
                                <p className="text-gray-300 text-sm">
                                  {producto.cantidad} {producto.unidad} - ${parseFloat(producto.precio_unitario).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            {/* Checkbox para Pago y valores (a la derecha) */}
                            <div className="flex items-center gap-3">
                              {/* Checkbox para Pago */}
                              <input
                                type="checkbox"
                                checked={estaSeleccionadoPago}
                                onChange={() => toggleSeleccionProductoPago(mesaSeleccionada, producto.id)}
                                className="w-4 h-4 text-green-600 bg-white/10 border-green-400 rounded focus:ring-green-500 focus:ring-1 cursor-pointer"
                                title="Seleccionar para pago"
                              />
                              <span className="text-green-400 font-bold">
                                ${parseFloat(producto.subtotal).toLocaleString()}
                              </span>
                              <button
                                onClick={() => eliminarProducto(mesaSeleccionada, producto.id)}
                                className="text-red-400 hover:text-red-300 text-lg"
                                title="Eliminar producto"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                                                               {/* Resumen de la mesa */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                       <div className="flex justify-between items-center mb-3">
                         <div className="text-white">
                           <span className="font-medium">
                             {((productosSeleccionadosParaPago[mesaSeleccionada] || []).length > 0 
                               ? `Productos Seleccionados: ${(productosSeleccionadosParaPago[mesaSeleccionada] || []).length} / ${productosPorMesa[mesaSeleccionada].length}`
                               : `Total de Productos: ${productosPorMesa[mesaSeleccionada].length}`)}
                           </span>
                         </div>
                         <div className="text-green-400 font-bold text-lg">
                           Subtotal: ${calcularTotalMesa(mesaSeleccionada).toLocaleString()}
                         </div>
                       </div>
                       
                       {/* Campo de Propina */}
                       <div className="flex items-center justify-between mb-3 p-3 bg-white/5 rounded-lg border border-white/10">
                         <div className="flex items-center gap-3">
                           <input
                             type="checkbox"
                             checked={propinaActiva}
                             onChange={(e) => setPropinaActiva(e.target.checked)}
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
                               onChange={(e) => setPorcentajePropina(parseFloat(e.target.value) || 0)}
                               className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-center text-xs"
                             />
                             <span className="text-white text-xs">%</span>
                           </div>
                         )}
                       </div>
                       
                       {/* Mostrar propina si está activa */}
                       {propinaActiva && (
                         <div className="flex justify-between items-center mb-3 text-sm">
                           <span className="text-gray-300">Propina ({porcentajePropina}%):</span>
                           <span className="text-yellow-400 font-medium">
                             ${calcularPropina(mesaSeleccionada).toLocaleString()}
                           </span>
                         </div>
                       )}
                       
                       {/* Total Final */}
                       <div className="flex justify-between items-center pt-3 border-t border-white/20">
                         <span className="text-white font-medium">Total Mesa:</span>
                         <div className="text-green-400 font-bold text-lg">
                           ${calcularTotalConPropina(mesaSeleccionada).toLocaleString()}
                         </div>
                       </div>
                      
                                             {/* Estado del pedido */}
                       <div className="mt-3 flex items-center gap-3">
                         <span className="text-white text-sm">Estado:</span>
                         <select
                           onChange={(e) => cambiarEstadoPedido(mesaSeleccionada, e.target.value)}
                           className="px-2 py-1 rounded text-xs bg-white/10 text-white border border-white/20"
                           defaultValue="pagado"
                         >
                           <option value="pagado">✅ Pagado</option>
                         </select>
                       </div>
                      
                      {/* Tipo de Pago - Solo visible cuando hay productos */}
                      <div className="mt-4 pt-3 border-t border-white/20">
                        <h4 className="text-white font-medium mb-3 text-center">💳 Método de Pago</h4>
                                                 <div className="grid grid-cols-3 gap-2">
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
                              <div className="text-green-400 text-lg mb-1">💵</div>
                              <p className="font-medium text-sm">Efectivo</p>
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
                              <div className="text-blue-400 text-lg mb-1">💳</div>
                              <p className="font-medium text-sm">Débito</p>
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
                            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                              pedido.tipo_pago === 'transferencia' 
                                ? 'bg-green-600 border-green-500 text-white' 
                                : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-purple-400 text-lg mb-1">📱</div>
                              <p className="font-medium text-sm">Transferencia</p>
                            </div>
                          </button>
                        </div>

                        {/* Campo de Monto Pagado - Solo visible cuando se selecciona Efectivo */}
                        {pedido.tipo_pago === 'efectivo' && (
                          <div className="mt-4 pt-3 border-t border-white/20">
                            <label className="block text-white text-sm font-medium mb-2 text-center">
                              💰 Monto Pagado
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={montoPagado}
                              onChange={(e) => {
                                setMontoPagado(e.target.value);
                                setMostrarVuelto(e.target.value !== '');
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm text-center"
                              placeholder="Ingresa el monto recibido..."
                            />
                          </div>
                        )}

                        {/* Mostrar el vuelto */}
                        {mostrarVuelto && montoPagado && pedido.tipo_pago === 'efectivo' && (
                          <div className="mt-4">
                            <label className="block text-blue-100 text-xs md:text-sm mb-2 text-center">
                              Vuelto a entregar:
                            </label>
                            <div className={`${calcularVuelto() >= 0 ? 'bg-green-500/20 border-green-400/50' : 'bg-red-500/20 border-red-400/50'} border rounded-lg p-4 text-center`}>
                              <p className={`${calcularVuelto() >= 0 ? 'text-green-300' : 'text-red-300'} text-2xl md:text-3xl font-bold`}>
                                {calcularVuelto() >= 0 ? (
                                  `$${calcularVuelto().toLocaleString('es-CL')}`
                                ) : (
                                  `Falta: $${Math.abs(calcularVuelto()).toLocaleString('es-CL')}`
                                )}
                              </p>
                              {calcularVuelto() < 0 && (
                                <p className="text-red-200 text-xs md:text-sm mt-2">
                                  ⚠️ El monto pagado es insuficiente
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

                         {/* Botones de Acción: Enviar a Cocina y Registrar Pedido */}
             {mesaSeleccionada && productosPorMesa[mesaSeleccionada] && productosPorMesa[mesaSeleccionada].length > 0 && (
               <div className="text-center mt-6 space-y-4">
                 {/* Botón NUEVO: Enviar a Cocina (SOLO PRODUCTOS SELECCIONADOS) */}
                 <div>
                   <button
                     onClick={() => enviarACocina(mesaSeleccionada)}
                     disabled={enviandoACocina || (productosSeleccionadosParaCocina[mesaSeleccionada] || []).length === 0}
                     className={`font-bold py-3 px-8 rounded-lg transition-all duration-300 transform text-lg shadow-lg ${
                       enviandoACocina || (productosSeleccionadosParaCocina[mesaSeleccionada] || []).length === 0
                         ? 'bg-gray-600 cursor-not-allowed scale-100'
                         : 'bg-orange-600 hover:bg-orange-700 hover:scale-105'
                     } text-white`}
                   >
                     {enviandoACocina 
                       ? '⏳ Enviando a cocina...' 
                       : `🍳 Enviar ${(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length > 0 
                           ? `(${(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length}) ` 
                           : ''}a Cocina`
                     }
                   </button>
                   <p className={`text-sm mt-2 ${
                     (productosSeleccionadosParaCocina[mesaSeleccionada] || []).length === 0 
                       ? 'text-orange-400' 
                       : 'text-gray-400'
                   }`}>
                     {(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length === 0
                       ? '⚠️ Selecciona al menos un producto para enviar a cocina'
                       : `Enviará ${(productosSeleccionadosParaCocina[mesaSeleccionada] || []).length} producto(s) seleccionado(s) a cocina`
                     }
                   </p>
                 </div>

                 {/* Botón EXISTENTE: Registrar Pedido (para pago) */}
                 <div>
                   <button
                     onClick={() => registrarPedido(mesaSeleccionada)}
                     disabled={(productosSeleccionadosParaPago[mesaSeleccionada] || []).length === 0}
                     className={`font-bold py-3 px-8 rounded-lg transition-all duration-300 transform text-lg shadow-lg ${
                       (productosSeleccionadosParaPago[mesaSeleccionada] || []).length === 0
                         ? 'bg-gray-600 cursor-not-allowed scale-100'
                         : 'bg-green-600 hover:bg-green-700 hover:scale-105'
                     } text-white`}
                   >
                     💳 Registrar Pago de {((productosSeleccionadosParaPago[mesaSeleccionada] || []).length > 0 
                       ? `(${(productosSeleccionadosParaPago[mesaSeleccionada] || []).length}) ` 
                       : '')}{mesaSeleccionada}
                   </button>
                   <p className="text-gray-400 text-sm mt-2">
                     {((productosSeleccionadosParaPago[mesaSeleccionada] || []).length > 0
                       ? `Registrará ${(productosSeleccionadosParaPago[mesaSeleccionada] || []).length} producto(s) seleccionado(s)`
                       : '⚠️ Selecciona al menos un producto para pagar')}
                   </p>
                 </div>
               </div>
                           )}
           </div>

           {/* Tabla de Pedidos Registrados */}
           <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mt-6">
                           <div className="mb-6">
               <h2 className="text-xl md:text-2xl font-bold text-green-400 text-center mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Pedidos Registrados
                </h2>
                
                {/* Filtros */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <h3 className="text-green-400 font-medium mb-3 text-center">Filtros</h3>
                                     <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                     {/* Filtro por Fecha Específica */}
                     <div>
                      <label className="block text-white text-xs mb-1">Fecha</label>
                       <input
                         type="date"
                         value={filtroFecha}
                         onChange={(e) => setFiltroFecha(e.target.value)}
                         className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                       />
                     </div>

                    {/* Filtro por Mes */}
                    <div>
                     <label className="block text-white text-xs mb-1">Mes</label>
                      <select
                        value={filtroMes}
                        onChange={(e) => setFiltroMes(e.target.value)}
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
                         onChange={(e) => setFiltroAnio(e.target.value)}
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
                        
                        return (
                          <Fragment key={index}>
                            <tr 
                              className={`hover:bg-white/5 transition-colors ${
                                index > 0 && pedidosFiltrados[index - 1] && pedidosFiltrados[index - 1].total_final ? 'border-t-2 border-white/20' : ''
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
                                    <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs">
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
                                    <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs">
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
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Total final"
                                  />
                                ) : (
                                  pedido.total_final ? (
                                    <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded font-bold text-sm">
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
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      pedido.tipo_pago === 'efectivo' 
                                        ? 'bg-green-600/20 text-green-300' 
                                        : pedido.tipo_pago === 'debito'
                                        ? 'bg-blue-600/20 text-blue-300'
                                        : 'bg-purple-600/20 text-purple-300'
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
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      pedido.estado === 'pagado' 
                                        ? 'bg-green-600/20 text-green-300' 
                                        : 'bg-gray-600/20 text-gray-300'
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
                                      className="text-white hover:text-gray-300 text-lg transition-colors"
                                      title="Eliminar pedido"
                                    >
                                      🗑️
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
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>
       
       {/* Footer */}
       {!pantallaCompleta && <Footer />}
     </div>
   );
 }
