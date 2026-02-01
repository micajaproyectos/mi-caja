-- DIAGNÓSTICO SIMPLE: TODO EN UNA TABLA
SELECT 
    'Vista busca' as tipo,
    EXTRACT(YEAR FROM CURRENT_DATE) as anio,
    EXTRACT(MONTH FROM CURRENT_DATE) as mes,
    CURRENT_DATE::text as fecha_completa,
    0 as cantidad_pedidos

UNION ALL

SELECT 
    'Pedidos están en' as tipo,
    EXTRACT(YEAR FROM fecha_cl) as anio,
    EXTRACT(MONTH FROM fecha_cl) as mes,
    TO_CHAR(MIN(fecha_cl), 'YYYY-MM-DD') as fecha_completa,
    COUNT(*) as cantidad_pedidos
FROM public.pedidos
WHERE fecha_cl IS NOT NULL
  AND total_final IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2026
  AND EXTRACT(MONTH FROM fecha_cl) = 1
GROUP BY EXTRACT(YEAR FROM fecha_cl), EXTRACT(MONTH FROM fecha_cl)

ORDER BY tipo DESC;
