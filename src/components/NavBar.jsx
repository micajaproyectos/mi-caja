import React from 'react';
import { Link } from 'react-router-dom';
// Intentar diferentes formas de importar el logo
import logo from '../assets/logo.png';
// Alternativa con ruta absoluta para Vite
// import logo from '/src/assets/logo.png';

const NavBar = () => {
  // Debug: verificar que el logo se importó correctamente
  console.log('Logo importado:', logo);

  return (
    <div className="bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-8">
        <div className="flex items-center justify-center h-12 sm:h-14 lg:h-16">
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
        </div>
      </div>
    </div>
  );
};

export default NavBar; 