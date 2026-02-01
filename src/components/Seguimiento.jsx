import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { obtenerFechaHoyChile } from '../lib/dateUtils.js';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Label, ReferenceArea, PieChart, Pie, Cell } from 'recharts';
import Footer from './Footer';
import SeguimientoBloqueado from './SeguimientoBloqueado';

export default function Seguimiento() {
  const navigate = useNavigate();
  
  // Estados para los totales acumulados
  const [totales, setTotales] = useState({
    ventas: 0,
    gastos: 0,
    inventario: 0,
    proveedores: 0,
    clientes: 0,
    pedidos: 0,
    propinas: 0,
    ventasRapidas: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para bloqueo por clave interna
  const [claveInternaValidada, setClaveInternaValidada] = useState(false);
  const [tieneClaveInterna, setTieneClaveInterna] = useState(false);
  const [verificandoClave, setVerificandoClave] = useState(false);
  
  // Estados para los filtros
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1); // Mes actual (1-12)
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear()); // Año actual por defecto
  const [aniosDisponibles, setAniosDisponibles] = useState([]); // Años con datos disponibles
  


  // Estados para el gráfico de ventas diarias del mes actual
  const [datosVentasDiarias, setDatosVentasDiarias] = useState([]);
  const [loadingVentasDiarias, setLoadingVentasDiarias] = useState(false);
  const [errorVentasDiarias, setErrorVentasDiarias] = useState(null);

  // Estados para el gráfico de ventas acumuladas mensuales
  const [clienteId, setClienteId] = useState(null);
  const [datosVentasAcumuladas, setDatosVentasAcumuladas] = useState([]);
  const [loadingVentasAcumuladas, setLoadingVentasAcumuladas] = useState(false);
  const [errorVentasAcumuladas, setErrorVentasAcumuladas] = useState(null);
  const [anioGrafico, setAnioGrafico] = useState(new Date().getFullYear()); // Año actual para el gráfico
  const [aniosGraficoDisponibles, setAniosGraficoDisponibles] = useState([]); // Años disponibles para el gráfico

  // Estados para el gráfico de tipos de pago
  const [datosTiposPago, setDatosTiposPago] = useState([]);
  const [loadingTiposPago, setLoadingTiposPago] = useState(false);
  const [errorTiposPago, setErrorTiposPago] = useState(null);

  // Estados para el gráfico de tipos de pago de pedidos
  const [datosTiposPagoPedidos, setDatosTiposPagoPedidos] = useState([]);
  const [loadingTiposPagoPedidos, setLoadingTiposPagoPedidos] = useState(false);
  const [errorTiposPagoPedidos, setErrorTiposPagoPedidos] = useState(null);

  // Estados para el gráfico de pedidos diarios del mes actual
  const [datosPedidosDiarios, setDatosPedidosDiarios] = useState([]);
  const [loadingPedidosDiarios, setLoadingPedidosDiarios] = useState(false);
  const [errorPedidosDiarios, setErrorPedidosDiarios] = useState(null);

  // Estados para el gráfico de pedidos acumulados mensuales
  const [datosPedidosAcumulados, setDatosPedidosAcumulados] = useState([]);
  const [loadingPedidosAcumulados, setLoadingPedidosAcumulados] = useState(false);
  const [errorPedidosAcumulados, setErrorPedidosAcumulados] = useState(null);

  // Estados para el gráfico de ventas rápidas diarias del mes actual
  const [datosVentasRapidasDiarias, setDatosVentasRapidasDiarias] = useState([]);
  const [loadingVentasRapidasDiarias, setLoadingVentasRapidasDiarias] = useState(false);
  const [errorVentasRapidasDiarias, setErrorVentasRapidasDiarias] = useState(null);

  // Estados para el gráfico de ventas rápidas acumuladas mensuales
  const [datosVentasRapidasAcumuladas, setDatosVentasRapidasAcumuladas] = useState([]);
  const [loadingVentasRapidasAcumuladas, setLoadingVentasRapidasAcumuladas] = useState(false);
  const [errorVentasRapidasAcumuladas, setErrorVentasRapidasAcumuladas] = useState(null);

  // Estados para el gráfico de tipos de pago de ventas rápidas
  const [datosTiposPagoVentasRapidas, setDatosTiposPagoVentasRapidas] = useState([]);
  const [loadingTiposPagoVentasRapidas, setLoadingTiposPagoVentasRapidas] = useState(false);
  const [errorTiposPagoVentasRapidas, setErrorTiposPagoVentasRapidas] = useState(null);

  // Función para obtener el mes y año actual
  const obtenerMesAnioActual = () => {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1; // getMonth() devuelve 0-11
    const anio = fecha.getFullYear();
    return { mes, anio };
  };

  // Función para verificar si el usuario tiene clave interna y si está validada
  const verificarClaveInterna = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      
      if (!usuarioId) {
        setTieneClaveInterna(false);
        setClaveInternaValidada(false);
        return;
      }

      // Obtener si el usuario tiene clave interna configurada
      const { data: usuarioData, error } = await supabase
        .from('usuarios')
        .select('clave_interna')
        .eq('usuario_id', usuarioId)
        .single();

      if (error || !usuarioData || !usuarioData.clave_interna) {
        setTieneClaveInterna(false);
        setClaveInternaValidada(true); // Si no tiene clave, puede acceder libremente
        return;
      }

      // Usuario tiene clave interna configurada
      setTieneClaveInterna(true);

      // NO usar sessionStorage/localStorage
      // La validación debe pedirse SIEMPRE al entrar a Seguimiento
      // Solo el estado en memoria determina si está validada
      setClaveInternaValidada(false);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('❌ Error verificando clave interna:', e);
      }
      setTieneClaveInterna(false);
      setClaveInternaValidada(true);
    } finally {
      setVerificandoClave(false);
    }
  };

  // Función para manejar cuando la clave es validada correctamente
  const handleClaveValidada = () => {
    setClaveInternaValidada(true);
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

      // Obtener cliente_id: usar el estado si ya existe, sino consultarlo
      let clienteIdParaTotales = clienteId;
      if (!clienteIdParaTotales) {
        const { data: clienteData, error: clienteError } = await supabase
          .from('usuarios')
          .select('cliente_id')
          .eq('usuario_id', usuarioId)
          .single();

        if (clienteError || !clienteData) {
          console.error('❌ Error al obtener cliente_id:', clienteError);
          setError('Error al obtener datos del cliente');
          return;
        }
        clienteIdParaTotales = clienteData.cliente_id;
        // Guardar en estado para próximas llamadas
        setClienteId(clienteIdParaTotales);
      }

      // Ejecutar todas las consultas en paralelo usando Promise.all()
      const [
        ventasResult,
        gastosResult,
        inventarioResult,
        proveedoresResult,
        clientesResult,
        pedidosResult,
        ventasRapidasResult
      ] = await Promise.all([
        // 1. Total de Ventas del mes usando la vista ventas_mensual_acum_v2
        supabase
          .from('ventas_mensual_acum_v2')
          .select('total_mes')
          .eq('cliente_id', clienteIdParaTotales)
          .eq('anio', filtroAnio)
          .eq('mes_num', filtroMes)
          .maybeSingle(),
        
        // 2. Total de Gastos del mes
        supabase
          .from('gasto')
          .select('monto, fecha_cl')
          .gte('fecha_cl', fechaInicio)
          .lte('fecha_cl', fechaFin),
        
        // 3. Total de Inventario (costo_total) del mes
        supabase
          .from('inventario')
          .select('costo_total, fecha_ingreso')
          .eq('usuario_id', usuarioId)
          .gte('fecha_ingreso', `${fechaInicio}T00:00:00`)
          .lte('fecha_ingreso', `${fechaFin}T23:59:59`),
        
        // 4. Total de Proveedores del mes
        supabase
          .from('proveedores')
          .select('monto, fecha_cl')
          .gte('fecha_cl', fechaInicio)
          .lte('fecha_cl', fechaFin),
        
        // 5. Total de Clientes del mes (suma de totales de pedidos)
        supabase
          .from('clientes')
          .select('total_final, fecha_cl')
          .eq('usuario_id', usuarioId)
          .not('total_final', 'is', null)
          .gte('fecha_cl', fechaInicio)
          .lte('fecha_cl', fechaFin),
        
        // 6. Total de Pedidos del mes (suma de total_final de pedidos)
        supabase
          .from('pedidos')
          .select('total_final, propina, fecha_cl')
          .eq('usuario_id', usuarioId)
          .not('total_final', 'is', null)
          .gte('fecha_cl', fechaInicio)
          .lte('fecha_cl', fechaFin),
        
        // 7. Total de Ventas Rápidas del mes
        supabase
          .from('venta_rapida')
          .select('monto, fecha_cl')
          .eq('usuario_id', usuarioId)
          .gte('fecha_cl', fechaInicio)
          .lte('fecha_cl', fechaFin)
      ]);

      // Procesar resultados
      const totalVentas = ventasResult.error ? 0 : (parseFloat(ventasResult.data?.total_mes) || 0);
      
      const totalGastos = gastosResult.error ? 0 : (gastosResult.data?.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0) || 0);
      const totalInventario = inventarioResult.error ? 0 : (inventarioResult.data?.reduce((sum, item) => sum + (parseFloat(item.costo_total) || 0), 0) || 0);
      const totalProveedores = proveedoresResult.error ? 0 : (proveedoresResult.data?.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0) || 0);
      const totalClientes = clientesResult.error ? 0 : (clientesResult.data?.reduce((sum, item) => sum + (parseFloat(item.total_final) || 0), 0) || 0);
      const totalPedidos = pedidosResult.error ? 0 : (pedidosResult.data?.reduce((sum, item) => sum + (parseFloat(item.total_final) || 0), 0) || 0);
      const totalPropinas = pedidosResult.error ? 0 : (pedidosResult.data?.reduce((sum, item) => sum + (parseFloat(item.propina) || 0), 0) || 0);
      const totalVentasRapidas = ventasRapidasResult.error ? 0 : (ventasRapidasResult.data?.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0) || 0);

      // Log errores si existen (sin detener el proceso)
      if (ventasResult.error) console.error('❌ Error al cargar ventas desde vista:', ventasResult.error);
      if (gastosResult.error) console.error('❌ Error al cargar gastos:', gastosResult.error);
      if (inventarioResult.error) console.error('❌ Error al cargar inventario:', inventarioResult.error);
      if (proveedoresResult.error) console.error('❌ Error al cargar proveedores:', proveedoresResult.error);
      if (clientesResult.error) console.error('❌ Error al cargar clientes:', clientesResult.error);
      if (pedidosResult.error) console.error('❌ Error al cargar pedidos:', pedidosResult.error);
      if (ventasRapidasResult.error) console.error('❌ Error al cargar ventas rápidas:', ventasRapidasResult.error);

      setTotales({
        ventas: totalVentas,
        gastos: totalGastos,
        inventario: totalInventario,
        proveedores: totalProveedores,
        clientes: totalClientes,
        pedidos: totalPedidos,
        propinas: totalPropinas,
        ventasRapidas: totalVentasRapidas
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

  // Función para cargar datos de ventas diarias del mes actual
  const cargarVentasDiarias = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        return;
      }

      setLoadingVentasDiarias(true);
      setErrorVentasDiarias(null);
      
      // Obtener fecha actual y días del mes
      const ahora = new Date();
      const anioActual = ahora.getFullYear();
      const mesActual = ahora.getMonth() + 1;
      const diasEnMes = new Date(anioActual, mesActual, 0).getDate();
      
      // Crear array base con todos los días del mes inicializados en 0
      const diasBase = [];
      for (let dia = 1; dia <= diasEnMes; dia++) {
        diasBase.push({
          dia: dia,
          totalDia: 0,
          fecha: `${anioActual}-${String(mesActual).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        });
      }

      // Consultar la vista ventas_diarias
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas_diarias')
        .select('dia, total_dia, fecha')
        .eq('usuario_id', usuarioId)
        .order('dia', { ascending: true });

      if (ventasError) {
        console.error('[chart] Error al consultar ventas_diarias:', ventasError);
        setErrorVentasDiarias('Error al cargar datos de ventas diarias');
        return;
      }

      // Mapear los datos recibidos a los días base
      const datosMapeados = diasBase.map(diaBase => {
        const datoEncontrado = ventasData?.find(d => d.dia === diaBase.dia);
        return {
          ...diaBase,
          totalDia: datoEncontrado ? parseFloat(datoEncontrado.total_dia) || 0 : 0
        };
      });

      setDatosVentasDiarias(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar ventas diarias:', error);
      setErrorVentasDiarias('Error inesperado al cargar datos');
    } finally {
      setLoadingVentasDiarias(false);
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

      // Siempre incluir el año actual por defecto
      const anioActual = new Date().getFullYear();
      const aniosEncontrados = new Set([anioActual]);
      
      // Ejecutar todas las consultas en paralelo usando Promise.all()
      const [
        ventasResult,
        gastosResult,
        inventarioResult,
        proveedoresResult,
        clientesResult,
        pedidosResult,
        ventasRapidasResult
      ] = await Promise.all([
        // 1. Tabla ventas
        supabase
          .from('ventas')
          .select('fecha_cl')
          .eq('usuario_id', usuarioId),
        
        // 2. Tabla gasto
        supabase
          .from('gasto')
          .select('fecha_cl'),
        
        // 3. Tabla inventario
        supabase
          .from('inventario')
          .select('fecha_cl')
          .eq('usuario_id', usuarioId),
        
        // 4. Tabla proveedores
        supabase
          .from('proveedores')
          .select('fecha_cl'),
        
        // 5. Tabla clientes
        supabase
          .from('clientes')
          .select('fecha_cl')
          .eq('usuario_id', usuarioId),
        
        // 6. Tabla pedidos
        supabase
          .from('pedidos')
          .select('fecha_cl')
          .eq('usuario_id', usuarioId),
        
        // 7. Tabla venta_rapida
        supabase
          .from('venta_rapida')
          .select('fecha_cl')
          .eq('usuario_id', usuarioId)
      ]);

      // Procesar resultados y extraer años únicos
      const procesarAños = (data, error, tablaNombre) => {
        if (error) {
          console.warn(`⚠️ Error al consultar tabla ${tablaNombre} para años:`, error);
          return;
        }
        if (data) {
          data.forEach(item => {
            if (item.fecha_cl) {
              const anio = new Date(item.fecha_cl).getFullYear();
              aniosEncontrados.add(anio);
            }
          });
        }
      };

      procesarAños(ventasResult.data, ventasResult.error, 'ventas');
      procesarAños(gastosResult.data, gastosResult.error, 'gasto');
      procesarAños(inventarioResult.data, inventarioResult.error, 'inventario');
      procesarAños(proveedoresResult.data, proveedoresResult.error, 'proveedores');
      procesarAños(clientesResult.data, clientesResult.error, 'clientes');
      procesarAños(pedidosResult.data, pedidosResult.error, 'pedidos');
      procesarAños(ventasRapidasResult.data, ventasRapidasResult.error, 'venta_rapida');
      
      // Convertir a array y ordenar
      const aniosArray = Array.from(aniosEncontrados).sort((a, b) => b - a);
      
      // Si no hay años disponibles, usar al menos el año actual
      if (aniosArray.length === 0) {
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
      const aniosUnicos = [...new Set(aniosData?.map(item => item.anio) || [])];
      
      // Siempre incluir el año actual en la lista, incluso si no hay datos aún
      const anioActual = new Date().getFullYear();
      const aniosConActual = [...new Set([...aniosUnicos, anioActual])].sort((a, b) => b - a);
      
      setAniosGraficoDisponibles(aniosConActual);

      // Solo cambiar el año seleccionado si el año actual NO está en la lista Y el año actual del gráfico no está en la lista
      // Pero como siempre incluimos el año actual, esto solo se ejecutará si anioGrafico no es el año actual
      if (!aniosConActual.includes(anioGrafico)) {
        // Si el año actual no está seleccionado, usar el año actual (que siempre está en la lista ahora)
        setAnioGrafico(anioActual);
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

  // Función para cargar datos de pedidos diarios del mes actual
  const cargarPedidosDiarios = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        return;
      }

      setLoadingPedidosDiarios(true);
      setErrorPedidosDiarios(null);
      
      // 🔧 FIX: Obtener el mes y año actual de Chile
      const fechaChile = obtenerFechaHoyChile();
      const [anioActual, mesActual, diaActual] = fechaChile.split('-').map(Number);
      
      // Calcular rango de fechas para el mes actual en Chile
      const primerDiaMes = `${anioActual}-${String(mesActual).padStart(2, '0')}-01`;
      const ultimoDiaMes = new Date(anioActual, mesActual, 0).getDate();
      const ultimaFechaMes = `${anioActual}-${String(mesActual).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;
      
      console.log(`📅 Consultando pedidos del ${primerDiaMes} al ${ultimaFechaMes}`);
      
      // 🔧 NUEVO: Consultar directamente la tabla pedidos en lugar de la vista defectuosa
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select('fecha_cl, total_final')
        .eq('usuario_id', usuarioId)
        .not('total_final', 'is', null)
        .gte('fecha_cl', primerDiaMes)
        .lte('fecha_cl', ultimaFechaMes)
        .or('estado.is.null,estado.neq.anulado');

      if (pedidosError) {
        console.error('[chart] Error al consultar pedidos:', pedidosError);
        setErrorPedidosDiarios('Error al cargar datos de pedidos diarios');
        return;
      }

      console.log(`📊 Pedidos encontrados en ${mesActual}/${anioActual}:`, pedidosData?.length || 0, 'pedidos');
      
      // Agrupar por día y sumar totales
      const pedidosPorDia = {};
      
      // Inicializar todos los días del mes con $0
      for (let dia = 1; dia <= ultimoDiaMes; dia++) {
        pedidosPorDia[dia] = 0;
      }
      
      // Sumar los pedidos por día
      pedidosData?.forEach(pedido => {
        if (pedido.fecha_cl) {
          const dia = parseInt(pedido.fecha_cl.split('-')[2]);
          pedidosPorDia[dia] = (pedidosPorDia[dia] || 0) + (parseFloat(pedido.total_final) || 0);
        }
      });
      
      // Convertir a array para el gráfico
      const datosMapeados = Object.keys(pedidosPorDia).map(dia => ({
        dia: parseInt(dia),
        totalDia: pedidosPorDia[dia],
        fecha: `${anioActual}-${String(mesActual).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      }));
      
      console.log(`✅ Datos procesados: ${datosMapeados.length} días, Total: $${datosMapeados.reduce((sum, d) => sum + d.totalDia, 0).toLocaleString()}`);

      setDatosPedidosDiarios(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar pedidos diarios:', error);
      setErrorPedidosDiarios('Error inesperado al cargar datos');
    } finally {
      setLoadingPedidosDiarios(false);
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

  // Función para cargar datos de ventas rápidas diarias del mes actual
  const cargarVentasRapidasDiarias = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        return;
      }

      setLoadingVentasRapidasDiarias(true);
      setErrorVentasRapidasDiarias(null);
      
      // Obtener fecha actual y días del mes
      const ahora = new Date();
      const anioActual = ahora.getFullYear();
      const mesActual = ahora.getMonth() + 1;
      const diasEnMes = new Date(anioActual, mesActual, 0).getDate();
      
      // Crear array base con todos los días del mes inicializados en 0
      const diasBase = [];
      for (let dia = 1; dia <= diasEnMes; dia++) {
        diasBase.push({
          dia: dia,
          totalDia: 0,
          fecha: `${anioActual}-${String(mesActual).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        });
      }

      // Consultar la vista venta_rapida_diarias
      const { data: ventasRapidasData, error: ventasRapidasError } = await supabase
        .from('venta_rapida_diarias')
        .select('dia, total_dia, fecha')
        .eq('usuario_id', usuarioId)
        .order('dia', { ascending: true });

      if (ventasRapidasError) {
        console.error('[chart] Error al consultar venta_rapida_diarias:', ventasRapidasError);
        setErrorVentasRapidasDiarias('Error al cargar datos de ventas rápidas diarias');
        return;
      }

      // Mapear los datos recibidos a los días base
      const datosMapeados = diasBase.map(diaBase => {
        const datoEncontrado = ventasRapidasData?.find(d => d.dia === diaBase.dia);
        return {
          ...diaBase,
          totalDia: datoEncontrado ? parseFloat(datoEncontrado.total_dia) || 0 : 0
        };
      });

      setDatosVentasRapidasDiarias(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar ventas rápidas diarias:', error);
      setErrorVentasRapidasDiarias('Error inesperado al cargar datos');
    } finally {
      setLoadingVentasRapidasDiarias(false);
    }
  };

  // Función para cargar datos de ventas rápidas acumuladas mensuales
  const cargarVentasRapidasAcumuladas = async () => {
    try {
      if (!clienteId) {
        return;
      }

      setLoadingVentasRapidasAcumuladas(true);
      setErrorVentasRapidasAcumuladas(null);
      
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

      // Consultar la vista venta_rapida_mensual_acum_v2
      const { data: ventasRapidasData, error: ventasRapidasError } = await supabase
        .from('venta_rapida_mensual_acum_v2')
        .select('mes_num, total_acumulado, total_mes')
        .eq('cliente_id', clienteId)
        .eq('anio', anioGrafico)
        .order('mes_num', { ascending: true });

      if (ventasRapidasError) {
        console.error('[chart] Error al consultar venta_rapida_mensual_acum_v2:', ventasRapidasError);
        setErrorVentasRapidasAcumuladas('Error al cargar datos de ventas rápidas');
        return;
      }

      // Mapear los datos recibidos a los meses base
      const datosMapeados = mesesBase.map(mesBase => {
        const datoEncontrado = ventasRapidasData?.find(d => d.mes_num === mesBase.mes_num);
        return {
          ...mesBase,
          totalAcum: datoEncontrado ? parseFloat(datoEncontrado.total_acumulado) || 0 : 0,
          totalMes: datoEncontrado ? parseFloat(datoEncontrado.total_mes) || 0 : 0
        };
      });

      setDatosVentasRapidasAcumuladas(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar ventas rápidas acumuladas:', error);
      setErrorVentasRapidasAcumuladas('Error inesperado al cargar datos');
    } finally {
      setLoadingVentasRapidasAcumuladas(false);
    }
  };

  // Función para cargar datos de tipos de pago de ventas rápidas mensuales
  const cargarTiposPagoVentasRapidas = async () => {
    try {
      if (!clienteId) return;

      setLoadingTiposPagoVentasRapidas(true);
      setErrorTiposPagoVentasRapidas(null);

      // Consultar la vista venta_rapida_tipo_pago_mensual
      const { data: tiposPagoVentasRapidasData, error: tiposPagoVentasRapidasError } = await supabase
        .from('venta_rapida_tipo_pago_mensual')
        .select('tipo_pago, cantidad, porcentaje_mes')
        .eq('cliente_id', clienteId)
        .eq('anio', filtroAnio) // Usar filtroAnio para ser consistente con el selector
        .eq('mes_num', filtroMes)
        .order('cantidad', { ascending: false });

      if (tiposPagoVentasRapidasError) {
        console.error('[chart] Error al consultar venta_rapida_tipo_pago_mensual:', tiposPagoVentasRapidasError);
        setErrorTiposPagoVentasRapidas('Error al cargar datos de tipos de pago de ventas rápidas');
        return;
      }

      // Mapear los datos para el gráfico circular
      const datosMapeados = tiposPagoVentasRapidasData?.map(item => ({
        name: item.tipo_pago.charAt(0).toUpperCase() + item.tipo_pago.slice(1),
        value: parseInt(item.cantidad),
        porcentaje: parseFloat(item.porcentaje_mes) * 100, // Convertir decimal a porcentaje
        tipo: item.tipo_pago
      })) || [];

      setDatosTiposPagoVentasRapidas(datosMapeados);

    } catch (error) {
      console.error('[chart] Error inesperado al cargar tipos de pago de ventas rápidas:', error);
      setErrorTiposPagoVentasRapidas('Error inesperado al cargar datos');
    } finally {
      setLoadingTiposPagoVentasRapidas(false);
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
        await cargarVentasDiarias(); // Cargar ventas diarias del mes actual
        await cargarPedidosDiarios(); // Cargar pedidos diarios del mes actual
        await cargarVentasAcumuladas();
      }
    };
    inicializarVentasAcumuladas();
    
    // Verificar clave interna al montar
    setVerificandoClave(true);
    verificarClaveInterna();
  }, []); // Array vacío = solo se ejecuta una vez al montar

  // Cargar totales cuando cambien los filtros (SOLO LAS TARJETAS)
  useEffect(() => {
    cargarTotalesMensuales(); // Solo recargar totales de las tarjetas
    // NO recargar el gráfico - debe mantenerse independiente
  }, [filtroMes, filtroAnio]);

  // Cargar ventas acumuladas cuando se obtenga el cliente_id
  useEffect(() => {
    if (clienteId) {
      cargarVentasDiarias(); // Cargar ventas diarias del mes actual
      cargarPedidosDiarios(); // Cargar pedidos diarios del mes actual
      cargarVentasAcumuladas();
      cargarPedidosAcumulados(); // Cargar pedidos acumulados también
      cargarVentasRapidasDiarias(); // Cargar ventas rápidas diarias del mes actual
      cargarVentasRapidasAcumuladas(); // Cargar ventas rápidas acumuladas también
      cargarAniosGraficoDisponibles(); // Cargar años disponibles para el gráfico
    }
  }, [clienteId]);

  // Cargar ventas acumuladas cuando cambie el año del gráfico
  useEffect(() => {
    if (clienteId) {
      cargarVentasAcumuladas();
      cargarPedidosAcumulados(); // Cargar pedidos acumulados también
      cargarVentasRapidasDiarias(); // Cargar ventas rápidas diarias del mes actual
      cargarVentasRapidasAcumuladas(); // Cargar ventas rápidas acumuladas también
    }
  }, [anioGrafico, clienteId]);

  // Cargar tipos de pago cuando cambie el cliente_id, año del gráfico o mes del filtro
  useEffect(() => {
    if (clienteId) {
      cargarTiposPago();
      cargarTiposPagoPedidos();
      cargarTiposPagoVentasRapidas();
    }
  }, [clienteId, anioGrafico, filtroMes, filtroAnio]); // Agregar filtroAnio para el gráfico de ventas rápidas

  // Colores para los tipos de pago en el gráfico circular
  const coloresTiposPago = {
    'debito': '#3b82f6',      // Azul
    'credito': '#ef4444',     // Rojo
    'efectivo': '#10b981',    // Verde
    'transferencia': '#f59e0b' // Amarillo
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#1a3d1a' }}>
      {/* Bloqueo por clave interna - mostrar solo si tiene clave y no está validada */}
      {tieneClaveInterna && !claveInternaValidada && !verificandoClave && (
        <SeguimientoBloqueado onClaveValidada={handleClaveValidada} />
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
            Sistema de Seguimiento
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

          {/* 8 Tarjetas tipo Power BI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
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

            {/* Tarjeta 7: Propinas */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl">💡</span>
                </div>
                <h3 className="text-green-200 text-sm md:text-base font-medium mb-2">Total Propinas</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 md:h-8 bg-green-400/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <div className="text-green-300 text-lg md:text-xl font-bold mb-1">
                    {formatearMoneda(totales.propinas)}
                  </div>
                )}
                <p className="text-green-200 text-xs opacity-75">Mes actual</p>
              </div>
            </div>

            {/* Tarjeta 8: Ventas Rápidas */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl">⚡</span>
                </div>
                <h3 className="text-green-200 text-sm md:text-base font-medium mb-2">Total Ventas Rápidas</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 md:h-8 bg-green-400/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <div className="text-green-300 text-lg md:text-xl font-bold mb-1">
                    {formatearMoneda(totales.ventasRapidas)}
                  </div>
                )}
                <p className="text-green-200 text-xs opacity-75">Mes actual</p>
              </div>
            </div>

          </div>

          {/* Estadísticas de Ventas */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Estadísticas de Ventas
            </h2>
            <p className="text-green-200 text-center text-sm md:text-base">
              Análisis detallado del rendimiento de ventas
            </p>
          </div>

          {/* Gráfico de Ventas Diarias del Mes Actual */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                Ventas Diarias - {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-green-200 text-sm md:text-base">
                Total de ventas por día del mes actual
              </p>
            </div>

            {loadingVentasDiarias ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                <span className="ml-3 text-green-200">Cargando...</span>
              </div>
            ) : errorVentasDiarias ? (
              <div className="text-center py-8">
                <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-red-300 text-sm">{errorVentasDiarias}</p>
                </div>
              </div>
            ) : datosVentasDiarias.length > 0 ? (
              <div className="h-64 md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={datosVentasDiarias}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="dia" 
                      stroke="#ffffff"
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      label={{ 
                        value: 'Día del Mes', 
                        position: 'insideBottom', 
                        offset: -10, 
                        fill: '#ffffff',
                        style: { fontSize: '14px' }
                      }}
                    />
                    <YAxis 
                      stroke="#ffffff"
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString('es-CL')}`}
                      label={{ 
                        value: 'Total Ventas ($)', 
                        angle: -90, 
                        position: 'insideLeft',
                        fill: '#ffffff',
                        style: { fontSize: '14px' }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(26, 61, 26, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                      formatter={(value) => [`$${parseFloat(value).toLocaleString('es-CL')}`, 'Total']}
                      labelFormatter={(label) => `Día ${label}`}
                    />
                    <Bar 
                      dataKey="totalDia" 
                      fill="#22c55e"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-300 text-lg">No hay datos de ventas para este mes</p>
              </div>
            )}
          </div>

          {/* Gráficos de Ventas - Separados pero en la misma línea */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Gráfico de Ventas Mensuales */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <div className="text-center mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-white">
                    Ventas Mensuales
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
                  Total generado mensualmente por el cliente
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
                                  <strong>Total del Mes:</strong><br />
                                {new Intl.NumberFormat('es-CL', {
                                  style: 'currency',
                                  currency: 'CLP',
                                  minimumFractionDigits: 0
                                }).format(value)}
                              </div>
                              <div>
                                  <strong>Total Acumulado:</strong><br />
                                {new Intl.NumberFormat('es-CL', {
                                  style: 'currency',
                                  currency: 'CLP',
                                  minimumFractionDigits: 0
                                  }).format(mesData?.totalAcum || 0)}
                              </div>
                            </div>
                          ];
                        }}
                       
                     />
                                           <Line
                        type="monotone"
                          dataKey="totalMes"
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
                        Total del año: {formatearMoneda(datosVentasAcumuladas.reduce((sum, item) => sum + item.totalMes, 0))}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                        Promedio mensual: {formatearMoneda(datosVentasAcumuladas.reduce((sum, item) => sum + item.totalMes, 0) / 12)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-300 rounded-full"></span>
                        Promedio diario: {formatearMoneda((datosVentasAcumuladas.find(item => item.mes_num === filtroMes)?.totalMes || 0) / 30)}
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

            {/* Gráfico Circular de Tipos de Pago de Ventas */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Ventas por Tipo de Pago
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <h3 className="text-lg md:text-xl font-medium text-green-200">
                    Distribución Mensual
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
                        label={false}
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
            </div>

          {/* Estadísticas de Pedidos */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Estadísticas de Pedidos
            </h2>
            <p className="text-green-200 text-center text-sm md:text-base">
              Análisis detallado del rendimiento de pedidos
            </p>
          </div>

          {/* Gráfico de Pedidos Diarios del Mes Actual */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                Pedidos Diarios - {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-blue-200 text-sm md:text-base">
                Total de pedidos por día del mes actual
              </p>
            </div>

            {loadingPedidosDiarios ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                <span className="ml-3 text-blue-200">Cargando...</span>
              </div>
            ) : errorPedidosDiarios ? (
              <div className="text-center py-8">
                <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-red-300 text-sm">{errorPedidosDiarios}</p>
                </div>
              </div>
            ) : datosPedidosDiarios.length > 0 ? (
              <div className="h-64 md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={datosPedidosDiarios}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="dia" 
                      stroke="#ffffff"
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      label={{ 
                        value: 'Día del Mes', 
                        position: 'insideBottom', 
                        offset: -10, 
                        fill: '#ffffff',
                        style: { fontSize: '14px' }
                      }}
                    />
                    <YAxis 
                      stroke="#ffffff"
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString('es-CL')}`}
                      label={{ 
                        value: 'Total Pedidos ($)', 
                        angle: -90, 
                        position: 'insideLeft',
                        fill: '#ffffff',
                        style: { fontSize: '14px' }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(26, 61, 26, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                      formatter={(value) => [`$${parseFloat(value).toLocaleString('es-CL')}`, 'Total']}
                      labelFormatter={(label) => `Día ${label}`}
                    />
                    <Bar 
                      dataKey="totalDia" 
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-300 text-lg">No hay datos de pedidos para este mes</p>
              </div>
            )}
          </div>

          {/* Gráficos de Pedidos - Separados pero en la misma línea */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Gráfico de Pedidos Mensuales */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <div className="text-center mb-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                  <h3 className="text-xl md:text-2xl font-bold text-white">
                    Pedidos Mensuales
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
                  Total generado mensualmente en pedidos pagados
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
                                <strong>Total del Mes:</strong><br />
                                {new Intl.NumberFormat('es-CL', {
                                  style: 'currency',
                                  currency: 'CLP',
                                  minimumFractionDigits: 0
                                }).format(value)}
                              </div>
                              <div>
                                <strong>Total Acumulado:</strong><br />
                                {new Intl.NumberFormat('es-CL', {
                                  style: 'currency',
                                  currency: 'CLP',
                                  minimumFractionDigits: 0
                                }).format(mesData?.totalAcum || 0)}
                              </div>
                            </div>
                          ];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalMes"
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
                      Total del año: {formatearMoneda(datosPedidosAcumulados.reduce((sum, item) => sum + item.totalMes, 0))}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                      Promedio mensual: {formatearMoneda(datosPedidosAcumulados.reduce((sum, item) => sum + item.totalMes, 0) / 12)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-blue-300 rounded-full"></span>
                      Promedio diario: {formatearMoneda((datosPedidosAcumulados.find(item => item.mes_num === filtroMes)?.totalMes || 0) / 30)}
                    </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-blue-400 text-4xl mb-4">📋</div>
                  <p className="text-gray-300 text-lg font-medium mb-2">No hay datos de pedidos mensuales</p>
                  <p className="text-green-200 text-sm">
                    El gráfico mostrará los 12 meses con valores en 0
                  </p>
                </div>
              )}
            </div>

            {/* Gráfico Circular de Tipos de Pago de Pedidos */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Pedidos por Tipo de Pago
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                  <h3 className="text-lg md:text-xl font-medium text-green-200">
                    Distribución Mensual
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
                          label={false}
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


          {/* Estadísticas de Ventas Rápidas */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Estadísticas de Ventas Rápidas
            </h2>
            <p className="text-green-200 text-center text-sm md:text-base">
              Análisis detallado del rendimiento de ventas rápidas
            </p>
          </div>

          {/* Gráfico de Ventas Rápidas Diarias del Mes Actual */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                ⚡ Ventas Rápidas Diarias - {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-green-200 text-sm md:text-base">
                Total de ventas rápidas por día del mes actual
              </p>
            </div>

            {loadingVentasRapidasDiarias ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                <span className="ml-3 text-green-200">Cargando...</span>
              </div>
            ) : errorVentasRapidasDiarias ? (
              <div className="text-center py-8">
                <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-red-300 text-sm">{errorVentasRapidasDiarias}</p>
                </div>
              </div>
            ) : datosVentasRapidasDiarias.length > 0 ? (
              <div className="h-64 md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={datosVentasRapidasDiarias}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="dia" 
                      stroke="#ffffff"
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      label={{ 
                        value: 'Día del Mes', 
                        position: 'insideBottom', 
                        offset: -10, 
                        fill: '#ffffff',
                        style: { fontSize: '14px' }
                      }}
                    />
                    <YAxis 
                      stroke="#ffffff"
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString('es-CL')}`}
                      label={{ 
                        value: 'Total Ventas Rápidas ($)', 
                        angle: -90, 
                        position: 'insideLeft',
                        fill: '#ffffff',
                        style: { fontSize: '14px' }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(26, 61, 26, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                      formatter={(value) => [`$${parseFloat(value).toLocaleString('es-CL')}`, 'Total']}
                      labelFormatter={(label) => `Día ${label}`}
                    />
                    <Bar 
                      dataKey="totalDia" 
                      fill="#f59e0b"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚡</div>
                <p className="text-gray-300 text-lg">No hay datos de ventas rápidas para este mes</p>
              </div>
            )}
          </div>

          {/* Gráficos de Ventas Rápidas - Separados pero en la misma línea */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Gráfico de Ventas Rápidas Mensuales */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <div className="text-center mb-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                  <h3 className="text-xl md:text-2xl font-bold text-white">
                    Ventas Rápidas Mensuales
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
                  Total generado mensualmente en ventas rápidas
                </p>
              </div>

              {loadingVentasRapidasAcumuladas ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                  <span className="ml-3 text-green-200">Cargando...</span>
                </div>
              ) : errorVentasRapidasAcumuladas ? (
                <div className="text-center py-8">
                  <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-red-300 text-sm">{errorVentasRapidasAcumuladas}</p>
                  </div>
                </div>
              ) : datosVentasRapidasAcumuladas.length > 0 ? (
                <div className="h-64 md:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={datosVentasRapidasAcumuladas}
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      aria-label="Gráfico de ventas rápidas acumuladas"
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
                          const mesData = datosVentasRapidasAcumuladas.find(d => d.mes_num === mesActual);
                          
                          return [
                            <div key="tooltip-content">
                              <div style={{ marginBottom: '8px' }}>
                                <strong>Total del Mes:</strong><br />
                                {new Intl.NumberFormat('es-CL', {
                                  style: 'currency',
                                  currency: 'CLP',
                                  minimumFractionDigits: 0
                                }).format(value)}
                              </div>
                              <div>
                                <strong>Total Acumulado:</strong><br />
                                {new Intl.NumberFormat('es-CL', {
                                  style: 'currency',
                                  currency: 'CLP',
                                  minimumFractionDigits: 0
                                }).format(mesData?.totalAcum || 0)}
                              </div>
                            </div>
                          ];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalMes"
                        stroke="transparent"
                        strokeWidth={0}
                        dot={{
                          fill: '#f59e0b',
                          stroke: 'white',
                          strokeWidth: 2,
                          r: 8
                        }}
                        activeDot={{
                          fill: '#f59e0b',
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
                        <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                        Total del año: {formatearMoneda(datosVentasRapidasAcumuladas.reduce((sum, item) => sum + item.totalMes, 0))}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                        Promedio mensual: {formatearMoneda(datosVentasRapidasAcumuladas.reduce((sum, item) => sum + item.totalMes, 0) / 12)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-yellow-300 rounded-full"></span>
                        Promedio diario: {formatearMoneda((datosVentasRapidasAcumuladas.find(item => item.mes_num === filtroMes)?.totalMes || 0) / 30)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-4xl mb-4">⚡</div>
                  <p className="text-gray-300 text-lg font-medium mb-2">No hay datos de ventas rápidas mensuales</p>
                  <p className="text-green-200 text-sm">
                    El gráfico mostrará los 12 meses con valores en 0
                  </p>
                </div>
              )}
            </div>

            {/* Gráfico Circular de Tipos de Pago de Ventas Rápidas */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
              <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Ventas Rápidas por Tipo de Pago
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                  <h3 className="text-lg md:text-xl font-medium text-green-200">
                    Distribución Mensual
                  </h3>
                  {/* Filtros para el gráfico circular de ventas rápidas */}
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

              {loadingTiposPagoVentasRapidas ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                  <span className="ml-3 text-green-200">Cargando...</span>
                </div>
              ) : errorTiposPagoVentasRapidas ? (
                <div className="text-center py-8">
                  <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-red-300 text-sm">{errorTiposPagoVentasRapidas}</p>
                  </div>
                </div>
              ) : datosTiposPagoVentasRapidas.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Gráfico Circular */}
                  <div className="h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={datosTiposPagoVentasRapidas}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {datosTiposPagoVentasRapidas.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={coloresTiposPago[entry.tipo] || '#8884d8'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => [
                            `${value} ventas rápidas`,
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
                        {datosTiposPagoVentasRapidas.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: coloresTiposPago[item.tipo] || '#8884d8' }}
                              ></div>
                              <span className="text-white font-medium">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-green-300 font-bold">{item.value} ventas rápidas</div>
                              <div className="text-green-200 text-sm">{item.porcentaje.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Total de ventas rápidas del mes */}
                      <div className="mt-6 p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                        <div className="text-center">
                          <div className="text-green-200 text-sm font-medium">Total de Ventas Rápidas del Mes</div>
                          <div className="text-green-300 text-2xl font-bold">
                            {datosTiposPagoVentasRapidas.reduce((sum, item) => sum + item.value, 0)} ventas rápidas
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-4xl mb-4">⚡</div>
                  <p className="text-gray-300 text-lg font-medium mb-2">No hay datos de tipos de pago de ventas rápidas</p>
                  <p className="text-green-200 text-sm">
                    No se encontraron ventas rápidas para el mes seleccionado
                  </p>
                </div>
              )}
            </div>
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