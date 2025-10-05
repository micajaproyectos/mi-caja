-- Eliminar tabla existente si tiene tipos incorrectos
DROP TABLE IF EXISTS recetas CASCADE;

-- Eliminar políticas existentes (si existen) - ya no son necesarias porque eliminamos la tabla

-- Crear tabla para almacenar recetas
CREATE TABLE IF NOT EXISTS recetas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_producto TEXT NOT NULL,
    cantidad_deseada NUMERIC(10,2) NOT NULL DEFAULT 0,
    cantidad_base NUMERIC(10,2) NOT NULL DEFAULT 1,
    ingredientes JSONB NOT NULL DEFAULT '[]'::jsonb,
    fecha_cl TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID,
    cliente_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_recetas_usuario_id ON recetas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recetas_cliente_id ON recetas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recetas_nombre_producto ON recetas(nombre_producto);
CREATE INDEX IF NOT EXISTS idx_recetas_fecha_cl ON recetas(fecha_cl);
CREATE INDEX IF NOT EXISTS idx_recetas_created_at ON recetas(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS siguiendo el patrón del sistema (usuarios y admin)
-- Política para SELECT (leer) - Usuarios pueden ver sus recetas
CREATE POLICY "Usuarios pueden ver sus recetas" ON recetas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.usuario_id = auth.uid() AND u.cliente_id = recetas.cliente_id
        )
    );

-- Política para INSERT (insertar) - Usuarios pueden insertar sus recetas
CREATE POLICY "Usuarios pueden insertar sus recetas" ON recetas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.usuario_id = auth.uid() AND u.cliente_id = recetas.cliente_id
        )
    );

-- Política para UPDATE (actualizar) - Solo admin puede modificar sus recetas
CREATE POLICY "Solo admin puede modificar sus recetas" ON recetas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.usuario_id = auth.uid() AND u.cliente_id = recetas.cliente_id
        ) AND usuario_id = auth.uid()
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.usuario_id = auth.uid() AND u.cliente_id = recetas.cliente_id
        ) AND usuario_id = auth.uid()
    );

-- Política para DELETE (eliminar) - Solo admin puede eliminar sus recetas
CREATE POLICY "Solo admin puede eliminar sus recetas" ON recetas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.usuario_id = auth.uid() AND u.cliente_id = recetas.cliente_id
        ) AND usuario_id = auth.uid()
    );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_recetas_updated_at 
    BEFORE UPDATE ON recetas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentar la tabla
COMMENT ON TABLE recetas IS 'Tabla para almacenar recetas de productos con sus ingredientes';
COMMENT ON COLUMN recetas.nombre_producto IS 'Nombre del producto que se va a producir';
COMMENT ON COLUMN recetas.cantidad_deseada IS 'Cantidad deseada a producir';
COMMENT ON COLUMN recetas.cantidad_base IS 'Cantidad base de la receta (por cuántas unidades)';
COMMENT ON COLUMN recetas.ingredientes IS 'Array JSON con los ingredientes: [{nombre, unidad, cantidad}]';
COMMENT ON COLUMN recetas.fecha_cl IS 'Fecha de creación de la receta';
COMMENT ON COLUMN recetas.usuario_id IS 'ID del usuario que creó la receta (UUID)';
COMMENT ON COLUMN recetas.cliente_id IS 'ID del cliente asociado a la receta (UUID)';
