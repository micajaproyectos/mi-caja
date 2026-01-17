import React, { useState, useEffect, useMemo } from 'react';

const NewFeaturesNotification = ({ onClose, show = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar la notificación solo cuando show sea true
    if (show) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Esperar a que termine la animación
  };

  // Generar confeti elements solo una vez usando useMemo
  const confettiPieces = useMemo(() => {
    const confettiColors = ['#22c55e', '#fbbf24', '#ef4444', '#3b82f6', '#a855f7', '#ec4899'];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
      rotationEnd: 360 + Math.random() * 720,
    }));
  }, []);

  // No renderizar si no debe mostrarse
  if (!show) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animación de confeti */}
      {isVisible && (
        <>
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
            {confettiPieces.map((piece) => (
              <div
                key={piece.id}
                className="absolute w-2 h-2 opacity-80"
                style={{
                  left: piece.left,
                  top: '-10px',
                  backgroundColor: piece.color,
                  animation: `confettiFall${piece.id} ${piece.duration}s linear ${piece.delay}s forwards`,
                  transformOrigin: 'center',
                }}
              />
            ))}
          </div>
          <style>{`
            ${confettiPieces.map((piece) => `
              @keyframes confettiFall${piece.id} {
                0% {
                  transform: translateY(0) rotate(0deg);
                  opacity: 1;
                }
                100% {
                  transform: translateY(100vh) rotate(${piece.rotationEnd}deg);
                  opacity: 0;
                }
              }
            `).join('')}
          `}</style>
        </>
      )}

      {/* Fondo con blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Contenedor de la notificación */}
      <div className={`relative z-10 w-11/12 max-w-lg p-6 rounded-2xl shadow-lg transform transition-all duration-200 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
           style={{
             backgroundColor: 'rgba(31, 74, 31, 0.95)',
             border: '1px solid rgba(255, 255, 255, 0.1)',
             backdropFilter: 'blur(10px)'
           }}>
        
        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 text-white text-lg font-semibold"
          title="Cerrar"
        >
          ✕
        </button>
        
        {/* Icono de notificación */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
               style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
            <span className="text-3xl">🎊</span>
          </div>
        </div>

        {/* Contenido de la notificación */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Nuevas Actualizaciones
          </h3>
          
          <div className="text-left space-y-3">
            {/* Nuevas actualizaciones */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-xl">🎉</span>
              <div>
                <h4 className="text-green-300 font-semibold text-base mb-2">Nuevas Actualizaciones</h4>
                <div className="space-y-2">
                  <p className="text-gray-300 text-xs leading-relaxed">
                    📅 <strong className="text-green-300">Calendario:</strong> Crea recordatorios con alarmas automáticas. Configura fecha, hora y prioridad.
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    🔊 <strong className="text-green-300">Sonidos:</strong> Notificaciones sonoras en Pedidos, Cocina y Calendario. Activa/desactiva desde tu Perfil.
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    📊 <strong className="text-green-300">Cierre de Caja:</strong> Registra y compara valores físicos vs sistema desde Registro de Venta.
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    🪑 <strong className="text-green-300">Pedidos Mejorado:</strong> Interfaz compacta tipo Chrome. Pestañas con scroll, botón "+" para agregar mesas, formulario simplificado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 rounded-lg transition-all font-medium"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.2)', 
              color: 'white', 
              border: '1px solid rgba(34, 197, 94, 0.3)' 
            }}
          >
            ¡OK! Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewFeaturesNotification;
