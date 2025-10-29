-- ============================================================
-- VISTA MATERIALIZADA: productos_sin_ventas_30d_materialized
-- ============================================================
-- Esta vista materializa los datos para consultas ultra-rápidas
-- Requiere refrescarse periódicamente para mantener datos actualizados

-- 1. Crear la vista materializada (reemplaza la consulta pesada)
CREATE MATERIALIZED VIEW IF NOT EXISTS productos_sin_ventas_30d_materialized AS
SELECT 
    i.usuario_id,
    i.cliente_id,
    i.producto,
    i.fecha_ingreso,
    (SUM(i.cantidad) - COALESCE(
        (SELECT SUM(v.cantidad) 
         FROM ventas v 
         WHERE LOWER(TRIM(v.producto)) = LOWER(TRIM(i.producto))
           AND v.usuario_id = i.usuario_id
        ), 0
    )) AS stock_restante
FROM inventario i
WHERE i.fecha_ingreso < NOW() - INTERVAL '30 days'
GROUP BY i.producto, i.usuario_id, i.cliente_id, i.fecha_ingreso
HAVING COALESCE(
    (SELECT SUM(v.cantidad) 
     FROM ventas v 
     WHERE LOWER(TRIM(v.producto)) = LOWER(TRIM(i.producto))
       AND v.usuario_id = i.usuario_id
       AND v.fecha >= NOW() - INTERVAL '30 days'
    ), 0
) = 0
ORDER BY i.fecha_ingreso ASC;

-- 2. Crear índices para consultas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_productos_sin_ventas_usuario 
ON productos_sin_ventas_30d_materialized(usuario_id);

CREATE INDEX IF NOT EXISTS idx_productos_sin_ventas_cliente 
ON productos_sin_ventas_30d_materialized(cliente_id);

CREATE INDEX IF NOT EXISTS idx_productos_sin_ventas_fecha 
ON productos_sin_ventas_30d_materialized(fecha_ingreso);

-- 3. Habilitar permisos para consultar la vista materializada
GRANT SELECT ON productos_sin_ventas_30d_materialized TO authenticated;
GRANT SELECT ON productos_sin_ventas_30d_materialized TO anon;

-- ============================================================
-- OPCIONES PARA REFRESCAR LA VISTA (elige una)
-- ============================================================

-- OPCIÓN A: Refresh MANUAL (ejecutar cuando necesites actualizar)
-- Ejecutar este comando periódicamente (diario/semanal)
REFRESH MATERIALIZED VIEW productos_sin_ventas_30d_materialized;

-- OPCIÓN B: Refresh con CONCURRENT (permite consultas durante el refresh)
-- Más lento pero no bloquea lecturas
REFRESH MATERIALIZED VIEW CONCURRENTLY productos_sin_ventas_30d_materialized;
-- NOTA: Requiere un UNIQUE INDEX primero:
-- CREATE UNIQUE INDEX idx_productos_sin_ventas_unique 
-- ON productos_sin_ventas_30d_materialized(usuario_id, producto, fecha_ingreso);

-- OPCIÓN C: Trigger automático en INSERT/UPDATE de inventario o ventas
-- Refresca automáticamente cuando hay cambios
CREATE OR REPLACE FUNCTION refresh_productos_sin_ventas()
RETURNS TRIGGER AS $$
BEGIN
    -- Refrescar la vista materializada
    REFRESH MATERIALIZED VIEW productos_sin_ventas_30d_materialized;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en inventario
CREATE TRIGGER trigger_refresh_sin_ventas_inventario
AFTER INSERT OR UPDATE OR DELETE ON inventario
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_productos_sin_ventas();

-- Trigger en ventas
CREATE TRIGGER trigger_refresh_sin_ventas_ventas
AFTER INSERT OR UPDATE OR DELETE ON ventas
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_productos_sin_ventas();

-- OPCIÓN D: Scheduled Job con pg_cron (si está disponible en Supabase)
-- Refresca automáticamente cada día a las 2 AM
-- SELECT cron.schedule(
--     'refresh-productos-sin-ventas',
--     '0 2 * * *', -- Cron: 2 AM diario
--     $$REFRESH MATERIALIZED VIEW productos_sin_ventas_30d_materialized$$
-- );

-- ============================================================
-- VERIFICAR DATOS
-- ============================================================

-- Ver cuántos registros tiene la vista materializada
SELECT COUNT(*) as total_registros
FROM productos_sin_ventas_30d_materialized;

-- Ver datos por usuario
SELECT usuario_id, COUNT(*) as productos_sin_ventas
FROM productos_sin_ventas_30d_materialized
GROUP BY usuario_id
ORDER BY productos_sin_ventas DESC;

-- Comparar velocidad con la vista normal
EXPLAIN ANALYZE
SELECT * FROM productos_sin_ventas_30d_materialized
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
LIMIT 10;

-- ============================================================
-- MANTENER LA VISTA ACTUALIZADA
-- ============================================================

-- Última vez que se refrescó la vista
SELECT 
    schemaname,
    matviewname,
    matviewowner,
    tablespace,
    hasindexes,
    ispopulated,
    definition
FROM pg_matviews
WHERE matviewname = 'productos_sin_ventas_30d_materialized';

-- ============================================================
-- SI QUIERES REEMPLAZAR LA VISTA ACTUAL
-- ============================================================

-- 1. Eliminar la vista actual (CUIDADO: esto afectará consultas existentes)
-- DROP VIEW IF EXISTS productos_sin_ventas_30d_view CASCADE;

-- 2. Renombrar la vista materializada para que use el mismo nombre
-- ALTER MATERIALIZED VIEW productos_sin_ventas_30d_materialized 
-- RENAME TO productos_sin_ventas_30d_view;

-- NOTA: No puedes tener una vista y una vista materializada con el mismo nombre
-- Decide si reemplazar completamente o mantener ambas

