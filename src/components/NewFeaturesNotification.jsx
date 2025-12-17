import React, { useState, useEffect } from 'react';

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

  // No renderizar si no debe mostrarse
  if (!show) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
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
            <span className="text-3xl">🎉</span>
          </div>
        </div>

        {/* Contenido de la notificación */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            ¡Nuevas Mejoras Disponibles!
          </h3>
          
          <div className="text-left space-y-4">
            {/* Gráficos Diarios */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-2xl">📊</span>
              <div>
                <h4 className="text-green-300 font-semibold text-lg mb-1">Gráficos de Ventas Diarias</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Ahora puedes visualizar tus ventas día a día del mes actual. Ve a la sección de 
                  <strong className="text-green-300"> Seguimiento</strong> y encontrarás nuevos gráficos de barras que muestran:
                </p>
                <ul className="mt-2 space-y-1 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span><strong>Ventas Diarias:</strong> Total de ventas normales por cada día del mes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span><strong>Ventas Rápidas Diarias:</strong> Total de ventas rápidas por cada día del mes</span>
                  </li>
                </ul>
                <p className="text-gray-300 text-sm leading-relaxed mt-2">
                  Identifica tendencias, compara días y optimiza tu estrategia de ventas con esta nueva herramienta de análisis.
                </p>
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
            ¡Entendido! Comenzar a usar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewFeaturesNotification;
