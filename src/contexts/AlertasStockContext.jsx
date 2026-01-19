import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService';
import { 
  verificarYMostrarAlerta, 
  detectarInsumosCriticos,
  crearOActualizarAlerta,
  reproducirSonidoAlerta 
} from '../lib/alertasStockService';

const AlertasStockContext = createContext();

export const useAlertasStock = () => {
  const context = useContext(AlertasStockContext);
  if (!context) {
    throw new Error('useAlertasStock debe usarse dentro de AlertasStockProvider');
  }
  return context;
};

export const AlertasStockProvider = ({ children }) => {
  const [alertaActiva, setAlertaActiva] = useState(null);
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [insumosCriticos, setInsumosCriticos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs para controlar timers y evitar verificaciones duplicadas
  const intervaloVerificacionRef = useRef(null);
  const ultimaVerificacionRef = useRef(null);
  const timeoutReaparicionRef = useRef(null);

  // Configuración: Intervalo de verificación (5 minutos)
  const INTERVALO_VERIFICACION = 5 * 60 * 1000; // 5 minutos en ms
  const RETRASO_INICIAL = 3000; // 3 segundos después de cargar la app

  /**
   * Función principal que verifica si hay stock crítico y debe mostrar alerta
   */
  const verificarStockCritico = useCallback(async (forzarSonido = false) => {
    try {
      // Evitar verificaciones duplicadas muy seguidas (mínimo 10 segundos entre verificaciones)
      const ahora = Date.now();
      if (ultimaVerificacionRef.current && (ahora - ultimaVerificacionRef.current) < 10000) {
        if (import.meta.env.DEV) {
          console.log('⏸️ Alerta Stock: Verificación omitida (muy reciente)');
        }
        return;
      }
      ultimaVerificacionRef.current = ahora;

      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        if (import.meta.env.DEV) {
          console.log('⚠️ Alerta Stock: Usuario no autenticado');
        }
        return;
      }

      // Cargar insumos desde la vista de stock
      const { data: insumos, error } = await supabase
        .from('vista_stock_insumos')
        .select('*')
        .eq('usuario_id', usuarioId);

      if (error) {
        console.error('Error al cargar insumos para verificación:', error);
        return;
      }

      if (!insumos || insumos.length === 0) {
        if (import.meta.env.DEV) {
          console.log('📦 Alerta Stock: No hay insumos registrados');
        }
        return;
      }

      // Transformar formato de datos
      const insumosFormateados = insumos.map(insumo => ({
        id: insumo.id,
        ingrediente: insumo.nombre_insumo,
        stock_disponible: parseFloat(insumo.stock_disponible || 0),
        unidad: insumo.unidad || 'unidad'
      }));

      // Detectar insumos críticos
      const criticos = detectarInsumosCriticos(insumosFormateados);

      if (criticos.length === 0) {
        if (import.meta.env.DEV) {
          console.log('✅ Alerta Stock: No hay insumos críticos');
        }
        // Si no hay críticos, limpiar cualquier alerta activa
        setAlertaActiva(null);
        setMostrarPopup(false);
        setInsumosCriticos([]);
        return;
      }

      if (import.meta.env.DEV) {
        console.log(`🚨 Alerta Stock: ${criticos.length} insumo(s) crítico(s) detectado(s)`);
      }

      // Verificar con el servicio si debe mostrar la alerta
      const resultado = await verificarYMostrarAlerta(usuarioId, insumosFormateados);

      if (resultado && resultado.alerta) {
        setAlertaActiva(resultado.alerta);
        setInsumosCriticos(resultado.insumosCriticos);
        setMostrarPopup(true);

        // Reproducir sonido solo si se fuerza o si es la primera vez
        if (forzarSonido || resultado.debeReproducirSonido) {
          await reproducirSonidoAlerta();
        }
      }

    } catch (error) {
      console.error('Error en verificarStockCritico:', error);
    }
  }, []);

  /**
   * Inicia el sistema de verificación periódica
   */
  const iniciarVerificacionPeriodica = useCallback(() => {
    // Limpiar intervalo anterior si existe
    if (intervaloVerificacionRef.current) {
      clearInterval(intervaloVerificacionRef.current);
    }

    // Primera verificación después de un pequeño retraso
    setTimeout(() => {
      verificarStockCritico(true);
    }, RETRASO_INICIAL);

    // Luego verificar cada 5 minutos
    intervaloVerificacionRef.current = setInterval(() => {
      if (import.meta.env.DEV) {
        console.log('⏰ Alerta Stock: Verificación periódica automática');
      }
      verificarStockCritico(true);
    }, INTERVALO_VERIFICACION);

    if (import.meta.env.DEV) {
      console.log('🔄 Sistema de alertas de stock iniciado (verificación cada 5 minutos)');
    }
  }, [verificarStockCritico, INTERVALO_VERIFICACION, RETRASO_INICIAL]);

  /**
   * Detiene el sistema de verificación periódica
   */
  const detenerVerificacionPeriodica = useCallback(() => {
    if (intervaloVerificacionRef.current) {
      clearInterval(intervaloVerificacionRef.current);
      intervaloVerificacionRef.current = null;
    }
    if (timeoutReaparicionRef.current) {
      clearTimeout(timeoutReaparicionRef.current);
      timeoutReaparicionRef.current = null;
    }
  }, []);

  /**
   * Maneja el cierre del popup (sin aplazar)
   * La alerta volverá a aparecer en 5 minutos
   */
  const cerrarPopup = useCallback(() => {
    setMostrarPopup(false);
    
    // Programar reaparición en 5 minutos si sigue habiendo stock crítico
    if (timeoutReaparicionRef.current) {
      clearTimeout(timeoutReaparicionRef.current);
    }

    timeoutReaparicionRef.current = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.log('🔁 Alerta Stock: Re-verificación después de cerrar sin aplazar');
      }
      verificarStockCritico(true);
    }, INTERVALO_VERIFICACION);

    if (import.meta.env.DEV) {
      console.log('⏰ Alerta cerrada sin aplazar. Volverá a verificar en 5 minutos.');
    }
  }, [verificarStockCritico, INTERVALO_VERIFICACION]);

  /**
   * Maneja el aplazamiento de la alerta
   * La verificación periódica continuará, pero respetará el aplazamiento
   */
  const manejarAplazamiento = useCallback((tipo) => {
    setMostrarPopup(false);
    
    if (import.meta.env.DEV) {
      console.log(`⏸️ Alerta aplazada: ${tipo}`);
    }

    // La verificación periódica continuará, pero el servicio respetará el aplazamiento
    // No hacer nada más, el intervalo seguirá corriendo normalmente
  }, []);

  /**
   * Fuerza una verificación inmediata (útil después de registrar compras)
   */
  const verificarInmediatamente = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 Verificación inmediata forzada');
    }
    verificarStockCritico(false);
  }, [verificarStockCritico]);

  // Iniciar sistema de verificación al montar el componente
  useEffect(() => {
    iniciarVerificacionPeriodica();

    // Cleanup al desmontar - Limpiar TODOS los timers
    return () => {
      detenerVerificacionPeriodica();
      
      // Limpiar timeout de reaparición si existe
      if (timeoutReaparicionRef.current) {
        clearTimeout(timeoutReaparicionRef.current);
        timeoutReaparicionRef.current = null;
      }
    };
  }, [iniciarVerificacionPeriodica, detenerVerificacionPeriodica]);

  // Manejar cambios de visibilidad de la página (tab activo/inactivo)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Página oculta: pausar verificaciones
        if (import.meta.env.DEV) {
          console.log('💤 Página oculta: Pausando verificaciones');
        }
        detenerVerificacionPeriodica();
        
        // Limpiar timeout de reaparición cuando se oculta la página
        if (timeoutReaparicionRef.current) {
          clearTimeout(timeoutReaparicionRef.current);
          timeoutReaparicionRef.current = null;
        }
      } else {
        // Página visible: reanudar verificaciones
        if (import.meta.env.DEV) {
          console.log('👁️ Página visible: Reanudando verificaciones');
        }
        iniciarVerificacionPeriodica();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Limpiar todos los timers al desmontar este listener
      detenerVerificacionPeriodica();
      if (timeoutReaparicionRef.current) {
        clearTimeout(timeoutReaparicionRef.current);
        timeoutReaparicionRef.current = null;
      }
    };
  }, [iniciarVerificacionPeriodica, detenerVerificacionPeriodica]);

  const value = {
    alertaActiva,
    mostrarPopup,
    insumosCriticos,
    isLoading,
    cerrarPopup,
    manejarAplazamiento,
    verificarInmediatamente,
    verificarStockCritico
  };

  return (
    <AlertasStockContext.Provider value={value}>
      {children}
    </AlertasStockContext.Provider>
  );
};
