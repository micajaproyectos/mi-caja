-- ============================================
-- Verificar qué datos tiene la vista pedidos_diarias
-- ============================================

-- 1. Ver todos los registros de la vista para ese usuario
SELECT 
    usuario_id,
    fecha,
    anio,
    mes_num,
    dia,
    total_dia
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
ORDER BY fecha;

-- 2. Total y resumen de la vista
SELECT 
    COUNT(*) as cantidad_dias,
    SUM(total_dia)::numeric as total_vista,
    MIN(fecha) as fecha_minima,
    MAX(fecha) as fecha_maxima,
    MIN(mes_num) as mes_minimo,
    MAX(mes_num) as mes_maximo
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44';

-- 3. Verificar si hay datos de otros meses
SELECT 
    anio,
    mes_num,
    COUNT(*) as dias,
    SUM(total_dia)::numeric as total_por_mes
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
GROUP BY anio, mes_num
ORDER BY anio DESC, mes_num DESC;

