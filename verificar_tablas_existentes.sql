-- Script para verificar qué tablas existen en la base de datos
-- y cuáles tienen el campo usuario_id

-- 1. Listar todas las tablas del schema public
SELECT 
    table_name
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name;

-- 2. Buscar tablas que tengan la columna usuario_id
SELECT 
    table_name,
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND column_name = 'usuario_id'
ORDER BY 
    table_name;

-- 3. Ver la estructura completa de las tablas que podrían contener ventas
-- (ejecuta estas consultas una por una según las tablas que encuentres)

-- Si existe la tabla 'ventas_rapidas':
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'ventas_rapidas'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;

-- Si existe la tabla 'ventas':
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'ventas'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;

-- Si existe la tabla 'pedidos_cocina':
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'pedidos_cocina'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;
