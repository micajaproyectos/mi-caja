import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { useSessionData } from '../lib/useSessionData.js';
import { 
  obtenerFechaHoyChile, 
  obtenerRangoMesActualChile,
  formatearFechaChile,
  formatearFechaCortaChile,
  obtenerAniosUnicos,
  obtenerMesesUnicos,
  validarFechaISO,
  generarClaveCacheFecha
} from '../lib/dateUtils.js';
import { scaleService } from '../lib/ScaleService.js';
import Footer from './Footer';

export default function RegistroVenta() {
  const navigate = useNavigate();
  
  // Función para obtener la fecha actual en Chile (reemplazada por dateUtils)
  const obtenerFechaActual = () => {
    return obtenerFechaHoyChile();
  };
  
  // Función para formatear fechas usando utilidades de Chile
  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'Fecha inválida';
    return formatearFechaCortaChile(fechaString);
  };
  
  // Función para obtener fecha en formato YYYY-MM-DD sin problemas de zona horaria
  const obtenerFechaFormatoISO = (fechaString) => {
    if (!fechaString) return null;
    
    try {
      // Si ya está en formato YYYY-MM-DD, retornarla directamente
      if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
        return fechaString;
      }
      
      // Si es una fecha con timestamp, convertirla a YYYY-MM-DD
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) {
        return null;
      }
      
      // Usar UTC para evitar problemas de zona horaria
      const year = fecha.getUTCFullYear();
      const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fecha.getUTCDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error al obtener fecha ISO:', error);
      return null;
    }
  };
  
  const [venta, setVenta] = useState({
    fecha: obtenerFechaActual(), // Inicializar con la fecha actual
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
  const [ventasRegistradas, setVentasRegistradas] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para el cálculo de vuelto (solo frontend)
  const [montoPagado, setMontoPagado] = useState('');
  const [mostrarVuelto, setMostrarVuelto] = useState(false);
  
  // Estados para filtros
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroTipoPago, setFiltroTipoPago] = useState('');
  const [ventasFiltradas, setVentasFiltradas] = useState([]);
  
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

  // Estado para pantalla completa
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  // Estado para notificaciones personalizadas en pantalla completa
  const [notificacionPersonalizada, setNotificacionPersonalizada] = useState(null);
  
  // Estado para confirmaciones personalizadas en pantalla completa
  const [confirmacionPersonalizada, setConfirmacionPersonalizada] = useState(null);

  // Estados para búsqueda de productos del inventario
  const [productosInventario, setProductosInventario] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [mostrarListaProductos, setMostrarListaProductos] = useState(false);
  
  // Refs y estado para el portal del dropdown
  const searchInputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Función para cargar productos del inventario filtrados por usuario
  const cargarProductosInventario = async () => {
    try {
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setProductosInventario([]);
        return;
      }

      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .eq('usuario_id', usuarioId) // 🔒 FILTRO CRÍTICO POR USUARIO
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
      subtotal: 0
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
    
    // Si es un campo de la venta principal
    if (name === 'fecha' || name === 'tipo_pago') {
      const updatedVenta = { ...venta, [name]: value };
      setVenta(updatedVenta);
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

  // Función para agregar un producto a la venta
  const agregarProducto = () => {
    if (!productoActual.producto || !productoActual.cantidad || !productoActual.precio_unitario) {
      mostrarNotificacion('Por favor completa todos los campos del producto', 'error');
      return;
    }

    const nuevoProducto = {
      ...productoActual,
      id: Date.now() // ID único para identificar el producto
    };

    setProductosVenta([...productosVenta, nuevoProducto]);
    
    // 5.2 Handler "Agregar" - stopSampling() + disconnect()
    if (scaleService.isSampling()) {
      scaleService.stopSampling();
    }
    
    if (scaleService.isConnected()) {
      scaleService.disconnect();
    }
    
    // Limpiar el formulario de producto
    setProductoActual({
      producto: '',
      cantidad: '',
      unidad: '',
      precio_unitario: '',
      subtotal: 0,
    });
    
    // Limpiar también el campo de búsqueda y el dropdown
    setBusquedaProducto('');
    setProductosFiltrados([]);
    setMostrarDropdown(false);
  };

  // Función para eliminar un producto de la venta
  const eliminarProducto = (id) => {
    setProductosVenta(productosVenta.filter(p => p.id !== id));
  };

  // Función para calcular el total de la venta
  const calcularTotalVenta = () => {
    return productosVenta.reduce((total, producto) => total + (parseFloat(producto.subtotal) || 0), 0);
  };
  
  // Función para calcular el vuelto
  const calcularVuelto = () => {
    const totalVenta = calcularTotalVenta();
    const montoPagadoNum = parseFloat(montoPagado) || 0;
    return montoPagadoNum - totalVenta;
  };

  // Función para filtrar ventas usando fecha_cl
  const filtrarVentas = useCallback(() => {
    let ventasFiltradas = [...ventasRegistradas];
    const fechaActual = obtenerFechaActual();

    // Si no hay filtros activos, mostrar solo las ventas del día actual
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago) {
      ventasFiltradas = ventasFiltradas.filter(venta => {
        const fechaVenta = venta.fecha_cl || venta.fecha;
        return fechaVenta === fechaActual;
      });
    } else {
      // Filtrar por día específico (si se selecciona)
      if (filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = venta.fecha_cl || venta.fecha;
          return fechaVenta === filtroDia;
        });
      }

      // Filtrar por mes (si se selecciona)
      if (filtroMes && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaVenta = venta.fecha_cl || venta.fecha;
          
          if (!fechaVenta && venta.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(venta.created_at);
            fechaVenta = fechaCreated.toISOString().split('T')[0];
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
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaVenta = venta.fecha_cl || venta.fecha;
          
          if (!fechaVenta && venta.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(venta.created_at);
            fechaVenta = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaVenta) return false;
          const year = fechaVenta.split('-')[0];
          return parseInt(year) === parseInt(filtroAnio);
        });
      }

      // Si hay mes y año seleccionados (sin día específico)
      if (filtroMes && filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaVenta = venta.fecha_cl || venta.fecha;
          
          if (!fechaVenta && venta.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(venta.created_at);
            fechaVenta = fechaCreated.toISOString().split('T')[0];
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
  }, [ventasRegistradas, filtroDia, filtroMes, filtroAnio, filtroTipoPago]);

  // Aplicar filtros cuando cambien los datos o filtros
  useEffect(() => {
    filtrarVentas();
  }, [filtrarVentas]);

  // Resetear contador de ventas mostradas cuando cambien los filtros
  useEffect(() => {
    setVentasMostradas(10);
  }, [filtroDia, filtroMes, filtroAnio, filtroTipoPago]);

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroDia('');
    setFiltroMes('');
    setFiltroAnio('');
    setFiltroTipoPago('');
  };

  // Función para obtener años únicos de las ventas usando fecha_cl
  const obtenerAniosUnicosLocal = () => {
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
    // Mostrar TODAS las ventas filtradas (incluyendo productos individuales)
    // Esto permite ver todos los productos que componen cada venta
    return ventasFiltradas.slice(0, ventasMostradas);
  };



  // Función para mostrar todas las ventas
  const mostrarTodasLasVentas = () => {
    setVentasMostradas(ventasFiltradas.length);
  };

  // Función para obtener todos los meses del año
  const obtenerMesesUnicosLocal = () => {
    // Siempre mostrar los 12 meses del año
    const meses = [];
    for (let i = 1; i <= 12; i++) {
      meses.push({
        value: i,
        month: i,
        label: nombresMeses[i - 1]
      });
    }
    return meses;
  };

  // Nombres de los meses
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Opciones de tipo de pago
  const opcionesTipoPago = [
    { value: 'efectivo', label: 'Efectivo', icon: '💵' },
    { value: 'debito', label: 'Débito', icon: '💳' },
    { value: 'credito', label: 'Crédito', icon: '💳' },
    { value: 'transferencia', label: 'Transferencia', icon: '📱' }
  ];

  // Opciones de unidad
  const opcionesUnidad = [
    { value: 'kg', label: 'Kg', icon: '⚖️' },
    { value: 'unidad', label: 'Unidad', icon: '📦' }
  ];

  // Función para obtener la información del tipo de pago
  const obtenerInfoTipoPago = (valor) => {
    const opcion = opcionesTipoPago.find(op => op.value === valor);
    return opcion || { value: valor, label: valor, icon: '❓' };
  };

  // Función para obtener la información de la unidad
  const obtenerInfoUnidad = (valor) => {
    const opcion = opcionesUnidad.find(op => op.value === valor);
    return opcion || { value: valor, label: valor, icon: '❓' };
  };

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

  // Función para calcular estadísticas dinámicas según filtros aplicados
  const calcularEstadisticasDinamicas = useCallback(() => {
    let ventasFiltradas = [...ventasRegistradas];

    // Si no hay filtros activos, mostrar solo las ventas del día actual
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago) {
      const hoy = obtenerFechaActual();
      ventasFiltradas = ventasFiltradas.filter(venta => {
        const fechaVenta = venta.fecha_cl || venta.fecha;
        return fechaVenta === hoy;
      });
    } else {
      // Aplicar los mismos filtros que se usan en filtrarVentas
      if (filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = venta.fecha_cl || venta.fecha;
          return fechaVenta === filtroDia;
        });
      }

      if (filtroMes && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaVenta = venta.fecha_cl || venta.fecha;
          
          if (!fechaVenta && venta.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(venta.created_at);
            fechaVenta = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaVenta) return false;
          const [year, month] = fechaVenta.split('-');
          const mesVenta = parseInt(month);
          const mesFiltro = parseInt(filtroMes);
          return mesVenta === mesFiltro;
        });
      }

      if (filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaVenta = venta.fecha_cl || venta.fecha;
          
          if (!fechaVenta && venta.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(venta.created_at);
            fechaVenta = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaVenta) return false;
          const year = fechaVenta.split('-')[0];
          return parseInt(year) === parseInt(filtroAnio);
        });
      }

      if (filtroMes && filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          // Usar fecha_cl si existe, sino fecha, y si no hay ninguna, usar created_at
          let fechaVenta = venta.fecha_cl || venta.fecha;
          
          if (!fechaVenta && venta.created_at) {
            // Si no hay fecha_cl ni fecha, usar created_at
            const fechaCreated = new Date(venta.created_at);
            fechaVenta = fechaCreated.toISOString().split('T')[0];
          }
          
          if (!fechaVenta) return false;
          const [year, month] = fechaVenta.split('-');
          return parseInt(month) === parseInt(filtroMes) && 
                 parseInt(year) === parseInt(filtroAnio);
        });
      }

      if (filtroTipoPago) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          return venta.tipo_pago === filtroTipoPago;
        });
      }
    }

    // Filtrar ventas que tienen total_final (ventas completas) para el conteo
    const ventasCompletas = ventasFiltradas.filter(venta => venta.total_final !== null && venta.total_final !== undefined);

    // Para montos acumulados, usar TODAS las ventas filtradas (columna total_venta)
    // Para conteo de ventas, usar solo ventas completas (columna total_final)
    const estadisticas = {
      total: {
        cantidad: ventasCompletas.length, // Conteo usando total_final
        monto: ventasFiltradas.reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0) // Montos usando total_venta
      },
      efectivo: {
        cantidad: ventasCompletas.filter(v => v.tipo_pago === 'efectivo').length, // Conteo usando total_final
        monto: ventasFiltradas.filter(v => v.tipo_pago === 'efectivo').reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0) // Montos usando total_venta
      },
      debito: {
        cantidad: ventasCompletas.filter(v => v.tipo_pago === 'debito').length, // Conteo usando total_final
        monto: ventasFiltradas.filter(v => v.tipo_pago === 'debito').reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0) // Montos usando total_venta
      },
      credito: {
        cantidad: ventasCompletas.filter(v => v.tipo_pago === 'credito').length, // Conteo usando total_final
        monto: ventasFiltradas.filter(v => v.tipo_pago === 'credito').reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0) // Montos usando total_venta
      },
      transferencia: {
        cantidad: ventasCompletas.filter(v => v.tipo_pago === 'transferencia').length, // Conteo usando total_final
        monto: ventasFiltradas.filter(v => v.tipo_pago === 'transferencia').reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0) // Montos usando total_venta
      }
    };

    return estadisticas;
  }, [ventasRegistradas, filtroDia, filtroMes, filtroAnio, filtroTipoPago]);

  // Función para obtener el título dinámico del resumen
  const obtenerTituloResumen = () => {
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago) {
      return `Resumen de Ventas - ${(() => {
        const fechaActual = obtenerFechaHoyChile();
        const [year, month, day] = fechaActual.split('-');
        return `${day}/${month}/${year}`;
      })()}`;
    }

    let titulo = 'Resumen de Ventas - ';
    const partes = [];

    if (filtroDia) {
      const [year, month, day] = filtroDia.split('-');
      partes.push(`${day}/${month}/${year}`);
    }

         // Solo mes seleccionado (sin año)
     if (filtroMes && !filtroDia && !filtroAnio) {
       partes.push(nombresMeses[parseInt(filtroMes) - 1]);
     }

    // Solo año seleccionado (sin mes)
    if (filtroAnio && !filtroDia && !filtroMes) {
      partes.push(filtroAnio);
    }

         // Mes y año seleccionados juntos
     if (filtroMes && filtroAnio && !filtroDia) {
       partes.push(`${nombresMeses[parseInt(filtroMes) - 1]} ${filtroAnio}`);
     }

    if (filtroTipoPago) {
      const infoPago = obtenerInfoTipoPago(filtroTipoPago);
      partes.push(`${infoPago.icon} ${infoPago.label}`);
    }

    return titulo + partes.join(' | ');
  };

  // Función para exportar datos filtrados
  const exportarDatosFiltrados = () => {
    if (ventasFiltradas.length === 0) {
      mostrarNotificacion('No hay datos para exportar', 'error');
      return;
    }

    // Crear contenido CSV
    const headers = ['Fecha', 'Producto', 'Cantidad', 'Unidad', 'Precio Unitario', 'Total Venta', 'Total Final', 'Tipo Pago'];
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
        venta.tipo_pago
      ].join(','))
    ].join('\n');

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas_${obtenerFechaActual()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para cargar ventas registradas filtradas por usuario
  const cargarVentas = async () => {
    setLoading(true);
    try {
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setVentasRegistradas([]);
        return;
      }

      // Intentar consulta con fecha_cl primero, fallback a fecha
      // Excluir ventas de autoservicio (donde autoservicio = 'autoservicio')
      let { data, error } = await supabase
        .from('ventas')
        .select('id, fecha, fecha_cl, producto, cantidad, unidad, precio_unitario, tipo_pago, total_venta, total_final, usuario_id, created_at')
        .eq('usuario_id', usuarioId) // 🔒 FILTRO CRÍTICO POR USUARIO
        .is('autoservicio', null) // 🔒 EXCLUIR VENTAS DE AUTOSERVICIO
        .order('fecha_cl', { ascending: false })
        .order('created_at', { ascending: false });

      // Si hay error con fecha_cl, usar consulta sin fecha_cl
      if (error && error.message?.includes('fecha_cl')) {
        console.warn('⚠️ Columna fecha_cl no existe en ventas, usando fecha');
        const fallbackQuery = await supabase
          .from('ventas')
          .select('id, fecha, producto, cantidad, unidad, precio_unitario, tipo_pago, total_venta, total_final, usuario_id, created_at')
          .eq('usuario_id', usuarioId)
          .is('autoservicio', null) // 🔒 EXCLUIR VENTAS DE AUTOSERVICIO
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false });
        
        data = fallbackQuery.data;
        error = fallbackQuery.error;
      }

      if (error) {
        console.error('❌ Error al cargar ventas:', error);
        setVentasRegistradas([]);
      } else {
        setVentasRegistradas(data || []);
      }
    } catch (error) {
      console.error('❌ Error general al cargar ventas:', error);
      setVentasRegistradas([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para recargar todos los datos
  const recargarDatos = useCallback(() => {
    cargarVentas();
    cargarProductosInventario();
  }, []);

  // Hook para gestionar cambios de sesión
  useSessionData(recargarDatos, 'RegistroVenta', 'ventas');

  // Cargar ventas y productos del inventario al montar el componente
  useEffect(() => {
    recargarDatos();
  }, [recargarDatos]);

  // Asegurar que la fecha esté siempre actualizada al montar el componente
  useEffect(() => {
    setVenta(prevVenta => ({
      ...prevVenta,
      fecha: obtenerFechaActual()
    }));
  }, []);

  // Verificar cambios de fecha y refrescar datos automáticamente
  useEffect(() => {
    const verificarCambioFecha = () => {
      const fechaActual = obtenerFechaActual();
      const fechaVenta = venta.fecha;
      
      // Si la fecha actual es diferente a la fecha de la venta, actualizar
      if (fechaActual !== fechaVenta) {
        setVenta(prevVenta => ({
          ...prevVenta,
          fecha: fechaActual
        }));
        
        // Recargar ventas para obtener datos del nuevo día
        cargarVentas();
        
        // Limpiar filtros para mostrar solo las ventas del día actual
        limpiarFiltros();
      }
    };

    // Verificar cada minuto si ha cambiado la fecha
    const intervalId = setInterval(verificarCambioFecha, 60000); // 60000ms = 1 minuto

    // Verificar inmediatamente al montar el componente
    verificarCambioFecha();

    return () => {
      clearInterval(intervalId);
    };
  }, [venta.fecha]);

  // Cerrar dropdown cuando se haga clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mostrarDropdown && 
          !event.target.closest('.producto-search-container') && 
          !event.target.closest('[data-dropdown-portal]')) {
        setMostrarDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarDropdown]);

  // Recalcular posición del dropdown cuando se hace scroll o resize
  useEffect(() => {
    const handleScrollResize = () => {
      if (mostrarDropdown && searchInputRef.current) {
        const rect = searchInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    window.addEventListener('scroll', handleScrollResize);
    window.addEventListener('resize', handleScrollResize);
    
    return () => {
      window.removeEventListener('scroll', handleScrollResize);
      window.removeEventListener('resize', handleScrollResize);
    };
  }, [mostrarDropdown]);

  // Escuchar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      const estaEnFullscreen = !!document.fullscreenElement;
      
      // Si el usuario quiere estar en pantalla completa pero el navegador salió automáticamente,
      // intentar re-entrar a pantalla completa
      if (pantallaCompleta && !estaEnFullscreen) {
        // Re-entrar a pantalla completa después de un breve delay
        setTimeout(async () => {
          try {
            if (!document.fullscreenElement && pantallaCompleta) {
              await document.documentElement.requestFullscreen();
            }
          } catch (error) {
            console.log('No se pudo re-entrar a pantalla completa:', error);
            // Solo actualizar el estado si realmente no se puede entrar a fullscreen
            setPantallaCompleta(false);
          }
        }, 100);
      } else if (!pantallaCompleta && estaEnFullscreen) {
        // El usuario salió intencionalmente (ESC o botón), sincronizar estado
        setPantallaCompleta(false);
      }
    };

    // Agregar el listener para cambios de fullscreen
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Cleanup: remover el listener cuando el componente se desmonte
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [pantallaCompleta]);



  // Cleanup: cerrar puerto al salir del componente
  useEffect(() => {
    return () => {
      if (scaleService.isConnected()) {
        scaleService.disconnect();
      }
    };
  }, []);

  // 5.1 Enlazar el callback del motor a RegistroVenta
  const handleStableWeightRef = useRef(null);
  
  useEffect(() => {
      const handleStableWeight = (kg) => {
    // Este callback no escribe nada si productoActual.unidad !== 'kg' o si ScaleService.isSampling() === false
    if (productoActual.unidad !== 'kg' || !scaleService.isSampling()) {
      return;
    }

    // Aplicar umbral ≥ 0.1 (revalidar por seguridad)
    if (kg < 0.1) {
      return;
    }

    // Formatear a 1 decimal con punto
    const formattedKg = kg.toFixed(1);
    
    // Actualizar productoActual.cantidad
    setProductoActual(prev => {
      // Calcular subtotal automáticamente (misma lógica que handleChange)
      const cantidad = parseFloat(formattedKg) || 0;
      const precio = parseFloat(prev.precio_unitario) || 0;
      const subtotal = +(cantidad * precio).toFixed(2);
      
      return {
        ...prev,
        cantidad: formattedKg,
        subtotal: subtotal
      };
    });

    // Log esencial: solo cuando se actualiza la cantidad
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[scale] ✅ cantidad:set ${formattedKg}`);
    }
  };

    // No re-registrar handleStableWeight si la referencia no cambió
    if (handleStableWeightRef.current !== handleStableWeight) {
      scaleService.setOnStable(handleStableWeight);
      handleStableWeightRef.current = handleStableWeight;
    }

    // Cleanup del callback al desmontar
    return () => {
      scaleService.setOnStable(null);
      handleStableWeightRef.current = null;
    };
  }, [productoActual.unidad]);

  // 4.2 Detectar cambios de unidad y detener sampling si es necesario
  useEffect(() => {
    if (productoActual.unidad !== 'kg' && scaleService.isSampling()) {
      scaleService.stopSampling();
    }
  }, [productoActual.unidad]);

  // Función para mostrar notificaciones (inteligente según modo pantalla completa)
  const mostrarNotificacion = (mensaje, tipo = 'info') => {
    if (pantallaCompleta) {
      // Mostrar notificación personalizada en pantalla completa
      setNotificacionPersonalizada({ mensaje, tipo });
      // Auto-ocultar después de 4 segundos
      setTimeout(() => setNotificacionPersonalizada(null), 4000);
    } else {
      // Usar alert nativo fuera de pantalla completa
      alert(mensaje);
    }
  };

  // Función para mostrar confirmaciones (inteligente según modo pantalla completa)
  const mostrarConfirmacion = (mensaje) => {
    return new Promise((resolve) => {
      if (pantallaCompleta) {
        // Mostrar confirmación personalizada en pantalla completa
        setConfirmacionPersonalizada({
          mensaje,
          onConfirm: () => {
            setConfirmacionPersonalizada(null);
            resolve(true);
          },
          onCancel: () => {
            setConfirmacionPersonalizada(null);
            resolve(false);
          }
        });
      } else {
        // Usar confirm nativo fuera de pantalla completa
        resolve(confirm(mensaje));
      }
    });
  };

  // Función para validar formato de fecha

  // Handler para el botón de balanza
  const onClickBalanza = () => {
    // Verificar soporte de Web Serial
    if (!navigator.serial) {
      return;
    }
    
    // 5.3 Gate por unidad (se mantiene)
    if (productoActual.unidad !== 'kg') {
      return;
    }
    
    // 5.3 Reconexión silenciosa (solo al pulsar Balanza)
    scaleService.startSampling();
  };
  const validarFecha = (fechaString) => {
    if (!fechaString) {
      return false;
    }
    
    // Verificar formato YYYY-MM-DD
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaString)) {
      return false;
    }
    
    // Verificar que sea una fecha válida
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) {
      return false;
    }
    
    // Verificar que no sea fecha futura (opcional)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fecha > hoy) {
      // No retornamos false aquí, solo un warning
    }
    
    return true;
  };

  const registrarVenta = async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    // 🔒 PROTECCIÓN: Evitar múltiples clics durante el proceso
    if (loading) {
      return;
    }
    
    // ⚡ IMPORTANTE: Activar loading INMEDIATAMENTE para bloquear clics rápidos
    setLoading(true);
    
    try {
      // Validar fecha primero
      if (!validarFecha(venta.fecha)) {
        mostrarNotificacion('❌ Por favor ingresa una fecha válida en formato YYYY-MM-DD', 'error');
        setLoading(false);
        return;
      }
      
      // Validar que todos los campos requeridos estén llenos
      if (!venta.fecha || !venta.tipo_pago) {
        mostrarNotificacion('❌ Por favor completa la fecha y tipo de pago', 'error');
        setLoading(false);
        return;
      }

      // Validar que haya al menos un producto
      if (productosVenta.length === 0) {
        mostrarNotificacion('❌ Por favor agrega al menos un producto a la venta', 'error');
        setLoading(false);
        return;
      }

      // Calcular el total de la venta
      const totalVenta = calcularTotalVenta();

      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        mostrarNotificacion('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.', 'error');
        setLoading(false);
        return;
      }

      // Calcular el total final de la venta (suma de todos los subtotales)
      const totalFinal = calcularTotalVenta();
      
      // Registrar cada producto como una venta individual
      for (let i = 0; i < productosVenta.length; i++) {
        const producto = productosVenta[i];
        const ventaParaInsertar = {
          fecha: venta.fecha,
          // fecha_cl: NO ENVIAR - es columna generada automáticamente por PostgreSQL
          tipo_pago: venta.tipo_pago,
          producto: producto.producto,
          cantidad: parseFloat(producto.cantidad) || 0,
          unidad: producto.unidad,
          precio_unitario: parseFloat(producto.precio_unitario) || 0,
          total_venta: parseFloat(producto.subtotal) || 0,
          // Solo incluir total_final en la primera fila (i === 0)
          total_final: i === 0 ? totalFinal : null,
          // Agregar el usuario_id del usuario autenticado
          usuario_id: usuarioId,
        };

        const { error } = await supabase
          .from('ventas')
          .insert([ventaParaInsertar]);

        if (error) {
          console.error('❌ Error al registrar producto:', error);
          mostrarNotificacion('❌ Error al registrar venta: ' + error.message, 'error');
          setLoading(false);
          return;
        }
      }

      mostrarNotificacion(`✅ Venta registrada correctamente con ${productosVenta.length} productos. Total: $${totalVenta.toLocaleString()}`, 'success');
      
      // Limpiar el formulario
      setVenta({
        fecha: obtenerFechaActual(), // Resetear a la fecha actual
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
      
      // Limpiar campos de vuelto
      setMontoPagado('');
      setMostrarVuelto(false);
      
      // Recargar la lista de ventas
      cargarVentas();
      
    } catch (error) {
      console.error('❌ Error general al registrar venta:', error);
      mostrarNotificacion('❌ Error al registrar venta: ' + error.message, 'error');
    } finally {
      // Desactivar estado de carga
      setLoading(false);
    }
  };

  // Función para eliminar una venta (solo del usuario actual)
  const eliminarVenta = async (id) => {
    const confirmado = await mostrarConfirmacion('¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer.');
    if (!confirmado) {
      return;
    }

    try {
      setLoading(true);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        mostrarNotificacion('❌ Error: Usuario no autenticado', 'error');
        return;
      }
      
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId); // 🔒 SEGURIDAD: Solo eliminar ventas del usuario actual

      if (error) {
        console.error('❌ Error al eliminar venta:', error);
        mostrarNotificacion('❌ Error al eliminar la venta: ' + error.message, 'error');
        return;
      }

      mostrarNotificacion('✅ Venta eliminada exitosamente', 'success');
      
      // Recargar la lista de ventas
      await cargarVentas();
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar venta:', error);
      mostrarNotificacion('❌ Error inesperado al eliminar la venta', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar edición
  const iniciarEdicion = (venta) => {
    setEditandoId(venta.id);
    setValoresEdicion({
      fecha_cl: venta.fecha_cl || venta.fecha,
      producto: venta.producto,
      cantidad: venta.cantidad.toString(),
      unidad: venta.unidad,
      precio_unitario: venta.precio_unitario.toString(),
      total_venta: venta.total_venta.toString(),
      total_final: venta.total_final ? venta.total_final.toString() : '',
      tipo_pago: venta.tipo_pago
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

  // Función para manejar cambios en edición
  const handleEdicionChange = (campo, valor) => {
    setValoresEdicion(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Función para guardar edición
  const guardarEdicion = async (id) => {
    try {
      // Validaciones
      if (!valoresEdicion.fecha_cl || !valoresEdicion.producto || !valoresEdicion.cantidad || 
          !valoresEdicion.unidad || !valoresEdicion.precio_unitario || !valoresEdicion.tipo_pago) {
        mostrarNotificacion('⚠️ Todos los campos son obligatorios', 'error');
        return;
      }

      if (parseFloat(valoresEdicion.cantidad) <= 0) {
        mostrarNotificacion('⚠️ La cantidad debe ser mayor a 0', 'error');
        return;
      }

      if (parseFloat(valoresEdicion.precio_unitario) <= 0) {
        mostrarNotificacion('⚠️ El precio unitario debe ser mayor a 0', 'error');
        return;
      }

      setLoading(true);

      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        mostrarNotificacion('❌ Error: Usuario no autenticado', 'error');
        return;
      }

      const { error } = await supabase
        .from('ventas')
        .update({
          fecha: valoresEdicion.fecha_cl,
          producto: valoresEdicion.producto.trim(),
          cantidad: parseFloat(valoresEdicion.cantidad),
          unidad: valoresEdicion.unidad,
          precio_unitario: parseFloat(valoresEdicion.precio_unitario),
          total_venta: parseFloat(valoresEdicion.total_venta),
          total_final: valoresEdicion.total_final ? parseFloat(valoresEdicion.total_final) : null,
          tipo_pago: valoresEdicion.tipo_pago
        })
        .eq('id', id)
        .eq('usuario_id', usuarioId); // 🔒 SEGURIDAD: Solo editar ventas del usuario actual

      if (error) {
        console.error('❌ Error al actualizar venta:', error);
        mostrarNotificacion('❌ Error al actualizar la venta: ' + error.message, 'error');
        return;
      }

      mostrarNotificacion('✅ Venta actualizada exitosamente', 'success');
      cancelarEdicion();
      await cargarVentas();

    } catch (error) {
      console.error('❌ Error inesperado al actualizar venta:', error);
      mostrarNotificacion('❌ Error inesperado al actualizar la venta', 'error');
    } finally {
      setLoading(false);
    }
  };



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

      {/* Notificaciones personalizadas para pantalla completa */}
      {notificacionPersonalizada && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[70] backdrop-blur-md text-white px-6 py-4 rounded-xl shadow-2xl border max-w-md text-center animate-bounce ${
          notificacionPersonalizada.tipo === 'success' ? 'bg-green-600/95 border-green-400/30' :
          notificacionPersonalizada.tipo === 'error' ? 'bg-red-600/95 border-red-400/30' :
          'bg-blue-600/95 border-blue-400/30'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-xl">
              {notificacionPersonalizada.tipo === 'success' ? '✅' :
               notificacionPersonalizada.tipo === 'error' ? '❌' : 'ℹ️'}
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium leading-relaxed">
                {notificacionPersonalizada.mensaje}
              </div>
            </div>
            <button
              onClick={() => setNotificacionPersonalizada(null)}
              className="text-white/70 hover:text-white text-lg leading-none"
              title="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Confirmaciones personalizadas para pantalla completa */}
      {confirmacionPersonalizada && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800/95 backdrop-blur-md text-white p-6 rounded-xl shadow-2xl border border-gray-600/30 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-yellow-400 text-3xl mb-3">⚠️</div>
              <div className="text-lg font-medium leading-relaxed">
                {confirmacionPersonalizada.mensaje}
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={confirmacionPersonalizada.onCancel}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={confirmacionPersonalizada.onConfirm}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ✅ Confirmar
              </button>
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
            radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `
        }}
      />

      {/* Efecto de vidrio esmerilado adicional */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/5"></div>

      {/* Contenido principal */}
      <div className={`${pantallaCompleta ? 'h-full overflow-y-auto' : 'relative z-10 p-4 md:p-8'}`}>
        <div className={`${pantallaCompleta ? 'h-full px-4 py-4' : 'max-w-sm mx-auto sm:max-w-lg md:max-w-4xl lg:max-w-6xl xl:max-w-7xl'}`}>
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
          
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Registro de Venta
                </h1>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={togglePantallaCompleta}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                  title={pantallaCompleta ? 
                    (esDispositivoTactil() ? `Salir de pantalla completa (puede cerrarse automáticamente en ${obtenerInfoDispositivo().navegador})` : "Salir de pantalla completa (ESC)") : 
                    (esDispositivoTactil() ? `Pantalla completa - ${obtenerInfoDispositivo().navegador} puede cerrarla automáticamente` : "Pantalla completa")
                  }
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
          
          {/* Nuevo diseño del formulario de venta */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-3 md:p-6 border border-white/20 mb-4 md:mb-6">
            {/* Sección de búsqueda y agregar producto - Ultra Compacta */}
            <div className="mb-2 md:mb-3">
              <div className="flex items-center mb-1">
                <span className="text-blue-400 text-lg md:text-xl mr-2">🔍</span>
                <h3 className="text-green-400 text-lg md:text-xl font-bold">Buscar Producto</h3>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={busquedaProducto}
                onChange={handleBusquedaProducto}
                className="w-full px-2 md:px-3 lg:px-4 py-2 md:py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-xs md:text-sm lg:text-base transition-all duration-200 mb-2"
                placeholder="🔍 Escribe el nombre del producto..."
              />
              
              {/* Campos del producto - Responsive y adaptativo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                <div>
                  <label className="block text-white font-medium mb-1 text-xs md:text-sm">Unidad</label>
                  <select
                    name="unidad"
                    value={productoActual.unidad}
                    onChange={handleChange}
                    className="w-full px-2 md:px-3 lg:px-4 py-2 md:py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-xs md:text-sm lg:text-base"
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
                   <label className="block text-white font-medium mb-1 text-xs md:text-sm">
                     Cantidad
                     {scaleService.isSampling() && productoActual.unidad === 'kg' && (
                       <span className="ml-2 text-green-400 text-xs">🟢 Escuchando balanza</span>
                     )}
                   </label>
                  <input
                    type="number"
                    step="0.01"
                    name="cantidad"
                    value={productoActual.cantidad}
                    onChange={handleChange}
                     readOnly={scaleService.isSampling() && productoActual.unidad === 'kg'}
                     className={`w-full px-2 md:px-3 lg:px-4 py-2 md:py-2.5 rounded-lg border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-xs md:text-sm lg:text-base ${
                       scaleService.isSampling() && productoActual.unidad === 'kg' 
                         ? 'bg-gray-800 cursor-not-allowed' 
                         : 'bg-gray-700'
                     }`}
                    placeholder="0.00"
                  />
                                     <button
                     type="button"
                     onClick={onClickBalanza}
                     disabled={productoActual.unidad !== 'kg'}
                     className={`w-full mt-2 text-white font-medium py-2 px-3 rounded-lg transition-all duration-300 text-xs md:text-sm shadow-lg hover:shadow-xl transform hover:scale-105 ${
                       scaleService.isSampling() ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                     }`}
                   >
                     {scaleService.isSampling() ? '🟢 Escuchando...' : '⚖️ Balanza'}
                   </button>
                  
                  {/* Estado simple de la balanza */}
                  <div className="text-xs text-gray-400 mt-2 text-center">
                    {scaleService.isConnected() ? '🔌 Balanza conectada' : '❌ Balanza desconectada'}
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-1 text-xs md:text-sm">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    name="precio_unitario"
                    value={productoActual.precio_unitario}
                    onChange={handleChange}
                    className="w-full px-2 md:px-3 lg:px-4 py-2 md:py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-xs md:text-sm lg:text-base"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={agregarProducto}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 md:py-2.5 px-3 md:px-4 lg:px-6 rounded-lg transition-all duration-300 text-xs md:text-sm lg:text-base shadow-lg hover:shadow-xl transform hover:scale-105"
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
                      <div className="space-y-1 md:space-y-1.5">
                        {productosVenta.map((producto, index) => (
                          <div key={producto.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 backdrop-blur-sm rounded p-2 md:p-2.5 border border-white/10 hover:bg-white/10 transition-colors gap-2 sm:gap-3">
                            {/* Información del producto - Responsive */}
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                              {/* Nombre del producto */}
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-xs md:text-sm truncate" title={producto.producto}>
                                  {producto.producto}
                                </p>
                              </div>
                              
                              {/* Cantidad y unidad */}
                              <div className="flex items-center gap-1 text-gray-300 text-xs md:text-sm">
                                <span className="font-medium">{producto.cantidad}</span>
                                <span className="opacity-75">{producto.unidad}</span>
                              </div>
                              
                              {/* Precio unitario */}
                              <div className="text-gray-300 text-xs md:text-sm">
                                <span className="font-medium">${parseFloat(producto.precio_unitario).toLocaleString()}</span>
                              </div>
                            </div>
                            
                            {/* Subtotal y botón eliminar - Responsive */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                              {/* Subtotal */}
                              <div className="text-left sm:text-right">
                                <div className="text-green-300 text-xs font-medium opacity-75">Subtotal</div>
                                <div className="text-green-400 text-xs md:text-sm font-bold">${parseFloat(producto.subtotal).toLocaleString()}</div>
                              </div>
                              
                              {/* Botón eliminar */}
                              <button
                                onClick={() => eliminarProducto(producto.id)}
                                className="text-red-400 hover:text-red-300 text-xs md:text-sm font-bold flex-shrink-0 px-2 py-1 md:px-2.5 md:py-1.5 rounded hover:bg-red-600/20 transition-colors"
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
                  <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-md rounded-xl p-3 md:p-4 border-2 border-green-500/30 shadow-xl h-full">
                    <div className="text-center mb-3">
                      <div className="text-green-300 text-lg md:text-xl font-bold mb-1">💰 Total de la Venta</div>
                      <div className="text-green-100 text-sm">Resumen de productos</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                        <div className="text-green-200 text-sm font-medium mb-1">Cantidad de Items</div>
                        <div className="text-green-300 text-xl font-bold">{productosVenta.length}</div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                        <div className="text-green-200 text-sm font-medium mb-1">Total a Pagar</div>
                        <div className="text-green-300 text-2xl font-bold">${calcularTotalVenta().toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              
                          {/* Dropdown de productos filtrados - Portal */}
            {mostrarDropdown && productosFiltrados.length > 0 && createPortal(
              <div 
                data-dropdown-portal
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
            
            {/* Mensaje cuando no hay productos - Portal */}
            {mostrarDropdown && productosFiltrados.length === 0 && busquedaProducto.trim() && createPortal(
              <div 
                data-dropdown-portal
                className="fixed z-[9999] bg-gray-900/95 backdrop-blur-md border-2 border-blue-400/60 rounded-2xl shadow-2xl p-6"
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
                    Intenta con otro nombre o agrega el producto manualmente
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaProducto('');
                    setProductoActual({
                      ...productoActual,
                      producto: '',
                      precio_unitario: '',
                      unidad: ''
                    });
                    setMostrarDropdown(false);
                  }}
                  className="w-full px-6 py-3 md:py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-300 text-sm md:text-base shadow-lg"
                >
                  ✏️ Ingresar producto manualmente
                </button>
              </div>,
              document.body
            )}



            {/* Sección de tipo de pago y procesar venta - En la misma línea */}
            <div className="mb-3 md:mb-4">
              <div className="flex items-center mb-2">
                <span className="text-blue-400 text-lg md:text-xl mr-2"></span>
                <h3 className="text-green-400 text-lg md:text-xl font-bold">Tipo de Pago</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3 items-stretch">
                {/* Botones de tipo de pago más angostos */}
                <button
                  type="button"
                  onClick={() => {
                    setVenta({...venta, tipo_pago: 'efectivo'});
                    setMontoPagado('');
                    setMostrarVuelto(false);
                  }}
                  className={`p-2 md:p-2.5 rounded-lg border-2 transition-all duration-200 ${
                    venta.tipo_pago === 'efectivo' 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-green-400 text-sm md:text-base mb-1">💵</div>
                    <p className="font-medium text-xs md:text-sm">Efectivo</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setVenta({...venta, tipo_pago: 'debito'});
                    setMontoPagado('');
                    setMostrarVuelto(false);
                  }}
                  className={`p-2 md:p-2.5 rounded-lg border-2 transition-all duration-200 ${
                    venta.tipo_pago === 'debito' 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-blue-400 text-sm md:text-base mb-1">💳</div>
                    <p className="font-medium text-xs md:text-sm">Débito</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setVenta({...venta, tipo_pago: 'credito'});
                    setMontoPagado('');
                    setMostrarVuelto(false);
                  }}
                  className={`p-2 md:p-2.5 rounded-lg border-2 transition-all duration-200 ${
                    venta.tipo_pago === 'credito' 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-orange-400 text-sm md:text-base mb-1">💳</div>
                    <p className="font-medium text-xs md:text-sm">Crédito</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setVenta({...venta, tipo_pago: 'transferencia'});
                    setMontoPagado('');
                    setMostrarVuelto(false);
                  }}
                  className={`p-2 md:p-2.5 rounded-lg border-2 transition-all duration-200 ${
                    venta.tipo_pago === 'transferencia' 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-purple-400 text-sm md:text-base mb-1">📱</div>
                    <p className="font-medium text-xs md:text-sm">Transferencia</p>
                  </div>
                </button>

                {/* Botón procesar venta en la misma fila */}
                <button
                  type="button"
                  onClick={registrarVenta}
                  disabled={loading}
                  className={`${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white font-bold p-2 md:p-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 text-xs md:text-sm shadow-lg hover:shadow-xl col-span-2 sm:col-span-1 flex items-center justify-center gap-1 md:gap-2 disabled:opacity-70 disabled:transform-none`}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span className="hidden md:inline">Procesando...</span>
                      <span className="md:hidden">Procesando...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-yellow-400">💰</span>
                      <span className="hidden md:inline">Procesar Venta</span>
                      <span className="md:hidden">Procesar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Calculadora de Vuelto (solo para Efectivo) */}
            {venta.tipo_pago === 'efectivo' && productosVenta.length > 0 && calcularTotalVenta() > 0 && (
              <div className="mb-3 md:mb-4 bg-blue-500/20 backdrop-blur-sm rounded-xl p-3 md:p-4 lg:p-6 border border-blue-400/30">
                <h4 className="text-blue-200 font-semibold mb-3 md:mb-4 text-sm md:text-base flex items-center gap-2">
                  <span className="text-xl">🧮</span>
                  Calculadora de Vuelto
                </h4>
                
                <div className="space-y-3 md:space-y-4">
                  {/* Total de la venta (solo lectura) */}
                  <div>
                    <label className="block text-blue-100 text-xs md:text-sm mb-2">
                      Total de la venta:
                    </label>
                    <div className="bg-white/10 border border-blue-400/50 rounded-lg p-2 md:p-3 text-center">
                      <p className="text-blue-300 text-lg md:text-xl lg:text-2xl font-bold">
                        ${calcularTotalVenta().toLocaleString('es-CL')}
                      </p>
                    </div>
                  </div>

                  {/* Monto pagado por el cliente */}
                  <div>
                    <label className="block text-blue-100 text-xs md:text-sm mb-2">
                      Monto pagado por el cliente:
                    </label>
                    <input
                      type="number"
                      value={montoPagado}
                      onChange={(e) => {
                        setMontoPagado(e.target.value);
                        setMostrarVuelto(e.target.value !== '');
                      }}
                      placeholder="Ingresa el monto recibido"
                      step="100"
                      min="0"
                      className="w-full p-2 md:p-3 lg:p-4 bg-white/10 border border-blue-400/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    />
                  </div>

                  {/* Mostrar el vuelto */}
                  {mostrarVuelto && montoPagado && (
                    <div className="mt-3 md:mt-4">
                      <label className="block text-blue-100 text-xs md:text-sm mb-2">
                        Vuelto a entregar:
                      </label>
                      <div className={`${calcularVuelto() >= 0 ? 'bg-green-500/20 border-green-400/50' : 'bg-red-500/20 border-red-400/50'} border rounded-lg p-3 md:p-4 text-center`}>
                        <p className={`${calcularVuelto() >= 0 ? 'text-green-300' : 'text-red-300'} text-xl md:text-2xl lg:text-3xl font-bold`}>
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
            )}

          </div>





          {/* Sección de Ventas Registradas */}
          <div className="mt-6 md:mt-8">
            <h2 className="text-2xl md:text-3xl font-bold text-green-400 text-center drop-shadow-lg mb-3 md:mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Ventas Registradas
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
                    {obtenerMesesUnicosLocal().map(mesObj => (
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
                    {obtenerAniosUnicosLocal().map(anio => (
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
                    <strong>Mostrando ventas del día actual</strong>
                  ) : (
                    <>
                      <strong>Filtros activos:</strong> 
                      {filtroDia && ` Día: ${(() => {
                        // Función para mostrar fecha sin desfase de zona horaria
                        const [year, month, day] = filtroDia.split('-');
                        return `${day}/${month}/${year}`;
                      })()}`}
                                             {filtroMes && ` Mes: ${nombresMeses[parseInt(filtroMes) - 1]}`}
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
                  <p className="text-gray-200 mt-2 text-sm md:text-base">Cargando ventas...</p>
                </div>
              ) : ventasFiltradas.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <p className="text-gray-200 text-base md:text-lg">
                    {ventasRegistradas.length === 0 
                      ? 'No hay ventas registradas aún' 
                      : !filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago
                        ? 'No hay ventas registradas hoy'
                        : 'No hay ventas que coincidan con los filtros seleccionados'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Tabla única para todos los dispositivos */}
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
                          <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Acciones</th>
                        </tr>
                      </thead>
                                                                     <tbody>
                          {(() => {
                            const ventasAMostrar = obtenerVentasAMostrar();
                            return ventasAMostrar.map((venta, index) => {
                              const estaEditando = editandoId === venta.id;
                              
                              return (
                                <tr key={index} className={`hover:bg-white/5 transition-colors ${
                                  venta.total_final ? 'border-b-2 border-white/20' : ''
                                }`}>
                                  {/* Fecha */}
                                  <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                    {estaEditando ? (
                                      <input
                                        type="date"
                                        value={valoresEdicion.fecha_cl}
                                        onChange={(e) => handleEdicionChange('fecha_cl', e.target.value)}
                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                      />
                                    ) : (
                                      formatearFecha(venta.fecha_cl || venta.fecha)
                                    )}
                                  </td>

                                  {/* Producto */}
                                  <td className="text-gray-200 p-2 md:p-3 font-medium text-xs md:text-sm truncate max-w-20 md:max-w-32">
                                    {estaEditando ? (
                                      <input
                                        type="text"
                                        value={valoresEdicion.producto}
                                        onChange={(e) => handleEdicionChange('producto', e.target.value)}
                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                      />
                                    ) : (
                                      venta.producto || 'Sin producto'
                                    )}
                                  </td>

                                  {/* Cantidad */}
                                  <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                    {estaEditando ? (
                                      <div className="flex flex-col gap-1">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={valoresEdicion.cantidad}
                                          onChange={(e) => handleEdicionChange('cantidad', e.target.value)}
                                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                        />
                                        <select
                                          value={valoresEdicion.unidad}
                                          onChange={(e) => handleEdicionChange('unidad', e.target.value)}
                                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                        >
                                          <option value="kg">⚖️ Kg</option>
                                          <option value="unidad">📦 Unidad</option>
                                        </select>
                                      </div>
                                    ) : (
                                      `${!isNaN(venta.cantidad) ? venta.cantidad : '0'} ${obtenerInfoUnidad(venta.unidad).icon}`
                                    )}
                                  </td>

                                  {/* Precio */}
                                  <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                    {estaEditando ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={valoresEdicion.precio_unitario}
                                        onChange={(e) => handleEdicionChange('precio_unitario', e.target.value)}
                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                      />
                                    ) : (
                                      `$${!isNaN(venta.precio_unitario) ? parseFloat(venta.precio_unitario).toLocaleString() : '0'}`
                                    )}
                                  </td>

                                  {/* Total */}
                                  <td className="text-green-300 p-2 md:p-3 font-bold text-xs md:text-sm">
                                    {estaEditando ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={valoresEdicion.total_venta}
                                        onChange={(e) => handleEdicionChange('total_venta', e.target.value)}
                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-green-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                      />
                                    ) : (
                                      `$${!isNaN(venta.total_venta) ? parseFloat(venta.total_venta).toLocaleString() : '0'}`
                                    )}
                                  </td>

                                  {/* Total Final */}
                                  <td className="text-blue-300 p-2 md:p-3 font-bold text-xs md:text-sm">
                                    {estaEditando ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={valoresEdicion.total_final || ''}
                                        onChange={(e) => handleEdicionChange('total_final', e.target.value)}
                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-blue-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                        placeholder="Total final"
                                      />
                                    ) : (
                                      venta.total_final ? `$${parseFloat(venta.total_final).toLocaleString()}` : '-'
                                    )}
                                  </td>

                                  {/* Tipo de Pago */}
                                  <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                                    {estaEditando ? (
                                      <select
                                        value={valoresEdicion.tipo_pago}
                                        onChange={(e) => handleEdicionChange('tipo_pago', e.target.value)}
                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                      >
                                        <option value="efectivo">💵 Efectivo</option>
                                        <option value="debito">💳 Débito</option>
                                        <option value="credito">💳 Crédito</option>
                                        <option value="transferencia">📱 Transferencia</option>
                                      </select>
                                    ) : (
                                      <span className="px-1 md:px-2 py-1 bg-green-600/20 rounded-full text-xs">
                                        {obtenerInfoTipoPago(venta.tipo_pago).icon}
                                      </span>
                                    )}
                                  </td>

                                  {/* Acciones */}
                                  <td className="p-2 md:p-3">
                                    {estaEditando ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => guardarEdicion(venta.id)}
                                          disabled={loading}
                                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                          title="Guardar cambios"
                                        >
                                          ✅
                                        </button>
                                        <button
                                          onClick={cancelarEdicion}
                                          disabled={loading}
                                          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                          title="Cancelar edición"
                                        >
                                          ❌
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => iniciarEdicion(venta)}
                                          disabled={loading}
                                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                          title="Editar venta"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => eliminarVenta(venta.id)}
                                          disabled={loading}
                                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                                          title="Eliminar venta"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
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
                         ✅ Mostrando todos los {ventasFiltradas.length} registros
                       </p>
                     </div>
                   )}
                  
                  {/* Resumen de Ventas dinámico según filtros */}
                  <div className="mt-4 md:mt-6 p-4 md:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                    <h4 className="text-blue-300 font-bold text-base md:text-lg mb-3 md:mb-4 text-center">{obtenerTituloResumen()}</h4>
                    
                    {/* Listado de estadísticas */}
                    <div className="space-y-2 md:space-y-3">
                      {/* Total */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-blue-400 text-lg md:text-xl mr-3">📊</span>
                          <div>
                            <p className="text-blue-200 text-sm md:text-base font-medium">Total</p>
                            <p className="text-blue-300 text-xs md:text-sm">{calcularEstadisticasDinamicas().total.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDinamicas().total.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Efectivo */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-green-400 text-lg md:text-xl mr-3">💵</span>
                          <div>
                            <p className="text-green-200 text-sm md:text-base font-medium">Efectivo</p>
                            <p className="text-green-300 text-xs md:text-sm">{calcularEstadisticasDinamicas().efectivo.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDinamicas().efectivo.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Débito */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-purple-400 text-lg md:text-xl mr-3">💳</span>
                          <div>
                            <p className="text-purple-200 text-sm md:text-base font-medium">Débito</p>
                            <p className="text-purple-300 text-xs md:text-sm">{calcularEstadisticasDinamicas().debito.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-purple-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDinamicas().debito.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Crédito */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-orange-400 text-lg md:text-xl mr-3">💳</span>
                          <div>
                            <p className="text-orange-200 text-sm md:text-base font-medium">Crédito</p>
                            <p className="text-orange-300 text-xs md:text-sm">{calcularEstadisticasDinamicas().credito.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-orange-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDinamicas().credito.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Transferencia */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-indigo-400 text-lg md:text-xl mr-3">📱</span>
                          <div>
                            <p className="text-indigo-200 text-sm md:text-base font-medium">Transferencia</p>
                            <p className="text-indigo-300 text-xs md:text-sm">{calcularEstadisticasDinamicas().transferencia.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-indigo-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDinamicas().transferencia.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
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
        </div>
      </div>
      
      {/* Footer */}
      {!pantallaCompleta && <Footer />}
    </div>
  );
} 