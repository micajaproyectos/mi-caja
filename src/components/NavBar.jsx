import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../lib/authService.js';
import { sessionManager } from '../lib/sessionManager.js';
import { supabase } from '../lib/supabaseClient.js';
import SubscriptionNotification from './SubscriptionNotification.jsx';
import NewFeaturesNotification from './NewFeaturesNotification.jsx';
import RatingNotification from './RatingNotification.jsx';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({ nombre: '', email: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showSubscriptionNotification, setShowSubscriptionNotification] = useState(false);
  const [showVisualNotification, setShowVisualNotification] = useState(false);
  const [showNewFeaturesNotification, setShowNewFeaturesNotification] = useState(false);
  const [showNewFeaturesVisualNotification, setShowNewFeaturesVisualNotification] = useState(false);
  const [showRatingNotification, setShowRatingNotification] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      authService.clearUserData();
      navigate('/login');
    }
  };

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);
  const openProfile = async () => {
    setIsProfileOpen(true);
    closeMenu();
    
    // Solo cargar datos si no los tenemos ya
    if (!userInfo.nombre && !userInfo.email) {
      setIsLoadingProfile(true);
      try {
        const profile = await authService.getCurrentUser();
        setUserInfo({
          nombre: profile?.nombre || '',
          email: profile?.email || ''
        });
      } catch (e) {
        console.error('Error cargando perfil:', e);
        setUserInfo({ nombre: 'Error', email: 'Error' });
      } finally {
        setIsLoadingProfile(false);
      }
    }
  };

  const closeProfile = () => setIsProfileOpen(false);

  // Función para cerrar la notificación de suscripción
  const closeSubscriptionNotification = () => {
    setShowSubscriptionNotification(false);
    markNotificationAsShown();
    // Activar la notificación visual después de cerrar el popup
    setShowVisualNotification(true);
  };

  // Función para cerrar la notificación de nuevas funcionalidades
  const closeNewFeaturesNotification = () => {
    setShowNewFeaturesNotification(false);
    markNewFeaturesNotificationAsShown();
    // Activar la notificación visual después de cerrar el popup
    setShowNewFeaturesVisualNotification(true);
  };

  // Función para abrir manualmente la notificación de nuevas funcionalidades
  const openNewFeaturesNotification = () => {
    setShowNewFeaturesNotification(true);
    setIsMenuOpen(false); // Cerrar el menú
  };

  // Función para verificar si debe mostrar la notificación de calificación
  const shouldShowRatingNotification = async () => {
    try {
      // Verificar si el usuario está autenticado
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        if (import.meta.env.DEV) {
          console.log('❌ Usuario no autenticado');
        }
        return false;
      }

      // PRIMERO: Verificar si ya calificó en la base de datos (fuente de verdad)
      const { data: hasRated } = await supabase.rpc('usuario_ya_califico', {
        p_usuario_id: currentUser.id
      });

      if (hasRated) {
        if (import.meta.env.DEV) {
          console.log('✅ Usuario ya calificó en la base de datos, no mostrar notificación');
        }
        // Marcar como mostrada para no volver a verificar
        const storageKey = `ratingNotificationShown_${currentUser.id}`;
        localStorage.setItem(storageKey, 'true');
        return false;
      }

      // SEGUNDO: Si no calificó, verificar localStorage solo como referencia
      const storageKey = `ratingNotificationShown_${currentUser.id}`;
      const hasShown = localStorage.getItem(storageKey);
      if (hasShown) {
        if (import.meta.env.DEV) {
          console.log('⚠️ Notificación marcada como mostrada en localStorage, pero usuario no calificó');
          console.log('🔄 Limpiando localStorage y permitiendo mostrar notificación');
        }
        // Limpiar localStorage si el usuario no calificó realmente
        localStorage.removeItem(storageKey);
      }

      if (import.meta.env.DEV) {
        console.log('⭐ Usuario puede calificar:', currentUser.nombre);
      }
      return true;
    } catch (error) {
      console.error('Error al verificar notificación de calificación:', error);
      return false;
    }
  };

  // Función para verificar si debe mostrar la notificación de suscripción
  const shouldShowSubscriptionNotification = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    // Verificar si está en el rango del 28 al fin de mes o del 1 al 5
    const isInNotificationPeriod = day >= 28 || day <= 5;
    
    if (isInNotificationPeriod) {
      // Verificar si ya se mostró hoy (usando localStorage)
      const lastShown = localStorage.getItem('subscriptionNotificationLastShown');
      const todayString = `${year}-${month}-${day}`;
      
      if (lastShown !== todayString) {
        return true;
      }
    }
    return false;
  };

  // Función para verificar si debe mostrar la notificación visual
  const shouldShowVisualNotification = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    // Verificar si está en el rango del 28 al fin de mes o del 1 al 5
    const isInNotificationPeriod = day >= 28 || day <= 5;
    
    if (isInNotificationPeriod) {
      // Verificar si ya se mostró el popup en este periodo
      const lastShown = localStorage.getItem('subscriptionNotificationLastShown');
      if (lastShown) {
        const [lastYear, lastMonth, lastDay] = lastShown.split('-').map(Number);
        // Si se mostró este mes o mes anterior (dependiendo del periodo), mostrar la notificación visual
        if (lastYear === year && lastMonth === month) {
          return true;
        }
        // Si estamos en los primeros 5 días y se mostró el mes anterior
        if (day <= 5 && lastYear === year && lastMonth === month - 1) {
          return true;
        }
      }
    }
    return false;
  };

  // Función para marcar la notificación como mostrada
  const markNotificationAsShown = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    const todayString = `${year}-${month}-${day}`;
    localStorage.setItem('subscriptionNotificationLastShown', todayString);
  };

  // Función para verificar si debe mostrar la notificación de nuevas funcionalidades
  const shouldShowNewFeaturesNotification = () => {
    // Verificar si ya se mostró en esta sesión
    const sessionShown = sessionStorage.getItem('newFeaturesNotificationShown');
    return !sessionShown;
  };

  // Función para verificar si debe mostrar la notificación visual de nuevas funcionalidades
  const shouldShowNewFeaturesVisualNotification = () => {
    // Verificar si ya se mostró el popup en esta sesión pero no se ha ocultado permanentemente
    const sessionShown = sessionStorage.getItem('newFeaturesNotificationShown');
    const permanentlyDismissed = localStorage.getItem('newFeaturesNotificationDismissed');
    return sessionShown && !permanentlyDismissed;
  };

  // Función para marcar la notificación de nuevas funcionalidades como mostrada
  const markNewFeaturesNotificationAsShown = () => {
    sessionStorage.setItem('newFeaturesNotificationShown', 'true');
    // Para ocultar permanentemente la notificación visual después de un tiempo
    setTimeout(() => {
      localStorage.setItem('newFeaturesNotificationDismissed', 'true');
      setShowNewFeaturesVisualNotification(false);
    }, 7 * 24 * 60 * 60 * 1000); // 7 días
  };

  // Cargar datos básicos del usuario al montar el componente
  useEffect(() => {
    const loadBasicUserInfo = async () => {
      try {
        const profile = await authService.getCurrentUser();
        setUserInfo(prev => ({
          ...prev,
          nombre: profile?.nombre || '',
          email: profile?.email || ''
        }));
      } catch (e) {
        console.error('Error cargando datos básicos:', e);
      }
    };
    loadBasicUserInfo();

    // Suscribirse SOLO a cambios de perfil (no a datos de ventas/inventario)
    const unsubscribe = sessionManager.subscribe((event, session, extra) => {
      const { previousUserId, newUserId } = extra || {};
      
      // Solo procesar cambios de perfil del usuario actual
      if (event === 'SIGNED_OUT') {
        setUserInfo({ nombre: '', email: '' });
        if (process.env.NODE_ENV !== 'production') {
          console.log('🧹 NavBar: Datos de usuario limpiados tras logout');
        }
      } else if (event === 'SIGNED_IN' && newUserId && newUserId !== previousUserId) {
        loadBasicUserInfo();
      }
    });

    return unsubscribe;
  }, []);

  // Verificar si debe mostrar las notificaciones al montar el componente
  useEffect(() => {
    // Verificar notificación de suscripción
    if (shouldShowSubscriptionNotification()) {
      setShowSubscriptionNotification(true);
    } else if (shouldShowVisualNotification()) {
      // Si no debe mostrar el popup pero sí la notificación visual
      setShowVisualNotification(true);
    }

    // Verificar notificación de calificación al inicio de sesión
    const checkRatingNotification = async () => {
      if (await shouldShowRatingNotification()) {
        // Pequeño delay para que aparezca después de otras notificaciones
        setTimeout(() => {
          setShowRatingNotification(true);
        }, 2000);
      }
    };
    checkRatingNotification();
  }, []);

  // Escuchar cambios de autenticación para mostrar notificación
  useEffect(() => {
    let hasShownNotification = false;
    let isInitialLoad = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (import.meta.env.DEV) {
        console.log('🔄 Auth event:', event, session?.user?.id);
      }
      
      // Ignorar el primer evento (INITIAL_SESSION) y solo procesar SIGNED_IN real
      if (isInitialLoad) {
        isInitialLoad = false;
        if (import.meta.env.DEV) {
          console.log('⏭️ Ignorando evento inicial, esperando login real');
        }
        return;
      }
      
      // Solo mostrar notificación en SIGNED_IN (login real), no en INITIAL_SESSION
      if (event === 'SIGNED_IN' && session?.user && !hasShownNotification) {
        hasShownNotification = true; // Evitar múltiples ejecuciones
        
        // Esperar un poco para que se complete el login
        setTimeout(async () => {
          if (await shouldShowRatingNotification()) {
            if (import.meta.env.DEV) {
              console.log('🚀 Usuario inició sesión, mostrando notificación de calificación');
            }
            setShowRatingNotification(true);
          }
        }, 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Función para cerrar el popup de notificación cuando se completa la calificación
  useEffect(() => {
    window.onRatingCompleted = () => {
      if (import.meta.env.DEV) {
        console.log('✅ Calificación completada, cerrando popup de notificación');
      }
      setShowRatingNotification(false);
      
      // Marcar que el usuario ya calificó (persiste entre recargas)
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const storageKey = `ratingNotificationShown_${currentUser.id}`;
        localStorage.setItem(storageKey, 'true');
      }
    };
    
    return () => {
      delete window.onRatingCompleted;
    };
  }, []);

  // Verificar notificación de nuevas funcionalidades
  useEffect(() => {
    if (shouldShowNewFeaturesNotification()) {
      // Pequeño delay para que aparezca después de que se cargue la página
      setTimeout(() => {
        setShowNewFeaturesNotification(true);
      }, 1500);
    } else if (shouldShowNewFeaturesVisualNotification()) {
      // Si no debe mostrar el popup pero sí la notificación visual
      setShowNewFeaturesVisualNotification(true);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // No mostrar NavBar en la página de login
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <>
      <div
        className="shadow-lg fixed top-0 left-0 right-0 z-50"
        style={{ backgroundColor: '#1a3d1a', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end h-16 relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 relative"
              style={{
                backgroundColor: '#0a1e0a',
                color: 'white',
                boxShadow: '0 4px 14px rgba(10, 30, 10, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex flex-col space-y-1">
                <div className="w-5 h-0.5 bg-white rounded"></div>
                <div className="w-5 h-0.5 bg-white rounded"></div>
                <div className="w-5 h-0.5 bg-white rounded"></div>
              </div>
              
              {/* Indicador de notificación */}
              {(showVisualNotification || showNewFeaturesVisualNotification) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"
                     style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }}>
                </div>
              )}
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-14 w-72 rounded-2xl shadow-lg border border-white/10 overflow-hidden animate-[fadeIn_150ms_ease-out]"
                style={{
                  backgroundColor: 'rgba(31, 74, 31, 0.95)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div className="p-4">
                  {/* Notificación de suscripción en el menú */}
                  {showVisualNotification && (
                    <div className="mb-4 p-3 rounded-lg border-l-4"
                         style={{ 
                           backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                           borderLeftColor: '#ef4444',
                           border: '1px solid rgba(239, 68, 68, 0.2)'
                         }}>
                      <div className="flex items-center">
                        <span className="text-lg mr-2">🔔</span>
                        <div>
                          <p className="text-white text-xs font-medium">Recordatorio de Suscripción</p>
                          <p className="text-gray-300 text-xs mt-1">
                            No olvides cancelar tu suscripción mensual. Si ya has cancelado omite esta notificación.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notificación de nuevas funcionalidades en el menú */}
                  {showNewFeaturesVisualNotification && (
                    <div className="mb-4 p-3 rounded-lg border-l-4 cursor-pointer hover:bg-white/5 transition-colors"
                         style={{ 
                           backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                           borderLeftColor: '#22c55e',
                           border: '1px solid rgba(34, 197, 94, 0.2)'
                         }}
                         onClick={openNewFeaturesNotification}>
                      <div className="flex items-center">
                        <span className="text-lg mr-2">🎉</span>
                        <div>
                          <p className="text-white text-xs font-medium">¡Nuevas Mejoras Disponibles!</p>
                          <p className="text-gray-300 text-xs mt-1">
                            Descubre las nuevas funciones: Pantalla Completa, Autoservicio e Insumos. ¡Haz clic para ver más!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botón de prueba para notificación de calificación */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowRatingNotification(true)}
                      className="w-full p-2 rounded-lg text-xs font-medium transition-all"
                      style={{ 
                        backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                        color: '#ffc107',
                        border: '1px solid rgba(255, 193, 7, 0.2)'
                      }}
                    >
                      ⭐ Califica tu experiencia con Mi Caja
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-white text-sm font-semibold">{userInfo.nombre || 'Usuario'}</p>
                    <p className="text-gray-300 text-xs break-all">{userInfo.email || ''}</p>
                  </div>
                  <button
                    onClick={openProfile}
                    className="w-full text-left px-4 py-2 rounded-lg mb-2 transition-colors"
                    style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'white', border: '1px solid rgba(239, 68, 68, 0.35)' }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeProfile} />
          <div
            className="relative z-10 w-11/12 max-w-md p-6 rounded-2xl shadow-lg"
            style={{
              backgroundColor: 'rgba(31, 74, 31, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Perfil</h3>
              <p className="text-gray-300 text-sm">Información de tu cuenta</p>
            </div>
                         <div className="space-y-3 text-white">
               {isLoadingProfile ? (
                 <div className="flex items-center justify-center py-4">
                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                   <span className="ml-2 text-gray-300">Cargando...</span>
                 </div>
               ) : (
                                   <>
                    <div>
                      <p className="text-xs text-gray-300">Nombre</p>
                      <p className="font-medium">{userInfo.nombre || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-300">Correo electrónico</p>
                      <p className="font-medium break-all">{userInfo.email || '—'}</p>
                    </div>
                  </>
               )}
             </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeProfile}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Cerrar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: '#ef4444', color: 'white', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de suscripción */}
      {showSubscriptionNotification && (
        <SubscriptionNotification onClose={closeSubscriptionNotification} />
      )}

      {/* Notificación de nuevas funcionalidades */}
      {showNewFeaturesNotification && (
        <NewFeaturesNotification onClose={closeNewFeaturesNotification} />
      )}

      {/* Notificación de calificación */}
      {showRatingNotification && (
        <RatingNotification onClose={(action) => {
          setShowRatingNotification(false);
          
          // Manejar diferentes acciones
          if (action === 'rated') {
            // Si calificó, marcar permanentemente que no debe mostrar más
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
              const storageKey = `ratingNotificationShown_${currentUser.id}`;
              localStorage.setItem(storageKey, 'true');
              if (import.meta.env.DEV) {
                console.log('✅ Usuario calificó, no mostrar más notificaciones');
              }
            }
          } else if (action === 'later') {
            // Si postergó, marcar para no mostrar más (persiste entre recargas)
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
              const storageKey = `ratingNotificationShown_${currentUser.id}`;
              localStorage.setItem(storageKey, 'true');
              if (import.meta.env.DEV) {
                console.log('⏰ Usuario postergó, no mostrar más notificaciones');
              }
            }
          }
        }} />
      )}
    </>
  );
};

export default NavBar; 