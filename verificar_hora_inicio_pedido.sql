-- Verificar los datos de hora_inicio_pedido en la tabla
SELECT 
    id,
    mesa,
    producto,
    hora_inicio_pedido,
    hora_inicio_pedido AT TIME ZONE 'America/Santiago' as hora_santiago,
    estado
FROM pedidos_cocina
ORDER BY hora_inicio_pedido DESC
LIMIT 10;

