import React, { useState, useEffect } from 'react';
import { useAlarmas } from '../contexts/AlarmasContext';

const AlarmaNotification = () => {
  const { alarmaActiva, marcarEjecutado, postergarAlarma, cerrarAlarmaActiva } = useAlarmas();
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (alarmaActiva) {
      // Pequeño delay para animación
      setTimeout(() => setIsVisible(true), 100);
      setMostrarOpciones(false);
    } else {
      setIsVisible(false);
    }
  }, [alarmaActiva]);

  if (!alarmaActiva) return null;

  const getColorPrioridad = (prioridad) => {
    switch(prioridad) {
      case 'alta': return 'border-red-500 bg-red-500/10';
      case 'media': return 'border-yellow-500 bg-yellow-500/10';
      case 'baja': return 'border-green-500 bg-green-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getEmojiPrioridad = (prioridad) => {
    switch(prioridad) {
      case 'alta': return '🔴';
      case 'media': return '🟡';
      case 'baja': return '🟢';
      default: return '⚪';
    }
  };

  const handlePostergar = (minutos) => {
    postergarAlarma(alarmaActiva.id, minutos);
    setMostrarOpciones(false);
  };

  const handleListo = () => {
    marcarEjecutado(alarmaActiva.id);
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* Contenedor de la alarma */}
      <div 
        className={`relative w-full max-w-md transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Animación de pulso de fondo */}
        <div className="absolute inset-0 bg-red-500/20 rounded-2xl animate-pulse blur-xl"></div>
        
        {/* Contenido */}
        <div 
          className={`relative rounded-2xl shadow-2xl p-6 border-2 ${getColorPrioridad(alarmaActiva.prioridad)}`}
          style={{
            backgroundColor: 'rgba(26, 61, 26, 0.98)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl animate-bounce">
                ⏰
              </div>
              <div>
                <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  ¡Recordatorio!
                </h3>
                <p className="text-sm text-gray-300">
                  {alarmaActiva.fecha} - {alarmaActiva.hora}
                </p>
              </div>
            </div>
            <button
              onClick={cerrarAlarmaActiva}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
              title="Cerrar (seguirá pendiente)"
            >
              ✕
            </button>
          </div>

          {/* Prioridad */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20">
              <span className="text-lg">{getEmojiPrioridad(alarmaActiva.prioridad)}</span>
              <span className="text-sm font-semibold text-white uppercase">
                Prioridad {alarmaActiva.prioridad}
              </span>
            </div>
          </div>

          {/* Asunto */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-lg font-semibold text-white leading-relaxed break-words overflow-wrap-anywhere">
              {alarmaActiva.asunto}
            </p>
          </div>

          {/* Botones principales */}
          {!mostrarOpciones ? (
            <div className="flex gap-3">
              <button
                onClick={() => setMostrarOpciones(true)}
                className="flex-1 px-4 py-3 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 font-semibold transition-all transform hover:scale-105"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ⏰ Postergar
              </button>
              <button
                onClick={handleListo}
                className="flex-1 px-4 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition-all transform hover:scale-105 shadow-lg"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ✅ Listo
              </button>
            </div>
          ) : (
            /* Opciones de postergación */
            <div className="space-y-2">
              <p className="text-sm text-gray-300 mb-3">¿Cuánto tiempo quieres postergar?</p>
              <button
                onClick={() => handlePostergar(5)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 text-white transition-all text-left"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ⏱️ 5 minutos
              </button>
              <button
                onClick={() => handlePostergar(15)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 text-white transition-all text-left"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ⏱️ 15 minutos
              </button>
              <button
                onClick={() => handlePostergar(30)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 text-white transition-all text-left"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ⏱️ 30 minutos
              </button>
              <button
                onClick={() => handlePostergar(60)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 text-white transition-all text-left"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ⏱️ 1 hora
              </button>
              <button
                onClick={() => handlePostergar(120)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 text-white transition-all text-left"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ⏱️ 2 horas
              </button>
              <button
                onClick={() => setMostrarOpciones(false)}
                className="w-full px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 transition-all mt-3"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ← Volver
              </button>
            </div>
          )}

          {/* Nota informativa */}
          <p className="text-xs text-gray-400 text-center mt-4">
            {mostrarOpciones 
              ? 'La alarma se reprogramará para la hora seleccionada'
              : 'Si cierras sin marcar "Listo", la alarma seguirá pendiente'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlarmaNotification;
