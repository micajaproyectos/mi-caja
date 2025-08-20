/**
 * Utilidades para cálculos de precios
 */

/**
 * Calcula el precio unitario basado en el costo total y la cantidad
 * @param {number} costo_total - El costo total del ítem
 * @param {number} cantidad - La cantidad del ítem
 * @returns {number} El precio unitario calculado
 */
export const calcularPrecioUnitario = (costo_total, cantidad) => {
  return costo_total / Math.max(1, cantidad);
};

/**
 * Calcula el precio de venta basado en el precio unitario y el margen de ganancia
 * @param {number} precioUnitario - El precio unitario del ítem
 * @param {number} margen - El margen de ganancia (porcentaje como decimal, ej: 0.30 para 30%)
 * @returns {number} El precio de venta con IVA incluido
 */
export const calcularPrecioVenta = (precioUnitario, margen) => {
  return precioUnitario * (1 + margen) * 1.19; // 1.19 representa IVA fijo del 19%
};

/**
 * Calcula el margen de ganancia basado en el porcentaje del ítem o el global
 * @param {number|null} porcentaje_ganancia_item - Porcentaje de ganancia específico del ítem
 * @param {number} ganancia_global - Porcentaje de ganancia global por defecto
 * @returns {number} El margen de ganancia como decimal
 */
export const calcularMargen = (porcentaje_ganancia_item, ganancia_global) => {
  return (porcentaje_ganancia_item ?? ganancia_global) / 100;
};

/**
 * Formatea un precio en pesos chilenos
 * @param {number} precio - El precio a formatear
 * @returns {string} El precio formateado como string
 */
export const formatearPrecioCLP = (precio) => {
  if (precio === null || precio === undefined || isNaN(precio)) {
    return '$ 0';
  }
  
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(precio);
};
