/**
 * ============================================
 * SERVICIO DE ALERTAS DE STOCK BAJO
 * Mi Caja - Sistema de Gestión de Inventario
 * ============================================
 * 
 * Este servicio maneja:
 * - Detección de insumos con stock crítico (≤ 5)
 * - Gestión de alertas en Supabase
 * - Aplazamiento de alertas (15min, 1hr, mañana)
 * - Reproducción de sonido de alerta
 */

import { supabase } from './supabaseClient';

// Constantes
const UMBRAL_STOCK_CRITICO = 5;
const RUTA_SONIDO_ALERTA = '/sounds/alerta-stock.wav';

/**
 * Calcula la fecha/hora de aplazamiento según el tipo seleccionado
 * @param {string} tipo - '15min', '1hora', o 'manana'
 * @returns {Date} Fecha/hora calculada
 */
export function calcularFechaAplazamiento(tipo) {
  const ahora = new Date();
  
  switch (tipo) {
    case '15min':
      ahora.setMinutes(ahora.getMinutes() + 15);
      break;
    
    case '1hora':
      ahora.setHours(ahora.getHours() + 1);
      break;
    
    case 'manana':
      // Mañana a las 9:00 AM
      const manana = new Date(ahora);
      manana.setDate(manana.getDate() + 1);
      manana.setHours(9, 0, 0, 0);
      return manana;
    
    default:
      throw new Error(`Tipo de aplazamiento inválido: ${tipo}`);
  }
  
  return ahora;
}

/**
 * Analiza el array de insumos y retorna aquellos con stock crítico
 * @param {Array} insumos - Array de insumos con su stock disponible
 * @returns {Array} Array de insumos con stock ≤ 5
 */
export function detectarInsumosCriticos(insumos) {
  if (!Array.isArray(insumos)) {
    console.warn('detectarInsumosCriticos: se esperaba un array de insumos');
    return [];
  }
  
  return insumos
    .filter(insumo => {
      const stock = parseFloat(insumo.stock_disponible || 0);
      return stock <= UMBRAL_STOCK_CRITICO && stock >= 0;
    })
    .map(insumo => ({
      id: insumo.id,
      ingrediente: insumo.ingrediente,
      stock_disponible: parseFloat(insumo.stock_disponible || 0),
      unidad: insumo.unidad || 'unidad'
    }))
    .sort((a, b) => a.stock_disponible - b.stock_disponible); // Ordenar por stock (más crítico primero)
}

/**
 * Reproduce el sonido de alerta
 * @returns {Promise<void>}
 */
export async function reproducirSonidoAlerta() {
  try {
    // Verificar si los sonidos están habilitados en la configuración del usuario
    const soundsPref = localStorage.getItem('soundsEnabled');
    if (soundsPref === 'false') {
      // Sonidos desactivados por el usuario
      return;
    }
    
    const audio = new Audio(RUTA_SONIDO_ALERTA);
    audio.volume = 0.7; // 70% de volumen
    await audio.play();
  } catch (error) {
    console.error('Error al reproducir sonido de alerta:', error);
    // No lanzar error - la alerta visual debe mostrarse aunque falle el sonido
  }
}

/**
 * Obtiene la alerta activa del usuario actual
 * @param {string} usuarioId - UUID del usuario
 * @returns {Promise<Object|null>} Alerta activa o null
 */
export async function obtenerAlertaActiva(usuarioId) {
  try {
    const { data, error } = await supabase
      .rpc('get_alerta_stock_activa', { p_usuario_id: usuarioId });
    
    if (error) throw error;
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error al obtener alerta activa:', error);
    return null;
  }
}

/**
 * Crea o actualiza una alerta de stock bajo
 * @param {string} usuarioId - UUID del usuario
 * @param {Array} insumosCriticos - Array de insumos con stock bajo
 * @returns {Promise<Object>} Alerta creada/actualizada
 */
export async function crearOActualizarAlerta(usuarioId, insumosCriticos) {
  if (!usuarioId) {
    throw new Error('usuarioId es requerido');
  }
  
  if (!Array.isArray(insumosCriticos) || insumosCriticos.length === 0) {
    throw new Error('Se requiere al menos un insumo crítico');
  }
  
  try {
    // Buscar si ya existe una alerta activa
    const alertaExistente = await obtenerAlertaActiva(usuarioId);
    
    if (alertaExistente) {
      // Actualizar la alerta existente
      const { data, error } = await supabase
        .from('alertas_stock_bajo')
        .update({
          insumos_criticos: insumosCriticos,
          ultima_notificacion: new Date().toISOString(),
          estado: 'activa',
          aplazada_hasta: null,
          tipo_aplazamiento: null
        })
        .eq('id', alertaExistente.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Crear nueva alerta
      const { data, error } = await supabase
        .from('alertas_stock_bajo')
        .insert({
          usuario_id: usuarioId,
          estado: 'activa',
          insumos_criticos: insumosCriticos,
          ultima_notificacion: new Date().toISOString(),
          veces_aplazada: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error al crear/actualizar alerta:', error);
    throw error;
  }
}

/**
 * Aplaza una alerta por el tiempo especificado
 * @param {number} alertaId - ID de la alerta
 * @param {string} tipoAplazamiento - '15min', '1hora', o 'manana'
 * @returns {Promise<Object>} Alerta actualizada
 */
export async function aplazarAlerta(alertaId, tipoAplazamiento) {
  if (!alertaId) {
    throw new Error('alertaId es requerido');
  }
  
  if (!['15min', '1hora', 'manana'].includes(tipoAplazamiento)) {
    throw new Error('tipoAplazamiento inválido');
  }
  
  try {
    const fechaAplazamiento = calcularFechaAplazamiento(tipoAplazamiento);

    const { data: alertaActual, error: errorLectura } = await supabase
      .from('alertas_stock_bajo')
      .select('veces_aplazada')
      .eq('id', alertaId)
      .single();

    if (errorLectura) throw errorLectura;

    const { data, error } = await supabase
      .from('alertas_stock_bajo')
      .update({
        estado: 'aplazada',
        aplazada_hasta: fechaAplazamiento.toISOString(),
        tipo_aplazamiento: tipoAplazamiento,
        veces_aplazada: (alertaActual?.veces_aplazada || 0) + 1
      })
      .eq('id', alertaId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al aplazar alerta:', error);
    throw error;
  }
}

/**
 * Desactiva una alerta permanentemente
 * @param {number} alertaId - ID de la alerta
 * @returns {Promise<Object>} Alerta actualizada
 */
export async function desactivarAlerta(alertaId) {
  if (!alertaId) {
    throw new Error('alertaId es requerido');
  }
  
  try {
    const { data, error } = await supabase
      .from('alertas_stock_bajo')
      .update({
        estado: 'desactivada'
      })
      .eq('id', alertaId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al desactivar alerta:', error);
    throw error;
  }
}

/**
 * Verifica si debe mostrarse una alerta al usuario
 * @param {string} usuarioId - UUID del usuario
 * @param {Array} insumos - Array de insumos para analizar
 * @returns {Promise<Object|null>} Objeto con datos de la alerta o null
 */
export async function verificarYMostrarAlerta(usuarioId, insumos) {
  if (!usuarioId || !Array.isArray(insumos)) {
    return null;
  }
  
  try {
    // 1. Detectar insumos críticos
    const insumosCriticos = detectarInsumosCriticos(insumos);
    
    // 2. Obtener alerta activa/aplazada del usuario
    const alertaActiva = await obtenerAlertaActiva(usuarioId);
    
    // Si no hay insumos críticos, limpiar cualquier alerta existente
    if (insumosCriticos.length === 0) {
      if (alertaActiva && (alertaActiva.estado === 'activa' || alertaActiva.estado === 'aplazada')) {
        // Desactivar la alerta ya que el stock ya no es crítico
        await desactivarAlerta(alertaActiva.id);
        console.log('✅ Alerta desactivada automáticamente: stock ya no es crítico');
      }
      return null;
    }
    
    // 3. Si no hay alerta activa, crear una nueva
    if (!alertaActiva) {
      const nuevaAlerta = await crearOActualizarAlerta(usuarioId, insumosCriticos);
      // No reproducir sonido aquí - lo maneja el Context
      return {
        alerta: nuevaAlerta,
        insumosCriticos,
        debeReproducirSonido: true
      };
    }
    
    // 4. Si hay alerta activa pero está aplazada y aún no llegó el momento
    if (alertaActiva.estado === 'aplazada') {
      const fechaAplazada = new Date(alertaActiva.aplazada_hasta);
      const ahora = new Date();
      
      if (fechaAplazada > ahora) {
        // Aún está aplazada, no mostrar pero actualizar insumos críticos en segundo plano
        await supabase
          .from('alertas_stock_bajo')
          .update({ insumos_criticos: insumosCriticos })
          .eq('id', alertaActiva.id);
        return null;
      }
    }
    
    // 5. Actualizar alerta con nuevos insumos críticos
    const alertaActualizada = await crearOActualizarAlerta(usuarioId, insumosCriticos);
    // No reproducir sonido aquí - lo maneja el Context
    
    return {
      alerta: alertaActualizada,
      insumosCriticos,
      debeReproducirSonido: true
    };
    
  } catch (error) {
    console.error('Error en verificarYMostrarAlerta:', error);
    return null;
  }
}

/**
 * Formatea un mensaje de alerta con la lista de insumos críticos
 * @param {Array} insumosCriticos - Array de insumos con stock bajo
 * @returns {string} Mensaje formateado
 */
export function formatearMensajeAlerta(insumosCriticos) {
  if (!Array.isArray(insumosCriticos) || insumosCriticos.length === 0) {
    return 'Hay insumos con stock bajo';
  }
  
  if (insumosCriticos.length === 1) {
    const insumo = insumosCriticos[0];
    return `${insumo.ingrediente}: ${insumo.stock_disponible} ${insumo.unidad}`;
  }
  
  return `${insumosCriticos.length} insumos con stock crítico`;
}

// Exportar constantes útiles
export const TIPOS_APLAZAMIENTO = {
  QUINCE_MIN: '15min',
  UNA_HORA: '1hora',
  MANANA: 'manana'
};

export const LABELS_APLAZAMIENTO = {
  '15min': 'Dentro de 15 minutos',
  '1hora': 'Dentro de 1 hora',
  'manana': 'Mañana a las 9:00 AM'
};
