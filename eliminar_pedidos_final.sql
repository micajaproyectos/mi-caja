-- Deshabilitar trigger de auditoría
ALTER TABLE pedidos DISABLE TRIGGER trigger_auditoria_pedidos;

-- Eliminar pedidos con mesa NULL
DELETE FROM pedidos WHERE mesa IS NULL;

-- Re-habilitar trigger
ALTER TABLE pedidos ENABLE TRIGGER trigger_auditoria_pedidos;

-- Verificar cuántos quedan
SELECT COUNT(*) as total_pedidos FROM pedidos;

