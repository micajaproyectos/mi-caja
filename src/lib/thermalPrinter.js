/**
 * Servicio de Impresora Térmica usando window.print()
 * Compatible con impresoras térmicas que funcionan como impresoras estándar de Windows
 * Modelo: XPrinter XP-58IIH (58mm)
 * 
 * Esta implementación usa window.print() que funciona con cualquier impresora
 * instalada como impresora estándar de Windows.
 * 
 * El navegador Chrome/Edge recordará la impresora seleccionada por el usuario.
 */

class ThermalPrinter {
  constructor() {
    // No se requiere inicialización especial
  }

  /**
   * Verificar si el navegador soporta impresión
   */
  isSupported() {
    return typeof window !== 'undefined' && typeof window.print === 'function';
  }

  /**
   * Generar texto plano del recibo de venta rápida (solo monto, sin productos)
   */
  generarReciboVentaRapidaTxt(venta, nombreUsuario = 'MI CAJA') {
    // Obtener fecha en zona horaria de Chile (Santiago)
    const fecha = new Date(venta.fecha);
    const fechaStr = fecha.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' });
    
    // Obtener hora actual en zona horaria de Chile (Santiago)
    const ahora = new Date();
    const horaStr = ahora.toLocaleTimeString('es-CL', { 
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const tipoPagoTexto = venta.tipo_pago === 'efectivo' ? 'EFECTIVO' : 
                          venta.tipo_pago === 'transferencia' ? 'TRANSFERENCIA' :
                          venta.tipo_pago === 'debito' ? 'DEBITO' :
                          venta.tipo_pago === 'credito' ? 'CREDITO' : 
                          venta.tipo_pago.toUpperCase();

    const anchoLinea = 30; // 30 caracteres para impresoras de 58mm
    
    // Función para centrar texto
    const centrar = (texto) => {
      const espacios = Math.floor((anchoLinea - texto.length) / 2);
      return ' '.repeat(Math.max(0, espacios)) + texto;
    };
    
    // Función para alinear a la derecha
    const alinearDerecha = (texto) => {
      const espacios = anchoLinea - texto.length;
      return ' '.repeat(Math.max(0, espacios)) + texto;
    };
    
    // Función para línea separadora
    const separador = (caracter = '=') => {
      return caracter.repeat(anchoLinea);
    };
    
    // Construir el recibo línea por línea
    let recibo = '\n';
    recibo += 'Nota de Venta\n';
    recibo += centrar(nombreUsuario.toUpperCase()) + '\n';
    recibo += separador('=') + '\n';
    recibo += `Fecha: ${fechaStr}\n`;
    recibo += `Hora:  ${horaStr}\n`;
    recibo += separador('=') + '\n\n';
    
    // Monto centrado y grande (solo una vez)
    const montoFormateado = `$${venta.monto.toLocaleString()}`;
    recibo += '\n';
    recibo += centrar(montoFormateado) + '\n';
    recibo += '\n';
    
    recibo += separador('=') + '\n';
    recibo += `Forma de pago: ${tipoPagoTexto}\n\n`;
    recibo += centrar('Gracias por su compra') + '\n';
    recibo += centrar('Vuelva pronto!') + '\n';
    recibo += centrar('Sistema de Ventas Mi Caja') + '\n';
    recibo += centrar('www.micajaempresa.cl') + '\n\n\n';
    
    return recibo;
  }

  /**
   * Generar HTML del recibo de venta rápida
   */
  generarReciboVentaRapidaHTML(venta, nombreUsuario = 'MI CAJA') {
    const reciboTxt = this.generarReciboVentaRapidaTxt(venta, nombreUsuario);

    // Procesar el texto para hacer el monto más grande y "Nota de Venta" más pequeño
    const montoFormateado = `$${venta.monto.toLocaleString()}`;
    let reciboProcesado = reciboTxt;
    
    // Encontrar las líneas con el monto y reemplazarlas
    reciboProcesado = reciboProcesado.replace(
      new RegExp(`^\\s*${montoFormateado.replace(/\$/g, '\\$').replace(/\./g, '\\.')}\\s*$`, 'gm'),
      `<span class="monto-grande">${montoFormateado}</span>`
    );
    
    // Encontrar "Nota de Venta" alineado a la izquierda y reemplazarlo con tamaño más pequeño y negrita
    reciboProcesado = reciboProcesado.replace(
      /^Nota de Venta$/gm,
      '<span class="nota-venta">Nota de Venta</span>'
    );
    
    // Escapar el resto del HTML
    const reciboHTML = reciboProcesado
      .split('\n')
      .map(linea => {
        // Si ya tiene spans, no escapar
        if (linea.includes('<span')) {
          return linea;
        }
        // Escapar HTML para el resto
        return linea
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      })
      .join('\n')
      // Restaurar los spans después de escapar
      .replace(/&lt;span class=&quot;monto-grande&quot;&gt;/g, '<span class="monto-grande">')
      .replace(/&lt;span class=&quot;nota-venta&quot;&gt;/g, '<span class="nota-venta">')
      .replace(/&lt;\/span&gt;/g, '</span>');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recibo de Venta Rápida</title>
  <style>
    @page {
      size: 58mm;
      margin: 0;
      padding: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: 58mm;
      height: auto;
      min-height: auto;
      margin: 0;
      padding: 0;
      font-family: 'Courier New', 'Courier', 'Monaco', monospace;
      font-size: 11pt;
      line-height: 1.4;
      letter-spacing: 0.02em;
      color: #000;
      background: #fff;
      overflow: visible;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    body {
      padding: 3mm 2mm;
    }
    
    .recibo {
      width: 100%;
      max-width: 58mm;
      height: auto;
      min-height: auto;
      white-space: pre;
      font-family: 'Courier New', 'Courier', 'Monaco', monospace;
      font-size: 11pt;
      line-height: 1.4;
      letter-spacing: 0.02em;
      font-weight: bold;
    }
    
    .monto-grande {
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.1em;
      display: inline-block;
      width: 100%;
      text-align: center;
    }
    
    .nota-venta {
      font-size: 8pt;
      font-weight: bold;
    }
    
    @media print {
      html, body {
        width: 58mm;
        height: auto !important;
        min-height: auto !important;
        margin: 0;
        padding: 0;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
        font-size: 11pt !important;
        line-height: 1.4 !important;
        letter-spacing: 0.02em !important;
      }
      
      body {
        padding: 3mm 2mm;
      }
      
      @page {
        size: 58mm;
        margin: 0;
        padding: 0;
      }
      
      /* Forzar que el contenido se ajuste sin espacios extra */
      html {
        overflow: hidden;
      }
      
      .recibo {
        width: 100%;
        height: auto !important;
        page-break-after: avoid;
        white-space: pre !important;
        font-size: 11pt !important;
        line-height: 1.4 !important;
        letter-spacing: 0.02em !important;
        font-weight: bold !important;
      }
      
      .monto-grande {
        font-size: 20pt !important;
        font-weight: bold !important;
        letter-spacing: 0.1em !important;
        display: inline-block !important;
        width: 100% !important;
        text-align: center !important;
      }
      
      .nota-venta {
        font-size: 8pt !important;
        font-weight: bold !important;
      }
      
      /* Evitar saltos de página innecesarios */
      * {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <pre class="recibo">${reciboHTML}</pre>
</body>
</html>
    `;
  }

  /**
   * IMPRIMIR RECIBO DE VENTA RÁPIDA usando window.print()
   */
  async printReceiptVentaRapida(venta, nombreUsuario = 'MI CAJA') {
    try {
      // Generar HTML del recibo
      const reciboHTML = this.generarReciboVentaRapidaHTML(venta, nombreUsuario);
      
      // Crear ventana de impresión (tamaño pequeño para recibos de 58mm)
      const ventanaImpresion = window.open('', '_blank', 'width=220,height=400');
      
      if (!ventanaImpresion) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén habilitados.');
      }
      
      // Escribir el HTML en la ventana
      ventanaImpresion.document.write(reciboHTML);
      ventanaImpresion.document.close();
      
      // Esperar a que se cargue el contenido
      await new Promise(resolve => {
        ventanaImpresion.onload = () => {
          // Esperar un momento adicional para asegurar el renderizado
          setTimeout(() => {
            resolve();
          }, 100);
        };
        
        // Fallback: si onload no se dispara, esperar un tiempo fijo
        setTimeout(() => {
          resolve();
        }, 500);
      });
      
      // Llamar a window.print() - Chrome mostrará el diálogo de impresión
      ventanaImpresion.print();
      
      // Cerrar la ventana después de un tiempo (por si el usuario cancela)
      setTimeout(() => {
        if (ventanaImpresion && !ventanaImpresion.closed) {
          ventanaImpresion.close();
        }
      }, 1000);
      
      console.log('✅ Recibo de venta rápida enviado a impresión');
      
    } catch (error) {
      console.error('❌ Error al imprimir recibo de venta rápida:', error);
      throw error;
    }
  }

  /**
   * Generar texto plano del recibo formateado para impresión térmica 58mm
   */
  generarReciboTxt(venta, nombreUsuario = 'MI CAJA') {
    // Obtener fecha en zona horaria de Chile (Santiago)
    const fecha = new Date(venta.fecha);
    const fechaStr = fecha.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' });
    
    // Obtener hora actual en zona horaria de Chile (Santiago)
    const ahora = new Date();
    const horaStr = ahora.toLocaleTimeString('es-CL', { 
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const tipoPagoTexto = venta.tipo_pago === 'efectivo' ? 'EFECTIVO' : 
                          venta.tipo_pago === 'transferencia' ? 'TRANSFERENCIA' :
                          venta.tipo_pago === 'debito' ? 'DEBITO' :
                          venta.tipo_pago === 'credito' ? 'CREDITO' : 
                          venta.tipo_pago.toUpperCase();

    const anchoLinea = 30; // 30 caracteres para impresoras de 58mm (ajustado para mejor legibilidad)
    
    // Función para centrar texto
    const centrar = (texto) => {
      const espacios = Math.floor((anchoLinea - texto.length) / 2);
      return ' '.repeat(Math.max(0, espacios)) + texto;
    };
    
    // Función para alinear a la derecha
    const alinearDerecha = (texto) => {
      const espacios = anchoLinea - texto.length;
      return ' '.repeat(Math.max(0, espacios)) + texto;
    };
    
    // Función para línea separadora
    const separador = (caracter = '=') => {
      return caracter.repeat(anchoLinea);
    };
    
    // Construir el recibo línea por línea
    let recibo = '\n';
    recibo += 'Nota de Venta\n';
    recibo += centrar(nombreUsuario.toUpperCase()) + '\n';
    recibo += separador('=') + '\n';
    recibo += `Fecha: ${fechaStr}\n`;
    recibo += `Hora:  ${horaStr}\n`;
    recibo += separador('=') + '\n';
    recibo += 'PRODUCTOS:\n\n';
    
    // Productos
    venta.productos.forEach(producto => {
      const subtotal = parseFloat(producto.subtotal) || 0;
      const cantidad = parseFloat(producto.cantidad) || 0;
      const precioUnitario = parseFloat(producto.precio_unitario) || 0;
      
      // Nombre del producto (puede ocupar múltiples líneas si es largo)
      const nombreProducto = producto.producto;
      if (nombreProducto.length <= anchoLinea) {
        recibo += nombreProducto + '\n';
      } else {
        // Dividir en múltiples líneas
        let resto = nombreProducto;
        while (resto.length > anchoLinea) {
          recibo += resto.substring(0, anchoLinea) + '\n';
          resto = resto.substring(anchoLinea);
        }
        if (resto.length > 0) {
          recibo += resto + '\n';
        }
      }
      
      // Detalle del producto
      const detalle = `  ${cantidad} ${producto.unidad} x $${precioUnitario.toLocaleString()}`;
      recibo += detalle + '\n';
      
      // Subtotal alineado a la derecha con margen de seguridad
      const margenSeguridad = 2; // Espacios de margen a la derecha
      const anchoDisponible = anchoLinea - margenSeguridad;
      const subtotalTexto = `$${subtotal.toLocaleString()}`;
      const espacios = anchoDisponible - subtotalTexto.length;
      recibo += ' '.repeat(Math.max(0, espacios)) + subtotalTexto + '\n\n';
    });
    
    recibo += separador('-') + '\n';
    
    // Total - alineado a la derecha con margen de seguridad
    const totalNumero = venta.total.toLocaleString();
    const totalTexto = `TOTAL: $${totalNumero}`;
    
    // Asegurar que no exceda el ancho de línea y dejar margen de seguridad
    const margenSeguridad = 2; // Espacios de margen a la derecha
    const anchoDisponible = anchoLinea - margenSeguridad;
    
    if (totalTexto.length <= anchoDisponible) {
      // Alinear a la derecha con margen de seguridad
      const espacios = anchoDisponible - totalTexto.length;
      recibo += ' '.repeat(Math.max(0, espacios)) + totalTexto + '\n';
    } else {
      // Si es muy largo, poner en dos líneas
      recibo += 'TOTAL:\n';
      const espacios = anchoDisponible - totalNumero.length - 1;
      recibo += ' '.repeat(Math.max(0, espacios)) + '$' + totalNumero + '\n';
    }
    
    recibo += separador('=') + '\n';
    recibo += `Forma de pago: ${tipoPagoTexto}\n\n`;
    recibo += centrar('Gracias por su compra') + '\n';
    recibo += centrar('Vuelva pronto!') + '\n';
    recibo += centrar('Sistema de Ventas Mi Caja') + '\n';
    recibo += centrar('www.micajaempresa.cl') + '\n\n\n';
    
    return recibo;
  }

  /**
   * Generar HTML del recibo optimizado para impresión térmica 58mm
   * Usa texto preformateado para evitar problemas con drivers de impresora
   */
  generarReciboHTML(venta, nombreUsuario = 'MI CAJA') {
    const reciboTxt = this.generarReciboTxt(venta, nombreUsuario);

    // Procesar el texto para hacer "Nota de Venta" más pequeño
    let reciboProcesado = reciboTxt;
    
    // Encontrar "Nota de Venta" alineado a la izquierda y reemplazarlo con tamaño más pequeño y negrita
    reciboProcesado = reciboProcesado.replace(
      /^Nota de Venta$/gm,
      '<span class="nota-venta">Nota de Venta</span>'
    );
    
    // Escapar el texto para HTML
    const reciboEscapado = reciboProcesado
      .split('\n')
      .map(linea => {
        // Si ya tiene spans, no escapar
        if (linea.includes('<span')) {
          return linea;
        }
        // Escapar HTML para el resto
        return linea
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      })
      .join('\n')
      // Restaurar los spans después de escapar
      .replace(/&lt;span class=&quot;nota-venta&quot;&gt;/g, '<span class="nota-venta">')
      .replace(/&lt;\/span&gt;/g, '</span>');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recibo de Venta</title>
  <style>
    @page {
      size: 58mm;
      margin: 0;
      padding: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: 58mm;
      height: auto;
      min-height: auto;
      margin: 0;
      padding: 0;
      font-family: 'Courier New', 'Courier', 'Monaco', monospace;
      font-size: 11pt;
      line-height: 1.4;
      letter-spacing: 0.02em;
      color: #000;
      background: #fff;
      overflow: visible;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    body {
      padding: 3mm 2mm;
    }
    
    .recibo {
      width: 100%;
      max-width: 58mm;
      height: auto;
      min-height: auto;
      white-space: pre;
      font-family: 'Courier New', 'Courier', 'Monaco', monospace;
      font-size: 11pt;
      line-height: 1.4;
      letter-spacing: 0.02em;
      font-weight: bold;
    }
    
    .nota-venta {
      font-size: 8pt;
      font-weight: bold;
    }
    
    @media print {
      html, body {
        width: 58mm;
        height: auto !important;
        min-height: auto !important;
        margin: 0;
        padding: 0;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
        font-size: 11pt !important;
        line-height: 1.4 !important;
        letter-spacing: 0.02em !important;
      }
      
      body {
        padding: 3mm 2mm;
      }
      
      @page {
        size: 58mm;
        margin: 0;
        padding: 0;
      }
      
      /* Forzar que el contenido se ajuste sin espacios extra */
      html {
        overflow: hidden;
      }
      
      .recibo {
        width: 100%;
        height: auto !important;
        page-break-after: avoid;
        white-space: pre;
        font-size: 11pt !important;
        line-height: 1.4 !important;
        letter-spacing: 0.02em !important;
        font-weight: bold !important;
      }
      
      .nota-venta {
        font-size: 8pt !important;
        font-weight: bold !important;
      }
      
      /* Evitar saltos de página innecesarios */
      * {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <pre class="recibo">${reciboEscapado}</pre>
</body>
</html>
    `;
  }

  /**
   * IMPRIMIR RECIBO DE VENTA usando window.print()
   */
  async printReceipt(venta, nombreUsuario = 'MI CAJA') {
    try {
      // Generar HTML del recibo
      const reciboHTML = this.generarReciboHTML(venta, nombreUsuario);
      
      // Crear ventana de impresión (tamaño pequeño para recibos de 58mm)
      const ventanaImpresion = window.open('', '_blank', 'width=220,height=400');
      
      if (!ventanaImpresion) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén habilitados.');
      }
      
      // Escribir el HTML en la ventana
      ventanaImpresion.document.write(reciboHTML);
      ventanaImpresion.document.close();
      
      // Esperar a que se cargue el contenido
      await new Promise(resolve => {
        ventanaImpresion.onload = () => {
          // Esperar un momento adicional para asegurar el renderizado
          setTimeout(() => {
            resolve();
          }, 100);
        };
        
        // Fallback: si onload no se dispara, esperar un tiempo fijo
        setTimeout(() => {
          resolve();
        }, 500);
      });
      
      // Llamar a window.print() - Chrome mostrará el diálogo de impresión
      ventanaImpresion.print();
      
      // Cerrar la ventana después de un tiempo (por si el usuario cancela)
      setTimeout(() => {
        if (ventanaImpresion && !ventanaImpresion.closed) {
          ventanaImpresion.close();
        }
      }, 1000);
      
      console.log('✅ Recibo enviado a impresión');
      
    } catch (error) {
      console.error('❌ Error al imprimir recibo:', error);
      throw error;
    }
  }

  /**
   * Diagnóstico de impresora
   */
  async diagnostic() {
    return {
      supported: this.isSupported(),
      method: 'window.print()',
      message: this.isSupported() 
        ? 'Impresión disponible mediante window.print()' 
        : 'Navegador no compatible'
    };
  }
}

// Instancia única (singleton)
const thermalPrinter = new ThermalPrinter();

export default thermalPrinter;
