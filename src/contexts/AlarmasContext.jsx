import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService';

const AlarmasContext = createContext();

export const useAlarmas = () => {
  const context = useContext(AlarmasContext);
  if (!context) {
    throw new Error('useAlarmas debe usarse dentro de AlarmasProvider');
  }
  return context;
};

export const AlarmasProvider = ({ children }) => {
  const [recordatorios, setRecordatorios] = useState([]);
  const [alarmaActiva, setAlarmaActiva] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar recordatorios desde Supabase al iniciar
  useEffect(() => {
    cargarRecordatorios();
  }, []);

  // Función para cargar recordatorios desde Supabase
  const cargarRecordatorios = async () => {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('recordatorios')
        .select('*')
        .eq('usuario_id', userId)
        .order('anio', { ascending: true })
        .order('mes', { ascending: true })
        .order('dia', { ascending: true })
        .order('hora', { ascending: true });

      if (error) {
        console.error('Error al cargar recordatorios:', error);
        // Intentar cargar desde localStorage como fallback
        const recordatoriosGuardados = localStorage.getItem('micaja_recordatorios');
        if (recordatoriosGuardados) {
          const parsed = JSON.parse(recordatoriosGuardados);
          setRecordatorios(parsed);
        }
      } else {
        setRecordatorios(data || []);
        // Guardar en localStorage como backup
        if (data && data.length > 0) {
          localStorage.setItem('micaja_recordatorios', JSON.stringify(data));
        }
      }
    } catch (error) {
      console.error('Error inesperado al cargar recordatorios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sistema de verificación optimizado - Solo verifica si hay recordatorios HOY
  useEffect(() => {
    let intervalId = null;
    let timeoutReinicio = null;
    
    const reproducirSonidoAlarma = () => {
      try {
        // Verificar preferencia de sonidos
        const soundsPref = localStorage.getItem('soundsEnabled');
        if (soundsPref !== 'false') {
          const audio = new Audio('/sounds/alerta-calendario.wav');
          audio.volume = 0.8;
          audio.play().catch(err => {
            if (import.meta.env.DEV) {
              console.warn('No se pudo reproducir sonido de alarma:', err);
            }
          });
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Error al reproducir sonido de alarma:', error);
        }
      }
    };
    
    const iniciarVerificacion = () => {
      const hoy = new Date();
      const diaActual = hoy.getDate();
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();
      
      // Pre-filtrar: ¿Hay recordatorios pendientes HOY?
      const recordatoriosHoy = recordatorios.filter(rec => 
        rec.estado === 'pendiente' &&
        rec.dia === diaActual &&
        rec.mes === mesActual &&
        rec.anio === anioActual
      );
      
      if (recordatoriosHoy.length === 0) {
        // ✅ NO hay recordatorios hoy → NO verificar (ahorro de recursos)
        if (import.meta.env.DEV) {
          console.log('📅 No hay recordatorios pendientes hoy. Modo ahorro activado.');
        }
        
        // Programar verificación para mañana a las 00:01
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        manana.setHours(0, 1, 0, 0);
        const tiempoHastaManana = manana - hoy;
        
        if (import.meta.env.DEV) {
          console.log(`⏰ Próxima verificación en ${Math.round(tiempoHastaManana / 1000 / 60 / 60)} horas`);
        }
        
        timeoutReinicio = setTimeout(iniciarVerificacion, tiempoHastaManana);
        return;
      }
      
      // ✅ SÍ hay recordatorios hoy → Iniciar verificación activa
      if (import.meta.env.DEV) {
        console.log(`📋 ${recordatoriosHoy.length} recordatorio(s) pendiente(s) hoy. Verificación activa.`);
      }
      
      const verificarAlarmas = () => {
        const ahora = new Date();
        const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
        
        // Solo verificar los recordatorios de HOY (ya pre-filtrados)
        const alarmasPendientes = recordatoriosHoy.filter(rec => 
          rec.hora === horaActual
        );
        
        // Mostrar la primera alarma pendiente
        if (alarmasPendientes.length > 0 && !alarmaActiva) {
          if (import.meta.env.DEV) {
            console.log('🔔 ¡Alarma disparada!', alarmasPendientes[0].asunto);
          }
          setAlarmaActiva(alarmasPendientes[0]);
          reproducirSonidoAlarma();
        }
      };
      
      // Verificar inmediatamente
      verificarAlarmas();
      
      // Luego verificar cada 30 segundos
      intervalId = setInterval(verificarAlarmas, 30000);
      
      // Programar detención a medianoche y reinicio para mañana
      const finDelDia = new Date(hoy);
      finDelDia.setHours(23, 59, 59, 999);
      const tiempoHastaFinDia = finDelDia - hoy + 2000; // +2s de margen
      
      timeoutReinicio = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.log('🌙 Fin del día. Reiniciando sistema de alarmas...');
        }
        if (intervalId) clearInterval(intervalId);
        iniciarVerificacion(); // Reiniciar para el nuevo día
      }, tiempoHastaFinDia);
    };
    
    // Iniciar el sistema
    iniciarVerificacion();
    
    // Cleanup
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutReinicio) clearTimeout(timeoutReinicio);
    };
  }, [recordatorios, alarmaActiva]);

  // Agregar recordatorio
  const agregarRecordatorio = useCallback(async (recordatorio) => {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const nuevoRecordatorio = {
        ...recordatorio,
        usuario_id: userId,
        estado: 'pendiente'
      };

      const { data, error } = await supabase
        .from('recordatorios')
        .insert([nuevoRecordatorio])
        .select()
        .single();

      if (error) {
        console.error('Error al crear recordatorio:', error);
        throw error;
      }

      // Actualizar estado local
      setRecordatorios(prev => [...prev, data]);
      
      // Actualizar localStorage como backup
      localStorage.setItem('micaja_recordatorios', JSON.stringify([...recordatorios, data]));
      
      return data;
    } catch (error) {
      console.error('Error al agregar recordatorio:', error);
      alert('❌ Error al guardar el recordatorio. Intenta nuevamente.');
      throw error;
    }
  }, [recordatorios]);

  // Actualizar recordatorio
  const actualizarRecordatorio = useCallback(async (id, datosActualizados) => {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const { error } = await supabase
        .from('recordatorios')
        .update(datosActualizados)
        .eq('id', id)
        .eq('usuario_id', userId);

      if (error) {
        console.error('Error al actualizar recordatorio:', error);
        throw error;
      }

      // Actualizar estado local
      const nuevosRecordatorios = recordatorios.map(r => 
        r.id === id ? { ...r, ...datosActualizados } : r
      );
      setRecordatorios(nuevosRecordatorios);
      
      // Actualizar localStorage
      localStorage.setItem('micaja_recordatorios', JSON.stringify(nuevosRecordatorios));
      
      return true;
    } catch (error) {
      console.error('Error al actualizar recordatorio:', error);
      alert('❌ Error al actualizar el recordatorio. Intenta nuevamente.');
      throw error;
    }
  }, [recordatorios]);

  // Eliminar recordatorio
  const eliminarRecordatorio = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('recordatorios')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar recordatorio:', error);
        throw error;
      }

      // Actualizar estado local
      const nuevosRecordatorios = recordatorios.filter(r => r.id !== id);
      setRecordatorios(nuevosRecordatorios);
      
      // Actualizar localStorage
      localStorage.setItem('micaja_recordatorios', JSON.stringify(nuevosRecordatorios));
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
      alert('❌ Error al eliminar el recordatorio. Intenta nuevamente.');
    }
  }, [recordatorios]);

  // Marcar como ejecutado
  const marcarEjecutado = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('recordatorios')
        .update({ estado: 'ejecutado' })
        .eq('id', id);

      if (error) {
        console.error('Error al marcar como ejecutado:', error);
        throw error;
      }

      // Actualizar estado local
      const nuevosRecordatorios = recordatorios.map(r => 
        r.id === id ? { ...r, estado: 'ejecutado' } : r
      );
      setRecordatorios(nuevosRecordatorios);
      
      // Actualizar localStorage
      localStorage.setItem('micaja_recordatorios', JSON.stringify(nuevosRecordatorios));
      
      if (alarmaActiva?.id === id) {
        setAlarmaActiva(null);
      }
    } catch (error) {
      console.error('Error al marcar como ejecutado:', error);
      alert('❌ Error al actualizar el recordatorio. Intenta nuevamente.');
    }
  }, [alarmaActiva, recordatorios]);

  // Postergar alarma
  const postergarAlarma = useCallback(async (id, minutos) => {
    try {
      const recordatorio = recordatorios.find(r => r.id === id);
      if (!recordatorio) return;

      // Calcular nueva hora
      const [horas, mins] = recordatorio.hora.split(':').map(Number);
      const fecha = new Date(recordatorio.anio, recordatorio.mes, recordatorio.dia, horas, mins);
      fecha.setMinutes(fecha.getMinutes() + minutos);

      const nuevaData = {
        dia: fecha.getDate(),
        mes: fecha.getMonth(),
        anio: fecha.getFullYear(),
        hora: `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`,
        fecha: `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`
      };

      const { error } = await supabase
        .from('recordatorios')
        .update(nuevaData)
        .eq('id', id);

      if (error) {
        console.error('Error al postergar alarma:', error);
        throw error;
      }

      // Actualizar estado local
      const nuevosRecordatorios = recordatorios.map(r => 
        r.id === id ? { ...r, ...nuevaData } : r
      );
      setRecordatorios(nuevosRecordatorios);
      
      // Actualizar localStorage
      localStorage.setItem('micaja_recordatorios', JSON.stringify(nuevosRecordatorios));
      
      setAlarmaActiva(null);
    } catch (error) {
      console.error('Error al postergar alarma:', error);
      alert('❌ Error al postergar la alarma. Intenta nuevamente.');
    }
  }, [recordatorios]);

  // Cerrar alarma activa sin marcar como ejecutado
  const cerrarAlarmaActiva = useCallback(() => {
    setAlarmaActiva(null);
  }, []);

  const value = {
    recordatorios,
    alarmaActiva,
    isLoading,
    agregarRecordatorio,
    actualizarRecordatorio,
    eliminarRecordatorio,
    marcarEjecutado,
    postergarAlarma,
    cerrarAlarmaActiva,
    cargarRecordatorios
  };

  return (
    <AlarmasContext.Provider value={value}>
      {children}
    </AlarmasContext.Provider>
  );
};
