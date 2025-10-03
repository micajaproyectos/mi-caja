# 🔍 Sistema de Auditoría para Mi Caja

## 📋 Descripción General

Este sistema registra automáticamente **todas las ediciones (UPDATE) y eliminaciones (DELETE)** realizadas en las tablas críticas de la aplicación:

- ✅ **ventas** (Registro de Venta)
- ✅ **venta_rapida** (Venta Rápida)
- ✅ **inventario** (Registro de Inventario)

## 🏗️ Arquitectura del Sistema

### 1. Tabla Principal: `auditoria`

Almacena todos los registros de auditoría con la siguiente información:

- **Información de la acción**: Tabla afectada, tipo de operación (UPDATE/DELETE)
- **Información del usuario**: `usuario_id`, `cliente_id`
- **Datos del registro**: ID del registro modificado/eliminado
- **Estados del registro**: Datos anteriores (antes de la modificación) y datos nuevos (después)
- **Metadata**: Timestamp, IP address (opcional), User agent (opcional)

### 2. Triggers Automáticos

Se crean 3 triggers que se ejecutan automáticamente:

1. `trigger_auditoria_ventas` → Monitorea tabla `ventas`
2. `trigger_auditoria_venta_rapida` → Monitorea tabla `venta_rapida`
3. `trigger_auditoria_inventario` → Monitorea tabla `inventario`

**¿Cuándo se activan?**
- Cada vez que se ejecuta un `UPDATE` en cualquiera de estas tablas
- Cada vez que se ejecuta un `DELETE` en cualquiera de estas tablas

**¿Qué registran?**
- El estado completo del registro ANTES de la modificación
- El estado completo del registro DESPUÉS de la modificación (solo UPDATE)
- Quién hizo el cambio (`usuario_id`)
- Cuándo se hizo el cambio (`fecha_hora`)

## 🔒 Seguridad (Row Level Security)

El sistema incluye políticas RLS para proteger los datos:

### Políticas para usuarios normales:
- ✅ **SELECT**: Solo pueden ver sus propios registros de auditoría
- ❌ **INSERT**: No pueden insertar manualmente (solo triggers)
- ❌ **UPDATE**: No pueden modificar registros de auditoría
- ❌ **DELETE**: No pueden eliminar registros de auditoría

### Políticas para administradores:
- ✅ **SELECT**: Pueden ver TODOS los registros de auditoría
- ❌ **INSERT/UPDATE/DELETE**: Mismas restricciones que usuarios normales

**Inmutabilidad**: Una vez creado un registro de auditoría, NADIE puede modificarlo o eliminarlo. Esto garantiza la integridad de la auditoría.

## 📊 Herramientas Disponibles

### 1. Vista: `auditoria_detallada`

Vista optimizada que muestra:
- Información del usuario (nombre, email)
- Solo los campos que cambiaron (para UPDATE)
- Datos formateados y legibles

```sql
SELECT * FROM public.auditoria_detallada;
```

### 2. Función RPC: `fn_obtener_auditoria`

Función optimizada para usar desde React/JavaScript con filtros:

**Parámetros:**
- `p_tabla_nombre`: Filtrar por tabla ('ventas', 'venta_rapida', 'inventario')
- `p_accion`: Filtrar por acción ('UPDATE', 'DELETE')
- `p_fecha_desde`: Fecha de inicio
- `p_fecha_hasta`: Fecha de fin
- `p_busqueda`: Buscar por nombre de producto
- `p_limit`: Límite de registros (default: 50)
- `p_offset`: Offset para paginación (default: 0)

**Uso desde JavaScript:**
```javascript
const { data, error } = await supabase.rpc('fn_obtener_auditoria', {
  p_tabla_nombre: 'inventario',
  p_accion: 'DELETE',
  p_fecha_desde: '2025-10-01T00:00:00Z',
  p_fecha_hasta: '2025-10-31T23:59:59Z',
  p_busqueda: 'Coca Cola',
  p_limit: 50,
  p_offset: 0
});
```

### 3. Función: `fn_obtener_historial_auditoria`

Obtiene el historial completo de un registro específico:

```sql
-- Para registro de ventas (ID numérico)
SELECT * FROM fn_obtener_historial_auditoria('ventas', NULL, 12345);

-- Para registro de inventario (UUID)
SELECT * FROM fn_obtener_historial_auditoria('inventario', 'uuid-del-registro', NULL);
```

## 📁 Archivos del Sistema

### 1. `auditoria_system_setup.sql`
Script principal que contiene:
- Creación de tabla `auditoria`
- Función de trigger `fn_auditoria_trigger()`
- Los 3 triggers para las tablas
- Políticas RLS
- Vista `auditoria_detallada`
- Funciones auxiliares

**Ejecutar UNA SOLA VEZ en Supabase SQL Editor**

### 2. `auditoria_consultas_utiles.sql`
Colección de consultas optimizadas para:
- Obtener registros con filtros
- Generar estadísticas
- Exportar datos
- Crear gráficos
- Función RPC principal

**Usar como referencia para el componente React**

### 3. `src/components/Auditoria.jsx`
Componente React (actualmente vacío, listo para desarrollo)

## 🚀 Instalación

### Paso 1: Ejecutar SQL en Supabase

1. Ir a **Supabase Dashboard** → **SQL Editor**
2. Copiar y pegar el contenido de `auditoria_system_setup.sql`
3. Ejecutar el script
4. Verificar mensajes de éxito

### Paso 2: Verificar Instalación

Ejecutar en SQL Editor:

```sql
-- Verificar tabla
SELECT COUNT(*) FROM public.auditoria;

-- Verificar triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_auditoria_%';

-- Verificar vista
SELECT * FROM public.auditoria_detallada LIMIT 5;
```

### Paso 3: Probar el Sistema

1. Ir a cualquier sección (Ventas, Inventario, Venta Rápida)
2. Editar o eliminar un registro
3. Verificar en SQL Editor:

```sql
SELECT * FROM public.auditoria_detallada ORDER BY fecha_hora DESC LIMIT 10;
```

## 📈 Casos de Uso

### Caso 1: ¿Quién eliminó este producto?
```sql
SELECT 
    usuario_nombre,
    fecha_hora,
    datos_anteriores->>'producto' as producto_eliminado
FROM public.auditoria_detallada
WHERE tabla_nombre = 'inventario'
AND accion = 'DELETE'
ORDER BY fecha_hora DESC;
```

### Caso 2: ¿Qué cambios se hicieron en esta venta?
```sql
SELECT * FROM fn_obtener_historial_auditoria('ventas', NULL, 12345);
```

### Caso 3: Actividad de auditoría de hoy
```sql
SELECT * FROM public.auditoria_detallada
WHERE fecha_hora::DATE = CURRENT_DATE
ORDER BY fecha_hora DESC;
```

### Caso 4: Estadísticas mensuales
```sql
SELECT 
    tabla_nombre,
    accion,
    COUNT(*) as total
FROM public.auditoria
WHERE fecha_hora >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY tabla_nombre, accion;
```

## 💡 Ventajas del Sistema

✅ **Automático**: No requiere código adicional en la aplicación
✅ **Completo**: Registra el estado completo antes y después
✅ **Seguro**: Inmutable, no se puede modificar ni eliminar
✅ **Eficiente**: Usa triggers a nivel de base de datos
✅ **Flexible**: Fácil de consultar y filtrar
✅ **Escalable**: Soporta millones de registros con índices optimizados
✅ **Multi-tenant**: Respeta la separación por usuario/cliente

## 🔧 Mantenimiento

### Limpiar registros antiguos (opcional)

Si la tabla crece mucho, se puede implementar una política de retención:

```sql
-- Eliminar registros más antiguos de 1 año (ejecutar como admin)
DELETE FROM public.auditoria
WHERE fecha_hora < NOW() - INTERVAL '1 year';

-- O archivar en otra tabla
INSERT INTO public.auditoria_archivo
SELECT * FROM public.auditoria
WHERE fecha_hora < NOW() - INTERVAL '1 year';

DELETE FROM public.auditoria
WHERE fecha_hora < NOW() - INTERVAL '1 year';
```

### Monitorear tamaño de la tabla

```sql
SELECT 
    pg_size_pretty(pg_total_relation_size('public.auditoria')) as tamaño_total,
    COUNT(*) as total_registros
FROM public.auditoria;
```

## 🎯 Próximos Pasos

1. ✅ Sistema de auditoría instalado
2. 🔄 Desarrollar interfaz en `Auditoria.jsx`
3. 📊 Agregar gráficos y estadísticas
4. 📥 Implementar exportación a CSV
5. 🔍 Agregar búsqueda avanzada

## 📞 Soporte

Para consultas o problemas:
- Revisar los logs de Supabase
- Verificar políticas RLS
- Consultar `auditoria_consultas_utiles.sql` para ejemplos

## 🎉 ¡Listo!

El sistema de auditoría está completamente funcional y comenzará a registrar automáticamente todas las ediciones y eliminaciones en las tablas configuradas.

