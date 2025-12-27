/**
 * Utilidad centralizada para logs en la aplicación
 * Los logs solo se mostrarán en modo desarrollo, no en producción
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log informativo (solo en desarrollo)
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log de error (siempre se muestra, pero con más detalle en desarrollo)
   */
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    } else {
      // En producción, solo mostrar un mensaje genérico
      console.error('Se produjo un error. Por favor, contacta al soporte.');
    }
  },

  /**
   * Log de advertencia (solo en desarrollo)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log de información (solo en desarrollo)
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Log de debug con emoji (solo en desarrollo)
   */
  debug: (emoji, ...args) => {
    if (isDev) {
      console.log(emoji, ...args);
    }
  }
};

