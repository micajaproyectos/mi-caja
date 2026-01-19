import React, { useState, useEffect } from 'react';
import { 
  aplazarAlerta, 
  TIPOS_APLAZAMIENTO, 
  LABELS_APLAZAMIENTO 
} from '../lib/alertasStockService';

/**
 * Componente de Alerta de Stock Bajo
 * Muestra un popup cuando hay insumos con stock crítico (≤ 5)
 * 
 * @param {Object} props
 * @param {Object} props.alerta - Datos de la alerta desde la BD
 * @param {Array} props.insumosCriticos - Array de insumos con stock bajo
 * @param {Function} props.onClose - Callback al cerrar el popup
 * @param {Function} props.onAplazar - Callback al aplazar (opcional)
 */
const AlertaStockBajo = ({ alerta, insumosCriticos = [], onClose, onAplazar }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    // Animación de entrada
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150);
  };

  const handleAplazar = async (tipo) => {
    if (!alerta || !alerta.id || procesando) return;
    
    setProcesando(true);
    
    try {
      await aplazarAlerta(alerta.id, tipo);
      
      // Notificar al componente padre si existe el callback
      if (onAplazar) {
        onAplazar(tipo);
      }
      
      handleClose();
    } catch (error) {
      console.error('Error al aplazar alerta:', error);
      alert('Error al aplazar la alerta. Por favor intenta nuevamente.');
    } finally {
      setProcesando(false);
    }
  };

  if (!alerta || !insumosCriticos || insumosCriticos.length === 0) {
    return null;
  }

  // Determinar el nivel de criticidad (para colores)
  const insumosConStockCero = insumosCriticos.filter(i => i.stock_disponible === 0).length;
  const esCritico = insumosConStockCero > 0;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-150 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Fondo oscuro con blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={procesando ? undefined : handleClose}
      />
      
      {/* Contenedor del popup */}
      <div 
        className={`relative z-10 w-11/12 max-w-lg rounded-2xl shadow-2xl transform transition-all duration-150 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        style={{
          backgroundColor: esCritico ? 'rgba(127, 29, 29, 0.95)' : 'rgba(161, 98, 7, 0.95)',
          border: esCritico ? '2px solid rgba(239, 68, 68, 0.5)' : '2px solid rgba(251, 191, 36, 0.5)',
          backdropFilter: 'blur(10px)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          disabled={procesando}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 text-white text-lg font-semibold disabled:opacity-50"
          title="Cerrar"
        >
          ✕
        </button>
        
        {/* Contenido del popup */}
        <div className="p-6 pt-8">
          {/* Icono de advertencia */}
          <div className="flex items-center justify-center mb-4">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
              style={{ 
                backgroundColor: esCritico ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)', 
                border: esCritico ? '3px solid rgba(239, 68, 68, 0.5)' : '3px solid rgba(251, 191, 36, 0.5)'
              }}
            >
              <span className="text-5xl">
                {esCritico ? '🚨' : '⚠️'}
              </span>
            </div>
          </div>

          {/* Título */}
          <h3 className="text-2xl font-bold text-white mb-2 text-center">
            {esCritico ? '¡STOCK CRÍTICO!' : '¡ALERTA DE STOCK BAJO!'}
          </h3>
          
          {/* Descripción */}
          <p className="text-gray-200 text-sm text-center mb-6">
            {esCritico 
              ? 'Hay insumos sin stock. Es urgente que ingreses más productos para continuar operando.'
              : 'Los siguientes insumos tienen stock bajo. Te recomendamos realizar pedidos a tus proveedores pronto.'
            }
          </p>

          {/* Lista de insumos críticos */}
          <div className="bg-black/20 rounded-xl p-4 mb-6 max-h-60 overflow-y-auto">
            <div className="space-y-3">
              {insumosCriticos.map((insumo, index) => {
                const stockCero = insumo.stock_disponible === 0;
                return (
                  <div 
                    key={insumo.id || index}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors"
                    style={{
                      backgroundColor: stockCero ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                      border: stockCero ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)'
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">
                        {stockCero ? '🔴' : '🟡'}
                      </span>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">
                          {insumo.ingrediente}
                        </p>
                        <p className="text-gray-300 text-xs mt-0.5">
                          Stock actual: <span className="font-bold">{insumo.stock_disponible}</span> {insumo.unidad}
                        </p>
                      </div>
                    </div>
                    {stockCero && (
                      <span className="text-red-400 text-xs font-bold px-2 py-1 bg-red-900/30 rounded">
                        AGOTADO
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-white/10 rounded-lg p-3 mb-6">
            <p className="text-white text-sm text-center">
              <span className="font-bold">{insumosCriticos.length}</span> {insumosCriticos.length === 1 ? 'insumo' : 'insumos'} 
              {insumosConStockCero > 0 && (
                <span>
                  {' '}({insumosConStockCero} {insumosConStockCero === 1 ? 'agotado' : 'agotados'})
                </span>
              )}
            </p>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            {/* Botones de aplazamiento */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAplazar(TIPOS_APLAZAMIENTO.QUINCE_MIN)}
                disabled={procesando}
                className="px-3 py-2.5 rounded-lg transition-all text-xs font-medium text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.3)', 
                  border: '1px solid rgba(59, 130, 246, 0.5)' 
                }}
                title={LABELS_APLAZAMIENTO['15min']}
              >
                ⏰ 15 min
              </button>
              
              <button
                onClick={() => handleAplazar(TIPOS_APLAZAMIENTO.UNA_HORA)}
                disabled={procesando}
                className="px-3 py-2.5 rounded-lg transition-all text-xs font-medium text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.3)', 
                  border: '1px solid rgba(59, 130, 246, 0.5)' 
                }}
                title={LABELS_APLAZAMIENTO['1hora']}
              >
                ⏰ 1 hora
              </button>
              
              <button
                onClick={() => handleAplazar(TIPOS_APLAZAMIENTO.MANANA)}
                disabled={procesando}
                className="px-3 py-2.5 rounded-lg transition-all text-xs font-medium text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.3)', 
                  border: '1px solid rgba(59, 130, 246, 0.5)' 
                }}
                title={LABELS_APLAZAMIENTO['manana']}
              >
                🌅 Mañana
              </button>
            </div>

            {/* Botón principal de acción */}
            <button
              onClick={handleClose}
              disabled={procesando}
              className="w-full px-6 py-3 rounded-lg transition-all font-semibold text-white hover:scale-105 disabled:opacity-50"
              style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.3)', 
                border: '2px solid rgba(34, 197, 94, 0.5)' 
              }}
            >
              📦 Ir a Ingresar Insumos
            </button>
          </div>

          {/* Contador de aplazamientos (si existe) */}
          {alerta.veces_aplazada > 0 && (
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-xs">
                Esta alerta ha sido aplazada {alerta.veces_aplazada} {alerta.veces_aplazada === 1 ? 'vez' : 'veces'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertaStockBajo;
