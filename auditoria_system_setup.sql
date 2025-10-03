-- ============================================================================
-- SISTEMA DE AUDITORÍA PARA MI CAJA
-- ============================================================================
-- Este script crea una tabla de auditoría y triggers automáticos para registrar
-- todas las operaciones de UPDATE y DELETE en las tablas:
-- - ventas (RegistroVenta)
-- - venta_rapida (VentaRapida)
-- - inventario (RegistroInventario)
-- - clientes (Clientes)
-- - gasto (FormularioGastos)
-- - pedidos (Pedidos)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREAR TABLA DE AUDITORÍA
-- ----------------------------------------------------------------------------
-- Esta tabla almacenará todos los registros de auditoría
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de la acción
    tabla_nombre TEXT NOT NULL,                    -- Nombre de la tabla afectada
    accion TEXT NOT NULL CHECK (accion IN ('UPDATE', 'DELETE')), -- Tipo de operación
    
    -- Información del usuario
    usuario_id UUID NOT NULL,                      -- Usuario que realizó la acción
    cliente_id UUID,                               -- Cliente asociado al usuario
    
    -- Datos del registro afectado
    registro_id UUID,                              -- ID del registro modificado/eliminado (si aplica)
    registro_id_numerico BIGINT,                   -- ID numérico (para tablas que usan bigint)
    
    -- Datos antes y después de la modificación
    datos_anteriores JSONB,                        -- Estado anterior del registro (para UPDATE y DELETE)
    datos_nuevos JSONB,                            -- Estado nuevo del registro (solo para UPDATE)
    
    -- Información adicional
    ip_address INET,                               -- Dirección IP del usuario (opcional)
    user_agent TEXT,                               -- Navegador/dispositivo (opcional)
    
    -- Timestamp
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Fecha y hora de la acción
    
    -- Índices para búsquedas rápidas
    CONSTRAINT fk_usuario FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_nombre ON public.auditoria(tabla_nombre);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON public.auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON public.auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_cliente_id ON public.auditoria(cliente_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_hora ON public.auditoria(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro_id ON public.auditoria(registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro_id_numerico ON public.auditoria(registro_id_numerico);

-- Comentarios para documentación
COMMENT ON TABLE public.auditoria IS 'Tabla de auditoría que registra todas las operaciones de UPDATE y DELETE en tablas críticas';
COMMENT ON COLUMN public.auditoria.tabla_nombre IS 'Nombre de la tabla donde se realizó la operación';
COMMENT ON COLUMN public.auditoria.accion IS 'Tipo de operación: UPDATE o DELETE';
COMMENT ON COLUMN public.auditoria.datos_anteriores IS 'Estado completo del registro antes de la modificación';
COMMENT ON COLUMN public.auditoria.datos_nuevos IS 'Estado completo del registro después de la modificación (solo UPDATE)';

-- ----------------------------------------------------------------------------
-- 2. FUNCIÓN GENÉRICA PARA AUDITORÍA
-- ----------------------------------------------------------------------------
-- Esta función se ejecutará automáticamente en cada UPDATE o DELETE
CREATE OR REPLACE FUNCTION public.fn_auditoria_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
    v_cliente_id UUID;
    v_registro_id UUID;
    v_registro_id_numerico BIGINT;
BEGIN
    -- Obtener el usuario_id de la sesión actual
    v_usuario_id := auth.uid();
    
    -- Determinar el registro_id según el tipo de operación
    IF (TG_OP = 'DELETE') THEN
        -- Para DELETE, usar OLD
        -- Solo obtener cliente_id si la tabla lo tiene
        BEGIN
            v_cliente_id := OLD.cliente_id;
        EXCEPTION WHEN undefined_column THEN
            v_cliente_id := NULL;
        END;
        
        -- Intentar obtener UUID o BIGINT según la tabla
        IF (TG_TABLE_NAME = 'ventas') THEN
            v_registro_id_numerico := OLD.id;
        ELSIF (TG_TABLE_NAME = 'inventario') THEN
            v_registro_id := OLD.id;
        ELSIF (TG_TABLE_NAME = 'venta_rapida') THEN
            v_registro_id := OLD.id;
        ELSIF (TG_TABLE_NAME = 'clientes') THEN
            v_registro_id := OLD.id;
        ELSIF (TG_TABLE_NAME = 'gasto') THEN
            v_registro_id_numerico := OLD.id;
        ELSIF (TG_TABLE_NAME = 'pedidos') THEN
            v_registro_id := OLD.id;
        END IF;
        
        -- Insertar registro de auditoría para DELETE
        INSERT INTO public.auditoria (
            tabla_nombre,
            accion,
            usuario_id,
            cliente_id,
            registro_id,
            registro_id_numerico,
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'DELETE',
            v_usuario_id,
            v_cliente_id,
            v_registro_id,
            v_registro_id_numerico,
            row_to_json(OLD)::JSONB,  -- Guardar todos los datos del registro eliminado
            NULL,                      -- No hay datos nuevos en DELETE
            NOW()
        );
        
        RETURN OLD;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Para UPDATE, usar NEW
        -- Solo obtener cliente_id si la tabla lo tiene
        BEGIN
            v_cliente_id := NEW.cliente_id;
        EXCEPTION WHEN undefined_column THEN
            v_cliente_id := NULL;
        END;
        
        -- Intentar obtener UUID o BIGINT según la tabla
        IF (TG_TABLE_NAME = 'ventas') THEN
            v_registro_id_numerico := NEW.id;
        ELSIF (TG_TABLE_NAME = 'inventario') THEN
            v_registro_id := NEW.id;
        ELSIF (TG_TABLE_NAME = 'venta_rapida') THEN
            v_registro_id := NEW.id;
        ELSIF (TG_TABLE_NAME = 'clientes') THEN
            v_registro_id := NEW.id;
        ELSIF (TG_TABLE_NAME = 'gasto') THEN
            v_registro_id_numerico := NEW.id;
        ELSIF (TG_TABLE_NAME = 'pedidos') THEN
            v_registro_id := NEW.id;
        END IF;
        
        -- Insertar registro de auditoría para UPDATE
        INSERT INTO public.auditoria (
            tabla_nombre,
            accion,
            usuario_id,
            cliente_id,
            registro_id,
            registro_id_numerico,
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'UPDATE',
            v_usuario_id,
            v_cliente_id,
            v_registro_id,
            v_registro_id_numerico,
            row_to_json(OLD)::JSONB,  -- Estado anterior
            row_to_json(NEW)::JSONB,  -- Estado nuevo
            NOW()
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.fn_auditoria_trigger() IS 'Función genérica que registra operaciones de UPDATE y DELETE en la tabla de auditoría';

-- ----------------------------------------------------------------------------
-- 3. CREAR TRIGGERS PARA CADA TABLA
-- ----------------------------------------------------------------------------

-- 3.1 TRIGGER para tabla VENTAS (RegistroVenta)
DROP TRIGGER IF EXISTS trigger_auditoria_ventas ON public.ventas;
CREATE TRIGGER trigger_auditoria_ventas
    AFTER UPDATE OR DELETE ON public.ventas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_trigger();

COMMENT ON TRIGGER trigger_auditoria_ventas ON public.ventas IS 'Trigger de auditoría para registrar UPDATE y DELETE en tabla ventas';

-- 3.2 TRIGGER para tabla VENTA_RAPIDA (VentaRapida)
DROP TRIGGER IF EXISTS trigger_auditoria_venta_rapida ON public.venta_rapida;
CREATE TRIGGER trigger_auditoria_venta_rapida
    AFTER UPDATE OR DELETE ON public.venta_rapida
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_trigger();

COMMENT ON TRIGGER trigger_auditoria_venta_rapida ON public.venta_rapida IS 'Trigger de auditoría para registrar UPDATE y DELETE en tabla venta_rapida';

-- 3.3 TRIGGER para tabla INVENTARIO (RegistroInventario)
DROP TRIGGER IF EXISTS trigger_auditoria_inventario ON public.inventario;
CREATE TRIGGER trigger_auditoria_inventario
    AFTER UPDATE OR DELETE ON public.inventario
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_trigger();

COMMENT ON TRIGGER trigger_auditoria_inventario ON public.inventario IS 'Trigger de auditoría para registrar UPDATE y DELETE en tabla inventario';

-- 3.4 TRIGGER para tabla CLIENTES (Clientes)
DROP TRIGGER IF EXISTS trigger_auditoria_clientes ON public.clientes;
CREATE TRIGGER trigger_auditoria_clientes
    AFTER UPDATE OR DELETE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_trigger();

COMMENT ON TRIGGER trigger_auditoria_clientes ON public.clientes IS 'Trigger de auditoría para registrar UPDATE y DELETE en tabla clientes';

-- 3.5 TRIGGER para tabla GASTO (FormularioGastos)
DROP TRIGGER IF EXISTS trigger_auditoria_gasto ON public.gasto;
CREATE TRIGGER trigger_auditoria_gasto
    AFTER UPDATE OR DELETE ON public.gasto
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_trigger();

COMMENT ON TRIGGER trigger_auditoria_gasto ON public.gasto IS 'Trigger de auditoría para registrar UPDATE y DELETE en tabla gasto';

-- 3.6 TRIGGER para tabla PEDIDOS (Pedidos)
DROP TRIGGER IF EXISTS trigger_auditoria_pedidos ON public.pedidos;
CREATE TRIGGER trigger_auditoria_pedidos
    AFTER UPDATE OR DELETE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_trigger();

COMMENT ON TRIGGER trigger_auditoria_pedidos ON public.pedidos IS 'Trigger de auditoría para registrar UPDATE y DELETE en tabla pedidos';

-- ----------------------------------------------------------------------------
-- 4. HABILITAR ROW LEVEL SECURITY (RLS) PARA LA TABLA DE AUDITORÍA
-- ----------------------------------------------------------------------------
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios pueden ver su propia auditoria" ON public.auditoria;
DROP POLICY IF EXISTS "Admin puede ver toda la auditoria" ON public.auditoria;
DROP POLICY IF EXISTS "Solo triggers pueden insertar en auditoria" ON public.auditoria;
DROP POLICY IF EXISTS "Nadie puede actualizar registros de auditoria" ON public.auditoria;
DROP POLICY IF EXISTS "Nadie puede eliminar registros de auditoria" ON public.auditoria;

-- Política para SELECT: Los usuarios pueden ver solo sus propios registros de auditoría
CREATE POLICY "Usuarios pueden ver su propia auditoria" ON public.auditoria
    FOR SELECT
    USING (auth.uid() = usuario_id);

-- Política para SELECT (Admins): Los admins pueden ver todos los registros
CREATE POLICY "Admin puede ver toda la auditoria" ON public.auditoria
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.usuario_id = auth.uid()
            AND usuarios.rol = 'admin'
        )
    );

-- NO permitir INSERT, UPDATE o DELETE manual desde la aplicación
-- Solo los triggers pueden insertar datos
CREATE POLICY "Solo triggers pueden insertar en auditoria" ON public.auditoria
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Nadie puede actualizar registros de auditoria" ON public.auditoria
    FOR UPDATE
    USING (false);

CREATE POLICY "Nadie puede eliminar registros de auditoria" ON public.auditoria
    FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- 5. VISTA PARA CONSULTAR AUDITORÍA CON INFORMACIÓN LEGIBLE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.auditoria_detallada AS
SELECT 
    a.id,
    a.tabla_nombre,
    a.accion,
    a.fecha_hora,
    
    -- Información del usuario
    a.usuario_id,
    u.nombre as usuario_nombre,
    u.email as usuario_email,
    
    -- Información del cliente
    a.cliente_id,
    
    -- IDs del registro afectado
    a.registro_id,
    a.registro_id_numerico,
    
    -- Datos del registro
    a.datos_anteriores,
    a.datos_nuevos,
    
    -- Calcular diferencias (solo para UPDATE)
    CASE 
        WHEN a.accion = 'UPDATE' THEN
            -- Mostrar solo los campos que cambiaron
            (SELECT jsonb_object_agg(key, value)
             FROM jsonb_each(a.datos_nuevos)
             WHERE value IS DISTINCT FROM a.datos_anteriores->key)
        ELSE NULL
    END as campos_modificados,
    
    -- Información adicional
    a.ip_address,
    a.user_agent
    
FROM public.auditoria a
LEFT JOIN public.usuarios u ON u.usuario_id = a.usuario_id
ORDER BY a.fecha_hora DESC;

COMMENT ON VIEW public.auditoria_detallada IS 'Vista que muestra los registros de auditoría con información del usuario y solo los campos modificados';

-- Habilitar RLS en la vista
ALTER VIEW public.auditoria_detallada SET (security_invoker = true);

-- ----------------------------------------------------------------------------
-- 6. FUNCIÓN AUXILIAR PARA CONSULTAR AUDITORÍA DE UN REGISTRO ESPECÍFICO
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_obtener_historial_auditoria(
    p_tabla_nombre TEXT,
    p_registro_id UUID DEFAULT NULL,
    p_registro_id_numerico BIGINT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    accion TEXT,
    fecha_hora TIMESTAMPTZ,
    usuario_nombre TEXT,
    usuario_email TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    campos_modificados JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.accion,
        a.fecha_hora,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        a.datos_anteriores,
        a.datos_nuevos,
        CASE 
            WHEN a.accion = 'UPDATE' THEN
                (SELECT jsonb_object_agg(key, value)
                 FROM jsonb_each(a.datos_nuevos)
                 WHERE value IS DISTINCT FROM a.datos_anteriores->key)
            ELSE NULL
        END as campos_modificados
    FROM public.auditoria a
    LEFT JOIN public.usuarios u ON u.usuario_id = a.usuario_id
    WHERE a.tabla_nombre = p_tabla_nombre
    AND (
        (p_registro_id IS NOT NULL AND a.registro_id = p_registro_id)
        OR
        (p_registro_id_numerico IS NOT NULL AND a.registro_id_numerico = p_registro_id_numerico)
    )
    ORDER BY a.fecha_hora DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.fn_obtener_historial_auditoria IS 'Función para obtener el historial completo de auditoría de un registro específico';

-- ----------------------------------------------------------------------------
-- 7. EJEMPLOS DE CONSULTAS ÚTILES
-- ----------------------------------------------------------------------------

-- Ejemplo 1: Ver todos los registros de auditoría (para el usuario actual)
-- SELECT * FROM public.auditoria_detallada;

-- Ejemplo 2: Ver auditoría de una tabla específica
-- SELECT * FROM public.auditoria_detallada WHERE tabla_nombre = 'ventas';

-- Ejemplo 3: Ver todas las eliminaciones
-- SELECT * FROM public.auditoria_detallada WHERE accion = 'DELETE';

-- Ejemplo 4: Ver auditoría de los últimos 7 días
-- SELECT * FROM public.auditoria_detallada WHERE fecha_hora >= NOW() - INTERVAL '7 days';

-- Ejemplo 5: Ver historial de un registro específico de ventas
-- SELECT * FROM public.fn_obtener_historial_auditoria('ventas', NULL, 12345);

-- Ejemplo 6: Ver historial de un registro específico de inventario
-- SELECT * FROM public.fn_obtener_historial_auditoria('inventario', 'uuid-del-registro', NULL);

-- Ejemplo 7: Ver historial de un registro específico de clientes
-- SELECT * FROM public.fn_obtener_historial_auditoria('clientes', 'uuid-del-registro', NULL);

-- Ejemplo 8: Ver historial de un registro específico de gasto
-- SELECT * FROM public.fn_obtener_historial_auditoria('gasto', 'uuid-del-registro', NULL);

-- Ejemplo 9: Ver historial de un registro específico de pedidos
-- SELECT * FROM public.fn_obtener_historial_auditoria('pedidos', 'uuid-del-registro', NULL);

-- Ejemplo 10: Contar operaciones por tabla
-- SELECT tabla_nombre, accion, COUNT(*) as total
-- FROM public.auditoria
-- WHERE usuario_id = auth.uid()
-- GROUP BY tabla_nombre, accion
-- ORDER BY tabla_nombre, accion;

-- Ejemplo 11: Ver qué campos se modificaron en una actualización específica
-- SELECT 
--     fecha_hora,
--     usuario_nombre,
--     campos_modificados
-- FROM public.auditoria_detallada
-- WHERE tabla_nombre = 'venta_rapida'
-- AND accion = 'UPDATE'
-- ORDER BY fecha_hora DESC;

-- ----------------------------------------------------------------------------
-- FIN DEL SCRIPT
-- ----------------------------------------------------------------------------

-- Verificación final
SELECT 
    'Tabla de auditoría creada: ' || COUNT(*) as resultado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'auditoria';

SELECT 
    'Triggers creados: ' || COUNT(*) as resultado
FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_auditoria_%';

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de auditoría instalado correctamente';
    RAISE NOTICE '📋 Tablas monitoreadas: ventas, venta_rapida, inventario, clientes, gasto, pedidos';
    RAISE NOTICE '🔍 Acciones registradas: UPDATE, DELETE';
    RAISE NOTICE '📊 Vista disponible: auditoria_detallada';
    RAISE NOTICE '🔒 RLS habilitado para protección de datos';
END $$;

