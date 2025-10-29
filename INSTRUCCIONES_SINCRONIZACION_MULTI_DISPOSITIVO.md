# Sincronización Multi-Dispositivo - Sistema de Pedidos

## 📋 Resumen
Los productos agregados a las mesas ahora se sincronizan automáticamente entre **todos los dispositivos** que inicien sesión con el mismo usuario (mismo correo).

## ✅ Qué está implementado

### 1. Tabla en Supabase
- **Tabla**: `productos_mesas_temp`
- **Función**: Almacena productos temporales de las mesas
- **Sincronización**: Tiempo real vía Realtime de Supabase
- **RLS**: Solo el usuario puede ver/modificar sus propias mesas

### 2. Funciones implementadas en `Pedidos.jsx`

| Función | Descripción |
|---------|-------------|
| `cargarProductosTemporales()` | Carga productos desde Supabase al iniciar |
| `guardarProductoEnSupabase()` | Guarda producto al agregar a mesa |
| `eliminarProductoDeSupabase()` | Elimina producto al quitar de mesa |
| `limpiarMesaEnSupabase()` | Limpia productos después del pago |
| `actualizarComentariosEnSupabase()` | Actualiza comentarios en tiempo real |

### 3. Sincronización Realtime
- **Automática**: Detecta cambios (INSERT, UPDATE, DELETE)
- **Multi-dispositivo**: Todos los dispositivos se actualizan instantáneamente
- **Sin refresh manual**: Los cambios aparecen automáticamente

## 🚀 Pasos para activar

### Paso 1: Ejecutar SQL en Supabase

1. Ir a **Supabase Dashboard** → **SQL Editor**
2. Abrir el archivo: `crear_tabla_productos_mesas_temp.sql`
3. **Copiar TODO el contenido**
4. **Pegar** en el SQL Editor
5. Click en **"Run"** o presionar **Ctrl + Enter**

### Paso 2: Verificar que la tabla se creó

```sql
-- Ejecutar esta consulta para verificar
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'productos_mesas_temp'
ORDER BY ordinal_position;
```

Deberías ver:
- `id` (uuid)
- `usuario_id` (uuid)
- `cliente_id` (uuid)
- `mesa` (text)
- `producto` (text)
- `cantidad` (text)
- `unidad` (text)
- `precio_unitario` (numeric)
- `subtotal` (numeric)
- `comentarios` (text)
- `producto_id` (bigint)
- `created_at` (timestamp)

### Paso 3: Verificar Realtime

```sql
-- Verificar que Realtime está habilitado
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'productos_mesas_temp';
```

Debería retornar 1 fila.

## 📱 Cómo funciona

### Escenario: 3 dispositivos con el mismo usuario

**Dispositivo A** agrega "Café" a "Mesa 1":
1. Se guarda localmente (state de React)
2. Se guarda en Supabase
3. Realtime notifica a **Dispositivos B y C**
4. **Dispositivos B y C** recargan automáticamente
5. Todos ven "Café" en "Mesa 1"

**Dispositivo B** elimina "Café":
1. Se elimina localmente
2. Se elimina de Supabase
3. Realtime notifica a **Dispositivos A y C**
4. **Dispositivos A y C** actualizan automáticamente
5. Todos ven "Mesa 1" sin "Café"

**Dispositivo C** registra el pago:
1. Limpia productos pagados localmente
2. Limpia de Supabase
3. Realtime notifica a **Dispositivos A y B**
4. Todos actualizan instantáneamente

## 🔄 Flujo de sincronización

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Dispositivo │────>│   Supabase   │────>│ Dispositivo │
│      A      │     │  (Database)  │     │      B      │
└─────────────┘     │  + Realtime  │     └─────────────┘
                    └──────────────┘
                           │
                           v
                    ┌─────────────┐
                    │ Dispositivo │
                    │      C      │
                    └─────────────┘
```

## 🛡️ Seguridad (RLS)

Cada usuario solo puede:
- ✅ Ver sus propias mesas temporales
- ✅ Agregar productos a sus mesas
- ✅ Modificar sus productos
- ✅ Eliminar sus productos
- ❌ NO puede ver/modificar mesas de otros usuarios

## 🔧 Mantenimiento

### Limpiar mesas antiguas (opcional)

Si quieres limpiar productos de mesas que tienen más de 24 horas sin actividad:

```sql
-- Ejecutar manualmente cuando sea necesario
SELECT limpiar_mesas_temporales_antiguas();
```

O programar limpieza automática diaria:

```sql
-- Requiere pg_cron (si está disponible en tu plan de Supabase)
SELECT cron.schedule(
    'limpiar-mesas-temporales',
    '0 3 * * *', -- 3 AM diario
    $$SELECT limpiar_mesas_temporales_antiguas()$$
);
```

## 🐛 Troubleshooting

### Problema: Los cambios no se sincronizan

**Verificar**:
1. ¿Se ejecutó el SQL correctamente?
   ```sql
   SELECT COUNT(*) FROM productos_mesas_temp;
   ```

2. ¿Realtime está habilitado?
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime'
   AND tablename = 'productos_mesas_temp';
   ```

3. ¿Los 3 dispositivos usan el MISMO usuario?
   - Verificar que todos tengan el mismo email de login

4. **Revisar consola del navegador**:
   - Abrir DevTools (F12)
   - Buscar mensajes: `🔄 Cambio detectado en productos_mesas_temp`

### Problema: Error "relation productos_mesas_temp does not exist"

**Solución**: Ejecutar el SQL en Supabase SQL Editor.

### Problema: Error de permisos

**Verificar políticas RLS**:
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'productos_mesas_temp';
```

Deberías ver 4 políticas (SELECT, INSERT, UPDATE, DELETE).

## 📊 Logs útiles

En la consola del navegador verás:

```
✅ Productos temporales cargados desde Supabase: 2 mesas
✅ Producto guardado en Supabase: Café
🔄 Cambio detectado en productos_mesas_temp: { ... }
✅ Producto eliminado de Supabase: 1698765432
✅ Mesa limpiada en Supabase: Mesa 1
```

## 💡 Notas importantes

1. **localStorage sigue activo**: Se usa como cache secundario
2. **Prioridad**: Supabase tiene prioridad sobre localStorage
3. **Performance**: Cambios se sincronizan en <1 segundo
4. **Offline**: Si no hay conexión, se usa localStorage (se sincroniza al reconectar)

## ✨ Beneficios

- ✅ **Colaboración**: 3 personas trabajando simultáneamente
- ✅ **Actualización instantánea**: Sin necesidad de recargar página
- ✅ **Consistencia**: Todos ven la misma información
- ✅ **Sin conflictos**: Último cambio prevalece
- ✅ **Persistencia**: Los datos sobreviven refresh/cierre de navegador

## 📝 Cambios realizados en el código

### Archivos modificados:
1. ✅ `src/components/Pedidos.jsx`
   - Agregadas 5 funciones de sincronización
   - Modificadas 4 funciones existentes (agregar, actualizar, eliminar, pagar)
   - Configurada suscripción Realtime

### Archivos creados:
1. ✅ `crear_tabla_productos_mesas_temp.sql` - SQL para crear la tabla
2. ✅ `INSTRUCCIONES_SINCRONIZACION_MULTI_DISPOSITIVO.md` - Este documento

---

## ⚡ ¡Listo para usar!

Después de ejecutar el SQL en Supabase, la sincronización multi-dispositivo funcionará automáticamente.

**No se requieren cambios adicionales en el código.**

