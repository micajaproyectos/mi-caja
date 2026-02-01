-- ============================================================
-- ¿POR QUÉ LA VISTA pedidos_diarias ESTÁ VACÍA?
-- ============================================================

-- 1️⃣ Ver qué fecha/mes está buscando la vista (CURRENT_DATE del servidor)
SELECT 
    '1️⃣ FECHA QUE USA LA VISTA' as seccion,
    CURRENT_DATE as fecha_servidor,
    EXTRACT(YEAR FROM CURRENT_DATE) as anio_que_busca,
    EXTRACT(MONTH FROM CURRENT_DATE) as mes_que_busca,
    TO_CHAR(CURRENT_DATE, 'Month YYYY') as mes_texto;

-- 2️⃣ Ver qué fechas/meses TIENEN los pedidos reales
SELECT 
    '2️⃣ FECHAS QUE TIENEN LOS PEDIDOS' as seccion,
    EXTRACT(YEAR FROM fecha_cl) as anio_en_datos,
    EXTRACT(MONTH FROM fecha_cl) as mes_en_datos,
    TO_CHAR(MIN(fecha_cl), 'Month YYYY') as mes_texto,
    COUNT(*) as cantidad_pedidos
FROM public.pedidos
WHERE fecha_cl IS NOT NULL
  AND total_final IS NOT NULL
GROUP BY EXTRACT(YEAR FROM fecha_cl), EXTRACT(MONTH FROM fecha_cl)
ORDER BY anio_en_datos DESC, mes_en_datos DESC
LIMIT 5;

-- 3️⃣ COMPARACIÓN: ¿Coinciden?
SELECT 
    '3️⃣ DIAGNÓSTICO' as seccion,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.pedidos 
            WHERE EXTRACT(YEAR FROM fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
              AND EXTRACT(MONTH FROM fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND total_final IS NOT NULL
        ) THEN '✅ SÍ HAY PEDIDOS EN EL MES QUE BUSCA LA VISTA'
        ELSE '❌ NO HAY PEDIDOS EN EL MES QUE BUSCA LA VISTA (por eso está vacía)'
    END as resultado;

-- 4️⃣ EXPLICACIÓN DETALLADA
DO $$
DECLARE
    mes_servidor INTEGER;
    anio_servidor INTEGER;
    mes_datos INTEGER;
    anio_datos INTEGER;
BEGIN
    -- Obtener mes/año del servidor
    mes_servidor := EXTRACT(MONTH FROM CURRENT_DATE);
    anio_servidor := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Obtener mes/año más reciente de los pedidos
    SELECT 
        EXTRACT(YEAR FROM MAX(fecha_cl)),
        EXTRACT(MONTH FROM MAX(fecha_cl))
    INTO anio_datos, mes_datos
    FROM public.pedidos
    WHERE fecha_cl IS NOT NULL;
    
    RAISE NOTICE '════════════════════════════════════════════════════';
    RAISE NOTICE '📋 EXPLICACIÓN: Por qué la vista está vacía';
    RAISE NOTICE '════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '🖥️  CURRENT_DATE del servidor: %/%', mes_servidor, anio_servidor;
    RAISE NOTICE '📊 Pedidos más recientes están en: %/%', mes_datos, anio_datos;
    RAISE NOTICE '';
    
    IF mes_servidor = mes_datos AND anio_servidor = anio_datos THEN
        RAISE NOTICE '✅ ¡Coinciden! La vista DEBERÍA tener datos';
        RAISE NOTICE '   Si está vacía, hay otro problema en la vista';
    ELSE
        RAISE NOTICE '❌ NO COINCIDEN - Por eso la vista está vacía';
        RAISE NOTICE '';
        RAISE NOTICE '💡 La vista busca pedidos de: %/%', mes_servidor, anio_servidor;
        RAISE NOTICE '📁 Pero los pedidos están en: %/%', mes_datos, anio_datos;
        RAISE NOTICE '';
        RAISE NOTICE '🔧 SOLUCIÓN: El código JavaScript ya NO usa esta vista';
        RAISE NOTICE '   Ahora consulta directamente con fecha específica';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════';
END $$;
