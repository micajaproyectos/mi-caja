-- Vista para mostrar sumatoria diaria de pedidos del mes actual
-- Esta vista agrupa los pedidos por usuario_id y día, mostrando el total diario
-- Solo muestra datos del mes actual (se actualiza automáticamente cada mes)
-- Usa SOLO total_final (no usa total como fallback)
-- SECURITY INVOKER: La vista ejecuta con permisos del usuario que la consulta (más seguro)

CREATE OR REPLACE VIEW public.pedidos_diarias
WITH (security_invoker = true)
AS
WITH dias_mes AS (
  -- Generar todos los días del mes actual hasta el día de hoy
  SELECT 
    generate_series(
      DATE_TRUNC('month', CURRENT_DATE),
      CURRENT_DATE,
      '1 day'::interval
    )::DATE AS fecha
),
usuarios_mes AS (
  -- Obtener usuarios únicos que tienen pedidos en el mes actual
  SELECT DISTINCT p.usuario_id
  FROM public.pedidos p
  WHERE p.fecha_cl IS NOT NULL
    AND p.usuario_id IS NOT NULL
    AND p.total_final IS NOT NULL
    AND EXTRACT(YEAR FROM p.fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM p.fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND (p.estado IS NULL OR p.estado != 'anulado')
),
dias_usuarios AS (
  -- Combinar todos los días con todos los usuarios
  SELECT 
    um.usuario_id,
    dm.fecha
  FROM usuarios_mes um
  CROSS JOIN dias_mes dm
),
pedidos_agrupados AS (
  -- Agrupar pedidos por usuario y día
  SELECT 
    p.usuario_id,
    DATE(p.fecha_cl) AS fecha,
    SUM(p.total_final)::numeric AS total_dia
  FROM public.pedidos p
  WHERE p.fecha_cl IS NOT NULL
    AND p.usuario_id IS NOT NULL
    AND p.total_final IS NOT NULL
    -- Filtrar solo el mes actual
    AND EXTRACT(YEAR FROM p.fecha_cl) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM p.fecha_cl) = EXTRACT(MONTH FROM CURRENT_DATE)
    -- Excluir pedidos anulados (el campo estado existe)
    AND (p.estado IS NULL OR p.estado != 'anulado')
  GROUP BY p.usuario_id, DATE(p.fecha_cl)
)
SELECT 
  du.usuario_id,
  du.fecha,
  EXTRACT(YEAR FROM du.fecha)::numeric AS anio,
  EXTRACT(MONTH FROM du.fecha)::numeric AS mes_num,
  EXTRACT(DAY FROM du.fecha)::numeric AS dia,
  COALESCE(pa.total_dia, 0)::numeric AS total_dia
FROM dias_usuarios du
LEFT JOIN pedidos_agrupados pa ON du.usuario_id = pa.usuario_id AND du.fecha = pa.fecha
ORDER BY du.usuario_id, du.fecha;

-- Comentarios para documentación
COMMENT ON VIEW public.pedidos_diarias IS 
'Vista que muestra la sumatoria diaria de pedidos del mes actual por usuario.
Se actualiza automáticamente cada mes para mostrar solo los datos del mes en curso.
Utilizada para visualización de pedidos diarios en gráficos.
Usa SOLO total_final (no usa total como fallback).
Excluye pedidos con estado = anulado.';

COMMENT ON COLUMN public.pedidos_diarias.usuario_id IS 
'ID del usuario que registró el pedido';

COMMENT ON COLUMN public.pedidos_diarias.fecha IS 
'Fecha completa del pedido (YYYY-MM-DD)';

COMMENT ON COLUMN public.pedidos_diarias.anio IS 
'Año extraído de fecha_cl (formato numérico, ej: 2025)';

COMMENT ON COLUMN public.pedidos_diarias.mes_num IS 
'Número del mes extraído de fecha_cl (1-12)';

COMMENT ON COLUMN public.pedidos_diarias.dia IS 
'Día del mes extraído de fecha_cl (1-31)';

COMMENT ON COLUMN public.pedidos_diarias.total_dia IS 
'Suma total de pedidos para el día específico (usa SOLO total_final). Excluye pedidos anulados.';

-- Verificar que se creó correctamente
SELECT 
    'Vista pedidos_diarias creada: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ'
        ELSE 'NO' 
    END as resultado
FROM information_schema.views 
WHERE table_name = 'pedidos_diarias';

-- Consulta de prueba para verificar estructura y datos
SELECT 
    usuario_id,
    fecha,
    anio,
    mes_num,
    dia,
    total_dia
FROM public.pedidos_diarias
ORDER BY usuario_id, fecha
LIMIT 20;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Vista pedidos_diarias creada exitosamente';
    RAISE NOTICE '📅 Campos disponibles: usuario_id, fecha, anio, mes_num, dia, total_dia';
    RAISE NOTICE '📊 Muestra sumatoria diaria del mes actual (para gráficos)';
    RAISE NOTICE '🔄 Se actualiza automáticamente cada mes';
    RAISE NOTICE '🎯 Usar en componente con: .from("pedidos_diarias")';
    RAISE NOTICE '💰 Usa SOLO total_final (no usa total como fallback)';
    RAISE NOTICE '🚫 Excluye pedidos con estado = anulado';
END $$;

