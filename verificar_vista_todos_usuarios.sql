-- ============================================
-- Verificar si la vista tiene datos de TODOS los usuarios
-- ============================================

-- 1. Ver TODOS los registros de la vista (sin filtrar por usuario)
SELECT 
    usuario_id,
    fecha,
    anio,
    mes_num,
    dia,
    total_dia
FROM public.pedidos_diarias
ORDER BY usuario_id, fecha
LIMIT 50;

-- 2. Total de TODOS los usuarios en la vista
SELECT 
    COUNT(*) as cantidad_dias,
    SUM(total_dia)::numeric as total_todos_usuarios,
    COUNT(DISTINCT usuario_id) as cantidad_usuarios,
    MIN(fecha) as fecha_minima,
    MAX(fecha) as fecha_maxima
FROM public.pedidos_diarias;

-- 3. Resumen por usuario
SELECT 
    usuario_id,
    COUNT(*) as dias,
    SUM(total_dia)::numeric as total_por_usuario,
    MIN(fecha) as fecha_minima,
    MAX(fecha) as fecha_maxima
FROM public.pedidos_diarias
GROUP BY usuario_id
ORDER BY total_por_usuario DESC;

-- 4. Verificar si el usuario específico tiene datos
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ tiene datos'
        ELSE 'NO tiene datos'
    END as tiene_datos,
    COUNT(*) as cantidad_registros,
    SUM(total_dia)::numeric as total
FROM public.pedidos_diarias
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44';

