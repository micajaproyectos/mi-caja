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
  const [enfocando, setEnfocando] = useState(false);
  const [permisosOtorgados, setPermisosOtorgados] = useState(false);
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const isStartingRef = useRef(false);

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

  // Configuración del escáner optimizada para máxima compatibilidad y detección
  const getScannerConfig = () => ({
    fps: 20, // Alta frecuencia de escaneo
    qrbox: { width: 320, height: 160 }, // Área de escaneo más amplia
    formatsToSupport: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
    ],
    aspectRatio: 1.0,
    disableFlip: false,
    // Configuraciones adicionales para mejor rendimiento y compatibilidad
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true // Usar detector nativo si está disponible
    },
    // Aumentar tolerancia de detección
    supportedScanTypes: ['CODE_128', 'CODE_39', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E']
  });

  // Aplicar configuraciones avanzadas de enfoque a la cámara
  const aplicarConfiguracionesEnfoque = async () => {
    try {
      // Obtener el stream de video actual
      const videoElement = document.querySelector('#barcode-scanner-region video');
      if (!videoElement || !videoElement.srcObject) {
        console.log('📷 No se pudo acceder al stream de video');
        return;
      }

      const stream = videoElement.srcObject;
      const videoTrack = stream.getVideoTracks()[0];
      
      if (!videoTrack) {
        console.log('📷 No se encontró video track');
        return;
      }

      // Obtener capacidades de la cámara
      const capabilities = videoTrack.getCapabilities();
      console.log('📷 Capacidades de la cámara:', capabilities);

      // Configurar constraints avanzados para mejor detección
      const constraints = {};
      
      // Configurar enfoque si está disponible
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        constraints.focusMode = 'continuous';
        console.log('✅ Enfoque continuo habilitado');
      }
      
      // Configurar zoom óptimo si está disponible
      if (capabilities.zoom) {
        // Usar un zoom ligeramente mayor para códigos pequeños
        const optimalZoom = Math.min(Math.max(capabilities.zoom.min, 1.2), capabilities.zoom.max);
        constraints.zoom = optimalZoom;
        console.log('✅ Zoom optimizado configurado:', constraints.zoom);
      }

      // Configurar brillo/exposición automática si está disponible
      if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
        constraints.exposureMode = 'continuous';
        console.log('✅ Exposición automática habilitada');
      }

      // Configurar balance de blancos automático
      if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
        constraints.whiteBalanceMode = 'continuous';
        console.log('✅ Balance de blancos automático habilitado');
      }

      // Aplicar las configuraciones
      if (Object.keys(constraints).length > 0) {
        await videoTrack.applyConstraints({
          advanced: [constraints]
        });
        console.log('✅ Configuraciones de enfoque aplicadas exitosamente');
      }

    } catch (error) {
      console.warn('⚠️ No se pudieron aplicar todas las configuraciones de enfoque:', error);
      // No lanzar error, continuar con configuración por defecto
    }
  };

  const startScanner = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    // Limpiar instancia anterior para evitar conflictos de estado
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (_) {}
      html5QrcodeRef.current = null;
    }

    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);

      // Verificar si estamos en HTTPS o localhost
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        setError('La cámara requiere conexión segura (HTTPS). Por favor, accede mediante HTTPS.');
        setIsScanning(false);
        return;
      }

      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Tu navegador no soporta acceso a la cámara. Intenta con Chrome o Safari.');
        setIsScanning(false);
        return;
      }

      // 🔐 VERIFICAR PERMISOS ANTES DE SOLICITAR CÁMARA
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' });
          console.log('📷 Estado de permisos de cámara:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            setError('❌ Permiso de cámara denegado.\n\nPor favor, habilita el acceso a la cámara en la configuración de tu navegador para este sitio.');
            setIsScanning(false);
            return;
          }
          
          if (permissionStatus.state === 'granted') {
            console.log('✅ Permiso de cámara ya otorgado previamente - conectando automáticamente');
            setPermisosOtorgados(true);
          } else {
            console.log('⏳ Se solicitará permiso de cámara al usuario');
            setPermisosOtorgados(false);
          }
        }
      } catch (permErr) {
        // Algunos navegadores no soportan permissions.query para camera
        console.log('⚠️ No se pudo verificar permisos (continuando normalmente):', permErr);
        setPermisosOtorgados(false);
      }

      // Crear instancia del escáner
      let html5Qrcode = new Html5Qrcode('barcode-scanner-region');
      html5QrcodeRef.current = html5Qrcode;

      const config = getScannerConfig();

      // Callback de éxito
      const onScanSuccess = (decodedText) => {
        console.log('📷 Código escaneado:', decodedText);
        handleScanSuccess(decodedText);
      };

      // Callback de error (ignorar, son normales)
      const onScanError = () => {};

      // Función optimizada para inicialización rápida de cámara
      const esperarEnfoque = async () => {
        console.log('📷 Inicializando cámara con enfoque continuo...');
        
        try {
          // Mínima espera para estabilización del stream
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Marcar como lista inmediatamente - el enfoque continuo trabajará en segundo plano
          setCameraReady(true);
          setEnfocando(false);
          
          // Aplicar configuraciones de enfoque en segundo plano (no bloqueante)
          setTimeout(async () => {
            try {
              await aplicarConfiguracionesEnfoque();
              console.log('✅ Configuraciones de enfoque aplicadas en segundo plano');
            } catch (error) {
              console.warn('⚠️ Error al aplicar configuraciones de enfoque:', error);
            }
          }, 50);
          
          console.log('✅ Cámara lista - enfoque continuo activo');
        } catch (error) {
          console.warn('⚠️ Error en inicialización:', error);
          setCameraReady(true);
          setEnfocando(false);
        }
      };

      // Intentar primero obtener las cámaras disponibles
      try {
        const cameras = await Html5Qrcode.getCameras();
        console.log('📷 Cámaras disponibles:', cameras);

        if (cameras && cameras.length > 0) {
          // Buscar cámara trasera (environment) o usar la primera disponible
          const backCamera = cameras.find(cam => 
            cam.label.toLowerCase().includes('back') || 
            cam.label.toLowerCase().includes('trasera') ||
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('environment')
          );

          const cameraId = backCamera ? backCamera.id : cameras[cameras.length - 1].id;
          console.log('📷 Usando cámara:', cameraId);

          // Configuración optimizada para la cámara con mejor resolución y calidad
          const videoConstraints = {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            focusMode: { ideal: 'continuous' },
            facingMode: 'environment',
            // Agregar constraints adicionales para mejor detección
            aspectRatio: { ideal: 16/9 },
            frameRate: { ideal: 30, min: 15 }
          };

          await html5Qrcode.start(
            { deviceId: { exact: cameraId } },
            config,
            onScanSuccess,
            onScanError
          );
          
          // Inicialización rápida - enfoque continuo trabajará automáticamente
          await esperarEnfoque();
        } else {
          // Si no se pueden enumerar, intentar con facingMode ideal
          console.log('📷 Intentando con facingMode ideal: environment...');
          await html5Qrcode.start(
            { 
              facingMode: { ideal: 'environment' },
              advanced: [
                { focusMode: 'continuous' },
                { width: { ideal: 1920 } },
                { height: { ideal: 1080 } }
              ]
            },
            config,
            onScanSuccess,
            onScanError
          );
          
          // Esperar a que la cámara enfoque antes de marcar como lista
          await esperarEnfoque();
        }

        setCameraReady(true);

      } catch (cameraErr) {
        console.error('📷 Error al obtener cámaras, intentando fallback...', cameraErr);
        
        // Fallback 1: intentar con facingMode ideal (más permisivo)
        try {
          console.log('📷 Fallback 1: facingMode ideal environment...');
          try { html5Qrcode.clear(); } catch (_) {}
          html5Qrcode = new Html5Qrcode('barcode-scanner-region');
          html5QrcodeRef.current = html5Qrcode;
          await html5Qrcode.start(
            { 
              facingMode: { ideal: 'environment' },
              advanced: [{ focusMode: 'continuous' }]
            },
            config,
            onScanSuccess,
            onScanError
          );
          await esperarEnfoque();
          setCameraReady(true);
        } catch (fallbackErr1) {
          console.error('📷 Fallback 1 falló, intentando fallback 2...', fallbackErr1);
          
          // Fallback 2: intentar con cámara frontal (user)
          try {
            console.log('📷 Fallback 2: facingMode ideal user...');
            try { html5Qrcode.clear(); } catch (_) {}
            html5Qrcode = new Html5Qrcode('barcode-scanner-region');
            html5QrcodeRef.current = html5Qrcode;
            await html5Qrcode.start(
              { 
                facingMode: { ideal: 'user' },
                advanced: [{ focusMode: 'continuous' }]
              },
              config,
              onScanSuccess,
              onScanError
            );
            await esperarEnfoque();
            setCameraReady(true);
          } catch (fallbackErr2) {
            console.error('📷 Fallback 2 falló, intentando fallback 3...', fallbackErr2);
            
            // Fallback 3: intentar sin especificar facingMode (usar default)
            try {
              console.log('📷 Fallback 3: sin especificar facingMode...');
              try { html5Qrcode.clear(); } catch (_) {}
              html5Qrcode = new Html5Qrcode('barcode-scanner-region');
              html5QrcodeRef.current = html5Qrcode;
              await html5Qrcode.start(
                { facingMode: 'user' }, // Sintaxis más simple como último recurso
                config,
                onScanSuccess,
                onScanError
              );
              await esperarEnfoque();
              setCameraReady(true);
            } catch (lastErr) {
              console.error('📷 Todos los fallbacks fallaron', lastErr);
              throw lastErr;
            }
          }
        }
      }

    } catch (err) {
      console.error('📷 Error final al iniciar escáner:', err);
      
      // Manejar errores específicos con mensajes más claros
      let errorMsg = '';
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        errorMsg = '🔒 Permiso de cámara denegado.\n\n' +
                   '1. Abre Configuración de Chrome\n' +
                   '2. Ve a Configuración del sitio > Cámara\n' +
                   '3. Permite el acceso a este sitio';
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        errorMsg = '📷 No se encontró ninguna cámara en este dispositivo.';
      } else if (err.name === 'NotReadableError' || err.message?.includes('in use')) {
        errorMsg = '⚠️ La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.';
      } else if (err.message?.includes('HTTPS')) {
        errorMsg = '🔐 Se requiere conexión segura (HTTPS) para usar la cámara.';
      } else {
        errorMsg = `Error: ${err.message || err.toString() || 'No se pudo acceder a la cámara'}`;
      }
      
      setError(errorMsg);
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        try { html5QrcodeRef.current.clear(); } catch (_) {}
      }
    } catch (err) {
      console.error('Error al detener escáner:', err);
      try { html5QrcodeRef.current?.clear(); } catch (_) {}
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
        className="absolute inset-0 bg-black/80"
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
                  <p className="text-gray-300 text-sm">
                    {enfocando ? '🎯 Ajustando enfoque...' : 
                     permisosOtorgados ? '🔓 Conectando automáticamente...' : 
                     'Iniciando cámara...'}
                  </p>
                  {enfocando && (
                    <p className="text-gray-400 text-xs mt-2">
                      Optimizando nitidez para escaneo
                    </p>
                  )}
                  {permisosOtorgados && !enfocando && (
                    <p className="text-green-400 text-xs mt-2">
                      ✅ Permisos guardados, no es necesario volver a autorizar
                    </p>
                  )}
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

            {/* Guía visual de escaneo más grande */}
            {cameraReady && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-72 h-28 border-2 border-green-400 rounded-lg relative">
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
            {cameraReady ? (
              <>
                <p className="text-green-400 text-sm font-semibold">
                  ✅ Cámara lista para escanear
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  Apunta hacia el código de barras y mantén firme
                </p>
                {permisosOtorgados && (
                  <p className="text-green-300 text-xs mt-2 opacity-75">
                    🔓 Conectado automáticamente (permisos guardados)
                  </p>
                )}
              </>
            ) : enfocando ? (
              <>
                <p className="text-yellow-400 text-sm font-semibold">
                  🎯 Ajustando enfoque...
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Espera un momento para mejor nitidez
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-300 text-sm">
                  📌 {permisosOtorgados ? 'Conectando a la cámara...' : 'Apunta la cámara hacia el código de barras'}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {permisosOtorgados ? 'Usando permisos guardados' : 'Mantén el código dentro del recuadro verde'}
                </p>
              </>
            )}
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
          
          {/* Información sobre permisos persistentes */}
          {!permisosOtorgados && !error && (
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-xs">
                💡 <strong>Tip:</strong> Si autorizas la cámara, el permiso se guardará y no tendrás que volver a darlo.
              </p>
              <p className="text-blue-200/70 text-xs mt-1">
                Nota: Requiere HTTPS o localhost, y no funciona en modo incógnito.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
