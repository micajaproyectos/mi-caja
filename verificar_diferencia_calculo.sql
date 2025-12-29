-- ============================================
-- Verificar la diferencia entre los cálculos
-- Para identificar por qué el manual es $108.600
-- ============================================

-- Usuario: a8449c95-eb79-4f59-94b3-a12c47cd1a44
-- Fecha: 2025-12-29

-- 1. Total usando solo TOTAL (sin total_final)
SELECT 
    'Total usando solo TOTAL' as tipo,
    SUM(total)::numeric as total_solo_total,
    COUNT(*) as cantidad_pedidos
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND DATE(fecha_cl) = '2025-12-29'
  AND (estado IS NULL OR estado != 'anulado');

-- 2. Total usando solo TOTAL_FINAL (sin total)
SELECT 
    'Total usando solo TOTAL_FINAL' as tipo,
    SUM(total_final)::numeric as total_solo_final,
    COUNT(*) as cantidad_pedidos
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND DATE(fecha_cl) = '2025-12-29'
  AND (estado IS NULL OR estado != 'anulado');

-- 3. Ver los 7 pedidos que tienen diferencia entre total_final y total
SELECT 
    'Pedidos con diferencia total_final vs total' as tipo,
    id,
    fecha_cl,
    mesa,
    producto,
    total,
    total_final,
    (total_final - total)::numeric as diferencia,
    estado
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND DATE(fecha_cl) = '2025-12-29'
  AND total_final IS NOT NULL
  AND total IS NOT NULL
  AND total_final != total
ORDER BY id;

-- 4. Suma de las diferencias
SELECT 
    'Suma de diferencias' as tipo,
    SUM(total_final - total)::numeric as suma_diferencias
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND DATE(fecha_cl) = '2025-12-29'
  AND total_final IS NOT NULL
  AND total IS NOT NULL
  AND total_final != total;

-- 5. Comparación: COALESCE vs solo TOTAL
SELECT 
    'Comparación de métodos' as tipo,
    SUM(COALESCE(total_final, total, 0))::numeric as total_coalesce,
    SUM(total)::numeric as total_solo_total,
    (SUM(COALESCE(total_final, total, 0)) - SUM(total))::numeric as diferencia
FROM public.pedidos
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44'
  AND DATE(fecha_cl) = '2025-12-29'
  AND (estado IS NULL OR estado != 'anulado');

