import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Footer from './Footer';

export default function GestionCocina() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1a3d1a' }}>
      {/* Header con navegación */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white/10"
          >
            <svg 
              className="w-6 h-6 text-white transition-transform group-hover:-translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-white font-medium">Volver al Inicio</span>
          </button>
        </div>
      </div>

      {/* Título principal */}
      <div className="relative z-10 text-center py-8 md:py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">
          Gestión Cocina
        </h1>
        <p className="text-gray-300 text-lg md:text-xl mt-2 px-4">
          Organiza y controla las operaciones de tu cocina
        </p>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex-1 py-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Card principal con glassmorphism */}
          <div 
            className="rounded-2xl p-8 md:p-12"
            style={{
              backgroundColor: 'rgba(31, 74, 31, 0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              border: '1px solid rgba(255, 255, 255, 0.18)'
            }}
          >
            <div className="text-center">
              {/* Mensaje de bienvenida */}
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Módulo en Construcción
              </h2>
              <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
                Este espacio está preparado para gestionar todas las operaciones de tu cocina.
                Próximamente podrás administrar pedidos, recetas, preparaciones y más.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

