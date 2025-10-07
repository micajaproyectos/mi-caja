-- Vista para calcular distribución de tipos de pago mensual para ventas rápidas
-- Esta vista agrupa las ventas rápidas por cliente, año, mes y tipo de pago,
-- calculando la cantidad de transacciones y el porcentaje del mes.
-- Utiliza la tabla 'venta_rapida' como fuente de datos.

CREATE OR REPLACE VIEW public.venta_rapida_tipo_pago_mensual AS
WITH vrtpm AS (
  SELECT
    vr.cliente_id,
    EXTRACT(YEAR FROM vr.fecha_cl)::numeric  AS anio,
    EXTRACT(MONTH FROM vr.fecha_cl)::numeric AS mes_num,
    vr.tipo_pago,
    COUNT(*)::numeric                        AS cantidad,
    SUM(vr.monto)::numeric                   AS total_monto
  FROM public.venta_rapida vr
  WHERE vr.fecha_cl IS NOT NULL
    AND vr.monto IS NOT NULL
    AND vr.tipo_pago IS NOT NULL
    AND vr.cliente_id IS NOT NULL
  GROUP BY vr.cliente_id, anio, mes_num, vr.tipo_pago
),
totales_mes AS (
  SELECT
    cliente_id,
    anio,
    mes_num,
    SUM(cantidad) AS total_transacciones_mes
  FROM vrtpm
  GROUP BY cliente_id, anio, mes_num
)
SELECT
  vrtpm.cliente_id,
  vrtpm.anio,
  vrtpm.mes_num,
  vrtpm.tipo_pago,
  vrtpm.cantidad,
  vrtpm.total_monto,
  CASE 
    WHEN tm.total_transacciones_mes > 0 
    THEN (vrtpm.cantidad::numeric / tm.total_transacciones_mes::numeric)
    ELSE 0
  END AS porcentaje_mes
FROM vrtpm
INNER JOIN totales_mes tm ON (
  vrtpm.cliente_id = tm.cliente_id
  AND vrtpm.anio = tm.anio
  AND vrtpm.mes_num = tm.mes_num
);

-- Comentarios para la vista
COMMENT ON VIEW public.venta_rapida_tipo_pago_mensual IS 'Vista para calcular la distribución de tipos de pago mensual para ventas rápidas por cliente, año y mes.';
COMMENT ON COLUMN public.venta_rapida_tipo_pago_mensual.cliente_id IS 'ID del cliente asociado a la venta rápida.';
COMMENT ON COLUMN public.venta_rapida_tipo_pago_mensual.anio IS 'Año de la venta rápida.';
COMMENT ON COLUMN public.venta_rapida_tipo_pago_mensual.mes_num IS 'Número del mes de la venta rápida (1-12).';
COMMENT ON COLUMN public.venta_rapida_tipo_pago_mensual.tipo_pago IS 'Tipo de pago utilizado (efectivo, debito, credito, transferencia).';
COMMENT ON COLUMN public.venta_rapida_tipo_pago_mensual.cantidad IS 'Cantidad de transacciones para este tipo de pago en el mes.';
COMMENT ON COLUMN public.venta_rapida_tipo_pago_mensual.total_monto IS 'Monto total para este tipo de pago en el mes.';
COMMENT ON COLUMN public.venta_rapida_tipo_pago_mensual.porcentaje_mes IS 'Porcentaje que representa este tipo de pago del total de transacciones del mes (valor decimal entre 0 y 1).';
