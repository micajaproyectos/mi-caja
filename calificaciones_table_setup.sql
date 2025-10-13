-- Script para crear la tabla 'calificaciones' en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla calificaciones si no existe
CREATE TABLE IF NOT EXISTS public.calificaciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL,
    cliente_id UUID NOT NULL,
    estrellas INTEGER NOT NULL CHECK (estrellas >= 1 AND estrellas <= 5),
    comentarios TEXT NULL,
    nombre_usuario TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_calificaciones_usuario_id ON public.calificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_cliente_id ON public.calificaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_estrellas ON public.calificaciones(estrellas);
CREATE INDEX IF NOT EXISTS idx_calificaciones_created_at ON public.calificaciones(created_at);

-- 3. Crear índice único para evitar calificaciones duplicadas del mismo usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_calificaciones_usuario_unico ON public.calificaciones(usuario_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de seguridad
-- Política para SELECT (leer) - Permitir lectura pública de calificaciones
CREATE POLICY "Permitir lectura pública de calificaciones" ON public.calificaciones
    FOR SELECT USING (true);

-- Política para INSERT (insertar) - Solo usuarios autenticados pueden calificar
CREATE POLICY "Permitir inserción de calificaciones por usuarios autenticados" ON public.calificaciones
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Política para UPDATE (actualizar) - Solo el mismo usuario puede actualizar su calificación
CREATE POLICY "Permitir actualización de calificaciones propias" ON public.calificaciones
    FOR UPDATE USING (auth.uid() = usuario_id);

-- Política para DELETE (eliminar) - Solo el mismo usuario puede eliminar su calificación
CREATE POLICY "Permitir eliminación de calificaciones propias" ON public.calificaciones
    FOR DELETE USING (auth.uid() = usuario_id);

-- 6. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_calificaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Crear trigger para actualizar updated_at
CREATE TRIGGER update_calificaciones_updated_at 
    BEFORE UPDATE ON public.calificaciones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_calificaciones_updated_at();

-- 8. Crear función para obtener estadísticas de calificaciones
CREATE OR REPLACE FUNCTION get_calificaciones_stats()
RETURNS TABLE (
    promedio_estrellas NUMERIC(3,2),
    total_calificaciones BIGINT,
    distribucion_estrellas JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(estrellas)::NUMERIC, 2) as promedio_estrellas,
        COUNT(*) as total_calificaciones,
        jsonb_build_object(
            '1_estrella', COUNT(*) FILTER (WHERE estrellas = 1),
            '2_estrellas', COUNT(*) FILTER (WHERE estrellas = 2),
            '3_estrellas', COUNT(*) FILTER (WHERE estrellas = 3),
            '4_estrellas', COUNT(*) FILTER (WHERE estrellas = 4),
            '5_estrellas', COUNT(*) FILTER (WHERE estrellas = 5)
        ) as distribucion_estrellas
    FROM public.calificaciones;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Crear función para verificar si un usuario ya calificó
CREATE OR REPLACE FUNCTION usuario_ya_califico(p_usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.calificaciones 
        WHERE usuario_id = p_usuario_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Insertar datos de prueba (opcional - comentar en producción)
-- INSERT INTO public.calificaciones (usuario_id, cliente_id, estrellas, comentarios, nombre_usuario) VALUES
-- ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5, 'Excelente aplicación, muy fácil de usar', 'Usuario Prueba 1'),
-- ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 4, 'Muy buena, pero le faltan algunas funciones', 'Usuario Prueba 2'),
-- ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 5, 'Perfecta para mi negocio', 'Usuario Prueba 3');

-- 11. Comentarios útiles para debugging
-- Ver todas las calificaciones:
-- SELECT * FROM public.calificaciones ORDER BY created_at DESC;

-- Ver estadísticas de calificaciones:
-- SELECT * FROM get_calificaciones_stats();

-- Verificar si un usuario específico ya calificó:
-- SELECT usuario_ya_califico('usuario-id-aqui');

-- Ver estructura de la tabla:
-- \d public.calificaciones

-- Ver políticas RLS:
-- SELECT * FROM pg_policies WHERE tablename = 'calificaciones';
