-- Consulta para obtener la sumatoria diaria de pedidos
-- Usuario: ef3bdbd2-5b25-4e04-8e8b-aa52ffa07382
-- Mes: Enero 2026

-- IMPORTANTE: Ajusta los nombres de campos según tu tabla 'pedidos':
-- - Si el campo de fecha se llama 'fecha' en lugar de 'fecha_cl', cámbialo
-- - Si el campo de monto se llama 'monto', 'total', o 'precio_total', ajústalo
-- - Si hay un campo 'estado', descomenta el filtro para excluir pedidos anulados

SELECT 
    EXTRACT(DAY FROM fecha_cl) AS dia,
    SUM(total_final) AS total_dia
FROM 
    public.pedidos
WHERE 
    usuario_id = 'ef3bdbd2-5b25-4e04-8e8b-aa52ffa07382'
    AND fecha_cl >= '2026-01-01'
    AND fecha_cl < '2026-02-01'
    -- AND estado != 'anulado'  -- Descomenta si quieres excluir pedidos anulados
GROUP BY 
    EXTRACT(DAY FROM fecha_cl)
ORDER BY 
    dia ASC;

-- ALTERNATIVA: Si el campo de fecha se llama 'fecha' en lugar de 'fecha_cl'
-- Descomenta y usa esta versión:
/*
SELECT 
    EXTRACT(DAY FROM fecha) AS dia,
    SUM(total_final) AS total_dia
FROM 
    public.pedidos
WHERE 
    usuario_id = 'ef3bdbd2-5b25-4e04-8e8b-aa52ffa07382'
    AND fecha >= '2026-01-01'
    AND fecha < '2026-02-01'
GROUP BY 
    EXTRACT(DAY FROM fecha)
ORDER BY 
    dia ASC;
*/
