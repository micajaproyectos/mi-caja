-- ============================================
-- DIAGNÓSTICO: Comparar vista pedidos_diarias vs tabla pedidos
-- Para identificar discrepancias en los totales
-- ============================================

-- Usuario a verificar
-- Reemplaza 'd4520533-ce29-4b90-beb0-032cfd0f71fd' con el UUID del usuario que quieres verificar

-- 1. Total según la VISTA pedidos_diarias (lo que muestra actualmente)
SELECT 
    'Total según VISTA pedidos_diarias' as tipo_consulta,
    SUM(total_dia)::numeric as total_vista,
    COUNT(*) as cantidad_dias,
    MIN(fecha) as fecha_minima,
    MAX(fecha) as fecha_maxima
FROM public.pedidos_diarias
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd';

-- 2. Total según la TABLA pedidos (lo que debería ser)
SELECT 
    'Total según TABLA pedidos' as tipo_consulta,
    SUM(COALESCE(total_final, total, 0))::numeric as total_tabla,
    COUNT(*) as cantidad_pedidos,
    COUNT(DISTINCT DATE(fecha_cl)) as cantidad_dias_distintos,
    MIN(fecha_cl) as fecha_minima,
    MAX(fecha_cl) as fecha_maxima
FROM public.pedidos
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND (estado IS NULL OR estado != 'anulado');

-- 3. Desglose por día según la VISTA
SELECT 
    'Desglose VISTA por día' as tipo_consulta,
    fecha,
    total_dia,
    anio,
    mes_num,
    dia
FROM public.pedidos_diarias
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
ORDER BY fecha;

-- 4. Desglose por día según la TABLA (agrupado manualmente)
SELECT 
    'Desglose TABLA por día' as tipo_consulta,
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

-- 5. Verificar si hay pedidos con estado anulado que se están incluyendo
SELECT 
    'Pedidos anulados en el mes' as tipo_consulta,
    COUNT(*) as cantidad_anulados,
    SUM(COALESCE(total_final, total, 0))::numeric as total_anulados
FROM public.pedidos
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND estado = 'anulado';

-- 6. Verificar diferencias entre total_final y total
SELECT 
    'Análisis total_final vs total' as tipo_consulta,
    COUNT(*) as total_pedidos,
    COUNT(total_final) as pedidos_con_total_final,
    COUNT(total) as pedidos_con_total,
    COUNT(CASE WHEN total_final IS NULL AND total IS NULL THEN 1 END) as pedidos_sin_total,
    SUM(COALESCE(total_final, 0))::numeric as suma_total_final,
    SUM(COALESCE(total, 0))::numeric as suma_total,
    SUM(COALESCE(total_final, total, 0))::numeric as suma_coalesce
FROM public.pedidos
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND (estado IS NULL OR estado != 'anulado');

-- 7. Verificar si hay pedidos duplicados o con valores negativos
SELECT 
    'Verificación de datos anómalos' as tipo_consulta,
    COUNT(*) as total_pedidos,
    COUNT(CASE WHEN COALESCE(total_final, total, 0) < 0 THEN 1 END) as pedidos_negativos,
    COUNT(CASE WHEN COALESCE(total_final, total, 0) = 0 THEN 1 END) as pedidos_cero,
    COUNT(CASE WHEN total_final IS NOT NULL AND total IS NOT NULL AND total_final != total THEN 1 END) as pedidos_con_diferencia_total
FROM public.pedidos
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
  AND fecha_cl IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND (estado IS NULL OR estado != 'anulado');

-- 8. Comparación lado a lado: Vista vs Tabla por día
SELECT 
    COALESCE(v.fecha, t.fecha) as fecha,
    COALESCE(v.total_dia, 0)::numeric as total_vista,
    COALESCE(t.total_dia, 0)::numeric as total_tabla,
    (COALESCE(v.total_dia, 0) - COALESCE(t.total_dia, 0))::numeric as diferencia
FROM public.pedidos_diarias v
FULL OUTER JOIN (
    SELECT 
        DATE(fecha_cl) as fecha,
        SUM(COALESCE(total_final, total, 0))::numeric as total_dia
    FROM public.pedidos
    WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
      AND fecha_cl IS NOT NULL
      AND EXTRACT(YEAR FROM fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND (estado IS NULL OR estado != 'anulado')
    GROUP BY DATE(fecha_cl)
) t ON v.fecha = t.fecha AND v.usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
WHERE COALESCE(v.usuario_id::text, 'd4520533-ce29-4b90-beb0-032cfd0f71fd') = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
ORDER BY COALESCE(v.fecha, t.fecha);

-- 9. Verificar pedidos fuera del mes actual (para entender el cálculo manual)
SELECT 
    'Pedidos FUERA del mes actual' as tipo_consulta,
    COUNT(*) as cantidad_pedidos,
    SUM(COALESCE(total_final, total, 0))::numeric as total_fuera_mes_actual,
    MIN(fecha_cl) as fecha_minima,
    MAX(fecha_cl) as fecha_maxima
FROM public.pedidos
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
  AND fecha_cl IS NOT NULL
  AND (
    EXTRACT(YEAR FROM fecha_cl) != EXTRACT(YEAR FROM CURRENT_DATE)
    OR EXTRACT(MONTH FROM fecha_cl) != EXTRACT(MONTH FROM CURRENT_DATE)
  )
  AND (estado IS NULL OR estado != 'anulado');

-- 10. Total acumulado de TODOS los pedidos (sin filtro de mes)
SELECT 
    'Total TODOS los pedidos (sin filtro mes)' as tipo_consulta,
    COUNT(*) as cantidad_pedidos,
    SUM(COALESCE(total_final, total, 0))::numeric as total_todos,
    MIN(fecha_cl) as fecha_minima,
    MAX(fecha_cl) as fecha_maxima
FROM public.pedidos
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
  AND fecha_cl IS NOT NULL
  AND (estado IS NULL OR estado != 'anulado');

-- 11. Verificar qué mes estamos consultando
SELECT 
    'Mes actual consultado' as tipo_consulta,
    EXTRACT(YEAR FROM CURRENT_DATE) as anio_actual,
    EXTRACT(MONTH FROM CURRENT_DATE) as mes_actual,
    CURRENT_DATE as fecha_actual;

-- 12. Verificar si hay duplicados en la vista (mismo usuario, misma fecha)
SELECT 
    'Verificación de duplicados en VISTA' as tipo_consulta,
    usuario_id,
    fecha,
    COUNT(*) as veces_que_aparece,
    SUM(total_dia) as total_sumado
FROM public.pedidos_diarias
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
GROUP BY usuario_id, fecha
HAVING COUNT(*) > 1;

-- 13. Ver todos los registros de la vista para ese usuario
SELECT 
    'Todos los registros de la VISTA' as tipo_consulta,
    usuario_id,
    fecha,
    anio,
    mes_num,
    dia,
    total_dia
FROM public.pedidos_diarias
WHERE usuario_id = 'd4520533-ce29-4b90-beb0-032cfd0f71fd'
ORDER BY fecha;

