-- ============================================
-- DIAGNÓSTICO: stock_view_new
-- Problema: Se agregan 100 unidades adicionales al editar inventario
-- ============================================

-- 1. Ver la definición actual de la vista stock_view_new
SELECT 
    viewname, 
    definition
FROM pg_views
WHERE viewname = 'stock_view_new';

-- ============================================
-- 2. Analizar datos RAW del inventario para un producto específico
-- (Reemplaza 'NOMBRE_PRODUCTO' con el producto que editaste)
-- ============================================
SELECT 
    id,
    producto,
    cantidad,
    unidad,
    created_at
FROM inventario
WHERE producto = 'NOMBRE_PRODUCTO'
ORDER BY created_at DESC;

-- ============================================
-- 3. Ver TODAS las entradas de inventario (puede haber duplicados)
-- ============================================
SELECT 
    producto,
    COUNT(*) as cantidad_registros,
    SUM(cantidad) as total_ingresado,
    MAX(created_at) as ultima_entrada
FROM inventario
GROUP BY producto
HAVING COUNT(*) > 1  -- Solo productos con más de un registro
ORDER BY cantidad_registros DESC;

-- ============================================
-- 4. Comparar datos del inventario vs stock_view_new
-- ============================================
WITH inventario_agrupado AS (
    SELECT 
        producto,
        SUM(cantidad) as total_inventario,
        COUNT(*) as num_registros
    FROM inventario
    GROUP BY producto
)
SELECT 
    i.producto,
    i.total_inventario as "Total en Inventario",
    i.num_registros as "Núm Registros Inventario",
    s.total_ingresado as "Total en Stock View",
    s.total_vendido as "Total Vendido",
    s.stock_restante as "Stock Restante",
    (s.total_ingresado - i.total_inventario) as "Diferencia"
FROM inventario_agrupado i
LEFT JOIN stock_view_new s ON i.producto = s.producto
WHERE (s.total_ingresado - i.total_inventario) != 0
ORDER BY ABS(s.total_ingresado - i.total_inventario) DESC;

-- ============================================
-- 5. Detectar posibles duplicaciones en inventario
-- ============================================
SELECT 
    producto,
    cantidad,
    created_at,
    COUNT(*) OVER (PARTITION BY producto, cantidad, DATE(created_at)) as registros_similares
FROM inventario
WHERE DATE(created_at) = CURRENT_DATE  -- Solo hoy
ORDER BY producto, created_at DESC;

-- ============================================
-- 6. Ver el historial completo de UN PRODUCTO específico
-- (Reemplaza 'NOMBRE_PRODUCTO' con el producto problemático)
-- ============================================
SELECT 
    'inventario' as fuente,
    id,
    producto,
    cantidad,
    unidad,
    created_at as fecha,
    'N/A' as tipo_operacion
FROM inventario
WHERE producto = 'NOMBRE_PRODUCTO'

UNION ALL

SELECT 
    'ventas' as fuente,
    id,
    producto,
    cantidad,
    unidad,
    created_at as fecha,
    tipo_pago as tipo_operacion
FROM ventas
WHERE producto = 'NOMBRE_PRODUCTO'

ORDER BY fecha DESC;

-- ============================================
-- 7. Verificar si hay triggers que podrían duplicar registros
-- ============================================
SELECT 
    trigger_name,
    event_manipulation as evento,
    event_object_table as tabla,
    action_statement as accion
FROM information_schema.triggers
WHERE event_object_table IN ('inventario', 'ventas')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 8. Análisis de discrepancia de 100 unidades exactas
-- ============================================
WITH inventario_total AS (
    SELECT 
        producto,
        SUM(cantidad) as total_inv
    FROM inventario
    GROUP BY producto
)
SELECT 
    s.producto,
    s.total_ingresado,
    i.total_inv as total_inventario_real,
    (s.total_ingresado - i.total_inv) as diferencia,
    CASE 
        WHEN (s.total_ingresado - i.total_inv) = 100 THEN '⚠️ EXACTAMENTE 100 unidades de diferencia'
        WHEN ABS(s.total_ingresado - i.total_inv) % 100 = 0 THEN '⚠️ Múltiplo de 100 unidades'
        ELSE 'Otra diferencia'
    END as tipo_problema
FROM stock_view_new s
INNER JOIN inventario_total i ON s.producto = i.producto
WHERE (s.total_ingresado - i.total_inv) != 0
ORDER BY ABS(s.total_ingresado - i.total_inv) DESC;

-- ============================================
-- 9. Verificar registros recientes en inventario
-- ============================================
SELECT 
    id,
    producto,
    cantidad,
    unidad,
    created_at
FROM inventario
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- INSTRUCCIONES DE USO:
-- ============================================
-- 1. Ejecuta la consulta #1 primero para ver cómo está definida la vista
-- 2. Reemplaza 'NOMBRE_PRODUCTO' en las consultas #2, #6 con el producto problemático
-- 3. Ejecuta las consultas #3, #4, #5 para encontrar duplicaciones
-- 4. Ejecuta la consulta #8 para detectar el patrón de 100 unidades
-- 5. Revisa la consulta #9 para ver si hay ediciones recientes
-- 6. Ejecuta la consulta #7 para ver si hay triggers sospechosos

