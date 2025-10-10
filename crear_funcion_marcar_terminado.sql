-- ============================================
-- Crear función RPC para marcar pedido como terminado
-- Usa NOW() AT TIME ZONE 'America/Santiago' (igual que hora_inicio)
-- ============================================

CREATE OR REPLACE FUNCTION marcar_pedido_terminado(pedido_id BIGINT)
RETURNS VOID AS $$
BEGIN
  -- Actualizar solo el pedido específico (primera fila con estado)
  UPDATE pedidos_cocina
  SET 
    estado = 'terminado',
    hora_termino = NOW() AT TIME ZONE 'America/Santiago'
  WHERE id = pedido_id 
    AND estado IS NOT NULL;  -- Solo actualizar filas que tienen estado
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION marcar_pedido_terminado(BIGINT) TO authenticated;

-- ============================================
-- Verificación: Probar la función
-- ============================================
-- (Reemplaza '1' con el ID de un pedido pendiente)
-- SELECT marcar_pedido_terminado(1);

-- Ver el resultado
-- SELECT id, mesa, estado, hora_inicio_pedido, hora_termino 
-- FROM pedidos_cocina WHERE id = 1;

