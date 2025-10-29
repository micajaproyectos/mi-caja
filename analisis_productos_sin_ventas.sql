-- Análisis de la vista productos_sin_ventas_30d_view

-- 1. Ver la definición de la vista para entender qué está haciendo
SELECT pg_get_viewdef('productos_sin_ventas_30d_view'::regclass, true);

-- 2. Contar productos sin ventas por usuario (lo que ya ejecutaste)
SELECT usuario_id, COUNT(*) AS total_filas
FROM productos_sin_ventas_30d_view
GROUP BY usuario_id
ORDER BY total_filas DESC;

-- 3. Verificar si hay índices en las tablas base que pueda usar la vista
-- (Revisa las tablas: inventario, ventas, etc.)
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('inventario', 'ventas', 'stock', 'productos')
ORDER BY tablename, indexname;

-- 4. Analizar el plan de ejecución de la consulta problemática
EXPLAIN ANALYZE
SELECT producto, fecha_ingreso, stock_restante
FROM productos_sin_ventas_30d_view
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
ORDER BY fecha_ingreso ASC
LIMIT 10;

-- 5. Verificar cuántas filas procesa realmente la vista antes del LIMIT
-- (Esto te dirá si la vista está evaluando todas las 96 filas)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT producto, fecha_ingreso, stock_restante
FROM productos_sin_ventas_30d_view
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
ORDER BY fecha_ingreso ASC
LIMIT 10;

-- 6. Sugerencia: Consulta alternativa directa (sin usar la vista)
-- Esto puede ser más rápido si la vista no está optimizada:
-- 
-- SELECT 
--     i.producto,
--     i.fecha_ingreso,
--     i.stock_restante
-- FROM inventario i
-- LEFT JOIN ventas v ON i.producto = v.producto 
--     AND v.usuario_id = i.usuario_id
--     AND v.fecha >= CURRENT_DATE - INTERVAL '30 days'
-- WHERE i.usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
--     AND v.id IS NULL  -- Sin ventas en los últimos 30 días
-- ORDER BY i.fecha_ingreso ASC
-- LIMIT 10;

