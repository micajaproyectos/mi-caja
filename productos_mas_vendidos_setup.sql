-- Script para crear la tabla 'productos_mas_vendidos' en Supabase
-- Esta tabla se actualizará automáticamente basándose en los datos de ventas
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla productos_mas_vendidos si no existe
CREATE TABLE IF NOT EXISTS public.productos_mas_vendidos (
    id BIGSERIAL PRIMARY KEY,
    producto TEXT NOT NULL,
    cantidad_vendida DECIMAL(10,2) NOT NULL DEFAULT 0,
    fecha_ultima_venta TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(producto)
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_mas_vendidos_producto ON public.productos_mas_vendidos(producto);
CREATE INDEX IF NOT EXISTS idx_productos_mas_vendidos_cantidad ON public.productos_mas_vendidos(cantidad_vendida DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.productos_mas_vendidos ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad para permitir operaciones anónimas
-- Política para SELECT (leer)
CREATE POLICY "Permitir lectura anónima de productos_mas_vendidos" ON public.productos_mas_vendidos
    FOR SELECT USING (true);

-- Política para INSERT (insertar)
CREATE POLICY "Permitir inserción anónima de productos_mas_vendidos" ON public.productos_mas_vendidos
    FOR INSERT WITH CHECK (true);

-- Política para UPDATE (actualizar)
CREATE POLICY "Permitir actualización anónima de productos_mas_vendidos" ON public.productos_mas_vendidos
    FOR UPDATE USING (true);

-- Política para DELETE (eliminar)
CREATE POLICY "Permitir eliminación anónima de productos_mas_vendidos" ON public.productos_mas_vendidos
    FOR DELETE USING (true);

-- 5. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_productos_mas_vendidos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Crear trigger para actualizar updated_at
CREATE TRIGGER update_productos_mas_vendidos_updated_at 
    BEFORE UPDATE ON public.productos_mas_vendidos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_productos_mas_vendidos_updated_at();

-- 7. Crear función para actualizar productos_mas_vendidos cuando se inserta/actualiza/elimina una venta
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

-- 8. Crear trigger para actualizar productos_mas_vendidos automáticamente
CREATE TRIGGER trigger_actualizar_productos_mas_vendidos
    AFTER INSERT OR UPDATE OR DELETE ON public.ventas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_productos_mas_vendidos();

-- 9. Función para poblar productos_mas_vendidos con datos existentes
CREATE OR REPLACE FUNCTION poblar_productos_mas_vendidos()
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
END;
$$ language 'plpgsql';

-- 10. Ejecutar la función para poblar con datos existentes
SELECT poblar_productos_mas_vendidos();

-- 11. Verificar la estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'productos_mas_vendidos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 12. Verificar los datos insertados
SELECT * FROM public.productos_mas_vendidos ORDER BY cantidad_vendida DESC;

-- 13. Verificar las políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'productos_mas_vendidos'; 