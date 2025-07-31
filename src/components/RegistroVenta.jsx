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
      const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      ventasFiltradas = ventasFiltradas.filter(venta => {
        const fechaVenta = new Date(venta.fecha).toISOString().split('T')[0];
        return fechaVenta === fechaActual;
      });
    } else {
      // Filtrar por día específico (si se selecciona)
      if (filtroDia) {
        const fechaSeleccionada = new Date(filtroDia).toISOString().split('T')[0];
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha).toISOString().split('T')[0];
          return fechaVenta === fechaSeleccionada;
        });
      }

      // Filtrar por mes (si se selecciona)
      if (filtroMes && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getMonth() === parseInt(filtroMes);
        });
      }

      // Filtrar por año (si se selecciona)
      if (filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getFullYear() === parseInt(filtroAnio);
        });
      }

      // Si hay mes y año seleccionados (sin día específico)
      if (filtroMes && filtroAnio && !filtroDia) {
        ventasFiltradas = ventasFiltradas.filter(venta => {
          const fechaVenta = new Date(venta.fecha);
          return fechaVenta.getMonth() === parseInt(filtroMes) && 
                 fechaVenta.getFullYear() === parseInt(filtroAnio);
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

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroDia('');
    setFiltroMes('');
    setFiltroAnio('');
    setFiltroTipoPago('');
  };

  // Función para obtener años únicos de las ventas
  const obtenerAniosUnicos = () => {
    const anios = [...new Set(ventasRegistradas.map(venta => 
      new Date(venta.fecha).getFullYear()
    ))].sort((a, b) => b - a); // Orden descendente
    return anios;
  };

  // Función para obtener meses únicos de las ventas
  const obtenerMesesUnicos = () => {
    const meses = [...new Set(ventasRegistradas.map(venta => 
      new Date(venta.fecha).getMonth()
    ))].sort((a, b) => a - b); // Orden ascendente
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

  // Función para calcular estadísticas diarias por tipo de pago
  const calcularEstadisticasDiarias = () => {
    const hoy = obtenerFechaActual(); // Usar la función consistente
    
    // Filtrar ventas del día actual
    const ventasHoy = ventasRegistradas.filter(venta => {
      const fechaVenta = new Date(venta.fecha).toISOString().split('T')[0];
      return fechaVenta === hoy;
    });

    // Filtrar ventas que tienen total_final (ventas completas)
    const ventasCompletas = ventasHoy.filter(venta => venta.total_final !== null && venta.total_final !== undefined);

    // Calcular totales por tipo de pago
    const estadisticas = {
      total: {
        cantidad: ventasCompletas.length, // Solo contar ventas con total_final
        monto: ventasHoy.reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0)
      },
      efectivo: {
        cantidad: ventasHoy.filter(v => v.tipo_pago === 'efectivo').length,
        monto: ventasHoy.filter(v => v.tipo_pago === 'efectivo').reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0)
      },
      debito: {
        cantidad: ventasHoy.filter(v => v.tipo_pago === 'debito').length,
        monto: ventasHoy.filter(v => v.tipo_pago === 'debito').reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0)
      },
      credito: {
        cantidad: ventasHoy.filter(v => v.tipo_pago === 'credito').length,
        monto: ventasHoy.filter(v => v.tipo_pago === 'credito').reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0)
      },
      transferencia: {
        cantidad: ventasHoy.filter(v => v.tipo_pago === 'transferencia').length,
        monto: ventasHoy.filter(v => v.tipo_pago === 'transferencia').reduce((sum, venta) => sum + (parseFloat(venta.total_venta) || 0), 0)
      }
    };

    return estadisticas;
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
        new Date(venta.fecha).toLocaleDateString('es-ES'),
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
    link.setAttribute('download', `ventas_${new Date().toISOString().split('T')[0]}.csv`);
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
  const probarConexion = async () => {
    console.log('🔍 Probando conexión con tabla "ventas"...');
    
    try {
      // Probar conexión básica
      console.log('🔍 1. Probando conexión básica...');
      const { data: testData, error: testError } = await supabase
        .from('ventas')
        .select('count')
        .limit(1);
      
      console.log('🔍 Resultado conexión básica:', { testData, testError });
      
      // Probar obtener estructura de la tabla
      console.log('🔍 2. Probando obtener estructura...');
      const { data: structureData, error: structureError } = await supabase
        .from('ventas')
        .select('*')
        .limit(1);
      
      console.log('🔍 Estructura de la tabla:', structureData);
      console.log('🔍 Error de estructura:', structureError);
      
      // Probar obtener todos los registros
      console.log('🔍 3. Probando obtener todos los registros...');
      const { data: allData, error: allError } = await supabase
        .from('ventas')
        .select('*');
      
      console.log('🔍 Todos los registros:', allData);
      console.log('🔍 Error de todos los registros:', allError);
      console.log('🔍 Cantidad de registros:', allData ? allData.length : 0);
      
    } catch (error) {
      console.error('🔍 Error en prueba de conexión:', error);
    }
  };

  // Ejecutar prueba al montar
  useEffect(() => {
    probarConexion();
  }, []);

  // Función para verificar permisos y estructura
  const verificarTabla = async () => {
    console.log('🔐 Verificando permisos y estructura de la tabla...');
    
    try {
      // Verificar si podemos insertar (permisos de escritura)
      console.log('🔐 Probando permisos de escritura...');
      const testVenta = {
        fecha: new Date().toISOString().split('T')[0],
        tipo_pago: 'test',
        producto: 'Test Product',
        cantidad: 1,
        unidad: 'Unid',
        precio_unitario: 100,
        total_venta: 100
      };
      
      const { error: insertError } = await supabase
        .from('ventas')
        .insert([testVenta]); // ✅ No pide retornar columnas
      
      console.log('🔐 Resultado de inserción de prueba:', { insertError });
      
      if (!insertError) {
        console.log('🔐 Permisos de escritura OK');
        
        // Eliminar el registro de prueba
        const { error: deleteError } = await supabase
          .from('ventas')
          .delete()
          .eq('producto', 'Test Product');
        
        console.log('🔐 Eliminación de prueba:', deleteError);
      } else {
        console.error('🔐 Error en inserción de prueba:', insertError);
      }
      
    } catch (error) {
      console.error('🔐 Error en verificación de permisos:', error);
    }
  };

  // Función para verificar la estructura de la tabla
  const verificarEstructuraTabla = async () => {
    console.log('🔍 Verificando estructura de la tabla "ventas"...');
    
    try {
      // Intentar obtener información de la estructura consultando un registro
      console.log('🔍 1. Obteniendo información de estructura...');
      const { data: estructuraData, error: estructuraError } = await supabase
        .from('ventas')
        .select('*')
        .limit(1);
      
      console.log('🔍 Datos de estructura:', estructuraData);
      console.log('🔍 Error de estructura:', estructuraError);
      
      if (estructuraData && estructuraData.length > 0) {
        const primerRegistro = estructuraData[0];
        console.log('🔍 Columnas encontradas en la tabla:');
        Object.keys(primerRegistro).forEach(columna => {
          console.log(`  - ${columna}: ${typeof primerRegistro[columna]} = ${primerRegistro[columna]}`);
        });
        
        // Verificar si faltan columnas que estamos enviando
        const columnasEsperadas = ['fecha', 'tipo_pago', 'producto', 'cantidad', 'unidad', 'precio_unitario', 'total_venta'];
        const columnasFaltantes = columnasEsperadas.filter(col => !(col in primerRegistro));
        
        if (columnasFaltantes.length > 0) {
          console.warn('⚠️ Columnas faltantes en la tabla:', columnasFaltantes);
        } else {
          console.log('✅ Todas las columnas esperadas están presentes');
        }
        
        // Verificar columnas extra en la tabla
        const columnasExtra = Object.keys(primerRegistro).filter(col => !columnasEsperadas.includes(col));
        if (columnasExtra.length > 0) {
          console.log('ℹ️ Columnas adicionales en la tabla:', columnasExtra);
        }
        
      } else {
        console.log('ℹ️ La tabla está vacía, no se puede determinar la estructura');
        
        // Intentar insertar un registro de prueba para ver la estructura
        console.log('🔍 2. Intentando insertar registro de prueba para ver estructura...');
        const testVenta = {
          fecha: new Date().toISOString().split('T')[0],
          tipo_pago: 'test',
          producto: 'Test Product',
          cantidad: 1,
          unidad: 'Unid',
          precio_unitario: 100,
          total_venta: 100
        };
        
        const { error: insertTestError } = await supabase
          .from('ventas')
          .insert([testVenta]); // ✅ No pide retornar columnas
        
        console.log('🔍 Resultado inserción de prueba:', { insertTestError });
        
        if (!insertTestError) {
          console.log('🔍 Inserción de prueba exitosa');
          
          // Eliminar el registro de prueba
          const { error: deleteError } = await supabase
            .from('ventas')
            .delete()
            .eq('producto', 'Test Product');
          
          console.log('🔍 Eliminación de registro de prueba:', deleteError);
        } else {
          console.error('🔍 Error en inserción de prueba:', insertTestError);
        }
      }
      
    } catch (error) {
      console.error('🔍 Error al verificar estructura:', error);
    }
  };

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

  // Función para consulta directa de datos
  const consultaDirecta = async () => {
    console.log('🔍 Realizando consulta directa a Supabase...');
    
    try {
      // Consulta 1: Contar registros
      console.log('🔍 1. Contando registros...');
      const { count, error: countError } = await supabase
        .from('ventas')
        .select('*', { count: 'exact', head: true });
      
      console.log('🔍 Total de registros:', count);
      console.log('🔍 Error en conteo:', countError);
      
      // Consulta 2: Obtener todos los registros
      console.log('🔍 2. Obteniendo todos los registros...');
      const { data: allData, error: allError } = await supabase
        .from('ventas')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('🔍 Datos completos:', allData);
      console.log('🔍 Error en consulta completa:', allError);
      
      // Consulta 3: Obtener solo los últimos 5 registros
      console.log('🔍 3. Obteniendo últimos 5 registros...');
      const { data: recentData, error: recentError } = await supabase
        .from('ventas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log('🔍 Últimos 5 registros:', recentData);
      console.log('🔍 Error en consulta reciente:', recentError);
      
      // Mostrar resumen en alert
      const mensaje = `
📊 Resumen de consulta directa:
• Total de registros: ${count || 0}
• Registros obtenidos: ${allData ? allData.length : 0}
• Últimos 5 registros: ${recentData ? recentData.length : 0}
• Errores: ${countError || allError || recentError ? 'Sí' : 'No'}
      `;
      
      alert(mensaje);
      
    } catch (error) {
      console.error('🔍 Error en consulta directa:', error);
      alert('❌ Error en consulta directa: ' + error.message);
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
                      {filtroDia && ` Día: ${new Date(filtroDia).toLocaleDateString('es-ES')}`}
                      {filtroMes && ` Mes: ${nombresMeses[parseInt(filtroMes)]}`}
                      {filtroAnio && ` Año: ${filtroAnio}`}
                      {filtroTipoPago && ` Pago: ${obtenerInfoTipoPago(filtroTipoPago).icon} ${obtenerInfoTipoPago(filtroTipoPago).label}`}
                    </>
                  )}
                  {` | Mostrando ${ventasFiltradas.length} de ${ventasRegistradas.length} ventas`}
                </p>
              </div>
            </div>
            
            {/* Debug Info */}
            <div className="mb-3 md:mb-4 p-3 md:p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
              <p className="text-yellow-200 text-xs md:text-sm">
                <strong>Debug:</strong> Loading: {loading.toString()} | Ventas: {ventasRegistradas.length} registros | Filtradas: {ventasFiltradas.length}
                {!filtroDia && !filtroMes && !filtroAnio && !filtroTipoPago ? (
                  <span> | Modo: Día actual (por defecto)</span>
                ) : (
                  <span> | Filtros: {[filtroDia && 'Día', filtroMes && 'Mes', filtroAnio && 'Año', filtroTipoPago && 'Pago'].filter(Boolean).join(', ')}</span>
                )}
              </p>
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
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Fecha</th>
                        <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Producto</th>
                        <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Cantidad</th>
                        <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Precio</th>
                        <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Total</th>
                        <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Total Final</th>
                        <th className="text-gray-200 font-semibold p-2 md:p-3 text-xs md:text-sm">Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasFiltradas.map((venta, index) => (
                        <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                          <td className="text-gray-200 p-2 md:p-3 text-xs md:text-sm">
                            {venta.fecha ? new Date(venta.fecha).toLocaleDateString('es-ES') : 'Fecha inválida'}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Estadísticas diarias siempre visibles */}
                  <div className="mt-4 md:mt-6 p-4 md:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                    <h4 className="text-blue-300 font-bold text-base md:text-lg mb-3 md:mb-4 text-center">Estadísticas Diarias - {new Date().toLocaleDateString('es-ES')}</h4>
                    
                    {/* Listado de estadísticas */}
                    <div className="space-y-2 md:space-y-3">
                      {/* Total Diario */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-blue-400 text-lg md:text-xl mr-3">📊</span>
                          <div>
                            <p className="text-blue-200 text-sm md:text-base font-medium">Total Diario</p>
                            <p className="text-blue-300 text-xs md:text-sm">{calcularEstadisticasDiarias().total.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDiarias().total.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Efectivo Diario */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-green-400 text-lg md:text-xl mr-3">💵</span>
                          <div>
                            <p className="text-green-200 text-sm md:text-base font-medium">Efectivo</p>
                            <p className="text-green-300 text-xs md:text-sm">{calcularEstadisticasDiarias().efectivo.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDiarias().efectivo.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Débito Diario */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-purple-400 text-lg md:text-xl mr-3">💳</span>
                          <div>
                            <p className="text-purple-200 text-sm md:text-base font-medium">Débito</p>
                            <p className="text-purple-300 text-xs md:text-sm">{calcularEstadisticasDiarias().debito.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-purple-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDiarias().debito.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Crédito Diario */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-orange-400 text-lg md:text-xl mr-3">💳</span>
                          <div>
                            <p className="text-orange-200 text-sm md:text-base font-medium">Crédito</p>
                            <p className="text-orange-300 text-xs md:text-sm">{calcularEstadisticasDiarias().credito.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-orange-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDiarias().credito.monto.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Transferencia Diaria */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-indigo-400 text-lg md:text-xl mr-3">📱</span>
                          <div>
                            <p className="text-indigo-200 text-sm md:text-base font-medium">Transferencia</p>
                            <p className="text-indigo-300 text-xs md:text-sm">{calcularEstadisticasDiarias().transferencia.cantidad} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-indigo-300 font-bold text-lg md:text-xl">
                            ${calcularEstadisticasDiarias().transferencia.monto.toLocaleString()}
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
                  onClick={probarConexion}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-3 md:px-4 rounded-lg transition-all duration-300 transform hover:scale-105 text-xs md:text-sm"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Probar Conexión
                </button>
                <button
                  onClick={verificarTabla}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 md:px-4 rounded-lg transition-all duration-300 transform hover:scale-105 text-xs md:text-sm"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Verificar Permisos
                </button>
                <button
                  onClick={verificarEstructuraTabla}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-3 md:px-4 rounded-lg transition-all duration-300 transform hover:scale-105 text-xs md:text-sm"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Verificar Estructura
                </button>
                <button
                  onClick={consultaDirecta}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 md:px-4 rounded-lg transition-all duration-300 transform hover:scale-105 text-xs md:text-sm"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Consultar Datos
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