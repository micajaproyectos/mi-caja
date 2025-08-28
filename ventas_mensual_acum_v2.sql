-- Vista para calcular ventas acumuladas mensuales por cliente
-- Esta vista agrupa las ventas por cliente, año y mes, calculando el total acumulado

CREATE OR REPLACE VIEW public.ventas_mensual_acum_v2 AS
WITH vpm AS (
  SELECT 
    v.cliente_id,
    EXTRACT(YEAR FROM v.fecha_cl)::numeric  AS anio,
    EXTRACT(MONTH FROM v.fecha_cl)::numeric AS mes_num,
    SUM(v.total_final)::numeric             AS total_mes
  FROM public.ventas v
  WHERE v.fecha_cl IS NOT NULL
    AND v.total_final IS NOT NULL
    AND v.cliente_id IS NOT NULL
  GROUP BY v.cliente_id, anio, mes_num
)
SELECT
  vpm.cliente_id,
  vpm.anio,
  vpm.mes_num,
  vpm.total_mes,
  SUM(vpm.total_mes) OVER (
    PARTITION BY vpm.cliente_id, vpm.anio
    ORDER BY vpm.mes_num
    ROWS UNBOUNDED PRECEDING
  )::numeric AS total_acumulado
FROM vpm;
