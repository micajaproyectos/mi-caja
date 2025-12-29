-- ============================================
-- Comparar el día específico de la vista vs tabla
-- Para identificar la discrepancia
-- ============================================

-- Usuario: a8449c95-eb79-4f59-94b3-a12c47cd1a44

-- 1. Ver el día que tiene la vista
SELECT 
    'Día en la VISTA' as tipo,
    fecha,
    total_dia,
    anio,
    mes_num,
    dia
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44';

-- 2. Ver TODOS los pedidos de ese día en la TABLA
SELECT 
    'Pedidos en la TABLA para ese día' as tipo,
    id,
    fecha_cl,
    mesa,
    producto,
    cantidad,
    precio,
    total,
    total_final,
    COALESCE(total_final, total, 0) as total_usado,
    estado,
    tipo_pago
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2025
  AND EXTRACT(MONTH FROM fecha_cl) = 12
  AND (estado IS NULL OR estado != 'anulado')
ORDER BY fecha_cl, id;

-- 3. Suma manual de la TABLA para ese día (usando total_final)
SELECT 
    'Total usando total_final' as tipo,
    DATE(fecha_cl) as fecha,
    SUM(COALESCE(total_final, 0))::numeric as total_solo_final,
    COUNT(*) as cantidad_pedidos
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2025
  AND EXTRACT(MONTH FROM fecha_cl) = 12
  AND (estado IS NULL OR estado != 'anulado')
GROUP BY DATE(fecha_cl);

-- 4. Suma manual de la TABLA para ese día (usando total)
SELECT 
    'Total usando total' as tipo,
    DATE(fecha_cl) as fecha,
    SUM(COALESCE(total, 0))::numeric as total_solo_total,
    COUNT(*) as cantidad_pedidos
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2025
  AND EXTRACT(MONTH FROM fecha_cl) = 12
  AND (estado IS NULL OR estado != 'anulado')
GROUP BY DATE(fecha_cl);

-- 5. Suma manual de la TABLA para ese día (usando COALESCE como la vista)
SELECT 
    'Total usando COALESCE (como la vista)' as tipo,
    DATE(fecha_cl) as fecha,
    SUM(COALESCE(total_final, total, 0))::numeric as total_coalesce,
    COUNT(*) as cantidad_pedidos,
    COUNT(CASE WHEN total_final IS NOT NULL THEN 1 END) as pedidos_con_total_final,
    COUNT(CASE WHEN total IS NOT NULL THEN 1 END) as pedidos_con_total,
    COUNT(CASE WHEN total_final IS NOT NULL AND total IS NOT NULL AND total_final != total THEN 1 END) as pedidos_con_diferencia
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2025
  AND EXTRACT(MONTH FROM fecha_cl) = 12
  AND (estado IS NULL OR estado != 'anulado')
GROUP BY DATE(fecha_cl);

