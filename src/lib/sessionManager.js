import { supabase } from './supabaseClient.js';
import { generarClaveCacheFecha } from './dateUtils.js';

/**
 * Gestor de sesión mejorado para evitar mezcla de datos entre usuarios
 * Incluye gestión de cache específico por usuario y fecha
 */
export class SessionManager {
  constructor() {
    this.listeners = new Set();
    this.currentUserId = null;
    this.cachePrefix = 'cache_data_';
    this.setupAuthListener();
  }

  /**
   * Configurar listener de cambios de autenticación
   */
  setupAuthListener() {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.id);
      
      const newUserId = session?.user?.id || null;
      const previousUserId = this.currentUserId;
      
      // Si cambió el usuario o se cerró sesión, limpiar datos
      if (previousUserId && previousUserId !== newUserId) {
        console.log('🧹 Usuario cambió, limpiando datos del usuario anterior:', previousUserId);
        this.clearUserData(previousUserId);
      }
      
      // Actualizar usuario actual
      this.currentUserId = newUserId;
      
      // Notificar a los listeners
      this.notifyListeners(event, session, { previousUserId, newUserId });
      
      // Si se cerró sesión, limpiar todo
      if (event === 'SIGNED_OUT') {
        this.clearAllData();
      }
      
      // Si se inició sesión, invalidar datos
      if (event === 'SIGNED_IN' && newUserId) {
        this.invalidateUserData(newUserId);
      }
    });
  }

  /**
   * Suscribirse a cambios de sesión
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Retornar función para desuscribirse
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notificar a todos los listeners
   */
  notifyListeners(event, session, extra = {}) {
    this.listeners.forEach(listener => {
      try {
        listener(event, session, extra);
      } catch (error) {
        console.error('Error en listener de sesión:', error);
      }
    });
  }

  /**
   * Generar clave única por usuario
   */
  getUserKey(userId, key) {
    return `${key}:${userId}`;
  }

  /**
   * Obtener clave para el usuario actual
   */
  getCurrentUserKey(key) {
    if (!this.currentUserId) {
      throw new Error('No hay usuario autenticado');
    }
    return this.getUserKey(this.currentUserId, key);
  }

  /**
   * Guardar datos específicos del usuario en localStorage
   */
  setUserData(key, data, userId = null) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      console.warn('No se puede guardar datos sin usuario autenticado');
      return;
    }
    
    const userKey = this.getUserKey(targetUserId, key);
    try {
      localStorage.setItem(userKey, JSON.stringify(data));
      console.log(`💾 Datos guardados para usuario ${targetUserId}:`, userKey);
    } catch (error) {
      console.error('Error guardando datos del usuario:', error);
    }
  }

  /**
   * Obtener datos específicos del usuario desde localStorage
   */
  getUserData(key, userId = null) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      console.warn('No se puede obtener datos sin usuario autenticado');
      return null;
    }
    
    const userKey = this.getUserKey(targetUserId, key);
    try {
      const data = localStorage.getItem(userKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error obteniendo datos del usuario:', error);
      return null;
    }
  }

  /**
   * Eliminar datos específicos del usuario
   */
  removeUserData(key, userId = null) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      return;
    }
    
    const userKey = this.getUserKey(targetUserId, key);
    localStorage.removeItem(userKey);
    console.log(`🗑️ Datos eliminados para usuario ${targetUserId}:`, userKey);
  }

  /**
   * Limpiar todos los datos de un usuario específico
   */
  clearUserData(userId) {
    const keysToRemove = [];
    const userPrefix = `${userId}`;
    
    // Buscar todas las claves que pertenecen al usuario
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`:${userPrefix}`)) {
        keysToRemove.push(key);
      }
    }
    
    // Eliminar todas las claves del usuario
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Eliminado:`, key);
    });
    
    console.log(`🧹 Limpiados ${keysToRemove.length} elementos del usuario ${userId}`);
  }

  /**
   * Limpiar todos los datos de la aplicación
   */
  clearAllData() {
    const keysToRemove = [];
    
    // Buscar todas las claves que son de la aplicación (con patrón key:userId y cache)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes(':') || key.startsWith(this.cachePrefix))) {
        keysToRemove.push(key);
      }
    }
    
    // También limpiar claves legacy sin patrón de usuario
    const legacyKeys = ['usuario_data', 'nombre_usuario', 'usuario_id'];
    keysToRemove.push(...legacyKeys);
    
    // Eliminar todas las claves
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Limpiar sessionStorage también
    sessionStorage.clear();
    
    console.log(`🧹 Limpieza completa (incluye cache): ${keysToRemove.length} elementos eliminados`);
  }

  /**
   * Invalidar datos del usuario tras login
   */
  invalidateUserData(userId) {
    console.log(`🔄 Invalidando datos para usuario ${userId}`);
    
    // Aquí puedes agregar lógica para invalidar caches específicos
    // Por ejemplo, eliminar datos temporales o flags de cache
    this.removeUserData('cache_timestamp', userId);
    this.removeUserData('last_sync', userId);
    
    // Marcar como necesario recargar datos
    this.setUserData('needs_refresh', true, userId);
  }

  /**
   * Verificar si el usuario necesita recargar datos
   */
  needsRefresh(userId = null) {
    return this.getUserData('needs_refresh', userId) === true;
  }

  /**
   * Marcar que los datos han sido recargados
   */
  markAsRefreshed(userId = null) {
    this.removeUserData('needs_refresh', userId);
    this.setUserData('last_refresh', Date.now(), userId);
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUserId() {
    return this.currentUserId;
  }

  /**
   * Forzar recarga completa de la aplicación (útil para logout)
   */
  forceReload() {
    console.log('🔄 Forzando recarga completa de la aplicación');
    window.location.reload();
  }

  // ===== MÉTODOS DE CACHE ESPECÍFICOS POR USUARIO Y FECHA =====

  /**
   * Generar clave de cache específica por usuario y fecha
   * @param {string} userId - ID del usuario
   * @param {string} tipo - Tipo de datos (ventas, inventario, etc.)
   * @param {string} fecha - Fecha opcional para cache específico por día
   * @returns {string} Clave de cache
   */
  generarClaveCache(userId, tipo, fecha = null) {
    return generarClaveCacheFecha(userId, tipo, fecha);
  }

  /**
   * Guardar datos en cache específico por usuario
   * @param {string} userId - ID del usuario
   * @param {string} tipo - Tipo de datos
   * @param {any} data - Datos a cachear
   * @param {string} fecha - Fecha opcional
   */
  setCacheData(userId, tipo, data, fecha = null) {
    if (!userId || !tipo) {
      console.warn('⚠️ No se puede guardar cache sin userId o tipo');
      return;
    }

    const clave = this.generarClaveCache(userId, tipo, fecha);
    const cacheKey = `${this.cachePrefix}${clave}`;
    
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        userId,
        tipo,
        fecha
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      console.log(`💾 Cache guardado: ${cacheKey}`);
    } catch (error) {
      console.error('❌ Error al guardar cache:', error);
    }
  }

  /**
   * Obtener datos del cache específico por usuario
   * @param {string} userId - ID del usuario
   * @param {string} tipo - Tipo de datos
   * @param {string} fecha - Fecha opcional
   * @param {number} maxAge - Edad máxima en milisegundos (por defecto 5 minutos)
   * @returns {any|null} Datos del cache o null si no existe o expiró
   */
  getCacheData(userId, tipo, fecha = null, maxAge = 5 * 60 * 1000) {
    if (!userId || !tipo) {
      console.warn('⚠️ No se puede obtener cache sin userId o tipo');
      return null;
    }

    const clave = this.generarClaveCache(userId, tipo, fecha);
    const cacheKey = `${this.cachePrefix}${clave}`;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      
      // Verificar si el cache es del usuario correcto
      if (cacheItem.userId !== userId) {
        console.warn('⚠️ Cache de usuario diferente, eliminando');
        localStorage.removeItem(cacheKey);
        return null;
      }

      // Verificar edad del cache
      const age = Date.now() - cacheItem.timestamp;
      if (age > maxAge) {
        console.log(`⏰ Cache expirado (${Math.round(age/1000)}s), eliminando: ${cacheKey}`);
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`🎯 Cache válido encontrado: ${cacheKey}`);
      return cacheItem.data;
    } catch (error) {
      console.error('❌ Error al leer cache:', error);
      localStorage.removeItem(cacheKey);
      return null;
    }
  }

  /**
   * Limpiar cache específico de un usuario
   * @param {string} userId - ID del usuario
   * @param {string} tipo - Tipo específico o null para todos
   */
  clearUserCache(userId, tipo = null) {
    if (!userId) {
      console.warn('⚠️ No se puede limpiar cache sin userId');
      return;
    }

    const prefix = tipo 
      ? `${this.cachePrefix}${tipo}:${userId}`
      : `${this.cachePrefix}`;

    let removedCount = 0;
    
    // Iterar todas las claves de localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          // Si especificamos tipo, verificar que coincida exactamente
          if (tipo) {
            const expectedKey = `${this.cachePrefix}${this.generarClaveCache(userId, tipo)}`;
            if (key.startsWith(expectedKey)) {
              localStorage.removeItem(key);
              removedCount++;
            }
          } else {
            // Sin tipo específico, verificar que sea del usuario correcto
            const cached = localStorage.getItem(key);
            if (cached) {
              const cacheItem = JSON.parse(cached);
              if (cacheItem.userId === userId) {
                localStorage.removeItem(key);
                removedCount++;
              }
            }
          }
        } catch (error) {
          // Remover cache corrupto
          localStorage.removeItem(key);
          removedCount++;
        }
      }
    });

    console.log(`🧹 Cache limpiado para usuario ${userId}: ${removedCount} items`);
  }

  /**
   * Limpiar todo el cache de la aplicación
   */
  clearAllCache() {
    let removedCount = 0;
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.cachePrefix)) {
        localStorage.removeItem(key);
        removedCount++;
      }
    });

    console.log(`🧹 Todo el cache limpiado: ${removedCount} items`);
  }

  /**
   * Obtener estadísticas del cache
   * @param {string} userId - ID del usuario (opcional)
   * @returns {object} Estadísticas del cache
   */
  getCacheStats(userId = null) {
    const stats = {
      total: 0,
      byUser: {},
      byType: {},
      totalSize: 0
    };

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.cachePrefix)) {
        try {
          const cached = localStorage.getItem(key);
          const cacheItem = JSON.parse(cached);
          
          stats.total++;
          stats.totalSize += cached.length;
          
          // Estadísticas por usuario
          if (!stats.byUser[cacheItem.userId]) {
            stats.byUser[cacheItem.userId] = 0;
          }
          stats.byUser[cacheItem.userId]++;
          
          // Estadísticas por tipo
          if (!stats.byType[cacheItem.tipo]) {
            stats.byType[cacheItem.tipo] = 0;
          }
          stats.byType[cacheItem.tipo]++;
          
        } catch (error) {
          // Contar cache corrupto
          stats.total++;
        }
      }
    });

    return stats;
  }
}

// Crear instancia singleton
export const sessionManager = new SessionManager();
