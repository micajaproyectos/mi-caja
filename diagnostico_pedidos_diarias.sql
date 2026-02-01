-- ============================================================
-- DIAGNÓSTICO: Vista pedidos_diarias
-- Este script identifica por qué la vista no devuelve datos
-- ============================================================

-- 1. Verificar si la vista existe
SELECT 
    'Vista pedidos_diarias existe: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ ✅'
        ELSE 'NO ❌' 
    END as resultado
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'pedidos_diarias';

-- ============================================================
-- 2. Ver la fecha actual del servidor (UTC) vs fecha esperada
-- ============================================================
SELECT 
    CURRENT_DATE as fecha_servidor_utc,
    CURRENT_DATE AT TIME ZONE 'America/Santiago' as fecha_chile,
    EXTRACT(YEAR FROM CURRENT_DATE) as anio_servidor,
    EXTRACT(MONTH FROM CURRENT_DATE) as mes_servidor,
    EXTRACT(YEAR FROM CURRENT_DATE AT TIME ZONE 'America/Santiago') as anio_chile,
    EXTRACT(MONTH FROM CURRENT_DATE AT TIME ZONE 'America/Santiago') as mes_chile;

-- ============================================================
-- 3. Contar pedidos en la tabla pedidos para enero 2026
-- ============================================================
SELECT 
    'Pedidos totales en tabla pedidos' as descripcion,
    COUNT(*) as cantidad
FROM public.pedidos
WHERE fecha_cl IS NOT NULL;

SELECT 
    'Pedidos con total_final en enero 2026' as descripcion,
    COUNT(*) as cantidad
FROM public.pedidos
WHERE fecha_cl IS NOT NULL
  AND total_final IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2026
  AND EXTRACT(MONTH FROM fecha_cl) = 1;

-- ============================================================
-- 4. Ver usuarios que tienen pedidos en enero 2026
-- ============================================================
SELECT 
    usuario_id,
    COUNT(*) as cantidad_pedidos,
    SUM(total_final) as total_mes
FROM public.pedidos
WHERE fecha_cl IS NOT NULL
  AND total_final IS NOT NULL
  AND EXTRACT(YEAR FROM fecha_cl) = 2026
  AND EXTRACT(MONTH FROM fecha_cl) = 1
  AND (estado IS NULL OR estado != 'anulado')
GROUP BY usuario_id
ORDER BY cantidad_pedidos DESC;

-- ============================================================
-- 5. Verificar la lógica de la vista paso por paso
-- ============================================================

-- Paso 1: ¿Cuántos días genera dias_mes?
WITH dias_mes AS (
  SELECT 
    generate_series(
      DATE_TRUNC('month', CURRENT_DATE),
      CURRENT_DATE,
      '1 day'::interval
    )::DATE AS fecha
)
SELECT 
    'Días generados por dias_mes' as descripcion,
    COUNT(*) as cantidad,
    MIN(fecha) as primer_dia,
    MAX(fecha) as ultimo_dia
FROM dias_mes;

-- Paso 2: ¿Qué usuarios encuentra usuarios_mes?
WITH usuarios_mes AS (
  SELECT DISTINCT p.usuario_id
  FROM public.pedidos p
  WHERE p.fecha_cl IS NOT NULL
    AND p.usuario_id IS NOT NULL
    AND p.total_final IS NOT NULL
    AND EXTRACT(YEAR FROM p.fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM p.fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND (p.estado IS NULL OR p.estado != 'anulado')
)
SELECT 
    'Usuarios encontrados por usuarios_mes (usando CURRENT_DATE)' as descripcion,
    COUNT(*) as cantidad,
    ARRAY_AGG(usuario_id) as lista_usuarios
FROM usuarios_mes;

-- Paso 3: Comparar con usuarios que deberían estar (enero 2026)
SELECT DISTINCT 
    'Usuarios que DEBERÍAN estar (enero 2026)' as descripcion,
    COUNT(*) OVER() as cantidad,
    usuario_id
FROM public.pedidos p
WHERE p.fecha_cl IS NOT NULL
  AND p.usuario_id IS NOT NULL
  AND p.total_final IS NOT NULL
  AND EXTRACT(YEAR FROM p.fecha_cl) = 2026
  AND EXTRACT(MONTH FROM p.fecha_cl) = 1
  AND (p.estado IS NULL OR p.estado != 'anulado');

-- ============================================================
-- 6. Consultar la vista directamente
-- ============================================================
SELECT 
    'Registros en vista pedidos_diarias' as descripcion,
    COUNT(*) as cantidad
FROM public.pedidos_diarias;

-- Ver datos de la vista si existen
SELECT 
    usuario_id,
    fecha,
    anio,
    mes_num,
    dia,
    total_dia
FROM public.pedidos_diarias
ORDER BY usuario_id, fecha
LIMIT 20;

-- ============================================================
-- 7. DIAGNÓSTICO: El problema
-- ============================================================
SELECT 
    '🔍 DIAGNÓSTICO' as titulo,
    CASE 
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) != 2026 OR EXTRACT(MONTH FROM CURRENT_DATE) != 1 THEN
            '❌ PROBLEMA: CURRENT_DATE del servidor no es enero 2026. Servidor: ' || 
            TO_CHAR(CURRENT_DATE, 'YYYY-MM') || ', Esperado: 2026-01'
        ELSE
            '✅ CURRENT_DATE del servidor coincide con enero 2026'
    END as resultado;

-- ============================================================
-- 8. SOLUCIÓN TEMPORAL: Consulta directa a pedidos
-- ============================================================
-- Esta es la consulta que usa el código JavaScript corregido

-- Ejemplo para enero 2026
WITH pedidos_enero AS (
  SELECT 
    usuario_id,
    fecha_cl,
    EXTRACT(DAY FROM fecha_cl) as dia,
    total_final
  FROM public.pedidos
  WHERE fecha_cl >= '2026-01-01'
    AND fecha_cl <= '2026-01-31'
    AND total_final IS NOT NULL
    AND (estado IS NULL OR estado != 'anulado')
)
SELECT 
    usuario_id,
    dia,
    COUNT(*) as num_pedidos,
    SUM(total_final) as total_dia
FROM pedidos_enero
GROUP BY usuario_id, dia
ORDER BY usuario_id, dia;

-- ============================================================
-- RESUMEN Y RECOMENDACIONES
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════';
    RAISE NOTICE '📋 RESUMEN DEL DIAGNÓSTICO';
    RAISE NOTICE '════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 La vista pedidos_diarias usa CURRENT_DATE del servidor';
    RAISE NOTICE '📅 Si el servidor está en UTC y hoy es diferente a enero 2026,';
    RAISE NOTICE '   la vista NO mostrará datos de enero 2026';
    RAISE NOTICE '';
    RAISE NOTICE '💡 SOLUCIONES:';
    RAISE NOTICE '   1. ✅ IMPLEMENTADA: El código JavaScript ahora consulta directamente';
    RAISE NOTICE '      la tabla pedidos con filtros de fecha explícitos';
    RAISE NOTICE '   2. 🔧 OPCIONAL: Recrear la vista para usar fecha de Chile';
    RAISE NOTICE '   3. 🔧 OPCIONAL: Modificar la vista para no depender de CURRENT_DATE';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════';
END $$;
