-- ============================================
-- Verificar datos del usuario correcto
-- UUID: a8449c95-eb79-4f59-94b3-a12c47cd1a44
-- ============================================

-- 1. Total según la VISTA pedidos_diarias
SELECT 
    'Total VISTA' as tipo,
    SUM(total_dia)::numeric as total,
    COUNT(*) as dias
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44';

-- 2. Total según la TABLA pedidos (mes actual - diciembre 2025)
SELECT 
    'Total TABLA (diciembre 2025)' as tipo,
    SUM(COALESCE(total_final, total, 0))::numeric as total,
    COUNT(*) as pedidos,
    COUNT(DISTINCT DATE(fecha_cl)) as dias
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2025
  AND EXTRACT(MONTH FROM fecha_cl) = 12
  AND (estado IS NULL OR estado != 'anulado');

-- 3. Total del usuario SIN filtro de mes (todos los pedidos)
SELECT 
    'Total TABLA (todos los meses)' as tipo,
    SUM(COALESCE(total_final, total, 0))::numeric as total,
    COUNT(*) as pedidos,
    MIN(fecha_cl) as fecha_minima,
    MAX(fecha_cl) as fecha_maxima
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND fecha_cl IS NOT NULL
  AND (estado IS NULL OR estado != 'anulado');

-- 4. Desglose por día de la VISTA
SELECT 
    fecha,
    total_dia
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
ORDER BY fecha;

-- 5. Desglose por día de la TABLA (diciembre 2025)
SELECT 
    DATE(fecha_cl) as fecha,
    SUM(COALESCE(total_final, total, 0))::numeric as total_dia,
    COUNT(*) as cantidad_pedidos
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2025
  AND EXTRACT(MONTH FROM fecha_cl) = 12
  AND (estado IS NULL OR estado != 'anulado')
GROUP BY DATE(fecha_cl)
ORDER BY DATE(fecha_cl);

-- 6. Verificar si hay datos de otros meses en la vista
SELECT 
    anio,
    mes_num,
    COUNT(*) as dias,
    SUM(total_dia)::numeric as total_por_mes
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
GROUP BY anio, mes_num
ORDER BY anio DESC, mes_num DESC;

