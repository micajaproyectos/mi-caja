-- ============================================
-- DIAGNÓSTICO SIMPLE: Comparar vista vs tabla
-- Solo las consultas esenciales
-- ============================================

-- Usuario a verificar
-- UUID: a8449c95-eb79-4f59-94b3-a12c47cd1a44

-- 1. Total según la VISTA pedidos_diarias
SELECT 
    'Total VISTA' as tipo,
    SUM(total_dia)::numeric as total,
    COUNT(*) as dias
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44';

-- 2. Total según la TABLA pedidos (mes actual)
SELECT 
    'Total TABLA (mes actual)' as tipo,
    SUM(COALESCE(total_final, total, 0))::numeric as total,
    COUNT(*) as pedidos,
    COUNT(DISTINCT DATE(fecha_cl)) as dias
FROM public.pedidos
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND (estado IS NULL OR estado != 'anulado');

-- 3. Desglose por día de la VISTA
SELECT 
    fecha,
    total_dia
FROM public.pedidos_diarias
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
ORDER BY fecha;

-- 4. Desglose por día de la TABLA
SELECT 
    DATE(fecha_cl) as fecha,
    SUM(COALESCE(total_final, total, 0))::numeric as total_dia,
    COUNT(*) as cantidad_pedidos
FROM public.pedidos
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND (estado IS NULL OR estado != 'anulado')
GROUP BY DATE(fecha_cl)
ORDER BY DATE(fecha_cl);

-- 5. Verificar duplicados en la vista
SELECT 
    fecha,
    COUNT(*) as veces_que_aparece
FROM public.pedidos_diarias
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
GROUP BY fecha
HAVING COUNT(*) > 1;

