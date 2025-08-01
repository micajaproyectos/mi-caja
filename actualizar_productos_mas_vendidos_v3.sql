-- Script para corregir y actualizar la tabla 'productos_mas_vendidos'
-- Asegura que se use la columna 'ultima_venta' consistentemente

-- 1. Verificar si la tabla existe, si no, crearla
CREATE TABLE IF NOT EXISTS public.productos_mas_vendidos (
    id BIGSERIAL PRIMARY KEY,
    producto TEXT NOT NULL,
    cantidad_vendida DECIMAL(10,2) NOT NULL DEFAULT 0,
    ultima_venta TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.productos_mas_vendidos ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS
DROP POLICY IF EXISTS "Permitir acceso completo a productos_mas_vendidos" ON public.productos_mas_vendidos;
CREATE POLICY "Permitir acceso completo a productos_mas_vendidos" ON public.productos_mas_vendidos
    FOR ALL USING (true);

-- 4. Crear trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_productos_mas_vendidos_updated_at ON public.productos_mas_vendidos;
CREATE TRIGGER update_productos_mas_vendidos_updated_at
    BEFORE UPDATE ON public.productos_mas_vendidos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Si existe fecha_ultima_venta, migrar a ultima_venta
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos_mas_vendidos' 
        AND column_name = 'fecha_ultima_venta'
        AND table_schema = 'public'
    ) THEN
        -- Migrar datos de fecha_ultima_venta a ultima_venta
        UPDATE public.productos_mas_vendidos 
        SET ultima_venta = fecha_ultima_venta 
        WHERE ultima_venta IS NULL AND fecha_ultima_venta IS NOT NULL;
        
        -- Eliminar la columna fecha_ultima_venta
        ALTER TABLE public.productos_mas_vendidos DROP COLUMN fecha_ultima_venta;
        
        RAISE NOTICE 'Datos migrados de fecha_ultima_venta a ultima_venta y columna eliminada';
    ELSE
        RAISE NOTICE 'Columna fecha_ultima_venta no existe, no es necesario migrar';
    END IF;
END $$;

-- 6. Actualizar la función del trigger para usar ultima_venta
CREATE OR REPLACE FUNCTION actualizar_productos_mas_vendidos()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es una inserción o actualización
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Actualizar o insertar en productos_mas_vendidos
        INSERT INTO public.productos_mas_vendidos (producto, cantidad_vendida, ultima_venta)
        VALUES (
            NEW.producto,
            COALESCE(NEW.cantidad, 0),
            NEW.created_at
        )
        ON CONFLICT (producto) DO UPDATE SET
            cantidad_vendida = productos_mas_vendidos.cantidad_vendida + COALESCE(NEW.cantidad, 0),
            ultima_venta = GREATEST(productos_mas_vendidos.ultima_venta, NEW.created_at),
            updated_at = NOW();
    END IF;
    
    -- Si es una eliminación
    IF TG_OP = 'DELETE' THEN
        -- Recalcular la cantidad vendida para este producto
        WITH total_ventas AS (
            SELECT 
                producto,
                SUM(cantidad) as total_cantidad,
                MAX(created_at) as ultima_fecha
            FROM public.ventas 
            WHERE producto = OLD.producto
            GROUP BY producto
        )
        UPDATE public.productos_mas_vendidos 
        SET 
            cantidad_vendida = COALESCE(total_ventas.total_cantidad, 0),
            ultima_venta = total_ventas.ultima_fecha,
            updated_at = NOW()
        FROM total_ventas
        WHERE productos_mas_vendidos.producto = OLD.producto;
        
        -- Si no quedan ventas para este producto, eliminarlo
        DELETE FROM public.productos_mas_vendidos 
        WHERE producto = OLD.producto 
        AND NOT EXISTS (SELECT 1 FROM public.ventas WHERE producto = OLD.producto);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- 7. Crear trigger en la tabla ventas
DROP TRIGGER IF EXISTS trigger_actualizar_productos_mas_vendidos ON public.ventas;
CREATE TRIGGER trigger_actualizar_productos_mas_vendidos
    AFTER INSERT OR UPDATE OR DELETE ON public.ventas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_productos_mas_vendidos();

-- 8. Función para recalcular productos_mas_vendidos desde ventas
CREATE OR REPLACE FUNCTION recalcular_productos_mas_vendidos()
RETURNS void AS $$
BEGIN
    -- Limpiar tabla actual
    DELETE FROM public.productos_mas_vendidos;
    
    -- Recalcular desde ventas
    INSERT INTO public.productos_mas_vendidos (producto, cantidad_vendida, ultima_venta)
    SELECT 
        producto,
        SUM(cantidad) as cantidad_vendida,
        MAX(created_at) as ultima_venta
    FROM public.ventas
    GROUP BY producto
    ORDER BY cantidad_vendida DESC;
    
    RAISE NOTICE 'Tabla productos_mas_vendidos recalculada desde ventas';
END;
$$ language 'plpgsql';

-- 9. Función para poblar productos_mas_vendidos inicialmente
CREATE OR REPLACE FUNCTION poblar_productos_mas_vendidos()
RETURNS void AS $$
BEGIN
    -- Limpiar tabla
    DELETE FROM public.productos_mas_vendidos;
    
    -- Insertar datos agregados desde ventas
    INSERT INTO public.productos_mas_vendidos (producto, cantidad_vendida, ultima_venta)
    SELECT 
        producto,
        SUM(cantidad) as cantidad_vendida,
        MAX(created_at) as ultima_venta
    FROM public.ventas
    GROUP BY producto
    ORDER BY cantidad_vendida DESC;
    
    RAISE NOTICE 'Tabla productos_mas_vendidos poblada inicialmente';
END;
$$ language 'plpgsql';

-- 10. Ejecutar poblamiento inicial si la tabla está vacía
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.productos_mas_vendidos LIMIT 1) THEN
        PERFORM poblar_productos_mas_vendidos();
        RAISE NOTICE 'Tabla productos_mas_vendidos poblada inicialmente';
    ELSE
        RAISE NOTICE 'Tabla productos_mas_vendidos ya tiene datos';
    END IF;
END $$;

-- Verificar el estado final
SELECT 
    'Estado final de la tabla productos_mas_vendidos:' as mensaje,
    COUNT(*) as total_productos,
    SUM(cantidad_vendida) as total_cantidad_vendida
FROM public.productos_mas_vendidos; 