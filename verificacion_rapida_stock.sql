-- ============================================
-- VERIFICACIÓN RÁPIDA: Problema de 100 unidades adicionales
-- ============================================

-- PASO 1: Ver la definición de la vista stock_view_new
-- (Esto te mostrará el SQL que genera la vista)
SELECT pg_get_viewdef('stock_view_new', true);

-- ============================================
-- PASO 2: Comparación directa - Inventario vs Vista
-- ============================================
SELECT 
    i.producto,
    COUNT(i.id) as "Registros en Inventario",
    SUM(i.cantidad) as "Total Real Inventario",
    COALESCE(s.total_ingresado, 0) as "Total en Vista",
    COALESCE(s.total_ingresado, 0) - SUM(i.cantidad) as "Diferencia",
    CASE 
        WHEN COALESCE(s.total_ingresado, 0) - SUM(i.cantidad) = 100 THEN '🔴 +100 unidades fantasma'
        WHEN COALESCE(s.total_ingresado, 0) - SUM(i.cantidad) > 0 THEN '⚠️ Más en vista que en inventario'
        WHEN COALESCE(s.total_ingresado, 0) - SUM(i.cantidad) < 0 THEN '⚠️ Menos en vista que en inventario'
        ELSE '✅ Correcto'
    END as "Estado"
FROM inventario i
LEFT JOIN stock_view_new s ON i.producto = s.producto
GROUP BY i.producto, s.total_ingresado
HAVING COALESCE(s.total_ingresado, 0) - SUM(i.cantidad) != 0
ORDER BY ABS(COALESCE(s.total_ingresado, 0) - SUM(i.cantidad)) DESC;

-- ============================================
-- PASO 3: Buscar registros duplicados en inventario
-- (Esto puede causar que se cuenten doble las cantidades)
-- ============================================
SELECT 
    producto,
    cantidad,
    created_at,
    updated_at,
    COUNT(*) OVER (PARTITION BY producto) as total_registros_producto
FROM inventario
ORDER BY producto, created_at DESC;

-- ============================================
-- PASO 4: Verificar si la vista está sumando incorrectamente
-- ============================================
-- Recrear manualmente el cálculo que debería hacer la vista
WITH inventario_calculado AS (
    SELECT 
        producto,
        SUM(cantidad) as total_ingresado
    FROM inventario
    GROUP BY producto
),
ventas_calculado AS (
    SELECT 
        producto,
        SUM(cantidad) as total_vendido
    FROM ventas
    GROUP BY producto
)
SELECT 
    i.producto,
    i.total_ingresado as "Ingresado (Manual)",
    COALESCE(v.total_vendido, 0) as "Vendido (Manual)",
    i.total_ingresado - COALESCE(v.total_vendido, 0) as "Stock (Manual)",
    s.total_ingresado as "Ingresado (Vista)",
    s.total_vendido as "Vendido (Vista)",
    s.stock_restante as "Stock (Vista)",
    s.total_ingresado - i.total_ingresado as "Dif Ingresado",
    s.total_vendido - COALESCE(v.total_vendido, 0) as "Dif Vendido"
FROM inventario_calculado i
LEFT JOIN ventas_calculado v ON i.producto = v.producto
LEFT JOIN stock_view_new s ON i.producto = s.producto
WHERE s.total_ingresado - i.total_ingresado != 0
   OR s.total_vendido - COALESCE(v.total_vendido, 0) != 0
ORDER BY producto;

-- ============================================
-- PASO 5: Ver datos RAW del último producto editado
-- ============================================
SELECT 
    producto,
    cantidad,
    unidad,
    created_at,
    updated_at,
    CASE 
        WHEN updated_at IS NOT NULL THEN 'EDITADO'
        ELSE 'ORIGINAL'
    END as estado
FROM inventario
WHERE updated_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

