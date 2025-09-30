import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../lib/authService.js';
import { sessionManager } from '../lib/sessionManager.js';
import { supabase } from '../lib/supabaseClient.js';
import SubscriptionNotification from './SubscriptionNotification.jsx';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({ nombre: '', email: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showSubscriptionNotification, setShowSubscriptionNotification] = useState(false);
  const [showVisualNotification, setShowVisualNotification] = useState(false);
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

  // Función para verificar si debe mostrar la notificación de suscripción
  const shouldShowSubscriptionNotification = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    // Verificar si es día 29, 30 o 31
    if (day >= 29) {
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
    
    // Verificar si es día 29, 30 o 31
    if (day >= 29) {
      // Verificar si ya se mostró el popup este mes
      const lastShown = localStorage.getItem('subscriptionNotificationLastShown');
      if (lastShown) {
        const [lastYear, lastMonth, lastDay] = lastShown.split('-').map(Number);
        // Si se mostró este mes, mostrar la notificación visual
        if (lastYear === year && lastMonth === month) {
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

  // Verificar si debe mostrar la notificación de suscripción al montar el componente
  useEffect(() => {
    if (shouldShowSubscriptionNotification()) {
      setShowSubscriptionNotification(true);
    } else if (shouldShowVisualNotification()) {
      // Si no debe mostrar el popup pero sí la notificación visual
      setShowVisualNotification(true);
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
              {showVisualNotification && (
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
    </>
  );
};

export default NavBar; 