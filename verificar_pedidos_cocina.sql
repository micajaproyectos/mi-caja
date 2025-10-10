-- Verificar si hay datos en la tabla
SELECT COUNT(*) as total_pedidos FROM pedidos_cocina;

-- Ver todos los pedidos (si hay)
SELECT * FROM pedidos_cocina ORDER BY hora_inicio_pedido DESC;

