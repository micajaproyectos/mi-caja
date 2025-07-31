import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
// Intentar diferentes formas de importar el logo
import logo from '../assets/logo.png';
// Alternativa con ruta absoluta para Vite
// import logo from '/src/assets/logo.png';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Debug: verificar que el logo se importó correctamente
  console.log('Logo importado:', logo);

  // Función para detectar si un enlace está activo
  const isActiveLink = (href) => {
    return location.pathname === href || (href === '/' && location.pathname === '/');
  };

  const menuItems = [
    { name: 'Página principal', href: '/', icon: '🏠' },
    { name: 'Registro de Venta', href: '/ventas', icon: '💰' },
    { name: 'Registro de Asistencia', href: '/empleados', icon: '👥' },
    { name: 'Gastos', href: '/gastos', icon: '💸' },
    { name: 'Inventario', href: '/inventario', icon: '📦' },
    { name: 'Stock', href: '/inventario', icon: '📊' },
    { name: 'Proveedores', href: '/proveedores', icon: '🤝' },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Clases base para los enlaces
  const getLinkClasses = (isActive, isMobile = false) => {
    const baseClasses = isMobile 
      ? "block px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm lg:text-base font-medium transition-all duration-200 flex items-center space-x-2 sm:space-x-3"
      : "px-1 sm:px-2 lg:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center space-x-1 sm:space-x-2";
    
    if (isActive) {
      return `${baseClasses} text-white bg-gray-700 border-l-4 border-blue-400 shadow-md`;
    }
    
    return `${baseClasses} text-gray-300 hover:text-white hover:bg-gray-700`;
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-8">
        <div className="flex items-center justify-between h-12 sm:h-14 lg:h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity duration-200 mr-2 sm:mr-3">
              <img 
                src={logo} 
                alt="Logo Mi Caja" 
                className="w-10 h-10 rounded-lg"
                onLoad={() => console.log('Logo loaded successfully')}
                onError={(e) => {
                  console.error('Error loading logo:', e);
                  console.log('Logo failed to load, trying fallback...');
                  e.target.src = '/vite.svg'; // Fallback a vite.svg
                }}
              />
            </Link>
            <div className="flex-shrink-0">
              <Link to="/" className="text-white text-xl sm:text-2xl font-bold hover:text-blue-300 transition-colors duration-200">
                Mi Caja
              </Link>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:block">
            <div className="ml-4 sm:ml-6 lg:ml-10 flex items-baseline space-x-1 sm:space-x-2 lg:space-x-4">
              {menuItems.map((item, index) => {
                const isActive = isActiveLink(item.href);
                return (
                  <Link
                    key={index}
                    to={item.href}
                    className={getLinkClasses(isActive)}
                  >
                    <span className="text-sm sm:text-base lg:text-lg">{item.icon}</span>
                    <span className="hidden sm:inline">{item.name}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Tablet Menu - Show icons only */}
          <div className="hidden md:block lg:hidden">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {menuItems.map((item, index) => {
                const isActive = isActiveLink(item.href);
                return (
                  <Link
                    key={index}
                    to={item.href}
                    className={`p-1 sm:p-2 rounded-md transition-all duration-200 ${isActive ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                    title={item.name}
                  >
                    <span className="text-base sm:text-lg">{item.icon}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-300 hover:text-white hover:bg-gray-700 p-1 sm:p-2 rounded-md transition-colors duration-200"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-1 sm:px-2 lg:px-3 pt-1 sm:pt-2 pb-2 sm:pb-3 space-y-1 bg-gray-800 rounded-b-lg border-b border-gray-700">
              {menuItems.map((item, index) => {
                const isActive = isActiveLink(item.href);
                return (
                  <Link
                    key={index}
                    to={item.href}
                    className={getLinkClasses(isActive, true)}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="text-base sm:text-lg lg:text-xl">{item.icon}</span>
                    <span>{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 sm:w-2 h-1.5 sm:h-2 bg-blue-400 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar; 