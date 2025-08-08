import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../lib/authService.js';
import { supabase } from '../lib/supabaseClient.js';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({ nombre: '', email: '', createdAt: '' });
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
  const openProfile = () => {
    setIsProfileOpen(true);
    closeMenu();
  };

  const closeProfile = () => setIsProfileOpen(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const profile = await authService.getCurrentUser();
        const { data: authData } = await supabase.auth.getUser();
        const createdAtRaw = authData?.user?.created_at || '';

        const formatDate = (iso) => {
          if (!iso) return '';
          const d = new Date(iso);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        setUserInfo({
          nombre: profile?.nombre || '',
          email: profile?.email || authData?.user?.email || '',
          createdAt: formatDate(createdAtRaw)
        });
      } catch (e) {
        // Silenciar errores y dejar datos vacíos
        setUserInfo({ nombre: '', email: '', createdAt: '' });
      }
    };
    loadUser();
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
              className="px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 font-medium"
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              Cerrar Sesión
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
              <div>
                <p className="text-xs text-gray-300">Nombre</p>
                <p className="font-medium">{userInfo.nombre || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-300">Correo electrónico</p>
                <p className="font-medium break-all">{userInfo.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-300">Fecha de creación</p>
                <p className="font-medium">{userInfo.createdAt || '—'}</p>
              </div>
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
    </>
  );
};

export default NavBar; 