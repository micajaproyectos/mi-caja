-- Vista para calcular ventas rápidas acumuladas mensuales por cliente
-- Esta vista agrupa las ventas rápidas por cliente, año y mes, calculando el total acumulado
-- Basada en la estructura de ventas_mensual_acum_v2 pero adaptada para venta_rapida

CREATE OR REPLACE VIEW public.venta_rapida_mensual_acum_v2 AS
WITH vrm AS (
  SELECT 
    vr.cliente_id,
    EXTRACT(YEAR FROM vr.fecha_cl)::numeric  AS anio,
    EXTRACT(MONTH FROM vr.fecha_cl)::numeric AS mes_num,
    SUM(vr.monto)::numeric                   AS total_mes
  FROM public.venta_rapida vr
  WHERE vr.fecha_cl IS NOT NULL
    AND vr.monto IS NOT NULL
    AND vr.cliente_id IS NOT NULL
  GROUP BY vr.cliente_id, anio, mes_num
)
SELECT
  vrm.cliente_id,
  vrm.anio,
  vrm.mes_num,
  vrm.total_mes,
  SUM(vrm.total_mes) OVER (
    PARTITION BY vrm.cliente_id, vrm.anio
    ORDER BY vrm.mes_num
    ROWS UNBOUNDED PRECEDING
  )::numeric AS total_acumulado
FROM vrm;

-- Comentarios para documentación
COMMENT ON VIEW public.venta_rapida_mensual_acum_v2 IS 
'Vista que calcula totales mensuales y acumulados de ventas rápidas por cliente y año. 
Utilizada para generar gráficos de seguimiento mensual de ventas rápidas.';

COMMENT ON COLUMN public.venta_rapida_mensual_acum_v2.cliente_id IS 
'ID del cliente (heredado del usuario a través de la tabla usuarios)';

COMMENT ON COLUMN public.venta_rapida_mensual_acum_v2.anio IS 
'Año extraído de fecha_cl (formato numérico, ej: 2024)';

COMMENT ON COLUMN public.venta_rapida_mensual_acum_v2.mes_num IS 
'Número del mes extraído de fecha_cl (1-12)';

COMMENT ON COLUMN public.venta_rapida_mensual_acum_v2.total_mes IS 
'Suma total de montos de ventas rápidas para el mes específico';

COMMENT ON COLUMN public.venta_rapida_mensual_acum_v2.total_acumulado IS 
'Suma acumulativa de total_mes desde enero hasta el mes actual del año';

-- Verificar que se creó correctamente
SELECT 
    'Vista venta_rapida_mensual_acum_v2 creada: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ' 
        ELSE 'NO' 
    END as resultado
FROM information_schema.views 
WHERE table_name = 'venta_rapida_mensual_acum_v2';

-- Consulta de prueba para verificar estructura
SELECT 
    cliente_id,
    anio,
    mes_num,
    total_mes,
    total_acumulado
FROM public.venta_rapida_mensual_acum_v2
WHERE anio = 2024
ORDER BY cliente_id, anio, mes_num
LIMIT 10;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Vista venta_rapida_mensual_acum_v2 creada exitosamente';
    RAISE NOTICE '🔧 Campos disponibles: cliente_id, anio, mes_num, total_mes, total_acumulado';
    RAISE NOTICE '📊 Lista para generar gráficos mensuales de ventas rápidas';
    RAISE NOTICE '🎯 Usar en componente Seguimiento con: .from("venta_rapida_mensual_acum_v2")';
END $$;
