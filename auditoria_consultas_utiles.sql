-- ============================================================================
-- CONSULTAS ÚTILES PARA EL COMPONENTE DE AUDITORÍA
-- ============================================================================
-- Este archivo contiene consultas SQL optimizadas para usar en el componente
-- React de Auditoría (Auditoria.jsx)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CONSULTA PRINCIPAL: Obtener todos los registros de auditoría del usuario
-- ----------------------------------------------------------------------------
-- Esta consulta obtiene los registros de auditoría con información detallada
-- Usar con paginación en React (LIMIT y OFFSET)

SELECT 
    a.id,
    a.tabla_nombre,
    a.accion,
    a.fecha_hora,
    
    -- Información del usuario que realizó la acción
    u.nombre as usuario_nombre,
    u.email as usuario_email,
    
    -- IDs del registro afectado
    COALESCE(a.registro_id::TEXT, a.registro_id_numerico::TEXT) as registro_id_display,
    
    -- Nombre del producto/elemento afectado (según la tabla)
    CASE 
        WHEN a.tabla_nombre = 'ventas' THEN a.datos_anteriores->>'producto'
        WHEN a.tabla_nombre = 'inventario' THEN a.datos_anteriores->>'producto'
        WHEN a.tabla_nombre = 'venta_rapida' THEN 'Venta Rápida'
        ELSE 'Registro'
    END as elemento_afectado,
    
    -- Resumen de cambios (para UPDATE)
    CASE 
        WHEN a.accion = 'UPDATE' THEN
            jsonb_object_keys(
                (SELECT jsonb_object_agg(key, value)
                 FROM jsonb_each(a.datos_nuevos)
                 WHERE value IS DISTINCT FROM a.datos_anteriores->key)
            )
        ELSE NULL
    END as campos_modificados_lista,
    
    -- Datos completos
    a.datos_anteriores,
    a.datos_nuevos

FROM public.auditoria a
LEFT JOIN public.usuarios u ON u.usuario_id = a.usuario_id
WHERE a.usuario_id = auth.uid()  -- Solo ver auditoría del usuario actual
ORDER BY a.fecha_hora DESC
LIMIT 50;  -- Ajustar según necesidades de paginación


-- ----------------------------------------------------------------------------
-- 2. ESTADÍSTICAS GENERALES DE AUDITORÍA
-- ----------------------------------------------------------------------------
-- Resumen de operaciones por tabla y acción

SELECT 
    tabla_nombre,
    accion,
    COUNT(*) as total_operaciones,
    MIN(fecha_hora) as primera_operacion,
    MAX(fecha_hora) as ultima_operacion
FROM public.auditoria
WHERE usuario_id = auth.uid()
GROUP BY tabla_nombre, accion
ORDER BY tabla_nombre, accion;


-- ----------------------------------------------------------------------------
-- 3. FILTRAR POR TABLA ESPECÍFICA
-- ----------------------------------------------------------------------------
-- Para usar en dropdown de filtros

-- Ventas
SELECT * FROM public.auditoria_detallada
WHERE tabla_nombre = 'ventas'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Venta Rápida
SELECT * FROM public.auditoria_detallada
WHERE tabla_nombre = 'venta_rapida'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Inventario
SELECT * FROM public.auditoria_detallada
WHERE tabla_nombre = 'inventario'
ORDER BY fecha_hora DESC
LIMIT 50;


-- ----------------------------------------------------------------------------
-- 4. FILTRAR POR TIPO DE ACCIÓN
-- ----------------------------------------------------------------------------

-- Solo eliminaciones
SELECT * FROM public.auditoria_detallada
WHERE accion = 'DELETE'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Solo actualizaciones/ediciones
SELECT * FROM public.auditoria_detallada
WHERE accion = 'UPDATE'
ORDER BY fecha_hora DESC
LIMIT 50;


-- ----------------------------------------------------------------------------
-- 5. FILTRAR POR RANGO DE FECHAS
-- ----------------------------------------------------------------------------

-- Últimas 24 horas
SELECT * FROM public.auditoria_detallada
WHERE fecha_hora >= NOW() - INTERVAL '24 hours'
ORDER BY fecha_hora DESC;

-- Última semana
SELECT * FROM public.auditoria_detallada
WHERE fecha_hora >= NOW() - INTERVAL '7 days'
ORDER BY fecha_hora DESC;

-- Último mes
SELECT * FROM public.auditoria_detallada
WHERE fecha_hora >= NOW() - INTERVAL '30 days'
ORDER BY fecha_hora DESC;

-- Rango personalizado (reemplazar fechas)
SELECT * FROM public.auditoria_detallada
WHERE fecha_hora BETWEEN '2025-10-01' AND '2025-10-31'
ORDER BY fecha_hora DESC;


-- ----------------------------------------------------------------------------
-- 6. BUSCAR POR PRODUCTO ESPECÍFICO
-- ----------------------------------------------------------------------------
-- Útil para buscar historial de un producto

SELECT 
    a.id,
    a.tabla_nombre,
    a.accion,
    a.fecha_hora,
    u.nombre as usuario_nombre,
    a.datos_anteriores->>'producto' as producto,
    a.datos_anteriores,
    a.datos_nuevos,
    a.campos_modificados
FROM public.auditoria_detallada a
LEFT JOIN public.usuarios u ON u.usuario_id = a.usuario_id
WHERE (a.datos_anteriores->>'producto' ILIKE '%producto_a_buscar%'
    OR a.datos_nuevos->>'producto' ILIKE '%producto_a_buscar%')
ORDER BY a.fecha_hora DESC;


-- ----------------------------------------------------------------------------
-- 7. CONSULTA OPTIMIZADA PARA REACT CON FILTROS DINÁMICOS
-- ----------------------------------------------------------------------------
-- Esta es la consulta principal recomendada para usar en el componente React
-- Soporta filtros opcionales que se pueden aplicar desde el frontend

SELECT 
    a.id,
    a.tabla_nombre,
    a.accion,
    TO_CHAR(a.fecha_hora AT TIME ZONE 'America/Santiago', 'DD/MM/YYYY HH24:MI:SS') as fecha_hora_formateada,
    a.fecha_hora,
    
    -- Usuario
    u.nombre as usuario_nombre,
    u.email as usuario_email,
    
    -- Elemento afectado
    CASE 
        WHEN a.tabla_nombre = 'ventas' THEN a.datos_anteriores->>'producto'
        WHEN a.tabla_nombre = 'inventario' THEN a.datos_anteriores->>'producto'
        WHEN a.tabla_nombre = 'venta_rapida' THEN 
            'Monto: $' || (a.datos_anteriores->>'monto')
        ELSE 'Registro'
    END as elemento_descripcion,
    
    -- ID del registro
    COALESCE(
        a.registro_id::TEXT, 
        a.registro_id_numerico::TEXT
    ) as registro_id_display,
    
    -- Detalles adicionales según tabla
    CASE 
        WHEN a.tabla_nombre = 'ventas' THEN
            jsonb_build_object(
                'producto', a.datos_anteriores->>'producto',
                'cantidad', a.datos_anteriores->>'cantidad',
                'precio_unitario', a.datos_anteriores->>'precio_unitario',
                'total_venta', a.datos_anteriores->>'total_venta',
                'tipo_pago', a.datos_anteriores->>'tipo_pago'
            )
        WHEN a.tabla_nombre = 'inventario' THEN
            jsonb_build_object(
                'producto', a.datos_anteriores->>'producto',
                'cantidad', a.datos_anteriores->>'cantidad',
                'costo_total', a.datos_anteriores->>'costo_total',
                'precio_venta', a.datos_anteriores->>'precio_venta'
            )
        WHEN a.tabla_nombre = 'venta_rapida' THEN
            jsonb_build_object(
                'monto', a.datos_anteriores->>'monto',
                'tipo_pago', a.datos_anteriores->>'tipo_pago',
                'fecha_cl', a.datos_anteriores->>'fecha_cl'
            )
        ELSE NULL
    END as detalles_registro,
    
    -- Campos modificados (solo para UPDATE)
    CASE 
        WHEN a.accion = 'UPDATE' THEN
            (SELECT jsonb_object_agg(key, jsonb_build_object(
                'anterior', a.datos_anteriores->key,
                'nuevo', value
            ))
            FROM jsonb_each(a.datos_nuevos)
            WHERE value IS DISTINCT FROM a.datos_anteriores->key)
        ELSE NULL
    END as cambios_detallados

FROM public.auditoria a
LEFT JOIN public.usuarios u ON u.usuario_id = a.usuario_id
WHERE a.usuario_id = auth.uid()
    -- Filtros opcionales (aplicar desde React según sea necesario):
    -- AND a.tabla_nombre = $tabla_nombre   -- 'ventas', 'venta_rapida', 'inventario'
    -- AND a.accion = $accion               -- 'UPDATE', 'DELETE'
    -- AND a.fecha_hora >= $fecha_desde
    -- AND a.fecha_hora <= $fecha_hasta
    -- AND (a.datos_anteriores->>'producto' ILIKE '%' || $busqueda || '%')
ORDER BY a.fecha_hora DESC
LIMIT 100    -- Ajustar para paginación
OFFSET 0;    -- Ajustar para paginación


-- ----------------------------------------------------------------------------
-- 8. CONTAR TOTAL DE REGISTROS (PARA PAGINACIÓN)
-- ----------------------------------------------------------------------------
-- Usar esta consulta para calcular el número total de páginas

SELECT COUNT(*) as total_registros
FROM public.auditoria
WHERE usuario_id = auth.uid()
    -- Aplicar los mismos filtros que en la consulta principal
    -- AND tabla_nombre = $tabla_nombre
    -- AND accion = $accion
    -- AND fecha_hora >= $fecha_desde
    -- AND fecha_hora <= $fecha_hasta
;


-- ----------------------------------------------------------------------------
-- 9. OBTENER OPCIONES PARA FILTROS (DROPDOWNS)
-- ----------------------------------------------------------------------------

-- Obtener todas las tablas con auditoría disponibles
SELECT DISTINCT tabla_nombre
FROM public.auditoria
WHERE usuario_id = auth.uid()
ORDER BY tabla_nombre;

-- Obtener todos los tipos de acciones disponibles
SELECT DISTINCT accion
FROM public.auditoria
WHERE usuario_id = auth.uid()
ORDER BY accion;


-- ----------------------------------------------------------------------------
-- 10. EXPORTAR AUDITORÍA A CSV (DATOS PARA DESCARGA)
-- ----------------------------------------------------------------------------
-- Esta consulta prepara los datos en formato simple para exportar

SELECT 
    TO_CHAR(a.fecha_hora AT TIME ZONE 'America/Santiago', 'DD/MM/YYYY HH24:MI:SS') as "Fecha y Hora",
    a.tabla_nombre as "Tabla",
    a.accion as "Acción",
    u.nombre as "Usuario",
    CASE 
        WHEN a.tabla_nombre = 'ventas' THEN a.datos_anteriores->>'producto'
        WHEN a.tabla_nombre = 'inventario' THEN a.datos_anteriores->>'producto'
        WHEN a.tabla_nombre = 'venta_rapida' THEN 'Venta Rápida'
    END as "Elemento",
    COALESCE(a.registro_id::TEXT, a.registro_id_numerico::TEXT) as "ID Registro"
FROM public.auditoria a
LEFT JOIN public.usuarios u ON u.usuario_id = a.usuario_id
WHERE a.usuario_id = auth.uid()
ORDER BY a.fecha_hora DESC;


-- ----------------------------------------------------------------------------
-- 11. CONSULTA PARA GRÁFICOS Y ESTADÍSTICAS
-- ----------------------------------------------------------------------------

-- Operaciones por día (últimos 30 días)
SELECT 
    DATE(fecha_hora AT TIME ZONE 'America/Santiago') as fecha,
    tabla_nombre,
    accion,
    COUNT(*) as total
FROM public.auditoria
WHERE usuario_id = auth.uid()
    AND fecha_hora >= NOW() - INTERVAL '30 days'
GROUP BY DATE(fecha_hora AT TIME ZONE 'America/Santiago'), tabla_nombre, accion
ORDER BY fecha DESC, tabla_nombre, accion;

-- Operaciones por tabla (resumen)
SELECT 
    tabla_nombre,
    COUNT(CASE WHEN accion = 'UPDATE' THEN 1 END) as total_ediciones,
    COUNT(CASE WHEN accion = 'DELETE' THEN 1 END) as total_eliminaciones,
    COUNT(*) as total_operaciones
FROM public.auditoria
WHERE usuario_id = auth.uid()
GROUP BY tabla_nombre
ORDER BY total_operaciones DESC;


-- ----------------------------------------------------------------------------
-- 12. FUNCIÓN RPC PARA OBTENER AUDITORÍA (RECOMENDADO PARA SUPABASE)
-- ----------------------------------------------------------------------------
-- Esta función se puede llamar desde el cliente de Supabase

CREATE OR REPLACE FUNCTION public.fn_obtener_auditoria(
    p_tabla_nombre TEXT DEFAULT NULL,
    p_accion TEXT DEFAULT NULL,
    p_fecha_desde TIMESTAMPTZ DEFAULT NULL,
    p_fecha_hasta TIMESTAMPTZ DEFAULT NULL,
    p_busqueda TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    tabla_nombre TEXT,
    accion TEXT,
    fecha_hora_formateada TEXT,
    fecha_hora TIMESTAMPTZ,
    usuario_nombre TEXT,
    usuario_email TEXT,
    elemento_descripcion TEXT,
    registro_id_display TEXT,
    detalles_registro JSONB,
    cambios_detallados JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.tabla_nombre,
        a.accion,
        TO_CHAR(a.fecha_hora AT TIME ZONE 'America/Santiago', 'DD/MM/YYYY HH24:MI:SS') as fecha_hora_formateada,
        a.fecha_hora,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        CASE 
            WHEN a.tabla_nombre = 'ventas' THEN a.datos_anteriores->>'producto'
            WHEN a.tabla_nombre = 'inventario' THEN a.datos_anteriores->>'producto'
            WHEN a.tabla_nombre = 'venta_rapida' THEN 'Monto: $' || (a.datos_anteriores->>'monto')
            ELSE 'Registro'
        END as elemento_descripcion,
        COALESCE(a.registro_id::TEXT, a.registro_id_numerico::TEXT) as registro_id_display,
        CASE 
            WHEN a.tabla_nombre = 'ventas' THEN
                jsonb_build_object(
                    'producto', a.datos_anteriores->>'producto',
                    'cantidad', a.datos_anteriores->>'cantidad',
                    'precio_unitario', a.datos_anteriores->>'precio_unitario',
                    'total_venta', a.datos_anteriores->>'total_venta',
                    'tipo_pago', a.datos_anteriores->>'tipo_pago'
                )
            WHEN a.tabla_nombre = 'inventario' THEN
                jsonb_build_object(
                    'producto', a.datos_anteriores->>'producto',
                    'cantidad', a.datos_anteriores->>'cantidad',
                    'costo_total', a.datos_anteriores->>'costo_total',
                    'precio_venta', a.datos_anteriores->>'precio_venta'
                )
            WHEN a.tabla_nombre = 'venta_rapida' THEN
                jsonb_build_object(
                    'monto', a.datos_anteriores->>'monto',
                    'tipo_pago', a.datos_anteriores->>'tipo_pago',
                    'fecha_cl', a.datos_anteriores->>'fecha_cl'
                )
            ELSE NULL
        END as detalles_registro,
        CASE 
            WHEN a.accion = 'UPDATE' THEN
                (SELECT jsonb_object_agg(key, jsonb_build_object(
                    'anterior', a.datos_anteriores->key,
                    'nuevo', value
                ))
                FROM jsonb_each(a.datos_nuevos)
                WHERE value IS DISTINCT FROM a.datos_anteriores->key)
            ELSE NULL
        END as cambios_detallados
    FROM public.auditoria a
    LEFT JOIN public.usuarios u ON u.usuario_id = a.usuario_id
    WHERE a.usuario_id = auth.uid()
        AND (p_tabla_nombre IS NULL OR a.tabla_nombre = p_tabla_nombre)
        AND (p_accion IS NULL OR a.accion = p_accion)
        AND (p_fecha_desde IS NULL OR a.fecha_hora >= p_fecha_desde)
        AND (p_fecha_hasta IS NULL OR a.fecha_hora <= p_fecha_hasta)
        AND (p_busqueda IS NULL OR 
             a.datos_anteriores->>'producto' ILIKE '%' || p_busqueda || '%' OR
             a.datos_nuevos->>'producto' ILIKE '%' || p_busqueda || '%')
    ORDER BY a.fecha_hora DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.fn_obtener_auditoria IS 'Función RPC para obtener registros de auditoría con filtros opcionales';

-- ============================================================================
-- EJEMPLOS DE USO DESDE JAVASCRIPT/REACT:
-- ============================================================================

/*
// Ejemplo 1: Obtener todos los registros (primeros 50)
const { data, error } = await supabase.rpc('fn_obtener_auditoria', {
  p_limit: 50,
  p_offset: 0
});

// Ejemplo 2: Filtrar solo eliminaciones de inventario
const { data, error } = await supabase.rpc('fn_obtener_auditoria', {
  p_tabla_nombre: 'inventario',
  p_accion: 'DELETE',
  p_limit: 50,
  p_offset: 0
});

// Ejemplo 3: Filtrar por rango de fechas
const { data, error } = await supabase.rpc('fn_obtener_auditoria', {
  p_fecha_desde: '2025-10-01T00:00:00Z',
  p_fecha_hasta: '2025-10-31T23:59:59Z',
  p_limit: 100,
  p_offset: 0
});

// Ejemplo 4: Buscar por producto
const { data, error } = await supabase.rpc('fn_obtener_auditoria', {
  p_busqueda: 'Coca Cola',
  p_limit: 50,
  p_offset: 0
});

// Ejemplo 5: Obtener estadísticas
const { data, error } = await supabase
  .from('auditoria')
  .select('tabla_nombre, accion')
  .eq('usuario_id', userId);

// Procesar para contar
const stats = data.reduce((acc, item) => {
  const key = `${item.tabla_nombre}_${item.accion}`;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
*/

