-- Verificar qué columnas tiene la vista productos_sin_ventas_30d_view
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'productos_sin_ventas_30d_view'
ORDER BY ordinal_position;

-- También ver la definición de la vista
SELECT viewname, definition
FROM pg_views
WHERE viewname = 'productos_sin_ventas_30d_view';

