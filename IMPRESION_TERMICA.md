# 🖨️ Documentación de Impresión Térmica

## ⚠️ ESTADO ACTUAL: DESACTIVADO

La funcionalidad de impresión térmica está **temporalmente desactivada** porque la impresora HBA-58C requiere drivers específicos que no son compatibles con Web Serial API de forma nativa.

---

## 📋 Índice
1. [Cómo Reactivar](#cómo-reactivar)
2. [Por qué está desactivado](#por-qué-está-desactivado)
3. [Alternativas Futuras](#alternativas-futuras)
4. [Código Implementado](#código-implementado)

---

## 🔄 Cómo Reactivar

Para reactivar la impresión térmica cuando tengas una impresora compatible:

### Paso 1: Cambiar el Flag
En `src/components/RegistroVenta.jsx`, línea ~27:

```javascript
// Cambiar de false a true
const IMPRESION_TERMICA_HABILITADA = true;
```

### Paso 2: Verificar Compatibilidad
1. Abre la aplicación
2. Ve a Registro de Ventas
3. Aparecerá un botón "🔍 Diagnosticar impresora"
4. Haz clic y revisa la consola (F12)

### Paso 3: Probar
1. Agrega productos a una venta
2. Haz clic en "Procesar Venta"
3. Dirá: "¿Desea imprimir el recibo?"
4. Si dices Sí, se abrirá selector de dispositivos USB
5. Selecciona tu impresora

---

## ❌ Por qué está desactivado

### Problema Identificado
La impresora **HBA-58C (58mm)** no se detecta como puerto serial en Chrome porque:

1. **No es un puerto serial nativo**: Algunas impresoras USB térmicas se instalan como dispositivos de impresora del sistema operativo, no como puertos seriales
2. **Requiere drivers específicos**: Necesita drivers propietarios del fabricante
3. **Web Serial API no la detecta**: Chrome no puede acceder directamente al dispositivo USB

### Error Observado
```
SecurityError: Failed to execute 'requestPort' on 'Serial': 
Must be handling a user gesture to show a permission request.
```

Aunque se solucionó el error de timing, la impresora aún no aparece en el selector porque no se expone como puerto serial.

---

## 🔧 Alternativas Futuras

### Opción 1: Driver de Windows + window.print() ⭐ MÁS FÁCIL

**Cómo funciona:**
- Instalar driver oficial de la HBA-58C en Windows
- Configurar impresora como predeterminada
- Usar `window.print()` del navegador
- Generar recibo en HTML/CSS

**Ventajas:**
- ✅ Fácil de implementar
- ✅ Funciona en cualquier navegador
- ✅ No requiere permisos especiales
- ✅ Funciona inmediatamente

**Desventajas:**
- ❌ Muestra diálogo de impresión (no automático)
- ❌ No puede abrir cajón de efectivo
- ❌ Usuario debe hacer clic en "Imprimir"
- ❌ Formato limitado a HTML/CSS

**Implementación:**
```javascript
// Crear recibo en HTML
const reciboHTML = generarReciboHTML(venta);

// Abrir ventana de impresión
const ventana = window.open('', '', 'width=300,height=600');
ventana.document.write(reciboHTML);
ventana.print();
ventana.close();
```

---

### Opción 2: Servidor Local Node.js ⭐ RECOMENDADO

**Cómo funciona:**
- Crear pequeño servidor Node.js que corre en segundo plano
- Usar librería `escpos` o `node-thermal-printer`
- Comunicación via WebSockets entre app y servidor
- El servidor maneja impresión directa por USB

**Ventajas:**
- ✅ Control total de la impresora
- ✅ Impresión automática sin diálogos
- ✅ Puede abrir cajón de efectivo
- ✅ Funciona en cualquier navegador
- ✅ App web sigue siendo web

**Desventajas:**
- ❌ Usuario debe instalar Node.js
- ❌ Debe ejecutar el servidor en background
- ❌ Más complejo de configurar
- ❌ Requiere mantenimiento del servidor

**Estructura:**
```
mi-caja/
├── src/                    (App web - React)
├── printer-server/         (Servidor local - Node.js)
│   ├── index.js           (Servidor Express + WebSocket)
│   ├── printer.js         (Manejo de impresora)
│   └── package.json
└── IMPRESION_TERMICA.md   (Este archivo)
```

**Librerías a usar:**
- `escpos` - Control de impresoras ESC/POS
- `escpos-usb` - Conexión USB directa
- `socket.io` - Comunicación WebSocket
- `express` - Servidor HTTP

---

### Opción 3: Electron (Aplicación de Escritorio)

**Cómo funciona:**
- Convertir toda la app a Electron
- Acceso nativo a USB desde Node.js
- Empaquetada como aplicación instalable

**Ventajas:**
- ✅ Control total del sistema
- ✅ No requiere navegador
- ✅ Funciona offline
- ✅ Puede abrir cajón

**Desventajas:**
- ❌ Requiere reescribir estructura
- ❌ Usuario debe instalar app
- ❌ Mantenimiento de versiones
- ❌ Mayor complejidad

---

## 📦 Código Implementado (Listo para usar)

### Archivos Modificados:

1. **`src/lib/thermalPrinter.js`**
   - Clase completa con comandos ESC/POS
   - Métodos para conectar, imprimir, abrir cajón
   - Función de diagnóstico
   - ⚠️ Actualmente sin usar

2. **`src/components/RegistroVenta.jsx`**
   - Integración con flujo de ventas
   - Pregunta antes de imprimir
   - Manejo de errores
   - ⚠️ Controlado por flag `IMPRESION_TERMICA_HABILITADA`

### Funciones Disponibles:

```javascript
// Conectar a impresora
await thermalPrinter.connect();

// Imprimir recibo
await thermalPrinter.printReceipt({
  fecha: '2025-12-14',
  tipo_pago: 'efectivo',
  productos: [...],
  total: 15000
});

// Abrir cajón
await thermalPrinter.openDrawer();

// Diagnóstico
await thermalPrinter.diagnostic();

// Desconectar
await thermalPrinter.disconnect();
```

---

## 🎯 Próximos Pasos Recomendados

### Para Probar con Otra Impresora:

1. Conseguir una impresora térmica que:
   - Se exponga como puerto serial USB
   - Sea compatible con comandos ESC/POS
   - Funcione con Web Serial API

2. Impresoras recomendadas:
   - Epson TM-T20
   - Star TSP143III
   - Cualquiera con chipset CH340/CP210x

### Para Implementar Alternativa:

**Si quieres usar la HBA-58C:**
- Implementar Opción 2 (Servidor Local Node.js) ⭐ RECOMENDADO
- O usar Opción 1 (window.print) como solución temporal

---

## 📞 Soporte

Si necesitas ayuda para:
- Reactivar la funcionalidad
- Implementar alguna alternativa
- Probar con otra impresora

Solo cambia el flag a `true` y sigue las instrucciones de diagnóstico.

---

**Última actualización:** 14 de diciembre, 2025
**Estado:** Código implementado, desactivado temporalmente
**Motivo:** Incompatibilidad de drivers con Web Serial API
