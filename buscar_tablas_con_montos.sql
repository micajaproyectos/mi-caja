-- Script para buscar tablas que tengan campos de monto/precio/total
-- Y que también tengan usuario_id

-- 1. Buscar columnas con nombres relacionados a dinero
SELECT 
    table_name,
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND (
        column_name ILIKE '%monto%' 
        OR column_name ILIKE '%precio%'
        OR column_name ILIKE '%total%'
        OR column_name ILIKE '%venta%'
        OR column_name ILIKE '%pago%'
    )
ORDER BY 
    table_name, column_name;

-- 2. Ver estructura completa de tablas que podrían tener ventas con usuario_id
-- Ejecuta estas consultas según las tablas que encuentres arriba

-- Opción A: Si existe tabla con montos Y usuario_id
SELECT DISTINCT
    c1.table_name,
    array_agg(DISTINCT c1.column_name ORDER BY c1.column_name) FILTER (WHERE c1.column_name ILIKE '%monto%' OR c1.column_name ILIKE '%precio%' OR c1.column_name ILIKE '%total%') as campos_dinero,
    bool_or(c2.column_name = 'usuario_id') as tiene_usuario_id,
    bool_or(c3.column_name ILIKE '%fecha%') as tiene_fecha
FROM 
    information_schema.columns c1
    LEFT JOIN information_schema.columns c2 ON c1.table_name = c2.table_name AND c2.column_name = 'usuario_id'
    LEFT JOIN information_schema.columns c3 ON c1.table_name = c3.table_name AND c3.column_name ILIKE '%fecha%'
WHERE 
    c1.table_schema = 'public'
    AND (
        c1.column_name ILIKE '%monto%' 
        OR c1.column_name ILIKE '%precio%'
        OR c1.column_name ILIKE '%total%'
    )
GROUP BY 
    c1.table_name
HAVING 
    bool_or(c2.column_name = 'usuario_id') = true
ORDER BY 
    c1.table_name;
