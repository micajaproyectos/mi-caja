import React, { useState, useEffect } from 'react';

const SubscriptionNotification = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar la notificación con una pequeña animación
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Esperar a que termine la animación
  };

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
        
        {/* Icono de notificación */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
               style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
            <span className="text-2xl">🔔</span>
          </div>
        </div>

        {/* Contenido de la notificación */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Recordatorio Importante
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            No olvides cancelar tu suscripción mensual para seguir disfrutando de Mi Caja. Si ya has cancelado omite esta notificación.
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
            Entendido
          </button>
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 rounded-lg transition-all font-medium"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.2)', 
              color: 'white', 
              border: '1px solid rgba(34, 197, 94, 0.3)' 
            }}
          >
            Recordar más tarde
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionNotification;
