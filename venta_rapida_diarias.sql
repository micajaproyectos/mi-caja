-- Vista para mostrar sumatoria diaria de ventas rápidas del mes actual
-- Esta vista agrupa las ventas rápidas por usuario_id, mostrando el total diario
-- Solo muestra datos del mes actual (se actualiza automáticamente cada mes)
-- SECURITY INVOKER: La vista ejecuta con permisos del usuario que la consulta (más seguro)

CREATE OR REPLACE VIEW public.venta_rapida_diarias
WITH (security_invoker = true)
AS
SELECT 
  vr.usuario_id,
  DATE(vr.fecha_cl) AS fecha,
  EXTRACT(YEAR FROM vr.fecha_cl)::numeric AS anio,
  EXTRACT(MONTH FROM vr.fecha_cl)::numeric AS mes_num,
  EXTRACT(DAY FROM vr.fecha_cl)::numeric AS dia,
  SUM(vr.monto)::numeric AS total_dia
FROM public.venta_rapida vr
WHERE vr.fecha_cl IS NOT NULL
  AND vr.monto IS NOT NULL
  AND vr.usuario_id IS NOT NULL
  -- Filtrar solo el mes actual
  AND EXTRACT(YEAR FROM vr.fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM vr.fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY vr.usuario_id, DATE(vr.fecha_cl), anio, mes_num, dia
ORDER BY vr.usuario_id, DATE(vr.fecha_cl);

-- Comentarios para documentación
COMMENT ON VIEW public.venta_rapida_diarias IS 
'Vista que muestra la sumatoria diaria de ventas rápidas del mes actual por usuario.
Se actualiza automáticamente cada mes para mostrar solo los datos del mes en curso.
Utilizada para visualización de ventas rápidas diarias.';

COMMENT ON COLUMN public.venta_rapida_diarias.usuario_id IS 
'ID del usuario que registró la venta rápida';

COMMENT ON COLUMN public.venta_rapida_diarias.fecha IS 
'Fecha completa de la venta rápida (YYYY-MM-DD)';

COMMENT ON COLUMN public.venta_rapida_diarias.anio IS 
'Año extraído de fecha_cl (formato numérico, ej: 2024)';

COMMENT ON COLUMN public.venta_rapida_diarias.mes_num IS 
'Número del mes extraído de fecha_cl (1-12)';

COMMENT ON COLUMN public.venta_rapida_diarias.dia IS 
'Día del mes extraído de fecha_cl (1-31)';

COMMENT ON COLUMN public.venta_rapida_diarias.total_dia IS 
'Suma total de ventas rápidas para el día específico';

-- Verificar que se creó correctamente
SELECT 
    'Vista venta_rapida_diarias creada: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ'
        ELSE 'NO' 
    END as resultado
FROM information_schema.views 
WHERE table_name = 'venta_rapida_diarias';

-- Consulta de prueba para verificar estructura y datos
SELECT 
    usuario_id,
    fecha,
    anio,
    mes_num,
    dia,
    total_dia
FROM public.venta_rapida_diarias
ORDER BY usuario_id, fecha
LIMIT 20;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Vista venta_rapida_diarias creada exitosamente';
    RAISE NOTICE '📅 Campos disponibles: usuario_id, fecha, anio, mes_num, dia, total_dia';
    RAISE NOTICE '📊 Muestra solo ventas rápidas del mes actual';
    RAISE NOTICE '🔄 Se actualiza automáticamente cada mes';
    RAISE NOTICE '🎯 Usar en componente con: .from("venta_rapida_diarias")';
END $$;

