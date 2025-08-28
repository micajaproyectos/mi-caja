import { useEffect, useCallback, useRef } from 'react';
import { sessionManager } from './sessionManager.js';

/**
 * Hook personalizado para gestionar datos de sesión y reactividad
 * Optimizado para evitar bucles de recarga y logs repetitivos
 * @param {Function} reloadDataCallback - Función para recargar datos del componente
 * @param {string} componentName - Nombre del componente para logging
 * @param {string} dataType - Tipo de datos ('ventas', 'inventario', 'perfil', etc.)
 */
export function useSessionData(reloadDataCallback, componentName = 'Component', dataType = 'general') {
  const didInitRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const isProduction = process.env.NODE_ENV === 'production';
  
  const handleSessionChange = useCallback((event, session, extra) => {
    const { previousUserId, newUserId } = extra || {};
    
    // Solo procesar si hay cambio real de usuario
    if (previousUserId === newUserId && event !== 'SIGNED_OUT') {
      return;
    }

    if (event === 'SIGNED_OUT') {
      if (!isProduction) {
        console.log(`🧹 ${componentName}: Limpiando datos tras logout`);
      }
      if (typeof reloadDataCallback === 'function') {
        reloadDataCallback();
      }
    } else if (event === 'SIGNED_IN' && newUserId && newUserId !== lastUserIdRef.current) {
      if (!isProduction) {
        console.log(`🔄 ${componentName}: Recargando datos tras login para usuario ${newUserId}`);
      }
      if (typeof reloadDataCallback === 'function') {
        // Esperar un poco para que se complete la autenticación
        setTimeout(() => {
          if (!isFetchingRef.current) {
            isFetchingRef.current = true;
            reloadDataCallback();
            isFetchingRef.current = false;
          }
        }, 100);
      }
    } else if (event === 'TOKEN_REFRESHED') {
      if (!isProduction) {
        console.log(`🔄 ${componentName}: Token renovado, verificando datos`);
      }
      // Solo recargar si no está en proceso
      if (typeof reloadDataCallback === 'function' && !isFetchingRef.current) {
        isFetchingRef.current = true;
        reloadDataCallback();
        isFetchingRef.current = false;
      }
    }
  }, [reloadDataCallback, componentName, isProduction]);

  useEffect(() => {
    // Suscribirse a cambios de sesión
    const unsubscribe = sessionManager.subscribe(handleSessionChange);
    
    // Verificar si necesita recargar datos tras login (solo una vez)
    const currentUserId = sessionManager.getCurrentUserId();
    if (currentUserId && !didInitRef.current && sessionManager.needsRefresh(currentUserId)) {
      if (typeof reloadDataCallback === 'function' && !isFetchingRef.current) {
        isFetchingRef.current = true;
        reloadDataCallback();
        sessionManager.markAsRefreshed(currentUserId);
        isFetchingRef.current = false;
      }
      didInitRef.current = true;
    }

    // Actualizar referencia del usuario
    lastUserIdRef.current = currentUserId;

    return unsubscribe;
  }, [handleSessionChange, reloadDataCallback, componentName, isProduction]);

  // Efecto separado para cambios de usuario (evita recargas innecesarias)
  useEffect(() => {
    const currentUserId = sessionManager.getCurrentUserId();
    
    // Solo recargar si cambió el usuario y no estamos ya cargando
    if (currentUserId && currentUserId !== lastUserIdRef.current && !isFetchingRef.current) {
      if (!isProduction) {
        console.log(`🔄 ${componentName}: Usuario cambió, recargando datos para ${currentUserId}`);
      }
      lastUserIdRef.current = currentUserId;
      
      if (typeof reloadDataCallback === 'function') {
        isFetchingRef.current = true;
        reloadDataCallback();
        isFetchingRef.current = false;
      }
    }
  }, [sessionManager.getCurrentUserId(), reloadDataCallback, componentName, isProduction]);

  return {
    // Función para marcar que los datos necesitan ser recargados
    markForRefresh: () => {
      const currentUserId = sessionManager.getCurrentUserId();
      if (currentUserId && !sessionManager.needsRefresh(currentUserId)) {
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
    },

    // Función para verificar si está cargando
    isLoading: () => isFetchingRef.current,

    // Función para obtener el usuario actual
    getCurrentUserId: () => sessionManager.getCurrentUserId()
  };
}
