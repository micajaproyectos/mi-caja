import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import Footer from './Footer';

export default function RegistroVenta() {
  const navigate = useNavigate();
  
  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const obtenerFechaActual = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // Función para formatear fechas correctamente sin problemas de zona horaria
  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'Fecha inválida';
    
    try {
      // Si la fecha ya está en formato YYYY-MM-DD, usarla directamente
      if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
        const [year, month, day] = fechaString.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Si es una fecha con timestamp, convertirla correctamente
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) {
        return 'Fecha inválida';
      }
      
      // Usar toLocaleDateString con opciones específicas para evitar problemas de zona horaria
      return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC' // Forzar UTC para evitar desfases
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha inválida';
    }
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
  
  // Estados para filtros
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroTipoPago, setFiltroTipoPago] = useState('');
  const [ventasFiltradas, setVentasFiltradas] = useState([]);
  
  // Estado para controlar la cantidad de ventas mostradas
  const [ventasMostradas, setVentasMostradas] = useState(10);

  // Estados para búsqueda de productos del inventario
  const [productosInventario, setProductosInventario] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [mostrarListaProductos, setMostrarListaProductos] = useState(false);
  
  // Refs y estado para el portal del dropdown
  const searchInputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Función para cargar productos del inventario
  const cargarProductosInventario = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('producto', { ascending: true });

      if (error) {
        console.error('Error al cargar productos del inventario:', error);
        return;
      }

      setProductosInventario(data || []);
      console.log('✅ Productos del inventario cargados:', data);
    } catch (error) {
      console.error('Error inesperado al cargar productos del inventario:', error);
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
      alert('Por favor completa todos los campos del producto');
      return;
    }

    const nuevoProducto = {
      ...productoActual,
      id: Date.now() // ID único para identificar el producto
    };

    setProductosVenta([...productosVenta, nuevoProducto]);
    
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

  // Función para filtrar ventas
  const filtrarVentas = useCallback(() => {
    let ventasFiltradas = [...ventasRegistradas];

    // Si no hay filtros activos, mostrar solo las ventas del día actual
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago) {
      const fechaActual = obtenerFechaActual(); // Usar la función consistente
      
      ventasFiltradas = ventasFiltradas.filter(venta => {
        const fechaVenta = obtenerFechaFormatoISO(venta.fecha);
        return fechaVenta === fechaActual;
      });
    } else {
      // Filtrar por día específico (si se selecciona)
      if (filtroDia) {
        const fechaSeleccionada = obtenerFechaFormatoISO(filtroDia);
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = obtenerFechaFormatoISO(venta.fecha);
          return fechaVenta === fechaSeleccionada;
        });
      }

      // Filtrar por mes (si se selecciona)
      if (filtroMes && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getUTCMonth() === parseInt(filtroMes);
        });
      }

      // Filtrar por año (si se selecciona)
      if (filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getUTCFullYear() === parseInt(filtroAnio);
        });
      }

      // Si hay mes y año seleccionados (sin día específico)
      if (filtroMes && filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getUTCMonth() === parseInt(filtroMes) && 
                 fechaVenta.getUTCFullYear() === parseInt(filtroAnio);
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

  // Función para obtener años únicos de las ventas
  const obtenerAniosUnicos = () => {
    const anios = [...new Set(ventasRegistradas.map(venta => {
      // Usar UTC para evitar problemas de zona horaria
      const fecha = new Date(venta.fecha);
      return fecha.getUTCFullYear();
    }))].sort((a, b) => b - a); // Orden descendente
    return anios;
  };

  // Función para obtener las ventas que se deben mostrar
  const obtenerVentasAMostrar = () => {
    return ventasFiltradas.slice(0, ventasMostradas);
  };

  // Función para cargar más ventas
  const cargarMasVentas = () => {
    setVentasMostradas(prev => prev + 10);
  };

  // Función para mostrar todas las ventas
  const mostrarTodasLasVentas = () => {
    setVentasMostradas(ventasFiltradas.length);
  };

  // Función para obtener meses únicos de las ventas
  const obtenerMesesUnicos = () => {
    const meses = [...new Set(ventasRegistradas.map(venta => {
      // Usar UTC para evitar problemas de zona horaria
      const fecha = new Date(venta.fecha);
      return fecha.getUTCMonth(); // getUTCMonth() retorna 0-11
    }))].sort((a, b) => a - b); // Orden ascendente
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

  // Función para calcular estadísticas dinámicas según filtros aplicados
  const calcularEstadisticasDinamicas = () => {
    let ventasFiltradas = [...ventasRegistradas];

    // Si no hay filtros activos, mostrar solo las ventas del día actual
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago) {
      const hoy = obtenerFechaActual();
      ventasFiltradas = ventasFiltradas.filter(venta => {
        const fechaVenta = obtenerFechaFormatoISO(venta.fecha);
        return fechaVenta === hoy;
      });
    } else {
      // Aplicar los mismos filtros que se usan en filtrarVentas
      if (filtroDia) {
        const fechaSeleccionada = obtenerFechaFormatoISO(filtroDia);
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = obtenerFechaFormatoISO(venta.fecha);
          return fechaVenta === fechaSeleccionada;
        });
      }

      if (filtroMes && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getUTCMonth() === parseInt(filtroMes);
        });
      }

      if (filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getUTCFullYear() === parseInt(filtroAnio);
        });
      }

      if (filtroMes && filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getUTCMonth() === parseInt(filtroMes) && 
                 fechaVenta.getUTCFullYear() === parseInt(filtroAnio);
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
  };

  // Función para obtener el título dinámico del resumen
  const obtenerTituloResumen = () => {
    if (!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago) {
      return `Resumen de Ventas - ${(() => {
        const fechaActual = new Date();
        const year = fechaActual.getFullYear();
        const month = String(fechaActual.getMonth() + 1).padStart(2, '0');
        const day = String(fechaActual.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
      })()}`;
    }

    let titulo = 'Resumen de Ventas - ';
    const partes = [];

    if (filtroDia) {
      const [year, month, day] = filtroDia.split('-');
      partes.push(`${day}/${month}/${year}`);
    }

    if (filtroMes && !filtroDia) {
      partes.push(nombresMeses[parseInt(filtroMes)]);
    }

    if (filtroAnio && !filtroDia) {
      partes.push(filtroAnio);
    }

    if (filtroMes && filtroAnio && !filtroDia) {
      partes.push(`${nombresMeses[parseInt(filtroMes)]} ${filtroAnio}`);
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
      alert('No hay datos para exportar');
      return;
    }

    // Crear contenido CSV
    const headers = ['Fecha', 'Producto', 'Cantidad', 'Unidad', 'Precio Unitario', 'Total Venta', 'Total Final', 'Tipo Pago'];
    const csvContent = [
      headers.join(','),
      ...ventasFiltradas.map(venta => [
        formatearFecha(venta.fecha),
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

  // Función para cargar ventas registradas
  const cargarVentas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error al cargar ventas:', error);
      } else {
        setVentasRegistradas(data || []);
      }
    } catch (error) {
      console.error('❌ Error general al cargar ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar ventas y productos del inventario al montar el componente
  useEffect(() => {
    console.log('🚀 Componente montado, cargando ventas y productos del inventario...');
    cargarVentas();
    cargarProductosInventario();
  }, []);

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
        console.log('📅 Cambio de fecha detectado, actualizando datos...');
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

  // Log del estado actual
  useEffect(() => {
    console.log('📋 Estado actual de ventas:', ventasRegistradas);
    console.log('⏳ Estado de loading:', loading);
  }, [ventasRegistradas, loading]);

  // Función de prueba para verificar conexión


  // Función para validar formato de fecha
  const validarFecha = (fechaString) => {
    console.log('🔍 Validando fecha:', fechaString);
    
    if (!fechaString) {
      console.log('❌ Fecha vacía');
      return false;
    }
    
    // Verificar formato YYYY-MM-DD
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaString)) {
      console.log('❌ Formato de fecha incorrecto. Esperado: YYYY-MM-DD');
      return false;
    }
    
    // Verificar que sea una fecha válida
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) {
      console.log('❌ Fecha inválida');
      return false;
    }
    
    // Verificar que no sea fecha futura (opcional)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fecha > hoy) {
      console.log('⚠️ Fecha futura detectada:', fechaString);
      // No retornamos false aquí, solo un warning
    }
    
    console.log('✅ Fecha válida:', fechaString);
    return true;
  };

  const registrarVenta = async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    console.log('🔍 Iniciando registro de venta...');
    console.log('🔍 Estado de venta:', venta);
    console.log('🔍 Productos en venta:', productosVenta);
    
    // Validar fecha primero
    if (!validarFecha(venta.fecha)) {
      alert('❌ Por favor ingresa una fecha válida en formato YYYY-MM-DD');
      return;
    }
    
    // Validar que todos los campos requeridos estén llenos
    if (!venta.fecha || !venta.tipo_pago) {
      alert('❌ Por favor completa la fecha y tipo de pago');
      console.log('❌ Fecha:', venta.fecha, 'Tipo pago:', venta.tipo_pago);
      return;
    }

    // Validar que haya al menos un producto
    if (productosVenta.length === 0) {
      alert('❌ Por favor agrega al menos un producto a la venta');
      return;
    }

    // Calcular el total de la venta
    const totalVenta = calcularTotalVenta();

    try {
      // Calcular el total final de la venta (suma de todos los subtotales)
      const totalFinal = calcularTotalVenta();
      
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

      alert(`✅ Venta registrada correctamente con ${productosVenta.length} productos. Total: $${totalVenta.toLocaleString()}`);
      
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
      
      // Recargar la lista de ventas
      cargarVentas();
    } catch (error) {
      console.error('❌ Error general al registrar venta:', error);
      alert('❌ Error al registrar venta: ' + error.message);
    }
  };

  // Función para eliminar una venta
  const eliminarVenta = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error al eliminar venta:', error);
        alert('❌ Error al eliminar la venta: ' + error.message);
        return;
      }

      console.log('✅ Venta eliminada exitosamente');
      alert('✅ Venta eliminada exitosamente');
      
      // Recargar la lista de ventas
      await cargarVentas();
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar venta:', error);
      alert('❌ Error inesperado al eliminar la venta');
    } finally {
      setLoading(false);
    }
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
        <div className="max-w-2xl mx-auto">
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
          
          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Registro de Venta
          </h1>
          
          {/* Nuevo diseño del formulario de venta */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            {/* Sección de búsqueda de productos */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center mb-3 md:mb-4">
                <span className="text-blue-400 text-lg md:text-xl mr-2 md:mr-3">🔍</span>
                <h3 className="text-green-400 text-lg md:text-xl font-bold">Buscar Producto</h3>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={busquedaProducto}
                onChange={handleBusquedaProducto}
                className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                placeholder="Escribe el nombre del producto..."
              />
            </div>

            {/* Sección de agregar producto */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center mb-3 md:mb-4">
                <span className="text-blue-400 text-lg md:text-xl mr-2 md:mr-3">➕</span>
                <h3 className="text-green-400 text-lg md:text-xl font-bold">Agregar Producto</h3>
              </div>
              
              {/* Campos del producto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                <div>
                  <label className="block text-white font-medium mb-1 md:mb-2 text-sm md:text-base">Cantidad</label>
                  <input
                    type="number"
                    step="0.01"
                    name="cantidad"
                    value={productoActual.cantidad}
                    onChange={handleChange}
                    className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-1 md:mb-2 text-sm md:text-base">Unidad</label>
                  <select
                    name="unidad"
                    value={productoActual.unidad}
                    onChange={handleChange}
                    className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                  >
                    <option value="">Seleccione unidad</option>
                    {opcionesUnidad.map(opcion => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.icon} {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-white font-medium mb-1 md:mb-2 text-sm md:text-base">Precio Unitario</label>
                  <input
                    type="number"
                    step="0.01"
                    name="precio_unitario"
                    value={productoActual.precio_unitario}
                    onChange={handleChange}
                    className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Botón para agregar producto */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={agregarProducto}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-all duration-300 text-sm md:text-base"
                >
                  Agregar Producto
                </button>
              </div>
            </div>

            {/* Sección de productos en la venta */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center mb-3 md:mb-4">
                <span className="text-blue-400 text-lg md:text-xl mr-2 md:mr-3">🛒</span>
                <h3 className="text-green-400 text-lg md:text-xl font-bold">Productos en la Venta</h3>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10">
                {productosVenta.length === 0 ? (
                  <p className="text-gray-400 text-center text-sm md:text-base">No hay productos agregados</p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {productosVenta.map((producto, index) => (
                      <div key={producto.id} className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/10">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm md:text-base truncate">{producto.producto}</p>
                          <p className="text-gray-300 text-xs md:text-sm">
                            {producto.cantidad} {producto.unidad} - ${parseFloat(producto.precio_unitario).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => eliminarProducto(producto.id)}
                          className="text-red-400 hover:text-red-300 text-lg md:text-xl font-bold ml-2 flex-shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-300"
                >
                  Ingresar producto manualmente
                </button>
              </div>,
              document.body
            )}

            {/* Sección de total */}
            <div className="mb-6 md:mb-8">
              <div className="bg-green-600 rounded-lg p-6 text-center">
                <p className="text-white font-bold text-2xl">Total: ${calcularTotalVenta().toLocaleString()}</p>
              </div>
            </div>

            {/* Sección de tipo de pago */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center mb-3 md:mb-4">
                <span className="text-blue-400 text-lg md:text-xl mr-2 md:mr-3">💳</span>
                <h3 className="text-green-400 text-lg md:text-xl font-bold">Tipo de Pago</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <button
                  type="button"
                  onClick={() => setVenta({...venta, tipo_pago: 'efectivo'})}
                  className={`p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                    venta.tipo_pago === 'efectivo' 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-green-400 text-xl md:text-2xl mb-1 md:mb-2">💵</div>
                    <p className="font-medium text-xs md:text-sm">Efectivo</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setVenta({...venta, tipo_pago: 'debito'})}
                  className={`p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                    venta.tipo_pago === 'debito' 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-blue-400 text-xl md:text-2xl mb-1 md:mb-2">💳</div>
                    <p className="font-medium text-xs md:text-sm">Débito</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setVenta({...venta, tipo_pago: 'credito'})}
                  className={`p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                    venta.tipo_pago === 'credito' 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-orange-400 text-xl md:text-2xl mb-1 md:mb-2">💳</div>
                    <p className="font-medium text-xs md:text-sm">Crédito</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setVenta({...venta, tipo_pago: 'transferencia'})}
                  className={`p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                    venta.tipo_pago === 'transferencia' 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-purple-400 text-xl md:text-2xl mb-1 md:mb-2">📱</div>
                    <p className="font-medium text-xs md:text-sm">Transferencia</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Botón procesar venta */}
            <div className="text-center">
              <button
                type="button"
                onClick={registrarVenta}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg md:text-xl"
              >
                <span className="text-yellow-400 mr-2">💰</span>
                Procesar Venta
              </button>
            </div>
          </div>





          {/* Sección de Ventas Registradas */}
          <div className="mt-8 md:mt-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center drop-shadow-lg mb-4 md:mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Ventas Registradas
            </h2>
            
            {/* Filtros de fecha */}
            <div className="mb-4 md:mb-6 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
                    {obtenerMesesUnicos().map(mes => (
                      <option key={mes} value={mes} className="bg-gray-800 text-white">
                        {nombresMeses[mes]}
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
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 md:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm md:text-base"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Limpiar Filtros
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
                      {filtroMes && ` Mes: ${nombresMeses[parseInt(filtroMes)]}`}
                      {filtroAnio && ` Año: ${filtroAnio}`}
                      {filtroTipoPago && ` Pago: ${obtenerInfoTipoPago(filtroTipoPago).icon} ${obtenerInfoTipoPago(filtroTipoPago).label}`}
                    </>
                  )}
                  {` | Mostrando ${ventasFiltradas.length} de ${ventasRegistradas.length} ventas`}
                </p>
              </div>
            </div>
            

            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
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
                  {/* Contenedor con altura máxima y scroll vertical */}
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
                        {obtenerVentasAMostrar().map((venta, index) => (
                          <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                            <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                              {formatearFecha(venta.fecha)}
                            </td>
                            <td className="text-gray-200 p-2 md:p-3 font-medium text-xs md:text-sm truncate max-w-20 md:max-w-32">{venta.producto || 'Sin producto'}</td>
                            <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                              {!isNaN(venta.cantidad) ? venta.cantidad : '0'} {obtenerInfoUnidad(venta.unidad).icon} {obtenerInfoUnidad(venta.unidad).label}
                            </td>
                            <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                              ${!isNaN(venta.precio_unitario) ? parseFloat(venta.precio_unitario).toLocaleString() : '0'}
                            </td>
                            <td className="text-green-300 p-2 md:p-3 font-bold text-xs md:text-sm">
                              ${!isNaN(venta.total_venta) ? parseFloat(venta.total_venta).toLocaleString() : '0'}
                            </td>
                            <td className="text-blue-300 p-2 md:p-3 font-bold text-xs md:text-sm">
                              {venta.total_final ? `$${parseFloat(venta.total_final).toLocaleString()}` : '-'}
                            </td>
                            <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                              <span className="px-1 md:px-2 py-1 bg-green-600/20 rounded-full text-xs">
                                {obtenerInfoTipoPago(venta.tipo_pago).icon} {obtenerInfoTipoPago(venta.tipo_pago).label}
                              </span>
                            </td>
                            <td className="p-2 md:p-3">
                              <button
                                onClick={() => eliminarVenta(venta.id)}
                                disabled={loading}
                                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                                title="Eliminar venta"
                              >
                                🗑️ Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Controles para cargar más ventas */}
                  {ventasFiltradas.length > ventasMostradas && (
                    <div className="mt-4 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-blue-200 text-sm">
                          Mostrando {ventasMostradas} de {ventasFiltradas.length} ventas
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={cargarMasVentas}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                          >
                            Cargar 10 más
                          </button>
                          <button
                            onClick={mostrarTodasLasVentas}
                            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                          >
                            Mostrar todas
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Información cuando se muestran todas las ventas */}
                  {ventasFiltradas.length > 0 && ventasMostradas >= ventasFiltradas.length && (
                    <div className="mt-4 p-3 bg-green-600/20 backdrop-blur-sm rounded-lg border border-green-500/30">
                      <p className="text-green-200 text-sm text-center">
                        ✅ Mostrando todas las {ventasFiltradas.length} ventas
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
              <div className="mt-4 md:mt-6 text-center space-y-2 md:space-y-0 md:space-x-2 lg:space-x-4">
                <button
                  onClick={cargarVentas}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 md:px-4 rounded-lg transition-all duration-300 transform hover:scale-105 text-xs md:text-sm"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Actualizar Lista
                </button>
                <button
                  onClick={exportarDatosFiltrados}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 md:px-4 rounded-lg transition-all duration-300 transform hover:scale-105 text-xs md:text-sm"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Exportar CSV
                </button>
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