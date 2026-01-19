-- ========================================
-- SETUP COMPLETO: Sistema de Stock de Insumos
-- ========================================
-- Este script crea la vista para gestionar el stock de ingredientes
-- basado en compras y consumos automáticos

-- ========================================
-- PASO 1: Eliminar vista anterior si existe
-- ========================================
DROP VIEW IF EXISTS vista_stock_insumos CASCADE;

-- ========================================
-- PASO 2: Crear vista de stock de insumos
-- ========================================
-- Calcula:
-- - Stock Comprado: Suma de todas las compras
-- - Stock Consumido: Consumos automáticos vía triggers (desde primera compra)
-- - Stock Disponible: Stock Comprado - Stock Consumido

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

-- ========================================
-- PASO 3: Verificar que la vista funciona
-- ========================================
SELECT 
  nombre_insumo as "Ingrediente",
  unidad as "Unidad",
  stock_comprado as "Stock Comprado",
  stock_consumido as "Stock Consumido",
  stock_disponible as "Stock Disponible"
FROM vista_stock_insumos
LIMIT 10;

-- ========================================
-- PASO 4: Verificar permisos RLS (si es necesario)
-- ========================================
-- La vista hereda los permisos de las tablas base
-- pero puedes habilitar RLS si lo necesitas:

-- ALTER VIEW vista_stock_insumos SET (security_barrier = true);
