import React, { useState, useEffect, useRef } from 'react';
import logoam from '../assets/logoam.png';

export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Animar logo después de un pequeño delay
          setTimeout(() => setLogoVisible(true), 200);
          // Animar texto después del logo
          setTimeout(() => setTextVisible(true), 600);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <footer 
      ref={footerRef}
      className="relative bg-gray-900 text-gray-300 py-6 mt-2 overflow-hidden"
    >
      {/* Fondo degradado para el footer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          background: `
            linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
            radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `
        }}
      />

      {/* Efecto de vidrio esmerilado para el footer */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>

      {/* Contenido del footer */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 text-center">
        {/* Logo con efecto de aparición */}
        <div className={`mb-4 transition-all duration-1000 ease-out transform ${
          logoVisible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-8 scale-95'
        }`}>
          <img 
            src={logoam} 
            alt="AM Consultora Logo" 
            className="mx-auto w-32 h-auto md:w-36 drop-shadow-lg hover:drop-shadow-2xl transition-all duration-300 transform hover:scale-105"
          />
        </div>
        
        {/* Texto con efectos de aparición */}
        <div className={`space-y-2 transition-all duration-800 ease-out transform ${
          textVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}>
          <p className="text-sm md:text-base drop-shadow-sm hover:drop-shadow-md transition-all duration-300 hover:text-white">
            ¿Buscas soluciones tecnológicas para tu negocio?
          </p>
          <p className="text-sm md:text-base drop-shadow-sm hover:drop-shadow-md transition-all duration-300 hover:text-white">
            Visítanos en{' '}
            <a 
              href="https://amconsultora.cl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-all duration-300 hover:underline hover:drop-shadow-md relative group"
            >
              <span className="relative">
                amconsultora.cl
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
              </span>
            </a>
            {' '}o escríbenos a{' '}
            <a 
              href="mailto:contacto@amconsultora.cl"
              className="text-blue-400 hover:text-blue-300 transition-all duration-300 hover:underline hover:drop-shadow-md relative group"
            >
              <span className="relative">
                contacto@amconsultora.cl
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
              </span>
            </a>
          </p>
        </div>

        {/* Efecto de brillo adicional cuando está visible */}
        {isVisible && (
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent animate-pulse opacity-50"></div>
        )}
      </div>
    </footer>
  );
} 