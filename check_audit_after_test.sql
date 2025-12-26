-- ============================================================================
-- VERIFICAR AUDITORÍA DESPUÉS DE LA PRUEBA
-- ============================================================================
-- Ejecuta este script DESPUÉS de editar un gasto en la aplicación

-- 1. Ver el estado actual de la tabla auditoría (después de la prueba)
SELECT 
    'Registros de auditoría DESPUÉS de la prueba: ' || COUNT(*) as estado_final
FROM public.auditoria 
WHERE tabla_nombre = 'gasto';

-- 2. Ver los últimos registros de auditoría de gastos
SELECT 
    id,
    tabla_nombre,
    accion,
    fecha_hora,
    usuario_id,
    cliente_id,
    registro_id
FROM public.auditoria 
WHERE tabla_nombre = 'gasto'
ORDER BY fecha_hora DESC
LIMIT 5;

-- 3. Ver los detalles de la última edición (si existe)
SELECT 
    a.id,
    a.accion,
    a.fecha_hora,
    a.datos_anteriores,
    a.datos_nuevos,
    -- Mostrar solo los campos que cambiaron
    CASE 
        WHEN a.accion = 'UPDATE' THEN
            (SELECT jsonb_object_agg(key, value)
             FROM jsonb_each(a.datos_nuevos)
             WHERE value IS DISTINCT FROM a.datos_anteriores->key)
        ELSE NULL
    END as campos_modificados
FROM public.auditoria a
WHERE a.tabla_nombre = 'gasto'
ORDER BY a.fecha_hora DESC
LIMIT 1;

-- 4. Contar operaciones por tipo
SELECT 
    accion,
    COUNT(*) as total_operaciones,
    MAX(fecha_hora) as ultima_operacion
FROM public.auditoria 
WHERE tabla_nombre = 'gasto'
GROUP BY accion;

-- Mensaje de confirmación
DO $$
DECLARE
    total_registros INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_registros
    FROM public.auditoria 
    WHERE tabla_nombre = 'gasto';
    
    IF total_registros > 0 THEN
        RAISE NOTICE '✅ AUDITORÍA FUNCIONANDO CORRECTAMENTE';
        RAISE NOTICE '📊 Total de registros de auditoría para gastos: %', total_registros;
        RAISE NOTICE '🎉 El trigger está registrando las operaciones correctamente';
    ELSE
        RAISE NOTICE '⚠️ No se encontraron registros de auditoría';
        RAISE NOTICE '🔍 Verifica que hayas editado un gasto en la aplicación';
    END IF;
END $$;
