-- ============================================================
-- DIAGNÓSTICO FINAL: Problema de productos borrados a las 00:00
-- ============================================================

-- RESUMEN DE HALLAZGOS:
-- ✅ NO hay pg_cron instalado (no puede haber tareas programadas)
-- ✅ NO hay triggers en productos_mesas_temp
-- ✅ La función limpiar_mesas_temporales_antiguas() existe pero NO se ejecuta automáticamente
-- ✅ Hay un producto de hace 8 días sin borrar (prueba de que NO hay limpieza automática)
-- ✅ NO hay código en el frontend que borre productos a las 00:00

-- ============================================================
-- POSIBLES CAUSAS DEL PROBLEMA REPORTADO:
-- ============================================================

-- 1. PROBLEMA DE CACHÉ DEL NAVEGADOR
--    - Los usuarios pueden estar viendo datos antiguos del localStorage
--    - Al pasar las 00:00, el navegador podría recargar y mostrar datos desincronizados

-- 2. PROBLEMA DE SINCRONIZACIÓN REALTIME
--    - Si hay problemas de red, Realtime podría no sincronizar correctamente
--    - Los productos podrían parecer borrados pero en realidad están en Supabase

-- 3. MÚLTIPLES DISPOSITIVOS
--    - Si un usuario tiene múltiples sesiones abiertas y cierra/paga en una
--    - Los otros dispositivos verán los productos desaparecer

-- 4. ALGUIEN EJECUTÓ MANUALMENTE LA FUNCIÓN
--    - Alguien pudo haber ejecutado: SELECT limpiar_mesas_temporales_antiguas();
--    - Esto borraría productos con más de 24 horas

-- ============================================================
-- CONSULTA PARA VERIFICAR SI HAY PRODUCTOS "VIEJOS"
-- ============================================================
-- Esta consulta muestra productos con más de 20 horas
-- Si hay muchos productos antiguos, es señal de que los usuarios
-- están dejando mesas sin pagar por días

SELECT 
    id,
    usuario_id,
    mesa,
    producto,
    cantidad,
    created_at,
    NOW() - created_at as antiguedad,
    CASE 
        WHEN created_at < NOW() - INTERVAL '20 hours' THEN '⚠️ MÁS DE 20 HORAS'
        WHEN created_at < NOW() - INTERVAL '12 hours' THEN '⏰ MÁS DE 12 HORAS'
        WHEN created_at < NOW() - INTERVAL '6 hours' THEN '🕐 MÁS DE 6 HORAS'
        ELSE '✅ RECIENTE'
    END as estado
FROM productos_mesas_temp
ORDER BY created_at DESC;

-- Contar productos por antigüedad
SELECT 
    CASE 
        WHEN created_at < NOW() - INTERVAL '24 hours' THEN 'MÁS DE 24 HORAS'
        WHEN created_at < NOW() - INTERVAL '12 hours' THEN 'MÁS DE 12 HORAS'
        WHEN created_at < NOW() - INTERVAL '6 hours' THEN 'MÁS DE 6 HORAS'
        ELSE 'MENOS DE 6 HORAS'
    END as rango,
    COUNT(*) as cantidad
FROM productos_mesas_temp
GROUP BY rango
ORDER BY 
    CASE 
        WHEN rango = 'MÁS DE 24 HORAS' THEN 1
        WHEN rango = 'MÁS DE 12 HORAS' THEN 2
        WHEN rango = 'MÁS DE 6 HORAS' THEN 3
        ELSE 4
    END;

-- ============================================================
-- RECOMENDACIONES:
-- ============================================================

-- OPCIÓN 1: ACTIVAR LIMPIEZA AUTOMÁTICA (RECOMENDADO)
-- Si quieres que los productos antiguos se borren automáticamente:
-- 
-- Primero, habilitar pg_cron (requiere plan Pro de Supabase):
-- CREATE EXTENSION pg_cron;
--
-- Luego programar la limpieza diaria a las 3 AM:
-- SELECT cron.schedule(
--     'limpiar-mesas-temporales',
--     '0 3 * * *',
--     $$SELECT limpiar_mesas_temporales_antiguas()$$
-- );

-- OPCIÓN 2: EJECUTAR LIMPIEZA MANUAL PERIÓDICAMENTE
-- Si NO quieres automatizar, ejecutar esto manualmente cada semana:
-- SELECT limpiar_mesas_temporales_antiguas();

-- OPCIÓN 3: MODIFICAR LA FUNCIÓN PARA QUE SEA MÁS AGRESIVA
-- Si 24 horas es mucho, cambiar a 12 horas:
-- 
-- CREATE OR REPLACE FUNCTION limpiar_mesas_temporales_antiguas()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM productos_mesas_temp
--     WHERE created_at < NOW() - INTERVAL '12 hours';
--     
--     RAISE NOTICE 'Mesas temporales antiguas limpiadas';
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================================
-- PARA INVESTIGAR EL PROBLEMA ESPECÍFICO:
-- ============================================================

-- 1. Preguntar a los usuarios:
--    - ¿A qué hora exacta notan que se borran los productos?
--    - ¿Sucede exactamente a las 00:00 o es aproximado?
--    - ¿Tienen múltiples dispositivos abiertos?
--    - ¿Los productos desaparecen de todos los dispositivos al mismo tiempo?

-- 2. Revisar logs del navegador:
--    - Abrir DevTools (F12) en el navegador
--    - Ver la pestaña Console
--    - Buscar mensajes que digan "Realtime" o "productos_mesas_temp"

-- 3. Verificar conexión Realtime:
--    - Ir a Supabase Dashboard → Database → Replication
--    - Verificar que productos_mesas_temp esté en la lista

-- ============================================================
