-- Consultar la estructura de la tabla pedidos existente
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pedidos'
ORDER BY ordinal_position;

-- Ver las constraints y llaves
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'pedidos'
ORDER BY tc.constraint_type, kcu.ordinal_position;

