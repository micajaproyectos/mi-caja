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

-- 2. Agregar la columna fecha_ultima_venta si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos_mas_vendidos' 
        AND column_name = 'fecha_ultima_venta'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.productos_mas_vendidos 
        ADD COLUMN fecha_ultima_venta TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Verificar que la columna se agregó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'productos_mas_vendidos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Actualizar datos existentes con fecha_ultima_venta
UPDATE public.productos_mas_vendidos 
SET fecha_ultima_venta = NOW() 
WHERE fecha_ultima_venta IS NULL;

-- 5. Verificar los datos actuales
SELECT * FROM public.productos_mas_vendidos ORDER BY cantidad_vendida DESC;

-- 6. Crear función para actualizar productos_mas_vendidos desde ventas
CREATE OR REPLACE FUNCTION actualizar_productos_mas_vendidos_desde_ventas()
RETURNS void AS $$
BEGIN
    -- Limpiar tabla existente
    DELETE FROM public.productos_mas_vendidos;
    
    -- Insertar datos agregados de ventas
    INSERT INTO public.productos_mas_vendidos (producto, cantidad_vendida, fecha_ultima_venta)
    SELECT 
        producto,
        SUM(cantidad) as cantidad_vendida,
        MAX(created_at) as fecha_ultima_venta
    FROM public.ventas
    GROUP BY producto
    ORDER BY cantidad_vendida DESC;
END;
$$ language 'plpgsql';

-- 7. Ejecutar la función para poblar con datos actuales
SELECT actualizar_productos_mas_vendidos_desde_ventas();

-- 8. Verificar el resultado final
SELECT * FROM public.productos_mas_vendidos ORDER BY cantidad_vendida DESC; 