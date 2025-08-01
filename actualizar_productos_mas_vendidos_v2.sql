-- Script para corregir y actualizar la tabla 'productos_mas_vendidos'
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

-- 2. Verificar si existe la columna fecha_ultima_venta
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'productos_mas_vendidos' 
AND column_name IN ('fecha_ultima_venta', 'ultima_venta')
AND table_schema = 'public';

-- 3. Si no existe fecha_ultima_venta, agregarla
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
        
        -- Si existe ultima_venta, migrar los datos
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'productos_mas_vendidos' 
            AND column_name = 'ultima_venta'
            AND table_schema = 'public'
        ) THEN
            UPDATE public.productos_mas_vendidos 
            SET fecha_ultima_venta = ultima_venta 
            WHERE fecha_ultima_venta IS NULL;
        END IF;
        
        RAISE NOTICE 'Columna fecha_ultima_venta agregada';
    ELSE
        RAISE NOTICE 'Columna fecha_ultima_venta ya existe';
    END IF;
END $$;

-- 4. Actualizar la función del trigger para usar fecha_ultima_venta
CREATE OR REPLACE FUNCTION actualizar_productos_mas_vendidos()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es una inserción o actualización
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Insertar o actualizar el producto en productos_mas_vendidos
        INSERT INTO public.productos_mas_vendidos (producto, cantidad_vendida, fecha_ultima_venta)
        VALUES (NEW.producto, NEW.cantidad, NEW.created_at)
        ON CONFLICT (producto) 
        DO UPDATE SET 
            cantidad_vendida = productos_mas_vendidos.cantidad_vendida + NEW.cantidad,
            fecha_ultima_venta = CASE 
                WHEN NEW.created_at > productos_mas_vendidos.fecha_ultima_venta 
                THEN NEW.created_at 
                ELSE productos_mas_vendidos.fecha_ultima_venta 
            END,
            updated_at = NOW();
        
        RETURN NEW;
    END IF;
    
    -- Si es una eliminación
    IF TG_OP = 'DELETE' THEN
        -- Actualizar la cantidad vendida restando la cantidad eliminada
        UPDATE public.productos_mas_vendidos 
        SET 
            cantidad_vendida = cantidad_vendida - OLD.cantidad,
            updated_at = NOW()
        WHERE producto = OLD.producto;
        
        -- Si la cantidad vendida llega a 0 o menos, eliminar el registro
        DELETE FROM public.productos_mas_vendidos 
        WHERE producto = OLD.producto AND cantidad_vendida <= 0;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 5. Verificar que el trigger existe y recrearlo si es necesario
DROP TRIGGER IF EXISTS trigger_actualizar_productos_mas_vendidos ON public.ventas;

CREATE TRIGGER trigger_actualizar_productos_mas_vendidos
    AFTER INSERT OR UPDATE OR DELETE ON public.ventas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_productos_mas_vendidos();

-- 6. Función para recalcular productos_mas_vendidos desde ventas
CREATE OR REPLACE FUNCTION recalcular_productos_mas_vendidos()
RETURNS void AS $$
BEGIN
    -- Limpiar tabla existente
    DELETE FROM public.productos_mas_vendidos;
    
    -- Insertar datos agregados de ventas existentes
    INSERT INTO public.productos_mas_vendidos (producto, cantidad_vendida, fecha_ultima_venta)
    SELECT 
        producto,
        SUM(cantidad) as cantidad_vendida,
        MAX(created_at) as fecha_ultima_venta
    FROM public.ventas
    GROUP BY producto
    ORDER BY cantidad_vendida DESC;
    
    RAISE NOTICE 'Tabla productos_mas_vendidos recalculada desde ventas';
END;
$$ language 'plpgsql';

-- 7. Ejecutar la función para recalcular con datos actuales
SELECT recalcular_productos_mas_vendidos();

-- 8. Verificar los datos recalculados
SELECT 
    producto,
    cantidad_vendida,
    fecha_ultima_venta,
    created_at,
    updated_at
FROM public.productos_mas_vendidos 
ORDER BY cantidad_vendida DESC;

-- 9. Verificar que los triggers están funcionando
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ventas'
AND trigger_name = 'trigger_actualizar_productos_mas_vendidos';

-- 10. Mostrar resumen de la operación
SELECT 
    'Resumen de la operación' as titulo,
    COUNT(*) as total_productos,
    SUM(cantidad_vendida) as total_vendido,
    MAX(fecha_ultima_venta) as ultima_venta_registrada
FROM public.productos_mas_vendidos; 