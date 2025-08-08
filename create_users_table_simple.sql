-- Script simplificado para crear usuarios
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL,
    cliente_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar usuarios directamente en la tabla usuarios
INSERT INTO usuarios (nombre, rol) VALUES
('Micaja', 'admin'),
('Loshermanos', 'usuario'),
('Lostoro', 'usuario'),
('Emanuel', 'usuario')
ON CONFLICT (nombre) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT * FROM usuarios ORDER BY nombre;

-- Contar usuarios
SELECT COUNT(*) as total_usuarios FROM usuarios; 