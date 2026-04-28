-- ============================================
-- Script para crear la tabla 'caja_diaria' en Supabase
-- Almacena el monto de caja inicial por usuario por día
-- Permite edición y eliminación desde el frontend
-- ============================================

-- 1. Crear la tabla caja_diaria
CREATE TABLE IF NOT EXISTS public.caja_diaria (
    id            BIGSERIAL PRIMARY KEY,
    usuario_id    UUID    DEFAULT auth.uid() NOT NULL,
    cliente_id    UUID,
    fecha         DATE    NOT NULL,
    monto         NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Restricción: un solo registro por usuario por día
    CONSTRAINT uq_caja_diaria_usuario_fecha UNIQUE (usuario_id, fecha)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_caja_diaria_usuario       ON public.caja_diaria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_fecha         ON public.caja_diaria(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_usuario_fecha ON public.caja_diaria(usuario_id, fecha DESC);

-- 3. Habilitar Row Level Security
ALTER TABLE public.caja_diaria ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS (mismo patrón que cierre_caja)
CREATE POLICY "usuarios_pueden_ver_su_caja_diaria"
    ON public.caja_diaria
    FOR SELECT
    USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_insertar_su_caja_diaria"
    ON public.caja_diaria
    FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_actualizar_su_caja_diaria"
    ON public.caja_diaria
    FOR UPDATE
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_eliminar_su_caja_diaria"
    ON public.caja_diaria
    FOR DELETE
    USING (auth.uid() = usuario_id);

-- 5. Trigger para updated_at
--    Reutiliza la función update_updated_at_column() que ya existe en la BD
--    (creada por cierre_caja_table_setup.sql y otros).
--    Si por alguna razón no existiera, se crea aquí también.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_caja_diaria_updated_at ON public.caja_diaria;
CREATE TRIGGER update_caja_diaria_updated_at
    BEFORE UPDATE ON public.caja_diaria
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Comentarios
COMMENT ON TABLE  public.caja_diaria              IS 'Monto de caja inicial por usuario por día';
COMMENT ON COLUMN public.caja_diaria.usuario_id   IS 'Usuario dueño del registro';
COMMENT ON COLUMN public.caja_diaria.cliente_id   IS 'Cliente al que pertenece el usuario (multi-tenant)';
COMMENT ON COLUMN public.caja_diaria.fecha        IS 'Fecha del día (YYYY-MM-DD)';
COMMENT ON COLUMN public.caja_diaria.monto        IS 'Monto de caja inicial en pesos (hasta 2 decimales)';

-- 7. Verificar estructura creada
SELECT
    column_name        AS columna,
    data_type          AS tipo,
    is_nullable        AS nullable,
    column_default     AS default
FROM information_schema.columns
WHERE table_name   = 'caja_diaria'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Verificar políticas RLS creadas
SELECT
    policyname   AS politica,
    cmd          AS operacion,
    qual         AS using,
    with_check
FROM pg_policies
WHERE tablename = 'caja_diaria';
