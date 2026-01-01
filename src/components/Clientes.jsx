import { useState, useEffect, useMemo } from 'react';
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
    nombre_empresa: ''
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

  // Estados para edición inline
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEdicion, setValoresEdicion] = useState({
    fecha_cl: '',
    nombre_empresa: '',
    producto: '',
    cantidad: '',
    precio_unitario: '',
    sub_total: '',
    total_final: ''
  });

  // Años disponibles para filtros: 2025 por defecto + años futuros si hay registros
  const aniosDisponiblesFiltro = useMemo(() => {
    const anios = new Set();
    anios.add(2025);
    try {
      registrosPedidos.forEach(reg => {
        const fechaStr = reg.fecha_cl || reg.fecha;
        if (!fechaStr) return;
        const anio = parseInt(fechaStr.split('-')[0]);
        if (!isNaN(anio) && anio > 2025) {
          anios.add(anio);
        }
      });
    } catch {}
    return Array.from(anios).sort((a, b) => b - a);
  }, [registrosPedidos]);
  
     // Estados para resumen de clientes
   const [resumenClientes, setResumenClientes] = useState([]);
   const [estadosPago, setEstadosPago] = useState({}); // {nombre_cliente: 'pagado'/'pendiente'}
   const [fechasPago, setFechasPago] = useState({}); // {nombre_cliente: 'YYYY-MM-DD'}
   const [montosPago, setMontosPago] = useState({}); // {nombre_cliente: monto_total}
  
  // Estados para filtros del resumen
  const [filtrosResumen, setFiltrosResumen] = useState({
    nombre: '',
    mes: '',
    ano: ''
  });

  // Contador de registros con total_final (MEMOIZADO para evitar recalcular en cada render)
  const cantidadRegistrosConTotalFinal = useMemo(() => {
    return registrosPedidos.filter(r => r.total_final && r.total_final > 0).length;
  }, [registrosPedidos]);

  // Total del resumen de clientes (MEMOIZADO para evitar recalcular en cada render)
  const totalResumenClientes = useMemo(() => {
    return resumenClientes.reduce((total, empresa) => total + empresa.montoTotal, 0);
  }, [resumenClientes]);

  // Estadísticas del resumen (MEMOIZADAS para evitar recalcular en cada render)
  const estadisticasResumen = useMemo(() => {
    const pagados = resumenClientes.filter(e => estadosPago[e.nombre] === 'pagado').length;
    const pendientes = resumenClientes.filter(e => !estadosPago[e.nombre] || estadosPago[e.nombre] === 'pendiente').length;
    const totalCobrado = resumenClientes
      .filter(e => estadosPago[e.nombre] === 'pagado')
      .reduce((total, e) => total + e.montoTotal, 0);
    
    return { pagados, pendientes, totalCobrado };
  }, [resumenClientes, estadosPago]);
  
  // Función para cargar empresas únicas del usuario autenticado
  // ✅ Esta función carga desde la base de datos, por lo que refleja el estado real
  // 📝 IMPORTANTE: nombre_empresa es solo texto para el frontend, cliente_id es para el backend
  const cargarClientesUnicos = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      // Obtener empresas únicas de la tabla clientes basados en nombre_empresa
      // El nombre_empresa es solo texto para identificar a la empresa en el frontend
      // El cliente_id y usuario_id son campos del backend para las políticas RLS
      const { data, error } = await supabase
        .from('clientes')
        .select('nombre_empresa')
        .eq('usuario_id', usuarioId) // ✅ FILTRO CRÍTICO POR USUARIO
        .not('nombre_empresa', 'is', null);

      if (error) {
        console.error('Error al cargar clientes únicos:', error);
        return;
      }

      // Obtener nombres únicos de empresas (sin duplicados)
      const nombresUnicos = [...new Set(data?.map(item => item.nombre_empresa))];
      
      // Formatear para la lista local - SIN ordenamiento alfabético
      const clientesUnicosFormateados = nombresUnicos
        .map((nombre, index) => ({
          id: `empresa_${index}_${Date.now()}`, // ID temporal único para la UI
          nombre: nombre
        }));

      setClientesUnicos(clientesUnicosFormateados);
    } catch (error) {
      console.error('Error inesperado al cargar clientes únicos:', error);
    }
  };

  // Función para agregar una nueva empresa única
  const agregarClienteUnico = async (nombreEmpresa) => {
    try {
      // Verificar si la empresa ya existe
      const empresaExistente = clientesUnicos.find(
        empresa => empresa.nombre.toLowerCase() === nombreEmpresa.toLowerCase()
      );
      
      if (empresaExistente) {
        return true; // Empresa ya existe, no necesita crearse
      }

      // Agregar la empresa a la lista local (solo para UI)
      const nuevaEmpresa = {
        id: `empresa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID temporal único para la UI
        nombre: nombreEmpresa // Solo el nombre de la empresa externa
      };
      
      setClientesUnicos(prev => [...prev, nuevaEmpresa]); // SIN ordenamiento alfabético
      
      return true;
    } catch (error) {
      console.error('Error inesperado al agregar empresa única:', error);
      return false;
    }
  };

  // Función para eliminar una empresa única
  // ⚠️ IMPORTANTE: Esta función SOLO elimina la empresa del dropdown local
  // NO interfiere con la tabla usuarios de Supabase
  // NO elimina registros de pedidos existentes
  // NO elimina registros de la tabla clientes
  const eliminarClienteUnico = async (empresaId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta empresa del dropdown? Los registros de pedidos existentes NO se eliminarán.')) {
      return;
    }

    try {
      // Encontrar la empresa en la lista local
      const empresaAEliminar = clientesUnicos.find(e => e.id === empresaId);
      if (!empresaAEliminar) return;

      // Solo eliminar el nombre del dropdown (lista local)
      // NO eliminar los registros de pedidos existentes
      // NO tocar la tabla usuarios de Supabase
      // NO eliminar registros de la tabla clientes
      setClientesUnicos(prev => prev.filter(empresa => empresa.id !== empresaId));
      
      // Si la empresa eliminada estaba seleccionada, limpiar la selección
      if (pedidoActual.nombre_empresa === empresaAEliminar.nombre) {
        setPedidoActual(prev => ({ ...prev, nombre_empresa: '' }));
      }
      
      alert('✅ Empresa eliminada del dropdown correctamente. Los registros de pedidos se mantienen intactos.');
    } catch (error) {
      console.error('Error inesperado al eliminar empresa del dropdown:', error);
      alert('❌ Error inesperado al eliminar la empresa del dropdown');
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

      // Determinar si hay filtros de fecha activos
      const hayFiltrosFechaActivos = filtros.fecha_especifica || filtros.mes || filtros.ano;
      // Aumentar límite cuando hay filtros activos para mostrar todos los registros del período
      const limiteRegistros = hayFiltrosFechaActivos ? 1000 : 100;
      
      // Si no hay filtros de fecha, mostrar registros del día actual
      if (!hayFiltrosFechaActivos) {
        const fechaHoy = obtenerFechaHoyChile();
        
        query = query.eq('fecha_cl', fechaHoy);
      } else {
        // Aplicar filtros de fecha si están activos
        if (filtros.fecha_especifica) {
          query = query.eq('fecha_cl', filtros.fecha_especifica);
        }

        if (filtros.mes || filtros.ano) {
          const anoParaFiltro = filtros.ano || new Date().getFullYear().toString();
          
          if (filtros.mes) {
            // Filtro por mes específico
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
      }
      
      // Aplicar filtro de empresa si está activo
      if (filtros.producto && filtros.producto.trim() !== '') {
        query = query.ilike('nombre_empresa', `%${filtros.producto.trim()}%`);
      }

      // Cambiar ordenamiento según si hay filtros activos
      // Si hay filtros de fecha (especialmente mes), usar orden cronológico (ascendente)
      const ordenAscendente = hayFiltrosFechaActivos;
      let { data, error } = await query.order('fecha_cl', { ascending: ordenAscendente }).limit(limiteRegistros);

      // Si hay error con fecha_cl, usar consulta con fecha como fallback
      if (error && error.message?.includes('fecha_cl')) {
        console.warn('⚠️ Columna fecha_cl no disponible, usando fecha como fallback');
        let fallbackQuery = supabase
          .from('clientes')
          .select('*')
          .eq('usuario_id', usuarioId); // ✅ FILTRO CRÍTICO POR USUARIO en fallback

        // Aplicar los mismos filtros de fecha en el fallback
        if (!hayFiltrosFechaActivos) {
          const fechaHoy = obtenerFechaHoyChile();
          
          fallbackQuery = fallbackQuery.eq('fecha', fechaHoy);
        } else {
          if (filtros.fecha_especifica) {
            fallbackQuery = fallbackQuery.eq('fecha', filtros.fecha_especifica);
          }

          if (filtros.mes || filtros.ano) {
            const anoParaFiltro = filtros.ano || new Date().getFullYear().toString();
            
            if (filtros.mes) {
              const mesStr = filtros.mes.toString().padStart(2, '0');
              const fechaInicio = `${anoParaFiltro}-${mesStr}-01`;
              
              const ultimoDiaDelMes = new Date(parseInt(anoParaFiltro), parseInt(filtros.mes), 0).getDate();
              const fechaFin = `${anoParaFiltro}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
              
              fallbackQuery = fallbackQuery.gte('fecha', fechaInicio);
              fallbackQuery = fallbackQuery.lte('fecha', fechaFin);
            } else if (filtros.ano) {
              const fechaInicio = `${filtros.ano}-01-01`;
              const fechaFin = `${filtros.ano}-12-31`;
              fallbackQuery = fallbackQuery.gte('fecha', fechaInicio);
              fallbackQuery = fallbackQuery.lte('fecha', fechaFin);
            }
          }
        }
        
        // Aplicar filtro de empresa en fallback
        if (filtros.producto && filtros.producto.trim() !== '') {
          fallbackQuery = fallbackQuery.ilike('nombre_empresa', `%${filtros.producto.trim()}%`);
        }

        const fallbackResult = await fallbackQuery.order('fecha', { ascending: hayFiltrosFechaActivos }).limit(limiteRegistros);
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Error al cargar registros:', error);
        return;
      }

      setRegistrosPedidos(data || []);
      
      // El resumen se calculará automáticamente cuando cambien los filtros del resumen
      // mediante el useEffect correspondiente, evitando llamadas duplicadas
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

  // Función para limpiar filtros de la tabla de pedidos
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
         .select('nombre_empresa, total_final, fecha_cl')
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
          query = query.ilike('nombre_empresa', `%${filtrosResumen.nombre.trim()}%`);
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

             // Agrupar por nombre de empresa y sumar totales
       const clientesMap = new Map();
       
       data?.forEach(registro => {
         const nombre = registro.nombre_empresa;
         const total = Number(registro.total_final) || 0;
         
         if (clientesMap.has(nombre)) {
           const empresaExistente = clientesMap.get(nombre);
           empresaExistente.montoTotal += total;
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
         .select('nombre_empresa, estado, fecha_cl, monto_total')
         .eq('usuario_id', usuarioId)
         .eq('estado', 'pagado'); // Solo obtener los que están marcados como pagados

      if (error) {
        console.error('Error al cargar estados de pago desde Supabase:', error);
                 // Fallback a localStorage si falla la carga desde Supabase
         const estadosGuardados = localStorage.getItem('estados_pago_clientes');
         const fechasGuardadas = localStorage.getItem('fechas_pago_clientes');
         const montosGuardados = localStorage.getItem('montos_pago_clientes');
         if (estadosGuardados) {
           setEstadosPago(JSON.parse(estadosGuardados));
         }
         if (fechasGuardadas) {
           setFechasPago(JSON.parse(fechasGuardadas));
         }
         if (montosGuardados) {
           setMontosPago(JSON.parse(montosGuardados));
         }
        return;
      }

             // Crear objetos de estados, fechas y montos desde los datos de Supabase
       const estadosDesdeSupabase = {};
       const fechasDesdeSupabase = {};
       const montosDesdeSupabase = {};
       data?.forEach(registro => {
         estadosDesdeSupabase[registro.nombre_empresa] = registro.estado;
         fechasDesdeSupabase[registro.nombre_empresa] = registro.fecha_cl;
         montosDesdeSupabase[registro.nombre_empresa] = registro.monto_total;
       });

       // Sincronizar con localStorage para UI responsive
       localStorage.setItem('estados_pago_clientes', JSON.stringify(estadosDesdeSupabase));
       localStorage.setItem('fechas_pago_clientes', JSON.stringify(fechasDesdeSupabase));
       localStorage.setItem('montos_pago_clientes', JSON.stringify(montosDesdeSupabase));
       setEstadosPago(estadosDesdeSupabase);
       setFechasPago(fechasDesdeSupabase);
       setMontosPago(montosDesdeSupabase);
    } catch (error) {
      console.error('Error cargando estados de pago:', error);
             // Fallback a localStorage en caso de error
       try {
         const estadosGuardados = localStorage.getItem('estados_pago_clientes');
         const fechasGuardadas = localStorage.getItem('fechas_pago_clientes');
         const montosGuardados = localStorage.getItem('montos_pago_clientes');
         if (estadosGuardados) {
           setEstadosPago(JSON.parse(estadosGuardados));
         }
         if (fechasGuardadas) {
           setFechasPago(JSON.parse(fechasGuardadas));
         }
         if (montosGuardados) {
           setMontosPago(JSON.parse(montosGuardados));
         }
       } catch (localError) {
         console.error('Error con fallback a localStorage:', localError);
       }
    }
  };

     // Función para guardar estados de pago en localStorage
   const guardarEstadosPago = (nuevosEstados, nuevasFechas = null, nuevosMontos = null) => {
     try {
       localStorage.setItem('estados_pago_clientes', JSON.stringify(nuevosEstados));
       setEstadosPago(nuevosEstados);
       
       if (nuevasFechas) {
         localStorage.setItem('fechas_pago_clientes', JSON.stringify(nuevasFechas));
         setFechasPago(nuevasFechas);
       }
       
       if (nuevosMontos) {
         localStorage.setItem('montos_pago_clientes', JSON.stringify(nuevosMontos));
         setMontosPago(nuevosMontos);
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

  

    // Función para cambiar estado de pago de una empresa
  // ⚠️ IMPORTANTE: Esta función NO interfiere con la tabla usuarios de Supabase
  // Solo maneja estados de pago en la tabla pago_clientes
  const cambiarEstadoPago = async (nombreEmpresa, nuevoEstado) => {
    try {
      // Obtener fecha actual en Santiago, Chile
      let fechaActual = obtenerFechaHoyChile();
      
      // Verificar que la fecha se generó correctamente
      if (!fechaActual) {
        console.warn('⚠️ No se pudo generar fecha con zona horaria de Chile, usando fecha local');
        // Fallback: usar fecha local si falla la función de Chile
        const fechaLocal = new Date();
        fechaActual = fechaLocal.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      }
      
      // Validación adicional: asegurar que la fecha esté en formato correcto
      if (!fechaActual || !/^\d{4}-\d{2}-\d{2}$/.test(fechaActual)) {
        console.error('❌ Error: Formato de fecha inválido:', fechaActual);
        alert('❌ Error: Formato de fecha inválido');
        return;
      }
      
      
      
             // Actualizar estado local inmediatamente para UI responsive
       const nuevosEstados = {
         ...estadosPago,
         [nombreEmpresa]: nuevoEstado
       };
       
       const nuevasFechas = { ...fechasPago };
       const nuevosMontos = { ...montosPago };
       
       if (nuevoEstado === 'pagado') {
         // Agregar fecha de pago cuando se marca como pagado
         nuevasFechas[nombreEmpresa] = fechaActual;
         
         // Obtener el monto total de la empresa desde el resumen
         const empresaResumen = resumenClientes.find(emp => emp.nombre === nombreEmpresa);
         if (empresaResumen) {
           nuevosMontos[nombreEmpresa] = empresaResumen.montoTotal;
         }
       } else {
         // Eliminar fecha de pago cuando se marca como pendiente
         delete nuevasFechas[nombreEmpresa];
         delete nuevosMontos[nombreEmpresa];
       }
       
       guardarEstadosPago(nuevosEstados, nuevasFechas, nuevosMontos);
      
      // Si el estado es "pagado", registrar en tabla pago_clientes
      if (nuevoEstado === 'pagado') {
        const usuarioId = await authService.getCurrentUserId();
        if (!usuarioId) {
          console.error('❌ No hay usuario autenticado para registrar pago');
          return;
        }
        
        // Obtener el cliente_id correcto de la tabla usuarios para satisfacer la política RLS
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuarios')
          .select('cliente_id')
          .eq('usuario_id', usuarioId)
          .single();

        if (usuarioError || !usuarioData) {
          console.error('Error al obtener cliente_id del usuario:', usuarioError);
          alert('❌ Error: No se pudo obtener la información del usuario');
          return;
        }

        const cliente_id = usuarioData.cliente_id;

        // Obtener el monto total de la empresa desde el resumen
        const empresaResumen = resumenClientes.find(emp => emp.nombre === nombreEmpresa);
        const montoTotal = empresaResumen ? empresaResumen.montoTotal : 0;
        
        // Preparar datos para la tabla pago_clientes
        // IMPORTANTE: La política RLS requiere que cliente_id coincida con usuarios.cliente_id
        const datosRegistroPago = {
          nombre_empresa: nombreEmpresa,
          fecha_pago: fechaActual, // Campo obligatorio NOT NULL
          estado: 'pagado',
          usuario_id: usuarioId,
          cliente_id: cliente_id, // Campo OBLIGATORIO para la política RLS
          monto_total: montoTotal // Nuevo campo agregado a la tabla pago_clientes
        };

        // Verificar que cliente_id esté presente (requerido por la política RLS)
        if (!cliente_id) {
          console.error('❌ Error: cliente_id es requerido para la política RLS');
          alert('❌ Error: No se pudo obtener el cliente_id del usuario. Verifica la configuración de la tabla usuarios.');
          
          // Revertir estado local
          const estadosRevertidos = {
            ...estadosPago,
            [nombreEmpresa]: estadosPago[nombreEmpresa] || 'pendiente'
          };
          const fechasRevertidas = { ...fechasPago };
          delete fechasRevertidas[nombreEmpresa];
          
          guardarEstadosPago(estadosRevertidos, fechasRevertidas);
          return;
        }

         
        
        // Validación final antes de enviar a Supabase
        if (!datosRegistroPago.fecha_pago) {
          console.error('❌ Error: fecha_pago es null o undefined antes de enviar a Supabase');
          alert('❌ Error: No se pudo generar la fecha de pago');
          
          // Revertir estado local
          const estadosRevertidos = {
            ...estadosPago,
            [nombreEmpresa]: estadosPago[nombreEmpresa] || 'pendiente'
          };
          const fechasRevertidas = { ...fechasPago };
          delete fechasRevertidas[nombreEmpresa];
          
          guardarEstadosPago(estadosRevertidos, fechasRevertidas);
          return;
        }
        
        // Validación adicional: verificar que todos los campos obligatorios estén presentes
        const camposObligatorios = ['nombre_empresa', 'fecha_pago', 'estado', 'usuario_id'];
        const camposFaltantes = camposObligatorios.filter(campo => !datosRegistroPago[campo]);
        
        if (camposFaltantes.length > 0) {
 
          alert(`❌ Error: Campos obligatorios faltantes: ${camposFaltantes.join(', ')}`);
          
          // Revertir estado local
          const estadosRevertidos = {
            ...estadosPago,
            [nombreEmpresa]: estadosPago[nombreEmpresa] || 'pendiente'
          };
          const fechasRevertidas = { ...fechasPago };
          delete fechasRevertidas[nombreEmpresa];
          
          guardarEstadosPago(estadosRevertidos, fechasRevertidas);
          return;
        }
        
        
        
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
            [nombreEmpresa]: estadosPago[nombreEmpresa] || 'pendiente'
          };
          const fechasRevertidas = { ...fechasPago };
          delete fechasRevertidas[nombreEmpresa]; // Eliminar fecha si falla el registro
          
          guardarEstadosPago(estadosRevertidos, fechasRevertidas);
          
          // Mensaje de error más específico
          if (error.message.includes('nombre_empresa')) {
            alert('❌ Error: La tabla pago_clientes no tiene la columna nombre_empresa. Verifica la estructura de la tabla.');
          } else if (error.message.includes('fecha_pago')) {
            alert('❌ Error: El campo fecha_pago es obligatorio. Verifica que se esté enviando correctamente.');
          } else if (error.message.includes('null value')) {
            alert('❌ Error: Hay campos obligatorios que no se están enviando. Verifica la estructura de datos.');
          } else if (error.message.includes('violates not-null constraint')) {
            alert('❌ Error: Violación de restricción NOT NULL. Verifica que todos los campos obligatorios estén completos.');
          } else if (error.message.includes('column') && error.message.includes('does not exist')) {
            alert('❌ Error: Una columna no existe en la tabla. Verifica la estructura de la tabla pago_clientes.');
          } else {
            alert('❌ Error al registrar el pago en el servidor: ' + error.message);
          }
          return;
        }

        alert(`✅ Pago de ${nombreEmpresa} registrado exitosamente`);
      } else if (nuevoEstado === 'pendiente') {
        // Si el estado cambia a "pendiente", eliminar el registro de pago_clientes
        const usuarioId = await authService.getCurrentUserId();
        if (!usuarioId) return;

        // Primero verificar si existe un registro para eliminar
        const { data: registroExistente, error: errorBusqueda } = await supabase
          .from('pago_clientes')
          .select('id')
          .eq('nombre_empresa', nombreEmpresa)
          .eq('usuario_id', usuarioId)
          .eq('estado', 'pagado')
          .single();

        if (errorBusqueda && !errorBusqueda.message.includes('No rows found')) {
          console.error('❌ Error buscando registro de pago:', errorBusqueda);
          return;
        }

        // Solo eliminar si existe un registro
        if (registroExistente) {
          const { error } = await supabase
            .from('pago_clientes')
            .delete()
            .eq('id', registroExistente.id);

          if (error) {
            console.error('❌ Error eliminando registro de pago:', error);
            // No revertir el estado local, solo mostrar warning
            console.warn('⚠️ El estado se cambió localmente pero no se pudo eliminar de Supabase');
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error cambiando estado de pago:', error);
             // Revertir estado local y fechas si hay error
       const estadosRevertidos = {
         ...estadosPago,
         [nombreEmpresa]: estadosPago[nombreEmpresa] || 'pendiente'
       };
       const fechasRevertidas = { ...fechasPago };
       delete fechasRevertidas[nombreEmpresa]; // Eliminar fecha en caso de error
      
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

  // Función para calcular el total del pedido (MEMOIZADA para evitar recalcular en cada render)
  const totalPedido = useMemo(() => {
    return productosDelPedido.reduce((total, producto) => {
      return total + parseInt(producto.total || 0);
    }, 0);
  }, [productosDelPedido]);

  // Función para compatibilidad (mantiene la misma interfaz)
  const calcularTotalPedido = () => totalPedido;

  // Función para limpiar formulario
  const limpiarFormulario = () => {
    setPedidoActual({
      fecha_cl: obtenerFechaHoyChile(),
      nombre_empresa: ''
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
    if (!pedido.nombre_empresa?.trim()) errores.push('Nombre de la empresa requerido');
    if (!productos || productos.length === 0) errores.push('Debe agregar al menos un producto al pedido');
    return errores;
  };

  // Función para guardar pedido
  // ⚠️ IMPORTANTE: Esta función NO interfiere con la tabla usuarios de Supabase
  // Solo inserta registros en la tabla clientes
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

      // Primero, asegurar que la empresa existe en la lista local
      const empresaAgregada = await agregarClienteUnico(pedidoActual.nombre_empresa);
      if (!empresaAgregada) {
        alert('❌ Error al procesar la empresa');
        return;
      }

      // Obtener el cliente_id correcto de la tabla usuarios para satisfacer la política RLS
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('Error al obtener cliente_id del usuario:', usuarioError);
        alert('❌ Error: No se pudo obtener la información del usuario');
        return;
      }

      const cliente_id = usuarioData.cliente_id;
      
      // Calcular el total final del pedido completo
      const total_final = calcularTotalPedido();
      
      // Validar y formatear fecha para PostgreSQL
      const fechaFormateada = pedidoActual.fecha_cl; // Ya viene en formato YYYY-MM-DD del input date

             // Preparar los datos para guardar cada producto como un registro separado
       const productosParaGuardar = productosDelPedido.map((producto, index) => ({
         nombre_empresa: pedidoActual.nombre_empresa, // Solo texto para identificar a la empresa
         producto: producto.producto,
         cantidad: Number(producto.cantidad), // numeric
         precio_unitario: Number(producto.precio_unitario), // numeric
         sub_total: Number(producto.total), // numeric - Total individual del producto
         // Solo incluir total_final en la primera fila (index === 0)
         total_final: index === 0 ? Number(total_final) : null, // numeric - Total de todo el pedido
         // fecha_cl se genera automáticamente por Supabase (DEFAULT)
         usuario_id: usuarioId, // Necesario para las políticas RLS
         cliente_id: cliente_id // Mismo valor que usuario_id para las políticas RLS
         // id, created_at, fecha_cl se generan automáticamente por SQL
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
  // ⚠️ IMPORTANTE: Esta función NO interfiere con la tabla usuarios de Supabase
  // Solo elimina registros de la tabla clientes
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

      // Registro eliminado exitosamente - sin popup redundante
      
      // Recargar la lista de registros y recalcular resumen
      await cargarRegistrosPedidos(); // Esto también recalcula el resumen
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar registro:', error);
      alert('❌ Error inesperado al eliminar el registro');
    } finally {
      setLoadingEliminar(false);
    }
  };

  // Función para iniciar la edición de un registro
  const iniciarEdicion = (registro) => {
    setEditandoId(registro.id);
    setValoresEdicion({
      fecha_cl: registro.fecha_cl || registro.fecha,
      nombre_empresa: registro.nombre_empresa,
      producto: registro.producto,
      cantidad: registro.cantidad.toString(),
      precio_unitario: registro.precio_unitario.toString(),
      sub_total: registro.sub_total ? registro.sub_total.toString() : '',
      total_final: registro.total_final ? registro.total_final.toString() : ''
    });
  };

  // Función para cancelar la edición
  const cancelarEdicion = () => {
    setEditandoId(null);
    setValoresEdicion({
      fecha_cl: '',
      nombre_empresa: '',
      producto: '',
      cantidad: '',
      precio_unitario: '',
      sub_total: '',
      total_final: ''
    });
  };

  // Función para manejar cambios en los campos editables
  const handleEdicionChange = (campo, valor) => {
    setValoresEdicion(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Función para guardar la edición
  const guardarEdicion = async (id, registro) => {
    try {
      // Validaciones
      if (!valoresEdicion.fecha_cl || !valoresEdicion.nombre_empresa || !valoresEdicion.producto || 
          !valoresEdicion.cantidad || !valoresEdicion.precio_unitario) {
        alert('⚠️ Los campos fecha, empresa, producto, cantidad y precio unitario son obligatorios');
        return;
      }

      if (parseFloat(valoresEdicion.cantidad) <= 0) {
        alert('⚠️ La cantidad debe ser mayor a 0');
        return;
      }

      if (parseFloat(valoresEdicion.precio_unitario) <= 0) {
        alert('⚠️ El precio unitario debe ser mayor a 0');
        return;
      }

      setLoadingRegistros(true);

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

      // Preparar datos para actualización (excluyendo fecha_cl que tiene restricciones de DEFAULT)
      const datosActualizacion = {
        nombre_empresa: valoresEdicion.nombre_empresa.trim(),
        producto: valoresEdicion.producto.trim(),
        cantidad: parseFloat(valoresEdicion.cantidad),
        precio_unitario: parseFloat(valoresEdicion.precio_unitario),
        sub_total: valoresEdicion.sub_total ? parseFloat(valoresEdicion.sub_total) : null,
        total_final: valoresEdicion.total_final ? parseFloat(valoresEdicion.total_final) : null
      };

      // Verificar si se intentó cambiar la fecha
      const fechaOriginal = registro.fecha_cl || registro.fecha;
      if (valoresEdicion.fecha_cl && valoresEdicion.fecha_cl !== fechaOriginal) {
        console.warn('⚠️ La fecha no se puede editar debido a restricciones de la base de datos');
      }

      const { error } = await supabase
        .from('clientes')
        .update(datosActualizacion)
        .eq('id', id)
        .eq('usuario_id', usuarioId) // 🔒 SEGURIDAD: Solo editar registros del usuario actual
        .eq('cliente_id', cliente_id); // 🔒 SEGURIDAD: Solo editar registros del cliente actual

      if (error) {
        console.error('❌ Error al actualizar registro:', error);
        alert('❌ Error al actualizar el registro: ' + error.message);
        return;
      }

      alert('✅ Registro actualizado exitosamente');
      cancelarEdicion();
      await cargarRegistrosPedidos();

    } catch (error) {
      console.error('❌ Error inesperado al actualizar registro:', error);
      alert('❌ Error inesperado al actualizar el registro');
    } finally {
      setLoadingRegistros(false);
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
              Pedidos de Clientes
           </h1>

          {/* Formulario de Pedido */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
              Nuevo Pedido
            </h2>
            
            <form onSubmit={guardarPedido} className="space-y-4 md:space-y-6">
              {/* Primera fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-white font-medium mb-2 text-sm md:text-base">
                    Fecha *
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
                      Nombre de la Empresa *
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
                       ➕ Nueva Empresa
                     </button>
                   </div>

                                     {modoNuevoCliente ? (
                     /* Input para nueva empresa */
                   <input
                       type="text"
                       name="nombre_empresa"
                       value={pedidoActual.nombre_empresa}
                     onChange={handlePedidoChange}
                     className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                       placeholder="Nombre completo de la nueva empresa"
                       required
                     />
                   ) : (
                     /* Dropdown para empresas existentes */
                     <div className="relative">
                       <select
                         name="nombre_empresa"
                         value={pedidoActual.nombre_empresa}
                         onChange={handlePedidoChange}
                         className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 pr-12"
                         required
                       >
                         <option value="" className="bg-gray-800 text-white">
                           Seleccionar empresa...
                         </option>
                         {clientesUnicos.map(empresa => (
                           <option key={empresa.id} value={empresa.nombre} className="bg-gray-800 text-white">
                             {empresa.nombre}
                           </option>
                         ))}
                       </select>
                       
                       {/* Lista de empresas con botones de eliminar */}
                       {clientesUnicos.length > 0 && (
                         <div className="mt-2 max-h-32 overflow-y-auto bg-white/5 rounded-lg border border-white/10 p-2">
                           <div className="text-white text-xs mb-2 font-medium">Empresas registradas:</div>
                           {clientesUnicos.map(empresa => (
                             <div key={empresa.id} className="flex items-center justify-between py-1 px-2 hover:bg-white/10 rounded transition-colors">
                               <span className="text-white text-sm">{empresa.nombre}</span>
                               <button
                                 type="button"
                                 onClick={() => eliminarClienteUnico(empresa.id)}
                                 className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-600/20 transition-all duration-200"
                                 title="Eliminar empresa"
                               >
                                 Eliminar
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
                <h3 className="text-lg font-bold text-white mb-4 text-center">Agregar Productos al Pedido</h3>
                
                {/* Formulario de producto */}
                <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm md:text-base">
                        Producto *
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
                        Cantidad *
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
                        Precio Unitario *
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
                        Total
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
                        Total Pedido: ${formatearNumero(totalPedido)}
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
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={loading || productosDelPedido.length === 0}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Registrando...' : `📝 Registrar Pedido ${productosDelPedido.length > 0 ? `(${productosDelPedido.length} productos)` : ''}`}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de Registros con Filtros */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Registros de Pedidos
              </h2>
              {!(filtros.producto || filtros.fecha_especifica || filtros.mes || filtros.ano) && (
                <p className="text-blue-400 text-sm">
                  Mostrando pedidos del mes actual - Usa los filtros para buscar específicos
                </p>
              )}
            </div>

            {/* Filtros */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">🔍 Filtros de Búsqueda</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Filtro por empresa */}
                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    Buscar Empresa
                  </label>
                  <input
                    type="text"
                    name="producto"
                    value={filtros.producto}
                    onChange={handleFiltroChange}
                    placeholder="Buscar empresa..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                  />
                </div>

                {/* Filtro por fecha específica */}
                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                   Fecha Específica
                  </label>
                  <input
                    type="date"
                    name="fecha_especifica"
                    value={filtros.fecha_especifica}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
                  />
                </div>

                {/* Filtro por mes */}
                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    Mes
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

                {/* Filtro por año */}
                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    Año
                  </label>
                  <select
                    name="ano"
                    value={filtros.ano}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="" className="bg-gray-800 text-white">Todos los años</option>
                    {aniosDisponiblesFiltro.map(anio => (
                      <option key={anio} value={anio.toString()} className="bg-gray-800 text-white">
                        {anio}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

                            <div className="flex gap-2 flex-wrap">
              <button
                onClick={limpiarFiltros}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 text-sm"
              >
                🗑️ Limpiar Filtros
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
                  <div className="text-gray-400 text-4xl mb-4"></div>
                                     {filtros.producto ? (
                     <>
                       <p className="text-gray-300 text-lg font-bold mb-2">No hay empresas que coincidan con la búsqueda</p>
                       <p className="text-gray-500 text-sm">Intenta ajustar el filtro de empresa</p>
                     </>
                   ) : (
                     <>
                       <p className="text-gray-300 text-lg font-bold mb-2">No hay pedidos registrados este mes</p>
                       <p className="text-gray-500 text-sm">Por defecto se muestran los pedidos del mes actual</p>
                     </>
                   )}
              </div>
              ) : (
                <>
                  <div className="p-4 border-b border-white/10">
                    <p className="text-white font-medium">
                      {(filtros.producto || filtros.fecha_especifica || filtros.mes || filtros.ano) ? (
                        `Registros filtrados: ${cantidadRegistrosConTotalFinal}`
                      ) : (
                        `Registros del mes: ${cantidadRegistrosConTotalFinal}`
                      )}
                    </p>
              </div>
                  
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
                      <tr className="border-b border-white/20">
                          <th className="text-white font-semibold p-3 text-sm">Fecha</th>
                        <th className="text-white font-semibold p-3 text-sm">Empresa</th>
                          <th className="text-white font-semibold p-3 text-sm">Producto</th>
                          <th className="text-white font-semibold p-3 text-sm">Cantidad</th>
                          <th className="text-white font-semibold p-3 text-sm">Precio Unit.</th>
                          <th className="text-white font-semibold p-3 text-sm">Sub Total</th>
                          <th className="text-white font-semibold p-3 text-sm">Total Final</th>
                          <th className="text-white font-semibold p-3 text-sm">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                        {registrosPedidos.map((registro, index) => {
                          const estaEditando = editandoId === registro.id;
                          
                          return (
                            <tr key={index} className={`hover:bg-white/5 transition-colors ${
                              registro.total_final ? 'border-t-2 border-white/20' : ''
                            }`}>
                              {/* Fecha */}
                              <td className="text-white p-3 text-sm">
                                {estaEditando ? (
                                  <input
                                    type="date"
                                    value={valoresEdicion.fecha_cl}
                                    onChange={(e) => handleEdicionChange('fecha_cl', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    disabled
                                    title="La fecha no se puede editar debido a restricciones de la base de datos"
                                    style={{ cursor: 'not-allowed', opacity: 0.6 }}
                                  />
                                ) : (
                                  (() => {
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
                                  })()
                                )}
                              </td>

                              {/* Empresa */}
                              <td className="text-gray-300 p-3 text-sm">
                                {estaEditando ? (
                                  <input
                                    type="text"
                                    value={valoresEdicion.nombre_empresa}
                                    onChange={(e) => handleEdicionChange('nombre_empresa', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  registro.nombre_empresa
                                )}
                              </td>

                              {/* Producto */}
                              <td className="text-gray-300 p-3 text-sm">
                                {estaEditando ? (
                                  <input
                                    type="text"
                                    value={valoresEdicion.producto}
                                    onChange={(e) => handleEdicionChange('producto', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  registro.producto
                                )}
                              </td>

                              {/* Cantidad */}
                              <td className="text-gray-300 p-3 text-sm text-center">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="1"
                                    value={valoresEdicion.cantidad}
                                    onChange={(e) => handleEdicionChange('cantidad', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  formatearNumero(registro.cantidad)
                                )}
                              </td>

                              {/* Precio Unitario */}
                              <td className="text-gray-300 p-3 text-sm text-right">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.precio_unitario}
                                    onChange={(e) => handleEdicionChange('precio_unitario', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                ) : (
                                  `$${formatearNumero(registro.precio_unitario)}`
                                )}
                              </td>

                              {/* Sub Total */}
                              <td className="text-green-300 p-3 text-sm text-right font-medium">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.sub_total}
                                    onChange={(e) => handleEdicionChange('sub_total', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-green-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Sub total"
                                  />
                                ) : (
                                  `$${formatearNumero(registro.sub_total)}`
                                )}
                              </td>

                              {/* Total Final */}
                              <td className="text-green-400 p-3 text-sm text-right font-bold">
                                {estaEditando ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={valoresEdicion.total_final}
                                    onChange={(e) => handleEdicionChange('total_final', e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-green-400 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                    placeholder="Total final"
                                  />
                                ) : (
                                  `$${formatearNumero(registro.total_final)}`
                                )}
                              </td>

                              {/* Acciones */}
                              <td className="p-3">
                                {estaEditando ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => guardarEdicion(registro.id, registro)}
                                      disabled={loadingRegistros}
                                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Guardar cambios"
                                    >
                                      ✅
                                    </button>
                                    <button
                                      onClick={cancelarEdicion}
                                      disabled={loadingRegistros}
                                      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Cancelar edición"
                                    >
                                      ❌
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => iniciarEdicion(registro)}
                                      disabled={loadingRegistros}
                                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                      title="Editar registro"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => eliminarRegistro(registro.id)}
                                      disabled={loadingEliminar}
                                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                                      title="Eliminar registro"
                                    >
                                      {loadingEliminar ? 'Eliminando...' : 'Eliminar'}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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
             Resumen de Totales por Empresa
           </h2>
              {!(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) && (
                <p className="text-blue-400 text-sm">
                  Mostrando acumulados del mes actual - Usa filtros para ver otros meses
                </p>
              )}
            </div>

            {/* Filtros del Resumen */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">🔍 Filtros del Resumen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                                 <div>
                   <label className="block text-white font-medium mb-2 text-sm">
                     Nombre Empresa
                   </label>
                   <input
                     type="text"
                     name="nombre"
                     value={filtrosResumen.nombre}
                     onChange={handleFiltroResumenChange}
                     placeholder="Buscar empresa..."
                     className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                   />
                 </div>

                <div>
                  <label className="block text-white font-medium mb-2 text-sm">
                    Mes
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
                    Año
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

                                 <div className="flex items-end gap-2">
                   <button
                     onClick={limpiarFiltrosResumen}
                     className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 text-sm"
                   >
                     🗑️ Limpiar Filtros
                   </button>
                 </div>
              </div>

              {/* Contador de resultados */}
              {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) && (
                                     <div className="text-center">
                       <span className="inline-flex items-center px-3 py-1 bg-blue-500/30 border border-blue-500/50 rounded-full text-blue-300 text-sm font-medium">
                         🔍 {resumenClientes.length} empresa{resumenClientes.length !== 1 ? 's' : ''} encontrada{resumenClientes.length !== 1 ? 's' : ''}
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
                <div className="text-gray-400 text-4xl mb-4"></div>
                                   {(filtrosResumen.nombre || filtrosResumen.mes || filtrosResumen.ano) ? (
                     <>
                       <p className="text-gray-300 text-lg font-bold mb-2">No hay empresas que coincidan con los filtros</p>
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
                      `Empresas filtradas: ${resumenClientes.length} | Total filtrado: ${formatearNumero(totalResumenClientes)}`
                    ) : (
                      `Empresas del mes: ${resumenClientes.length} | Total del mes: ${formatearNumero(totalResumenClientes)}`
                    )}
                  </p>
                </div>
                
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                                         <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
                       <tr className="border-b border-white/20">
                                                  <th className="text-white font-semibold p-3 text-sm text-left">Nombre Empresa</th>
                         <th className="text-white font-semibold p-3 text-sm text-right">Monto Total</th>
                         <th className="text-white font-semibold p-3 text-sm text-center">Monto Pagado</th>
                         <th className="text-white font-semibold p-3 text-sm text-center">Fecha de Pago</th>
                         <th className="text-white font-semibold p-3 text-sm text-center">Estado</th>
                       </tr>
                     </thead>
                    <tbody>
                                                                      {resumenClientes.map((empresa, index) => {
                           const estadoActual = estadosPago[empresa.nombre] || 'pendiente';
                           const fechaPago = fechasPago[empresa.nombre];
                           const montoPagado = montosPago[empresa.nombre];
                           
                           return (
                             <tr key={`${empresa.nombre}_${index}`} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                               <td className="text-white p-3 text-sm font-medium text-left">
                                 {empresa.nombre}
                               </td>
                                                           <td className="text-green-400 p-3 text-sm font-bold text-right">
                                 ${formatearNumero(empresa.montoTotal)}
                               </td>
                               <td className="text-blue-400 p-3 text-sm font-bold text-center">
                                 {estadoActual === 'pagado' && montoPagado ? (
                                   <span className="text-blue-300 font-medium">
                                     ${formatearNumero(montoPagado)}
                                   </span>
                                 ) : (
                                   <span className="text-gray-500">-</span>
                                 )}
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
                                  onClick={() => cambiarEstadoPago(empresa.nombre, 'pagado')}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    estadoActual === 'pagado'
                                      ? 'bg-green-600 text-white shadow-lg'
                                      : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                                  }`}
                                >
                                  Pagado
                                </button>
                                <button
                                  onClick={() => cambiarEstadoPago(empresa.nombre, 'pendiente')}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    estadoActual === 'pendiente'
                                      ? 'bg-orange-600 text-white shadow-lg'
                                      : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                                  }`}
                                >
                                  Pendiente
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
                        {estadisticasResumen.pagados}
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
                        {estadisticasResumen.pendientes}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {(filtrosResumen.mes || filtrosResumen.ano) ? 
                          'Pendientes (Filtrados)' : 
                          'Pendientes del Mes'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-400 text-lg font-bold">
                        ${formatearNumero(estadisticasResumen.totalCobrado)}
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
                        'Estadísticas basadas en los filtros aplicados'
                      ) : (
                        `Estadísticas del mes actual: ${new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`
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
