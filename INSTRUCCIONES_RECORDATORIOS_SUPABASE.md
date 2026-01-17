# 📋 Instrucciones para Configurar Recordatorios en Supabase

## 🚀 Paso 1: Ejecutar SQL en Supabase

1. **Ir a tu proyecto en Supabase**
   - Abre [https://supabase.com](https://supabase.com)
   - Selecciona tu proyecto de Mi Caja

2. **Abrir el SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Clic en **"New query"**

3. **Copiar y pegar el SQL**
   - Abre el archivo `recordatorios_table_setup.sql`
   - Copia TODO el contenido
   - Pégalo en el editor SQL de Supabase

4. **Ejecutar el script**
   - Clic en el botón **"Run"** (▶️)
   - Espera a que se complete la ejecución

5. **Verificar mensajes de confirmación**
   Deberías ver mensajes como:
   ```
   ✅ Tabla recordatorios creada correctamente
   ✅ RLS habilitado en tabla recordatorios
   ✅ Políticas RLS creadas correctamente
   ✅ Índices creados correctamente
   🎉 Setup de tabla recordatorios completado exitosamente
   ```

## ✅ Paso 2: Verificar la Tabla

1. **Ir a Table Editor**
   - En el menú lateral, clic en **"Table Editor"**
   - Busca la tabla **"recordatorios"**
   - Deberías verla en la lista

2. **Verificar estructura**
   La tabla debe tener estas columnas:
   - `id` (bigint, primary key)
   - `usuario_id` (uuid, FK)
   - `dia` (integer)
   - `mes` (integer)
   - `anio` (integer)
   - `fecha` (text)
   - `hora` (text)
   - `asunto` (text)
   - `prioridad` (text)
   - `estado` (text)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

3. **Verificar RLS (Row Level Security)**
   - Clic en la tabla **"recordatorios"**
   - Ir a la pestaña **"Policies"**
   - Deberías ver 4 políticas:
     - ✅ SELECT: "Los usuarios pueden ver sus propios recordatorios"
     - ✅ INSERT: "Los usuarios pueden crear sus propios recordatorios"
     - ✅ UPDATE: "Los usuarios pueden actualizar sus propios recordatorios"
     - ✅ DELETE: "Los usuarios pueden eliminar sus propios recordatorios"

## 🧪 Paso 3: Probar la Funcionalidad

### **Prueba 1: Crear Recordatorio**

1. **Ir al Calendario**
   - En Mi Caja, navega a **"Calendario"** (`/calendario`)

2. **Crear un recordatorio de prueba**
   - Haz clic en cualquier día del mes
   - Completa el formulario:
     - **Asunto**: "Reunión importante"
     - **Hora**: Hora actual + 2 minutos
     - **Prioridad**: Alta
   - Clic en **"Guardar"**

3. **Verificar en Supabase**
   - Ve a **Table Editor** > **recordatorios**
   - Deberías ver tu recordatorio creado
   - Verifica que `usuario_id` sea tu ID
   - Verifica que `estado` sea "pendiente"

### **Prueba 2: Ver Recordatorios**

1. **En el Calendario**
   - El recordatorio debe aparecer en el día seleccionado
   - Debe mostrar el icono de prioridad correcto (🔴 Alta)

2. **Lista de Recordatorios**
   - Expande la sección **"📋 Recordatorios de [Mes]"**
   - Tu recordatorio debe aparecer con:
     - Badge amarillo **"⏰ PENDIENTE"**
     - Fecha y hora correctas
     - Asunto completo

3. **Filtros**
   - Prueba los filtros:
     - **Todos**: Debe mostrar el recordatorio
     - **Pendientes**: Debe mostrarlo
     - **Ejecutados**: No debe mostrarlo

### **Prueba 3: Alarma Automática** ⏰

1. **Esperar a que se cumpla la hora**
   - Espera los 2 minutos que configuraste
   - El sistema verifica cada 30 segundos

2. **Verificar popup**
   - Debe aparecer un **popup global** automáticamente
   - Debe sonar el audio de alerta
   - Debe mostrar:
     - Título: "¡Recordatorio!"
     - Fecha y hora
     - Prioridad (🔴 Alta)
     - Asunto: "Reunión importante"

3. **Probar opciones del popup**

   **Opción A: Postergar**
   - Clic en **"⏰ Postergar"**
   - Se muestran opciones: 5 min, 15 min, 30 min, 1h, 2h
   - Selecciona **"⏱️ 5 minutos"**
   - El popup debe cerrarse
   - En Supabase, verifica que la hora se actualizó (+5 minutos)

   **Opción B: Listo**
   - Cuando vuelva a sonar (5 min después)
   - Clic en **"✅ Listo"**
   - El popup debe cerrarse
   - En el Calendario, el recordatorio debe:
     - Cambiar a badge verde **"✅ EJECUTADO"**
     - Aparecer tachado y en gris
   - En Supabase, verifica que `estado` = "ejecutado"

### **Prueba 4: Eliminar Recordatorio**

1. **En la lista de recordatorios**
   - Clic en el botón **🗑️** del recordatorio
   - El recordatorio debe desaparecer del calendario
   - En Supabase, verifica que se eliminó de la tabla

### **Prueba 5: Sincronización Multi-Dispositivo**

1. **Abre Mi Caja en dos navegadores/dispositivos diferentes**
2. **En el Dispositivo 1**:
   - Crea un nuevo recordatorio
3. **En el Dispositivo 2**:
   - Recarga la página del calendario
   - El recordatorio debe aparecer
4. **En el Dispositivo 2**:
   - Elimina el recordatorio
5. **En el Dispositivo 1**:
   - Recarga la página
   - El recordatorio debe haber desaparecido

## ✅ Checklist de Verificación

Marca cada item después de verificarlo:

- [ ] SQL ejecutado sin errores
- [ ] Tabla `recordatorios` creada en Supabase
- [ ] RLS habilitado con 4 políticas activas
- [ ] Crear recordatorio funciona correctamente
- [ ] Los recordatorios se muestran en el calendario
- [ ] Los filtros (Todos/Pendientes/Ejecutados) funcionan
- [ ] La alarma se dispara automáticamente a la hora correcta
- [ ] El popup global aparece sobre todos los componentes
- [ ] El sonido de alerta se reproduce
- [ ] La opción "Postergar" funciona y actualiza la hora
- [ ] La opción "Listo" marca como ejecutado correctamente
- [ ] Los recordatorios ejecutados aparecen tachados
- [ ] Eliminar recordatorios funciona
- [ ] Los cambios se reflejan en Supabase
- [ ] La sincronización entre dispositivos funciona

## 🐛 Solución de Problemas

### **Error: "No se pudo guardar el recordatorio"**
- Verifica que RLS esté habilitado
- Verifica que las políticas estén creadas correctamente
- Revisa la consola del navegador para más detalles

### **La alarma no suena**
- Verifica que la hora esté en formato correcto (HH:MM)
- Verifica que la fecha sea correcta
- El navegador debe tener permisos de audio
- El sistema verifica cada 30 segundos, espera un poco

### **Los recordatorios no aparecen**
- Recarga la página
- Verifica en Supabase que el `usuario_id` sea correcto
- Revisa la consola para errores de carga

### **Error: "Usuario no autenticado"**
- Cierra sesión y vuelve a iniciar sesión
- Verifica que `authService.getCurrentUserId()` funcione

## 📊 Estructura de Datos

Ejemplo de recordatorio en Supabase:

```json
{
  "id": 1,
  "usuario_id": "a1b2c3d4-...",
  "dia": 15,
  "mes": 0,
  "anio": 2026,
  "fecha": "15/1/2026",
  "hora": "14:30",
  "asunto": "Reunión importante",
  "prioridad": "alta",
  "estado": "pendiente",
  "created_at": "2026-01-15T12:00:00Z",
  "updated_at": "2026-01-15T12:00:00Z"
}
```

## 🎯 Próximos Pasos

Una vez que todo funcione:

1. ✅ Prueba crear múltiples recordatorios
2. ✅ Prueba con diferentes prioridades
3. ✅ Prueba postergar varias veces
4. ✅ Prueba marcar como ejecutado
5. ✅ Prueba la sincronización entre dispositivos

## 📝 Notas Importantes

- Los recordatorios persisten en la base de datos
- Cada usuario solo ve sus propios recordatorios (RLS)
- Las alarmas se verifican cada 30 segundos
- El popup aparece sobre TODOS los componentes
- El estado "Ejecutado" solo se alcanza mediante el popup
- Los recordatorios nuevos siempre empiezan como "Pendiente"

---

**¿Todo funcionó correctamente?** 🎉

Si tuviste algún problema, revisa los logs en:
- Consola del navegador (F12 → Console)
- Supabase Dashboard → Logs
