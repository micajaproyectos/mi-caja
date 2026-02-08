# Solución: Inputs Numéricos Cambian con Scroll del Touchpad

## 🐛 Problema Reportado

Los usuarios reportaron que cuando usan el touchpad (o rueda del mouse) sobre los campos numéricos, el valor se modifica accidentalmente. Esto es especialmente problemático en:

- **Monto pagado por el cliente**
- **Caja inicial**
- **Cantidad de productos**
- **Porcentaje de propina**
- **Campos de edición en la tabla** (Precio, Total, Total Final, Propina)

## 🔍 Causa del Problema

Los inputs de tipo `<input type="number">` en HTML5 tienen un comportamiento nativo donde:

- **Scroll hacia arriba** → Incrementa el valor
- **Scroll hacia abajo** → Decrementa el valor

Esto es útil cuando el usuario QUIERE cambiar el valor, pero muy frustrante cuando:
1. El usuario está scrolleando la página
2. El cursor pasa por encima de un input numérico
3. El valor cambia sin querer

### **Ejemplo del problema:**
```
Usuario quiere scrollear la página ↓
    ↓
Cursor pasa sobre "Monto pagado: 50000"
    ↓
Scroll involuntario cambia a: 50100, 50200, 50300...
    ↓
Usuario confundido y frustrado 😤
```

## ✅ Solución Implementada

Se agregó el evento `onWheel={(e) => e.target.blur()}` a todos los inputs numéricos problemáticos.

### **Cómo funciona:**

```javascript
<input
  type="number"
  value={montoPagado}
  onChange={(e) => setMontoPagado(e.target.value)}
  onWheel={(e) => e.target.blur()}  // ← SOLUCIÓN
  placeholder="Ingresa el monto recibido"
/>
```

**Comportamiento:**
1. Usuario hace scroll con el cursor sobre el input
2. El evento `onWheel` detecta el scroll
3. `e.target.blur()` quita el foco del input
4. Sin foco, el scroll NO cambia el valor
5. El scroll continúa scrolleando la página normalmente

### **Ventajas de esta solución:**

✅ **No invasiva:** El input sigue siendo tipo `number`  
✅ **Mantiene funcionalidad de teclado:** Las flechas ↑↓ siguen funcionando  
✅ **Mantiene validación:** min, max, step siguen activos  
✅ **UX mejorada:** El scroll hace lo que el usuario espera  
✅ **Compatible:** Funciona en todos los navegadores modernos  

## 📝 Inputs Modificados

### **1. Campo de Cantidad de Producto**
```javascript
// Línea ~3074
<input
  type="number"
  name="cantidad"
  value={productoActual.cantidad}
  onChange={handleChange}
  onWheel={(e) => e.target.blur()}  // ← AGREGADO
/>
```

### **2. Porcentaje de Propina**
```javascript
// Línea ~3491
<input
  type="number"
  min="0"
  max="50"
  value={porcentajePropina}
  onChange={(e) => setPorcentajePropina(parseFloat(e.target.value) || 0)}
  onWheel={(e) => e.target.blur()}  // ← AGREGADO
/>
```

### **3. Caja Inicial**
```javascript
// Línea ~3564
<input
  type="number"
  value={cajaInicial}
  onChange={(e) => { /* ... */ }}
  onWheel={(e) => e.target.blur()}  // ← AGREGADO
  placeholder="Ej: 20000"
/>
```

### **4. Monto Pagado por Cliente**
```javascript
// Línea ~3586
<input
  type="number"
  value={montoPagado}
  onChange={(e) => { /* ... */ }}
  onWheel={(e) => e.target.blur()}  // ← AGREGADO
  placeholder="Ingresa el monto recibido"
/>
```

### **5-8. Campos de Edición en Tabla**
```javascript
// Precio (Línea ~4089)
// Total (Línea ~4107)
// Total Final (Línea ~4126)
// Propina (Línea ~4148)
<input
  type="number"
  step="0.01"
  value={valoresEdicion.precio}
  onChange={(e) => handleEdicionChange('precio', e.target.value)}
  onWheel={(e) => e.target.blur()}  // ← AGREGADO
/>
```

## 🎯 Resultado

### **Antes:**
```
Usuario scrollea página
   ↓
Cursor sobre input numérico
   ↓
Valor cambia accidentalmente: 50000 → 50100 → 50200
   ↓
😤 Usuario frustrado
```

### **Después:**
```
Usuario scrollea página
   ↓
Cursor sobre input numérico
   ↓
Input pierde foco automáticamente
   ↓
Scroll continúa normalmente en la página
   ↓
✅ Valor NO cambia
   ↓
😊 Usuario feliz
```

## 🧪 Testing Recomendado

1. **Probar scroll sobre "Monto pagado":**
   - Mover cursor sobre el campo
   - Hacer scroll con touchpad o rueda del mouse
   - Verificar que el valor NO cambia

2. **Probar funcionalidad de teclado:**
   - Click en el campo para enfocarlo
   - Presionar flechas ↑↓
   - Verificar que SÍ cambia el valor

3. **Probar en diferentes campos:**
   - Caja inicial
   - Cantidad de producto
   - Porcentaje de propina
   - Campos de edición en tabla

4. **Probar en diferentes dispositivos:**
   - Desktop con mouse
   - Laptop con touchpad
   - Tablet con gestos

## 📊 Campos NO Modificados (y por qué)

Los siguientes inputs NO se modificaron porque NO son problemáticos:

1. **Inputs tipo `text`**: No tienen el problema de scroll
2. **Inputs tipo `date`**: No se alteran con scroll
3. **Inputs tipo `datetime-local`**: No se alteran con scroll
4. **Selectores (`<select>`)**: No se alteran con scroll

## 🔧 Archivos Modificados

### `src/components/Pedidos.jsx`
- ✅ Línea ~3075: Campo cantidad de producto
- ✅ Línea ~3492: Porcentaje de propina
- ✅ Línea ~3565: Caja inicial
- ✅ Línea ~3587: Monto pagado
- ✅ Línea ~4090: Campo precio en tabla
- ✅ Línea ~4108: Campo total en tabla
- ✅ Línea ~4127: Campo total final en tabla
- ✅ Línea ~4149: Campo propina en tabla

## 💡 Alternativas Consideradas

### **Alternativa 1: Cambiar a `type="text"`**
```javascript
<input type="text" pattern="[0-9]*" />
```
**Descartada porque:**
- ❌ Pierde validación nativa
- ❌ Pierde botones de incremento/decremento
- ❌ Más código de validación manual necesario

### **Alternativa 2: CSS `pointer-events: none`**
```css
input[type="number"] {
  pointer-events: none;
}
```
**Descartada porque:**
- ❌ El usuario no podría hacer click en el campo
- ❌ Muy invasiva

### **Alternativa 3: JavaScript global**
```javascript
document.addEventListener('wheel', (e) => {
  if (e.target.type === 'number') {
    e.preventDefault();
  }
});
```
**Descartada porque:**
- ❌ Afecta TODOS los inputs numéricos globalmente
- ❌ Puede tener efectos secundarios no deseados

### **✅ Solución Elegida: `onWheel={(e) => e.target.blur()}`**
**Por qué es la mejor:**
- ✅ Quirúrgica (solo afecta inputs específicos)
- ✅ Mantiene toda la funcionalidad nativa
- ✅ UX intuitiva
- ✅ Fácil de implementar y mantener

## 🎉 Conclusión

El problema de inputs numéricos cambiando accidentalmente con el scroll está **completamente resuelto** en todos los campos críticos del módulo de Pedidos.

Los usuarios ahora pueden:
- ✅ Scrollear la página sin temor a cambiar valores accidentalmente
- ✅ Usar las flechas del teclado cuando quieran cambiar valores intencionalmente
- ✅ Tener una experiencia más fluida y sin frustraciones

**Impacto:** Mejora significativa en UX, especialmente para usuarios de laptops con touchpad.
