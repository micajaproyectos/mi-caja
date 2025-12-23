import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { obtenerFechaHoyChile } from '../lib/dateUtils.js';
import Footer from './Footer';

function Autoservicio() {
  const navigate = useNavigate();

  // Estados para la venta
  const [venta, setVenta] = useState({
    fecha: obtenerFechaHoyChile(),
    tipo_pago: '',
    total_venta: 0,
  });

  // Estado para el producto actual que se está agregando
  const [productoActual, setProductoActual] = useState({
    producto: '',
    cantidad: '',
    unidad: '',
    precio_unitario: '',
    subtotal: 0,
  });

  // Estado para la lista de productos de la venta
  const [productosVenta, setProductosVenta] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para búsqueda de productos del inventario
  const [productosInventario, setProductosInventario] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  
  // Refs y estado para el portal del dropdown
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Estado para navegación por teclado
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1);
  
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

  // Estados para ventas registradas de autoservicio
  const [ventasRegistradas, setVentasRegistradas] = useState([]);
  const [ventasFiltradas, setVentasFiltradas] = useState([]);

  // Estados para filtros
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroTipoPago, setFiltroTipoPago] = useState('');

  // Estado para controlar la cantidad de ventas mostradas
  const [ventasMostradas, setVentasMostradas] = useState(10);

  // Estados para edición inline
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEdicion, setValoresEdicion] = useState({
    fecha_cl: '',
    producto: '',
    cantidad: '',
    unidad: '',
    precio_unitario: '',
    total_venta: '',
    total_final: '',
    tipo_pago: ''
  });

  // Función para cargar productos del inventario
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

  // Función para filtrar productos según la búsqueda (excluyendo productos con unidad "kg")
  const filtrarProductos = (busqueda) => {
    if (!busqueda.trim()) {
      setProductosFiltrados([]);
      setDropdownAbierto(false);
      return;
    }

    const filtrados = productosInventario.filter(producto =>
      producto.producto.toLowerCase().includes(busqueda.toLowerCase()) &&
      producto.unidad && 
      producto.unidad.toLowerCase() !== 'kg'
    );
    setProductosFiltrados(filtrados);
    setDropdownAbierto(filtrados.length > 0);
  };

  // Función para seleccionar un producto del inventario
  const seleccionarProducto = (producto) => {
    // Cerrar dropdown inmediatamente
    setDropdownAbierto(false);
    setIndiceSeleccionado(-1);
    
    // Actualizar los estados
    setProductoActual({
      ...productoActual,
      producto: producto.producto,
      precio_unitario: producto.precio_venta.toString(),
      unidad: producto.unidad,
      subtotal: 0
    });
    
    setBusquedaProducto(producto.producto);
    setProductosFiltrados([]);
  };

  // 📷 Función para buscar producto por código de barras
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
        // Verificar que el producto no sea de unidad "kg" (excluido en autoservicio)
        if (data.unidad && data.unidad.toLowerCase() === 'kg') {
          alert('❌ Los productos con unidad "kg" no están disponibles en autoservicio');
          return;
        }

        // Completar el formulario con los datos del producto encontrado
        setProductoActual({
          ...productoActual,
          producto: data.producto,
          precio_unitario: data.precio_venta.toString(),
          unidad: data.unidad,
          subtotal: 0
        });
        setBusquedaProducto(data.producto);
        
        // Cerrar dropdown si está abierto
        setDropdownAbierto(false);
        setProductosFiltrados([]);
      }
    } catch (error) {
      console.error('Error inesperado al buscar producto por código:', error);
      alert('❌ Error inesperado al buscar el producto');
    }
  };

  // Función para manejar el cambio en la búsqueda de productos
  const manejarBusquedaProducto = (valor) => {
    setBusquedaProducto(valor);
    
    // Si se borra la búsqueda, limpiar todo
    if (!valor.trim()) {
      setProductosFiltrados([]);
      setDropdownAbierto(false);
      setIndiceSeleccionado(-1);
      setProductoActual({
        ...productoActual,
        producto: '',
        precio_unitario: '',
        unidad: '',
        subtotal: 0
      });
    } else {
      // 📷 Detectar si es un código de barras (8 dígitos para EAN-8, 13 para EAN-13)
      const esCodigoBarras = /^\d{8}$|^\d{13}$/.test(valor.trim());
      
      if (esCodigoBarras) {
        // Si es un código de barras, buscar por código
        buscarProductoPorCodigo(valor.trim());
        setDropdownAbierto(false);
        setIndiceSeleccionado(-1);
      } else {
        // Si no es código de barras, buscar por nombre (comportamiento normal)
        // Resetear índice al cambiar búsqueda
        setIndiceSeleccionado(-1);
        
        // Calcular posición del dropdown SOLO si no está visible
        if (!dropdownAbierto && searchInputRef.current) {
          const rect = searchInputRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width
          });
        }
        
        // Filtrar productos por nombre
        filtrarProductos(valor);
      }
    }
  };

  // Función para calcular el subtotal cuando cambia cantidad o precio
  const calcularSubtotal = () => {
    const cantidad = parseFloat(productoActual.cantidad) || 0;
    const precio = parseFloat(productoActual.precio_unitario) || 0;
    const subtotal = cantidad * precio;
    setProductoActual(prev => ({ ...prev, subtotal }));
  };

  // Función para agregar producto a la venta
  const agregarProducto = () => {
    if (!productoActual.producto || !productoActual.cantidad || !productoActual.precio_unitario) {
      alert('Por favor completa todos los campos del producto');
      return;
    }

    const nuevoProducto = {
      ...productoActual,
      cantidad: parseFloat(productoActual.cantidad),
      precio_unitario: parseFloat(productoActual.precio_unitario),
      subtotal: parseFloat(productoActual.cantidad) * parseFloat(productoActual.precio_unitario)
    };

    setProductosVenta([...productosVenta, nuevoProducto]);
    
    // Limpiar el producto actual y la búsqueda
    setProductoActual({
      producto: '',
      cantidad: '',
      unidad: '',
      precio_unitario: '',
      subtotal: 0,
    });
    setBusquedaProducto('');
    setProductosFiltrados([]);
    setDropdownAbierto(false);
    setIndiceSeleccionado(-1);
  };

  // Función para eliminar producto de la venta
  const eliminarProducto = (index) => {
    const nuevosProductos = productosVenta.filter((_, i) => i !== index);
    setProductosVenta(nuevosProductos);
  };

  // Función para calcular el total de la venta
  const calcularTotal = () => {
    return productosVenta.reduce((total, producto) => total + producto.subtotal, 0);
  };

  // Función para registrar la venta en Supabase
  const registrarVenta = async () => {
    // Validar que todos los campos requeridos estén llenos
    if (!venta.tipo_pago) {
      alert('❌ Por favor selecciona una forma de pago');
      return;
    }

    // Validar que haya al menos un producto
    if (productosVenta.length === 0) {
      alert('❌ Por favor agrega al menos un producto a la venta');
      return;
    }

    // Obtener el usuario_id del usuario autenticado
    const usuarioId = await authService.getCurrentUserId();
    if (!usuarioId) {
      alert('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    setLoading(true);

    try {
      // Calcular el total final de la venta (suma de todos los subtotales)
      const totalFinal = calcularTotal();
      
      // Registrar cada producto como una venta individual
      for (let i = 0; i < productosVenta.length; i++) {
        const producto = productosVenta[i];
        const ventaParaInsertar = {
          fecha: venta.fecha,
          tipo_pago: venta.tipo_pago,
          producto: producto.producto,
          cantidad: parseFloat(producto.cantidad) || 0,
          unidad: producto.unidad,
          precio_unitario: parseFloat(producto.precio_unitario) || 0,
          total_venta: parseFloat(producto.subtotal) || 0,
          // Solo incluir total_final en la primera fila (i === 0)
          total_final: i === 0 ? totalFinal : null,
          // Marcar como venta de autoservicio
          autoservicio: 'autoservicio',
          // Agregar el usuario_id del usuario autenticado
          usuario_id: usuarioId,
        };

        const { error } = await supabase
          .from('ventas')
          .insert([ventaParaInsertar]);

        if (error) {
          console.error('❌ Error al registrar producto:', error);
          alert('❌ Error al registrar venta: ' + error.message);
          return;
        }
      }

      alert(`✅ Venta registrada correctamente con ${productosVenta.length} productos. Total: $${totalFinal.toLocaleString()}`);
      
      // Limpiar el formulario
      setVenta({
        fecha: obtenerFechaHoyChile(),
        tipo_pago: '',
        total_venta: 0,
      });
      setProductoActual({
        producto: '',
        cantidad: '',
        unidad: '',
        precio_unitario: '',
        subtotal: 0,
      });
      setProductosVenta([]);
      setBusquedaProducto('');
      setProductosFiltrados([]);
      setDropdownAbierto(false);
      setIndiceSeleccionado(-1);
      
      // Recargar la lista de ventas de autoservicio
      await cargarVentas();
      
    } catch (error) {
      console.error('❌ Error general al registrar venta:', error);
      alert('❌ Error al registrar venta: ' + error.message);
    } finally {
      setLoading(false);
    }
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

  // Función para mostrar fecha en formato DD-MM-YYYY
  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'Sin fecha';
    // Extraer solo la parte de fecha (YYYY-MM-DD) si tiene timestamp
    const fechaSolo = fechaString.split('T')[0];
    // Separar componentes y reorganizar a DD-MM-YYYY
    const [year, month, day] = fechaSolo.split('-');
    return `${day}-${month}-${year}`;
  };

  // Función para normalizar fecha (extraer solo YYYY-MM-DD)
  const normalizarFecha = (fechaString) => {
    if (!fechaString) return null;
    // Extraer solo la parte de fecha (YYYY-MM-DD) eliminando hora si existe
    return fechaString.split('T')[0];
  };

  // Función para filtrar ventas de autoservicio
  const filtrarVentas = () => {
    let ventasFiltradas = [...ventasRegistradas];
    const fechaActual = obtenerFechaHoyChile();

    // Si no hay filtros activos, mostrar solo las ventas del día actual
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago) {
      ventasFiltradas = ventasFiltradas.filter(venta => {
        const fechaVenta = normalizarFecha(venta.fecha_cl || venta.fecha);
        return fechaVenta === fechaActual;
      });
    } else {
      // Filtrar por día específico (si se selecciona)
      if (filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = normalizarFecha(venta.fecha_cl || venta.fecha);
          return fechaVenta === filtroDia;
        });
      }

      // Filtrar por mes (si se selecciona)
      if (filtroMes && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          let fechaVenta = normalizarFecha(venta.fecha_cl || venta.fecha);
          
          if (!fechaVenta && venta.created_at) {
            fechaVenta = normalizarFecha(venta.created_at);
          }
          
          if (!fechaVenta) return false;
          
          const [year, month] = fechaVenta.split('-');
          const mesVenta = parseInt(month);
          const mesFiltro = parseInt(filtroMes);
          return mesVenta === mesFiltro;
        });
      }

      // Filtrar por año (si se selecciona)
      if (filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          let fechaVenta = normalizarFecha(venta.fecha_cl || venta.fecha);
          
          if (!fechaVenta && venta.created_at) {
            fechaVenta = normalizarFecha(venta.created_at);
          }
          
          if (!fechaVenta) return false;
          const year = fechaVenta.split('-')[0];
          return parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Si hay mes y año seleccionados (sin día específico)
      if (filtroMes && filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          let fechaVenta = normalizarFecha(venta.fecha_cl || venta.fecha);
          
          if (!fechaVenta && venta.created_at) {
            fechaVenta = normalizarFecha(venta.created_at);
          }
          
          if (!fechaVenta) return false;
          const [year, month] = fechaVenta.split('-');
          return parseInt(month) === parseInt(filtroMes) && 
                 parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Filtrar por tipo de pago (si se selecciona)
      if (filtroTipoPago) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          return venta.tipo_pago === filtroTipoPago;
        });
      }
    }

    setVentasFiltradas(ventasFiltradas);
  };

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroDia('');
    setFiltroMes('');
    setFiltroAnio('');
    setFiltroTipoPago('');
  };

  // Función para cargar ventas de autoservicio
  const cargarVentas = async () => {
    setLoading(true);
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setVentasRegistradas([]);
        return;
      }

      // Consultar solo ventas de autoservicio
      let { data, error } = await supabase
        .from('ventas')
        .select('id, fecha, fecha_cl, producto, cantidad, unidad, precio_unitario, tipo_pago, total_venta, total_final, usuario_id, created_at, autoservicio')
        .eq('usuario_id', usuarioId)
        .eq('autoservicio', 'autoservicio') // 🔒 SOLO VENTAS DE AUTOSERVICIO
        .order('fecha_cl', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error al cargar ventas de autoservicio:', error);
        setVentasRegistradas([]);
      } else {
        setVentasRegistradas(data || []);
      }
    } catch (error) {
      console.error('❌ Error general al cargar ventas de autoservicio:', error);
      setVentasRegistradas([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar una venta de autoservicio
  const eliminarVenta = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta venta de autoservicio? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }
      
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId)
        .eq('autoservicio', 'autoservicio'); // 🔒 SEGURIDAD: Solo eliminar ventas de autoservicio del usuario actual

      if (error) {
        console.error('❌ Error al eliminar venta de autoservicio:', error);
        alert('❌ Error al eliminar la venta: ' + error.message);
        return;
      }

      alert('✅ Venta de autoservicio eliminada exitosamente');
      
      // Recargar la lista de ventas
      await cargarVentas();
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar venta de autoservicio:', error);
      alert('❌ Error inesperado al eliminar la venta');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener años únicos de las ventas
  const obtenerAniosUnicos = () => {
    const anios = new Set();
    
    // Solo incluir el año 2025 por defecto
    anios.add(2025);
    
    // Solo agregar años FUTUROS (posteriores a 2025) si hay ventas en esos años
    ventasRegistradas.forEach(venta => {
      const fechaVenta = venta.fecha_cl || venta.fecha;
      if (fechaVenta) {
        const anio = parseInt(fechaVenta.split('-')[0]);
        // Solo agregar si es un año futuro (mayor a 2025)
        if (!isNaN(anio) && anio > 2025) {
          anios.add(anio);
        }
      }
    });
    
    // Ordenar de mayor a menor
    return Array.from(anios).sort((a, b) => b - a);
  };

  // Función para obtener las ventas que se deben mostrar
  const obtenerVentasAMostrar = () => {
    return ventasFiltradas.slice(0, ventasMostradas);
  };

  // Función para mostrar todas las ventas
  const mostrarTodasLasVentas = () => {
    setVentasMostradas(ventasFiltradas.length);
  };

  // Función para obtener todos los meses del año
  const obtenerMesesUnicos = () => {
    const meses = [];
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    for (let i = 1; i <= 12; i++) {
      meses.push({
        value: i,
        month: i,
        label: nombresMeses[i - 1]
      });
    }
    return meses;
  };

  // Opciones de tipo de pago
  const opcionesTipoPago = [
    { value: 'debito', label: 'Débito', icon: '💳' },
    { value: 'transferencia', label: 'Transferencia', icon: '📱' }
  ];

  // Función para obtener la información del tipo de pago
  const obtenerInfoTipoPago = (valor) => {
    const opcion = opcionesTipoPago.find(op => op.value === valor);
    return opcion || { value: valor, label: valor, icon: '❓' };
  };

  // Función para exportar datos filtrados
  const exportarDatosFiltrados = () => {
    if (ventasFiltradas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Crear contenido CSV
    const headers = ['Fecha', 'Producto', 'Cantidad', 'Unidad', 'Precio Unitario', 'Total Venta', 'Total Final', 'Tipo Pago', 'Autoservicio'];
    const csvContent = [
      headers.join(','),
      ...ventasFiltradas.map(venta => [
        formatearFecha(venta.fecha_cl || venta.fecha),
        venta.producto,
        venta.cantidad,
        venta.unidad,
        venta.precio_unitario,
        venta.total_venta,
        venta.total_final || '',
        venta.tipo_pago,
        venta.autoservicio || 'autoservicio'
      ].join(','))
    ].join('\n');

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas_autoservicio_${obtenerFechaHoyChile()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para calcular resumen de ventas de autoservicio
  const calcularResumenVentas = () => {
    if (ventasFiltradas.length === 0) {
      return {
        totalGeneral: 0,
        totalDebito: 0,
        totalTransferencia: 0,
        cantidadDebito: 0,
        cantidadTransferencia: 0,
        totalVentas: 0,
        totalProductos: 0,
        promedioVenta: 0,
        distribucionDebito: 0,
        distribucionTransferencia: 0
      };
    }

    // Filtrar solo ventas con total_final (ventas completas)
    const ventasCompletas = ventasFiltradas.filter(venta => 
      venta.total_final && 
      venta.total_final !== null && 
      venta.total_final !== '' &&
      (venta.tipo_pago === 'debito' || venta.tipo_pago === 'transferencia')
    );

    // Calcular totales por tipo de pago
    let totalDebito = 0;
    let totalTransferencia = 0;
    let cantidadDebito = 0;
    let cantidadTransferencia = 0;

    ventasCompletas.forEach(venta => {
      const total = parseFloat(venta.total_final) || 0;
      if (venta.tipo_pago === 'debito') {
        totalDebito += total;
        cantidadDebito++;
      } else if (venta.tipo_pago === 'transferencia') {
        totalTransferencia += total;
        cantidadTransferencia++;
      }
    });

    const totalGeneral = totalDebito + totalTransferencia;
    const totalVentas = cantidadDebito + cantidadTransferencia;
    const totalProductos = ventasFiltradas.length;
    const promedioVenta = totalVentas > 0 ? totalGeneral / totalVentas : 0;
    
    // Calcular distribución porcentual
    const distribucionDebito = totalGeneral > 0 ? (totalDebito / totalGeneral) * 100 : 0;
    const distribucionTransferencia = totalGeneral > 0 ? (totalTransferencia / totalGeneral) * 100 : 0;

    return {
      totalGeneral,
      totalDebito,
      totalTransferencia,
      cantidadDebito,
      cantidadTransferencia,
      totalVentas,
      totalProductos,
      promedioVenta,
      distribucionDebito,
      distribucionTransferencia
    };
  };

  // Función para iniciar edición de una venta
  const iniciarEdicion = (venta) => {
    setEditandoId(venta.id);
    setValoresEdicion({
      fecha_cl: venta.fecha_cl || venta.fecha || '',
      producto: venta.producto || '',
      cantidad: venta.cantidad || '',
      unidad: venta.unidad || '',
      precio_unitario: venta.precio_unitario || '',
      total_venta: venta.total_venta || '',
      total_final: venta.total_final || '',
      tipo_pago: venta.tipo_pago || ''
    });
  };

  // Función para cancelar edición
  const cancelarEdicion = () => {
    setEditandoId(null);
    setValoresEdicion({
      fecha_cl: '',
      producto: '',
      cantidad: '',
      unidad: '',
      precio_unitario: '',
      total_venta: '',
      total_final: '',
      tipo_pago: ''
    });
  };

  // Función para guardar cambios de edición
  const guardarEdicion = async () => {
    if (!editandoId) return;

    try {
      setLoading(true);
      
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      // Calcular nuevo total_venta si cambió cantidad o precio
      const nuevaCantidad = parseFloat(valoresEdicion.cantidad) || 0;
      const nuevoPrecio = parseFloat(valoresEdicion.precio_unitario) || 0;
      const nuevoTotalVenta = nuevaCantidad * nuevoPrecio;

      const datosActualizados = {
        fecha_cl: valoresEdicion.fecha_cl,
        producto: valoresEdicion.producto,
        cantidad: nuevaCantidad,
        unidad: valoresEdicion.unidad,
        precio_unitario: nuevoPrecio,
        total_venta: nuevoTotalVenta,
        total_final: valoresEdicion.total_final,
        tipo_pago: valoresEdicion.tipo_pago
      };

      const { error } = await supabase
        .from('ventas')
        .update(datosActualizados)
        .eq('id', editandoId)
        .eq('usuario_id', usuarioId)
        .eq('autoservicio', 'autoservicio'); // 🔒 SEGURIDAD: Solo editar ventas de autoservicio del usuario actual

      if (error) {
        console.error('❌ Error al actualizar venta de autoservicio:', error);
        alert('❌ Error al actualizar la venta: ' + error.message);
        return;
      }

      alert('✅ Venta de autoservicio actualizada exitosamente');
      
      // Recargar la lista de ventas
      await cargarVentas();
      
      // Cancelar edición
      cancelarEdicion();
      
    } catch (error) {
      console.error('❌ Error inesperado al actualizar venta de autoservicio:', error);
      alert('❌ Error inesperado al actualizar la venta');
    } finally {
      setLoading(false);
    }
  };

  // Cargar productos del inventario al montar el componente
  useEffect(() => {
    cargarProductosInventario();
    cargarVentas(); // Cargar también las ventas de autoservicio
  }, []);

  // Filtrar productos cuando cambia la búsqueda
  useEffect(() => {
    filtrarProductos(busquedaProducto);
  }, [busquedaProducto, productosInventario]);

  // Cerrar dropdown cuando se haga clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownAbierto && 
          !event.target.closest('[data-search-input]') && 
          !event.target.closest('[data-dropdown-portal]')) {
        setDropdownAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownAbierto]);

  // Navegación por teclado en el dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!dropdownAbierto || productosFiltrados.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setIndiceSeleccionado(prev => {
            const nuevoIndice = prev < productosFiltrados.length - 1 ? prev + 1 : prev;
            // Auto-scroll al elemento seleccionado
            setTimeout(() => {
              if (dropdownRef.current) {
                const items = dropdownRef.current.querySelectorAll('[data-dropdown-item]');
                if (items[nuevoIndice]) {
                  items[nuevoIndice].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }
            }, 0);
            return nuevoIndice;
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setIndiceSeleccionado(prev => {
            const nuevoIndice = prev > 0 ? prev - 1 : 0;
            // Auto-scroll al elemento seleccionado
            setTimeout(() => {
              if (dropdownRef.current) {
                const items = dropdownRef.current.querySelectorAll('[data-dropdown-item]');
                if (items[nuevoIndice]) {
                  items[nuevoIndice].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }
            }, 0);
            return nuevoIndice;
          });
          break;

        case 'Enter':
          e.preventDefault();
          if (indiceSeleccionado >= 0 && indiceSeleccionado < productosFiltrados.length) {
            seleccionarProducto(productosFiltrados[indiceSeleccionado]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setDropdownAbierto(false);
          setIndiceSeleccionado(-1);
          break;

        default:
          break;
      }
    };

    if (dropdownAbierto) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownAbierto, productosFiltrados, indiceSeleccionado]);

  // Recalcular posición del dropdown cuando se hace scroll o resize (con throttle)
  useEffect(() => {
    let throttleTimeout = null;
    
    const handleScrollResize = () => {
      // Throttle: solo ejecutar cada 100ms
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        if (dropdownAbierto && searchInputRef.current) {
          const rect = searchInputRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width
          });
        }
        throttleTimeout = null;
      }, 100);
    };

    if (dropdownAbierto) {
      window.addEventListener('scroll', handleScrollResize, { passive: true });
      window.addEventListener('resize', handleScrollResize, { passive: true });
    }
    
    return () => {
      window.removeEventListener('scroll', handleScrollResize);
      window.removeEventListener('resize', handleScrollResize);
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [dropdownAbierto]);

  // Calcular subtotal cuando cambian cantidad o precio
  useEffect(() => {
    calcularSubtotal();
  }, [productoActual.cantidad, productoActual.precio_unitario]);

  // Aplicar filtros cuando cambien los datos o filtros
  useEffect(() => {
    filtrarVentas();
  }, [ventasRegistradas, filtroDia, filtroMes, filtroAnio, filtroTipoPago]);

  // Resetear contador de ventas mostradas cuando cambien los filtros
  useEffect(() => {
    setVentasMostradas(10);
  }, [filtroDia, filtroMes, filtroAnio, filtroTipoPago]);

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




  return (
    <div className={`${pantallaCompleta ? 'fixed inset-0 z-50' : 'min-h-screen'}`} style={{ backgroundColor: '#1a3d1a' }}>
      {/* Notificación para dispositivos táctiles */}
      {notificacionTactil && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-orange-600/95 backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-lg border border-orange-400/30 max-w-sm text-center animate-bounce">
          <div className="flex items-center gap-2">
            <span>📱</span>
            <div className="text-sm">
              <div className="font-semibold">{obtenerInfoDispositivo().navegador} en {obtenerInfoDispositivo().tipo}</div>
              <div className="text-xs opacity-90">Los filtros pueden cerrar la pantalla completa</div>
            </div>
          </div>
        </div>
      )}
      <div className={`${pantallaCompleta ? 'h-full overflow-y-auto' : 'container mx-auto px-4 py-8'}`}>
        <div className={`${pantallaCompleta ? 'h-full px-4 py-4' : 'max-w-6xl mx-auto'}`}>
          {/* Botón Volver al Inicio */}
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

          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-white animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Autoservicio
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
            {!pantallaCompleta && (
              <p className="text-green-200 text-lg md:text-xl italic animate-fade-in-delayed">
                Atención autónoma para tus clientes
              </p>
            )}
          </div>

          {/* Formulario de Autoservicio */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4 md:space-y-6">
            {/* Sección de agregar producto */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
              <div className="flex items-center mb-4">
                <span className="text-blue-400 text-lg md:text-xl mr-2">🛒</span>
                <h3 className="text-blue-400 text-lg md:text-xl font-bold">Agregar Producto</h3>
              </div>
              
                {/* Campo de búsqueda de producto */}
                <div className="mb-4">
                  <input
                    ref={searchInputRef}
                    data-search-input
                    type="text"
                    value={busquedaProducto}
                    onChange={(e) => manejarBusquedaProducto(e.target.value)}
                    className="w-full px-3 md:px-4 py-3 md:py-4 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base transition-all duration-200"
                    placeholder="🔍 Nombre o código de barras..."
                  />
                </div>
                
                {/* Dropdown de productos filtrados - Portal */}
                {dropdownAbierto && productosFiltrados.length > 0 && createPortal(
                  <div 
                    ref={dropdownRef}
                    data-dropdown-portal
                    className="fixed z-[9999] bg-gray-900/95 border-2 border-blue-400/60 rounded-2xl shadow-2xl overflow-hidden"
                    style={{ 
                      top: dropdownPosition.top + 12,
                      left: dropdownPosition.left,
                      width: dropdownPosition.width
                    }}
                  >
                    {/* Hint de navegación por teclado */}
                    <div className="bg-blue-600/20 px-4 py-2 border-b border-blue-400/30">
                      <p className="text-blue-200 text-xs text-center">
                        <span className="font-semibold">💡 Tip:</span> Usa ↑↓ para navegar, Enter para seleccionar, Esc para cerrar
                      </p>
                    </div>
                    
                    {/* Lista de productos */}
                    <div className="max-h-80 overflow-y-auto">
                      {productosFiltrados.map((producto, index) => {
                        const estaSeleccionado = index === indiceSeleccionado;
                        
                        return (
                          <div
                            key={producto.id || index}
                            data-dropdown-item
                            onClick={() => seleccionarProducto(producto)}
                            className={`px-6 py-4 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors duration-150 ${
                              estaSeleccionado 
                                ? 'bg-blue-600/50 border-blue-400' 
                                : 'hover:bg-blue-600/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-white font-bold text-lg mb-1">
                                  {producto.producto}
                                  {estaSeleccionado && <span className="ml-2 text-yellow-300">←</span>}
                                </div>
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
                        );
                      })}
                    </div>
                  </div>,
                  document.body
                )}
                
                {/* Mensaje cuando no hay productos - Portal */}
                {dropdownAbierto && productosFiltrados.length === 0 && busquedaProducto.trim() && createPortal(
                  <div 
                    data-dropdown-portal
                    className="fixed z-[9999] bg-gray-900/95 border-2 border-blue-400/60 rounded-2xl shadow-2xl p-6"
                    style={{ 
                      top: dropdownPosition.top + 12,
                      left: dropdownPosition.left,
                      width: dropdownPosition.width
                    }}
                  >
                    <div className="text-center mb-4">
                      <div className="text-gray-300 text-lg mb-2">
                        No se encontraron productos con "<strong>{busquedaProducto}</strong>"
                      </div>
                      <div className="text-gray-400 text-sm">
                        Agrega el producto al inventario para poder usarlo aquí
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Redirigir al componente Inventario para agregar el producto
                        navigate('/inventario');
                      }}
                      className="w-full px-6 py-3 md:py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-300 text-sm md:text-base shadow-lg"
                    >
                      ➕ Agregar producto al Inventario
                    </button>
                  </div>,
                  document.body
                )}
                
                {/* Campos del producto - Responsive y adaptativo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2 text-xs md:text-sm">Unidad</label>
                    <select
                      name="unidad"
                      value={productoActual.unidad}
                      onChange={(e) => setProductoActual({ ...productoActual, unidad: e.target.value })}
                      className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                    >
                      <option value="">Seleccione unidad</option>
                      <option value="unidad">📦 unidad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2 text-xs md:text-sm">Cantidad</label>
                    <input
                      type="number"
                      step="0.01"
                      name="cantidad"
                      value={productoActual.cantidad}
                      onChange={(e) => setProductoActual({ ...productoActual, cantidad: e.target.value })}
                      className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2 text-xs md:text-sm">Precio</label>
                    <input
                      type="number"
                      step="0.01"
                      name="precio_unitario"
                      value={productoActual.precio_unitario}
                      onChange={(e) => setProductoActual({ ...productoActual, precio_unitario: e.target.value })}
                      className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={agregarProducto}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 md:py-3 px-3 md:px-4 rounded-lg transition-all duration-300 text-sm md:text-base shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      ➕ Agregar
                    </button>
                  </div>
                </div>
            </div>

            {/* Sección de productos en la venta - Compacta y horizontal */}
            <div className="mb-4 md:mb-6">
              <div className="flex items-center mb-2">
                <span className="text-blue-400 text-lg md:text-xl mr-2"></span>
                <h3 className="text-green-400 text-lg md:text-xl font-bold">Productos en la Venta</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
                {/* Lista de productos - Responsive y adaptativo */}
                <div className="lg:col-span-2">
                  <div className="rounded-lg p-2 md:p-3">
                    {productosVenta.length === 0 ? (
                      <p className="text-gray-400 text-center text-xs md:text-sm">No hay productos agregados</p>
                    ) : (
                      <div className="space-y-0.5">
                        {productosVenta.map((producto, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 backdrop-blur-sm rounded p-0.5 md:p-1 border border-white/10 hover:bg-white/10 transition-colors gap-0.5 sm:gap-1">
                            {/* Información del producto - Responsive */}
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-0.5 min-w-0">
                              {/* Nombre del producto */}
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-xs md:text-sm truncate" title={producto.producto}>
                                  {producto.producto}
                                </p>
                              </div>
                              
                              {/* Cantidad y unidad */}
                              <div className="flex items-center gap-0 text-gray-300 text-[10px] md:text-xs">
                                <span className="font-medium">{producto.cantidad}</span>
                                <span className="opacity-75">{producto.unidad}</span>
                              </div>
                              
                              {/* Precio unitario */}
                              <div className="text-gray-300 text-[10px] md:text-xs">
                                <span className="font-medium">${parseFloat(producto.precio_unitario).toLocaleString()}</span>
                              </div>
                            </div>
                            
                            {/* Subtotal y botón eliminar - Responsive */}
                            <div className="flex items-center justify-between sm:justify-end gap-0.5 sm:gap-1">
                              {/* Subtotal */}
                              <div className="text-left sm:text-right">
                                <div className="text-green-300 text-[10px] md:text-xs font-medium opacity-75">Subtotal</div>
                                <div className="text-green-400 text-xs md:text-sm font-bold">${parseFloat(producto.subtotal).toLocaleString()}</div>
                              </div>
                              
                              {/* Botón eliminar */}
                              <button
                                onClick={() => eliminarProducto(index)}
                                className="text-red-400 hover:text-red-300 text-[10px] md:text-xs font-bold flex-shrink-0 px-0.5 py-0.5 rounded hover:bg-red-600/20 transition-colors"
                                title="Eliminar producto"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Cuadro del total - ocupa 1/3 del espacio */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-md rounded-lg p-3 border border-green-500/30 shadow-lg h-full">
                    <div className="text-center mb-2">
                      <div className="text-green-300 text-base md:text-lg font-bold mb-1">💰 Total de la Venta</div>
                      <div className="text-green-100 text-xs md:text-sm">Resumen de productos</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                        <div className="text-green-200 text-xs font-medium mb-1">Cantidad de Items</div>
                        <div className="text-green-300 text-lg font-bold">{productosVenta.length}</div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                        <div className="text-green-200 text-xs font-medium mb-1">Total a Pagar</div>
                        <div className="text-green-300 text-xl font-bold">${calcularTotal().toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Sección de tipo de pago y botón registrar - Solo si hay productos */}
            {productosVenta.length > 0 && (
              <div className="mb-3 md:mb-4">
                <div className="flex items-center mb-2">
                  <span className="text-blue-400 text-lg md:text-xl mr-2">💳</span>
                  <h3 className="text-green-400 text-lg md:text-xl font-bold">Selecciona Forma de Pago</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-start sm:items-center">
                  {/* Botones de tipo de pago */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3 flex-1 max-w-md">
                    <button
                      type="button"
                      onClick={() => setVenta({...venta, tipo_pago: 'debito'})}
                      className={`px-6 py-4 md:px-8 md:py-5 rounded-lg border transition-all duration-200 text-base md:text-lg font-bold ${
                        venta.tipo_pago === 'debito' 
                          ? 'bg-green-600 border-green-500 text-white' 
                          : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-blue-400 text-lg md:text-xl mb-1">💳</div>
                        <p className="font-bold">Débito</p>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setVenta({...venta, tipo_pago: 'transferencia'})}
                      className={`px-6 py-4 md:px-8 md:py-5 rounded-lg border transition-all duration-200 text-base md:text-lg font-bold ${
                        venta.tipo_pago === 'transferencia' 
                          ? 'bg-green-600 border-green-500 text-white' 
                          : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-yellow-400 text-lg md:text-xl mb-1">📱</div>
                        <p className="font-bold">Transferencia</p>
                      </div>
                    </button>
                  </div>
                  
                  {/* Botón de registrar venta - Posicionado al lado */}
                  <div className="flex-1 flex justify-center sm:justify-end">
                    <button
                      type="button"
                      onClick={registrarVenta}
                      disabled={productosVenta.length === 0 || !venta.tipo_pago || loading}
                      className="px-6 py-4 md:px-8 md:py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold text-base md:text-lg rounded-lg transition-all duration-200 hover:scale-105 shadow-lg w-full sm:w-auto"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      {loading ? 'Procesando...' : '✅ Registrar Venta'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Sección de Ventas de Autoservicio Registradas */}
          <div className="mt-6 md:mt-8">
            <h2 className="text-2xl md:text-3xl font-bold text-green-400 text-center drop-shadow-lg mb-3 md:mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Ventas de Autoservicio Registradas
            </h2>
            
            {/* Filtros de fecha */}
            <div className="mb-3 md:mb-4 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-3 md:p-6 border border-white/20">
              <h3 className="text-lg md:text-xl font-semibold text-green-400 mb-3 md:mb-4 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Filtros de Fecha
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Filtro por día específico */}
                <div>
                  <label className="block text-gray-200 font-medium mb-1 md:mb-2 text-xs md:text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Día específico:
                  </label>
                  <input
                    type="date"
                    value={filtroDia}
                    onChange={(e) => setFiltroDia(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                  />
                </div>

                {/* Filtro por mes */}
                <div>
                  <label className="block text-gray-200 font-medium mb-1 md:mb-2 text-xs md:text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Mes:
                  </label>
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    style={{
                      colorScheme: 'dark'
                    }}
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los meses</option>
                    {obtenerMesesUnicos().map(mesObj => (
                      <option key={mesObj.value} value={mesObj.month} className="bg-gray-800 text-white">
                        {mesObj.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por año */}
                <div>
                  <label className="block text-gray-200 font-medium mb-1 md:mb-2 text-xs md:text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Año:
                  </label>
                  <select
                    value={filtroAnio}
                    onChange={(e) => setFiltroAnio(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    style={{
                      colorScheme: 'dark'
                    }}
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los años</option>
                    {obtenerAniosUnicos().map(anio => (
                      <option key={anio} value={anio} className="bg-gray-800 text-white">
                        {anio}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por tipo de pago */}
                <div>
                  <label className="block text-gray-200 font-medium mb-1 md:mb-2 text-xs md:text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Tipo de Pago:
                  </label>
                  <select
                    value={filtroTipoPago}
                    onChange={(e) => setFiltroTipoPago(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    style={{
                      colorScheme: 'dark'
                    }}
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los tipos</option>
                    {opcionesTipoPago.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800 text-white">
                        {opcion.icon} {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botón limpiar filtros */}
              <div className="mt-3 md:mt-4 flex justify-center">
                <button
                  onClick={limpiarFiltros}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  🧹 Limpiar Filtros
                </button>
              </div>

              {/* Información de filtros activos */}
              <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                <p className="text-blue-200 text-xs md:text-sm text-center">
                  {!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago ? (
                    <strong>Mostrando ventas de autoservicio del día actual</strong>
                  ) : (
                    <>
                      <strong>Filtros activos:</strong> 
                      {filtroDia && ` Día: ${(() => {
                        const [year, month, day] = filtroDia.split('-');
                        return `${day}/${month}/${year}`;
                      })()}`}
                      {filtroMes && ` Mes: ${obtenerMesesUnicos()[parseInt(filtroMes) - 1]?.label}`}
                      {filtroAnio && ` Año: ${filtroAnio}`}
                      {filtroTipoPago && ` Pago: ${obtenerInfoTipoPago(filtroTipoPago).icon} ${obtenerInfoTipoPago(filtroTipoPago).label}`}
                    </>
                  )}
                  {` | Mostrando ${ventasFiltradas.length} de ${ventasRegistradas.length} registros totales`}
                </p>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-3 md:p-6 border border-white/20">
              {loading ? (
                <div className="text-center py-6 md:py-8">
                  <div className="inline-block animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-white"></div>
                  <p className="text-gray-200 mt-2 text-sm md:text-base">Cargando ventas de autoservicio...</p>
                </div>
              ) : ventasFiltradas.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <p className="text-gray-200 text-base md:text-lg">
                    {ventasRegistradas.length === 0 
                      ? 'No hay ventas de autoservicio registradas aún' 
                      : !filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago
                        ? 'No hay ventas de autoservicio registradas hoy'
                        : 'No hay ventas que coincidan con los filtros seleccionados'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Tabla de ventas de autoservicio */}
                  <div className="max-h-96 overflow-y-auto border border-white/10 rounded-lg">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
                        <tr className="border-b border-white/20">
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Fecha</th>
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Producto</th>
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Cantidad</th>
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Precio</th>
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Total</th>
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Total Final</th>
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Pago</th>
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Autoservicio</th>
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const ventasAMostrar = obtenerVentasAMostrar();
                          return ventasAMostrar.map((venta, index) => (
                            <tr key={index} className={`hover:bg-white/5 transition-colors ${
                              venta.total_final ? 'border-b-2 border-white/20' : ''
                            }`}>
                              {/* Fecha */}
                              <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                {editandoId === venta.id ? (
                                  <input
                                    type="date"
                                    value={valoresEdicion.fecha_cl}
                                    onChange={(e) => setValoresEdicion({...valoresEdicion, fecha_cl: e.target.value})}
                                    className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  formatearFecha(venta.fecha_cl || venta.fecha)
                                )}
                              </td>

                              {/* Producto */}
                              <td className="text-gray-200 p-2 md:p-3 font-medium text-xs md:text-sm truncate max-w-20 md:max-w-32">
                                {editandoId === venta.id ? (
                                  <input
                                    type="text"
                                    value={valoresEdicion.producto}
                                    onChange={(e) => setValoresEdicion({...valoresEdicion, producto: e.target.value})}
                                    className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  venta.producto || 'Sin producto'
                                )}
                              </td>

                              {/* Cantidad */}
                              <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                {editandoId === venta.id ? (
                                  <div className="flex gap-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={valoresEdicion.cantidad}
                                      onChange={(e) => setValoresEdicion({...valoresEdicion, cantidad: e.target.value})}
                                      className="w-16 px-1 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    />
                                    <input
                                      type="text"
                                      value={valoresEdicion.unidad}
                                      onChange={(e) => setValoresEdicion({...valoresEdicion, unidad: e.target.value})}
                                      className="w-12 px-1 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    />
                                  </div>
                                ) : (
                                  `${!isNaN(venta.cantidad) ? venta.cantidad : '0'} ${venta.unidad || ''}`
                                )}
                              </td>

                              {/* Precio */}
                              <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                {editandoId === venta.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.precio_unitario}
                                    onChange={(e) => setValoresEdicion({...valoresEdicion, precio_unitario: e.target.value})}
                                    className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  `$${!isNaN(venta.precio_unitario) ? parseFloat(venta.precio_unitario).toLocaleString() : '0'}`
                                )}
                              </td>

                              {/* Total */}
                              <td className="text-green-300 p-2 md:p-3 font-bold text-xs md:text-sm">
                                {editandoId === venta.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.total_venta}
                                    onChange={(e) => setValoresEdicion({...valoresEdicion, total_venta: e.target.value})}
                                    className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-green-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  `$${!isNaN(venta.total_venta) ? parseFloat(venta.total_venta).toLocaleString() : '0'}`
                                )}
                              </td>

                              {/* Total Final */}
                              <td className="text-blue-300 p-2 md:p-3 font-bold text-xs md:text-sm">
                                {editandoId === venta.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.total_final}
                                    onChange={(e) => setValoresEdicion({...valoresEdicion, total_final: e.target.value})}
                                    className="w-full px-2 py-1 rounded border border-white/20 bg-white/10 text-blue-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  venta.total_final ? `$${parseFloat(venta.total_final).toLocaleString()}` : '-'
                                )}
                              </td>

                              {/* Tipo de Pago */}
                              <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                {editandoId === venta.id ? (
                                  <select
                                    value={valoresEdicion.tipo_pago}
                                    onChange={(e) => setValoresEdicion({...valoresEdicion, tipo_pago: e.target.value})}
                                    className="w-full px-2 py-1 rounded border border-white/20 bg-gray-800/80 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  >
                                    <option value="">Seleccionar</option>
                                    {opcionesTipoPago.map(opcion => (
                                      <option key={opcion.value} value={opcion.value}>
                                        {opcion.icon} {opcion.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="px-1 md:px-2 py-1 bg-green-600/20 rounded-full text-xs">
                                    {obtenerInfoTipoPago(venta.tipo_pago).icon}
                                  </span>
                                )}
                              </td>

                              {/* Autoservicio */}
                              <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                <span className="px-2 py-1 bg-blue-600/20 rounded-full text-xs font-medium text-blue-300">
                                  🤖 Autoservicio
                                </span>
                              </td>

                              {/* Acciones */}
                              <td className="p-2 md:p-3">
                                <div className="flex items-center justify-center gap-1">
                                  {editandoId === venta.id ? (
                                    <>
                                      <button
                                        onClick={guardarEdicion}
                                        disabled={loading}
                                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                                        title="Guardar cambios"
                                      >
                                        ✅
                                      </button>
                                      <button
                                        onClick={cancelarEdicion}
                                        disabled={loading}
                                        className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:from-gray-500 disabled:to-gray-600 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                                        title="Cancelar edición"
                                      >
                                        ❌
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => iniciarEdicion(venta)}
                                        disabled={loading}
                                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                                        title="Editar venta de autoservicio"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => eliminarVenta(venta.id)}
                                        disabled={loading}
                                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                                        title="Eliminar venta de autoservicio"
                                      >
                                        🗑️
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Controles para mostrar todas las ventas */}
                  {ventasFiltradas.length > ventasMostradas && (
                    <div className="mt-4 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-blue-200 text-sm">
                           Mostrando {Math.min(ventasMostradas, ventasFiltradas.length)} de {ventasFiltradas.length} registros totales
                        </p>
                        <button
                          onClick={mostrarTodasLasVentas}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          📋 Mostrar todas
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Información cuando se muestran todas las ventas */}
                  {ventasFiltradas.length > 0 && ventasMostradas >= ventasFiltradas.length && (
                    <div className="mt-4 p-3 bg-green-600/20 backdrop-blur-sm rounded-lg border border-green-500/30">
                      <p className="text-green-200 text-sm text-center">
                        ✅ Mostrando todos los {ventasFiltradas.length} registros de autoservicio
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Botones de control */}
              <div className="mt-4 md:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button
                  onClick={cargarVentas}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  🔄 Actualizar Lista
                </button>
                <button
                  onClick={exportarDatosFiltrados}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  📊 Exportar CSV
                </button>
              </div>
            </div>
          </div>

          {/* Resumen de Ventas de Autoservicio */}
          {ventasFiltradas.length > 0 && (
            <div className="mt-6 md:mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
                <h3 className="text-xl md:text-2xl font-bold text-green-400 text-center mb-4 md:mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  📊 Resumen de Ventas de Autoservicio
                </h3>
                
                {(() => {
                  const resumen = calcularResumenVentas();
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {/* Total General */}
                      <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30 shadow-lg">
                        <div className="text-center">
                          <div className="text-green-300 text-sm md:text-base font-medium mb-1">💰 Total General</div>
                          <div className="text-green-100 text-xl md:text-2xl font-bold">
                            ${resumen.totalGeneral.toLocaleString()}
                          </div>
                          <div className="text-green-200 text-xs md:text-sm mt-1">
                            {resumen.totalVentas} ventas de autoservicio
                          </div>
                        </div>
                      </div>

                      {/* Débito */}
                      <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30 shadow-lg">
                        <div className="text-center">
                          <div className="text-blue-300 text-sm md:text-base font-medium mb-1">
                            💳 Débito
                          </div>
                          <div className="text-blue-100 text-xl md:text-2xl font-bold">
                            ${resumen.totalDebito.toLocaleString()}
                          </div>
                          <div className="text-blue-200 text-xs md:text-sm mt-1">
                            {resumen.cantidadDebito} transacciones
                          </div>
                        </div>
                      </div>

                      {/* Transferencia */}
                      <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30 shadow-lg">
                        <div className="text-center">
                          <div className="text-yellow-300 text-sm md:text-base font-medium mb-1">
                            📱 Transferencia
                          </div>
                          <div className="text-yellow-100 text-xl md:text-2xl font-bold">
                            ${resumen.totalTransferencia.toLocaleString()}
                          </div>
                          <div className="text-yellow-200 text-xs md:text-sm mt-1">
                            {resumen.cantidadTransferencia} transacciones
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          )}

        </div>
      </div>
      {!pantallaCompleta && <Footer />}
    </div>
  );
}

export default Autoservicio;
