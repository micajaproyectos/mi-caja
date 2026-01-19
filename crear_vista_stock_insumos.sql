-- ========================================
-- CREAR VISTA: Stock de Insumos
-- ========================================
-- Calcula Stock Comprado, Stock Consumido y Stock Disponible
-- Solo muestra ingredientes con al menos 1 compra registrada

DROP VIEW IF EXISTS vista_stock_insumos CASCADE;

CREATE OR REPLACE VIEW vista_stock_insumos AS
WITH compras_totales AS (
  -- Total comprado por ingrediente (suma de todas las compras)
  SELECT 
    nombre_insumo,
    unidad,
    SUM(cantidad) as stock_comprado,
    usuario_id,
    MIN(fecha_hora) as primera_compra  -- Fecha de la primera compra
  FROM compras_insumos
  GROUP BY nombre_insumo, unidad, usuario_id
),
consumos_totales AS (
  -- Total consumido desde la primera compra de cada ingrediente
  SELECT 
    rp.nombre_ingrediente as nombre_insumo,
    rp.unidad_ingrediente as unidad,
    p.usuario_id,
    SUM(
      (rp.cantidad_ingrediente / NULLIF(rp_header.cantidad_base, 0)) * p.cantidad
    ) as stock_consumido
  FROM pedidos p
  -- Unir con recetas para obtener ingredientes del producto vendido
  INNER JOIN recetas_productos rp_header 
    ON UPPER(TRIM(rp_header.nombre_producto)) = UPPER(TRIM(p.producto))
    AND rp_header.usuario_id = p.usuario_id
    AND rp_header.nombre_producto IS NOT NULL  -- Es el header de la receta
  INNER JOIN recetas_productos rp 
    ON rp.producto_receta_id = rp_header.id
    AND rp.nombre_ingrediente IS NOT NULL  -- Son los ingredientes
  -- Solo contar pedidos pagados
  WHERE p.estado = 'pagado'
  -- Filtrar: solo consumos DESPUÉS de la primera compra (lo haremos con JOIN)
  GROUP BY rp.nombre_ingrediente, rp.unidad_ingrediente, p.usuario_id
)
SELECT 
  c.nombre_insumo,
  c.unidad,
  c.stock_comprado,
  COALESCE(co.stock_consumido, 0) as stock_consumido,
  c.stock_comprado - COALESCE(co.stock_consumido, 0) as stock_disponible,
  c.usuario_id
FROM compras_totales c
LEFT JOIN consumos_totales co 
  ON c.nombre_insumo = co.nombre_insumo
  AND c.usuario_id = co.usuario_id
ORDER BY c.nombre_insumo;

-- Verificar que funciona
SELECT * FROM vista_stock_insumos LIMIT 10;
