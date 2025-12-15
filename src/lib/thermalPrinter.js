/**
 * Servicio de Impresora Térmica usando Web Serial API
 * Compatible con impresoras ESC/POS como HBA-58C (58mm)
 * 
 * ⚠️ ESTADO: DESACTIVADO TEMPORALMENTE
 * 
 * Razón: La impresora HBA-58C requiere drivers específicos que no son
 * compatibles con Web Serial API de forma nativa.
 * 
 * Para reactivar:
 * 1. Cambiar IMPRESION_TERMICA_HABILITADA = true en RegistroVenta.jsx
 * 2. Verificar que la impresora se detecte como puerto serial
 * 3. O implementar solución alternativa (ver documentación)
 * 
 * Alternativas futuras:
 * - Usar driver de Windows + window.print()
 * - Crear servidor local Node.js con acceso directo a USB
 * - Usar Electron para aplicación de escritorio
 */

class ThermalPrinter {
  constructor() {
    this.port = null;
    this.writer = null;
    this.connected = false;
  }

  /**
   * Verificar si el navegador soporta Web Serial API
   */
  isSupported() {
    return 'serial' in navigator;
  }

  /**
   * Diagnóstico: Listar todos los puertos seriales disponibles
   */
  async diagnostic() {
    console.log('🔍 === DIAGNÓSTICO DE IMPRESORA ===');
    
    // 1. Verificar soporte del navegador
    if (!('serial' in navigator)) {
      console.error('❌ Tu navegador NO soporta Web Serial API');
      console.log('💡 Usa Chrome o Edge versión 89 o superior');
      return {
        supported: false,
        message: 'Navegador no compatible'
      };
    }
    
    console.log('✅ Navegador soporta Web Serial API');
    
    // 2. Verificar permisos previos
    try {
      const ports = await navigator.serial.getPorts();
      console.log(`📊 Puertos seriales con permiso previo: ${ports.length}`);
      
      if (ports.length > 0) {
        ports.forEach((port, index) => {
          console.log(`   Puerto ${index + 1}:`, port);
        });
      } else {
        console.log('⚠️ No hay puertos con permiso previo');
      }
      
      return {
        supported: true,
        portsWithPermission: ports.length,
        message: ports.length > 0 
          ? 'Hay puertos disponibles con permiso' 
          : 'No hay puertos con permiso. Necesitas autorizar la impresora.'
      };
      
    } catch (error) {
      console.error('❌ Error al obtener puertos:', error);
      return {
        supported: true,
        error: error.message
      };
    }
  }

  /**
   * Conectar a la impresora USB (solicita permiso al usuario)
   */
  async connect() {
    try {
      if (!this.isSupported()) {
        throw new Error('Tu navegador no soporta Web Serial API. Usa Chrome o Edge.');
      }

      // Solicitar acceso al puerto serial (impresora USB)
      this.port = await navigator.serial.requestPort();
      
      // Abrir conexión con la impresora
      await this.port.open({ 
        baudRate: 9600, // Velocidad estándar para impresoras térmicas
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      // Obtener el writer para enviar datos
      this.writer = this.port.writable.getWriter();
      this.connected = true;

      console.log('✅ Impresora conectada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error al conectar impresora:', error);
      
      if (error.name === 'NotFoundError') {
        throw new Error('No se seleccionó ninguna impresora');
      } else if (error.name === 'SecurityError') {
        throw new Error('Permiso denegado para acceder a la impresora');
      } else {
        throw new Error(`Error al conectar: ${error.message}`);
      }
    }
  }

  /**
   * Desconectar de la impresora
   */
  async disconnect() {
    try {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.connected = false;
      console.log('✅ Impresora desconectada');

    } catch (error) {
      console.error('❌ Error al desconectar impresora:', error);
    }
  }

  /**
   * Verificar si hay una conexión activa
   */
  isConnected() {
    return this.connected && this.port && this.writer;
  }

  /**
   * Enviar datos raw a la impresora
   */
  async sendRaw(data) {
    if (!this.isConnected()) {
      throw new Error('Impresora no conectada');
    }

    try {
      await this.writer.write(data);
    } catch (error) {
      console.error('❌ Error al enviar datos:', error);
      throw error;
    }
  }

  /**
   * Comandos ESC/POS
   */
  ESC = {
    // Inicializar impresora
    INIT: new Uint8Array([0x1B, 0x40]),
    
    // Alineación
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
    
    // Tamaño de texto
    TEXT_NORMAL: new Uint8Array([0x1D, 0x21, 0x00]),
    TEXT_2X: new Uint8Array([0x1D, 0x21, 0x11]), // Doble alto y ancho
    TEXT_BOLD: new Uint8Array([0x1B, 0x45, 0x01]),
    TEXT_BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
    
    // Avance de línea
    LF: new Uint8Array([0x0A]),
    
    // Cortar papel
    CUT: new Uint8Array([0x1D, 0x56, 0x00]),
    CUT_PARTIAL: new Uint8Array([0x1D, 0x56, 0x01]),
    
    // Abrir cajón de efectivo
    OPEN_DRAWER: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA])
  };

  /**
   * Imprimir texto
   */
  async printText(text) {
    const encoder = new TextEncoder();
    await this.sendRaw(encoder.encode(text));
  }

  /**
   * Nueva línea
   */
  async printLine(text = '') {
    await this.printText(text);
    await this.sendRaw(this.ESC.LF);
  }

  /**
   * Línea separadora
   */
  async printSeparator(char = '-', length = 32) {
    await this.printLine(char.repeat(length));
  }

  /**
   * Centrar texto
   */
  async printCenter(text) {
    await this.sendRaw(this.ESC.ALIGN_CENTER);
    await this.printLine(text);
    await this.sendRaw(this.ESC.ALIGN_LEFT);
  }

  /**
   * Imprimir texto en negrita
   */
  async printBold(text) {
    await this.sendRaw(this.ESC.TEXT_BOLD);
    await this.printLine(text);
    await this.sendRaw(this.ESC.TEXT_BOLD_OFF);
  }

  /**
   * Formatear línea de producto (nombre alineado a izq, precio a der)
   */
  formatProductLine(nombre, precio, maxWidth = 32) {
    const precioStr = `$${precio.toLocaleString()}`;
    const espacios = maxWidth - nombre.length - precioStr.length;
    const espaciosStr = espacios > 0 ? ' '.repeat(espacios) : ' ';
    return `${nombre}${espaciosStr}${precioStr}`;
  }

  /**
   * IMPRIMIR RECIBO DE VENTA
   */
  async printReceipt(venta) {
    try {
      // Inicializar impresora
      await this.sendRaw(this.ESC.INIT);

      // Encabezado
      await this.sendRaw(this.ESC.TEXT_2X);
      await this.printCenter('MI CAJA');
      await this.sendRaw(this.ESC.TEXT_NORMAL);
      
      await this.printCenter('Sistema de Ventas');
      await this.printLine();
      await this.printSeparator('=');
      
      // Fecha y hora
      const fecha = new Date(venta.fecha);
      const fechaStr = fecha.toLocaleDateString('es-CL');
      const horaStr = fecha.toLocaleTimeString('es-CL');
      await this.printLine(`Fecha: ${fechaStr}`);
      await this.printLine(`Hora:  ${horaStr}`);
      await this.printSeparator('=');
      
      // Productos
      await this.printBold('PRODUCTOS:');
      await this.printLine();
      
      for (const producto of venta.productos) {
        // Nombre del producto
        await this.printLine(producto.producto);
        
        // Cantidad x Precio = Subtotal
        const lineaDetalle = `  ${producto.cantidad} ${producto.unidad} x $${producto.precio_unitario.toLocaleString()}`;
        await this.printLine(lineaDetalle);
        
        // Subtotal alineado a la derecha
        await this.sendRaw(this.ESC.ALIGN_RIGHT);
        await this.printLine(`$${producto.subtotal.toLocaleString()}`);
        await this.sendRaw(this.ESC.ALIGN_LEFT);
        await this.printLine();
      }
      
      await this.printSeparator('-');
      
      // Total
      await this.sendRaw(this.ESC.TEXT_2X);
      await this.sendRaw(this.ESC.ALIGN_RIGHT);
      await this.printLine(`TOTAL: $${venta.total.toLocaleString()}`);
      await this.sendRaw(this.ESC.TEXT_NORMAL);
      await this.sendRaw(this.ESC.ALIGN_LEFT);
      
      await this.printSeparator('=');
      
      // Tipo de pago
      const tipoPagoTexto = venta.tipo_pago === 'efectivo' ? 'EFECTIVO' : 
                            venta.tipo_pago === 'transferencia' ? 'TRANSFERENCIA' :
                            venta.tipo_pago === 'debito' ? 'DEBITO' :
                            venta.tipo_pago === 'credito' ? 'CREDITO' : venta.tipo_pago.toUpperCase();
      
      await this.printLine(`Forma de pago: ${tipoPagoTexto}`);
      await this.printLine();
      
      // Mensaje de despedida
      await this.printCenter('Gracias por su compra');
      await this.printCenter('Vuelva pronto!');
      await this.printLine();
      
      // Espacios antes de cortar
      await this.printLine();
      await this.printLine();
      await this.printLine();
      
      // Cortar papel
      await this.sendRaw(this.ESC.CUT);
      
      console.log('✅ Recibo impreso exitosamente');

    } catch (error) {
      console.error('❌ Error al imprimir recibo:', error);
      throw error;
    }
  }

  /**
   * Abrir cajón de efectivo
   */
  async openDrawer() {
    try {
      if (!this.isConnected()) {
        throw new Error('Impresora no conectada');
      }
      
      await this.sendRaw(this.ESC.OPEN_DRAWER);
      console.log('✅ Cajón de efectivo abierto');
      
    } catch (error) {
      console.error('❌ Error al abrir cajón:', error);
      throw error;
    }
  }
}

// Instancia única (singleton)
const thermalPrinter = new ThermalPrinter();

export default thermalPrinter;
