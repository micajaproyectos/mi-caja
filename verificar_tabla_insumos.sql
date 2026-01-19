-- Verificar si la tabla insumos existe y su estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'insumos'
ORDER BY ordinal_position;

-- Ver si hay datos
SELECT COUNT(*) as total_registros FROM insumos;
