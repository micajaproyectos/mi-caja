-- ============================================
-- FIX: stock_view_new con filtro automático por usuario
-- Usa auth.uid() para filtrar automáticamente por usuario autenticado
-- ============================================

-- PASO 1: Eliminar vista antigua
DROP VIEW IF EXISTS stock_view_new CASCADE;

-- PASO 2: Crear vista con filtro automático por usuario
CREATE OR REPLACE VIEW stock_view_new AS
WITH inventario_agrupado AS (
    SELECT 
        producto,
        cliente_id,
        usuario_id,
        SUM(cantidad) AS total_ingresado
    FROM inventario
    WHERE usuario_id = auth.uid()  -- 🔒 FILTRO AUTOMÁTICO POR USUARIO
    GROUP BY producto, cliente_id, usuario_id
),
ventas_agrupadas AS (
    SELECT 
        producto,
        cliente_id,
        SUM(cantidad) AS total_vendido
    FROM ventas
    WHERE usuario_id = auth.uid()  -- 🔒 FILTRO AUTOMÁTICO POR USUARIO
    GROUP BY producto, cliente_id
)
SELECT 
    i.producto,
    i.cliente_id,
    i.usuario_id,
    COALESCE(i.total_ingresado, 0) AS total_ingresado,
    COALESCE(v.total_vendido, 0) AS total_vendido,
    (COALESCE(i.total_ingresado, 0) - COALESCE(v.total_vendido, 0)) AS stock_restante,
    CASE
        WHEN (COALESCE(i.total_ingresado, 0) - COALESCE(v.total_vendido, 0)) <= 0 THEN 'Agotado'
        WHEN (COALESCE(i.total_ingresado, 0) - COALESCE(v.total_vendido, 0)) <= 5 THEN 'Bajo'
        ELSE 'Disponible'
    END AS estado
FROM inventario_agrupado i
LEFT JOIN ventas_agrupadas v ON i.producto = v.producto AND i.cliente_id = v.cliente_id
ORDER BY i.producto;

-- ============================================
-- PASO 3: Verificar que solo muestre TUS productos
-- ============================================
SELECT 
    producto,
    usuario_id,
    total_ingresado,
    total_vendido,
    stock_restante,
    estado
FROM stock_view_new
ORDER BY producto;

-- ============================================
-- PASO 4: Habilitar RLS en las tablas base (si no está habilitado)
-- ============================================

-- Habilitar RLS en inventario
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en ventas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 5: Crear/Actualizar políticas RLS para inventario
-- ============================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "usuarios_pueden_ver_su_inventario" ON inventario;
DROP POLICY IF EXISTS "usuarios_pueden_insertar_su_inventario" ON inventario;
DROP POLICY IF EXISTS "usuarios_pueden_actualizar_su_inventario" ON inventario;
DROP POLICY IF EXISTS "usuarios_pueden_eliminar_su_inventario" ON inventario;

-- Crear políticas nuevas para inventario
CREATE POLICY "usuarios_pueden_ver_su_inventario" 
ON inventario FOR SELECT 
USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_insertar_su_inventario" 
ON inventario FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_actualizar_su_inventario" 
ON inventario FOR UPDATE 
USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_eliminar_su_inventario" 
ON inventario FOR DELETE 
USING (auth.uid() = usuario_id);

-- ============================================
-- PASO 6: Crear/Actualizar políticas RLS para ventas
-- ============================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_ventas" ON ventas;
DROP POLICY IF EXISTS "usuarios_pueden_insertar_sus_ventas" ON ventas;
DROP POLICY IF EXISTS "usuarios_pueden_actualizar_sus_ventas" ON ventas;
DROP POLICY IF EXISTS "usuarios_pueden_eliminar_sus_ventas" ON ventas;

-- Crear políticas nuevas para ventas
CREATE POLICY "usuarios_pueden_ver_sus_ventas" 
ON ventas FOR SELECT 
USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_insertar_sus_ventas" 
ON ventas FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_actualizar_sus_ventas" 
ON ventas FOR UPDATE 
USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_eliminar_sus_ventas" 
ON ventas FOR DELETE 
USING (auth.uid() = usuario_id);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Esta consulta debe mostrar SOLO tus productos
SELECT 
    'stock_view_new' as tabla,
    COUNT(*) as cantidad_productos
FROM stock_view_new;

