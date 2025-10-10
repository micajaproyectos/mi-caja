-- Eliminar vista antigua
DROP VIEW IF EXISTS stock_view_new CASCADE;

-- Crear vista corregida
CREATE OR REPLACE VIEW stock_view_new AS
WITH inventario_agrupado AS (
    SELECT 
        producto,
        cliente_id,
        usuario_id,
        SUM(cantidad) AS total_ingresado
    FROM inventario
    GROUP BY producto, cliente_id, usuario_id
),
ventas_agrupadas AS (
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

