class ScaleService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.connected = false;
    this.sampling = false;
    this.textDecoder = new TextDecoder();
    this.byteBuffer = new Uint8Array(0);
    
    // 3.3-3.4 Estados para parsing y sampling
    this.lastStableKg = null;
    this.onStableCallback = null;
    this.debounceTimer = null;
    this.lastPublishedKg = null;
    
    // Higiene y ruido: dedupe + throttle
    this.lastFrameHash = null;
    this.frameThrottleCount = 0;
    this.frameThrottleInterval = 50; // Mostrar 1 cada 50 frames
    
    // Apagado limpio
    this.shuttingDown = false;
    this.readerActive = false;
    
    // Modo producción
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  // Métodos principales
  async connectIfNeeded() {
    if (this.connected && this.port) {
      console.log('[scale] already-connected');
      return;
    }

    console.log('[scale] connecting');
    
    try {
      // 2.3 Reconexión silenciosa (veces siguientes)
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        console.log('[scale] auto-connect:attempt');
        try {
          await this.openPort(ports[0]);
          console.log('[scale] auto-connect:connected');
          return;
        } catch (error) {
          console.log('[scale] auto-connect:failed', error.message);
        }
      }

      // 2.2 Conexión inicial (primera vez, con selector nativo)
      if (!this.isProduction) {
        console.log('[scale] 🔧 DEBUG: Llamando requestPort() - primera vez');
      }
      const port = await navigator.serial.requestPort();
      await this.openPort(port);
      console.log('[scale] connected');

      // 2.2 Timeout de datos: si en ~3 s no llega nada
      setTimeout(() => {
        if (this.connected && !this.hasReceivedData) {
          console.log('[scale] warn:no-data');
        }
      }, 3000);

    } catch (error) {
      console.error('[scale] connection-failed:', error);
      this.connected = false;
      throw error; // Re-lanzar para que startSampling() lo capture
    }
  }

  async openPort(port) {
    if (!this.isProduction) {
      console.log('[scale] 🔧 DEBUG: Abriendo puerto con parámetros: 9600, 8N1, sin flow');
    }
    await port.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    });

    this.port = port;
    this.connected = true;
    this.hasReceivedData = false;
    if (!this.isProduction) {
      console.log('[scale] ✅ DEBUG: Puerto abierto exitosamente - connected:', this.connected);
    }
  }

  startReading() {
    if (!this.port || !this.connected) {
      console.log('[scale] ❌ ERROR: startReading() - Puerto no disponible o no conectado');
      return;
    }

    // Un solo loop / callback: verificar si ya está activo
    if (this.readerActive) {
      if (!this.isProduction) {
        console.log('[scale] 🔧 DEBUG: Reader ya activo, saltando startReading');
      }
      return;
    }

    // Reader fresco en cada inicio - limpiar reader anterior si existe
    if (this.reader) {
      if (!this.isProduction) {
        console.log('[scale] 🔧 DEBUG: Limpiando reader anterior');
      }
      try {
        this.reader.releaseLock();
      } catch (e) {
        console.log('[scale] ⚠️ WARN: Error al liberar reader anterior:', e.message);
      }
      this.reader = null;
    }

    if (!this.isProduction) {
      console.log('[scale] 🔧 DEBUG: Creando nuevo reader');
    }
    
    this.readerActive = true;
    const readLoop = async () => {
      try {
        this.reader = this.port.readable.getReader();
        if (!this.isProduction) {
          console.log('[scale] ✅ DEBUG: Reader creado exitosamente');
          console.log('[scale] 🔍 DEBUG: Iniciando bucle de lectura...');
        }
        
        while (this.connected && this.reader && !this.shuttingDown) {
          if (!this.isProduction) {
            console.log('[scale] 🔍 DEBUG: Esperando datos del puerto...');
          }
          const { value, done } = await this.reader.read();
          
          if (done) {
            console.log('[scale] reader-done');
            break;
          }

          if (value) {
            if (!this.isProduction) {
              console.log('[scale] 🔍 DEBUG: Datos recibidos del puerto:', value);
              console.log('[scale] 🔍 DEBUG: Tipo de datos:', typeof value);
              console.log('[scale] 🔍 DEBUG: Longitud de datos:', value.length);
            }
            this.hasReceivedData = true;
            this.processData(value);
          } else {
            if (!this.isProduction) {
              console.log('[scale] 🔍 DEBUG: read() retornó value=null/undefined');
            }
          }
          
          // Log de confirmación de que el bucle sigue activo (solo en debug)
          if (!this.isProduction) {
            console.log('[scale] 🔍 DEBUG: Bucle de lectura continúa - connected:', this.connected, 'reader:', !!this.reader);
          }
        }
      } catch (error) {
        // Apagado limpio: si shuttingDown===true, no loguees "❌ ERROR"; bájalo a DEBUG
        if (this.shuttingDown) {
          if (!this.isProduction) {
            console.log('[scale] 🔍 DEBUG: Error en readLoop durante shutdown:', error.message);
          }
        } else {
          console.log('[scale] ❌ ERROR: Error en readLoop:', error.message);
          if (!this.isProduction) {
            console.log('[scale] ❌ ERROR: Stack trace:', error.stack);
          }
          if (this.connected) {
            console.log('[scale] error:disconnect', error.message);
            this.handleDisconnection();
          }
        }
      } finally {
        this.readerActive = false;
      }
    };

    readLoop();
  }

  processData(data) {
    if (!this.isProduction) {
      console.log('[scale] 🔍 DEBUG: processData() llamado con:', data);
      console.log('[scale] 🔍 DEBUG: Tipo de data:', typeof data);
    }
    
    // Acumular bytes en buffer de bytes (no texto)
    this.byteBuffer = this.byteBuffer || new Uint8Array(0);
    const newBytes = new Uint8Array(data);
    const combinedBytes = new Uint8Array(this.byteBuffer.length + newBytes.length);
    combinedBytes.set(this.byteBuffer);
    combinedBytes.set(newBytes, this.byteBuffer.length);
    this.byteBuffer = combinedBytes;
    
    if (!this.isProduction) {
      console.log('[scale] 🔍 DEBUG: Buffer de bytes actualizado, longitud:', this.byteBuffer.length);
    }
    
    // Hard cap del buffer: si supera 4KB sin ETX, limpiarlo
    if (this.byteBuffer.length > 4096) {
      console.log('[scale] warn:no-data - Buffer superó 4KB, limpiando');
      this.byteBuffer = new Uint8Array(0);
      return;
    }
    
    // Extraer frames STX(0x02) ... ETX(0x03)
    const frames = this.extractFrames(this.byteBuffer);
    
    if (frames.length > 0) {
      if (!this.isProduction) {
        console.log('[scale] 🔍 DEBUG: Frames extraídos:', frames.length);
        frames.forEach((frame, index) => {
          console.log(`[scale] 🔍 DEBUG: Procesando frame ${index}: "${frame}"`);
          this.parseFrame(frame);
        });
      } else {
        // En producción: procesar frames sin logs de debug
        frames.forEach(frame => this.parseFrame(frame));
      }
    }
  }

  // Hash simple para dedupe de frames
  hashFrame(frame) {
    // Hash simple basado en el contenido del frame
    let hash = 0;
    for (let i = 0; i < frame.length; i++) {
      const char = frame.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return hash;
  }

  // Extraer frames STX(0x02) ... ETX(0x03) del buffer de bytes
  extractFrames(byteBuffer) {
    const frames = [];
    const STX = 0x02; // Start of Text
    const ETX = 0x03; // End of Text
    
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < byteBuffer.length; i++) {
      if (byteBuffer[i] === STX) {
        startIndex = i;
      } else if (byteBuffer[i] === ETX && startIndex !== -1) {
        endIndex = i;
        
        // Extraer frame completo STX...ETX
        if (startIndex < endIndex) {
          const frameBytes = byteBuffer.slice(startIndex + 1, endIndex);
          const frameText = this.textDecoder.decode(frameBytes);
          frames.push(frameText);
        }
        
        // Reset para buscar próximo frame
        startIndex = -1;
        endIndex = -1;
      }
    }
    
    // Actualizar buffer: mantener solo bytes después del último ETX completo
    if (endIndex !== -1) {
      this.byteBuffer = byteBuffer.slice(endIndex + 1);
      if (!this.isProduction) {
        console.log('[scale] 🔍 DEBUG: Buffer actualizado después de extraer frames, longitud:', this.byteBuffer.length);
      }
    }
    
    return frames;
  }

  // 3.1-3.5 Parser completo con todas las reglas de negocio - AHORA PARA FRAMES
  parseFrame(frame) {
    try {
      // Higiene: dedupe de frames idénticos
      const frameHash = this.hashFrame(frame);
      if (frameHash === this.lastFrameHash) {
        this.frameThrottleCount++;
        if (this.frameThrottleCount % this.frameThrottleInterval !== 0) {
          return; // Ignorar frame duplicado
        }
      } else {
        this.frameThrottleCount = 0;
        this.lastFrameHash = frameHash;
      }
      
      // Throttle de logs: mostrar solo 1 cada N frames
      if (this.frameThrottleCount % this.frameThrottleInterval === 0) {
        console.log('[scale] frame:', frame);
      }
      
      // Sanitizar frame: eliminar control chars <0x20 (excepto espacio)
      const sanitizedFrame = frame.replace(/[\x00-\x1F]/g, ' ').trim();
      
      if (!this.isProduction) {
        console.log('[scale] 🔍 DEBUG: Frame sanitizado:', sanitizedFrame);
      }
      
      // Bandera de estabilidad: primera letra no-control del frame
      const firstChar = sanitizedFrame.charAt(0);
      if (firstChar !== 'S' && firstChar !== 'U') {
        console.log('[scale] parse:error - Primera letra no es S/U:', firstChar);
        return;
      }
      
      const stabilityFlag = firstChar.toUpperCase();
      
      // Parser tolerante: buscar "kg" case-insensitive y ignorar letras extra después
      const kgMatch = sanitizedFrame.match(/kg[a-z]*/i);
      if (!kgMatch) {
        console.log('[scale] parse:error - No se encontró "kg" en el frame');
        return;
      }
      
      const kgIndex = sanitizedFrame.toLowerCase().indexOf('kg');
      
      // Extraer número antes de "kg" (admite , o .)
      const beforeKg = sanitizedFrame.substring(1, kgIndex).trim();
      const numberMatch = beforeKg.match(/(\d+[.,]\d+|\d+)/);
      
      if (!numberMatch) {
        console.log('[scale] parse:error - No se pudo extraer número antes de kg:', beforeKg);
        return;
      }
      
      const rawValue = numberMatch[1];
      
      if (!this.isProduction) {
        console.log('[scale] 🔍 DEBUG: Valor extraído:', rawValue);
      }
      
      // 3.2 Normalización del valor
      const normalizedValue = rawValue.replace(',', '.');
      const kgValue = parseFloat(normalizedValue);
      
      if (isNaN(kgValue) || kgValue < 0) {
        console.log('[scale] parse:error - parse:invalid', frame);
        return;
      }
      
      // 3.3 Clasificación S/U y reglas de negocio
      if (stabilityFlag === 'U') {
        console.log('[scale] unstable');
        return;
      }
      
      if (stabilityFlag === 'S') {
        // Aplicar umbral mínimo de 3 gramos
        if (kgValue < 0.003) {
          console.log(`[scale] stable:${kgValue} (ignored <0.003kg)`);
          return;
        }
        
        // Redondear a 1 decimal
        const roundedKg = Math.round(kgValue * 10) / 10;
        this.lastStableKg = roundedKg;
        
        // 3.4 Publicación condicionada por sampling
        if (this.sampling) {
          // 3.5 Antirruido (debounce) y verificación de duplicados
          this.debouncePublish(roundedKg);
        } else {
          console.log(`[scale] stable:${roundedKg} (sampling:off)`);
        }
      }
    } catch (error) {
      console.log('[scale] parse:error', frame, error.message);
    }
  }

  // 3.5 Antirruido (debounce) y verificación de duplicados
  debouncePublish(kgValue) {
    // Limpiar timer anterior
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Verificar si es duplicado
    if (this.lastPublishedKg === kgValue) {
      console.log(`[scale] stable:${kgValue} (duplicate)`);
      return;
    }

    // Timer de debounce ~200ms
    this.debounceTimer = setTimeout(() => {
      this.publishStable(kgValue);
    }, 200);
  }

  // Publicar valor estable
  publishStable(kgValue) {
    this.lastPublishedKg = kgValue;
    console.log(`[scale] stable:${kgValue}`);
    
    if (this.onStableCallback) {
      this.onStableCallback(kgValue);
    }
  }

  // 3.6 Semántica de startSampling / stopSampling - ORDEN CORRECTO
  async startSampling() {
    if (!this.isProduction) {
      console.log('[scale] 🔧 DEBUG: startSampling() iniciado');
      console.log('[scale] 🔧 DEBUG: Estado actual - connected:', this.connected, 'sampling:', this.sampling);
    }
    
    // Reset de lastStableKg para evitar bloquear primera publicación por duplicado
    this.lastStableKg = null;
    this.lastPublishedKg = null;
    
    if (!this.connected) {
      // Primero: connectIfNeeded() → logs: connecting → auto-connect:attempt → connected
      if (!this.isProduction) {
        console.log('[scale] 🔧 DEBUG: No conectado, llamando connectIfNeeded()');
      }
      try {
        await this.connectIfNeeded();
        
        // Solo si connected: crea el reader, prepara el decoder
        if (this.connected && this.port) {
          if (!this.isProduction) {
            console.log('[scale] 🔧 DEBUG: Conectado exitosamente, creando reader');
          }
          this.startReading();
          
          // Recién ahí: setea sampling=true y emite sampling:start
          this.sampling = true;
          console.log('[scale] sampling:start');
        } else {
          console.log('[scale] ❌ ERROR: connectIfNeeded() no estableció conexión completa');
        }
      } catch (error) {
        console.log('[scale] ❌ ERROR: sampling:failed - connection error:', error.message);
        // Si no se pudo conectar → log de error y NO pongas sampling=true
        this.sampling = false;
      }
    } else {
      // Si ya conectado: verificar que el reader esté activo
      if (this.reader && this.connected) {
        if (!this.isProduction) {
          console.log('[scale] 🔧 DEBUG: Ya conectado, activando sampling');
        }
        this.sampling = true;
        console.log('[scale] sampling:start');
      } else {
        if (!this.isProduction) {
          console.log('[scale] 🔧 DEBUG: Reconectado pero reader inactivo, recreando');
        }
        this.startReading();
        this.sampling = true;
        console.log('[scale] sampling:start');
      }
    }
  }

  stopSampling() {
    this.sampling = false;
    console.log('[scale] sampling:stop');
    // No cierra el puerto, solo detiene el sampling
  }

  disconnect() {
    console.log('[scale] disconnecting');
    
    // Apagado limpio: shuttingDown=true → cancel read → release reader → port.close() → shuttingDown=false
    this.shuttingDown = true;
    
    // Limpiar timer de debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // Limpiar sampling ANTES de cerrar el puerto
    this.sampling = false;
    
    if (this.reader) {
      if (!this.isProduction) {
        console.log('[scale] 🔧 DEBUG: Liberando reader');
      }
      try {
        // Cancelar operación de lectura en curso
        this.reader.cancel();
        this.reader.releaseLock();
      } catch (e) {
        console.log('[scale] ⚠️ WARN: Error al liberar reader:', e.message);
      }
      this.reader = null;
    }

    if (this.port) {
      if (!this.isProduction) {
        console.log('[scale] 🔧 DEBUG: Cerrando puerto');
      }
      try {
        this.port.close();
      } catch (e) {
        console.log('[scale] ⚠️ WARN: Error al cerrar puerto:', e.message);
      }
      this.port = null;
    }

    this.connected = false;
    this.hasReceivedData = false;
    this.lastStableKg = null;
    this.lastPublishedKg = null;
    this.byteBuffer = new Uint8Array(0);
    this.shuttingDown = false;
    
    console.log('[scale] disconnected');
  }

  // 2.5 Manejo de desconexión/errores
  handleDisconnection() {
    this.connected = false;
    this.sampling = false;
    
    if (this.reader) {
      this.reader.releaseLock();
      this.reader = null;
    }
    
    console.log('[scale] error:disconnect');
  }

  // Getters
  isConnected() {
    return this.connected;
  }

  isSampling() {
    return this.sampling;
  }

  // 3.4 Método para registrar callback de valores estables
  setOnStable(callback) {
    this.onStableCallback = callback;
  }
}

// Exportar instancia singleton
export const scaleService = new ScaleService();
