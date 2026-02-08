-- ============================================================
-- CORRECCIÓN: Recrear vistas con SECURITY INVOKER
-- Esto corrige las advertencias de seguridad de Supabase
-- ============================================================

-- ============================================================
-- 1. Recrear vista_stock_insumos con SECURITY INVOKER
-- ============================================================

CREATE OR REPLACE VIEW public.vista_stock_insumos
WITH (security_invoker = true)  -- ✅ Usa permisos del usuario
AS
WITH compras_totales AS (
  SELECT 
    compras_insumos.nombre_insumo,
    compras_insumos.unidad,
    sum(compras_insumos.cantidad) AS stock_comprado,
    compras_insumos.usuario_id,
    min(compras_insumos.fecha_hora) AS primera_compra
  FROM compras_insumos
  GROUP BY compras_insumos.nombre_insumo, compras_insumos.unidad, compras_insumos.usuario_id
), 
consumos_totales AS (
  SELECT 
    rp.nombre_ingrediente AS nombre_insumo,
    rp.unidad_ingrediente AS unidad,
    p.usuario_id,
    sum(rp.cantidad_ingrediente / NULLIF(rp_header.cantidad_base, 0::numeric) * p.cantidad) AS stock_consumido
  FROM pedidos p
    JOIN recetas_productos rp_header 
      ON upper(TRIM(BOTH FROM rp_header.nombre_producto)) = upper(TRIM(BOTH FROM p.producto)) 
      AND rp_header.usuario_id = p.usuario_id 
      AND rp_header.nombre_producto IS NOT NULL
    JOIN recetas_productos rp 
      ON rp.producto_receta_id = rp_header.id 
      AND rp.nombre_ingrediente IS NOT NULL
  WHERE p.estado = 'pagado'
  GROUP BY rp.nombre_ingrediente, rp.unidad_ingrediente, p.usuario_id
)
SELECT 
  c.nombre_insumo,
  c.unidad,
  c.stock_comprado,
  COALESCE(co.stock_consumido, 0) AS stock_consumido,
  c.stock_comprado - COALESCE(co.stock_consumido, 0) AS stock_disponible,
  c.usuario_id
FROM compras_totales c
  LEFT JOIN consumos_totales co 
    ON c.nombre_insumo = co.nombre_insumo 
    AND c.usuario_id = co.usuario_id
ORDER BY c.nombre_insumo;

COMMENT ON VIEW public.vista_stock_insumos IS 
'Vista de stock de insumos calculado desde compras y consumos.
SECURITY INVOKER: Usa permisos del usuario que consulta (más seguro).';

-- ============================================================
-- 2. Recrear stock_view_new con SECURITY INVOKER
-- ============================================================

CREATE OR REPLACE VIEW public.stock_view_new
WITH (security_invoker = true)  -- ✅ Usa permisos del usuario
AS
WITH inventario_agrupado AS (
  SELECT 
    inventario.producto,
    inventario.cliente_id,
    inventario.usuario_id,
    sum(inventario.cantidad) AS total_ingresado
  FROM inventario
  GROUP BY inventario.producto, inventario.cliente_id, inventario.usuario_id
), 
ventas_agrupadas AS (
  SELECT 
    ventas.producto,
    ventas.cliente_id,
    sum(ventas.cantidad) AS total_vendido_ventas
  FROM ventas
  GROUP BY ventas.producto, ventas.cliente_id
), 
pedidos_pagados_agrupados AS (
  SELECT 
    pedidos.producto,
    pedidos.cliente_id,
    sum(pedidos.cantidad) AS total_vendido_pedidos
  FROM pedidos
  WHERE pedidos.estado = 'pagado'
  GROUP BY pedidos.producto, pedidos.cliente_id
)
SELECT 
  i.producto,
  i.cliente_id,
  i.usuario_id,
  COALESCE(i.total_ingresado, 0) AS total_ingresado,
  COALESCE(v.total_vendido_ventas, 0) + COALESCE(p.total_vendido_pedidos, 0) AS total_vendido,
  COALESCE(i.total_ingresado, 0) - (COALESCE(v.total_vendido_ventas, 0) + COALESCE(p.total_vendido_pedidos, 0)) AS stock_restante,
  CASE
    WHEN (COALESCE(i.total_ingresado, 0) - (COALESCE(v.total_vendido_ventas, 0) + COALESCE(p.total_vendido_pedidos, 0))) <= 0 THEN 'Agotado'
    WHEN (COALESCE(i.total_ingresado, 0) - (COALESCE(v.total_vendido_ventas, 0) + COALESCE(p.total_vendido_pedidos, 0))) <= 5 THEN 'Bajo'
    ELSE 'Disponible'
  END AS estado
FROM inventario_agrupado i
  LEFT JOIN ventas_agrupadas v 
    ON i.producto::text = v.producto 
    AND i.cliente_id = v.cliente_id
  LEFT JOIN pedidos_pagados_agrupados p 
    ON i.producto::text = p.producto 
    AND i.cliente_id = p.cliente_id
ORDER BY i.producto;

COMMENT ON VIEW public.stock_view_new IS 
'Vista de stock de productos calculado desde inventario, ventas y pedidos.
SECURITY INVOKER: Usa permisos del usuario que consulta (más seguro).';

-- ============================================================
-- 3. Recrear stock_view con SECURITY INVOKER
-- ============================================================

CREATE OR REPLACE VIEW public.stock_view
WITH (security_invoker = true)  -- ✅ Usa permisos del usuario
AS
SELECT 
  producto,
  sum(cantidad) AS total_ingresado,
  COALESCE((
    SELECT sum(v.cantidad) 
    FROM ventas v
    WHERE lower(TRIM(BOTH FROM v.producto)) = lower(TRIM(BOTH FROM i.producto))
  ), 0) + COALESCE((
    SELECT sum(p.cantidad) 
    FROM pedidos p
    WHERE lower(TRIM(BOTH FROM p.producto)) = lower(TRIM(BOTH FROM i.producto)) 
      AND p.estado = 'pagado'
  ), 0) AS total_vendido,
  sum(cantidad) - (
    COALESCE((
      SELECT sum(v.cantidad) 
      FROM ventas v
      WHERE lower(TRIM(BOTH FROM v.producto)) = lower(TRIM(BOTH FROM i.producto))
    ), 0) + COALESCE((
      SELECT sum(p.cantidad) 
      FROM pedidos p
      WHERE lower(TRIM(BOTH FROM p.producto)) = lower(TRIM(BOTH FROM i.producto)) 
        AND p.estado = 'pagado'
    ), 0)
  ) AS stock_restante,
  CASE
    WHEN (sum(cantidad) - (
      COALESCE((
        SELECT sum(v.cantidad) 
        FROM ventas v
        WHERE lower(TRIM(BOTH FROM v.producto)) = lower(TRIM(BOTH FROM i.producto))
      ), 0) + COALESCE((
        SELECT sum(p.cantidad) 
        FROM pedidos p
        WHERE lower(TRIM(BOTH FROM p.producto)) = lower(TRIM(BOTH FROM i.producto)) 
          AND p.estado = 'pagado'
      ), 0)
    )) <= 0 THEN 'Agotado'
    WHEN (sum(cantidad) - (
      COALESCE((
        SELECT sum(v.cantidad) 
        FROM ventas v
        WHERE lower(TRIM(BOTH FROM v.producto)) = lower(TRIM(BOTH FROM i.producto))
      ), 0) + COALESCE((
        SELECT sum(p.cantidad) 
        FROM pedidos p
        WHERE lower(TRIM(BOTH FROM p.producto)) = lower(TRIM(BOTH FROM i.producto)) 
          AND p.estado = 'pagado'
      ), 0)
    )) <= 10 THEN 'Bajo'
    ELSE 'Disponible'
  END AS estado
FROM inventario i
GROUP BY producto;

COMMENT ON VIEW public.stock_view IS 
'Vista básica de stock de productos.
SECURITY INVOKER: Usa permisos del usuario que consulta (más seguro).';

-- ============================================================
-- 4. Verificar que las vistas se crearon correctamente
-- ============================================================

SELECT 
    viewname,
    CASE 
        WHEN definition LIKE '%security_invoker%' THEN '✅ SECURITY INVOKER'
        ELSE '❌ SECURITY DEFINER'
    END as tipo_seguridad
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('stock_view', 'stock_view_new', 'vista_stock_insumos')
ORDER BY viewname;

-- ============================================================
-- MENSAJE FINAL
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════';
    RAISE NOTICE '✅ VISTAS RECREADAS CON SECURITY INVOKER';
    RAISE NOTICE '════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Vistas actualizadas:';
    RAISE NOTICE '   • vista_stock_insumos (stock de insumos)';
    RAISE NOTICE '   • stock_view_new (stock de productos con detalles)';
    RAISE NOTICE '   • stock_view (stock de productos básico)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Ahora usan permisos del usuario que consulta';
    RAISE NOTICE '✅ Las advertencias de Supabase desaparecerán';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE: Verifica que la aplicación funcione';
    RAISE NOTICE '   Prueba las secciones: Insumos, Stock, Inventario';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════';
END $$;
