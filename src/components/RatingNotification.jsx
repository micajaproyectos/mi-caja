import React, { useState, useEffect } from 'react';

const RatingNotification = ({ onClose, show = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar la notificación solo cuando show sea true
    if (show) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleClose = (action = 'later') => {
    setIsVisible(false);
    setTimeout(() => onClose(action), 200); // Esperar a que termine la animación
  };

  const handleRateNow = () => {
    // Llamar a la función global para abrir el modal de calificación
    if (window.openRatingModal) {
      window.openRatingModal();
    }
    handleClose('rated'); // Indicar que el usuario calificó
  };

  // No renderizar si no debe mostrarse
  if (!show) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Fondo con blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Contenedor de la notificación */}
      <div className={`relative z-10 w-11/12 max-w-md p-6 rounded-2xl shadow-lg transform transition-all duration-200 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
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
               style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '2px solid rgba(255, 193, 7, 0.3)' }}>
            <span className="text-3xl">⭐</span>
          </div>
        </div>

        {/* Contenido de la notificación */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            ¡Tu opinión es importante!
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
          ¿Mi Caja te ha sido útil? <br></br> Cuéntanos tu experiencia. Tu opinión se mostrará publicamente. 
          </p>
          
          {/* Estrellas de ejemplo */}
          <div className="flex justify-center mb-4">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-2xl text-yellow-400">⭐</span>
              ))}
            </div>
          </div>
          
          <p className="text-gray-400 text-xs">
            Solo tomará 15 segundos
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 rounded-lg transition-all font-medium"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.08)', 
              color: 'white', 
              border: '1px solid rgba(255,255,255,0.12)' 
            }}
          >
            Tal vez después
          </button>
          <button
            onClick={handleRateNow}
            className="flex-1 px-4 py-2 rounded-lg transition-all font-medium"
            style={{ 
              backgroundColor: 'rgba(255, 193, 7, 0.2)', 
              color: 'white', 
              border: '1px solid rgba(255, 193, 7, 0.3)' 
            }}
          >
            ⭐ Calificar ahora
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingNotification;
