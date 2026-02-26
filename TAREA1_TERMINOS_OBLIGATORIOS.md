# TAREA 1 - Modal Obligatorio de Términos y Condiciones

## ✅ Implementación Completada

Se ha implementado la verificación y el modal obligatorio de Términos y Condiciones que aparece al iniciar sesión.

---

## 📋 Lo que se implementó:

### **1. Verificación al Iniciar Sesión**
```javascript
// En Home.jsx, useEffect
const { data, error } = await supabase
  .from('usuarios')
  .select('terminos_condiciones')
  .eq('usuario_id', userData.id)
  .single();

if (data.terminos_condiciones === 'no') {
  setMostrarTerminosObligatorio(true);
}
```

**Funcionamiento:**
- Al cargar Home, consulta la tabla `usuarios` en Supabase
- Busca la columna `terminos_condiciones` del usuario actual
- Si contiene "no" → Muestra modal obligatorio
- Si contiene otra cosa → No muestra nada

---

### **2. Modal OBLIGATORIO**

**Características:**
- ✅ **No se puede cerrar** (sin botón ✕)
- ✅ **Z-index alto** (100) para estar sobre todo
- ✅ **Fondo oscuro** (80% negro con blur)
- ✅ **Contenido scrolleable** con todos los términos
- ✅ **Colorimetría Mi Caja** (verdes oscuros)

---

### **3. Checkbox de Aceptación**

```jsx
<input
  type="checkbox"
  checked={aceptaTerminos}
  onChange={(e) => setAceptaTerminos(e.target.checked)}
/>
```

**Estado:**
- Inicia en `false` (no marcado)
- Usuario debe marcarlo manualmente
- Controla si el botón está habilitado

---

### **4. Botón "Aceptar y Continuar"**

**Estados del botón:**

| Estado | Checkbox | Color | Texto | Habilitado |
|--------|----------|-------|-------|------------|
| Deshabilitado | ❌ No marcado | Gris | 🔒 Marca el checkbox | No |
| Habilitado | ✅ Marcado | Verde | ✅ Aceptar y Continuar | Sí |

**Comportamiento:**
- Si checkbox no está marcado:
  - Color gris
  - Cursor "not-allowed"
  - Sin hover effect
  - No hace nada al hacer clic

- Si checkbox está marcado:
  - Color verde brillante
  - Sombra verde
  - Scale 1.05
  - Al hacer clic → Ejecuta función (TAREA 2)

---

## 🎨 Diseño Visual

### **Header:**
```
⚠️ Términos y Condiciones
Debes aceptar los términos para continuar usando Mi Caja
```
- Fondo verde claro translúcido
- Icono de advertencia
- Mensaje claro al usuario

### **Contenido:**
- Mismo contenido que el modal de Login
- 7 secciones numeradas
- Scroll habilitado
- Scrollbar verde personalizada

### **Footer:**
```
[ ] Acepto los Términos y Condiciones
    ┌─────────────────────────────────────┐
    │ 🔒 Marca el checkbox para continuar │  ← Gris, deshabilitado
    └─────────────────────────────────────┘
```

Después de marcar:
```
[✓] Acepto los Términos y Condiciones
    ┌─────────────────────────────────────┐
    │ ✅ Aceptar y Continuar              │  ← Verde, habilitado
    └─────────────────────────────────────┘
```

---

## 🔒 Seguridad Implementada

### **El usuario NO puede:**
- ❌ Cerrar el modal con ✕ (no existe el botón)
- ❌ Cerrar con ESC (no implementado)
- ❌ Hacer clic fuera del modal para cerrar
- ❌ Continuar sin marcar el checkbox
- ❌ Usar Mi Caja mientras el modal esté abierto

### **El usuario SOLO puede:**
- ✅ Leer los términos (scroll)
- ✅ Marcar/desmarcar el checkbox
- ✅ Hacer clic en "Aceptar" (solo si marcó checkbox)

---

## 📊 Flujo de Usuario

```
Usuario inicia sesión
        ↓
Home.jsx se carga
        ↓
Consulta tabla "usuarios"
        ↓
terminos_condiciones = "no"?
        ↓
    ┌───┴───┐
    │  SÍ   │ → Muestra modal OBLIGATORIO
    └───────┘        ↓
                Usuario lee términos
                     ↓
                Marca checkbox
                     ↓
                Click "Aceptar"
                     ↓
            [TAREA 2 - Pendiente]
            
    ┌───┴───┐
    │  NO   │ → Home normal (sin modal)
    └───────┘
```

---

## 🧪 Testing - TAREA 1

### **Pruebas a realizar:**

1. **Verificación de consulta:**
   - [ ] Usuario con "no" → Modal aparece
   - [ ] Usuario sin "no" → Modal NO aparece

2. **Modal obligatorio:**
   - [ ] No tiene botón ✕ para cerrar
   - [ ] Cubre toda la pantalla
   - [ ] Contenido es scrolleable

3. **Checkbox:**
   - [ ] Inicia desmarcado
   - [ ] Se puede marcar/desmarcar
   - [ ] Cambia el estado del botón

4. **Botón:**
   - [ ] Gris cuando checkbox desmarcado
   - [ ] Verde cuando checkbox marcado
   - [ ] Texto cambia según estado
   - [ ] No hace nada aún (TAREA 2 pendiente)

---

## 🔄 Estado Actual

### ✅ **TAREA 1 - COMPLETADA:**
- ✅ Consulta a Supabase implementada
- ✅ Modal obligatorio creado
- ✅ Checkbox funcional
- ✅ Botón con estados correcto
- ✅ No se puede cerrar sin aceptar
- ✅ Sin errores de linting

### ⏳ **TAREA 2 - PENDIENTE:**
- ⏳ Guardar datos de aceptación en Supabase
- ⏳ Formato de datos a guardar
- ⏳ Cerrar modal después de guardar
- ⏳ Manejo de errores

---

## 📝 Notas para TAREA 2

### **Placeholder actual:**
```javascript
onClick={() => {
  // TAREA 2: Aquí se agregará la lógica para guardar en Supabase
  console.log('Usuario aceptó términos - TAREA 2 pendiente');
}}
```

### **Lo que falta implementar:**
1. Obtener datos del usuario
2. Obtener fecha y hora de Chile
3. Obtener IP y User Agent
4. Formatear JSON con todos los datos
5. UPDATE en tabla `usuarios`
6. Cerrar modal (`setMostrarTerminosObligatorio(false)`)
7. Manejo de errores

---

## 🎯 Próximo Paso

**Esperar confirmación del usuario** de que la TAREA 1 funciona correctamente antes de proceder con la TAREA 2.

**Para probar:**
1. Verificar que en Supabase, tabla `usuarios`, columna `terminos_condiciones` tenga "no"
2. Iniciar sesión
3. Debe aparecer el modal obligatorio
4. Intentar usar Mi Caja → No debe poder (modal bloquea)
5. Marcar checkbox → Botón se activa
6. Click en "Aceptar" → Solo muestra console.log por ahora

**¡TAREA 1 lista para testing!** ✅
