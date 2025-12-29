-- ============================================
-- CONSULTA: Estructura de la tabla PEDIDOS
-- Este script SOLO muestra la estructura de columnas
-- sin intentar acceder a datos que pueden no existir
-- ============================================

-- 1. Obtener TODAS las columnas de la tabla pedidos con sus tipos
SELECT 
    column_name as nombre_columna,
    data_type as tipo_dato,
    is_nullable as permite_null,
    column_default as valor_por_defecto,
    CASE 
        WHEN character_maximum_length IS NOT NULL 
        THEN character_maximum_length::text
        WHEN numeric_precision IS NOT NULL 
        THEN numeric_precision::text || ',' || numeric_scale::text
        ELSE NULL
    END as tamaño_precision
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pedidos'
ORDER BY ordinal_position;

-- 2. Resumen de campos clave para la vista (solo verificación de existencia)
SELECT 
    'Verificación de campos clave' as tipo_consulta,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'pedidos' 
            AND column_name = 'fecha_cl'
        ) THEN '✅ fecha_cl existe'
        ELSE '❌ fecha_cl NO existe'
    END as campo_fecha_cl,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'pedidos' 
            AND column_name = 'fecha'
        ) THEN '✅ fecha existe'
        ELSE '❌ fecha NO existe'
    END as campo_fecha,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'pedidos' 
            AND column_name = 'usuario_id'
        ) THEN '✅ usuario_id existe'
        ELSE '❌ usuario_id NO existe'
    END as campo_usuario_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'pedidos' 
            AND column_name = 'total_final'
        ) THEN '✅ total_final existe'
        ELSE '❌ total_final NO existe'
    END as campo_total_final,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'pedidos' 
            AND column_name = 'total'
        ) THEN '✅ total existe'
        ELSE '❌ total NO existe'
    END as campo_total,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'pedidos' 
            AND column_name = 'monto'
        ) THEN '✅ monto existe'
        ELSE '❌ monto NO existe'
    END as campo_monto,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'pedidos' 
            AND column_name = 'estado'
        ) THEN '✅ estado existe'
        ELSE '❌ estado NO existe'
    END as campo_estado;
