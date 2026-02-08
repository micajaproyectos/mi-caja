-- Script para verificar la estructura de la tabla 'pedidos'
-- Esto nos ayudará a entender qué campos tiene disponibles

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'pedidos'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;

-- Ver algunos registros de ejemplo para entender los datos
SELECT *
FROM public.pedidos
LIMIT 5;
