-- Comparar la hora actual vs la hora del pedido
SELECT 
    id,
    mesa,
    hora_inicio_pedido,
    hora_inicio_pedido AT TIME ZONE 'UTC' as hora_utc,
    NOW() as hora_actual_utc,
    NOW() AT TIME ZONE 'America/Santiago' as hora_actual_santiago,
    EXTRACT(EPOCH FROM (NOW() - hora_inicio_pedido)) / 60 as minutos_transcurridos
FROM pedidos_cocina
WHERE id = 1;

-- Ver qué está guardando NOW() AT TIME ZONE 'America/Santiago'
SELECT 
    NOW() as utc_normal,
    NOW() AT TIME ZONE 'America/Santiago' as santiago_convertido,
    CURRENT_TIMESTAMP as timestamp_actual;

