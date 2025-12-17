-- Vista para mostrar sumatoria diaria de ventas del mes actual
-- Esta vista agrupa las ventas por usuario_id, mostrando el total diario
-- Solo muestra datos del mes actual (se actualiza automáticamente cada mes)

CREATE OR REPLACE VIEW public.ventas_diarias AS
SELECT 
  v.usuario_id,
  DATE(v.fecha_cl) AS fecha,
  EXTRACT(YEAR FROM v.fecha_cl)::numeric AS anio,
  EXTRACT(MONTH FROM v.fecha_cl)::numeric AS mes_num,
  EXTRACT(DAY FROM v.fecha_cl)::numeric AS dia,
  SUM(v.total_final)::numeric AS total_dia
FROM public.ventas v
WHERE v.fecha_cl IS NOT NULL
  AND v.total_final IS NOT NULL
  AND v.usuario_id IS NOT NULL
  -- Filtrar solo el mes actual
  AND EXTRACT(YEAR FROM v.fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM v.fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY v.usuario_id, DATE(v.fecha_cl), anio, mes_num, dia
ORDER BY v.usuario_id, DATE(v.fecha_cl);

-- Comentarios para documentación
COMMENT ON VIEW public.ventas_diarias IS 
'Vista que muestra la sumatoria diaria de ventas del mes actual por usuario.
Se actualiza automáticamente cada mes para mostrar solo los datos del mes en curso.
Utilizada para visualización de ventas diarias.';

COMMENT ON COLUMN public.ventas_diarias.usuario_id IS 
'ID del usuario que registró la venta';

COMMENT ON COLUMN public.ventas_diarias.fecha IS 
'Fecha completa de la venta (YYYY-MM-DD)';

COMMENT ON COLUMN public.ventas_diarias.anio IS 
'Año extraído de fecha_cl (formato numérico, ej: 2024)';

COMMENT ON COLUMN public.ventas_diarias.mes_num IS 
'Número del mes extraído de fecha_cl (1-12)';

COMMENT ON COLUMN public.ventas_diarias.dia IS 
'Día del mes extraído de fecha_cl (1-31)';

COMMENT ON COLUMN public.ventas_diarias.total_dia IS 
'Suma total de ventas para el día específico';

-- Verificar que se creó correctamente
SELECT 
    'Vista ventas_diarias creada: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ'
        ELSE 'NO' 
    END as resultado
FROM information_schema.views 
WHERE table_name = 'ventas_diarias';

-- Consulta de prueba para verificar estructura y datos
SELECT 
    usuario_id,
    fecha,
    anio,
    mes_num,
    dia,
    total_dia
FROM public.ventas_diarias
ORDER BY usuario_id, fecha
LIMIT 20;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Vista ventas_diarias creada exitosamente';
    RAISE NOTICE '📅 Campos disponibles: usuario_id, fecha, anio, mes_num, dia, total_dia';
    RAISE NOTICE '📊 Muestra solo ventas del mes actual';
    RAISE NOTICE '🔄 Se actualiza automáticamente cada mes';
    RAISE NOTICE '🎯 Usar en componente con: .from("ventas_diarias")';
END $$;

