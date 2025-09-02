import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { obtenerFechaHoyChile } from '../lib/dateUtils.js';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Label, ReferenceArea, PieChart, Pie, Cell } from 'recharts';
import Footer from './Footer';

export default function Seguimiento() {
  const navigate = useNavigate();
  
  // Estados para los totales acumulados
  const [totales, setTotales] = useState({
    ventas: 0,
    gastos: 0,
    inventario: 0,
    proveedores: 0,
    clientes: 0,
    pedidos: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para los filtros
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1); // Mes actual (1-12)
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear()); // Año actual
  const [aniosDisponibles, setAniosDisponibles] = useState([]); // Años con datos disponibles
  


  // Estados para el gráfico de ventas acumuladas mensuales
  const [clienteId, setClienteId] = useState(null);
  const [datosVentasAcumuladas, setDatosVentasAcumuladas] = useState([]);
  const [loadingVentasAcumuladas, setLoadingVentasAcumuladas] = useState(false);
  const [errorVentasAcumuladas, setErrorVentasAcumuladas] = useState(null);
  const [anioGrafico, setAnioGrafico] = useState(new Date().getFullYear()); // Año para el gráfico
  const [aniosGraficoDisponibles, setAniosGraficoDisponibles] = useState([]); // Años disponibles para el gráfico

  // Estados para el gráfico de tipos de pago
  const [datosTiposPago, setDatosTiposPago] = useState([]);
  const [loadingTiposPago, setLoadingTiposPago] = useState(false);
  const [errorTiposPago, setErrorTiposPago] = useState(null);

  // Estados para el gráfico de tipos de pago de pedidos
  const [datosTiposPagoPedidos, setDatosTiposPagoPedidos] = useState([]);
  const [loadingTiposPagoPedidos, setLoadingTiposPagoPedidos] = useState(false);
  const [errorTiposPagoPedidos, setErrorTiposPagoPedidos] = useState(null);

  // Estados para el gráfico de pedidos acumulados mensuales
  const [datosPedidosAcumulados, setDatosPedidosAcumulados] = useState([]);
  const [loadingPedidosAcumulados, setLoadingPedidosAcumulados] = useState(false);
  const [errorPedidosAcumulados, setErrorPedidosAcumulados] = useState(null);

  // Función para obtener el mes y año actual
  const obtenerMesAnioActual = () => {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1; // getMonth() devuelve 0-11
    const anio = fecha.getFullYear();
    return { mes, anio };
  };

  // Función para cargar todos los totales acumulados del mes actual
  const cargarTotalesMensuales = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        return;
      }

      // Construir fechas de inicio y fin del mes seleccionado
      const mesStr = filtroMes.toString().padStart(2, '0');
      const fechaInicio = `${filtroAnio}-${mesStr}-01`;
      
      // Calcular el último día del mes
      const ultimoDiaDelMes = new Date(filtroAnio, filtroMes, 0).getDate();
      const fechaFin = `${filtroAnio}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;

      // 1. Total de Ventas del mes
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas')
        .select('total_venta, fecha_cl')
        .eq('usuario_id', usuarioId)
        .gte('fecha_cl', fechaInicio)
        .lte('fecha_cl', fechaFin);

      if (ventasError) {
        console.error('❌ Error al cargar ventas:', ventasError);
      }

      // 2. Total de Gastos del mes
      const { data: gastosData, error: gastosError } = await supabase
        .from('gasto')
        .select('monto, fecha_cl')
        .gte('fecha_cl', fechaInicio)
        .lte('fecha_cl', fechaFin);

      if (gastosError) {
        console.error('❌ Error al cargar gastos:', gastosError);
      }

      // 3. Total de Inventario (costo_total) del mes
      const { data: inventarioData, error: inventarioError } = await supabase
        .from('inventario')
        .select('costo_total, fecha_cl')
        .eq('usuario_id', usuarioId)
        .gte('fecha_cl', fechaInicio)
        .lte('fecha_cl', fechaFin);

      if (inventarioError) {
        console.error('❌ Error al cargar inventario:', inventarioError);
      }

      // 4. Total de Proveedores del mes
      const { data: proveedoresData, error: proveedoresError } = await supabase
        .from('proveedores')
        .select('monto, fecha_cl')
        .gte('fecha_cl', fechaInicio)
        .lte('fecha_cl', fechaFin);

      if (proveedoresError) {
        console.error('❌ Error al cargar proveedores:', proveedoresError);
      }

      // 5. Total de Clientes del mes (suma de totales de pedidos)
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('total_final, fecha_cl')
        .eq('usuario_id', usuarioId)
        .not('total_final', 'is', null)
        .gte('fecha_cl', fechaInicio)
        .lte('fecha_cl', fechaFin);

      if (clientesError) {
        console.error('❌ Error al cargar clientes:', clientesError);
      }

                    // 6. Total de Pedidos del mes (suma de total_final de pedidos)
       const { data: pedidosData, error: pedidosError } = await supabase
         .from('pedidos')
         .select('total_final, fecha_cl')
         .eq('usuario_id', usuarioId)
         .not('total_final', 'is', null)
         .gte('fecha_cl', fechaInicio)
         .lte('fecha_cl', fechaFin);

       if (pedidosError) {
         console.error('❌ Error al cargar pedidos:', pedidosError);
       }

                    // Calcular totales
       const totalVentas = ventasData?.reduce((sum, item) => sum + (parseFloat(item.total_venta) || 0), 0) || 0;
       const totalGastos = gastosData?.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0) || 0;
       const totalInventario = inventarioData?.reduce((sum, item) => sum + (parseFloat(item.costo_total) || 0), 0) || 0;
       const totalProveedores = proveedoresData?.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0) || 0;
       const totalClientes = clientesData?.reduce((sum, item) => sum + (parseFloat(item.total_final) || 0), 0) || 0;
       const totalPedidos = pedidosData?.reduce((sum, item) => sum + (parseFloat(item.total_final) || 0), 0) || 0;

      setTotales({
        ventas: totalVentas, // Solo ventas de la tabla ventas
        gastos: totalGastos,
        inventario: totalInventario,
        proveedores: totalProveedores,
        clientes: totalClientes,
        pedidos: totalPedidos // Total de pedidos separado
      });

    } catch (error) {
      console.error('❌ Error inesperado al cargar totales:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear números como moneda chilena
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  // Función para obtener el nombre del mes actual
  const obtenerNombreMesActual = () => {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const { mes } = obtenerMesAnioActual();
    return nombresMeses[mes - 1];
  };

  // Función para obtener el nombre del mes seleccionado
  const obtenerNombreMesSeleccionado = (mes) => {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return nombresMeses[mes - 1];
  };

  // Función para obtener el cliente_id del usuario autenticado
  const obtenerClienteId = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('[chart] No hay usuario autenticado');
        setErrorVentasAcumuladas('Usuario no autenticado');
        return null;
      }

      // Consultar la tabla usuarios para obtener el cliente_id del usuario autenticado
      const { data: clienteData, error: clienteError } = await supabase
        .from('usuarios')
        .select('cliente_id')
        .eq('usuario_id', usuarioId)
        .single();

      if (clienteError) {
        console.error('[chart] Error al obtener cliente_id:', clienteError);
        setErrorVentasAcumuladas('Error al obtener datos del cliente');
        return null;
      }

      if (!clienteData) {
        console.error('[chart] No se encontró cliente para el usuario');
        setErrorVentasAcumuladas('Cliente no encontrado');
        return null;
      }

      const clienteId = clienteData.cliente_id;
      setClienteId(clienteId);
      return clienteId;

    } catch (error) {
      console.error('[chart] Error inesperado al obtener cliente_id:', error);
      setErrorVentasAcumuladas('Error inesperado al obtener datos del cliente');
      return null;
    }
  };

  // Función para cargar datos de ventas acumuladas mensuales
  const cargarVentasAcumuladas = async () => {
    try {
      if (!clienteId) {
        return;
      }

      setLoadingVentasAcumuladas(true);
      setErrorVentasAcumuladas(null);
      
      // Crear array base con los 12 meses del año
      const mesesBase = [
        { mes: 'Ene', mes_num: 1, totalAcum: 0, totalMes: 0 },
        { mes: 'Feb', mes_num: 2, totalAcum: 0, totalMes: 0 },
        { mes: 'Mar', mes_num: 3, totalAcum: 0, totalMes: 0 },
        { mes: 'Abr', mes_num: 4, totalAcum: 0, totalMes: 0 },
        { mes: 'May', mes_num: 5, totalAcum: 0, totalMes: 0 },
        { mes: 'Jun', mes_num: 6, totalAcum: 0, totalMes: 0 },
        { mes: 'Jul', mes_num: 7, totalAcum: 0, totalMes: 0 },
        { mes: 'Ago', mes_num: 8, totalAcum: 0, totalMes: 0 },
        { mes: 'Sep', mes_num: 9, totalAcum: 0, totalMes: 0 },
        { mes: 'Oct', mes_num: 10, totalAcum: 0, totalMes: 0 },
        { mes: 'Nov', mes_num: 11, totalAcum: 0, totalMes: 0 },
        { mes: 'Dic', mes_num: 12, totalAcum: 0, totalMes: 0 }
      ];

        // Consultar la vista ventas_mensual_acum_v2
        const { data: ventasData, error: ventasError } = await supabase
          .from('ventas_mensual_acum_v2')
          .select('mes_num, total_acumulado, total_mes')
          .eq('cliente_id', clienteId)
          .eq('anio', anioGrafico)
          .order('mes_num', { ascending: true });

        if (ventasError) {
          console.error('[chart] Error al consultar ventas_mensual_acum_v2:', ventasError);
          setErrorVentasAcumuladas('Error al cargar datos de ventas');
          return;
        }

      // Mapear los datos recibidos a los meses base
      const datosMapeados = mesesBase.map(mesBase => {
        const datoEncontrado = ventasData?.find(d => d.mes_num === mesBase.mes_num);
        return {
          ...mesBase,
          totalAcum: datoEncontrado ? parseFloat(datoEncontrado.total_acumulado) || 0 : 0,
          totalMes: datoEncontrado ? parseFloat(datoEncontrado.total_mes) || 0 : 0
        };
      });

      setDatosVentasAcumuladas(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar ventas acumuladas:', error);
      setErrorVentasAcumuladas('Error inesperado al cargar datos');
    } finally {
      setLoadingVentasAcumuladas(false);
    }
  };

  // Función para cargar años disponibles con datos
  const cargarAniosDisponibles = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      // Consultar cada tabla individualmente para evitar errores
      const aniosEncontrados = new Set();
      
      // 1. Tabla ventas
      try {
        const { data: ventasData, error: ventasError } = await supabase
          .from('ventas')
          .select('fecha_cl')
          .eq('usuario_id', usuarioId);
        
        if (!ventasError && ventasData) {
          ventasData.forEach(item => {
            if (item.fecha_cl) {
              const anio = new Date(item.fecha_cl).getFullYear();
              if (anio >= 2025) aniosEncontrados.add(anio);
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Error al consultar tabla ventas para años:', error);
      }

      // 2. Tabla gasto
      try {
        const { data: gastosData, error: gastosError } = await supabase
          .from('gasto')
          .select('fecha_cl');
        
        if (!gastosError && gastosData) {
          gastosData.forEach(item => {
            if (item.fecha_cl) {
              const anio = new Date(item.fecha_cl).getFullYear();
              if (anio >= 2025) aniosEncontrados.add(anio);
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Error al consultar tabla gasto para años:', error);
      }

      // 3. Tabla inventario
      try {
        const { data: inventarioData, error: inventarioError } = await supabase
          .from('inventario')
          .select('fecha_cl')
          .eq('usuario_id', usuarioId);
        
        if (!inventarioError && inventarioData) {
          inventarioData.forEach(item => {
            if (item.fecha_cl) {
              const anio = new Date(item.fecha_cl).getFullYear();
              if (anio >= 2025) aniosEncontrados.add(anio);
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Error al consultar tabla inventario para años:', error);
      }

      // 4. Tabla proveedores
      try {
        const { data: proveedoresData, error: proveedoresError } = await supabase
          .from('proveedores')
          .select('fecha_cl');
        
        if (!proveedoresError && proveedoresData) {
          proveedoresData.forEach(item => {
            if (item.fecha_cl) {
              const anio = new Date(item.fecha_cl).getFullYear();
              if (anio >= 2025) aniosEncontrados.add(anio);
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Error al consultar tabla proveedores para años:', error);
      }

      // 5. Tabla clientes
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('fecha_cl')
          .eq('usuario_id', usuarioId);
        
        if (!clientesError && clientesData) {
          clientesData.forEach(item => {
            if (item.fecha_cl) {
              const anio = new Date(item.fecha_cl).getFullYear();
              if (anio >= 2025) aniosEncontrados.add(anio);
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Error al consultar tabla clientes para años:', error);
      }

                    // 6. Tabla pedidos
       try {
         const { data: pedidosData, error: pedidosError } = await supabase
           .from('pedidos')
           .select('fecha_cl')
           .eq('usuario_id', usuarioId);
         
         if (!pedidosError && pedidosData) {
           pedidosData.forEach(item => {
             if (item.fecha_cl) {
               const anio = new Date(item.fecha_cl).getFullYear();
               if (anio >= 2025) aniosEncontrados.add(anio);
             }
           });
         }
       } catch (error) {
         console.warn('⚠️ Error al consultar tabla pedidos para años:', error);
       }
      
      // Convertir a array y ordenar
      const aniosArray = Array.from(aniosEncontrados).sort((a, b) => b - a);
      
      // Si no hay años disponibles, usar al menos el año actual
      if (aniosArray.length === 0) {
        const anioActual = new Date().getFullYear();
        setAniosDisponibles([anioActual]);
      } else {
        setAniosDisponibles(aniosArray);
      }
    } catch (error) {
      console.error('❌ Error general al cargar años disponibles:', error);
      // Fallback: usar año actual
      const anioActual = new Date().getFullYear();
      setAniosDisponibles([anioActual]);
    }
  };

  // Función para cargar años disponibles para el gráfico desde la vista ventas_mensual_acum_v2
  const cargarAniosGraficoDisponibles = async () => {
    try {
      if (!clienteId) return;

      // Consultar la vista para obtener todos los años disponibles para este cliente
      const { data: aniosData, error: aniosError } = await supabase
        .from('ventas_mensual_acum_v2')
        .select('anio')
        .eq('cliente_id', clienteId)
        .order('anio', { ascending: false });

      if (aniosError) {
        console.warn('⚠️ Error al consultar años del gráfico:', aniosError);
        return;
      }

      // Extraer años únicos y ordenarlos
      const aniosUnicos = [...new Set(aniosData?.map(item => item.anio) || [])].sort((a, b) => b - a);
      
      // Si no hay años, usar al menos el año actual
      if (aniosUnicos.length === 0) {
        const anioActual = new Date().getFullYear();
        setAniosGraficoDisponibles([anioActual]);
      } else {
        setAniosGraficoDisponibles(aniosUnicos);
      }

      // Si el año actual del gráfico no está en la lista, usar el primer año disponible
      if (aniosUnicos.length > 0 && !aniosUnicos.includes(anioGrafico)) {
        setAnioGrafico(aniosUnicos[0]);
      }
    } catch (error) {
      console.error('❌ Error al cargar años del gráfico:', error);
      // Fallback: usar año actual
      const anioActual = new Date().getFullYear();
      setAniosGraficoDisponibles([anioActual]);
    }
  };

  // Función para cargar datos de tipos de pago mensuales
  const cargarTiposPago = async () => {
    try {
      if (!clienteId) return;

      setLoadingTiposPago(true);
      setErrorTiposPago(null);

      // Consultar la vista ventas_tipo_pago_mensual
      const { data: tiposPagoData, error: tiposPagoError } = await supabase
        .from('ventas_tipo_pago_mensual')
        .select('tipo_pago, cantidad, porcentaje_mes')
        .eq('cliente_id', clienteId)
        .eq('anio', anioGrafico)
        .eq('mes_num', filtroMes)
        .order('cantidad', { ascending: false });

      if (tiposPagoError) {
        console.error('[chart] Error al consultar ventas_tipo_pago_mensual:', tiposPagoError);
        setErrorTiposPago('Error al cargar datos de tipos de pago');
        return;
      }

      // Mapear los datos para el gráfico circular
      const datosMapeados = tiposPagoData?.map(item => ({
        name: item.tipo_pago.charAt(0).toUpperCase() + item.tipo_pago.slice(1),
        value: parseInt(item.cantidad),
        porcentaje: parseFloat(item.porcentaje_mes) * 100, // Convertir decimal a porcentaje
        tipo: item.tipo_pago
      })) || [];

      setDatosTiposPago(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar tipos de pago:', error);
      setErrorTiposPago('Error inesperado al cargar datos');
    } finally {
      setLoadingTiposPago(false);
    }
  };

  // Función para cargar datos de tipos de pago de pedidos mensuales
  const cargarTiposPagoPedidos = async () => {
    try {
      if (!clienteId) return;

      setLoadingTiposPagoPedidos(true);
      setErrorTiposPagoPedidos(null);

      // Consultar la vista pedidos_tipo_pago_mensual
      const { data: tiposPagoPedidosData, error: tiposPagoPedidosError } = await supabase
        .from('pedidos_tipo_pago_mensual')
        .select('tipo_pago, cantidad, porcentaje_mes')
        .eq('cliente_id', clienteId)
        .eq('anio', anioGrafico)
        .eq('mes_num', filtroMes)
        .order('cantidad', { ascending: false });

      if (tiposPagoPedidosError) {
        console.error('[chart] Error al consultar pedidos_tipo_pago_mensual:', tiposPagoPedidosError);
        setErrorTiposPagoPedidos('Error al cargar datos de tipos de pago de pedidos');
        return;
      }

      // Mapear los datos para el gráfico circular
      const datosMapeados = tiposPagoPedidosData?.map(item => ({
        name: item.tipo_pago.charAt(0).toUpperCase() + item.tipo_pago.slice(1),
        value: parseInt(item.cantidad),
        porcentaje: parseFloat(item.porcentaje_mes), // Ya viene como porcentaje
        tipo: item.tipo_pago
      })) || [];

      setDatosTiposPagoPedidos(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar tipos de pago de pedidos:', error);
      setErrorTiposPagoPedidos('Error inesperado al cargar datos');
    } finally {
      setLoadingTiposPagoPedidos(false);
    }
  };

  // Función para cargar datos de pedidos acumulados mensuales
  const cargarPedidosAcumulados = async () => {
    try {
      if (!clienteId) {
        return;
      }

      setLoadingPedidosAcumulados(true);
      setErrorPedidosAcumulados(null);
      
      // Crear array base con los 12 meses del año
      const mesesBase = [
        { mes: 'Ene', mes_num: 1, totalAcum: 0, totalMes: 0 },
        { mes: 'Feb', mes_num: 2, totalAcum: 0, totalMes: 0 },
        { mes: 'Mar', mes_num: 3, totalAcum: 0, totalMes: 0 },
        { mes: 'Abr', mes_num: 4, totalAcum: 0, totalMes: 0 },
        { mes: 'May', mes_num: 5, totalAcum: 0, totalMes: 0 },
        { mes: 'Jun', mes_num: 6, totalAcum: 0, totalMes: 0 },
        { mes: 'Jul', mes_num: 7, totalAcum: 0, totalMes: 0 },
        { mes: 'Ago', mes_num: 8, totalAcum: 0, totalMes: 0 },
        { mes: 'Sep', mes_num: 9, totalAcum: 0, totalMes: 0 },
        { mes: 'Oct', mes_num: 10, totalAcum: 0, totalMes: 0 },
        { mes: 'Nov', mes_num: 11, totalAcum: 0, totalMes: 0 },
        { mes: 'Dic', mes_num: 12, totalAcum: 0, totalMes: 0 }
      ];

        // Consultar la vista pedidos_mensual_acum_v2
        const { data: pedidosData, error: pedidosError } = await supabase
          .from('pedidos_mensual_acum_v2')
          .select('mes_num, total_acumulado, total_mes')
          .eq('cliente_id', clienteId)
          .eq('anio', anioGrafico)
          .order('mes_num', { ascending: true });

        if (pedidosError) {
          console.error('[chart] Error al consultar pedidos_mensual_acum_v2:', pedidosError);
          setErrorPedidosAcumulados('Error al cargar datos de pedidos');
          return;
        }

      // Mapear los datos recibidos a los meses base
      const datosMapeados = mesesBase.map(mesBase => {
        const datoEncontrado = pedidosData?.find(d => d.mes_num === mesBase.mes_num);
        return {
          ...mesBase,
          totalAcum: datoEncontrado ? parseFloat(datoEncontrado.total_acumulado) || 0 : 0,
          totalMes: datoEncontrado ? parseFloat(datoEncontrado.total_mes) || 0 : 0
        };
      });

      setDatosPedidosAcumulados(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar pedidos acumulados:', error);
      setErrorPedidosAcumulados('Error inesperado al cargar datos');
    } finally {
      setLoadingPedidosAcumulados(false);
    }
  };


  // Cargar totales al montar el componente (solo una vez)
  useEffect(() => {
    cargarTotalesMensuales();
    cargarAniosDisponibles(); // Cargar años disponibles al montar
    
    // Cargar cliente_id y ventas acumuladas
    const inicializarVentasAcumuladas = async () => {
      const clienteId = await obtenerClienteId();
      if (clienteId) {
        await cargarVentasAcumuladas();
      }
    };
    inicializarVentasAcumuladas();
  }, []); // Array vacío = solo se ejecuta una vez al montar

  // Cargar totales cuando cambien los filtros (SOLO LAS TARJETAS)
  useEffect(() => {
    cargarTotalesMensuales(); // Solo recargar totales de las tarjetas
    // NO recargar el gráfico - debe mantenerse independiente
  }, [filtroMes, filtroAnio]);

  // Cargar ventas acumuladas cuando se obtenga el cliente_id
  useEffect(() => {
    if (clienteId) {
      cargarVentasAcumuladas();
      cargarPedidosAcumulados(); // Cargar pedidos acumulados también
      cargarAniosGraficoDisponibles(); // Cargar años disponibles para el gráfico
    }
  }, [clienteId]);

  // Cargar ventas acumuladas cuando cambie el año del gráfico
  useEffect(() => {
    if (clienteId) {
      cargarVentasAcumuladas();
      cargarPedidosAcumulados(); // Cargar pedidos acumulados también
    }
  }, [anioGrafico, clienteId]);

  // Cargar tipos de pago cuando cambie el cliente_id, año del gráfico o mes del filtro
  useEffect(() => {
    if (clienteId) {
      cargarTiposPago();
      cargarTiposPagoPedidos();
    }
  }, [clienteId, anioGrafico, filtroMes]);

  // Colores para los tipos de pago en el gráfico circular
  const coloresTiposPago = {
    'debito': '#3b82f6',      // Azul
    'credito': '#ef4444',     // Rojo
    'efectivo': '#10b981',    // Verde
    'transferencia': '#f59e0b' // Amarillo
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
            📊 Sistema de Seguimiento
          </h1>

          {/* Filtros de mes y año */}
          <div className="text-center mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Filtro de mes */}
              <div className="flex items-center gap-2">
                <label className="text-white font-medium text-sm md:text-base">
                  Mes:
                </label>
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(parseInt(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                  style={{ colorScheme: 'dark' }}
                >
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

              {/* Filtro de año */}
              <div className="flex items-center gap-2">
                <label className="text-white font-medium text-sm md:text-base">
                  Año:
                </label>
                <select
                  value={filtroAnio}
                  onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                  style={{ colorScheme: 'dark' }}
                >
                  {aniosDisponibles.map(anio => (
                    <option key={anio} value={anio} className="bg-gray-800 text-white">
                      {anio}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Mensaje de error */}
            {error && (
              <div className="mt-4 p-3 bg-red-600/20 border border-red-400/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* 6 Tarjetas tipo Power BI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 mb-8">
            {/* Tarjeta 1: Ventas */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl">🤝</span>
                </div>
                <h3 className="text-green-200 text-sm md:text-base font-medium mb-2">Total Ventas</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 md:h-8 bg-green-400/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <div className="text-green-300 text-lg md:text-xl font-bold mb-1">
                    {formatearMoneda(totales.ventas)}
                  </div>
                )}
                <p className="text-green-200 text-xs opacity-75">Mes actual</p>
              </div>
            </div>

            {/* Tarjeta 2: Gastos */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl">💰</span>
                </div>
                <h3 className="text-green-200 text-sm md:text-base font-medium mb-2">Total Gastos</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 md:h-8 bg-green-400/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <div className="text-green-300 text-lg md:text-xl font-bold mb-1">
                    {formatearMoneda(totales.gastos)}
                  </div>
                )}
                <p className="text-green-200 text-xs opacity-75">Mes actual</p>
              </div>
            </div>

            {/* Tarjeta 3: Inventario */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl">📦</span>
                </div>
                <h3 className="text-green-200 text-sm md:text-base font-medium mb-2">Total Inventario</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 md:h-8 bg-green-400/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <div className="text-green-300 text-lg md:text-xl font-bold mb-1">
                    {formatearMoneda(totales.inventario)}
                  </div>
                )}
                <p className="text-green-200 text-xs opacity-75">Mes actual</p>
              </div>
            </div>

            {/* Tarjeta 4: Proveedores */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl">🚚</span>
                </div>
                <h3 className="text-green-200 text-sm md:text-base font-medium mb-2">Total Proveedores</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 md:h-8 bg-green-400/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <div className="text-green-300 text-lg md:text-xl font-bold mb-1">
                    {formatearMoneda(totales.proveedores)}
                  </div>
                )}
                <p className="text-green-200 text-xs opacity-75">Mes actual</p>
              </div>
            </div>

            {/* Tarjeta 5: Clientes */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl">👥</span>
                </div>
                <h3 className="text-green-200 text-sm md:text-base font-medium mb-2">Total Clientes</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 md:h-8 bg-green-400/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <div className="text-green-300 text-lg md:text-xl font-bold mb-1">
                    {formatearMoneda(totales.clientes)}
                  </div>
                )}
                <p className="text-green-200 text-xs opacity-75">Mes actual</p>
              </div>
            </div>

            {/* Tarjeta 6: Pedidos */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl">📋</span>
                </div>
                <h3 className="text-green-200 text-sm md:text-base font-medium mb-2">Total Pedidos</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 md:h-8 bg-green-400/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <div className="text-green-300 text-lg md:text-xl font-bold mb-1">
                    {formatearMoneda(totales.pedidos)}
                  </div>
                )}
                <p className="text-green-200 text-xs opacity-75">Mes actual</p>
              </div>
            </div>

          </div>

          {/* Gráfico de Ventas Acumuladas Mensuales */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-8">
            <div className="text-center mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  📈 Ventas Acumuladas
                </h3>
                {/* Filtro de año para el gráfico */}
                <div className="flex items-center gap-2">
                  <label className="text-white font-medium text-sm md:text-base">
                    Año:
                  </label>
                  <select
                    value={anioGrafico}
                    onChange={(e) => setAnioGrafico(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                  >
                    {aniosGraficoDisponibles.map(anio => (
                      <option key={anio} value={anio} className="bg-gray-800 text-white">
                        {anio}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-green-200 text-sm md:text-base">
                Total acumulado mensual del cliente
              </p>
            </div>

            {loadingVentasAcumuladas ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                <span className="ml-3 text-green-200">Cargando...</span>
              </div>
            ) : errorVentasAcumuladas ? (
              <div className="text-center py-8">
                <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-red-300 text-sm">{errorVentasAcumuladas}</p>
                </div>
              </div>
            ) : datosVentasAcumuladas.length > 0 ? (
              <div className="h-64 md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={datosVentasAcumuladas}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    aria-label="Gráfico de ventas acumuladas"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                         <XAxis 
                       dataKey="mes" 
                       stroke="rgba(255, 255, 255, 0.7)"
                       fontSize={12}
                     />
                    <YAxis 
                      stroke="rgba(255, 255, 255, 0.7)"
                      fontSize={12}
                      tickFormatter={(value) => new Intl.NumberFormat('es-CL').format(value)}
                    />
                     <Tooltip 
                       contentStyle={{
                         backgroundColor: 'rgba(0, 0, 0, 0.8)',
                         border: '1px solid rgba(255, 255, 255, 0.2)',
                         borderRadius: '8px',
                         color: 'white'
                       }}
                                               formatter={(value, name, props) => {
                          // Usar el total_mes directamente desde los datos mapeados
                          const mesActual = props.payload.mes_num;
                          const mesData = datosVentasAcumuladas.find(d => d.mes_num === mesActual);
                          
                          return [
                            <div key="tooltip-content">
                              <div style={{ marginBottom: '8px' }}>
                                <strong>Total Acumulado:</strong><br />
                                {new Intl.NumberFormat('es-CL', {
                                  style: 'currency',
                                  currency: 'CLP',
                                  minimumFractionDigits: 0
                                }).format(value)}
                              </div>
                              <div>
                                <strong>Valor del Mes:</strong><br />
                                {new Intl.NumberFormat('es-CL', {
                                  style: 'currency',
                                  currency: 'CLP',
                                  minimumFractionDigits: 0
                                }).format(mesData?.totalMes || 0)}
                              </div>
                            </div>
                          ];
                        }}
                       
                     />
                                           <Line
                        type="monotone"
                        dataKey="totalAcum"
                        stroke="transparent"
                        strokeWidth={0}
                        dot={{
                          fill: '#10b981',
                          stroke: 'white',
                          strokeWidth: 2,
                          r: 8
                        }}
                        activeDot={{
                          fill: '#10b981',
                          stroke: 'white',
                          strokeWidth: 3,
                          r: 10
                        }}
                        label={{
                          position: 'top',
                          fill: 'white',
                          fontSize: 10,
                          fontWeight: 'bold',
                          offset: 15,
                          formatter: (value) => new Intl.NumberFormat('es-CL', {
                            style: 'currency',
                            currency: 'CLP',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(value)
                        }}
                      />

                  </LineChart>
                </ResponsiveContainer>
                
                {/* Información adicional del gráfico */}
                <div className="mt-6 text-center">
                  <div className="inline-flex flex-wrap items-center justify-center gap-4 text-sm text-green-200">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      Total del año: {formatearMoneda(datosVentasAcumuladas.reduce((sum, item) => sum + item.totalAcum, 0))}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                      Promedio mensual: {formatearMoneda(datosVentasAcumuladas.reduce((sum, item) => sum + item.totalAcum, 0) / 12)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-300 rounded-full"></span>
                      Meses con ventas: {datosVentasAcumuladas.filter(d => d.totalAcum > 0).length}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-green-400 text-4xl mb-4">📊</div>
                <p className="text-gray-300 text-lg font-medium mb-2">No hay datos de ventas acumuladas</p>
                <p className="text-green-200 text-sm">
                  El gráfico mostrará los 12 meses con valores en 0
                </p>
              </div>
            )}
          </div>

          {/* Gráficos Circulares de Tipos de Pago */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Gráfico Circular de Ventas */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Ventas
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <h3 className="text-lg md:text-xl font-medium text-green-200">
                  💳 Distribución por Tipo de Pago
                </h3>
                {/* Filtros para el gráfico circular */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Filtro de mes */}
                  <div className="flex items-center gap-2">
                    <label className="text-white font-medium text-sm md:text-base">
                      Mes:
                    </label>
                    <select
                      value={filtroMes}
                      onChange={(e) => setFiltroMes(parseInt(e.target.value))}
                      className="px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                      style={{ colorScheme: 'dark' }}
                    >
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

                  {/* Filtro de año */}
                  <div className="flex items-center gap-2">
                    <label className="text-white font-medium text-sm md:text-base">
                      Año:
                    </label>
                    <select
                      value={filtroAnio}
                      onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
                      className="px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                      style={{ colorScheme: 'dark' }}
                    >
                      {aniosDisponibles.map(anio => (
                        <option key={anio} value={anio} className="bg-gray-800 text-white">
                          {anio}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {loadingTiposPago ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                <span className="ml-3 text-green-200">Cargando...</span>
              </div>
            ) : errorTiposPago ? (
              <div className="text-center py-8">
                <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-red-300 text-sm">{errorTiposPago}</p>
                </div>
              </div>
            ) : datosTiposPago.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Gráfico Circular */}
                <div className="h-64 md:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosTiposPago}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, porcentaje }) => `${name}: ${porcentaje.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {datosTiposPago.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={coloresTiposPago[entry.tipo] || '#8884d8'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} ventas`,
                          `${props.payload.name} (${props.payload.porcentaje.toFixed(1)}%)`
                        ]}
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'white'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leyenda y Estadísticas */}
                <div className="space-y-4">
                  <div className="text-center lg:text-left">
                    <h4 className="text-lg font-semibold text-white mb-4">Resumen del Mes</h4>
                    <div className="space-y-3">
                      {datosTiposPago.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: coloresTiposPago[item.tipo] || '#8884d8' }}
                            ></div>
                            <span className="text-white font-medium">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-green-300 font-bold">{item.value} ventas</div>
                            <div className="text-green-200 text-sm">{item.porcentaje.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Total de ventas del mes */}
                    <div className="mt-6 p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                      <div className="text-center">
                        <div className="text-green-200 text-sm font-medium">Total de Ventas del Mes</div>
                        <div className="text-green-300 text-2xl font-bold">
                          {datosTiposPago.reduce((sum, item) => sum + item.value, 0)} ventas
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-green-400 text-4xl mb-4">💳</div>
                <p className="text-gray-300 text-lg font-medium mb-2">No hay datos de tipos de pago</p>
                <p className="text-green-200 text-sm">
                  No se encontraron ventas para el mes seleccionado
                </p>
              </div>
            )}
            </div>

            {/* Gráfico Circular de Pedidos */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Pedidos
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                  <h3 className="text-lg md:text-xl font-medium text-green-200">
                    📋 Distribución por Tipo de Pago
                  </h3>
                  {/* Filtros para el gráfico circular de pedidos */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Filtro de mes */}
                    <div className="flex items-center gap-2">
                      <label className="text-white font-medium text-sm md:text-base">
                        Mes:
                      </label>
                      <select
                        value={filtroMes}
                        onChange={(e) => setFiltroMes(parseInt(e.target.value))}
                        className="px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                        style={{ colorScheme: 'dark' }}
                      >
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

                    {/* Filtro de año */}
                    <div className="flex items-center gap-2">
                      <label className="text-white font-medium text-sm md:text-base">
                        Año:
                      </label>
                      <select
                        value={filtroAnio}
                        onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
                        className="px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                        style={{ colorScheme: 'dark' }}
                      >
                        {aniosDisponibles.map(anio => (
                          <option key={anio} value={anio} className="bg-gray-800 text-white">
                            {anio}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {loadingTiposPagoPedidos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                  <span className="ml-3 text-green-200">Cargando...</span>
                </div>
              ) : errorTiposPagoPedidos ? (
                <div className="text-center py-8">
                  <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-red-300 text-sm">{errorTiposPagoPedidos}</p>
                  </div>
                </div>
              ) : datosTiposPagoPedidos.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Gráfico Circular */}
                  <div className="h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={datosTiposPagoPedidos}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, porcentaje }) => `${name}: ${porcentaje.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {datosTiposPagoPedidos.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={coloresTiposPago[entry.tipo] || '#8884d8'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => [
                            `${value} pedidos`,
                            `${props.payload.name} (${props.payload.porcentaje.toFixed(1)}%)`
                          ]}
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Leyenda y Estadísticas */}
                  <div className="space-y-4">
                    <div className="text-center lg:text-left">
                      <h4 className="text-lg font-semibold text-white mb-4">Resumen del Mes</h4>
                      <div className="space-y-3">
                        {datosTiposPagoPedidos.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: coloresTiposPago[item.tipo] || '#8884d8' }}
                              ></div>
                              <span className="text-white font-medium">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-green-300 font-bold">{item.value} pedidos</div>
                              <div className="text-green-200 text-sm">{item.porcentaje.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Total de pedidos del mes */}
                      <div className="mt-6 p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                        <div className="text-center">
                          <div className="text-green-200 text-sm font-medium">Total de Pedidos del Mes</div>
                          <div className="text-green-300 text-2xl font-bold">
                            {datosTiposPagoPedidos.reduce((sum, item) => sum + item.value, 0)} pedidos
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-green-400 text-4xl mb-4">📋</div>
                  <p className="text-gray-300 text-lg font-medium mb-2">No hay datos de tipos de pago de pedidos</p>
                  <p className="text-green-200 text-sm">
                    No se encontraron pedidos para el mes seleccionado
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Pedidos Acumulados Mensuales */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-8">
            <div className="text-center mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  📋 Pedidos Acumulados
                </h3>
                {/* Filtro de año para el gráfico */}
                <div className="flex items-center gap-2">
                  <label className="text-white font-medium text-sm md:text-base">
                    Año:
                  </label>
                  <select
                    value={anioGrafico}
                    onChange={(e) => setAnioGrafico(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                  >
                    {aniosGraficoDisponibles.map(anio => (
                      <option key={anio} value={anio} className="bg-gray-800 text-white">
                        {anio}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-green-200 text-sm md:text-base">
                Total acumulado mensual de pedidos pagados
              </p>
            </div>

            {loadingPedidosAcumulados ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                <span className="ml-3 text-green-200">Cargando...</span>
              </div>
            ) : errorPedidosAcumulados ? (
              <div className="text-center py-8">
                <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-red-300 text-sm">{errorPedidosAcumulados}</p>
                </div>
              </div>
            ) : datosPedidosAcumulados.length > 0 ? (
              <div className="h-64 md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={datosPedidosAcumulados}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    aria-label="Gráfico de pedidos acumulados"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis 
                      dataKey="mes" 
                      stroke="rgba(255, 255, 255, 0.7)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="rgba(255, 255, 255, 0.7)"
                      fontSize={12}
                      tickFormatter={(value) => new Intl.NumberFormat('es-CL').format(value)}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value, name, props) => {
                        // Usar el total_mes directamente desde los datos mapeados
                        const mesActual = props.payload.mes_num;
                        const mesData = datosPedidosAcumulados.find(d => d.mes_num === mesActual);
                        
                        return [
                          <div key="tooltip-content">
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Total Acumulado:</strong><br />
                              {new Intl.NumberFormat('es-CL', {
                                style: 'currency',
                                currency: 'CLP',
                                minimumFractionDigits: 0
                              }).format(value)}
                            </div>
                            <div>
                              <strong>Valor del Mes:</strong><br />
                              {new Intl.NumberFormat('es-CL', {
                                style: 'currency',
                                currency: 'CLP',
                                minimumFractionDigits: 0
                              }).format(mesData?.totalMes || 0)}
                            </div>
                          </div>
                        ];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalAcum"
                      stroke="transparent"
                      strokeWidth={0}
                      dot={{
                        fill: '#3b82f6',
                        stroke: 'white',
                        strokeWidth: 2,
                        r: 8
                      }}
                      activeDot={{
                        fill: '#3b82f6',
                        stroke: 'white',
                        strokeWidth: 3,
                        r: 10
                      }}
                      label={{
                        position: 'top',
                        fill: 'white',
                        fontSize: 10,
                        fontWeight: 'bold',
                        offset: 15,
                        formatter: (value) => new Intl.NumberFormat('es-CL', {
                          style: 'currency',
                          currency: 'CLP',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(value)
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Información adicional del gráfico */}
                <div className="mt-6 text-center">
                  <div className="inline-flex flex-wrap items-center justify-center gap-4 text-sm text-green-200">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                      Total del año: {formatearMoneda(datosPedidosAcumulados.reduce((sum, item) => sum + item.totalAcum, 0))}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                      Promedio mensual: {formatearMoneda(datosPedidosAcumulados.reduce((sum, item) => sum + item.totalAcum, 0) / 12)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-blue-300 rounded-full"></span>
                      Meses con pedidos: {datosPedidosAcumulados.filter(d => d.totalAcum > 0).length}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-blue-400 text-4xl mb-4">📋</div>
                <p className="text-gray-300 text-lg font-medium mb-2">No hay datos de pedidos acumulados</p>
                <p className="text-green-200 text-sm">
                  El gráfico mostrará los 12 meses con valores en 0
                </p>
              </div>
            )}
          </div>

          {/* Botón de recarga */}
          <div className="text-center mb-8">
            <button
              onClick={cargarTotalesMensuales}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-colors flex items-center mx-auto text-sm md:text-base"
            >
              <span className="mr-2">🔄</span>
              {loading ? 'Cargando...' : 'Actualizar Datos'}
            </button>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-red-500/20 backdrop-blur-sm text-red-300 px-4 py-2 rounded-full border border-red-400/30">
                <span className="text-lg">❌</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}