# 🚨 SISTEMA GLOBAL DE ALERTAS DE STOCK BAJO

## 📋 Resumen de Implementación

Se ha implementado un sistema **global e insistente** de alertas de stock bajo que funciona en toda la aplicación, con verificación automática cada 5 minutos.

---

## 🎯 CARACTERÍSTICAS PRINCIPALES

### ✅ 1. Sistema Completamente Global
- **El popup aparece en CUALQUIER componente** donde esté el usuario
- No depende de estar en la sección "Insumos"
- Funciona en Ventas, Stock, Inventario, Pedidos, etc.

### ✅ 2. Verificación Automática cada 5 Minutos
- **Intervalo automático**: Verifica stock crítico cada 5 minutos
- **Verificación inicial**: Se ejecuta 3 segundos después de cargar la app
- **Continúa ejecutándose** independientemente del componente activo

### ✅3. Comportamiento Insistente
- **Al cerrar sin aplazar**: La alerta vuelve a aparecer en 5 minutos
- **Al aplazar**: Respeta el tiempo seleccionado (15min, 1hr, mañana)
- **No se puede ignorar**: Seguirá apareciendo hasta que se resuelva el problema

### ✅ 4. Limpieza Automática
- **Después de compras**: Verifica inmediatamente si el stock sigue crítico
- **Si ya no es crítico**: Desactiva la alerta automáticamente
- **Actualiza insumos**: Mantiene la lista actualizada incluso durante aplazamientos

### ✅ 5. Optimización de Recursos
- **Pausa cuando la pestaña está oculta**: No consume recursos innecesarios
- **Reanuda al volver**: Activa verificaciones cuando la pestaña vuelve a estar visible
- **Anti-duplicación**: Evita verificaciones duplicadas muy seguidas (mínimo 10 segundos)

---

## 📁 ARCHIVOS CREADOS/MODIFICADOS

### Nuevos Archivos:
1. **`src/contexts/AlertasStockContext.jsx`**
   - Context global que maneja toda la lógica de alertas
   - Intervalo de verificación de 5 minutos
   - Gestión de aplazamientos
   - Control de reaparición automática

2. **`src/components/AlertaStockBajoGlobal.jsx`**
   - Componente wrapper que renderiza el popup globalmente
   - Se conecta al context para obtener datos de la alerta

3. **`SISTEMA_ALERTAS_STOCK_GLOBAL.md`** (este archivo)
   - Documentación completa del sistema

### Archivos Modificados:
1. **`src/App.jsx`**
   - Agregado `AlertasStockProvider` wrapeando la aplicación
   - Agregado `AlertaStockBajoGlobal` como componente global
   - Similar a como ya existía `AlarmasProvider` para el calendario

2. **`src/components/Insumos.jsx`**
   - Removida lógica local de verificación de alertas
   - Agregado hook `useAlertasStock()` para llamar `verificarInmediatamente()`
   - Llama a verificación inmediata después de registrar compras

3. **`src/lib/alertasStockService.js`**
   - Mejorada función `verificarYMostrarAlerta()`
   - Ahora desactiva alertas automáticamente cuando el stock ya no es crítico
   - Actualiza lista de insumos críticos durante aplazamientos

---

## 🔄 FLUJO DE FUNCIONAMIENTO

### Escenario 1: Usuario detecta stock crítico por primera vez
```
1. Sistema verifica automáticamente cada 5 minutos
2. Detecta insumo con stock ≤ 5
3. Crea alerta en BD (tabla: alertas_stock_bajo)
4. Muestra POPUP + SONIDO
5. Usuario está en cualquier componente → Ve la alerta
```

### Escenario 2: Usuario cierra el popup sin aplazar
```
1. Usuario hace clic en ✕ o "📦 Ir a Ingresar Insumos"
2. Popup se cierra
3. Sistema programa reaparición en 5 minutos
4. A los 5 minutos → POPUP + SONIDO nuevamente
5. Ciclo continúa hasta que se aplace o se resuelva
```

### Escenario 3: Usuario aplaza la alerta
```
1. Usuario hace clic en "⏰ 15 min" / "⏰ 1 hora" / "🌅 Mañana"
2. Alerta se marca como 'aplazada' en BD con fecha/hora
3. Popup se cierra
4. Sistema sigue verificando cada 5 min, pero NO muestra popup
5. Al llegar la fecha de aplazamiento → POPUP + SONIDO
```

### Escenario 4: Usuario registra compras
```
1. Usuario va a Insumos y registra compras
2. Sistema llama a verificarInmediatamente() automáticamente
3. Verifica si insumos siguen siendo críticos:
   - Si YA NO son críticos → Desactiva alerta en BD
   - Si SIGUEN críticos → Actualiza lista de insumos
4. Popup desaparece o se actualiza según corresponda
```

### Escenario 5: Usuario cambia de componente
```
1. Usuario está en Ventas
2. Stock está crítico → POPUP aparece
3. Usuario cierra popup y va a Pedidos
4. A los 5 minutos → POPUP aparece EN Pedidos
5. No importa donde esté, la alerta lo persigue
```

---

## ⚙️ CONFIGURACIÓN

### Intervalos de Tiempo (modificables en `AlertasStockContext.jsx`):

```javascript
// Intervalo principal de verificación
const INTERVALO_VERIFICACION = 5 * 60 * 1000; // 5 minutos

// Retraso al cargar la app
const RETRASO_INICIAL = 3000; // 3 segundos
```

### Umbral de Stock Crítico (modificable en `alertasStockService.js`):

```javascript
const UMBRAL_STOCK_CRITICO = 5; // Stock ≤ 5 es crítico
```

---

## 🗄️ TABLA EN SUPABASE

**Tabla:** `alertas_stock_bajo`

**Campos importantes:**
- `usuario_id`: Usuario al que pertenece la alerta
- `estado`: `'activa'`, `'aplazada'`, o `'desactivada'`
- `aplazada_hasta`: Fecha/hora hasta cuando está aplazada
- `tipo_aplazamiento`: `'15min'`, `'1hora'`, o `'manana'`
- `ultima_notificacion`: Última vez que se mostró
- `veces_aplazada`: Contador de veces aplazada
- `insumos_criticos`: JSON con array de insumos con stock bajo

---

## 🎨 COMPONENTE DE UI

**Componente:** `AlertaStockBajo.jsx`

**Botones disponibles:**
- ✕ (cerrar) - Reaparece en 5 min
- ⏰ 15 min - Aplaza 15 minutos
- ⏰ 1 hora - Aplaza 1 hora
- 🌅 Mañana - Aplaza hasta mañana 9:00 AM
- 📦 Ir a Ingresar Insumos - Cierra (reaparece en 5 min)

**Nota:** Se eliminó el botón "🔕 Desactivar alerta" para evitar que usuarios lo desactiven por error pensando que solo cierra el popup.

---

## 🐛 DEBUGGING

Para ver logs en consola durante desarrollo, el sistema incluye mensajes de debug:

```javascript
// Activar logs (modo desarrollo)
if (import.meta.env.DEV) {
  console.log('🔄 Sistema de alertas de stock iniciado');
  console.log('⏰ Verificación periódica automática');
  console.log('🚨 X insumo(s) crítico(s) detectado(s)');
}
```

---

## ✅ VERIFICACIÓN DE FUNCIONAMIENTO

### Para probar que funciona correctamente:

1. **Crear insumos con stock crítico:**
   - Ve a Insumos → Crea recetas
   - Registra compras con cantidades ≤ 5

2. **Esperar 3 segundos:**
   - El popup debe aparecer automáticamente

3. **Cerrar sin aplazar:**
   - Haz clic en ✕
   - Espera 5 minutos
   - El popup debe reaparecer

4. **Aplazar:**
   - Haz clic en "⏰ 15 min"
   - Popup se cierra
   - Espera 15 minutos
   - Popup debe reaparecer

5. **Cambiar de componente:**
   - Con popup activo, ciérralo
   - Ve a otro componente (Ventas, Stock, etc.)
   - Espera 5 minutos
   - Popup debe aparecer en el componente actual

6. **Registrar compra:**
   - Ve a Insumos con alerta activa
   - Registra compra que solucione el stock crítico
   - Popup debe desaparecer automáticamente

---

## 🚀 VENTAJAS DEL SISTEMA

✅ **No se puede ignorar** - Aparece cada 5 min hasta resolverse
✅ **Funciona en toda la app** - No importa en qué sección estés
✅ **Se auto-limpia** - Desaparece cuando se resuelve el problema
✅ **Optimizado** - Pausa cuando la pestaña está oculta
✅ **Persiste** - Sobrevive recargas y cambios de página
✅ **Sonido de alerta** - Audio visual + auditivo
✅ **Flexible** - Opciones de aplazamiento personalizables

---

## 📝 NOTAS TÉCNICAS

- El sistema usa **React Context** para gestión de estado global
- Las verificaciones se ejecutan en **intervalos de JavaScript** (setInterval)
- Los datos se persisten en **Supabase** (tabla `alertas_stock_bajo`)
- El componente se renderiza al mismo nivel que el **NavBar** en App.jsx
- Compatible con el sistema existente de **AlarmasProvider** para recordatorios del calendario

---

## 🔮 MEJORAS FUTURAS SUGERIDAS

1. **Panel de configuración:**
   - Permitir cambiar el intervalo (3, 5, 10 minutos)
   - Configurar umbral por insumo individual
   - Activar/desactivar sonido

2. **Notificaciones push:**
   - Para negocios con múltiples dispositivos
   - Alertas en dispositivos móviles

3. **Estadísticas:**
   - Dashboard de alertas históricas
   - Tiempo promedio de resolución
   - Insumos más frecuentemente críticos

4. **Integración con proveedores:**
   - Botón directo para crear pedido al proveedor
   - WhatsApp directo al proveedor del insumo

---

**Fecha de implementación:** Enero 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Completado y funcionando
