// Hints por defecto para la detección de campos en documentos de inventario
export const DEFAULT_HINTS = {
  producto: 'detalle, descripción, producto, concepto, nombre, artículo',
  cantidad: 'cantidad, qty, qty., cant., cant, unidades, unid, kg, gr, gramos, kilos',
  unidad: 'unidad, unid, kg, gr, gramos, kilos, litros, ml, metros, cm',
  costo_total: 'costo, precio, total, valor, importe, monto, costo total, precio total',
  porcentaje_ganancia: 'ganancia, margen, utilidad, beneficio, % ganancia, % margen'
};

// Función para normalizar hints (minúsculas, sin acentos, sin espacios extra)
export const normalizeHints = (hints) => {
  const normalized = {};
  Object.entries(hints).forEach(([key, value]) => {
    if (typeof value === 'string') {
      normalized[key] = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/\s+/g, ' ') // normalizar espacios
        .trim();
    }
  });
  return normalized;
};
