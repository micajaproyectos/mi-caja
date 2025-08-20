import React from 'react';
import logoam from '../assets/logoam.png';

export default function Footer() {
  return (
    <footer className="relative bg-gray-900 text-gray-300 py-6 mt-2">
      {/* Fondo degradado para el footer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          background: `
            linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
            radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%)
          `
        }}
      />

      {/* Efecto de vidrio esmerilado para el footer */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>

      {/* Contenido del footer */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 text-center">
        {/* Logo */}
        <div className="mb-4">
          <img 
            src={logoam} 
            alt="AM Consultora Logo" 
            className="mx-auto w-32 h-auto md:w-36 drop-shadow-lg"
          />
        </div>
        
        {/* Texto */}
        <div className="space-y-2">
          <p className="text-sm md:text-base drop-shadow-sm">
            ¿Buscas soluciones tecnológicas para tu negocio?
          </p>
          <p className="text-sm md:text-base drop-shadow-sm">
            Visítanos en{' '}
            <a 
              href="https://amconsultora.cl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors duration-300 hover:underline"
            >
              amconsultora.cl
            </a>
            {' '}o escríbenos a{' '}
            <a 
              href="mailto:contacto@amconsultora.cl"
              className="text-blue-400 hover:text-blue-300 transition-colors duration-300 hover:underline"
            >
              contacto@amconsultora.cl
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
} 