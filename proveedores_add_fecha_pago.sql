-- Script para agregar el campo fecha_pago a la tabla proveedores existente
-- Ejecutar este script en el SQL Editor de Supabase si la tabla ya existe

-- Agregar el campo fecha_pago a la tabla existente
ALTER TABLE proveedores 
ADD COLUMN IF NOT EXISTS fecha_pago DATE NULL;

-- Comentario sobre el nuevo campo
COMMENT ON COLUMN proveedores.fecha_pago IS 'Fecha en que se realizó el pago al proveedor';

-- Actualizar registros existentes que estén marcados como pagados pero no tengan fecha_pago
-- (opcional: esto asigna la fecha de creación como fecha de pago para registros pagados existentes)
UPDATE proveedores 
SET fecha_pago = created_at::DATE 
WHERE estado = 'Pagado' AND fecha_pago IS NULL;

-- Verificar que el campo se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'proveedores' AND column_name = 'fecha_pago'; 