-- Script para actualizar la tabla productos_mas_vendidos existente
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Verificar la estructura actual de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'productos_mas_vendidos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar que la columna ultima_venta existe
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'productos_mas_vendidos' 
AND column_name = 'ultima_venta'
AND table_schema = 'public';

-- 3. Verificar los datos actuales
SELECT * FROM public.productos_mas_vendidos ORDER BY cantidad_vendida DESC;

-- 4. Crear función para actualizar productos_mas_vendidos desde ventas
CREATE OR REPLACE FUNCTION actualizar_productos_mas_vendidos_desde_ventas()
RETURNS void AS $$
BEGIN
    -- Limpiar tabla existente
    DELETE FROM public.productos_mas_vendidos;
    
    -- Insertar datos agregados de ventas
    INSERT INTO public.productos_mas_vendidos (producto, cantidad_vendida, ultima_venta)
    SELECT 
        producto,
        SUM(cantidad) as cantidad_vendida,
        MAX(created_at) as ultima_venta
    FROM public.ventas
    GROUP BY producto
    ORDER BY cantidad_vendida DESC;
END;
$$ language 'plpgsql';

-- 5. Ejecutar la función para poblar con datos actuales
SELECT actualizar_productos_mas_vendidos_desde_ventas();

-- 6. Verificar el resultado final
SELECT * FROM public.productos_mas_vendidos ORDER BY cantidad_vendida DESC; 