import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { obtenerFechaHoyChile } from '../lib/dateUtils.js';
import Footer from './Footer';

export default function Clientes() {
  const navigate = useNavigate();
  
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [loadingEliminar, setLoadingEliminar] = useState(false);
  const [clientesUnicos, setClientesUnicos] = useState([]);
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false);
  
  // Estados para el formulario de pedido
  const [pedidoActual, setPedidoActual] = useState({
    fecha_cl: obtenerFechaHoyChile(),
    nombre_cliente: ''
  });
  
  // Estados para productos individuales
  const [productoActual, setProductoActual] = useState({
    producto: '',
    cantidad: '',
    precio_unitario: '',
    total: ''
  });
  
  // Lista de productos agregados al pedido
  const [productosDelPedido, setProductosDelPedido] = useState([]);
  
  // Estados para la tabla de datos y filtros
  const [registrosPedidos, setRegistrosPedidos] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_especifica: '',
    mes: '',
    ano: '',
    producto: ''
  });
  
  // Estados para resumen de clientes
  const [resumenClientes, setResumenClientes] = useState([]);
  const [estadosPago, setEstadosPago] = useState({}); // {nombre_cliente: 'pagado'/'pendiente'}
  const [fechasPago, setFechasPago] = useState({}); // {nombre_cliente: 'YYYY-MM-DD'}
  
  // Estados para filtros del resumen
  const [filtrosResumen, setFiltrosResumen] = useState({
    nombre: '',
    mes: '',
    ano: ''
  });
  
  // Función para cargar clientes únicos del usuario autenticado
  const cargarClientesUnicos = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      // Obtener clientes únicos de la tabla clientes basados en nombre_cliente
      const { data, error } = await supabase
        .from('clientes')
        .select('nombre_cliente')
        .eq('usuario_id', usuarioId) // ✅ FILTRO CRÍTICO POR USUARIO
        .not('nombre_cliente', 'is', null);

      if (error) {
        console.error('Error al cargar clientes únicos:', error);
        return;
      }

      // Obtener nombres únicos de clientes (sin duplicados)
      const nombresUnicos = [...new Set(data?.map(item => item.nombre_cliente))];
      
      // Formatear para la lista local - SIN ordenamiento alfabético
      const clientesUnicosFormateados = nombresUnicos
        .map((nombre, index) => ({
          id: `cliente_${index}_${Date.now()}`, // ID temporal único para la UI
          nombre: nombre
        }));

      setClientesUnicos(clientesUnicosFormateados);
    } catch (error) {
      console.error('Error inesperado al cargar clientes únicos:', error);
    }
  };

  // Función para agregar un nuevo cliente único
  const agregarClienteUnico = async (nombreCliente) => {
    try {
      // Verificar si el cliente ya existe
      const clienteExistente = clientesUnicos.find(
        cliente => cliente.nombre.toLowerCase() === nombreCliente.toLowerCase()
      );
      
      if (clienteExistente) {
        return true; // Cliente ya existe, no necesita crearse
      }

      // Agregar el cliente a la lista local (solo para UI)
      const nuevoCliente = {
        id: `cliente_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID temporal único para la UI
        nombre: nombreCliente // Solo el nombre del cliente externo
      };
      
      setClientesUnicos(prev => [...prev, nuevoCliente]); // SIN ordenamiento alfabético
      
      return true;
    } catch (error) {
      console.error('Error inesperado al agregar cliente único:', error);
      return false;
    }
  };

  // Función para eliminar un cliente único
  const eliminarClienteUnico = async (clienteId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente del dropdown? Los registros de pedidos existentes NO se eliminarán.')) {
      return;
    }

    try {
      // Encontrar el cliente en la lista local
      const clienteAEliminar = clientesUnicos.find(c => c.id === clienteId);
      if (!clienteAEliminar) return;

      // Solo eliminar el nombre del dropdown (lista local)
      // NO eliminar los registros de pedidos existentes
      setClientesUnicos(prev => prev.filter(cliente => cliente.id !== clienteId));
      
      // Si el cliente eliminado estaba seleccionado, limpiar la selección
      if (pedidoActual.nombre_cliente === clienteAEliminar.nombre) {
        setPedidoActual(prev => ({ ...prev, nombre_cliente: '' }));
      }
      
      alert('✅ Cliente eliminado del dropdown correctamente. Los registros de pedidos se mantienen intactos.');
    } catch (error) {
      console.error('Error inesperado al eliminar cliente del dropdown:', error);
      alert('❌ Error inesperado al eliminar el cliente del dropdown');
    }
  };

  // Función para cargar registros de pedidos con filtros
  const cargarRegistrosPedidos = async () => {
    try {
      setLoadingRegistros(true);
      
      // Obtener usuario actual para filtrar
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado para cargar registros');
        setRegistrosPedidos([]);
        return;
      }

      // Consulta con filtro por usuario
      let query = supabase
        .from('clientes')
        .select('*')
        .eq('usuario_id', usuarioId); // ✅ FILTRO CRÍTICO POR USUARIO

      // Aplicar filtros usando fecha_cl
      const aplicarFechaEspecifica = filtros.fecha_especifica && filtros.fecha_especifica.trim() !== '';
      const aplicarMesAno = filtros.mes || filtros.ano;
      const hayFiltrosActivos = aplicarFechaEspecifica || aplicarMesAno || filtros.producto;
      
      // Si no hay filtros activos, mostrar solo registros del día actual
      if (!hayFiltrosActivos) {
        const fechaHoy = obtenerFechaHoyChile();
        query = query.eq('fecha_cl', fechaHoy);
      }
      
      if (filtros.fecha_especifica && filtros.fecha_especifica.trim() !== '') {
        query = query.eq('fecha_cl', filtros.fecha_especifica);
      } else if (filtros.mes || filtros.ano) {
        // Determinar año: usar el especificado o el actual
        const anoParaFiltro = filtros.ano || new Date().getFullYear().toString();
        
        if (filtros.mes) {
          // Filtro por mes específico (con año especificado o actual)
          const mesStr = filtros.mes.toString().padStart(2, '0');
          const fechaInicio = `${anoParaFiltro}-${mesStr}-01`;
          
          // Calcular el último día del mes
          const ultimoDiaDelMes = new Date(parseInt(anoParaFiltro), parseInt(filtros.mes), 0).getDate();
          const fechaFin = `${anoParaFiltro}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
          
          query = query.gte('fecha_cl', fechaInicio);
          query = query.lte('fecha_cl', fechaFin);
        } else if (filtros.ano) {
          // Filtro solo por año
          const fechaInicio = `${filtros.ano}-01-01`;
          const fechaFin = `${filtros.ano}-12-31`;
          query = query.gte('fecha_cl', fechaInicio);
          query = query.lte('fecha_cl', fechaFin);
        }
      }
      
      if (filtros.producto) {
        query = query.ilike('producto', `%${filtros.producto}%`);
      }

      let { data, error } = await query.order('fecha_cl', { ascending: false });

      // Si hay error con fecha_cl, usar consulta con fecha como fallback
      if (error && error.message?.includes('fecha_cl')) {
        console.warn('⚠️ Columna fecha_cl no disponible, usando fecha como fallback');
        let fallbackQuery = supabase
          .from('clientes')
          .select('*')
          .eq('usuario_id', usuarioId); // ✅ FILTRO CRÍTICO POR USUARIO en fallback

        // Si no hay filtros activos, mostrar solo registros del día actual (fallback)
        if (!hayFiltrosActivos) {
          const fechaHoy = obtenerFechaHoyChile();
          fallbackQuery = fallbackQuery.eq('fecha', fechaHoy);
        }

        // Aplicar filtros usando fecha
        if (filtros.fecha_especifica && filtros.fecha_especifica.trim() !== '') {
          fallbackQuery = fallbackQuery.eq('fecha', filtros.fecha_especifica);
        } else if (filtros.mes || filtros.ano) {
          // Determinar año: usar el especificado o el actual
          const anoParaFiltro = filtros.ano || new Date().getFullYear().toString();
          
          if (filtros.mes) {
            // Filtro por mes específico del año (fallback con fecha)
            const mesStr = filtros.mes.toString().padStart(2, '0');
            const fechaInicio = `${anoParaFiltro}-${mesStr}-01`;
            
            // Calcular el último día del mes
            const ultimoDiaDelMes = new Date(parseInt(anoParaFiltro), parseInt(filtros.mes), 0).getDate();
            const fechaFin = `${anoParaFiltro}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
            
            fallbackQuery = fallbackQuery.gte('fecha', fechaInicio);
            fallbackQuery = fallbackQuery.lte('fecha', fechaFin);
          } else if (filtros.ano) {
            // Filtro solo por año (fallback con fecha)
            fallbackQuery = fallbackQuery.gte('fecha', `${filtros.ano}-01-01`);
            fallbackQuery = fallbackQuery.lte('fecha', `${filtros.ano}-12-31`);
          }
        }
        
        if (filtros.producto) {
          fallbackQuery = fallbackQuery.ilike('producto', `%${filtros.producto}%`);
        }

        const fallbackResult = await fallbackQuery.order('fecha', { ascending: false });
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Error al cargar registros:', error);
        return;
      }

      setRegistrosPedidos(data || []);
      
      // También calcular resumen de clientes después de cargar registros
      await calcularResumenClientes();
    } catch (error) {
      console.error('Error inesperado al cargar registros:', error);
    } finally {
      setLoadingRegistros(false);
    }
  };

  // Función para manejar cambios en los filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      fecha_especifica: '',
      mes: '',
      ano: '',
      producto: ''
    });
  };



  // Función para calcular resumen de clientes con totales acumulados
  const calcularResumenClientes = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

             // Construir consulta con filtros aplicados
       let query = supabase
         .from('clientes')
         .select('nombre_cliente, total_final, fecha_cl')
         .eq('usuario_id', usuarioId)
         .not('total_final', 'is', null); // Solo considerar registros con total_final

      // Determinar si hay filtros activos del resumen
      const hayFiltrosResumenActivos = filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano;
      
      // Si no hay filtros activos, mostrar solo acumulados del mes actual
      if (!hayFiltrosResumenActivos) {
        const fechaActual = new Date();
        const anoActual = fechaActual.getFullYear();
        const mesActual = fechaActual.getMonth() + 1; // getMonth() retorna 0-11
        
        const mesStr = mesActual.toString().padStart(2, '0');
        const fechaInicio = `${anoActual}-${mesStr}-01`;
        
        // Calcular el último día del mes actual
        const ultimoDiaDelMes = new Date(anoActual, mesActual, 0).getDate();
        const fechaFin = `${anoActual}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
        
        query = query.gte('fecha_cl', fechaInicio);
        query = query.lte('fecha_cl', fechaFin);
      } else {
        // Aplicar filtros del resumen si están activos
        if (filtrosResumen.nombre && filtrosResumen.nombre.trim()) {
          query = query.ilike('nombre_cliente', `%${filtrosResumen.nombre.trim()}%`);
        }

        // Aplicar filtros de fecha (mes y/o año)
        if (filtrosResumen.mes || filtrosResumen.ano) {
          const anoParaFiltro = filtrosResumen.ano || new Date().getFullYear().toString();
          
          if (filtrosResumen.mes) {
            // Filtro por mes específico
            const mesStr = filtrosResumen.mes.toString().padStart(2, '0');
            const fechaInicio = `${anoParaFiltro}-${mesStr}-01`;
            
            // Calcular el último día del mes
            const ultimoDiaDelMes = new Date(parseInt(anoParaFiltro), parseInt(filtrosResumen.mes), 0).getDate();
            const fechaFin = `${anoParaFiltro}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
            
            query = query.gte('fecha_cl', fechaInicio);
            query = query.lte('fecha_cl', fechaFin);
          } else if (filtrosResumen.ano) {
            // Filtro solo por año
            const fechaInicio = `${filtrosResumen.ano}-01-01`;
            const fechaFin = `${filtrosResumen.ano}-12-31`;
            query = query.gte('fecha_cl', fechaInicio);
            query = query.lte('fecha_cl', fechaFin);
          }
        }
      }

      const { data, error } = await query.order('fecha_cl', { ascending: false });

      if (error) {
        console.error('Error al cargar datos para resumen:', error);
        return;
      }

             // Agrupar por nombre de cliente y sumar totales
       const clientesMap = new Map();
       
       data?.forEach(registro => {
         const nombre = registro.nombre_cliente;
         const total = Number(registro.total_final) || 0;
         
         if (clientesMap.has(nombre)) {
           const clienteExistente = clientesMap.get(nombre);
           clienteExistente.montoTotal += total;
         } else {
           clientesMap.set(nombre, {
             nombre: nombre,
             montoTotal: total
           });
         }
       });

      // Convertir a array y ordenar por monto total (mayor a menor)
      const resumen = Array.from(clientesMap.values())
        .sort((a, b) => b.montoTotal - a.montoTotal);

      setResumenClientes(resumen);
    } catch (error) {
      console.error('Error calculando resumen de clientes:', error);
    }
  };

  // Función para cargar estados de pago desde Supabase
  const cargarEstadosPago = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      // Cargar estados de pago desde la tabla pago_clientes
      const { data, error } = await supabase
        .from('pago_clientes')
        .select('nombre_cliente, estado, fecha_cl')
        .eq('usuario_id', usuarioId)
        .eq('estado', 'pagado'); // Solo obtener los que están marcados como pagados

      if (error) {
        console.error('Error al cargar estados de pago desde Supabase:', error);
        // Fallback a localStorage si falla la carga desde Supabase
        const estadosGuardados = localStorage.getItem('estados_pago_clientes');
        const fechasGuardadas = localStorage.getItem('fechas_pago_clientes');
        if (estadosGuardados) {
          setEstadosPago(JSON.parse(estadosGuardados));
        }
        if (fechasGuardadas) {
          setFechasPago(JSON.parse(fechasGuardadas));
        }
        return;
      }

      // Crear objetos de estados y fechas desde los datos de Supabase
      const estadosDesdeSupabase = {};
      const fechasDesdeSupabase = {};
      data?.forEach(registro => {
        estadosDesdeSupabase[registro.nombre_cliente] = registro.estado;
        fechasDesdeSupabase[registro.nombre_cliente] = registro.fecha_cl;
      });

      // Sincronizar con localStorage para UI responsive
      localStorage.setItem('estados_pago_clientes', JSON.stringify(estadosDesdeSupabase));
      localStorage.setItem('fechas_pago_clientes', JSON.stringify(fechasDesdeSupabase));
      setEstadosPago(estadosDesdeSupabase);
      setFechasPago(fechasDesdeSupabase);
    } catch (error) {
      console.error('Error cargando estados de pago:', error);
      // Fallback a localStorage en caso de error
      try {
        const estadosGuardados = localStorage.getItem('estados_pago_clientes');
        if (estadosGuardados) {
          setEstadosPago(JSON.parse(estadosGuardados));
        }
      } catch (localError) {
        console.error('Error con fallback a localStorage:', localError);
      }
    }
  };

  // Función para guardar estados de pago en localStorage
  const guardarEstadosPago = (nuevosEstados, nuevasFechas = null) => {
    try {
      localStorage.setItem('estados_pago_clientes', JSON.stringify(nuevosEstados));
      setEstadosPago(nuevosEstados);
      
      if (nuevasFechas) {
        localStorage.setItem('fechas_pago_clientes', JSON.stringify(nuevasFechas));
        setFechasPago(nuevasFechas);
      }
    } catch (error) {
      console.error('Error guardando estados de pago:', error);
    }
  };

  // Función para manejar cambios en los filtros del resumen
  const handleFiltroResumenChange = (e) => {
    const { name, value } = e.target;
    
    setFiltrosResumen(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para limpiar filtros del resumen
  const limpiarFiltrosResumen = () => {
    setFiltrosResumen({
      nombre: '',
      mes: '',
      ano: ''
    });
  };

  // Función para cambiar estado de pago de un cliente
  const cambiarEstadoPago = async (nombreCliente, nuevoEstado) => {
    try {
      // Obtener fecha actual en Santiago, Chile
      const fechaActual = obtenerFechaHoyChile();
      
      // Actualizar estado local inmediatamente para UI responsive
      const nuevosEstados = {
        ...estadosPago,
        [nombreCliente]: nuevoEstado
      };
      
      const nuevasFechas = { ...fechasPago };
      
      if (nuevoEstado === 'pagado') {
        // Agregar fecha de pago cuando se marca como pagado
        nuevasFechas[nombreCliente] = fechaActual;
      } else {
        // Eliminar fecha de pago cuando se marca como pendiente
        delete nuevasFechas[nombreCliente];
      }
      
      guardarEstadosPago(nuevosEstados, nuevasFechas);
      
      // Si el estado es "pagado", registrar en tabla pago_clientes
      if (nuevoEstado === 'pagado') {
        const usuarioId = await authService.getCurrentUserId();
        if (!usuarioId) {
          console.error('❌ No hay usuario autenticado para registrar pago');
          return;
        }

               // Obtener fecha actual en Santiago, Chile
       const fechaActual = obtenerFechaHoyChile();
       
       // Obtener el cliente_id del usuario desde la tabla usuarios
       const { data: usuarioData, error: usuarioError } = await supabase
         .from('usuarios')
         .select('cliente_id')
         .eq('usuario_id', usuarioId)
         .limit(1);

       if (usuarioError || !usuarioData || usuarioData.length === 0) {
         console.error('Error al obtener cliente_id del usuario:', usuarioError);
         alert('❌ Error: No se pudo obtener el cliente_id del usuario');
         return;
       }

       const cliente_id = usuarioData[0].cliente_id;

       // Preparar datos para la tabla pago_clientes
       const datosRegistroPago = {
         nombre_cliente: nombreCliente,
         fecha_pago: fechaActual,
         estado: 'pagado',
         usuario_id: usuarioId,
         cliente_id: cliente_id, // Usar el cliente_id del usuario desde la tabla usuarios
         fecha_cl: fechaActual // Mismo valor para compatibilidad
       };

        // Insertar en tabla pago_clientes
        const { data, error } = await supabase
          .from('pago_clientes')
          .insert([datosRegistroPago])
          .select('*');

        if (error) {
          console.error('❌ Error registrando pago en Supabase:', error);
          // Revertir estado local si falla el registro
          const estadosRevertidos = {
            ...estadosPago,
            [nombreCliente]: estadosPago[nombreCliente] || 'pendiente'
          };
          const fechasRevertidas = { ...fechasPago };
          delete fechasRevertidas[nombreCliente]; // Eliminar fecha si falla el registro
          
          guardarEstadosPago(estadosRevertidos, fechasRevertidas);
          alert('❌ Error al registrar el pago en el servidor: ' + error.message);
          return;
        }

        alert(`✅ Pago de ${nombreCliente} registrado exitosamente`);
      } else if (nuevoEstado === 'pendiente') {
        // Si el estado cambia a "pendiente", eliminar el registro de pago_clientes
        const usuarioId = await authService.getCurrentUserId();
        if (!usuarioId) return;

        const { error } = await supabase
          .from('pago_clientes')
          .delete()
          .eq('nombre_cliente', nombreCliente)
          .eq('usuario_id', usuarioId);

        if (error) {
          console.error('❌ Error eliminando registro de pago:', error);
          // No revertir el estado local, solo mostrar warning
          console.warn('⚠️ El estado se cambió localmente pero no se pudo eliminar de Supabase');
        }
      }
      
    } catch (error) {
      console.error('❌ Error cambiando estado de pago:', error);
      // Revertir estado local y fechas si hay error
      const estadosRevertidos = {
        ...estadosPago,
        [nombreCliente]: estadosPago[nombreCliente] || 'pendiente'
      };
      const fechasRevertidas = { ...fechasPago };
      delete fechasRevertidas[nombreCliente]; // Eliminar fecha en caso de error
      
      guardarEstadosPago(estadosRevertidos, fechasRevertidas);
      alert('❌ Error al procesar el cambio de estado');
    }
  };

  // Estado para controlar si es la primera carga
  const [primeraCargar, setPrimeraCargar] = useState(true);

  // Función para formatear números con separadores de miles (puntos)
  const formatearNumero = (numero) => {
    if (!numero && numero !== 0) return '0';
    return Number(numero).toLocaleString('es-CO'); // Formato colombiano: 1.000.000
  };

  // Función para formatear fecha de pago
  const formatearFechaPago = (fechaISO) => {
    if (!fechaISO) return '-';
    
    try {
      // Evitar problemas de zona horaria parseando manualmente
      const [year, month, day] = fechaISO.split('-');
      const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return fecha.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha de pago:', error);
      return fechaISO;
    }
  };

  // Cargar clientes únicos y registros al montar el componente
  useEffect(() => {
    const inicializar = async () => {
      await cargarClientesUnicos();
      await cargarRegistrosPedidos();
      await cargarEstadosPago();
      setPrimeraCargar(false);
    };
    
    inicializar();
  }, []);

  // Recargar registros cuando cambien los filtros (solo después de la primera carga)
  useEffect(() => {
    if (!primeraCargar) {
      cargarRegistrosPedidos();
    }
  }, [filtros, primeraCargar]);

  // Recalcular resumen cuando cambien los filtros del resumen
  useEffect(() => {
    if (!primeraCargar) {
      calcularResumenClientes();
    }
  }, [filtrosResumen, primeraCargar]);

  // Función para manejar cambios en el formulario de pedido (cliente y fecha)
  const handlePedidoChange = (e) => {
    const { name, value } = e.target;
    setPedidoActual(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para manejar cambios en el formulario de producto
  const handleProductoChange = (e) => {
    const { name, value } = e.target;
    setProductoActual(prev => {
      const nuevoProducto = {
        ...prev,
        [name]: value
      };
      
      // Calcular total automáticamente cuando cambie cantidad o precio unitario
      if (name === 'cantidad' || name === 'precio_unitario') {
        const cantidad = parseFloat(name === 'cantidad' ? value : nuevoProducto.cantidad) || 0;
        const precioUnitario = parseFloat(name === 'precio_unitario' ? value : nuevoProducto.precio_unitario) || 0;
        const total = Math.round(cantidad * precioUnitario);
        nuevoProducto.total = total.toString();
      }
      
      return nuevoProducto;
    });
  };

  // Función para agregar producto a la lista del pedido
  const agregarProducto = () => {
    const errores = [];
    if (!productoActual.producto?.trim()) errores.push('Nombre del producto requerido');
    if (!productoActual.cantidad || productoActual.cantidad <= 0) errores.push('Cantidad debe ser mayor a 0');
    if (!productoActual.precio_unitario || productoActual.precio_unitario <= 0) errores.push('Precio unitario debe ser mayor a 0');
    
    if (errores.length > 0) {
      alert('❌ Errores de validación del producto:\n' + errores.join('\n'));
      return;
    }

    const nuevoProducto = {
      ...productoActual,
      id: Date.now() // ID temporal para identificar el producto en la lista
    };

    setProductosDelPedido(prev => [...prev, nuevoProducto]);
    
    // Limpiar formulario de producto
    setProductoActual({
      producto: '',
      cantidad: '',
      precio_unitario: '',
      total: ''
    });
  };

  // Función para eliminar producto de la lista
  const eliminarProducto = (id) => {
    setProductosDelPedido(prev => prev.filter(producto => producto.id !== id));
  };

  // Función para calcular el total del pedido
  const calcularTotalPedido = () => {
    return productosDelPedido.reduce((total, producto) => {
      return total + parseInt(producto.total || 0);
    }, 0);
  };

  // Función para limpiar formulario
  const limpiarFormulario = () => {
    setPedidoActual({
      fecha_cl: obtenerFechaHoyChile(),
      nombre_cliente: ''
    });
    setProductoActual({
      producto: '',
      cantidad: '',
      precio_unitario: '',
      total: ''
    });
    setProductosDelPedido([]);
    setModoNuevoCliente(false); // Resetear al modo de selección
  };

  // Función para validar pedido
  const validarPedido = (pedido, productos) => {
    const errores = [];
    if (!pedido.fecha_cl?.trim()) errores.push('Fecha requerida');
    if (!pedido.nombre_cliente?.trim()) errores.push('Nombre del cliente requerido');
    if (!productos || productos.length === 0) errores.push('Debe agregar al menos un producto al pedido');
    return errores;
  };

  // Función para guardar pedido
  const guardarPedido = async (e) => {
    if (e) e.preventDefault();
    
    const errores = validarPedido(pedidoActual, productosDelPedido);
    if (errores.length > 0) {
      alert('❌ Errores de validación:\n' + errores.join('\n'));
      return;
    }

    try {
      setLoading(true);
      
      // Verificar que el usuario esté autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }

      // Primero, asegurar que el cliente existe en la lista local
      const clienteAgregado = await agregarClienteUnico(pedidoActual.nombre_cliente);
      if (!clienteAgregado) {
        alert('❌ Error al procesar el cliente');
        return;
      }

      // No necesitamos buscar cliente_id, solo usar el nombre del cliente
      // Los nombres de clientes son texto libre, no necesitan ID único
      
      // Calcular el total final del pedido completo
      const total_final = calcularTotalPedido();
      
      // Validar y formatear fecha para PostgreSQL
      const fechaFormateada = pedidoActual.fecha_cl; // Ya viene en formato YYYY-MM-DD del input date
      
      // Obtener el cliente_id del usuario desde la tabla usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .limit(1);

      if (usuarioError || !usuarioData || usuarioData.length === 0) {
        console.error('Error al obtener cliente_id del usuario:', usuarioError);
        alert('❌ Error: No se pudo obtener el cliente_id del usuario');
        return;
      }

      const cliente_id = usuarioData[0].cliente_id;

      // Preparar los datos para guardar cada producto como un registro separado
      const productosParaGuardar = productosDelPedido.map((producto, index) => ({
        nombre_cliente: pedidoActual.nombre_cliente,
        producto: producto.producto,
        cantidad: Number(producto.cantidad), // numeric
        precio_unitario: Number(producto.precio_unitario), // numeric
        sub_total: Number(producto.total), // numeric - Total individual del producto
        // Solo incluir total_final en la primera fila (index === 0)
        total_final: index === 0 ? Number(total_final) : null, // numeric - Total de todo el pedido
        fecha: fechaFormateada, // date - Formato YYYY-MM-DD para PostgreSQL
        usuario_id: usuarioId, // Necesario para las políticas RLS
        cliente_id: cliente_id // Usar el cliente_id del usuario desde la tabla usuarios
        // id, created_at y fecha_cl se generan automáticamente por SQL
      }));



      const result = await supabase
        .from('clientes')
        .insert(productosParaGuardar);

      if (result.error) {
        console.error('Error al guardar pedido:', result.error);
        alert('❌ Error al guardar pedido: ' + result.error.message);
        return;
      }

      alert(`✅ Pedido registrado correctamente con ${productosDelPedido.length} producto(s)`);
      
      // Solo recargar los registros (los clientes ya están actualizados en la lista local)
      await cargarRegistrosPedidos(); // Esto también recalcula el resumen
      
      // Limpiar formulario
      limpiarFormulario();
      
    } catch (error) {
      console.error('Error inesperado al guardar pedido:', error);
      alert('❌ Error inesperado al guardar pedido');
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar un registro (solo del usuario actual)
  const eliminarRegistro = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoadingEliminar(true);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }
      
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId); // 🔒 SEGURIDAD: Solo eliminar registros del usuario actual

      if (error) {
        console.error('❌ Error al eliminar registro:', error);
        alert('❌ Error al eliminar el registro: ' + error.message);
        return;
      }

      alert('✅ Registro eliminado exitosamente');
      
      // Recargar la lista de registros y recalcular resumen
      await cargarRegistrosPedidos(); // Esto también recalcula el resumen
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar registro:', error);
      alert('❌ Error inesperado al eliminar el registro');
    } finally {
      setLoadingEliminar(false);
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
        <div className="max-w-6xl mx-auto">
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
            📝 Pedidos de Clientes
          </h1>

          {/* Formulario de Pedido */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
              📝 Nuevo Pedido
            </h2>
            
            <form onSubmit={guardarPedido} className="space-y-4 md:space-y-6">
              {/* Primera fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-white font-medium mb-2 text-sm md:text-base">
                    📅 Fecha *
                  </label>
                  <input
                    type="date"
                    name="fecha_cl"
                    value={pedidoActual.fecha_cl}
                    onChange={handlePedidoChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2 text-sm md:text-base">
                    👤 Nombre del Cliente *
                  </label>
                  
                  {/* Toggle entre dropdown y input nuevo */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setModoNuevoCliente(false)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                        !modoNuevoCliente 
                          ? 'bg-green-600 text-white' 
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      📋 Seleccionar Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoNuevoCliente(true)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                        modoNuevoCliente 
                          ? 'bg-green-600 text-white' 
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      ➕ Nuevo Cliente
                    </button>
                  </div>

                  {modoNuevoCliente ? (
                    /* Input para nuevo cliente */
                  <input
                      type="text"
                      name="nombre_cliente"
                      value={pedidoActual.nombre_cliente}
                    onChange={handlePedidoChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                      placeholder="Nombre completo del nuevo cliente"
                      required
                    />
                  ) : (
                    /* Dropdown para clientes existentes */
                    <div className="relative">
                      <select
                        name="nombre_cliente"
                        value={pedidoActual.nombre_cliente}
                        onChange={handlePedidoChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 pr-12"
                        required
                      >
                        <option value="" className="bg-gray-800 text-white">
                          Seleccionar cliente...
                        </option>
                        {clientesUnicos.map(cliente => (
                          <option key={cliente.id} value={cliente.nombre} className="bg-gray-800 text-white">
                            {cliente.nombre}
                          </option>
                        ))}
                      </select>
                      
                      {/* Lista de clientes con botones de eliminar */}
                      {clientesUnicos.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto bg-white/5 rounded-lg border border-white/10 p-2">
                          <div className="text-white text-xs mb-2 font-medium">Clientes registrados:</div>
                          {clientesUnicos.map(cliente => (
                            <div key={cliente.id} className="flex items-center justify-between py-1 px-2 hover:bg-white/10 rounded transition-colors">
                              <span className="text-white text-sm">{cliente.nombre}</span>
                              <button
                                type="button"
                                onClick={() => eliminarClienteUnico(cliente.id)}
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-600/20 transition-all duration-200"
                                title="Eliminar cliente"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sección de Agregar Productos */}
              <div className="border-t border-white/20 pt-6">
                <h3 className="text-lg font-bold text-white mb-4 text-center">📦 Agregar Productos al Pedido</h3>
                
                {/* Formulario de producto */}
                <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm md:text-base">
                        📦 Producto *
                      </label>
                      <input
                        type="text"
                        name="producto"
                        value={productoActual.producto}
                        onChange={handleProductoChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                        placeholder="Nombre del producto"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2 text-sm md:text-base">
                        🔢 Cantidad *
                      </label>
                      <input
                        type="number"
                        name="cantidad"
                        value={productoActual.cantidad}
                        onChange={handleProductoChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                        placeholder="0"
                        min="1"
                        step="1"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2 text-sm md:text-base">
                        💰 Precio Unitario *
                      </label>
                      <input
                        type="number"
                        name="precio_unitario"
                        value={productoActual.precio_unitario}
                        onChange={handleProductoChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2 text-sm md:text-base">
                        🧮 Total
                      </label>
                      <input
                        type="text"
                        name="total"
                        value={productoActual.total}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white backdrop-blur-sm"
                        placeholder="0"
                        readOnly
                        style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' }}
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={agregarProducto}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        ➕ Agregar Producto
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de productos agregados */}
                {productosDelPedido.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-bold">📋 Productos del Pedido ({productosDelPedido.length})</h4>
                      <div className="text-white font-bold">
                        Total Pedido: ${formatearNumero(calcularTotalPedido())}
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {productosDelPedido.map((producto, index) => (
                        <div key={producto.id} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                            <div className="text-white font-medium">{producto.producto}</div>
                            <div className="text-gray-300">Cant: {formatearNumero(producto.cantidad)}</div>
                            <div className="text-gray-300">Precio: ${formatearNumero(producto.precio_unitario)}</div>
                            <div className="text-green-300 font-bold">Total: ${formatearNumero(producto.total)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => eliminarProducto(producto.id)}
                            className="ml-4 text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-600/20 transition-all duration-200"
                            title="Eliminar producto"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="submit"
                  disabled={loading || productosDelPedido.length === 0}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Registrando...' : `📝 Registrar Pedido ${productosDelPedido.length > 0 ? `(${productosDelPedido.length} productos)` : ''}`}
                </button>
                
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    🗑️ Limpiar Todo
                  </button>
              </div>
            </form>
          </div>

          {/* Tabla de Registros con Filtros */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                📊 Registros de Pedidos
              </h2>
              {!(filtros.fecha_especifica || filtros.mes || filtros.ano || filtros.producto) && (
                <p className="text-blue-400 text-sm">
                  📅 Mostrando pedidos del día actual - Usa filtros para ver otras fechas
                </p>
              )}
            </div>

            {/* Filtros */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">🔍 Filtros de Búsqueda</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    📅 Fecha Específica
                </label>
                <input
                    type="date"
                    name="fecha_especifica"
                    value={filtros.fecha_especifica}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
                />
              </div>

              <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    📅 Mes
                </label>
                <select
                    name="mes"
                    value={filtros.mes}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los meses</option>
                    <option value="1" className="bg-gray-800 text-white">Enero</option>
                    <option value="2" className="bg-gray-800 text-white">Febrero</option>
                    <option value="3" className="bg-gray-800 text-white">Marzo</option>
                    <option value="4" className="bg-gray-800 text-white">Abril</option>
                    <option value="5" className="bg-gray-800 text-white">Mayo</option>
                    <option value="6" className="bg-gray-800 text-white">Junio</option>
                    <option value="7" className="bg-gray-800 text-white">Julio</option>
                    <option value="8" className="bg-gray-800 text-white">Agosto</option>
                    <option value="9" className="bg-gray-800 text-white">Septiembre</option>
                    <option value="10" className="bg-gray-800 text-white">Octubre</option>
                    <option value="11" className="bg-gray-800 text-white">Noviembre</option>
                    <option value="12" className="bg-gray-800 text-white">Diciembre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    📅 Año
                </label>
                <select
                    name="ano"
                    value={filtros.ano}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los años</option>
                    <option value={new Date().getFullYear()} className="bg-gray-800 text-white">
                      {new Date().getFullYear()}
                    </option>
                </select>
              </div>

                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    📦 Producto
                  </label>
                  <input
                    type="text"
                    name="producto"
                    value={filtros.producto}
                    onChange={handleFiltroChange}
                    placeholder="Buscar producto..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                  />
              </div>
            </div>

                            <div className="flex gap-2 flex-wrap">
              <button
                onClick={limpiarFiltros}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 text-sm"
              >
                🗑️ Limpiar Filtros
              </button>
                <button
                  onClick={cargarRegistrosPedidos}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-sm"
                >
                  🔄 Actualizar
                </button>
            </div>
          </div>

            {/* Tabla de Registros */}
            <div className="bg-white/5 rounded-xl border border-white/10">
              {loadingRegistros ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                  <p className="text-white mt-4">Cargando registros...</p>
              </div>
              ) : registrosPedidos.length === 0 ? (
              <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📋</div>
                  {(filtros.fecha_especifica || filtros.mes || filtros.ano || filtros.producto) ? (
                    <>
                      <p className="text-gray-300 text-lg font-bold mb-2">No hay registros que coincidan con los filtros</p>
                      <p className="text-gray-500 text-sm">Intenta ajustar los filtros de búsqueda</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-300 text-lg font-bold mb-2">No hay pedidos registrados hoy</p>
                      <p className="text-gray-500 text-sm">Por defecto se muestran solo los pedidos del día actual</p>
                    </>
                  )}
              </div>
              ) : (
                <>
                  <div className="p-4 border-b border-white/10">
                    <p className="text-white font-medium">
                      {(filtros.fecha_especifica || filtros.mes || filtros.ano || filtros.producto) ? (
                        `🔍 Registros filtrados: ${registrosPedidos.filter(r => r.total_final && r.total_final > 0).length}`
                      ) : (
                        `📅 Registros de hoy: ${registrosPedidos.filter(r => r.total_final && r.total_final > 0).length}`
                      )}
                    </p>
              </div>
                  
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
                      <tr className="border-b border-white/20">
                          <th className="text-white font-semibold p-3 text-sm">📅 Fecha</th>
                        <th className="text-white font-semibold p-3 text-sm">👤 Cliente</th>
                          <th className="text-white font-semibold p-3 text-sm">📦 Producto</th>
                          <th className="text-white font-semibold p-3 text-sm">🔢 Cantidad</th>
                          <th className="text-white font-semibold p-3 text-sm">💰 Precio Unit.</th>
                          <th className="text-white font-semibold p-3 text-sm">🧮 Sub Total</th>
                          <th className="text-white font-semibold p-3 text-sm">💵 Total Final</th>
                          <th className="text-white font-semibold p-3 text-sm">⚙️ Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                        {registrosPedidos.map((registro, index) => (
                        <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                          <td className="text-white p-3 text-sm">
                            {(() => {
                              const fechaStr = registro.fecha_cl || registro.fecha;
                              if (!fechaStr) return '-';
                              
                              // Evitar problemas de zona horaria parseando manualmente
                              const [year, month, day] = fechaStr.split('-');
                              const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              
                              return fecha.toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: '2-digit', 
                                day: '2-digit'
                              });
                            })()}
                          </td>
                          <td className="text-gray-300 p-3 text-sm">
                            {registro.nombre_cliente}
                          </td>
                          <td className="text-gray-300 p-3 text-sm">
                            {registro.producto}
                          </td>
                            <td className="text-gray-300 p-3 text-sm text-center">
                              {formatearNumero(registro.cantidad)}
                          </td>
                            <td className="text-gray-300 p-3 text-sm text-right">
                              ${formatearNumero(registro.precio_unitario)}
                          </td>
                            <td className="text-green-300 p-3 text-sm text-right font-medium">
                              ${formatearNumero(registro.sub_total)}
                          </td>
                            <td className="text-green-400 p-3 text-sm text-right font-bold">
                              ${formatearNumero(registro.total_final)}
                          </td>
                            <td className="p-3">
                              <button
                                onClick={() => eliminarRegistro(registro.id)}
                                disabled={loadingEliminar}
                                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                                title="Eliminar registro"
                              >
                                {loadingEliminar ? '⏳ Eliminando...' : '🗑️ Eliminar'}
                              </button>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
                  </div>
              </div>

          {/* Resumen de Totales por Cliente */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                💰 Resumen de Totales por Cliente
              </h2>
              {!(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) && (
                <p className="text-blue-400 text-sm">
                  📅 Mostrando acumulados del mes actual - Usa filtros para ver otros meses
                </p>
              )}
            </div>

            {/* Filtros del Resumen */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">🔍 Filtros del Resumen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    👤 Nombre Cliente
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={filtrosResumen.nombre}
                    onChange={handleFiltroResumenChange}
                    placeholder="Buscar cliente..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    📅 Mes
                  </label>
                  <select
                    name="mes"
                    value={filtrosResumen.mes}
                    onChange={handleFiltroResumenChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los meses</option>
                    <option value="1" className="bg-gray-800 text-white">Enero</option>
                    <option value="2" className="bg-gray-800 text-white">Febrero</option>
                    <option value="3" className="bg-gray-800 text-white">Marzo</option>
                    <option value="4" className="bg-gray-800 text-white">Abril</option>
                    <option value="5" className="bg-gray-800 text-white">Mayo</option>
                    <option value="6" className="bg-gray-800 text-white">Junio</option>
                    <option value="7" className="bg-gray-800 text-white">Julio</option>
                    <option value="8" className="bg-gray-800 text-white">Agosto</option>
                    <option value="9" className="bg-gray-800 text-white">Septiembre</option>
                    <option value="10" className="bg-gray-800 text-white">Octubre</option>
                    <option value="11" className="bg-gray-800 text-white">Noviembre</option>
                    <option value="12" className="bg-gray-800 text-white">Diciembre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    📅 Año
                  </label>
                  <select
                    name="ano"
                    value={filtrosResumen.ano}
                    onChange={handleFiltroResumenChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los años</option>
                    <option value={new Date().getFullYear()} className="bg-gray-800 text-white">
                      {new Date().getFullYear()}
                    </option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={limpiarFiltrosResumen}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 text-sm"
                  >
                    🗑️ Limpiar Filtros
                  </button>
                </div>
              </div>

              {/* Contador de resultados */}
              {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) && (
                <div className="text-center">
                  <span className="inline-flex items-center px-3 py-1 bg-blue-500/30 border border-blue-500/50 rounded-full text-blue-300 text-sm font-medium">
                    🔍 {resumenClientes.length} cliente{resumenClientes.length !== 1 ? 's' : ''} encontrado{resumenClientes.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            
            {loadingRegistros ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                <p className="text-white mt-4">Calculando totales...</p>
              </div>
            ) : resumenClientes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">💰</div>
                {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) ? (
                  <>
                    <p className="text-gray-300 text-lg font-bold mb-2">No hay clientes que coincidan con los filtros</p>
                    <p className="text-gray-500 text-sm">Intenta ajustar los filtros de búsqueda del resumen</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 text-lg font-bold mb-2">No hay pedidos registrados este mes</p>
                    <p className="text-gray-500 text-sm">Por defecto se muestran los acumulados del mes actual</p>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl border border-white/10">
                <div className="p-4 border-b border-white/10">
                  <p className="text-white font-medium">
                    {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) ? (
                      `🔍 Clientes filtrados: ${resumenClientes.length} | 💵 Total filtrado: ${formatearNumero(resumenClientes.reduce((total, cliente) => total + cliente.montoTotal, 0))}`
                    ) : (
                      `📅 Clientes del mes: ${resumenClientes.length} | 💵 Total del mes: ${formatearNumero(resumenClientes.reduce((total, cliente) => total + cliente.montoTotal, 0))}`
                    )}
                  </p>
                </div>
                
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
                      <tr className="border-b border-white/20">
                        <th className="text-white font-semibold p-3 text-sm text-left">Nombre Cliente</th>
                        <th className="text-white font-semibold p-3 text-sm text-right">Monto Total</th>
                        <th className="text-white font-semibold p-3 text-sm text-center">Fecha de Pago</th>
                        <th className="text-white font-semibold p-3 text-sm text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenClientes.map((cliente, index) => {
                        const estadoActual = estadosPago[cliente.nombre] || 'pendiente';
                        const fechaPago = fechasPago[cliente.nombre];
                        
                        return (
                          <tr key={`${cliente.nombre}_${index}`} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                            <td className="text-white p-3 text-sm font-medium text-left">
                              {cliente.nombre}
                            </td>
                            <td className="text-green-400 p-3 text-sm font-bold text-right">
                              ${formatearNumero(cliente.montoTotal)}
                            </td>
                            <td className="text-gray-300 p-3 text-sm text-center">
                              {estadoActual === 'pagado' && fechaPago ? (
                                <span className="text-blue-300 font-medium">
                                  📅 {formatearFechaPago(fechaPago)}
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => cambiarEstadoPago(cliente.nombre, 'pagado')}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    estadoActual === 'pagado'
                                      ? 'bg-green-600 text-white shadow-lg'
                                      : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                                  }`}
                                >
                                  ✅ Pagado
                                </button>
                                <button
                                  onClick={() => cambiarEstadoPago(cliente.nombre, 'pendiente')}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    estadoActual === 'pendiente'
                                      ? 'bg-orange-600 text-white shadow-lg'
                                      : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                                  }`}
                                >
                                  ⏳ Pendiente
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Estadísticas del resumen - Calculadas según filtros aplicados */}
                <div className="p-4 border-t border-white/10 bg-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-green-400 text-lg font-bold">
                        {resumenClientes.filter(c => estadosPago[c.nombre] === 'pagado').length}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) ? 
                          'Pagados (Filtrados)' : 
                          'Pagados del Mes'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-orange-400 text-lg font-bold">
                        {resumenClientes.filter(c => !estadosPago[c.nombre] || estadosPago[c.nombre] === 'pendiente').length}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) ? 
                          'Pendientes (Filtrados)' : 
                          'Pendientes del Mes'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-400 text-lg font-bold">
                        ${formatearNumero(
                          resumenClientes
                            .filter(c => estadosPago[c.nombre] === 'pagado')
                            .reduce((total, c) => total + c.montoTotal, 0)
                        )}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) ? 
                          'Total Cobrado (Filtrado)' : 
                          'Total Cobrado del Mes'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Información adicional del periodo */}
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-center text-gray-400 text-sm">
                      {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) ? (
                        '📊 Estadísticas basadas en los filtros aplicados'
                      ) : (
                        `📅 Estadísticas del mes actual: ${new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`
                      )}
                    </p>
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
