import { useEffect, useCallback } from 'react';
import { sessionManager } from './sessionManager.js';

/**
 * Hook personalizado para gestionar datos de sesión y reactividad
 * @param {Function} reloadDataCallback - Función para recargar datos del componente
 * @param {string} componentName - Nombre del componente para logging
 */
export function useSessionData(reloadDataCallback, componentName = 'Component') {
  
  const handleSessionChange = useCallback((event, session, extra) => {
    console.log(`🔄 ${componentName}: Cambio de sesión detectado:`, event);
    
    if (event === 'SIGNED_OUT') {
      console.log(`🧹 ${componentName}: Limpiando datos tras logout`);
      if (typeof reloadDataCallback === 'function') {
        reloadDataCallback();
      }
    } else if (event === 'SIGNED_IN') {
      console.log(`🔄 ${componentName}: Recargando datos tras login`);
      if (typeof reloadDataCallback === 'function') {
        // Esperar un poco para que se complete la autenticación
        setTimeout(reloadDataCallback, 100);
      }
    } else if (event === 'TOKEN_REFRESHED') {
      console.log(`🔄 ${componentName}: Token renovado, verificando datos`);
      if (typeof reloadDataCallback === 'function') {
        reloadDataCallback();
      }
    }
  }, [reloadDataCallback, componentName]);

  useEffect(() => {
    // Suscribirse a cambios de sesión
    const unsubscribe = sessionManager.subscribe(handleSessionChange);
    
    // Verificar si necesita recargar datos tras login
    const currentUserId = sessionManager.getCurrentUserId();
    if (currentUserId && sessionManager.needsRefresh(currentUserId)) {
      console.log(`🔄 ${componentName}: Datos marcados para recargar tras login`);
      if (typeof reloadDataCallback === 'function') {
        reloadDataCallback();
        sessionManager.markAsRefreshed(currentUserId);
      }
    }

    return unsubscribe;
  }, [handleSessionChange, reloadDataCallback, componentName]);

  return {
    // Función para marcar que los datos necesitan ser recargados
    markForRefresh: () => {
      const currentUserId = sessionManager.getCurrentUserId();
      if (currentUserId) {
        sessionManager.invalidateUserData(currentUserId);
      }
    },
    
    // Función para obtener datos específicos del usuario actual
    getUserData: (key) => {
      return sessionManager.getUserData(key);
    },
    
    // Función para guardar datos específicos del usuario actual
    setUserData: (key, data) => {
      return sessionManager.setUserData(key, data);
    },
    
    // Función para limpiar datos específicos del usuario actual
    removeUserData: (key) => {
      return sessionManager.removeUserData(key);
    }
  };
}
