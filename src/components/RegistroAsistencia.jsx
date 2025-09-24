import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { useSessionData } from '../lib/useSessionData.js';
import { sessionManager } from '../lib/sessionManager.js';
import { 
  obtenerFechaHoyChile, 
  obtenerHoraActualChile,
  formatearFechaChile,
  formatearFechaCortaChile
} from '../lib/dateUtils.js';
import Footer from './Footer';

export default function RegistroAsistencia() {
  // ⚠️ IMPORTANTE: Este componente NO ejecuta escritura automática en localStorage
  // Solo se escriben datos cuando el usuario hace clic explícitamente en "Registrar Entrada"
  // Las funciones de lectura (obtenerEntradasPendientes, obtenerUltimaEntradaHoy, etc.)
  // solo leen datos existentes, no crean nuevos registros
  // 
  // ✅ OPTIMIZACIONES IMPLEMENTADAS:
  // - useMemo para estadisticas: evita recálculos innecesarios
  // - useMemo para ultimaEntradaHoy: evita llamadas a localStorage en cada render
  // - useMemo para entradasPendientesVisual: listado visual de entradas pendientes
  // - Validaciones robustas: todas las funciones validan parámetros antes de operar
  // - Validación de empleado: requiere al menos 2 caracteres para activar funciones de localStorage
  
  const navigate = useNavigate();
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaActual, setFechaActual] = useState('');
  const [horaActual, setHoraActual] = useState('');
  const [empleado, setEmpleado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [anosDisponibles, setAnosDisponibles] = useState(['2025']);
  const [asistenciasFiltradas, setAsistenciasFiltradas] = useState([]);
  const [localStorageVersion, setLocalStorageVersion] = useState(0); // Forzar re-render cuando localStorage cambie
  const [empleadosActivos, setEmpleadosActivos] = useState(() => {
    // Recuperar empleados activos desde localStorage al inicializar
    const empleadosGuardados = localStorage.getItem('empleadosActivos');
    return empleadosGuardados ? JSON.parse(empleadosGuardados) : [];
  }); // Controla cuándo mostrar entradas de múltiples empleados
  const [empleadoActivo, setEmpleadoActivo] = useState(() => {
    // Mantener compatibilidad con sistema anterior
    const empleadoGuardado = localStorage.getItem('empleadoActivo');
    return empleadoGuardado || '';
  }); // Para compatibilidad con sistema anterior

  // Función para actualizar empleado activo y persistirlo en localStorage
  const actualizarEmpleadoActivo = (nuevoEmpleado) => {
    setEmpleadoActivo(nuevoEmpleado);
    if (nuevoEmpleado) {
      localStorage.setItem('empleadoActivo', nuevoEmpleado);
    } else {
      localStorage.removeItem('empleadoActivo');
    }
  };

  // Función para agregar empleado activo a la lista de múltiples empleados
  const agregarEmpleadoActivo = (nuevoEmpleado) => {
    if (!nuevoEmpleado || nuevoEmpleado.trim().length < 2) return;
    
    const empleadoNormalizado = nuevoEmpleado.trim();
    setEmpleadosActivos(prev => {
      // Evitar duplicados (case-insensitive)
      const existe = prev.some(emp => emp.toLowerCase() === empleadoNormalizado.toLowerCase());
      if (existe) return prev;
      
      const nuevosEmpleados = [...prev, empleadoNormalizado];
      localStorage.setItem('empleadosActivos', JSON.stringify(nuevosEmpleados));
      return nuevosEmpleados;
    });
  };

  // Función para remover empleado de la lista de empleados activos
  const removerEmpleadoActivo = (empleadoARemover) => {
    setEmpleadosActivos(prev => {
      const nuevosEmpleados = prev.filter(emp => emp !== empleadoARemover);
      localStorage.setItem('empleadosActivos', JSON.stringify(nuevosEmpleados));
      return nuevosEmpleados;
    });
  };

  // Función para limpiar todos los empleados activos
  const limpiarTodosEmpleadosActivos = () => {
    setEmpleadosActivos([]);
    localStorage.removeItem('empleadosActivos');
  };

  // Función para obtener la fecha actual en Chile (usando dateUtils)
  const obtenerFechaActual = () => {
    return obtenerFechaHoyChile();
  };

  // Función para obtener la hora actual en Santiago, Chile (formato 24hrs)
  const obtenerHoraActual = () => {
    return new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Forzar formato 24 horas
      timeZone: 'America/Santiago'
    });
  };

  // Función para obtener la hora actual en formato HH:MM para registros
  const obtenerHoraActualFormato = () => {
    const fecha = new Date();
    // Convertir a hora de Santiago, Chile
    const horaSantiago = fecha.toLocaleString('en-US', {
      timeZone: 'America/Santiago',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    return horaSantiago;
  };

  // Actualizar fecha y hora cada segundo
  useEffect(() => {
    const actualizarTiempo = () => {
      setFechaActual(obtenerFechaActual());
      setHoraActual(obtenerHoraActual());
    };

    actualizarTiempo();
    const intervalId = setInterval(actualizarTiempo, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Efecto para hacer backup automático cada 5 minutos
  useEffect(() => {
    const hacerBackupAutomatico = () => {
      try {
        // Verificar qué empleados realmente tienen entradas pendientes
        const empleadosConEntradasReales = [];
        
        empleadosActivos.forEach(empleado => {
          let tieneEntradasPendientes = false;
          
          for (let i = 0; i < localStorage.length; i++) {
            const clave = localStorage.key(i);
            if (clave && clave.startsWith(`asistencia_${empleado}_`)) {
              const partes = clave.split('_');
              if (partes.length >= 3) {
                const fechaEnClave = partes[partes.length - 1];
                const entradasPendientes = obtenerEntradasPendientes(empleado, fechaEnClave);
                if (entradasPendientes && entradasPendientes.length > 0) {
                  tieneEntradasPendientes = true;
                  break;
                }
              }
            }
          }
          
          if (tieneEntradasPendientes) {
            empleadosConEntradasReales.push(empleado);
          }
        });
        
        // Solo hacer backup si hay empleados con entradas pendientes reales
        if (empleadosConEntradasReales.length > 0) {
          const backup = {
            fecha: fechaActual,
            timestamp: new Date().toISOString(),
            empleadosActivos: empleadosConEntradasReales,
            datosLocalStorage: {}
          };
          
          // Recopilar datos críticos solo de empleados con entradas pendientes
          for (let i = 0; i < localStorage.length; i++) {
            const clave = localStorage.key(i);
            if (clave && clave.startsWith('asistencia_')) {
              const partes = clave.split('_');
              if (partes.length >= 3) {
                const empleado = partes.slice(1, -1).join('_');
                if (empleadosConEntradasReales.includes(empleado)) {
                  const valor = localStorage.getItem(clave);
                  backup.datosLocalStorage[clave] = valor;
                }
              }
            }
          }
          
          // Guardar backup en localStorage con timestamp
          const backupKey = `backup_automatico_${fechaActual}`;
          localStorage.setItem(backupKey, JSON.stringify(backup));
          
          console.log('💾 Backup automático realizado:', backupKey, 'Empleados:', empleadosConEntradasReales);
        } else {
          console.log('ℹ️ No hay empleados con entradas pendientes para backup automático');
        }
      } catch (error) {
        console.error('❌ Error en backup automático:', error);
      }
    };

    // Hacer backup inmediatamente
    hacerBackupAutomatico();
    
    // Hacer backup cada 5 minutos
    const intervalId = setInterval(hacerBackupAutomatico, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [empleadosActivos, fechaActual]);

  // Función para limpiar backups obsoletos
  const limpiarBackupsObsoletos = useCallback(() => {
    try {
      // Limpiar backups de fechas anteriores
      const fechaActual = obtenerFechaActual();
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && clave.startsWith('backup_automatico_') && !clave.includes(fechaActual)) {
          localStorage.removeItem(clave);
          console.log('🗑️ Backup obsoleto eliminado:', clave);
        }
      }
    } catch (error) {
      console.error('❌ Error al limpiar backups obsoletos:', error);
    }
  }, []);

  // Función para recuperar empleados activos desde localStorage al inicializar
  const recuperarEmpleadosActivos = useCallback(() => {
    if (!fechaActual) return;
    
    try {
      // Limpiar backups obsoletos primero
      limpiarBackupsObsoletos();
      
      // Primero intentar recuperar desde backup automático
      const backupKey = `backup_automatico_${fechaActual}`;
      const backupData = localStorage.getItem(backupKey);
      
      if (backupData) {
        try {
          const backup = JSON.parse(backupData);
          if (backup.empleadosActivos && backup.empleadosActivos.length > 0) {
            // Verificar que los empleados del backup realmente tengan entradas pendientes
            const empleadosValidos = [];
            
            backup.empleadosActivos.forEach(empleado => {
              let tieneEntradasPendientes = false;
              
              for (let i = 0; i < localStorage.length; i++) {
                const clave = localStorage.key(i);
                if (clave && clave.startsWith(`asistencia_${empleado}_`)) {
                  const partes = clave.split('_');
                  if (partes.length >= 3) {
                    const fechaEnClave = partes[partes.length - 1];
                    const entradasPendientes = obtenerEntradasPendientes(empleado, fechaEnClave);
                    if (entradasPendientes && entradasPendientes.length > 0) {
                      tieneEntradasPendientes = true;
                      break;
                    }
                  }
                }
              }
              
              if (tieneEntradasPendientes) {
                empleadosValidos.push(empleado);
              }
            });
            
            if (empleadosValidos.length > 0) {
              setEmpleadosActivos(empleadosValidos);
              localStorage.setItem('empleadosActivos', JSON.stringify(empleadosValidos));
              console.log('✅ Empleados activos recuperados desde backup automático:', empleadosValidos);
              return;
            } else {
              console.log('ℹ️ Backup automático contiene empleados sin entradas pendientes, buscando directamente...');
            }
          }
        } catch (error) {
          console.warn('⚠️ Error al parsear backup automático:', error);
        }
      }
      
      // Si no hay backup válido, buscar directamente en localStorage
      const empleadosConDatos = [];
      
      // Buscar en todas las claves de localStorage que empiecen con 'asistencia_'
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && clave.startsWith('asistencia_')) {
          // Extraer el nombre del empleado y la fecha de la clave
          const partes = clave.split('_');
          if (partes.length >= 3) {
            const empleado = partes.slice(1, -1).join('_'); // Manejar nombres con guiones bajos
            const fechaEnClave = partes[partes.length - 1]; // Última parte es la fecha
            
            if (empleado && empleado.trim().length >= 2) {
              // Verificar si tiene entradas pendientes para esta fecha específica
              const entradasPendientes = obtenerEntradasPendientes(empleado, fechaEnClave);
              if (entradasPendientes && entradasPendientes.length > 0) {
                // Solo agregar si es para la fecha actual o si no hay fecha actual definida
                if (!fechaActual || fechaEnClave === fechaActual) {
                  empleadosConDatos.push(empleado);
                  console.log(`✅ Empleado encontrado con entradas pendientes: ${empleado} (fecha: ${fechaEnClave})`);
                }
              }
            }
          }
        }
      }
      
      // Actualizar la lista de empleados activos si encontramos datos
      if (empleadosConDatos.length > 0) {
        setEmpleadosActivos(empleadosConDatos);
        localStorage.setItem('empleadosActivos', JSON.stringify(empleadosConDatos));
        console.log('✅ Empleados activos recuperados desde localStorage:', empleadosConDatos);
      } else {
        console.log('ℹ️ No se encontraron empleados activos para recuperar');
      }
    } catch (error) {
      console.error('❌ Error al recuperar empleados activos:', error);
    }
  }, [fechaActual, limpiarBackupsObsoletos]);

  // Verificar si los empleados activos tienen entradas pendientes al cargar el componente
  useEffect(() => {
    // Solo ejecutar si ya tenemos fecha actual
    if (fechaActual) {
      // Primero intentar recuperar empleados desde localStorage
      recuperarEmpleadosActivos();
    }
  }, [fechaActual, recuperarEmpleadosActivos]);

  // Efecto adicional para limpiar empleados sin entradas pendientes (con más demora)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (empleadosActivos.length > 0) {
        const empleadosConEntradas = [];
        
        empleadosActivos.forEach(empleado => {
          // Buscar entradas pendientes en cualquier fecha para este empleado
          let tieneEntradasPendientes = false;
          let fechasConEntradas = [];
          
          for (let i = 0; i < localStorage.length; i++) {
            const clave = localStorage.key(i);
            if (clave && clave.startsWith(`asistencia_${empleado}_`)) {
              const partes = clave.split('_');
              if (partes.length >= 3) {
                const fechaEnClave = partes[partes.length - 1];
                const entradasPendientes = obtenerEntradasPendientes(empleado, fechaEnClave);
                if (entradasPendientes && entradasPendientes.length > 0) {
                  tieneEntradasPendientes = true;
                  fechasConEntradas.push(fechaEnClave);
                }
              }
            }
          }
          
          if (tieneEntradasPendientes) {
            empleadosConEntradas.push(empleado);
            console.log(`✅ Empleado ${empleado} mantiene entradas pendientes en fechas: ${fechasConEntradas.join(', ')}`);
          } else {
            console.log(`❌ Empleado ${empleado} NO tiene entradas pendientes en ninguna fecha`);
          }
        });
        
        // Solo actualizar si realmente hay diferencia (evitar loops infinitos)
        if (empleadosConEntradas.length !== empleadosActivos.length) {
          setEmpleadosActivos(empleadosConEntradas);
          localStorage.setItem('empleadosActivos', JSON.stringify(empleadosConEntradas));
          console.log('🧹 Empleados sin entradas pendientes removidos:', empleadosActivos.length - empleadosConEntradas.length);
        }
      }
    }, 2000); // Demora más larga para evitar limpiezas prematuras

    return () => clearTimeout(timeoutId);
  }, [empleadosActivos]);

  // Cargar asistencias desde la tabla asistencia filtradas por usuario
  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setAsistencias([]);
        return;
      }

      // Cargar todas las asistencias del usuario (sin filtros en la consulta)
      let query = supabase
        .from('asistencia')
        .select('id, empleado, fecha, fecha_cl, hora_entrada, hora_salida, total_horas, usuario_id, created_at')
        .eq('usuario_id', usuarioId) // 🔒 FILTRO CRÍTICO POR USUARIO
        .order('fecha_cl', { ascending: false })
        .order('created_at', { ascending: false });

      let { data, error } = await query;

      // Si hay error con fecha_cl, usar consulta sin fecha_cl
      if (error && (error.message?.includes('fecha_cl') || error.code === 'PGRST116' || error.status === 404)) {
        console.warn('⚠️ Error con fecha_cl, usando consulta fallback con fecha:', error.message);
        let fallbackQuery = supabase
          .from('asistencia')
          .select('id, empleado, fecha, hora_entrada, hora_salida, total_horas, usuario_id, created_at')
          .eq('usuario_id', usuarioId)
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false });

        const fallbackResult = await fallbackQuery;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      setAsistencias(data || []);
      
      // Extraer años disponibles de los registros cargados
      extraerAnosDisponibles(data || []);
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
      setError('Error al cargar el registro de asistencias');
      setAsistencias([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para extraer años únicos de los registros
  const extraerAnosDisponibles = useCallback((asistencias) => {
    const anos = new Set();
    
    // Agregar 2025 por defecto
    anos.add('2025');
    
    // Extraer años de los registros
    asistencias.forEach(asistencia => {
      const fecha = asistencia.fecha_cl || asistencia.fecha;
      if (fecha) {
        const ano = fecha.split('-')[0];
        if (ano && ano.length === 4) {
          anos.add(ano);
        }
      }
    });
    
    // Convertir a array y ordenar descendente
    const anosArray = Array.from(anos).sort((a, b) => b - a);
    setAnosDisponibles(anosArray);
  }, []);

  // Función para filtrar asistencias (similar a RegistroVenta)
  const filtrarAsistencias = useCallback(() => {
    let asistenciasFiltradas = [...asistencias];

    // Si no hay filtros activos, mostrar solo las asistencias del día actual
    if (!filtroFecha && !filtroEmpleado && !filtroMes && !filtroAno) {
      asistenciasFiltradas = asistenciasFiltradas.filter(asistencia => {
        const fechaAsistencia = asistencia.fecha_cl || asistencia.fecha;
        return fechaAsistencia === fechaActual;
      });
    } else {
      // Filtrar por fecha específica (si se selecciona)
      if (filtroFecha) {
        asistenciasFiltradas = asistenciasFiltradas.filter(asistencia => {
          const fechaAsistencia = asistencia.fecha_cl || asistencia.fecha;
          return fechaAsistencia === filtroFecha;
        });
      }

      // Filtrar por empleado (si se selecciona)
      if (filtroEmpleado && filtroEmpleado.trim()) {
        asistenciasFiltradas = asistenciasFiltradas.filter(asistencia => {
          return asistencia.empleado && asistencia.empleado.toLowerCase().includes(filtroEmpleado.toLowerCase());
        });
      }

      // Filtrar por mes (si se selecciona y no hay fecha específica)
      if (filtroMes && !filtroFecha) {
        asistenciasFiltradas = asistenciasFiltradas.filter(asistencia => {
          const fechaAsistencia = asistencia.fecha_cl || asistencia.fecha;
          if (!fechaAsistencia) return false;
          
          const [year, month] = fechaAsistencia.split('-');
          const mesAsistencia = parseInt(month);
          const mesFiltro = parseInt(filtroMes);
          return mesAsistencia === mesFiltro;
        });
      }

      // Filtrar por año (si se selecciona y no hay fecha específica)
      if (filtroAno && !filtroFecha) {
        asistenciasFiltradas = asistenciasFiltradas.filter(asistencia => {
          const fechaAsistencia = asistencia.fecha_cl || asistencia.fecha;
          if (!fechaAsistencia) return false;
          
          const year = fechaAsistencia.split('-')[0];
          return parseInt(year) === parseInt(filtroAno);
        });
      }

      // Si hay mes y año seleccionados (sin fecha específica)
      if (filtroMes && filtroAno && !filtroFecha) {
        asistenciasFiltradas = asistenciasFiltradas.filter(asistencia => {
          const fechaAsistencia = asistencia.fecha_cl || asistencia.fecha;
          if (!fechaAsistencia) return false;
          
          const [year, month] = fechaAsistencia.split('-');
          return parseInt(month) === parseInt(filtroMes) && 
                 parseInt(year) === parseInt(filtroAno);
        });
      }
    }

    setAsistenciasFiltradas(asistenciasFiltradas);
  }, [asistencias, filtroFecha, filtroEmpleado, filtroMes, filtroAno, fechaActual]);

  // Aplicar filtros cuando cambien los datos o filtros
  useEffect(() => {
    filtrarAsistencias();
  }, [filtrarAsistencias]);

  // Función para recargar datos
  const recargarDatos = useCallback(() => {
    cargarAsistencias();
  }, []);

  // Función personalizada para limpiar datos de asistencia específicos
  const limpiarDatosAsistencia = useCallback(() => {
    // Limpiar empleado activo (sistema anterior)
    setEmpleadoActivo('');
    localStorage.removeItem('empleadoActivo');
    
    // Limpiar empleados activos (sistema nuevo)
    setEmpleadosActivos([]);
    localStorage.removeItem('empleadosActivos');
    
    // Limpiar campo de empleado
    setEmpleado('');
    
    // Forzar actualización visual
    setLocalStorageVersion(prev => prev + 1);
  }, []);

  // Hook para gestionar cambios de sesión
  useSessionData(recargarDatos, 'RegistroAsistencia');

  // Efecto para limpiar datos específicos al logout
  useEffect(() => {
    const unsubscribe = sessionManager.subscribe((event) => {
      if (event === 'SIGNED_OUT') {
        limpiarDatosAsistencia();
      }
    });
    
    return unsubscribe;
  }, [limpiarDatosAsistencia]);

  // Cargar datos al montar el componente
  useEffect(() => {
    recargarDatos();
  }, [recargarDatos]);

  // Función para calcular horas trabajadas entre dos horarios (formato HH:MM para mostrar)
  const calcularTotalHoras = (horaEntrada, horaSalida) => {
    if (!horaEntrada || !horaSalida) return null;
    
    const [horaEnt, minEnt] = horaEntrada.split(':').map(Number);
    const [horaSal, minSal] = horaSalida.split(':').map(Number);
    
    let horas = horaSal - horaEnt;
    let minutos = minSal - minEnt;
    
    if (minutos < 0) {
      horas -= 1;
      minutos += 60;
    }
    
    if (horas < 0) {
      horas += 24; // Asumimos que es el mismo día
    }
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  // Función para calcular horas trabajadas en formato decimal para Supabase
  const calcularTotalHorasDecimal = (horaEntrada, horaSalida) => {
    if (!horaEntrada || !horaSalida) return null;
    
    const [horaEnt, minEnt] = horaEntrada.split(':').map(Number);
    const [horaSal, minSal] = horaSalida.split(':').map(Number);
    
    let horas = horaSal - horaEnt;
    let minutos = minSal - minEnt;
    
    if (minutos < 0) {
      horas -= 1;
      minutos += 60;
    }
    
    if (horas < 0) {
      horas += 24; // Asumimos que es el mismo día
    }
    
    // Convertir a decimal (ej: 1:30 = 1.5 horas)
    const horasDecimal = horas + (minutos / 60);
    return parseFloat(horasDecimal.toFixed(2));
  };

  // Función para obtener la clave de localStorage
  const obtenerClaveLocalStorage = (empleado, fecha) => {
    // Validar que existan empleado y fecha, y que empleado tenga al menos 2 caracteres
    if (!empleado || !fecha || empleado.trim().length < 2) {
      console.warn('⚠️ Intento de obtener clave de localStorage sin empleado válido o fecha');
      return null;
    }
    return `asistencia_${empleado}_${fecha}`;
  };

  // Función para guardar entrada en localStorage
  const guardarEntradaLocal = (empleado, fecha, hora) => {
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    
    // Validar que la clave sea válida
    if (!clave) {
      console.error('❌ No se puede guardar entrada: clave de localStorage inválida');
      throw new Error('Clave de localStorage inválida');
    }
    
    const entradasExistentes = JSON.parse(localStorage.getItem(clave) || '[]');
    
    const nuevaEntrada = {
      hora_entrada: hora,
      sincronizado: false
    };
    
    entradasExistentes.push(nuevaEntrada);
    localStorage.setItem(clave, JSON.stringify(entradasExistentes));
    
    // Forzar re-render del componente para actualizar la lista
    setLocalStorageVersion(prev => prev + 1);
    
    return nuevaEntrada;
  };

  // Función para obtener entradas pendientes
  const obtenerEntradasPendientes = (empleado, fecha) => {
    // Validar que existan empleado y fecha antes de proceder
    if (!empleado || !fecha || empleado.trim().length < 2) {
      return [];
    }
    
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    if (!clave) {
      return [];
    }
    
    const entradas = JSON.parse(localStorage.getItem(clave) || '[]');
    
    // Filtrar entradas que tienen hora_entrada pero no hora_salida
    const pendientes = entradas.filter(entrada => 
      entrada.hora_entrada && !entrada.hora_salida && !entrada.sincronizado
    );
    
    return pendientes;
  };

  // Función para eliminar entrada pendiente del localStorage
  const eliminarEntradaPendiente = (empleado, fecha, horaEntrada) => {
    if (!empleado || !fecha || empleado.trim().length < 2) {
      console.warn('⚠️ No se puede eliminar entrada pendiente: empleado inválido');
      return;
    }
    
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    if (!clave) {
      console.warn('⚠️ No se puede eliminar entrada pendiente: clave inválida');
      return;
    }
    
    const entradas = JSON.parse(localStorage.getItem(clave) || '[]');
    
    // Encontrar y marcar como sincronizada la entrada específica
    const entradasActualizadas = entradas.map(entrada => {
      if (entrada.hora_entrada === horaEntrada && !entrada.sincronizado) {
        return { ...entrada, sincronizado: true };
      }
      return entrada;
    });
    
    localStorage.setItem(clave, JSON.stringify(entradasActualizadas));
    
    // Forzar re-render del componente para actualizar la lista
    setLocalStorageVersion(prev => prev + 1);
  };

  // Función para obtener todas las entradas de localStorage (para mostrar en la interfaz)
  const obtenerTodasLasEntradas = (empleado, fecha) => {
    // Validar que existan empleado y fecha antes de proceder
    if (!empleado || !fecha || empleado.trim().length < 2) {
      return [];
    }
    
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    if (!clave) {
      return [];
    }
    
    return JSON.parse(localStorage.getItem(clave) || '[]');
  };

  // Función para obtener la última hora de entrada registrada hoy
  const obtenerUltimaEntradaHoy = (empleado, fecha) => {
    if (!empleado || !fecha || empleado.trim().length < 2) return null;
    
    const clave = obtenerClaveLocalStorage(empleado, fecha);
    if (!clave) return null;
    
    const entradas = JSON.parse(localStorage.getItem(clave) || '[]');
    
    // Filtrar entradas que tienen hora_entrada (sin importar si están sincronizadas)
    const entradasConHora = entradas.filter(entrada => entrada.hora_entrada);
    
    if (entradasConHora.length === 0) return null;
    
    // Retornar la última entrada registrada
    const ultimaEntrada = entradasConHora[entradasConHora.length - 1];
    return ultimaEntrada.hora_entrada;
  };

  // Registrar hora de entrada
  const registrarEntrada = async () => {
    if (!empleado) {
      alert('❌ Por favor ingresa el nombre del empleado');
      return;
    }

    try {
      setLoading(true);
      const horaActual = obtenerHoraActualFormato();
      
      // Guardar entrada en localStorage
      const entradaGuardada = guardarEntradaLocal(empleado, fechaActual, horaActual);
      alert(`✅ Hora de entrada registrada localmente: ${horaActual}\n\nLa entrada se sincronizará con el servidor cuando registres la salida.\n\n💾 La entrada se mantendrá guardada incluso si navegas a otra sección.`);
      
      // Activar el empleado para mostrar sus entradas (sistema anterior)
      actualizarEmpleadoActivo(empleado);
      
      // Agregar empleado a la lista de empleados activos (sistema nuevo)
      agregarEmpleadoActivo(empleado);
      
    } catch (error) {
      console.error('Error al registrar entrada:', error);
      alert('❌ Error al registrar la hora de entrada');
    } finally {
      setLoading(false);
    }
  };

  // Registrar hora de salida
  const registrarSalida = async () => {
    if (!empleado) {
      alert('❌ Por favor ingresa el nombre del empleado');
      return;
    }

    try {
      setLoading(true);
      const horaActual = obtenerHoraActualFormato();
      
      // Usar empleadoActivo si el campo empleado está vacío (para casos de navegación)
      const empleadoParaBuscar = empleado || empleadoActivo;
      
      // Buscar entradas pendientes en localStorage
      const entradasPendientes = obtenerEntradasPendientes(empleadoParaBuscar, fechaActual);

      if (!entradasPendientes || entradasPendientes.length === 0) {
        alert('❌ No hay registros de entrada pendientes para este empleado en la fecha actual');
        return;
      }

      // Tomar la última entrada pendiente
      const entradaPendiente = entradasPendientes[entradasPendientes.length - 1];
      
       const totalHorasFormato = calcularTotalHoras(entradaPendiente.hora_entrada, horaActual);
       const totalHorasDecimal = calcularTotalHorasDecimal(entradaPendiente.hora_entrada, horaActual);

       // Obtener el usuario_id del usuario autenticado
       const usuarioId = await authService.getCurrentUserId();
       if (!usuarioId) {
         alert('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.');
         return;
       }

       // Crear registro completo para enviar a Supabase
       const registroCompleto = {
         empleado: empleadoParaBuscar,
         fecha: fechaActual,
         // fecha_cl: NO ENVIAR - es columna generada automáticamente por PostgreSQL
         hora_entrada: entradaPendiente.hora_entrada,
         hora_salida: horaActual,
         total_horas: totalHorasDecimal,
         usuario_id: usuarioId // 🔒 AGREGAR USER ID PARA SEGURIDAD
       };

      // Enviar a Supabase
      const { data, error } = await supabase
        .from('asistencia')
        .insert([registroCompleto])
        .select('*');

      if (error) {
        console.error('Error en inserción a Supabase:', error);
        throw error;
      }

       // Marcar entrada como sincronizada en localStorage
       eliminarEntradaPendiente(empleadoParaBuscar, fechaActual, entradaPendiente.hora_entrada);
        cargarAsistencias();
        
        // Verificar si el empleado tiene más entradas pendientes
        const entradasRestantes = obtenerEntradasPendientes(empleadoParaBuscar, fechaActual);
        if (entradasRestantes.length === 0) {
          // Si no hay más entradas pendientes, remover el empleado de la lista activa
          removerEmpleadoActivo(empleadoParaBuscar);
        }
        
        // Limpiar el campo del empleado
        setEmpleado('');
        
        alert(`✅ Hora de salida registrada: ${horaActual}\nTotal horas trabajadas: ${totalHorasFormato}\n\nRegistro sincronizado con el servidor.`);
      
    } catch (error) {
      console.error('Error al registrar salida:', error);
      alert('❌ Error al registrar la hora de salida');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroEmpleado('');
    setFiltroMes('');
    setFiltroAno('');
  };

  // Función para limpiar entradas pendientes del localStorage
  const limpiarEntradasPendientes = () => {
    if (empleado && fechaActual && empleado.trim().length >= 2) {
      const clave = obtenerClaveLocalStorage(empleado, fechaActual);
      if (clave) {
        localStorage.removeItem(clave);
        alert('✅ Entradas pendientes eliminadas del localStorage');
        
        // Forzar re-render del componente para actualizar la lista
        setLocalStorageVersion(prev => prev + 1);
      } else {
        console.warn('⚠️ No se pueden limpiar entradas pendientes: clave inválida');
        alert('❌ No se pueden limpiar entradas pendientes');
      }
    } else {
      console.warn('⚠️ No se pueden limpiar entradas pendientes: empleado inválido');
      alert('❌ No se pueden limpiar entradas pendientes: empleado inválido');
    }
  };

  // Función para mostrar información de debug
  const mostrarInfoDebug = () => {
    if (empleado && fechaActual && empleado.trim().length >= 2) {
      const entradas = obtenerTodasLasEntradas(empleado, fechaActual);
      const pendientes = obtenerEntradasPendientes(empleado, fechaActual);
      
      alert(`🔍 Información de Debug:\n\nEmpleado: ${empleado}\nFecha: ${fechaActual}\n\nTodas las entradas: ${JSON.stringify(entradas, null, 2)}\n\nEntradas pendientes: ${JSON.stringify(pendientes, null, 2)}`);
    } else {
      alert('❌ No se puede mostrar debug: empleado inválido o fecha faltante');
    }
  };

  // Función para mostrar información completa del sistema
  const mostrarInfoCompleta = () => {
    try {
      let info = `🔍 Información Completa del Sistema:\n\n`;
      info += `📅 Fecha Actual: ${fechaActual}\n`;
      info += `👥 Empleados Activos: ${empleadosActivos.length}\n`;
      info += `📋 Empleados: ${empleadosActivos.join(', ') || 'Ninguno'}\n\n`;
      
      // Mostrar todas las claves de localStorage relacionadas con asistencia
      info += `💾 Datos en localStorage:\n`;
      let clavesEncontradas = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && (clave.startsWith('asistencia_') || clave === 'empleadosActivos' || clave === 'empleadoActivo')) {
          const valor = localStorage.getItem(clave);
          info += `• ${clave}: ${valor}\n`;
          clavesEncontradas++;
        }
      }
      
      if (clavesEncontradas === 0) {
        info += `• No se encontraron datos de asistencia en localStorage\n`;
      }
      
      info += `\n📊 Total de entradas registradas hoy: ${entradasRegistradasHoy.length}\n`;
      
      alert(info);
    } catch (error) {
      console.error('Error al mostrar información completa:', error);
      alert('❌ Error al obtener información del sistema');
    }
  };

  // Función para forzar recuperación de datos
  const forzarRecuperacionDatos = () => {
    try {
      console.log('🔄 Forzando recuperación de datos...');
      recuperarEmpleadosActivos();
      alert('✅ Recuperación de datos ejecutada. Revisa la consola para más detalles.');
    } catch (error) {
      console.error('❌ Error al forzar recuperación:', error);
      alert('❌ Error al ejecutar recuperación de datos');
    }
  };

  // Función para recuperar empleados de cualquier fecha con entradas pendientes
  const recuperarEmpleadosCualquierFecha = () => {
    try {
      console.log('🔄 Recuperando empleados de cualquier fecha...');
      const empleadosConDatos = [];
      const fechasEncontradas = new Set();
      
      // Buscar en todas las claves de localStorage que empiecen con 'asistencia_'
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && clave.startsWith('asistencia_')) {
          const partes = clave.split('_');
          if (partes.length >= 3) {
            const empleado = partes.slice(1, -1).join('_');
            const fechaEnClave = partes[partes.length - 1];
            
            if (empleado && empleado.trim().length >= 2) {
              const entradasPendientes = obtenerEntradasPendientes(empleado, fechaEnClave);
              console.log(`🔍 Verificando ${empleado} (${fechaEnClave}): ${entradasPendientes.length} entradas pendientes`);
              if (entradasPendientes && entradasPendientes.length > 0) {
                empleadosConDatos.push(empleado);
                fechasEncontradas.add(fechaEnClave);
                console.log(`✅ Empleado encontrado: ${empleado} (fecha: ${fechaEnClave}, entradas: ${entradasPendientes.length})`);
              }
            }
          }
        }
      }
      
      if (empleadosConDatos.length > 0) {
        setEmpleadosActivos(empleadosConDatos);
        localStorage.setItem('empleadosActivos', JSON.stringify(empleadosConDatos));
        console.log('✅ Empleados activos actualizados:', empleadosConDatos);
        alert(`✅ Recuperados ${empleadosConDatos.length} empleados de ${fechasEncontradas.size} fecha(s) diferentes:\n\n${empleadosConDatos.join(', ')}\n\nFechas: ${Array.from(fechasEncontradas).join(', ')}`);
      } else {
        alert('ℹ️ No se encontraron empleados con entradas pendientes');
      }
    } catch (error) {
      console.error('❌ Error al recuperar empleados:', error);
      alert('❌ Error al recuperar empleados de cualquier fecha');
    }
  };

  // Función para hacer backup de datos críticos
  const hacerBackupDatos = () => {
    try {
      const backup = {
        fecha: fechaActual,
        timestamp: new Date().toISOString(),
        empleadosActivos: empleadosActivos,
        datosLocalStorage: {}
      };
      
      // Recopilar todos los datos de localStorage relacionados con asistencia
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && clave.startsWith('asistencia_')) {
          const valor = localStorage.getItem(clave);
          backup.datosLocalStorage[clave] = valor;
        }
      }
      
      // Crear y descargar archivo de backup
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `backup_asistencia_${fechaActual}_${new Date().getTime()}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('✅ Backup de datos creado exitosamente');
    } catch (error) {
      console.error('❌ Error al crear backup:', error);
      alert('❌ Error al crear backup de datos');
    }
  };

  // Función para restaurar datos desde backup
  const restaurarDesdeBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const backup = JSON.parse(e.target.result);
            
            // Restaurar empleados activos
            if (backup.empleadosActivos) {
              setEmpleadosActivos(backup.empleadosActivos);
              localStorage.setItem('empleadosActivos', JSON.stringify(backup.empleadosActivos));
            }
            
            // Restaurar datos de localStorage
            if (backup.datosLocalStorage) {
              Object.entries(backup.datosLocalStorage).forEach(([clave, valor]) => {
                localStorage.setItem(clave, valor);
              });
            }
            
            // Forzar actualización
            setLocalStorageVersion(prev => prev + 1);
            
            alert('✅ Datos restaurados desde backup exitosamente');
          } catch (error) {
            console.error('❌ Error al restaurar backup:', error);
            alert('❌ Error al restaurar datos desde backup');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Función para registrar salida desde el listado
  const registrarSalidaDesdeListado = async (empleadoEntrada, horaEntrada, fechaEntrada = null) => {
    try {
      setLoading(true);
      const horaActual = obtenerHoraActualFormato();
      
      // Verificar si el empleado está en la lista de empleados activos
      const empleadoEncontrado = empleadosActivos.find(emp => emp === empleadoEntrada);
      
      if (empleadoEncontrado) {
        // Buscar la entrada específica en localStorage
        // Si no se proporciona fecha, buscar en la fecha actual primero
        const fechaParaBuscar = fechaEntrada || fechaActual;
        const entradasPendientes = obtenerEntradasPendientes(empleadoEntrada, fechaParaBuscar);
        let entradaPendiente = entradasPendientes.find(e => e.hora_entrada === horaEntrada);
        
        // Si no se encuentra en la fecha especificada, buscar en todas las fechas
        if (!entradaPendiente) {
          for (let i = 0; i < localStorage.length; i++) {
            const clave = localStorage.key(i);
            if (clave && clave.startsWith(`asistencia_${empleadoEntrada}_`)) {
              const partes = clave.split('_');
              if (partes.length >= 3) {
                const fechaEnClave = partes[partes.length - 1];
                const entradas = obtenerEntradasPendientes(empleadoEntrada, fechaEnClave);
                entradaPendiente = entradas.find(e => e.hora_entrada === horaEntrada);
                if (entradaPendiente) {
                  fechaParaBuscar = fechaEnClave;
                  break;
                }
              }
            }
          }
        }
        
        if (entradaPendiente) {
          // Usar la lógica existente de registrarSalida
          const totalHorasFormato = calcularTotalHoras(horaEntrada, horaActual);
          const totalHorasDecimal = calcularTotalHorasDecimal(horaEntrada, horaActual);
          
          // Obtener el usuario_id del usuario autenticado
          const usuarioId = await authService.getCurrentUserId();
          if (!usuarioId) {
            alert('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.');
            return;
          }

          const registroCompleto = {
            empleado: empleadoEntrada,
            fecha: fechaParaBuscar, // Usar la fecha donde se encontró la entrada
            // fecha_cl: NO ENVIAR - es columna generada automáticamente por PostgreSQL
            hora_entrada: horaEntrada,
            hora_salida: horaActual,
            total_horas: totalHorasDecimal,
            usuario_id: usuarioId // 🔒 AGREGAR USER ID PARA SEGURIDAD
          };
          
          const { data, error } = await supabase
            .from('asistencia')
            .insert([registroCompleto])
            .select('*');
          
          if (error) throw error;
          
          // Marcar entrada como sincronizada
          eliminarEntradaPendiente(empleadoEntrada, fechaParaBuscar, horaEntrada);
          
          // Verificar si el empleado tiene más entradas pendientes en cualquier fecha
          let tieneEntradasRestantes = false;
          for (let i = 0; i < localStorage.length; i++) {
            const clave = localStorage.key(i);
            if (clave && clave.startsWith(`asistencia_${empleadoEntrada}_`)) {
              const partes = clave.split('_');
              if (partes.length >= 3) {
                const fechaEnClave = partes[partes.length - 1];
                const entradasRestantes = obtenerEntradasPendientes(empleadoEntrada, fechaEnClave);
                if (entradasRestantes.length > 0) {
                  tieneEntradasRestantes = true;
                  break;
                }
              }
            }
          }
          
          if (!tieneEntradasRestantes) {
            // Si no hay más entradas pendientes, remover el empleado de la lista activa
            removerEmpleadoActivo(empleadoEntrada);
          }
          
          cargarAsistencias();
          
          alert(`✅ Salida registrada para ${empleadoEntrada}\nFecha: ${fechaParaBuscar}\nHora de salida: ${horaActual}\nTotal horas: ${totalHorasFormato}\n\nRegistro sincronizado con el servidor.`);
          return;
        }
      }
      
      // Si no se encuentra en localStorage, mostrar error más detallado
      alert(`❌ No se puede registrar la salida para ${empleadoEntrada}\n\nPosibles causas:\n• La entrada no fue registrada localmente\n• Los datos se perdieron al navegar\n• Error en la sincronización\n\nIntenta registrar una nueva entrada.`);
      
    } catch (error) {
      console.error('Error al registrar salida desde listado:', error);
      alert('❌ Error al registrar la hora de salida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para convertir horas decimales a formato HH:MM
  const convertirHorasDecimalesAFormato = (horasDecimales) => {
    if (!horasDecimales || horasDecimales === 0) return '';
    
    const horas = Math.floor(horasDecimales);
    const minutos = Math.round((horasDecimales - horas) * 60);
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  // Función para formatear fecha usando utilidades de Chile
  const formatearFecha = (fechaString) => {
    if (!fechaString) return '';
    return formatearFechaChile(fechaString);
  };

  // Función para exportar datos a CSV
  const exportarCSV = () => {
    const headers = ['Empleado', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Total Horas', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...asistenciasFiltradas.map(asistencia => {
        const estado = asistencia.hora_entrada && asistencia.hora_salida ? 'Completo' : 
                      asistencia.hora_entrada ? 'Solo Entrada' : 'Sin Registro';
        return [
          asistencia.empleado || '',
          asistencia.fecha_cl || asistencia.fecha,
          asistencia.hora_entrada || '',
          asistencia.hora_salida || '',
          convertirHorasDecimalesAFormato(asistencia.total_horas) || '',
          estado
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asistencias_${fechaActual}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para eliminar una asistencia (solo del usuario actual)
  const eliminarAsistencia = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro de asistencia? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return;
      }
      
      const { error } = await supabase
        .from('asistencia')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId); // 🔒 SEGURIDAD: Solo eliminar registros del usuario actual
      
      if (error) {
        console.error('❌ Error al eliminar asistencia:', error);
        alert('❌ Error al eliminar el registro: ' + error.message);
        return;
      }
      
      alert('✅ Registro de asistencia eliminado exitosamente');
      await cargarAsistencias(); // Recargar la lista
    } catch (error) {
      console.error('❌ Error inesperado al eliminar asistencia:', error);
      alert('❌ Error inesperado al eliminar el registro');
    } finally {
      setLoading(false);
    }
  };

  // Calcular horas trabajadas por empleado (evitando duplicados por nombre)
  const horasPorEmpleado = useMemo(() => {
    // Crear un Map para evitar duplicados por nombre (case-insensitive)
    const empleadosMap = new Map();
    
    asistenciasFiltradas.forEach(asistencia => {
      if (asistencia.empleado && asistencia.total_horas) {
        const nombreNormalizado = asistencia.empleado.toLowerCase().trim();
        
        if (empleadosMap.has(nombreNormalizado)) {
          // Sumar horas al empleado existente
          const empleadoExistente = empleadosMap.get(nombreNormalizado);
          empleadoExistente.total_horas += asistencia.total_horas;
          empleadoExistente.registros += 1;
        } else {
          // Crear nuevo empleado
          empleadosMap.set(nombreNormalizado, {
            nombre: asistencia.empleado, // Mantener nombre original
            total_horas: asistencia.total_horas,
            registros: 1
          });
        }
      }
    });
    
    // Convertir Map a array y ordenar por total de horas (descendente)
    return Array.from(empleadosMap.values())
      .sort((a, b) => b.total_horas - a.total_horas);
  }, [asistenciasFiltradas]);

  // Calcular estadísticas del día (mantener para otras funcionalidades)
  const estadisticas = useMemo(() => {
    const asistenciasHoy = asistencias.filter(a => a.fecha === fechaActual);
    const entradasServidor = asistenciasHoy.filter(a => a.hora_entrada).length;
    const salidasServidor = asistenciasHoy.filter(a => a.hora_salida).length;
    
    // Obtener entradas pendientes del localStorage solo si hay empleado válido
    let entradasPendientesCount = 0;
    if (empleado && fechaActual && empleado.trim().length >= 2) {
      const entradasPendientes = obtenerEntradasPendientes(empleado, fechaActual);
      entradasPendientesCount = entradasPendientes.length;
    }
    
    const entradas = entradasServidor + entradasPendientesCount;
    const salidas = salidasServidor;
    const total = asistenciasHoy.length + entradasPendientesCount;
    
    return { entradas, salidas, total, entradasPendientes: entradasPendientesCount };
  }, [asistencias, empleado, fechaActual]);

  // Memoizar la última entrada para evitar llamadas innecesarias
  const ultimaEntradaHoy = useMemo(() => {
    if (!empleado || !fechaActual || empleado.trim().length < 2) return null;
    return obtenerUltimaEntradaHoy(empleado, fechaActual);
  }, [empleado, fechaActual]);

  // Memoizar todas las entradas pendientes para el listado visual
  const entradasPendientesVisual = useMemo(() => {
    if (!empleado || !fechaActual || empleado.trim().length < 2) return [];
    return obtenerEntradasPendientes(empleado, fechaActual);
  }, [empleado, fechaActual]);

  // Obtener todas las entradas registradas (de todos los empleados activos, cualquier fecha)
  const entradasRegistradasHoy = useMemo(() => {
    // Si no hay empleados activos, no mostrar nada
    if (!empleadosActivos || empleadosActivos.length === 0) {
      return [];
    }
    
    const todasLasEntradas = [];
    
    // Procesar cada empleado activo
    empleadosActivos.forEach(empleadoActivo => {
      // Filtrar entradas del servidor para este empleado (fecha actual)
    const entradasServidor = asistencias
      .filter(a => a.fecha === fechaActual && a.empleado === empleadoActivo)
      .map(e => ({ ...e, origen: 'servidor' }));
    
      // Obtener entradas del localStorage para este empleado (cualquier fecha)
    const entradasLocal = [];
      
      // Buscar en todas las claves de localStorage para este empleado
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && clave.startsWith(`asistencia_${empleadoActivo}_`)) {
          const partes = clave.split('_');
          if (partes.length >= 3) {
            const fechaEnClave = partes[partes.length - 1];
        const entradas = JSON.parse(localStorage.getItem(clave) || '[]');
        
        entradas.forEach(entrada => {
          if (entrada.hora_entrada) {
            // Solo incluir entradas que NO estén sincronizadas (para evitar duplicados)
            if (!entrada.sincronizado) {
              entradasLocal.push({
                empleado: empleadoActivo,
                    fecha: fechaEnClave,
                hora_entrada: entrada.hora_entrada,
                hora_salida: entrada.hora_salida || null,
                sincronizado: entrada.sincronizado || false,
                origen: 'local'
              });
            }
          }
        });
          }
        }
      }
      
      // Agregar entradas de este empleado a la lista total
      todasLasEntradas.push(...entradasServidor, ...entradasLocal);
    });
    
    // Ordenar por fecha y hora de entrada (más reciente primero)
    return todasLasEntradas.sort((a, b) => {
      // Primero por fecha
      const fechaA = a.fecha || '0000-00-00';
      const fechaB = b.fecha || '0000-00-00';
      if (fechaA !== fechaB) {
        return fechaB.localeCompare(fechaA);
      }
      
      // Luego por hora de entrada
      const horaA = a.hora_entrada || '00:00';
      const horaB = b.hora_entrada || '00:00';
      return horaB.localeCompare(horaA);
    });
  }, [asistencias, empleadosActivos, fechaActual, localStorageVersion]);

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

          {/* Título principal */}
          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Registro de Asistencia
          </h1>

          {/* 1. SECCIÓN SUPERIOR: Reloj y fecha actual (formato 24hrs) */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6 md:mb-8">
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {horaActual}
              </div>
              <div className="text-base md:text-xl text-gray-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {new Date(fechaActual + 'T12:00:00').toLocaleDateString('es-CL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'America/Santiago'
                })}
              </div>
            </div>
          </div>

          {/* 2. SECCIÓN MEDIA: Formulario de registro de asistencia */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Registrar Asistencia
            </h2>
            
            <div className="space-y-6 md:space-y-8">
              {/* Sección de entrada de empleado */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6">
                <div className="mb-4">
                  <label className="block text-white font-semibold mb-3 text-base md:text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Nombre del Empleado
                  </label>
                  <input
                    type="text"
                    value={empleado}
                    onChange={(e) => setEmpleado(e.target.value)}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-base md:text-lg font-medium"
                    placeholder="Ingresa el nombre completo del empleado"
                    required
                  />
                  
                  {/* Indicador de empleados activos con entradas pendientes */}
                  {empleadosActivos.length > 0 && (
                    <div className="mt-3 p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-green-300 font-medium">
                            {empleadosActivos.length} empleado{empleadosActivos.length !== 1 ? 's' : ''} activo{empleadosActivos.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <button
                          onClick={limpiarTodosEmpleadosActivos}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-md text-sm transition-all duration-200"
                        >
                          Limpiar Todos
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {empleadosActivos.map((empleadoActivo, index) => (
                          <div
                            key={`${empleadoActivo}_${index}`}
                            className="flex items-center gap-2 px-3 py-1 bg-green-600/30 border border-green-500/50 rounded-lg"
                          >
                            <span className="text-green-300 text-sm font-medium">{empleadoActivo}</span>
                            <button
                              onClick={() => removerEmpleadoActivo(empleadoActivo)}
                              className="text-red-300 hover:text-red-200 text-xs transition-colors duration-200"
                              title="Remover empleado"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sección de botones de acción */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-white mb-4 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Acciones Disponibles
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {/* Botón de entrada */}
                  <button
                    onClick={registrarEntrada}
                    disabled={loading || !empleado}
                    className="group relative px-6 md:px-8 py-4 md:py-5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base md:text-lg"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{loading ? 'Registrando...' : 'Registrar Entrada'}</span>
                    </div>
                    <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </button>

                  {/* Botón de salida */}
                  <button
                    onClick={registrarSalida}
                    disabled={loading || !empleado}
                    className="group relative px-6 md:px-8 py-4 md:py-5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base md:text-lg"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{loading ? 'Registrando...' : 'Registrar Salida'}</span>
                    </div>
                    <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </button>
                </div>
                
                {/* Información de ayuda */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-gray-300 text-sm md:text-base">
                      <strong>Proceso:</strong> Registra entrada → Trabaja → Registra salida
                    </p>
                    <p className="text-gray-400 text-xs md:text-sm mt-1">
                      Los datos se sincronizan automáticamente con el servidor
                    </p>
                  </div>
                </div>
              </div>

              {/* Entradas de Empleados Activos */}
              {empleadosActivos.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Entradas de Empleados Activos ({empleadosActivos.length})
                  </h3>
                  
                  {entradasRegistradasHoy.length === 0 ? (
                      <div className="text-center py-6 md:py-8">
                      <div className="text-gray-300 text-sm md:text-base">No hay entradas registradas para los empleados activos hoy</div>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4 max-h-80 overflow-y-auto">
                      {entradasRegistradasHoy.map((entrada, index) => (
                        <div
                          key={`${entrada.empleado}_${entrada.hora_entrada}_${index}`}
                          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="text-lg md:text-xl font-bold text-white truncate">
                                  {entrada.empleado}
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  entrada.origen === 'servidor' 
                                    ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                                    : 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                                }`}>
                                  {entrada.origen === 'servidor' ? 'Sincronizado' : 'Pendiente'}
                                </div>
                              </div>
                              
                              <div className="text-sm md:text-base text-gray-300 mb-1">
                                Fecha: <span className="font-semibold text-white">{entrada.fecha}</span>
                              </div>
                              
                              <div className="text-sm md:text-base text-gray-300 mb-1">
                                Hora de entrada: <span className="font-semibold text-white">{entrada.hora_entrada}</span>
                              </div>
                              
                              {entrada.hora_salida && (
                                <div className="text-sm md:text-base text-gray-300 mb-1">
                                  Hora de salida: <span className="font-semibold text-white">{entrada.hora_salida}</span>
                                </div>
                              )}
                              
                              {entrada.total_horas && (
                                <div className="text-sm md:text-base text-green-400 font-medium">
                                  Total: {convertirHorasDecimalesAFormato(entrada.total_horas)} horas
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-shrink-0">
                              {!entrada.hora_salida && entrada.origen === 'local' ? (
                                <button
                                  onClick={() => registrarSalidaDesdeListado(entrada.empleado, entrada.hora_entrada, entrada.fecha)}
                                  disabled={loading}
                                  className="px-3 md:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {loading ? 'Registrando...' : 'Registrar Salida'}
                                </button>
                              ) : entrada.hora_salida ? (
                                <div className="px-3 py-2 bg-green-500/30 border border-green-500/50 rounded-lg">
                                  <span className="text-green-300 text-sm font-medium">Completado</span>
                                </div>
                              ) : (
                                <div className="px-3 py-2 bg-gray-500/30 border border-gray-500/50 rounded-lg">
                                  <span className="text-gray-300 text-sm">⏳ Pendiente</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  

                </div>
              )}


            </div>
          </div>

          {/* 3. LISTA DE REGISTROS GENERADOS DE ASISTENCIA */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-4 md:mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Registros de Asistencia Generados
            </h2>

            {/* Sección de filtros */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6 mb-6">
              <h3 className="text-lg md:text-xl font-bold text-white mb-4 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Filtros y Controles
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                <div>
                  <label className="block text-white font-medium mb-2 text-sm md:text-base">
                    Filtrar por Fecha
                  </label>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    placeholder="Seleccionar fecha"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2 text-sm md:text-base">
                    Filtrar por Empleado
                  </label>
                  <input
                    type="text"
                    value={filtroEmpleado}
                    onChange={(e) => setFiltroEmpleado(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                    placeholder="Buscar por nombre del empleado"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2 text-sm md:text-base">
                    Filtrar por Mes
                  </label>
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                  >
                    <option value="">Todos los meses</option>
                    <option value="01">Enero</option>
                    <option value="02">Febrero</option>
                    <option value="03">Marzo</option>
                    <option value="04">Abril</option>
                    <option value="05">Mayo</option>
                    <option value="06">Junio</option>
                    <option value="07">Julio</option>
                    <option value="08">Agosto</option>
                    <option value="09">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white font-medium mb-2 text-sm md:text-base">
                    Filtrar por Año
                  </label>
                  <select
                    value={filtroAno}
                    onChange={(e) => setFiltroAno(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm md:text-base"
                  >
                    <option value="">Todos los años</option>
                    {anosDisponibles.map(ano => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={limpiarFiltros}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 text-xs font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🧹 Limpiar Filtros
                  </button>
                  <button
                    onClick={exportarCSV}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 text-xs font-medium"
                  >
                    📊 Exportar CSV
                  </button>
                <button
                  onClick={recuperarEmpleadosCualquierFecha}
                  className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors duration-200 text-xs font-medium"
                >
                  🔍 Recuperar Empleados
                </button>
              </div>


            </div>



            {/* Lista general de todas las asistencias */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                <h3 className="text-lg md:text-xl font-bold text-white text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Todos los Registros de Asistencia
                </h3>
                {(filtroFecha || filtroEmpleado || filtroMes || filtroAno) && (
                  <div className="px-3 py-1 bg-blue-500/30 border border-blue-500/50 rounded-full">
                    <span className="text-blue-300 text-sm font-medium">
                      {asistenciasFiltradas.length} resultado{asistenciasFiltradas.length !== 1 ? 's' : ''} encontrado{asistenciasFiltradas.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="max-h-80 md:max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-white text-sm md:text-base">⏳ Cargando asistencias...</div>
                  </div>
                ) : error ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-red-400 text-sm md:text-base">❌ {error}</div>
                  </div>
                ) : asistenciasFiltradas.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-gray-300 text-sm md:text-base">No hay registros de asistencia</div>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {asistenciasFiltradas.map((asistencia) => (
                      <div
                        key={asistencia.id}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 md:p-4"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm md:text-base truncate">
                              {asistencia.empleado}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">
                              {formatearFecha(asistencia.fecha_cl || asistencia.fecha)}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">
                              Entrada: {asistencia.hora_entrada || 'No registrada'} | 
                              Salida: {asistencia.hora_salida || 'No registrada'}
                            </div>
                            {asistencia.total_horas && (
                              <div className="text-xs md:text-sm text-green-400 font-medium">
                                Total: {convertirHorasDecimalesAFormato(asistencia.total_horas)} horas
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                              asistencia.hora_entrada && asistencia.hora_salida
                                ? 'bg-green-100 text-green-800'
                                : asistencia.hora_entrada
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {asistencia.hora_entrada && asistencia.hora_salida ? 'Completo' : 
                               asistencia.hora_entrada ? 'Solo Entrada' : 
                               'Sin Registro'}
                            </div>
                            <button
                              onClick={() => eliminarAsistencia(asistencia.id)}
                              disabled={loading}
                              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-2 md:px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                              title="Eliminar registro"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. SECCIÓN FINAL: Total de horas trabajadas por empleado */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-4 md:mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Total de Horas Trabajadas por Empleado
            </h2>
            
            {horasPorEmpleado.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <div className="text-gray-300 text-sm md:text-base">No hay registros de horas trabajadas</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {horasPorEmpleado.map((empleado, index) => (
                  <div
                    key={`${empleado.nombre}_${index}`}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 transform hover:scale-105 transition-all duration-200"
                  >
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-bold text-white mb-1 truncate" title={empleado.nombre}>
                        {empleado.nombre}
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-green-400 mb-1">
                        {convertirHorasDecimalesAFormato(empleado.total_horas)}
                      </div>
                      <div className="text-gray-300 text-xs md:text-sm">
                        {empleado.registros} registro{empleado.registros !== 1 ? 's' : ''}
                      </div>
                      <div className="text-gray-400 text-xs">
                        Total horas: {empleado.total_horas.toFixed(2)}h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Resumen total */}
            {horasPorEmpleado.length > 0 && (
              <div className="mt-4 md:mt-6 pt-4 border-t border-white/20">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Total General: {convertirHorasDecimalesAFormato(
                      horasPorEmpleado.reduce((total, emp) => total + emp.total_horas, 0)
                    )}
                  </div>
                  <div className="text-gray-300 text-sm md:text-base">
                    {horasPorEmpleado.length} empleado{horasPorEmpleado.length !== 1 ? 's' : ''} registrado{horasPorEmpleado.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-gray-400 text-xs md:text-sm mt-2">
                    {horasPorEmpleado.reduce((total, emp) => total + emp.registros, 0)} registros totales
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