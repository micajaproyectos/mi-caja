import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Componente BarcodeScanner
 * Modal reutilizable para escanear códigos de barras usando la cámara del dispositivo
 * Configurado con alta precisión para detectar códigos de todos los tamaños
 * 
 * Props:
 * - isOpen: boolean - Controla si el modal está abierto
 * - onScan: (code: string) => void - Callback cuando se detecta un código
 * - onClose: () => void - Callback para cerrar el modal
 * - title: string (opcional) - Título del modal
 */
const BarcodeScanner = ({ isOpen, onScan, onClose, title = 'Escanear Código de Barras' }) => {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);

  // Iniciar el escáner cuando el modal se abre
  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanner();
    }

    // Cleanup cuando el componente se desmonta o el modal se cierra
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);

      // Crear instancia del escáner
      const html5Qrcode = new Html5Qrcode('barcode-scanner-region');
      html5QrcodeRef.current = html5Qrcode;

      // Configuración optimizada para alta precisión
      const config = {
        fps: 15, // 15 fps para detección rápida
        qrbox: { width: 250, height: 100 }, // Área optimizada para códigos de barras
        aspectRatio: 1.777778, // 16:9
        formatsToSupport: [
          0,  // QR_CODE
          1,  // AZTEC
          2,  // CODABAR
          3,  // CODE_39
          4,  // CODE_93
          5,  // CODE_128
          6,  // DATA_MATRIX
          7,  // MAXICODE
          8,  // ITF
          9,  // EAN_13
          10, // EAN_8
          11, // PDF_417
          12, // RSS_14
          13, // RSS_EXPANDED
          14, // UPC_A
          15, // UPC_E
          16, // UPC_EAN_EXTENSION
        ],
        // Usar API nativa del navegador si está disponible (más rápida)
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      // Iniciar con cámara trasera
      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        (decodedText, decodedResult) => {
          // Código detectado exitosamente
          console.log('📷 Código escaneado:', decodedText);
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Errores de escaneo (ignorar, son normales mientras busca)
        }
      );

      setCameraReady(true);

    } catch (err) {
      console.error('Error al iniciar escáner:', err);
      
      // Manejar errores específicos
      if (err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en este dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('La cámara está siendo usada por otra aplicación.');
      } else {
        setError(`Error al acceder a la cámara: ${err.message || 'Error desconocido'}`);
      }
      
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      }
    } catch (err) {
      console.error('Error al detener escáner:', err);
    } finally {
      html5QrcodeRef.current = null;
      setIsScanning(false);
      setCameraReady(false);
    }
  };

  const handleScanSuccess = async (code) => {
    // Detener el escáner antes de llamar al callback
    await stopScanner();
    
    // Llamar al callback con el código
    if (onScan) {
      onScan(code);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    if (onClose) {
      onClose();
    }
  };

  // No renderizar si el modal no está abierto
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay oscuro */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📷</span>
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4">
          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-red-300 text-sm">{error}</p>
                  <button
                    onClick={startScanner}
                    className="mt-2 text-sm text-white underline hover:no-underline"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Área del escáner */}
          <div className="relative">
            {/* Loading mientras carga la cámara */}
            {isScanning && !cameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-xl z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400 mx-auto mb-3"></div>
                  <p className="text-gray-300 text-sm">Iniciando cámara...</p>
                </div>
              </div>
            )}

            {/* Contenedor del video */}
            <div 
              id="barcode-scanner-region" 
              ref={scannerRef}
              className="w-full rounded-xl overflow-hidden bg-gray-800"
              style={{ minHeight: '280px' }}
            />

            {/* Guía visual de escaneo */}
            {cameraReady && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-24 border-2 border-green-400 rounded-lg relative">
                  {/* Esquinas animadas */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                  
                  {/* Línea de escaneo animada */}
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-green-400 animate-pulse"></div>
                </div>
              </div>
            )}
          </div>

          {/* Instrucciones */}
          <div className="mt-4 text-center">
            <p className="text-gray-300 text-sm">
              📌 Apunta la cámara hacia el código de barras
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Mantén el código dentro del recuadro verde
            </p>
          </div>
        </div>

        {/* Footer con botón de cancelar */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
