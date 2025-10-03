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
  const [mesas, setMesas] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState('');
  const [cantidadMesas, setCantidadMesas] = useState(4);
  const [productosPorMesa, setProductosPorMesa] = useState({});
  
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
    estado: ''
  });
  

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
        .select('id, fecha, fecha_cl, mesa, producto, unidad, cantidad, precio, total, total_final, propina, estado, tipo_pago, usuario_id, created_at')
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
          .select('id, fecha, mesa, producto, unidad, cantidad, precio, total, total_final, propina, estado, tipo_pago, usuario_id, created_at')
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
  const agregarProductoAMesa = () => {
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

    // Guardar en localStorage
    const productosGuardados = {
      ...productosPorMesa,
      [mesaSeleccionada]: [...(productosPorMesa[mesaSeleccionada] || []), nuevoProducto]
    };
    localStorage.setItem('productosPorMesa', JSON.stringify(productosGuardados));
  };

  // Función para eliminar un producto de una mesa
  const eliminarProducto = (mesa, productoId) => {
    setProductosPorMesa(prev => ({
      ...prev,
      [mesa]: prev[mesa].filter(p => p.id !== productoId)
    }));
  };

  // Función para calcular el total de una mesa
  const calcularTotalMesa = (mesa) => {
    const productos = productosPorMesa[mesa] || [];
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
  const agregarMesas = () => {
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
    
    // Guardar en localStorage inmediatamente
    localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));
  };

  // Función para eliminar una mesa
  const eliminarMesa = (mesaAEliminar) => {
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

    // Actualizar localStorage de mesas
    localStorage.setItem('mesasPedidos', JSON.stringify(mesasActualizadas));
    
    // Actualizar localStorage de productos
    const productosGuardados = { ...productosPorMesa };
    delete productosGuardados[mesaAEliminar];
    localStorage.setItem('productosPorMesa', JSON.stringify(productosGuardados));
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
      estado: pedido.estado || ''
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
      estado: ''
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
          mesa: valoresEdicion.mesa ? parseInt(valoresEdicion.mesa) : null,
          producto: valoresEdicion.producto.trim(),
          unidad: valoresEdicion.unidad,
          cantidad: valoresEdicion.cantidad,
          precio: parseFloat(valoresEdicion.precio),
          total: valoresEdicion.total ? parseFloat(valoresEdicion.total) : null,
          total_final: valoresEdicion.total_final ? parseFloat(valoresEdicion.total_final) : null,
          propina: valoresEdicion.propina ? parseFloat(valoresEdicion.propina) : null,
          tipo_pago: valoresEdicion.tipo_pago || null,
          estado: valoresEdicion.estado || null
        })
        .eq('id', id)
        .eq('usuario_id', usuarioId) // 🔒 SEGURIDAD: Solo editar pedidos del usuario actual
        .eq('cliente_id', cliente_id); // 🔒 SEGURIDAD: Solo editar pedidos del cliente actual

      if (error) {
        console.error('❌ Error al actualizar pedido:', error);
        alert('❌ Error al actualizar el pedido: ' + error.message);
        return;
      }

      alert('✅ Pedido actualizado exitosamente');
      cancelarEdicion();
      await cargarPedidosRegistrados();

    } catch (error) {
      console.error('❌ Error inesperado al actualizar pedido:', error);
      alert('❌ Error inesperado al actualizar el pedido');
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Función para registrar pedido en Supabase
  const registrarPedido = async (mesa) => {
    // Validar fecha primero
    if (!validarFecha(pedido.fecha)) {
      alert('❌ Por favor ingresa una fecha válida en formato YYYY-MM-DD');
      return;
    }

    // Validar que haya productos en la mesa
    if (!productosPorMesa[mesa] || productosPorMesa[mesa].length === 0) {
      alert('❌ No hay productos en esta mesa para registrar');
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

     // Extraer el número de mesa (ej: "Mesa 1" -> 1)
     const numeroMesa = parseInt(mesa.replace('Mesa ', ''));

           // Calcular el total final de la mesa (con propina si está activa)
      const totalFinal = calcularTotalConPropina(mesa);

    try {
      // Registrar cada producto como una fila individual en la tabla pedidos
      for (let i = 0; i < productosPorMesa[mesa].length; i++) {
        const producto = productosPorMesa[mesa][i];
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
            mesaValue = numeroMesa; // Mesa solo en la primera fila
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
          console.error('❌ Error al registrar producto del pedido:', error);
          alert('❌ Error al registrar pedido: ' + error.message);
          return;
        }
      }

             alert(`✅ Pedido de ${mesa} registrado correctamente con ${productosPorMesa[mesa].length} productos. Total: $${totalFinal.toLocaleString()}`);
       
       // Limpiar los productos de la mesa registrada
       setProductosPorMesa(prev => {
         const nuevosProductos = { ...prev };
         delete nuevosProductos[mesa];
         return nuevosProductos;
       });

       // Limpiar el tipo de pago y campos de vuelto
       setPedido(prev => ({
         ...prev,
         tipo_pago: ''
       }));
       
       // Limpiar campos de vuelto
       setMontoPagado('');
       setMostrarVuelto(false);

       // Actualizar localStorage
       const productosGuardados = { ...productosPorMesa };
       delete productosGuardados[mesa];
       localStorage.setItem('productosPorMesa', JSON.stringify(productosGuardados));

       // Recargar la tabla de pedidos registrados
       cargarPedidosRegistrados();

    } catch (error) {
      console.error('❌ Error general al registrar pedido:', error);
      alert('❌ Error al registrar pedido: ' + error.message);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarProductosInventario();
    cargarPedidosRegistrados();
    
    // Cargar mesas guardadas en localStorage
    const mesasGuardadas = localStorage.getItem('mesasPedidos');
    if (mesasGuardadas) {
      try {
        const mesasArray = JSON.parse(mesasGuardadas);
        setMesas(mesasArray);
        // Si hay mesas guardadas, seleccionar la primera
        if (mesasArray.length > 0) {
          setMesaSeleccionada(mesasArray[0]);
        }
      } catch (error) {
        console.error('Error al cargar mesas del localStorage:', error);
        // Si hay error, inicializar con mesas por defecto
        const mesasDefault = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4'];
        setMesas(mesasDefault);
        setMesaSeleccionada('Mesa 1');
      }
    } else {
      // Si no hay mesas guardadas, inicializar con mesas por defecto
      const mesasDefault = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4'];
      setMesas(mesasDefault);
      setMesaSeleccionada('Mesa 1');
    }
    
    // Cargar productos guardados en localStorage
    const productosGuardados = localStorage.getItem('productosPorMesa');
    if (productosGuardados) {
      try {
        setProductosPorMesa(JSON.parse(productosGuardados));
      } catch (error) {
        console.error('Error al cargar productos del localStorage:', error);
      }
    }
  }, []);

  // Guardar productos en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('productosPorMesa', JSON.stringify(productosPorMesa));
  }, [productosPorMesa]);

  // Guardar mesas en localStorage cuando cambien
  useEffect(() => {
    if (mesas.length > 0) {
      localStorage.setItem('mesasPedidos', JSON.stringify(mesas));
    }
  }, [mesas]);

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

  // Opciones de unidad
  const opcionesUnidad = [
    { value: 'unidad', label: 'Unidad', icon: '📦' },
    { value: 'kg', label: 'Kilogramo', icon: '⚖️' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#1a3d1a' }}>
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

          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Sistema de Pedidos
          </h1>

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
                    <button
                      onClick={() => setMesaSeleccionada(mesa)}
                      className="flex-1 text-left"
                    >
                      {mesa}
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
                    {/* Lista de productos de la mesa */}
                    <div className="space-y-2">
                      {productosPorMesa[mesaSeleccionada].map((producto) => (
                                                 <div key={producto.id} className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                          <div className="flex-1">
                            <p className="text-white font-medium">{producto.producto}</p>
                            <p className="text-gray-300 text-sm">
                              {producto.cantidad} {producto.unidad} - ${parseFloat(producto.precio_unitario).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-green-400 font-bold">
                              ${parseFloat(producto.subtotal).toLocaleString()}
                            </span>
                            <button
                              onClick={() => eliminarProducto(mesaSeleccionada, producto.id)}
                              className="text-red-400 hover:text-red-300 text-lg"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                                                               {/* Resumen de la mesa */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                       <div className="flex justify-between items-center mb-3">
                         <div className="text-white">
                           <span className="font-medium">Total de Productos: </span>
                           <span className="text-gray-300">{productosPorMesa[mesaSeleccionada].length}</span>
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

                         {/* Botón Registrar Pedido */}
             {mesaSeleccionada && productosPorMesa[mesaSeleccionada] && productosPorMesa[mesaSeleccionada].length > 0 && (
               <div className="text-center mt-6">
                 <button
                   onClick={() => registrarPedido(mesaSeleccionada)}
                   className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg shadow-lg"
                 >
                   📝 Registrar Pedido de {mesaSeleccionada}
                 </button>
                 <p className="text-gray-400 text-sm mt-2">
                   Registra el pedido completo de la mesa en Supabase
                 </p>
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
                                    type="number"
                                    value={valoresEdicion.mesa}
                                    onChange={(e) => handleEdicionChange('mesa', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Número mesa"
                                  />
                                ) : (
                                  pedido.mesa ? (
                                    <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs">
                                      Mesa {pedido.mesa}
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
       <Footer />
     </div>
   );
 }
