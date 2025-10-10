-- ============================================
-- FIX: stock_view_new
-- Problema: El LEFT JOIN multiplica los registros de inventario
-- Solución: Agregar inventario y ventas por separado antes del JOIN
-- ============================================

-- PASO 1: Eliminar la vista antigua
DROP VIEW IF EXISTS stock_view_new CASCADE;

-- PASO 2: Crear la vista corregida
CREATE OR REPLACE VIEW stock_view_new AS
WITH inventario_agrupado AS (
    -- Agrupar inventario PRIMERO (evita la multiplicación)
    SELECT 
        producto,
        cliente_id,
        usuario_id,
        SUM(cantidad) AS total_ingresado
    FROM inventario
    GROUP BY producto, cliente_id, usuario_id
),
ventas_agrupadas AS (
    -- Agrupar ventas PRIMERO
    SELECT 
        producto,
        cliente_id,
        SUM(cantidad) AS total_vendido
    FROM ventas
    GROUP BY producto, cliente_id
)
SELECT 
    i.producto,
    i.cliente_id,
    i.usuario_id,
    COALESCE(i.total_ingresado, 0) AS total_ingresado,
    COALESCE(v.total_vendido, 0) AS total_vendido,
    (COALESCE(i.total_ingresado, 0) - COALESCE(v.total_vendido, 0)) AS stock_restante,
    CASE
        WHEN (COALESCE(i.total_ingresado, 0) - COALESCE(v.total_vendido, 0)) <= 0 THEN 'Agotado'
        WHEN (COALESCE(i.total_ingresado, 0) - COALESCE(v.total_vendido, 0)) <= 5 THEN 'Bajo'
        ELSE 'Disponible'
    END AS estado
FROM inventario_agrupado i
LEFT JOIN ventas_agrupadas v ON i.producto = v.producto AND i.cliente_id = v.cliente_id
ORDER BY i.producto;

-- ============================================
-- PASO 3: Verificar que la corrección funcionó
-- ============================================
SELECT 
    producto,
    total_ingresado,
    total_vendido,
    stock_restante,
    estado
FROM stock_view_new
WHERE producto = 'Facturas'  -- 👈 Cambia esto por tu producto problemático
ORDER BY producto;

-- ============================================
-- PASO 4: Comparar ANTES vs DESPUÉS para todos los productos
-- ============================================
-- Esta consulta te mostrará si hay diferencias después del fix
SELECT 
    producto,
    total_ingresado,
    total_vendido,
    stock_restante
FROM stock_view_new
ORDER BY producto;

