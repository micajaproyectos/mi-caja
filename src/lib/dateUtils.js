/**
 * Utilidades de fecha específicas para zona horaria de Chile (America/Santiago)
 * Maneja automáticamente horario de verano/invierno
 */

const TIMEZONE = 'America/Santiago';

/**
 * Obtener la fecha actual en Chile en formato YYYY-MM-DD
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const obtenerFechaHoyChile = () => {
  const fecha = new Date();
  
  // Usar Intl.DateTimeFormat para obtener la fecha correcta en Santiago
  const formatoChile = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Esto retorna automáticamente en formato YYYY-MM-DD
  return formatoChile.format(fecha);
};

/**
 * Obtener el primer día del mes actual en Chile
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const obtenerPrimerDiaMesChile = () => {
  const fecha = new Date();
  
  // Obtener año y mes en zona horaria de Santiago
  const formatoChile = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit'
  });
  
  const partes = formatoChile.formatToParts(fecha);
  const year = partes.find(p => p.type === 'year').value;
  const month = partes.find(p => p.type === 'month').value;
  
  return `${year}-${month}-01`;
};

/**
 * Obtener el último día del mes actual en Chile
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const obtenerUltimoDiaMesChile = () => {
  const fecha = new Date();
  
  // Obtener año y mes en zona horaria de Santiago
  const formatoChile = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit'
  });
  
  const partes = formatoChile.formatToParts(fecha);
  const year = parseInt(partes.find(p => p.type === 'year').value);
  const month = parseInt(partes.find(p => p.type === 'month').value);
  
  // Crear fecha del primer día del siguiente mes y restar un día
  const ultimoDia = new Date(year, month, 0);
  const day = String(ultimoDia.getDate()).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  
  return `${year}-${monthStr}-${day}`;
};

/**
 * Obtener rango completo del mes actual en Chile
 * @returns {object} {inicio: string, fin: string} en formato YYYY-MM-DD
 */
export const obtenerRangoMesActualChile = () => {
  return {
    inicio: obtenerPrimerDiaMesChile(),
    fin: obtenerUltimoDiaMesChile()
  };
};

/**
 * Obtener rango de un mes específico en Chile
 * @param {number} year - Año (ej: 2024)
 * @param {number} month - Mes (1-12)
 * @returns {object} {inicio: string, fin: string} en formato YYYY-MM-DD
 */
export const obtenerRangoMesChile = (year, month) => {
  const monthStr = String(month).padStart(2, '0');
  const inicio = `${year}-${monthStr}-01`;
  
  // Último día del mes
  const ultimoDia = new Date(year, month, 0);
  const day = String(ultimoDia.getDate()).padStart(2, '0');
  const fin = `${year}-${monthStr}-${day}`;
  
  return { inicio, fin };
};

/**
 * Formatear fecha para mostrar en español chileno
 * @param {string} fechaISO - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada (ej: "15 de marzo de 2024")
 */
export const formatearFechaChile = (fechaISO) => {
  if (!fechaISO) return '';
  
  try {
    // Crear fecha desde string ISO sin problemas de zona horaria
    const [year, month, day] = fechaISO.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    
    return fecha.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: TIMEZONE
    });
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return fechaISO;
  }
};

/**
 * Formatear fecha corta para mostrar en listas
 * @param {string} fechaISO - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada (ej: "15/03/2024")
 */
export const formatearFechaCortaChile = (fechaISO) => {
  if (!fechaISO) return '';
  
  try {
    const [year, month, day] = fechaISO.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    
    return fecha.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: TIMEZONE
    });
  } catch (error) {
    console.error('Error al formatear fecha corta:', error);
    return fechaISO;
  }
};

/**
 * Obtener la hora actual en Chile en formato HH:MM
 * @returns {string} Hora en formato HH:MM
 */
export const obtenerHoraActualChile = () => {
  const fecha = new Date();
  return fecha.toLocaleTimeString('es-CL', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Obtener fecha y hora actual en Chile
 * @returns {object} {fecha: string, hora: string}
 */
export const obtenerFechaHoraActualChile = () => {
  return {
    fecha: obtenerFechaHoyChile(),
    hora: obtenerHoraActualChile()
  };
};

/**
 * Validar si una fecha está en formato YYYY-MM-DD válido
 * @param {string} fechaISO - Fecha a validar
 * @returns {boolean} true si es válida
 */
export const validarFechaISO = (fechaISO) => {
  if (!fechaISO || typeof fechaISO !== 'string') return false;
  
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fechaISO)) return false;
  
  const [year, month, day] = fechaISO.split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  
  return fecha.getFullYear() === year &&
         fecha.getMonth() === month - 1 &&
         fecha.getDate() === day;
};

/**
 * Convertir fecha de created_at (timestamp) a fecha_cl (YYYY-MM-DD)
 * Solo para migración de datos legacy
 * @param {string} timestamp - Timestamp de created_at
 * @returns {string} Fecha en formato YYYY-MM-DD en zona Chile
 */
export const convertirTimestampAFechaChile = (timestamp) => {
  if (!timestamp) return null;
  
  try {
    const fecha = new Date(timestamp);
    
    // Usar Intl.DateTimeFormat para obtener la fecha correcta en Santiago
    const formatoChile = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatoChile.format(fecha);
  } catch (error) {
    console.error('Error al convertir timestamp:', error);
    return null;
  }
};

/**
 * Obtener años únicos de una lista de fechas para filtros
 * @param {Array} fechas - Array de fechas en formato YYYY-MM-DD
 * @returns {Array} Array de años únicos ordenados descendente
 */
export const obtenerAniosUnicos = (fechas) => {
  const anios = [...new Set(fechas.map(fecha => {
    if (!fecha) return null;
    return parseInt(fecha.split('-')[0]);
  }).filter(Boolean))];
  
  return anios.sort((a, b) => b - a);
};

/**
 * Obtener meses únicos de una lista de fechas para filtros
 * @param {Array} fechas - Array de fechas en formato YYYY-MM-DD
 * @returns {Array} Array de objetos {year, month, label} ordenados
 */
export const obtenerMesesUnicos = (fechas) => {
  const meses = new Set();
  
  fechas.forEach(fecha => {
    if (!fecha) return;
    const [year, month] = fecha.split('-');
    meses.add(`${year}-${month}`);
  });
  
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  return Array.from(meses).map(fechaMes => {
    const [year, month] = fechaMes.split('-');
    const monthNum = parseInt(month);
    return {
      value: fechaMes,
      year: parseInt(year),
      month: monthNum,
      label: `${nombresMeses[monthNum - 1]} ${year}`
    };
  }).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

/**
 * Generar clave de cache específica por usuario y fecha
 * @param {string} userId - ID del usuario
 * @param {string} tipo - Tipo de dato (ventas, inventario, etc.)
 * @param {string} fecha - Fecha opcional para cache específico por día
 * @returns {string} Clave de cache
 */
export const generarClaveCacheFecha = (userId, tipo, fecha = null) => {
  const base = `${tipo}:${userId}`;
  return fecha ? `${base}:${fecha}` : base;
};

// Exportaciones adicionales para compatibilidad
export default {
  obtenerFechaHoyChile,
  obtenerPrimerDiaMesChile,
  obtenerUltimoDiaMesChile,
  obtenerRangoMesActualChile,
  obtenerRangoMesChile,
  formatearFechaChile,
  formatearFechaCortaChile,
  obtenerHoraActualChile,
  obtenerFechaHoraActualChile,
  validarFechaISO,
  convertirTimestampAFechaChile,
  obtenerAniosUnicos,
  obtenerMesesUnicos,
  generarClaveCacheFecha,
  TIMEZONE
};
