import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { useSessionData } from '../lib/useSessionData.js';
import { logger } from '../lib/logger.js';
import { 
  obtenerFechaHoyChile, 
  formatearFechaChile,
  formatearFechaCortaChile,
  obtenerMesesUnicos,
  validarFechaISO
} from '../lib/dateUtils.js';
import Footer from './Footer';
import BarcodeScanner from './BarcodeScanner';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

const RegistroInventario = () => {
  const [inventario, setInventario] = useState({
    fecha_ingreso: obtenerFechaHoyChile(),
    producto: '',
    cantidad: '',
    unidad: '',
    costo_total: '',
    porcentaje_ganancia: '' // Campo para cálculos (no se guarda en BD)
  });

  const [inventarioRegistrado, setInventarioRegistrado] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  
  // Estados para código de barras
  const [codigoInterno, setCodigoInterno] = useState('');
  const [mostrarScanner, setMostrarScanner] = useState(false);
  
  // Estados para búsqueda por código de barras escaneado
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [mostrarScannerBusqueda, setMostrarScannerBusqueda] = useState(false);
  
  // Estados para edición inline
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEdicion, setValoresEdicion] = useState({
    producto: '',
    cantidad: '',
    unidad: '',
    costo_total: '',
    precio_unitario: '',
    precio_venta: '',
    imagen: '',
    codigo_interno: ''
  });

  // Opciones para el selector de unidad
  const opcionesUnidad = [
    { value: 'kg', label: 'Kg' },
    { value: 'gr', label: 'Gr' },
    { value: 'unidad', label: 'Unidad' }
  ];

  // Función para normalizar fecha a YYYY-MM-DD sin zona horaria
  const normalizarFecha = (fechaString) => {
    if (!fechaString) return '';
    
    // Si la fecha ya está en formato YYYY-MM-DD, retornarla directamente
    if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
      return fechaString;
    }
    
    // Para fechas del input type="date", ya vienen en formato YYYY-MM-DD
    // Solo necesitamos asegurarnos de que se mantenga así
    if (typeof fechaString === 'string' && fechaString.includes('-')) {
      const partes = fechaString.split('-');
      if (partes.length === 3) {
        const [year, month, day] = partes;
        const fechaNormalizada = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return fechaNormalizada;
      }
    }
    
    // Fallback: usar Date pero con cuidado
    try {
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) {
        console.error('❌ Fecha inválida:', fechaString);
        return fechaString;
      }
      
      // Usar métodos locales para evitar problemas de zona horaria
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const resultado = `${year}-${month}-${day}`;
      
      return resultado;
    } catch (error) {
      console.error('❌ Error al normalizar fecha:', error);
      return fechaString;
    }
  };

  // Función para crear fecha con zona horaria local
  const crearFechaConZonaHoraria = (fechaString) => {
    if (!fechaString) return '';
    
    // Crear fecha en zona horaria local
    const fecha = new Date(fechaString + 'T00:00:00');
    
    // Obtener offset de zona horaria en minutos
    const offset = fecha.getTimezoneOffset();
    
    // Crear fecha ISO con offset local
    const fechaLocal = new Date(fecha.getTime() - (offset * 60 * 1000));
    
    return fechaLocal.toISOString();
  };

  // Función para obtener año y mes de una fecha sin zona horaria
  const obtenerAnioMes = (fechaString) => {
    if (!fechaString) return '';
    const fecha = new Date(fechaString);
    // Usar UTC para evitar conversión de zona horaria
    const year = fecha.getUTCFullYear();
    // getUTCMonth() devuelve 0-11, necesitamos 1-12 para comparar con input type="month"
    const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const resultado = `${year}-${month}`;
    return resultado;
  };

  // Función para extraer fecha sin zona horaria para filtros
  const extraerFechaSinZonaHoraria = (fechaString) => {
    if (!fechaString) return '';
    const fecha = new Date(fechaString);
    const year = fecha.getUTCFullYear();
    const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const day = String(fecha.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtrar productos por nombre, fecha, mes y código de barras
  const productosFiltrados = inventarioRegistrado.filter(item => {
    const coincideNombre = item.producto.toLowerCase().includes(busquedaProducto.toLowerCase());
    
    // Usar fecha_ingreso para filtros (fecha seleccionada por el usuario)
    const fechaFiltro = extraerFechaSinZonaHoraria(item.fecha_ingreso);
    
    // Filtro por fecha específica
    const coincideFecha = !filtroFecha || fechaFiltro === filtroFecha;
    
    // Filtro por mes
    const anioMesItem = fechaFiltro ? fechaFiltro.substring(0, 7) : obtenerAnioMes(item.fecha_ingreso);
    const coincideMes = !filtroMes || anioMesItem === filtroMes;
    
    // Filtro por código de barras
    const coincideCodigo = !filtroCodigo || (item.codigo_interno && item.codigo_interno.toString() === filtroCodigo);
    
    return coincideNombre && coincideFecha && coincideMes && coincideCodigo;
  });

  // Limitar productos mostrados a 30 si no se ha activado "Ver todo"
  const productosAMostrar = mostrarTodos ? productosFiltrados : productosFiltrados.slice(0, 30);

  // Función para recargar datos
  const recargarDatos = useCallback(() => {
    cargarInventario();
  }, []);

  // Hook para gestionar cambios de sesión
  useSessionData(recargarDatos, 'RegistroInventario');

  // Establecer fecha actual al cargar el componente usando fecha Chile
  useEffect(() => {
    const fechaActual = obtenerFechaHoyChile();
    setInventario(prev => ({
      ...prev,
      fecha_ingreso: fechaActual
    }));
    recargarDatos();
  }, [recargarDatos]);

  // Resetear mostrarTodos cuando se apliquen filtros
  useEffect(() => {
    if (busquedaProducto || filtroFecha || filtroMes || filtroCodigo) {
      setMostrarTodos(false);
    }
  }, [busquedaProducto, filtroFecha, filtroMes, filtroCodigo]);

  const cargarInventario = async () => {
    try {
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setInventarioRegistrado([]);
        return;
      }

      const { data, error } = await supabase
        .from('inventario')
        .select('id, fecha_ingreso, fecha_cl, producto, cantidad, unidad, costo_total, precio_unitario, precio_venta, imagen, codigo_interno, usuario_id, created_at')
        .eq('usuario_id', usuarioId) // 🔒 FILTRO CRÍTICO POR USUARIO
        .order('fecha_ingreso', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error en consulta Supabase:', error);
        alert(`Error al cargar el inventario: ${error.message}`);
        setInventarioRegistrado([]);
        return;
      }

      setInventarioRegistrado(data || []);
    } catch (error) {
      console.error('Error inesperado al cargar inventario:', error);
      alert('Error inesperado al cargar el inventario');
      setInventarioRegistrado([]);
    }
  };

  /**
   * Calcular dígito verificador para código EAN-13
   * @param {string} code - Los primeros 12 dígitos del código
   * @returns {number} - Dígito verificador (0-9)
   */
  const calcularDigitoVerificadorEAN13 = (code) => {
    let suma = 0;
    for (let i = 0; i < 12; i++) {
      const digito = parseInt(code[i]);
      // Multiplicar por 1 o 3 según la posición (impar o par)
      suma += digito * (i % 2 === 0 ? 1 : 3);
    }
    const modulo = suma % 10;
    return modulo === 0 ? 0 : 10 - modulo;
  };

  /**
   * Generar un código de barras EAN-13 único
   * Formato: 299 (prefijo interno) + 9 dígitos aleatorios + 1 dígito verificador
   */
  const generarCodigoBarras = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado');
        return null;
      }

      let codigoGenerado = null;
      let intentos = 0;
      const maxIntentos = 10;

      while (intentos < maxIntentos) {
        // Prefijo 299 para códigos internos (no conflictúa con códigos EAN comerciales)
        const prefijo = '299';
        
        // Generar 9 dígitos aleatorios
        const digitosAleatorios = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        
        // Combinar prefijo + dígitos aleatorios (total 12 dígitos)
        const codigo12Digitos = prefijo + digitosAleatorios;
        
        // Calcular dígito verificador
        const digitoVerificador = calcularDigitoVerificadorEAN13(codigo12Digitos);
        
        // Código completo EAN-13
        const codigoCompleto = codigo12Digitos + digitoVerificador;

        // Verificar si el código ya existe en la base de datos (para este usuario)
        const { data, error } = await supabase
          .from('inventario')
          .select('codigo_interno')
          .eq('usuario_id', usuarioId)
          .eq('codigo_interno', codigoCompleto)
          .single();

        if (error && error.code === 'PGRST116') {
          // Error PGRST116 significa que no se encontró ninguna coincidencia (código único)
          codigoGenerado = codigoCompleto;
          break;
        } else if (error) {
          console.error('❌ Error al verificar código:', error);
          intentos++;
          continue;
        }

        // Si llegamos aquí, el código ya existe, generar otro
        intentos++;
      }

      if (!codigoGenerado) {
        alert('❌ No se pudo generar un código único. Por favor, intenta nuevamente.');
        return null;
      }

      logger.debug('✅', 'Código de barras generado:', codigoGenerado);
      return codigoGenerado;

    } catch (error) {
      console.error('❌ Error al generar código de barras:', error);
      alert('Error al generar código de barras');
      return null;
    }
  };

  /**
   * Manejar el botón de generar código
   */
  const handleGenerarCodigo = async () => {
    const codigo = await generarCodigoBarras();
    if (codigo) {
      setCodigoInterno(codigo);
    }
  };

  /**
   * Manejar el botón de generar código durante la edición
   */
  const handleGenerarCodigoEdicion = async () => {
    const codigo = await generarCodigoBarras();
    if (codigo) {
      setValoresEdicion(prev => ({
        ...prev,
        codigo_interno: codigo
      }));
    }
  };

  /**
   * Generar PDF con el código de barras para imprimir
   * Tamaño: 4x2 cm (40x20 mm) - perfecto para etiquetas adhesivas
   * @param {string} codigo - El código de barras a generar (13 dígitos)
   * @param {string} nombreProducto - Nombre del producto (opcional)
   */
  const generarPDFCodigoBarras = (codigo, nombreProducto = '') => {
    try {
      if (!codigo || codigo.length !== 13) {
        alert('❌ Código de barras inválido. Debe tener 13 dígitos.');
        return;
      }

      // Crear un canvas temporal para generar el código de barras
      const canvas = document.createElement('canvas');
      
      // Generar el código de barras en el canvas usando JsBarcode
      // Configuración de ALTA RESOLUCIÓN para mejor calidad de impresión
      // displayValue: false para agregar números manualmente con mejor calidad
      JsBarcode(canvas, codigo, {
        format: 'EAN13',
        width: 2,          // Ancho de cada barra (buena calidad)
        height: 45,        // Altura de las barras (solo barras, sin números)
        displayValue: false, // NO mostrar números (los agregaremos manualmente)
        margin: 2,         // Margen mínimo
        background: '#ffffff', // Fondo blanco
        lineColor: '#000000'   // Barras negras para máximo contraste
      });

      // Crear el PDF con tamaño personalizado de 4x2 cm (40x20 mm)
      const pdf = new jsPDF({
        orientation: 'landscape', // Horizontal para 4x2
        unit: 'mm',
        format: [20, 40] // Alto x Ancho en mm (4cm x 2cm)
      });

      // Convertir canvas a imagen PNG con máxima calidad
      const imgData = canvas.toDataURL('image/png', 1.0); // Calidad 100%
      
      // Dimensiones y posición del código de barras (solo barras, sin números)
      const imgWidth = 38;
      const imgHeight = 11;  // Solo las barras
      const x = 1;
      const y = 3.5; // Posición desde arriba

      // Agregar la imagen del código de barras al PDF
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, '', 'NONE');

      // Agregar el nombre del producto en la parte superior (si existe)
      if (nombreProducto) {
        pdf.setFontSize(6); // Tamaño de fuente muy pequeño
        pdf.setTextColor(0, 0, 0); // Color negro
        pdf.setFont('helvetica', 'bold'); // Negrita para mejor legibilidad
        
        // Truncar el nombre si es muy largo (máximo 30 caracteres)
        const nombreTruncado = nombreProducto.length > 30 
          ? nombreProducto.substring(0, 30) + '...'
          : nombreProducto;
        
        // Centrar el texto en la parte superior
        const textWidth = pdf.getTextWidth(nombreTruncado);
        const textX = (40 - textWidth) / 2; // Centrar en el ancho de 40mm
        pdf.text(nombreTruncado, textX, 2); // Posición Y: 2mm desde arriba
      }

      // Agregar los números del código de barras manualmente con alta calidad
      pdf.setFontSize(7); // Tamaño de fuente para los números
      pdf.setTextColor(0, 0, 0); // Color negro
      pdf.setFont('helvetica', 'normal'); // Fuente normal
      
      // Centrar los números debajo del código de barras
      const numerosWidth = pdf.getTextWidth(codigo);
      const numerosX = (40 - numerosWidth) / 2;
      pdf.text(codigo, numerosX, 17); // Posición debajo de las barras

      // Generar nombre de archivo
      const nombreArchivo = nombreProducto 
        ? `etiqueta_${nombreProducto.replace(/[^a-z0-9]/gi, '_')}_${codigo}.pdf`
        : `etiqueta_${codigo}.pdf`;

      // Descargar el PDF
      pdf.save(nombreArchivo);

      logger.debug('✅', 'Etiqueta 4x2cm generada exitosamente:', nombreArchivo);

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      alert('Error al generar el PDF del código de barras');
    }
  };

  /**
   * Manejar el botón de descargar PDF del código generado
   */
  const handleDescargarPDF = () => {
    if (!codigoInterno) {
      alert('⚠️ Primero debes generar o ingresar un código de barras');
      return;
    }

    const nombreProducto = inventario.producto || '';
    generarPDFCodigoBarras(codigoInterno, nombreProducto);
  };

  /**
   * Generar PDF con listado de todos los productos del inventario (formato oficio vertical)
   */
  const generarPDFListadoProductos = async () => {
    try {
      if (inventarioRegistrado.length === 0) {
        alert('No hay productos en el inventario para exportar.');
        return;
      }

      const { jsPDF } = await import('jspdf');

      // Oficio vertical: 216 x 330 mm
      const doc = new jsPDF({ unit: 'mm', format: [216, 330], orientation: 'portrait' });

      const margenIzq = 15;
      const margenDer = 201;
      const anchoTotal = margenDer - margenIzq;
      let y = 20;

      // Encabezado
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('LISTADO DE PRODUCTOS — INVENTARIO', 216 / 2, y, { align: 'center' });
      y += 6;

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      const fechaHoy = new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago' });
      doc.text(`Generado el: ${fechaHoy}   |   Total de productos: ${inventarioRegistrado.length}`, 216 / 2, y, { align: 'center' });
      y += 6;

      // Línea separadora
      doc.setDrawColor(100, 100, 100);
      doc.line(margenIzq, y, margenDer, y);
      y += 5;

      // Encabezados de columnas
      const cols = [
        { label: 'Producto',          x: margenIzq,   w: 60 },
        { label: 'Cód. Barras',       x: 78,          w: 28 },
        { label: 'Cantidad',          x: 109,         w: 20 },
        { label: 'Unidad',            x: 132,         w: 18 },
        { label: 'Costo Unit.',       x: 153,         w: 22 },
        { label: 'P. Venta',          x: 178,         w: 22 },
      ];

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      cols.forEach(col => doc.text(col.label, col.x, y));
      y += 2;
      doc.line(margenIzq, y, margenDer, y);
      y += 4;

      // Filas de productos
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);

      inventarioRegistrado.forEach((item, idx) => {
        // Salto de página si es necesario
        if (y > 310) {
          doc.addPage([216, 330]);
          y = 20;
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          cols.forEach(col => doc.text(col.label, col.x, y));
          y += 2;
          doc.line(margenIzq, y, margenDer, y);
          y += 4;
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7.5);
        }

        // Fondo alternado
        if (idx % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(margenIzq, y - 3.5, anchoTotal, 5.5, 'F');
        }

        const nombre = item.producto ? item.producto.substring(0, 32) : '—';
        const codigo = item.codigo_interno ? item.codigo_interno.toString() : '—';
        const cantidad = item.cantidad !== undefined && item.cantidad !== null ? item.cantidad.toString() : '—';
        const unidad = item.unidad || '—';
        const costoUnit = item.precio_unitario ? `$${parseFloat(item.precio_unitario).toLocaleString('es-CL')}` : '—';
        const precioVenta = item.precio_venta ? `$${parseFloat(item.precio_venta).toLocaleString('es-CL')}` : '—';

        doc.setTextColor(30, 30, 30);
        doc.text(nombre,     cols[0].x, y);
        doc.text(codigo,     cols[1].x, y);
        doc.text(cantidad,   cols[2].x, y);
        doc.text(unidad,     cols[3].x, y);
        doc.text(costoUnit,  cols[4].x, y);
        doc.text(precioVenta,cols[5].x, y);

        y += 5.5;
      });

      // Línea final
      doc.setDrawColor(100, 100, 100);
      doc.line(margenIzq, y, margenDer, y);
      y += 6;

      // Pie de página
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('Sistema de Gestión de Negocios - Mi Caja', 216 / 2, y, { align: 'center' });

      const fechaArchivo = fechaHoy.replace(/\//g, '-');
      doc.save(`listado-productos-${fechaArchivo}.pdf`);

    } catch (error) {
      console.error('Error al generar listado PDF:', error);
      alert('Error al generar el PDF. Intenta nuevamente.');
    }
  };

  /**
   * Generar PDF con TODOS los códigos de barras en una sola hoja carta
   * Tamaño: Carta (8.5 x 11 pulgadas / 215.9 x 279.4 mm)
   * Organiza múltiples etiquetas 4x2cm en la hoja
   */
  const generarPDFTodosLosCodigos = () => {
    try {
      // Filtrar solo productos con códigos de barras generados (que empiecen con '299')
      const productosConCodigo = productosAMostrar.filter(item => 
        item.codigo_interno && item.codigo_interno.toString().startsWith('299')
      );

      if (productosConCodigo.length === 0) {
        alert('⚠️ No hay códigos de barras generados para descargar');
        return;
      }

      // Crear el PDF con tamaño carta
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter' // 215.9 x 279.4 mm
      });

      // Configuración de la cuadrícula de etiquetas
      const etiquetaAncho = 37;  // 3.7cm (ajustado para que quepan 5 por fila)
      const etiquetaAlto = 18;   // 1.8cm (proporcionalmente ajustado)
      const margenIzq = 10;      // Margen izquierdo
      const margenTop = 10;      // Margen superior
      const espacioH = 2;        // Espacio horizontal entre etiquetas
      const espacioV = 4;        // Espacio vertical entre etiquetas

      // Configuración fija: 5 etiquetas por fila
      const etiquetasPorFila = 5;
      
      // Calcular cuántas etiquetas caben por columna
      const altoDisponible = 279.4 - (margenTop * 2);
      const etiquetasPorColumna = Math.floor(altoDisponible / (etiquetaAlto + espacioV));
      const etiquetasPorPagina = etiquetasPorFila * etiquetasPorColumna;

      // Iterar sobre cada producto con código
      productosConCodigo.forEach((item, index) => {
        // Determinar si necesitamos una nueva página
        if (index > 0 && index % etiquetasPorPagina === 0) {
          pdf.addPage();
        }

        // Calcular posición en la cuadrícula
        const indicePagina = index % etiquetasPorPagina;
        const fila = Math.floor(indicePagina / etiquetasPorFila);
        const columna = indicePagina % etiquetasPorFila;

        // Calcular coordenadas X, Y
        const x = margenIzq + columna * (etiquetaAncho + espacioH);
        const y = margenTop + fila * (etiquetaAlto + espacioV);

        // Crear un canvas temporal para este código de barras
        const canvas = document.createElement('canvas');
        
        // Generar el código de barras en el canvas
        JsBarcode(canvas, item.codigo_interno.toString(), {
          format: 'EAN13',
          width: 1.8,    // Reducido para etiqueta más pequeña
          height: 40,    // Reducido proporcionalmente
          displayValue: false,
          margin: 1,     // Margen reducido
          background: '#ffffff',
          lineColor: '#000000'
        });

        // Convertir canvas a imagen
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Dimensiones de la imagen del código de barras dentro de la etiqueta (ajustadas)
        const imgWidth = 35;   // Reducido para caber en etiqueta de 37mm
        const imgHeight = 10;  // Proporcionalmente ajustado
        const imgX = x + 1;
        const imgY = y + 3;

        // Agregar la imagen del código de barras
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight, '', 'NONE');

        // Agregar el nombre del producto (truncado si es muy largo)
        const nombreTruncado = item.producto.length > 28 
          ? item.producto.substring(0, 28) + '...'
          : item.producto;
        
        pdf.setFontSize(5.5);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        
        const textWidth = pdf.getTextWidth(nombreTruncado);
        const textX = x + (etiquetaAncho - textWidth) / 2;
        pdf.text(nombreTruncado, textX, y + 1.8);

        // Agregar los números del código de barras
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        
        const numerosWidth = pdf.getTextWidth(item.codigo_interno.toString());
        const numerosX = x + (etiquetaAncho - numerosWidth) / 2;
        pdf.text(item.codigo_interno.toString(), numerosX, y + 15.5);
      });

      // Generar nombre de archivo con fecha
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `codigos_barras_inventario_${fecha}.pdf`;

      // Descargar el PDF
      pdf.save(nombreArchivo);

      logger.debug('✅', `PDF generado con ${productosConCodigo.length} códigos de barras`);

    } catch (error) {
      console.error('❌ Error al generar PDF con todos los códigos:', error);
      alert('Error al generar el PDF con todos los códigos de barras');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInventario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calcularPrecios = () => {
    const cantidad = parseFloat(inventario.cantidad) || 0;
    const costoTotal = parseFloat(inventario.costo_total) || 0;
    const porcentajeGanancia = parseFloat(inventario.porcentaje_ganancia) || 0;

    if (cantidad > 0 && costoTotal > 0) {
      const precioUnitario = (costoTotal / cantidad) * 1.19;
      const precioVenta = precioUnitario * (1 + porcentajeGanancia);
      
      // Redondear precio_venta al múltiplo de $10 más cercano
      const precioVentaRedondeado = Math.round(precioVenta / 10) * 10;
      
      return {
        precio_unitario: precioUnitario.toFixed(2),
        precio_venta: precioVentaRedondeado.toString()
      };
    }
    
    return {
      precio_unitario: '0.00',
      precio_venta: '0'
    };
  };

  const registrarInventario = async (e) => {
    e.preventDefault();
    
    // Validar campos requeridos
    if (!inventario.producto || !inventario.cantidad || !inventario.unidad || 
        !inventario.costo_total || !inventario.porcentaje_ganancia) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      // Obtener el usuario_id del usuario autenticado
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        alert('❌ Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.');
        setLoading(false);
        return;
      }

      // Calcular precios automáticamente
      const precios = calcularPrecios();
      
      // Guardar fecha como timestamp en UTC a medianoche para evitar problemas de zona horaria
      // Formato: YYYY-MM-DDTHH:MM:SSZ
      const fechaTimestamp = inventario.fecha_ingreso ? `${inventario.fecha_ingreso}T12:00:00Z` : null;
      
      const inventarioParaInsertar = {
        fecha_ingreso: fechaTimestamp,
        // fecha_cl: NO ENVIAR - es columna generada automáticamente por PostgreSQL
        producto: inventario.producto,
        cantidad: parseFloat(inventario.cantidad) || 0,
        unidad: inventario.unidad,
        costo_total: parseFloat(inventario.costo_total) || 0,
        precio_unitario: parseFloat(precios.precio_unitario) || 0,
        precio_venta: parseFloat(precios.precio_venta) || 0,
        usuario_id: usuarioId, // 🔒 AGREGAR USER ID PARA SEGURIDAD
        codigo_interno: codigoInterno || null // 📷 Código de barras (opcional)
      };

      const { error } = await supabase
        .from('inventario')
        .insert([inventarioParaInsertar]);

      if (error) {
        console.error('Error al registrar inventario:', error);
        alert('Error al registrar el inventario: ' + error.message);
        return;
      }

      alert('Inventario registrado exitosamente');

      // 🗑️ Invalidar caché de productos del inventario para otros componentes
      try {
        const usuarioId = await authService.getCurrentUserId();
        if (usuarioId) {
          const cacheKey = `productos_inventario:${usuarioId}`;
          const cacheTimeKey = `productos_inventario_time:${usuarioId}`;
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(cacheTimeKey);
          logger.debug('🗑️', 'Caché de productos invalidado');
        }
      } catch (e) {
        logger.error('Error al invalidar caché:', e);
      }

      // Limpiar formulario
      setInventario({
        fecha_ingreso: new Date().toISOString().split('T')[0],
        producto: '',
        cantidad: '',
        unidad: '',
        costo_total: '',
        porcentaje_ganancia: '' // Campo para cálculos (no se guarda en BD)
      });
      setCodigoInterno(''); // Limpiar código de barras

      // Recargar inventario
      await cargarInventario();

    } catch (error) {
      console.error('Error inesperado al registrar inventario:', error);
      alert('Error inesperado al registrar el inventario');
    } finally {
      setLoading(false);
    }
  };

  const eliminarInventario = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto del inventario?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar inventario:', error);
        alert('Error al eliminar el producto del inventario');
        return;
      }

      // Producto eliminado exitosamente - sin popup redundante
      
      // 🗑️ Invalidar caché de productos del inventario para otros componentes
      try {
        const usuarioId = await authService.getCurrentUserId();
        if (usuarioId) {
          const cacheKey = `productos_inventario:${usuarioId}`;
          const cacheTimeKey = `productos_inventario_time:${usuarioId}`;
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(cacheTimeKey);
          console.log('🗑️ Caché de productos invalidado (eliminación)');
        }
      } catch (e) {
        logger.error('Error al invalidar caché:', e);
      }
      
      await cargarInventario();

    } catch (error) {
      console.error('Error inesperado al eliminar inventario:', error);
      alert('Error inesperado al eliminar el producto');
    }
  };

  // Función para iniciar la edición de un producto
  const iniciarEdicion = (item) => {
    setEditandoId(item.id);
    setValoresEdicion({
      producto: item.producto,
      cantidad: item.cantidad,
      unidad: item.unidad,
      costo_total: item.costo_total,
      precio_unitario: item.precio_unitario,
      precio_venta: item.precio_venta,
      imagen: item.imagen || '',
      codigo_interno: item.codigo_interno ? item.codigo_interno.toString() : ''
    });
  };

  // Función para cancelar la edición
  const cancelarEdicion = () => {
    setEditandoId(null);
    setValoresEdicion({
      producto: '',
      cantidad: '',
      unidad: '',
      costo_total: '',
      precio_unitario: '',
      precio_venta: '',
      imagen: '',
      codigo_interno: ''
    });
  };

  // Función para guardar los cambios
  const guardarEdicion = async (id) => {
    try {
      // Validar que los valores sean válidos
      if (!valoresEdicion.producto || valoresEdicion.producto.trim() === '') {
        alert('El nombre del producto no puede estar vacío');
        return;
      }

      if (!valoresEdicion.cantidad || valoresEdicion.cantidad <= 0) {
        alert('La cantidad debe ser mayor a 0');
        return;
      }

      if (!valoresEdicion.unidad || valoresEdicion.unidad.trim() === '') {
        alert('Debe seleccionar una unidad');
        return;
      }

      if (!valoresEdicion.costo_total || valoresEdicion.costo_total <= 0) {
        alert('El costo total debe ser mayor a 0');
        return;
      }

      if (!valoresEdicion.precio_unitario || valoresEdicion.precio_unitario <= 0) {
        alert('El precio unitario debe ser mayor a 0');
        return;
      }

      if (!valoresEdicion.precio_venta || valoresEdicion.precio_venta <= 0) {
        alert('El precio de venta debe ser mayor a 0');
        return;
      }

      const { error } = await supabase
        .from('inventario')
        .update({
          producto: valoresEdicion.producto.trim(),
          cantidad: parseFloat(valoresEdicion.cantidad),
          unidad: valoresEdicion.unidad,
          costo_total: parseFloat(valoresEdicion.costo_total),
          precio_unitario: parseFloat(valoresEdicion.precio_unitario),
          precio_venta: parseFloat(valoresEdicion.precio_venta),
          imagen: valoresEdicion.imagen.trim() || null,
          codigo_interno: valoresEdicion.codigo_interno || null
        })
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar inventario:', error);
        alert('Error al actualizar el producto: ' + error.message);
        return;
      }

      alert('Producto actualizado exitosamente');
      
      // 🗑️ Invalidar caché de productos del inventario para otros componentes
      try {
        const usuarioId = await authService.getCurrentUserId();
        if (usuarioId) {
          const cacheKey = `productos_inventario:${usuarioId}`;
          const cacheTimeKey = `productos_inventario_time:${usuarioId}`;
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(cacheTimeKey);
          console.log('🗑️ Caché de productos invalidado (edición)');
        }
      } catch (e) {
        logger.error('Error al invalidar caché:', e);
      }
      
      cancelarEdicion();
      await cargarInventario();

    } catch (error) {
      console.error('Error inesperado al actualizar inventario:', error);
      alert('Error inesperado al actualizar el producto');
    }
  };

  // Función para manejar cambios en los inputs de edición
  const handleEdicionChange = (campo, valor) => {
    setValoresEdicion(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const preciosCalculados = calcularPrecios();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#1a3d1a' }}>
      {/* Fondo degradado moderno */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          background: `
            linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
            radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `
        }}
      />

      {/* Efecto de vidrio esmerilado adicional */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/5"></div>

      {/* Contenido principal */}
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Botón de regreso */}
          <div className="mb-4 md:mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium text-sm md:text-base"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-lg md:text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Gestión de Inventario
          </h1>

          {/* Formulario de Registro */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-green-400 text-center">
              Agregar Producto al Inventario
            </h2>
            
            <form onSubmit={registrarInventario} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Fecha de Ingreso */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    name="fecha_ingreso"
                    value={inventario.fecha_ingreso}
                    onChange={handleChange}
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Producto */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Producto
                  </label>
                  <input
                    type="text"
                    name="producto"
                    value={inventario.producto}
                    onChange={handleChange}
                    placeholder="Nombre del producto"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Cantidad */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    value={inventario.cantidad}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Unidad */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Unidad
                  </label>
                  <select
                    name="unidad"
                    value={inventario.unidad}
                    onChange={handleChange}
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    style={{ colorScheme: 'dark' }}
                    required
                  >
                    <option value="" className="bg-gray-800">Seleccionar unidad</option>
                    {opcionesUnidad.map(opcion => (
                      <option key={opcion.value} value={opcion.value} className="bg-gray-800">
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Costo Total */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Costo Total
                  </label>
                  <input
                    type="number"
                    name="costo_total"
                    value={inventario.costo_total}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                {/* Porcentaje de Ganancia - Para cálculos (no se guarda en BD) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Porcentaje de Ganancia
                  </label>
                  <input
                    type="number"
                    name="porcentaje_ganancia"
                    value={inventario.porcentaje_ganancia}
                    onChange={handleChange}
                    placeholder="0.30 (30%)"
                    step="0.001"
                    min="0"
                    className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>
              </div>

              {/* Código de Barras (Opcional) */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 mt-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📷</span>
                  <h3 className="text-lg font-semibold text-blue-400">
                    Código de Barras (Opcional)
                  </h3>
                </div>
                
                {/* Input y Botones en una sola fila */}
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  {/* Campo para mostrar/editar el código */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={codigoInterno}
                      onChange={(e) => setCodigoInterno(e.target.value.replace(/\D/g, ''))}
                      placeholder="Escanea, genera o ingresa el código de barras"
                      className="w-full p-3 md:p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 text-sm md:text-base font-mono"
                      maxLength={13}
                    />
                  </div>
                  
                  {/* Botón para generar código automático */}
                  <button
                    type="button"
                    onClick={handleGenerarCodigo}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm whitespace-nowrap"
                    title="Generar código EAN-13 único"
                  >
                    <span className="text-lg">⚡</span>
                    <span>Generar Código</span>
                  </button>
                  
                  {/* Botón para escanear */}
                  <button
                    type="button"
                    onClick={() => setMostrarScanner(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm whitespace-nowrap"
                  >
                    <span className="text-lg">📷</span>
                    <span>Escanear</span>
                  </button>
                </div>
                
                {/* Botones adicionales (Descargar PDF y Limpiar) */}
                {codigoInterno && (
                  <div className="flex flex-wrap gap-2">
                    {/* Botón para descargar PDF del código */}
                    <button
                      type="button"
                      onClick={handleDescargarPDF}
                      className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm md:text-base"
                      title="Descargar PDF para imprimir"
                    >
                      <span className="text-lg">📄</span>
                      <span>Descargar PDF</span>
                    </button>
                    {/* Botón para limpiar código */}
                    <button
                      type="button"
                      onClick={() => setCodigoInterno('')}
                      className="flex items-center justify-center px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all duration-200 text-sm md:text-base"
                      title="Limpiar código"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {/* Información del código */}
                {codigoInterno && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
                    <p className="text-sm text-green-400">
                      ✓ Código registrado: <span className="font-mono font-bold text-base">{codigoInterno}</span>
                    </p>
                    {codigoInterno.startsWith('299') && (
                      <p className="text-xs text-green-300">
                        🔹 Código interno generado automáticamente (EAN-13)
                      </p>
                    )}
                    <p className="text-xs text-blue-300">
                      💡 Puedes descargar un PDF con el código de barras para imprimir y pegar en tus productos
                    </p>
                  </div>
                )}
              </div>

              {/* Cálculos Automáticos y Botón de Registro */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 mt-4 md:mt-6 border border-white/10">
                <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-yellow-400 text-center">
                  Cálculos Automáticos
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Precio Unitario (con IVA 19%)
                    </label>
                    <p className="text-xl md:text-2xl font-bold text-green-400">
                      ${preciosCalculados.precio_unitario}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Precio de Venta (redondeado a $10)
                    </label>
                    <p className="text-xl md:text-2xl font-bold text-blue-400">
                      ${preciosCalculados.precio_venta}
                    </p>
                  </div>
                  
                  {/* Botón de Registro - Al costado */}
                  <div className="flex items-center justify-center">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 md:px-8 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-sm md:text-base w-full h-full"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-white"></div>
                          <span>Registrando...</span>
                        </>
                      ) : (
                        <> 
                          <span>Registrar Producto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Tabla de Inventario */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-green-400 text-center">
              Inventario Registrado
            </h2>
            
            {/* Barra de búsqueda */}
            {inventarioRegistrado.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Filtro por nombre */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-lg"></span>
                    </div>
                    <input
                      type="text"
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      placeholder="Buscar producto por nombre..."
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    />
                    {busquedaProducto && (
                      <button
                        onClick={() => setBusquedaProducto('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="text-lg">✕</span>
                      </button>
                    )}
                  </div>

                  {/* Filtro por fecha específica */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-lg"></span>
                    </div>
                    <input
                      type="date"
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                      placeholder="Filtrar por día específico"
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    />
                    {filtroFecha && (
                      <button
                        onClick={() => setFiltroFecha('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="text-lg">✕</span>
                      </button>
                    )}
                  </div>

                  {/* Filtro por mes */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-lg"></span>
                    </div>
                    <input
                      type="month"
                      value={filtroMes}
                      onChange={(e) => setFiltroMes(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                    />
                    {filtroMes && (
                      <button
                        onClick={() => setFiltroMes('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="text-lg">✕</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Botón de escanear código de barras */}
                  <div className="flex items-center">
                    <button
                      onClick={() => setMostrarScannerBusqueda(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
                      title="Escanear código de barras para buscar producto"
                    >
                      <span className="text-lg">📷</span>
                      <span>Buscar por código</span>
                    </button>
                  </div>
                </div>
                
                {/* Información de filtros activos */}
                {(busquedaProducto || filtroFecha || filtroMes || filtroCodigo) && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-300">Filtros activos:</span>
                    {busquedaProducto && (
                      <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs">
                        <span>"{busquedaProducto}"</span>
                        <button
                          onClick={() => setBusquedaProducto('')}
                          className="text-green-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {filtroCodigo && (
                      <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs">
                        <span>📷 Código: {filtroCodigo}</span>
                        <button
                          onClick={() => setFiltroCodigo('')}
                          className="text-blue-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                                         {filtroFecha && (
                       <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs">
                         <span>{(() => {
                           // Función para mostrar fecha sin desfase de zona horaria
                           const [year, month, day] = filtroFecha.split('-');
                           return `${day}/${month}/${year}`;
                         })()}</span>
                         <button
                           onClick={() => setFiltroFecha('')}
                           className="text-blue-400 hover:text-white"
                         >
                           ✕
                         </button>
                       </span>
                     )}
                                         {filtroMes && (
                       <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs">
                         <span>{(() => {
                           // Función para mostrar mes sin desfase de zona horaria
                           const [year, month] = filtroMes.split('-');
                           const monthNames = [
                             'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
                           ];
                           const monthIndex = parseInt(month) - 1; // Convertir 1-12 a 0-11
                           return `${monthNames[monthIndex]} de ${year}`;
                         })()}</span>
                         <button
                           onClick={() => setFiltroMes('')}
                           className="text-purple-400 hover:text-white"
                         >
                           ✕
                         </button>
                       </span>
                     )}
                    <button
                      onClick={() => {
                        setBusquedaProducto('');
                        setFiltroFecha('');
                        setFiltroMes('');
                        setFiltroCodigo('');
                        setMostrarTodos(false);
                      }}
                      className="text-gray-400 hover:text-white text-xs underline"
                    >
                      Limpiar todos
                    </button>
                  </div>
                )}
                
                {/* Contador de resultados */}
                {(busquedaProducto || filtroFecha || filtroMes || filtroCodigo) && (
                  <div className="mt-2 text-sm text-gray-300">
                    Mostrando {productosFiltrados.length} de {inventarioRegistrado.length} productos
                  </div>
                )}
                
                {/* Contador cuando no hay filtros activos */}
                {!busquedaProducto && !filtroFecha && !filtroMes && !filtroCodigo && (
                  <div className="mt-2 text-sm text-gray-300">
                    Mostrando {productosAMostrar.length} de {inventarioRegistrado.length} productos
                    {!mostrarTodos && productosFiltrados.length > 30 && (
                      <span className="text-green-300 ml-2">(limitado a 30)</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Botones de descarga PDF */}
            {inventarioRegistrado.length > 0 && (
              <div className="mb-4 flex justify-center gap-3 flex-wrap">
                <button
                  onClick={generarPDFTodosLosCodigos}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
                  title="Descargar todos los códigos de barras generados en un PDF"
                >
                  <span className="text-base">📄</span>
                  <span>Todos los códigos</span>
                </button>
                <button
                  onClick={generarPDFListadoProductos}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
                  title="Descargar listado completo de productos en PDF formato oficio"
                >
                  <span className="text-base">📋</span>
                  <span>Listado productos</span>
                </button>
              </div>
            )}
            
            {inventarioRegistrado.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="text-4xl md:text-6xl mb-3 md:mb-4"></div>
                <p className="text-gray-300 text-base md:text-lg">
                  No hay productos registrados en el inventario
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Agrega tu primer producto usando el formulario de arriba
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="bg-white/10 backdrop-blur-sm">
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Fecha de Ingreso</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Producto</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Código de Barras</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Cantidad</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Unidad</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Costo Total</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Precio Unitario</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Precio Venta</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosAMostrar.map((item, index) => {
                      const estaEditando = editandoId === item.id;
                      
                      return (
                        <tr key={item.id || index} className={`border-b border-white/10 hover:bg-white/5 transition-colors duration-200 ${estaEditando ? 'bg-blue-500/10' : ''}`}>
                          <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                            {formatearFechaCortaChile(item.fecha_ingreso)}
                          </td>
                          <td className="text-white p-2 md:p-4 font-medium text-xs md:text-sm min-w-[200px] md:min-w-[280px]">
                            {estaEditando ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={valoresEdicion.producto}
                                  onChange={(e) => handleEdicionChange('producto', e.target.value)}
                                  className="w-full p-1 md:p-2 bg-white/10 border border-blue-400 rounded text-white text-xs md:text-sm"
                                  placeholder="Nombre del producto"
                                />
                                <div>
                                  <label className="block text-xs text-gray-300 mb-1">Link imagen (opcional)</label>
                                  <input
                                    type="url"
                                    value={valoresEdicion.imagen}
                                    onChange={(e) => handleEdicionChange('imagen', e.target.value)}
                                    className="w-full p-1 md:p-2 bg-white/10 border border-blue-400 rounded text-white text-xs md:text-sm"
                                    placeholder="https://ejemplo.com/imagen.jpg"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="block">{item.producto}</span>
                                {item.imagen && (
                                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                                    <img
                                      src={item.imagen}
                                      alt={item.producto}
                                      className="w-24 h-24 object-cover rounded-lg border border-white/20 shadow-lg"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                            {estaEditando ? (
                              <div className="flex flex-col gap-2 min-w-[150px]">
                                {/* Input para el código */}
                                <input
                                  type="text"
                                  value={valoresEdicion.codigo_interno}
                                  onChange={(e) => handleEdicionChange('codigo_interno', e.target.value.replace(/\D/g, ''))}
                                  placeholder="Código de barras"
                                  className="w-full p-1 md:p-2 bg-white/10 border border-blue-400 rounded text-white text-xs md:text-sm font-mono"
                                  maxLength={13}
                                />
                                {/* Botones de acción */}
                                <div className="flex flex-wrap gap-1">
                                  {/* Botón para generar código */}
                                  <button
                                    type="button"
                                    onClick={handleGenerarCodigoEdicion}
                                    className="flex items-center justify-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-xs rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                    title="Generar código EAN-13 único"
                                  >
                                    <span>⚡</span>
                                    <span>Generar</span>
                                  </button>
                                  {/* Botón para escanear */}
                                  <button
                                    type="button"
                                    onClick={() => setMostrarScanner(true)}
                                    className="flex items-center justify-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                    title="Escanear código de barras"
                                  >
                                    <span>📷</span>
                                    <span>Escanear</span>
                                  </button>
                                  {/* Botón para limpiar código */}
                                  {valoresEdicion.codigo_interno && (
                                    <button
                                      type="button"
                                      onClick={() => handleEdicionChange('codigo_interno', '')}
                                      className="flex items-center justify-center px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-all duration-200"
                                      title="Limpiar código"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                                {/* Información del código durante edición */}
                                {valoresEdicion.codigo_interno && (
                                  <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                                    <p className="text-xs text-green-400">
                                      ✓ {valoresEdicion.codigo_interno}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              item.codigo_interno ? (
                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-mono text-blue-300 font-semibold">{item.codigo_interno}</span>
                                    {item.codigo_interno.toString().startsWith('299') ? (
                                      <span className="text-xs text-purple-400">⚡ Generado</span>
                                    ) : (
                                      <span className="text-xs text-gray-400">📷 Escaneado</span>
                                    )}
                                  </div>
                                  {/* Botón PDF solo para códigos generados automáticamente */}
                                  {item.codigo_interno.toString().startsWith('299') && (
                                    <button
                                      onClick={() => generarPDFCodigoBarras(item.codigo_interno.toString(), item.producto)}
                                      className="flex items-center justify-center gap-1 px-2 py-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                                      title="Descargar PDF del código de barras generado"
                                    >
                                      <span>📄</span>
                                      <span>PDF</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500 italic">Sin código</span>
                              )
                            )}
                          </td>
                          <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                            {estaEditando ? (
                              <input
                                type="number"
                                value={valoresEdicion.cantidad}
                                onChange={(e) => handleEdicionChange('cantidad', e.target.value)}
                                className="w-20 md:w-24 p-1 md:p-2 bg-white/10 border border-blue-400 rounded text-white text-xs md:text-sm"
                                step="0.01"
                                min="0"
                              />
                            ) : (
                              item.cantidad
                            )}
                          </td>
                          <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                            {estaEditando ? (
                              <select
                                value={valoresEdicion.unidad}
                                onChange={(e) => handleEdicionChange('unidad', e.target.value)}
                                className="w-24 md:w-28 p-1 md:p-2 bg-white/10 border border-blue-400 rounded text-white text-xs md:text-sm"
                                style={{ colorScheme: 'dark' }}
                              >
                                <option value="unidad" className="bg-gray-800">unidad</option>
                                <option value="kg" className="bg-gray-800">kg</option>
                                <option value="gr" className="bg-gray-800">gr</option>
                              </select>
                            ) : (
                              item.unidad
                            )}
                          </td>
                          <td className="text-green-300 p-2 md:p-4 font-bold text-xs md:text-sm">
                            {estaEditando ? (
                              <input
                                type="number"
                                value={valoresEdicion.costo_total}
                                onChange={(e) => handleEdicionChange('costo_total', e.target.value)}
                                className="w-24 md:w-28 p-1 md:p-2 bg-white/10 border border-blue-400 rounded text-white text-xs md:text-sm"
                                step="1"
                                min="0"
                              />
                            ) : (
                              `$${parseFloat(item.costo_total).toLocaleString()}`
                            )}
                          </td>
                          <td className="text-blue-300 p-2 md:p-4 font-bold text-xs md:text-sm">
                            {estaEditando ? (
                              <input
                                type="number"
                                value={valoresEdicion.precio_unitario}
                                onChange={(e) => handleEdicionChange('precio_unitario', e.target.value)}
                                className="w-24 md:w-28 p-1 md:p-2 bg-white/10 border border-blue-400 rounded text-white text-xs md:text-sm"
                                step="1"
                                min="0"
                              />
                            ) : (
                              `$${parseFloat(item.precio_unitario).toLocaleString()}`
                            )}
                          </td>
                          <td className="text-yellow-300 p-2 md:p-4 font-bold text-xs md:text-sm">
                            {estaEditando ? (
                              <input
                                type="number"
                                value={valoresEdicion.precio_venta}
                                onChange={(e) => handleEdicionChange('precio_venta', e.target.value)}
                                className="w-24 md:w-28 p-1 md:p-2 bg-white/10 border border-blue-400 rounded text-white text-xs md:text-sm"
                                step="10"
                                min="0"
                              />
                            ) : (
                              `$${parseFloat(item.precio_venta).toLocaleString()}`
                            )}
                          </td>
                          <td className="p-2 md:p-4">
                            {estaEditando ? (
                              <div className="flex gap-1 md:gap-2">
                                <button
                                  onClick={() => guardarEdicion(item.id)}
                                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                                  title="Guardar"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelarEdicion}
                                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                                  title="Cancelar"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1 md:gap-2">
                                <button
                                  onClick={() => iniciarEdicion(item)}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => eliminarInventario(item.id)}
                                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Botón "Ver todo" cuando hay más de 30 productos y no se están mostrando todos */}
                {!mostrarTodos && productosFiltrados.length > 30 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setMostrarTodos(true)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center mx-auto text-sm"
                    >
                      <span className="mr-2"></span>
                      Ver todos los productos ({productosFiltrados.length})
                    </button>
                  </div>
                )}
                
                {/* Botón "Ver menos" cuando se están mostrando todos */}
                {mostrarTodos && productosFiltrados.length > 30 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setMostrarTodos(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center mx-auto text-sm"
                    >
                      <span className="mr-2"></span>
                      Ver solo los primeros 30
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />

      {/* Modal del Escáner de Código de Barras (para agregar/editar) */}
      <BarcodeScanner
        isOpen={mostrarScanner}
        onScan={(code) => {
          // Si estamos editando, actualizar valoresEdicion; si no, actualizar codigoInterno
          if (editandoId) {
            setValoresEdicion(prev => ({
              ...prev,
              codigo_interno: code
            }));
          } else {
            setCodigoInterno(code);
          }
          setMostrarScanner(false);
        }}
        onClose={() => setMostrarScanner(false)}
        title="Escanear Código de Barras"
      />

      {/* Modal del Escáner de Código de Barras (para buscar/filtrar) */}
      <BarcodeScanner
        isOpen={mostrarScannerBusqueda}
        onScan={(code) => {
          // Aplicar filtro por código de barras
          setFiltroCodigo(code);
          setMostrarScannerBusqueda(false);
        }}
        onClose={() => setMostrarScannerBusqueda(false)}
        title="Escanear Código para Buscar Producto"
      />
    </div>
  );
};

export default RegistroInventario;