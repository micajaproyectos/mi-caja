-- Script para auto-completar cliente_id en la tabla venta_rapida
-- Este trigger obtiene el cliente_id automáticamente del usuario_id
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear función que auto-completa el cliente_id basándose en el usuario_id
CREATE OR REPLACE FUNCTION auto_completar_cliente_id_venta_rapida()
RETURNS TRIGGER AS $$
BEGIN
    -- Si cliente_id es NULL, obtenerlo de la tabla usuarios usando el usuario_id
    IF NEW.cliente_id IS NULL THEN
        SELECT cliente_id INTO NEW.cliente_id
        FROM usuarios
        WHERE usuario_id = NEW.usuario_id;
        
        -- Si no se encontró el cliente_id, lanzar un error
        IF NEW.cliente_id IS NULL THEN
            RAISE EXCEPTION 'No se encontró cliente_id para el usuario_id: %', NEW.usuario_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger que se ejecuta BEFORE INSERT o UPDATE
DROP TRIGGER IF EXISTS trigger_auto_cliente_id_venta_rapida ON public.venta_rapida;
CREATE TRIGGER trigger_auto_cliente_id_venta_rapida
    BEFORE INSERT OR UPDATE ON public.venta_rapida
    FOR EACH ROW
    EXECUTE FUNCTION auto_completar_cliente_id_venta_rapida();

-- 3. (Opcional) Actualizar registros existentes que tengan cliente_id NULL
-- Descomenta las siguientes líneas si necesitas actualizar registros existentes:

/*
UPDATE public.venta_rapida vr
SET cliente_id = u.cliente_id
FROM usuarios u
WHERE vr.usuario_id = u.usuario_id
  AND vr.cliente_id IS NULL;
*/

-- 4. Verificar que el trigger funciona correctamente
-- Puedes probar insertando un registro de prueba:

/*
-- Obtén tu usuario_id primero:
SELECT usuario_id FROM usuarios WHERE usuario_id = auth.uid();

-- Luego inserta una venta de prueba (reemplaza 'tu-usuario-id-aqui'):
INSERT INTO venta_rapida (fecha_cl, monto, tipo_pago, usuario_id)
VALUES (CURRENT_DATE, 1000, 'efectivo', 'tu-usuario-id-aqui');

-- Verifica que el cliente_id se completó automáticamente:
SELECT id, fecha_cl, monto, usuario_id, cliente_id
FROM venta_rapida
ORDER BY id DESC
LIMIT 1;
*/

-- 5. Comentario de documentación
COMMENT ON FUNCTION auto_completar_cliente_id_venta_rapida() IS 
'Función trigger que auto-completa el cliente_id en venta_rapida basándose en el usuario_id de la tabla usuarios';

