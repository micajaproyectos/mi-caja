import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { DEFAULT_HINTS, normalizeHints } from '../lib/schemaHints';
import { calcularPrecioUnitario, calcularPrecioVenta, calcularMargen, formatearPrecioCLP } from '../lib/pricing';
import Footer from './Footer';
import { Document, Page, pdfjs } from 'react-pdf';
import { authService } from '../lib/authService.js';
import { obtenerFechaHoyChile } from '../lib/dateUtils.js';

// Configurar el worker de PDF.js para react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// Constantes para cálculos
const GANANCIA_GLOBAL_DEFAULT = 30; // 30% por defecto

// Config de firma Supabase (TTL en segundos)
const SIGNED_URL_TTL = 1200; // 20 min (>= 900 s)

// Flag de depuración global para este componente
const DEBUG = false; // Activar logs verbosos solo en debug

const InventarioIA = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [selectedFile, setSelectedFile] = useState(null);
  const [draft, setDraft] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Antirrebote para "Procesar IA"
  const [haProcesado, setHaProcesado] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: 'info' });
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [gananciaGlobal, setGananciaGlobal] = useState(GANANCIA_GLOBAL_DEFAULT);
  const [showSchemaHints, setShowSchemaHints] = useState(false);
  const [schemaHints, setSchemaHints] = useState(DEFAULT_HINTS);
  const [debugInfo, setDebugInfo] = useState(null);

  // Estados para previsualización con encuadre
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [croppedFile, setCroppedFile] = useState(null);
  const [pdfPageDimensions, setPdfPageDimensions] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  
  // Estado para verificación robusta de recorte
  const [hasCropSignedUrl, setHasCropSignedUrl] = useState(false);
  
  // Estados de autenticación
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Ref para evitar doble inicialización de IndexedDB en React Strict Mode
  const dbInitializedRef = useRef(false);
  
  // Estado para trackear si IndexedDB falló
  const [usingDefaults, setUsingDefaults] = useState(false);
  
  // Refs para el canvas del PDF
  const pageContainerRef = useRef(null);
  const pageCanvasRef = useRef(null);
  const [pageReady, setPageReady] = useState(false);
  
  // Refs para el canvas de imagen
  const imageCanvasRef = useRef(null);
  const [imageReady, setImageReady] = useState(false);
  
  // Estados para campos a detectar (ya declarado arriba)

  // Constantes
  const unidadesValidas = useMemo(() => [
    'un', 'unid', 'unidad',         // Unidades (en minúsculas para consistencia)
    'kg', 'g', 'gr',                // Peso (en minúsculas para consistencia)
    'lt', 'l', 'ml', 'cc',          // Volumen (en minúsculas para consistencia)
    'caja', 'paq', 'pack',          // Empaques
    'm', 'cm', 'mm',                // Longitud
    'm2', 'cm2',                    // Área
    'par', 'doc', 'docena',         // Cantidades comerciales
    'rollo', 'metro', 'pieza'       // Otros
  ], []);

  // Debug temporal para verificar unidadesValidas (solo en desarrollo)
  if (DEBUG && process.env.NODE_ENV !== 'production') console.log('🔍 [EFFECT] Debug unidadesValidas:', unidadesValidas);
  const supabaseUrl = 'https://pvgahmommdbfzphyywut.supabase.co';

  // Derivados estables para gating del botón
  const esPdfMemo = useMemo(() => selectedFile?.type === 'application/pdf', [selectedFile?.type]);
  const hasCroppedMemo = useMemo(() => Boolean(croppedFile?.path), [croppedFile?.path]);

  // Log del estado del botón (solo cuando cambien los valores relevantes y en desarrollo)
  useEffect(() => {
    if (!DEBUG || process.env.NODE_ENV === 'production') return;
    console.log('🔍 [EFFECT] Debug Botón Procesar IA:', {
      esPdf: esPdfMemo,
      hasCropped: hasCroppedMemo,
      croppedPath: croppedFile?.path,
      isCropping,
      isProcessing
    });
  }, [DEBUG, esPdfMemo, hasCroppedMemo, croppedFile?.path, isCropping, isProcessing]);

  // Helpers
  const mostrarMensaje = useCallback((tipo, mensaje) => {
    setMensaje({ texto: mensaje, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 5000);
  }, []);

  // Función para calcular precios (usando las nuevas fórmulas)
  const calcularPrecios = useCallback((item) => {
    const precioUnitario = calcularPrecioUnitario(item.costo_total, item.cantidad);
    const margen = calcularMargen(item.porcentaje_ganancia, gananciaGlobal);
    const precioVenta = calcularPrecioVenta(precioUnitario, margen);
    
    return {
      precioUnitario: formatearPrecioCLP(precioUnitario),
      precioVenta: formatearPrecioCLP(precioVenta)
    };
  }, [gananciaGlobal, calcularPrecioUnitario, calcularMargen, calcularPrecioVenta, formatearPrecioCLP]);

  // Función para normalizar MIME types (image/jpg → image/jpeg)
  const normalizarMimeType = useCallback((mimeType) => {
    if (mimeType === 'image/jpg') {
      return 'image/jpeg';
    }
    return mimeType;
  }, []);

  // Subir un Blob/File a previews y devolver path
  const subirAPreviews = useCallback(async (archivo) => {
    const userId = currentUser?.id;
    if (!userId) throw new Error('No autenticado');
    if (!(archivo instanceof Blob)) throw new Error('Archivo no es Blob');
    const bucketName = 'inventario-ia';
    const type = normalizarMimeType(archivo.type || 'image/jpeg');
    const ext = type === 'image/png' ? 'png' : 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const previewPath = `${userId}/previews/${fileName}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('📤 Subiendo a previews:', {
        path: previewPath,
        type,
        isBlob: archivo instanceof Blob,
        size: archivo.size
      });
    }

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(previewPath, archivo, { upsert: true, contentType: type });
    if (uploadError) throw new Error(`Upload previews falló: ${uploadError.message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Subido a previews:', previewPath);
    }
    return { previewPath, type };
  }, [currentUser, normalizarMimeType]);

  // Función para verificación robusta de recorte
  const esImagenRecortada = useCallback((url) => {
    if (!url) return false;
    // Verifica que sea una URL de preview con extensión de imagen
    return /\/previews\/.*\.(jpg|jpeg|png)(\?|$)/i.test(url);
  }, []);

  // Función para normalizar schemaHints usando la utilidad importada
  const normalizarSchemaHints = useCallback(() => {
    return normalizeHints(schemaHints);
  }, [schemaHints]);

  // Función para mostrar información de depuración de schemaHints
  const mostrarDebugSchemaHints = useCallback(() => {
    const normalized = normalizarSchemaHints();
    console.log('🔍 Debug SchemaHints:');
    console.log('  Originales:', schemaHints);
    console.log('  Normalizados:', normalized);
    console.log('  Cantidad de sinónimos por campo:');
    Object.entries(normalized).forEach(([key, value]) => {
      const synonyms = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      console.log(`    ${key}: ${synonyms.length} sinónimos - [${synonyms.join(', ')}]`);
    });
  }, [schemaHints, normalizarSchemaHints]);


  // Función para validar item
  const validarItem = useCallback((item) => {
    const errores = [];
    if (!item.producto?.trim()) errores.push('Producto requerido');
    if (!item.cantidad || parseFloat(item.cantidad) <= 0) errores.push('Cantidad válida requerida');
    
    // Validación de unidad más robusta
    if (!item.unidad?.trim()) {
      errores.push('Unidad requerida');
    } else {
      const unidadNormalizada = item.unidad.toLowerCase().trim();
      if (DEBUG && process.env.NODE_ENV !== 'production') {
        console.log('🔍 Debug validación unidad:', {
          unidadOriginal: item.unidad,
          unidadNormalizada,
          unidadesValidas,
          esValida: unidadesValidas.includes(unidadNormalizada)
        });
      }
      
      if (!unidadesValidas.includes(unidadNormalizada)) {
        // Mostrar solo las unidades más comunes para el mensaje de error
        const unidadesComunes = ['unidad', 'kg', 'gr'];
        errores.push(`Unidad no válida: "${item.unidad}". Unidades válidas: ${unidadesComunes.join(', ')}`);
      }
    }
    
    if (item.costo_total === null || item.costo_total === undefined || item.costo_total === '') {
      errores.push('Costo total requerido');
    } else if (parseFloat(item.costo_total) < 0) {
      errores.push('Costo total no puede ser negativo');
    }
    return errores;
  }, [unidadesValidas]);

  // Función para validar draft completo
  const validarDraft = useCallback(() => {
    if (!draft?.items || !Array.isArray(draft.items)) return false;
    return draft.items.every(item => validarItem(item).length === 0);
  }, [draft?.items, validarItem]);

  // Validación memoizada para evitar re-cálculos en render
  const draftValidation = useMemo(() => {
    if (!draft?.items || !Array.isArray(draft.items)) return { isValid: false, errorsByIndex: [] };
    const errorsByIndex = draft.items.map(item => validarItem(item));
    const isValid = errorsByIndex.every(arr => arr.length === 0);
    return { isValid, errorsByIndex };
  }, [draft?.items, validarItem]);

  // Recalcular precios cuando cambia ganancia global
  useEffect(() => {
    if (draft?.items && draft.items.length > 0) {
      setDraft(prevDraft => ({
        ...prevDraft,
        items: prevDraft.items.map(item => ({
          ...item,
          precio_unitario: calcularPrecioUnitario(item.costo_total, item.cantidad),
          margen: calcularMargen(item.porcentaje_ganancia, gananciaGlobal),
          precio_venta: calcularPrecioVenta(
            calcularPrecioUnitario(item.costo_total, item.cantidad),
            calcularMargen(item.porcentaje_ganancia, gananciaGlobal)
          )
        }))
      }));
    }
  }, [gananciaGlobal, calcularPrecioUnitario, calcularMargen, calcularPrecioVenta]);

  // Función para actualizar item con recálculo automático de precios
  const actualizarItem = useCallback((id, campo, valor) => {
    setDraft(prev => {
      const nuevoDraft = { ...prev };
      const itemIndex = nuevoDraft.items.findIndex(item => item.id === id);
      
      if (itemIndex !== -1) {
        const item = { ...nuevoDraft.items[itemIndex] };
        item[campo] = valor;
        
        // Recalcular precios derivados si cambian campos que los afectan
        if (['cantidad', 'costo_total', 'porcentaje_ganancia'].includes(campo)) {
          item.precio_unitario = calcularPrecioUnitario(item.costo_total, item.cantidad);
          item.margen = calcularMargen(item.porcentaje_ganancia, gananciaGlobal);
          item.precio_venta = calcularPrecioVenta(item.precio_unitario, item.margen);
        }
        
        nuevoDraft.items[itemIndex] = item;
      }
      
      return nuevoDraft;
    });
  }, [gananciaGlobal, calcularPrecioUnitario, calcularMargen, calcularPrecioVenta]);

  // Función para eliminar item
  const eliminarItem = useCallback((id) => {
    setDraft(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  }, []);

  // Función para agregar item manualmente
  const agregarItemManual = useCallback(() => {
    const nuevoItem = {
      id: crypto.randomUUID(),
      producto: '',
      cantidad: '',
      unidad: '',
      costo_total: '',
      porcentaje_ganancia: gananciaGlobal,
      precio_unitario: 0,
      margen: gananciaGlobal,
      precio_venta: 0,
      showUnidadDropdown: false
    };

    setDraft(prev => ({
      ...prev,
      items: [...prev.items, nuevoItem]
    }));

    mostrarMensaje('info', 'Nuevo elemento agregado. Completa los campos requeridos.');
  }, [gananciaGlobal, mostrarMensaje]);

  // Función para auto-resize del textarea
  const handleTextareaResize = useCallback((e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 128); // max 8rem (128px)
    textarea.style.height = newHeight + 'px';
    
    // Ajustar la altura de la fila si es necesario para mantener compacta
    const row = textarea.closest('tr');
    if (row) {
      row.style.height = Math.max(32, newHeight + 16) + 'px'; // 32px mínimo + padding
    }
  }, []);

  // Función para cargar schemaHints desde IndexedDB
  const cargarSchemaHints = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dbName = 'InventarioIA';
      const request = indexedDB.open(dbName, 1);

      request.onerror = (event) => {
        const err = event?.target?.error;
        console.warn('⚠️ No se pudo abrir IndexedDB para schemaHints, usando defaults en memoria', {
          name: err?.name,
          message: err?.message
        });
        // Usar defaultsHints en memoria si falla IndexedDB
        setSchemaHints(DEFAULT_HINTS);
        setUsingDefaults(true);
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('schemaHints')) {
          console.log('📝 Creando object store schemaHints...');
          const version = db.version + 1;
          db.close();
          const newRequest = indexedDB.open(dbName, version);
          newRequest.onupgradeneeded = (event) => {
            const newDb = event.target.result;
            newDb.createObjectStore('schemaHints', { keyPath: 'id' });
          };
          newRequest.onsuccess = () => {
            const newDb = newRequest.result;
            const transaction = newDb.transaction(['schemaHints'], 'readwrite');
            const store = transaction.objectStore('schemaHints');
            store.put({
              id: `inventarioIA:schemaHints:${user.id}`,
              hints: DEFAULT_HINTS,
              updatedAt: new Date().toISOString()
            });
            setSchemaHints(DEFAULT_HINTS);
          };
          newRequest.onerror = (event) => {
            const err2 = event?.target?.error;
            console.warn('⚠️ Error creando object store, usando defaults en memoria', {
              name: err2?.name,
              message: err2?.message
            });
            setSchemaHints(DEFAULT_HINTS);
            setUsingDefaults(true);
          };
          return;
        }
        
        const transaction = db.transaction(['schemaHints'], 'readonly');
        const store = transaction.objectStore('schemaHints');
        const getRequest = store.get(`inventarioIA:schemaHints:${user.id}`);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('✅ SchemaHints cargados desde IndexedDB');
            }
            setSchemaHints(getRequest.result.hints);
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log('📝 No hay schemaHints guardados, usando defaults');
            }
            setSchemaHints(DEFAULT_HINTS);
          }
        };
        
        getRequest.onerror = (event) => {
          const err3 = event?.target?.error;
          console.warn('⚠️ Error leyendo schemaHints, usando defaults en memoria', {
            name: err3?.name,
            message: err3?.message
          });
          setSchemaHints(DEFAULT_HINTS);
          setUsingDefaults(true);
        };
      };
    } catch (error) {
      console.warn('⚠️ Error cargando schemaHints:', error, 'usando defaults en memoria');
      setSchemaHints(DEFAULT_HINTS);
      setUsingDefaults(true);
    }
  }, []);

  // Función para guardar schemaHints en IndexedDB
  const guardarSchemaHints = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dbName = 'InventarioIA';
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => {
        console.warn('⚠️ No se pudo abrir IndexedDB para guardar schemaHints');
        // No bloquear el flujo, solo mostrar warning
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        
        // Crear object store si no existe
        if (!db.objectStoreNames.contains('schemaHints')) {
          console.log('📝 Creando object store schemaHints para guardar...');
          const version = db.version + 1;
          db.close();
          const newRequest = indexedDB.open(dbName, version);
          newRequest.onupgradeneeded = (event) => {
            const newDb = event.target.result;
            newDb.createObjectStore('schemaHints', { keyPath: 'id' });
          };
          newRequest.onsuccess = () => {
            const newDb = newRequest.result;
            const transaction = newDb.transaction(['schemaHints'], 'readwrite');
            const store = transaction.objectStore('schemaHints');
            store.put({
              id: `inventarioIA:schemaHints:${user.id}`,
              hints: schemaHints,
              updatedAt: new Date().toISOString()
            });
                      if (process.env.NODE_ENV !== 'production') {
            console.log('✅ SchemaHints guardados en nuevo object store');
          }
        };
          newRequest.onerror = () => {
            console.warn('⚠️ Error creando object store para guardar schemaHints');
          };
        } else {
          const transaction = db.transaction(['schemaHints'], 'readwrite');
          const store = transaction.objectStore('schemaHints');
          store.put({
            id: `inventarioIA:schemaHints:${user.id}`,
            hints: schemaHints,
            updatedAt: new Date().toISOString()
          });
          if (process.env.NODE_ENV !== 'production') {
            console.log('✅ SchemaHints guardados en IndexedDB');
          }
        }
      };
    } catch (error) {
      console.warn('⚠️ Error guardando schemaHints:', error);
      // No bloquear el flujo, solo mostrar warning
    }
  }, [schemaHints]);

  // Función para extraer texto de PDF
  const extractPdfText = useCallback(async (file) => {
    try {
      console.log('🔍 Debug extractPdfText:', {
        file: file,
        pdfjs: typeof pdfjs,
        pdfjsKeys: pdfjs ? Object.keys(pdfjs) : 'undefined'
      });
      
      // Verificar si pdfjs-dist está disponible
      if (typeof pdfjs !== 'undefined') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const tc = await page.getTextContent();
          text += tc.items.map(i => i.str).join(" ") + "\n\n";
        }
        return text;
      } else {
        throw new Error('PDF sin extractor disponible');
      }
    } catch (error) {
      console.error('Error extrayendo texto de PDF:', error);
      throw error;
    }
  }, []);

  // Función auxiliar para parsear JSON de markdown de manera robusta
  const parseJsonFromMarkdown = useCallback((text) => {
    // Primero intentar parsear como JSON directo
    try {
      return JSON.parse(text);
    } catch (parseError) {
      // Si falla, buscar markdown con JSON
      if (text.includes('```json')) {
        // Buscar el contenido entre ```json y ```, manejando saltos de línea
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const extractedJson = JSON.parse(jsonMatch[1].trim());
            return extractedJson;
          } catch (extractError) {
            console.error('Error parseando JSON extraído del markdown:', extractError);
            throw new Error('No se pudo extraer JSON válido del markdown');
          }
        }
      }
      // Si no hay markdown o no se puede extraer, lanzar error
      throw new Error('No se pudo parsear JSON de la respuesta');
    }
  }, []);

    const procesarConIA = useCallback(async () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🚀 procesarConIA: Handler ejecutado');
      
      // LOG del estado actual dentro del handler
      console.log('📊 Estado en handler:', {
        croppedFile,
        croppedFilePath: croppedFile?.path,
        croppedFileKeys: croppedFile ? Object.keys(croppedFile) : null,
        selectedFileType: selectedFile?.type,
        esPdf: selectedFile?.type === 'application/pdf'
      });
    }
    
    // Antirrebote: evitar doble click en "Procesar IA"
    if (isProcessing) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Guard: isProcessing ya es true, ignorando click adicional');
      }
      return;
    }
    
    // Marcar como procesando INMEDIATAMENTE
    setIsProcessing(true);
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ isProcessing: ON');
    }
    
    if (!selectedFile) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ Guard: No hay archivo seleccionado');
      }
      mostrarMensaje('error', 'Debe seleccionar un archivo');
      setIsProcessing(false);
      return;
    }
    
    // Gate para PDFs: verificar que tengan recorte aplicado
    const esPdf = selectedFile.type === 'application/pdf';
    const tienePath = Boolean(croppedFile?.path);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Guard check:', { esPdf, tienePath, path: croppedFile?.path });
    }
    
    if (esPdf && !tienePath) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ Guard: PDF sin croppedFile.path');
      }
      mostrarMensaje('error', 'Para procesar PDFs, primero aplica un recorte usando "Aplicar Encuadre"');
      setIsProcessing(false);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('🚀 Procesando archivo:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        sizeKB: (selectedFile.size / 1024).toFixed(2)
      });

      // Log de schemaHints que se envían
      const normalizedHints = normalizarSchemaHints();
      console.log('🎯 SchemaHints normalizados que se envían:', normalizedHints);
      console.log('🎯 SchemaHints originales:', schemaHints);
    }

    let response;
    const ac = new AbortController(); // AbortController para cancelar fetch al cambiar de vista
    
    try {
      console.log('📋 Iniciando try block');
      setLoading(true);

      // Determinar modo y fileType basado en el estado del recorte
      let mode, url, fileType;
      
      // Caso recorte (PDF recortado o imagen recortada)
      if (croppedFile?.path) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📋 Procesando archivo con recorte aplicado, path existente:', croppedFile.path);
        }
        
        // Generar signedUrl justo antes del fetch (no reutilizar del estado)
        const userId = currentUser?.id;
        if (!userId) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('❌ Guard: No hay currentUser.id');
          }
          mostrarMensaje('error', 'Debe iniciar sesión para procesar recortes');
          setIsProcessing(false);
          return;
        }
        
        const bucketName = 'inventario-ia';
        
        // Usar el path existente de croppedFile
        const previewPath = croppedFile.path;
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔑 Firmando path existente:', previewPath);
        }
        
        // Generar signedUrl justo antes del fetch
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(previewPath, SIGNED_URL_TTL);
        
        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.warn('⚠️ No se pudo generar signedUrl:', signedUrlError?.message || 'data vacío');
          setIsProcessing(false);
          return;
        }
        
        // Usar la URL recién firmada
        url = signedUrlData.signedUrl;
        fileType = croppedFile.type === 'image/jpg' ? 'image/jpeg' : croppedFile.type;
        mode = 'imageSignedUrl';
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('🎯 Procesando con recorte aplicado:', { mode, fileType, path: previewPath });
          
          // Log seguro de firma
          console.log('✅ Firma de recorte OK', { ttl: SIGNED_URL_TTL, hasSignedUrl: Boolean(url) });
        }
        
      } else if (selectedFile.type.startsWith('image/')) {
        // Imagen: se procesará más abajo firmando previews/ (sin subir aquí)
        console.log('🖼️ Imagen seleccionada; se firmará previews/ si existe path');
      } else {
        // PDF sin recorte: NO PERMITIDO
        mostrarMensaje('error', 'Para procesar PDFs, primero aplica un recorte');
        setIsProcessing(false);
        return;
      }
      
      // ✅ LOG: Verificar estado de croppedFile antes de procesar (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Estado de croppedFile antes de procesar:', {
          croppedFile,
          hasPath: !!croppedFile?.path,
          path: croppedFile?.path,
          keys: croppedFile ? Object.keys(croppedFile) : null
        });
      }
      
      // Usar archivo recortado si está disponible, sino el original
      const fileToProcess = croppedFile?.path ? croppedFile : selectedFile;
      
      // Validar que el bbox sea válido antes de procesar (solo para PDFs)
      if (fileToProcess.type === 'application/pdf' && croppedFile?.path && croppedFile?.cropMetadata) {
        if (!croppedFile.cropMetadata.bbox || 
            !croppedFile.cropMetadata.bbox.w || 
            !croppedFile.cropMetadata.bbox.h ||
            croppedFile.cropMetadata.bbox.w <= 0 || 
            croppedFile.cropMetadata.bbox.h <= 0) {
          console.error('❌ Bbox inválido en croppedFile:', croppedFile.cropMetadata);
          mostrarMensaje('error', 'El área de recorte no es válida. Aplica el encuadre nuevamente.');
          setIsProcessing(false);
          return;
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Bbox válido:', croppedFile.cropMetadata.bbox);
          
          // Log de tamaño útil del recorte
          const cropArea = croppedFile.cropMetadata?.bbox;
          if (cropArea) {
            const cropAreaPx = cropArea.w * cropArea.h;
            const cropW = Math.round(cropArea.w * (pdfPageDimensions?.width || 1000));
            const cropH = Math.round(cropArea.h * (pdfPageDimensions?.height || 1000));
            const areaPx = cropW * cropH;
            
            console.log('📐 Tamaño útil del recorte:', {
              cropW: `${cropW}px`,
              cropH: `${cropH}px`,
              areaPx: `${areaPx.toLocaleString()}px²`,
              blobSize: `${(croppedFile.size / 1024).toFixed(1)}KB`,
              meetsMinSize: cropW >= 600 && cropH >= 200,
              meetsMinArea: areaPx >= 120000,
              meetsMinBlob: croppedFile.size > 10240
            });
            
            if (!(cropW >= 600 && cropH >= 200) || !(areaPx >= 120000) || !(croppedFile.size > 10240)) {
              console.warn('⚠️ Recorte puede ser muy pequeño para OCR efectivo');
            }
          }
        }
      }
      
      // Procesar según el tipo de archivo
      if (fileToProcess.type === 'image/png' || fileToProcess.type === 'image/jpeg') {
        // Imágenes: no subir aquí; firmar previews/ existente
        const bucketName = 'inventario-ia';
        const previewPath = croppedFile?.path;
        if (!previewPath) {
          console.warn('⚠️ Imagen sin path en previews. Suba/recorte antes de procesar.');
          mostrarMensaje('error', 'Seleccione y recorte la imagen antes de procesar');
          setIsProcessing(false);
          return;
        }
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(previewPath, SIGNED_URL_TTL);
        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.warn('⚠️ No se pudo generar signedUrl (imagen):', signedUrlError?.message || 'data vacío');
          setIsProcessing(false);
          return;
        }
        url = signedUrlData.signedUrl;
        fileType = fileToProcess.type === 'image/jpg' ? 'image/jpeg' : fileToProcess.type;
        mode = 'imageSignedUrl';
      } else {
        mostrarMensaje('error', 'Solo se permiten archivos PNG, JPEG o PDF');
        setIsProcessing(false); // Resetear para no dejar botón bloqueado
        return;
      }
      
      // Normalizar schemaHints antes de crear el payload
      const normalizedHints = normalizarSchemaHints();
      
      // Crear payload común para todos los casos
      const payload = { 
        mode, 
        url, 
        fileType, 
        schemaHints: {
          ...normalizedHints,
          ocrLang: 'spa',
          numberLocale: 'es-CL'
        }, 
        debug: true 
      };
      
      // Log de sanity antes del fetch (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        console.log('Payload sanity', {
          mode: payload.mode,
          hasUrl: Boolean(payload.url),
          fileType: payload.fileType,
          hasText: 'text' in payload // Debe ser false
        });
      }
      
      // Obtener token de sesión para la autorización
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔐 Obteniendo sesión...');
      }
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('❌ Guard: No hay session.access_token');
        }
        throw new Error('No se pudo obtener token de acceso');
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Token obtenido');
      }
      
      // Fetch común para todos los casos
      response = await fetch(`${supabaseUrl}/functions/v1/inventario-ia-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
        signal: ac.signal
      });

                // Obtener el texto de la respuesta UNA SOLA VEZ
          const responseText = await response.text();
          
          // Logs de respuesta (solo en desarrollo)
          if (process.env.NODE_ENV !== 'production') {
            console.log('📡 Respuesta raw de la Edge Function:', responseText);
            console.log('📡 Status:', response.status);
            console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));
            
            // Logs específicos de Edge Function para debugging
            console.log('🔧 Logs de Edge Function esperados:', {
              bytesLength: '> 0 (archivo recibido)',
              decodificacion: 'width × height del archivo',
              textoOCR: '> 0 (legibilidad suficiente)',
              mode: payload?.mode, // Debe ser 'signedUrl' o 'imageSignedUrl'
              fileType: payload?.fileType // Debe ser 'application/pdf' o 'image/jpeg'|'image/png'
            });
            
            // Verificar HTTP 200 en Network
            console.log('🌐 Verificando respuesta HTTP:', {
              status: response?.status,
              statusText: response?.statusText,
              ok: response?.ok,
              expectedStatus: 200
            });
          }
          
          // Si no es HTTP 200, loguear res.text() cuando no sea JSON
          if (!response?.ok) {
            const contentType = response?.headers?.get('content-type');
            const isJson = contentType && contentType.includes('application/json');
            
            console.warn('⚠️ Respuesta no exitosa:', {
              status: response?.status,
              statusText: response?.statusText,
              contentType,
              isJson
            });
            
            if (!isJson) {
              console.warn('⚠️ Contenido no-JSON de respuesta:', await response?.text());
            }
          }

      // Verificar si la respuesta fue exitosa
      if (!response?.ok) {
        let errorData;
        
        try {
          errorData = parseJsonFromMarkdown(responseText);
        } catch (parseError) {
          // Si no se puede parsear, crear un error genérico
          errorData = { error: `Error del servidor: ${response?.status} ${response?.statusText}` };
        }
        
        throw new Error(errorData.error || 'Error procesando documento');
      }

      // Procesar respuesta exitosa usando el mismo responseText
      let result;

      try {
        result = parseJsonFromMarkdown(responseText);
        
        // Logs de respuesta parseada (solo en desarrollo)
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔍 Respuesta parseada:', result);
          console.log('🔍 Tipo de result:', typeof result);
          console.log('🔍 response.draft:', result.draft);
          console.log('🔍 Es array?', Array.isArray(result.draft));
          
          // Log de diagnostics si existe
          if (result?.diagnostics) {
            console.log('🔍 Diagnostics:', result.diagnostics);
            if (result.diagnostics?.header_map) {
              console.log('🔍 Header map detectado:', result.diagnostics.header_map);
            }
          }
        }
        
        // Guardar información de depuración
        setDebugInfo({
          schemaHints: schemaHints,
          normalizedHints: normalizedHints,
          response: result,
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        throw new Error('Respuesta del servidor no es JSON válido');
      }

      // Verificar si hay draft válido en la respuesta
      if (result?.draft && Array.isArray(result.draft) && result.draft.length > 0) {
        // Agregar IDs únicos a los items del draft con cálculos automáticos
        const itemsConIds = result.draft.map(item => {
          const precioUnitario = calcularPrecioUnitario(item.costo_total, item.cantidad);
          const margen = calcularMargen(item.porcentaje_ganancia || gananciaGlobal, gananciaGlobal);
          const precioVenta = calcularPrecioVenta(precioUnitario, margen);
          
          return {
            ...item,
            id: crypto.randomUUID(),
            porcentaje_ganancia: item.porcentaje_ganancia || gananciaGlobal,
            precio_unitario: precioUnitario,
            margen: margen,
            precio_venta: precioVenta
          };
        });
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Draft procesado desde response.draft:', itemsConIds);
          console.log('📊 Alimentando tabla con', itemsConIds.length, 'ítems del draft');
        }
        setDraft({ items: itemsConIds });
        setHaProcesado(true);
        
        // Mensaje de éxito con información detallada
        const mensajeExito = `✅ Extraídos ${result.draft?.length || 0} ítems`;
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          const indicesErrores = result.errors.map((_, index) => index + 1).join(', ');
          mostrarMensaje('success', `${mensajeExito}, errores en índices: ${indicesErrores}`);
        } else {
          mostrarMensaje('success', mensajeExito);
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ No se encontró draft válido en response.draft:', result);
          
          // Mostrar información de depuración detallada
          if (result?.diagnostics) {
            console.warn('⚠️ Diagnostics disponibles:', result.diagnostics);
            if (result.diagnostics?.header_map) {
              console.warn('⚠️ Headers detectados:', result.diagnostics.header_map);
            }
            if (result.diagnostics?.extracted_text) {
              console.warn('⚠️ Texto extraído (primeras 500 chars):', result.diagnostics.extracted_text.substring(0, 500));
            }
            if (result.diagnostics?.schema_hints_used) {
              console.warn('⚠️ Schema hints utilizados:', result.diagnostics.schema_hints_used);
            }
          }
          
          // Mostrar información del archivo procesado
          console.warn('📄 Información del archivo procesado:', {
            nombre: selectedFile?.name,
            tipo: selectedFile?.type,
            tamaño: selectedFile?.size,
            tamañoKB: selectedFile ? (selectedFile.size / 1024).toFixed(2) : 'N/A'
          });
          
          // Mostrar schema hints que se enviaron
          console.warn('🎯 Schema hints enviados:', normalizarSchemaHints());
        }
        
        setDraft({ items: [] });
        setHaProcesado(true);
        
        // Mensaje más informativo para el usuario
        let mensajeUsuario = 'No se pudo extraer información del documento. ';
        if (result?.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          mensajeUsuario += `Errores detectados: ${result.errors.length}. `;
        }
        mensajeUsuario += 'Revisa la consola para más detalles.';
        
        mostrarMensaje('warning', mensajeUsuario);
      }

    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ ERROR en procesarConIA:', error.message);
        console.log('❌ Stack:', error.stack);
      }
      
      // Ignorar AbortError (cambio de vista)
      if (error.name === 'AbortError') {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔄 Fetch cancelado por cambio de vista');
        }
        return;
      }
      
      console.error('Error procesando con IA:', error);
      mostrarMensaje('error', 'Error procesando documento: ' + error.message);
    } finally {
      // Cleanup: abortar fetch pendiente
      ac.abort();
      
      setIsProcessing(false); // Resetear flag de procesamiento
      setLoading(false);
    }
  }, [selectedFile, extractPdfText, gananciaGlobal, mostrarMensaje, parseJsonFromMarkdown, normalizarSchemaHints, schemaHints, isProcessing, croppedFile, currentUser, hasCropSignedUrl]);

  // Función para guardar borrador en IndexedDB
  const guardarBorrador = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        mostrarMensaje('error', 'Debe iniciar sesión para guardar el borrador');
        return;
      }

      // Implementación simple de IndexedDB
      const dbName = 'InventarioIA';
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => {
        throw new Error('No se pudo abrir IndexedDB');
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['drafts'], 'readwrite');
        const store = transaction.objectStore('drafts');
        
        const draftData = {
          user_id: user.id,
          fechaIngreso,
          gananciaGlobal,
          items: draft.items,
          updatedAt: new Date().toISOString()
        };

        const putRequest = store.put(draftData);
        putRequest.onsuccess = () => {
          mostrarMensaje('success', 'Borrador guardado correctamente');
        };
        putRequest.onerror = () => {
          throw new Error('Error guardando en IndexedDB');
        };
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'user_id' });
        }
      };

    } catch (error) {
      console.error('Error guardando borrador:', error);
      mostrarMensaje('error', 'Error guardando borrador');
    }
  }, [draft.items, fechaIngreso, gananciaGlobal, mostrarMensaje]);

  // Función para aplicar a inventario
const aplicarAInventario = useCallback(async () => {
  if (!validarDraft()) {
    mostrarMensaje('error', 'Hay errores en el borrador que deben corregirse');
    return;
  }

  try {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      mostrarMensaje('error', 'Debe iniciar sesión para aplicar al inventario');
      return;
    }

    // Validación adicional antes de enviar a la Edge
    const itemsValidos = draft.items.filter(item => {
      // Verificar que las unidades sean válidas según la Edge
      const unidadValida = ['unidad', 'kg', 'gr'].includes(item.unidad?.toLowerCase().trim());
      if (!unidadValida) {
        console.warn(`Unidad inválida: ${item.unidad} en producto: ${item.producto}`);
      }
      
      // Verificar que todos los campos requeridos estén presentes
      const tieneProducto = item.producto && item.producto.trim().length > 0;
      const tieneCantidad = item.cantidad && parseFloat(item.cantidad) > 0;
      const tieneCostoTotal = item.costo_total && parseFloat(item.costo_total) >= 0;
      const tienePrecioUnitario = item.precio_unitario && parseFloat(item.precio_unitario) >= 0;
      const tienePrecioVenta = item.precio_venta && parseFloat(item.precio_venta) >= 0;
      
      if (!tieneProducto || !tieneCantidad || !tieneCostoTotal || !tienePrecioUnitario || !tienePrecioVenta) {
        console.warn(`Campos faltantes en producto: ${item.producto}`, {
          producto: tieneProducto,
          cantidad: tieneCantidad,
          costo_total: tieneCostoTotal,
          precio_unitario: tienePrecioUnitario,
          precio_venta: tienePrecioVenta
        });
      }
      
      return unidadValida && tieneProducto && tieneCantidad && tieneCostoTotal && tienePrecioUnitario && tienePrecioVenta;
    });

    if (itemsValidos.length === 0) {
      mostrarMensaje('error', 'No hay ítems válidos para enviar. Verifica que todos los campos estén completos y las unidades sean válidas (unidad, kg, gr)');
      return;
    }

    // Armar el payload con los valores calculados del borrador
    const payload = {
      // La Edge requiere fechaIngreso (no fecha_ingreso) y debe existir siempre
      // Usar UTC a mediodía para evitar problemas de zona horaria
      fechaIngreso: fechaIngreso ? `${fechaIngreso}T12:00:00Z` : `${obtenerFechaHoyChile()}T12:00:00Z`,
      items: itemsValidos.map(item => {
        // Normalizar costo_total: si es string con formato chileno (1.299,35), convertirlo correctamente
        let costoTotalNormalizado = item.costo_total;
        const costoOriginal = costoTotalNormalizado;
        
        if (typeof costoTotalNormalizado === 'string') {
          // Remover puntos (separadores de miles) y reemplazar coma por punto (decimal)
          costoTotalNormalizado = costoTotalNormalizado.replace(/\./g, '').replace(',', '.');
          costoTotalNormalizado = parseFloat(costoTotalNormalizado);
        }
        // Redondear a entero para evitar decimales
        costoTotalNormalizado = Math.round(costoTotalNormalizado || 0);
        
        // Log si hubo normalización
        if (costoOriginal !== costoTotalNormalizado) {
          console.log(`📊 Normalización costo_total para "${item.producto}":`, {
            original: costoOriginal,
            normalizado: costoTotalNormalizado,
            tipo_original: typeof costoOriginal
          });
        }

        return {
          producto: item.producto || "",
          cantidad: item.cantidad || null,
          unidad: item.unidad?.toLowerCase().trim() || null,
          costo_total: costoTotalNormalizado,
          porcentaje_ganancia: item.porcentaje_ganancia || null,
          // Redondear precio_unitario para evitar números periódicos
          precio_unitario: item.precio_unitario ? Math.round(item.precio_unitario) : null,
          // Redondear precio_venta para que coincida con lo mostrado en la tabla
          precio_venta: item.precio_venta ? Math.round(item.precio_venta) : null,
        };
      }),
    };

    // Log de depuración: verificar qué se está enviando (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🚀 Aplicando a inventario:', {
        fechaIngreso,
        gananciaGlobal,
        itemsCount: itemsValidos.length,
        payload,
        itemsRechazados: draft.items.length - itemsValidos.length
      });

      // Log detallado de cada ítem para verificar valores
      console.log('🔍 Valores detallados de cada ítem:');
      itemsValidos.forEach((item, index) => {
        console.log(`Ítem ${index + 1} - ${item.producto}:`, {
          cantidad: {
            original: item.cantidad,
            tipo: typeof item.cantidad,
            parseado: parseFloat(item.cantidad)
          },
          costo_total: {
            original: item.costo_total,
            tipo: typeof item.costo_total,
            parseado: parseFloat(item.costo_total)
          },
          precio_unitario: {
            original: item.precio_unitario,
            tipo: typeof item.precio_unitario,
            formateado: formatearPrecioCLP(item.precio_unitario || 0),
            redondeado: item.precio_unitario ? Math.round(item.precio_unitario) : null
          },
          precio_venta: {
            original: item.precio_venta,
            tipo: typeof item.precio_venta,
            formateado: formatearPrecioCLP(item.precio_venta || 0),
            redondeado: item.precio_venta ? Math.round(item.precio_venta) : null
          }
        });
      });
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/inventario-ia-apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    const out = await res.json();
    
    if (!res.ok) {
      // Manejar errores específicos de la Edge
      let mensajeError = out?.error || "Error al aplicar al inventario";
      
      if (res.status === 401 || out?.error === "Auth inválida") {
        // Intentar refrescar el token y reintentar una vez
        try {
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (refreshedSession?.access_token) {
            // Reintentar con el token refrescado
            const retryRes = await fetch(`${supabaseUrl}/functions/v1/inventario-ia-apply`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${refreshedSession.access_token}`,
              },
              body: JSON.stringify(payload),
            });
            
            const retryOut = await retryRes.json();
            
            if (retryRes.ok) {
              mostrarMensaje('success', `Inventario registrado: ${retryOut.inserted} ítem(s)`);
              
              // Mostrar popup de éxito
              alert(`✅ ¡Inventario cargado exitosamente!\n\nSe registraron ${retryOut.inserted} ítem(s) en el inventario.\n\nLos productos ya están disponibles para ventas.`);
              
              if (retryOut.invalid?.length) {
                console.info("Filas inválidas:", retryOut.invalid);
              }
              
              // Reset completo
              setDraft({ items: [] });
              setSelectedFile(null);
              setHaProcesado(false);
              // Limpiar estados de previsualización
              setPreviewUrl(null);
              setShowPreview(false);
              setCropArea({ x: 0, y: 0, width: 0, height: 0 });
              setCroppedFile(null);
              setHasCropSignedUrl(false);
              setPdfPageDimensions(null);
              setPageReady(false);
              setImageReady(false);
              pageCanvasRef.current = null;
              imageCanvasRef.current = null;
              return;
            } else {
              mensajeError = "Error de autenticación. Por favor, inicia sesión nuevamente.";
            }
          } else {
            mensajeError = "Error de autenticación. Por favor, inicia sesión nuevamente.";
          }
        } catch (refreshError) {
          console.error("Error refrescando sesión:", refreshError);
          mensajeError = "Error de autenticación. Por favor, inicia sesión nuevamente.";
        }
      } else if (out?.error === "No hay filas válidas") {
        mensajeError = "Todos los ítems del borrador fallaron en la validación";
      } else if (out?.error?.includes("Valores numéricos inválidos")) {
        mensajeError = "Algunos valores numéricos no pueden ser interpretados. Revisa separadores de miles (.) y decimales (,)";
      } else if (out?.error === "Payload inválido") {
        mensajeError = "El formato de datos enviado no es válido. Revisa la consola para más detalles.";
        console.error("Payload completo enviado:", payload);
        console.error("Respuesta completa de la Edge:", out);
      }
      
      mostrarMensaje('error', mensajeError);
      console.warn("inventario-ia-apply error:", out);
      return;
    }

    mostrarMensaje('success', `Inventario registrado: ${out.inserted} ítem(s)`);
    
    // Mostrar popup de éxito
    alert(`✅ ¡Inventario cargado exitosamente!\n\nSe registraron ${out.inserted} ítem(s) en el inventario.\n\nLos productos ya están disponibles para ventas.`);
    
    if (out.invalid?.length) {
      console.info("Filas inválidas:", out.invalid);
    }
    
    // Reset completo
    setDraft({ items: [] });
    setSelectedFile(null);
    setHaProcesado(false);
    // Limpiar estados de previsualización
    setPreviewUrl(null);
    setShowPreview(false);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    setCroppedFile(null);
    setHasCropSignedUrl(false);
    setPdfPageDimensions(null);
    setPageReady(false);
    setImageReady(false);
    pageCanvasRef.current = null;
    imageCanvasRef.current = null;
    
  } catch (error) {
    console.error('Error aplicando al inventario:', error);
    mostrarMensaje('error', `Error aplicando al inventario: ${error.message}`);
  } finally {
    setLoading(false);
  }
}, [draft.items, fechaIngreso, gananciaGlobal, validarDraft, mostrarMensaje]);

  // Función para reiniciar
  const reiniciar = useCallback(() => {
    // Revocar URL si existe
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setDraft({ items: [] });
    setSelectedFile(null);
    setHaProcesado(false);
    setDebugInfo(null);
    // Limpiar estados de previsualización
    setPreviewUrl(null);
    setShowPreview(false);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    setCroppedFile(null);
    setHasCropSignedUrl(false);
    setPdfPageDimensions(null);
    setPageReady(false);
    setImageReady(false);
    setCurrentPage(1);
    setNumPages(0);
    pageCanvasRef.current = null;
    imageCanvasRef.current = null;
    mostrarMensaje('info', 'Proceso reiniciado');
  }, [mostrarMensaje, previewUrl]);

  // Función para manejar selección de archivo
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
          if (file) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔍 Archivo seleccionado:', {
            name: file.name,
            type: file.type,
            size: file.size,
            sizeKB: (file.size / 1024).toFixed(2)
          });
          
          // Solo aceptar PDF, PNG y JPEG
          const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
          const maxSize = 10 * 1024 * 1024; // 10MB
          
          const isValidType = validTypes.includes(file.type);
          const isValidSize = file.size <= maxSize;
          
          console.log('🔍 Validación:', {
            isValidType,
            isValidSize,
            validTypes,
            fileType: file.type
          });
        }
      
              // Solo aceptar PDF, PNG y JPEG
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        const isValidType = validTypes.includes(file.type);
        const isValidSize = file.size <= maxSize;
        
        if (!isValidType) {
          mostrarMensaje('error', 'Solo se permiten archivos PNG, JPEG o PDF');
          return;
        }
        if (!isValidSize) {
          mostrarMensaje('error', 'Archivo demasiado grande (máx 10MB)');
          return;
        }
        
        setSelectedFile(file);
        setHasCropSignedUrl(false);
        setCroppedFile(null);
        setIsProcessing(false);
        setPageReady(false);
        setImageReady(false);
      }
    }, [mostrarMensaje]);

  // Función para manejar drop de archivos
  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Archivo drop:', {
          name: file.name,
          type: file.type,
          size: file.size,
          sizeKB: (file.size / 1024).toFixed(2)
        });
        
        // Solo aceptar PDF, PNG y JPEG
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
        const maxSize = 10 * 1024 * 1024;
        
        const isValidType = validTypes.includes(file.type);
        const isValidSize = file.size <= maxSize;
        
        console.log('🔍 Validación drop:', {
          isValidType,
          isValidSize,
          validTypes,
          fileType: file.type
        });
      }
      
      if (isValidType && isValidSize) {
        setSelectedFile(file);
        setHasCropSignedUrl(false);
        setCroppedFile(null);
        setIsProcessing(false);
        setPageReady(false);
        setImageReady(false);
        // Generar previsualización automáticamente
        generatePreview(file);
      } else {
        if (!isValidType) mostrarMensaje('error', 'Solo se permiten archivos PNG, JPEG o PDF');
        if (!isValidSize) mostrarMensaje('error', 'Archivo demasiado grande (máx 10MB)');
      }
    }
  }, [mostrarMensaje]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  // Función para generar previsualización del archivo
  const generatePreview = useCallback(async (file) => {
    if (!file) return;
    
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Generando previsualización para:', file.name, file.type);
      }
      
      // Resetear estados de PDF e imagen
      setPageReady(false);
      setImageReady(false);
      pageCanvasRef.current = null;
      imageCanvasRef.current = null;
      
      if (file.type === 'application/pdf') {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📄 Procesando PDF...');
        }
        
        // Crear URL del archivo para react-pdf
        const pdfUrl = URL.createObjectURL(file);
        setPreviewUrl(pdfUrl);
        setShowPreview(true);
        
        // Resetear estado de página para el nuevo PDF
        setPageReady(false);
        pageCanvasRef.current = null;
        setCurrentPage(1);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ URL de PDF generada para react-pdf');
        }
        
      } else if (file.type.startsWith('image/')) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🖼️ Procesando imagen...');
        }
        // Para imágenes, crear URL de previsualización
        const url = URL.createObjectURL(file);
        
        // Crear una imagen temporal para obtener dimensiones reales
        const img = new Image();
        img.onload = () => {
                  // Calcular dimensiones de visualización (máximo 500px de alto)
        const maxHeight = 500;
        const scale = Math.min(1, maxHeight / img.naturalHeight);
        const displayWidth = img.naturalWidth * scale;
        const displayHeight = img.naturalHeight * scale;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('📐 Dimensiones reales de la imagen:', img.naturalWidth, 'x', img.naturalHeight);
          console.log('📐 Dimensiones de visualización:', displayWidth, 'x', displayHeight);
        }
        
        // Inicializar área de encuadre proporcional a la visualización
        const cropArea = {
          x: Math.max(0, displayWidth * 0.1),
          y: Math.max(0, displayHeight * 0.1),
          width: Math.max(100, displayWidth * 0.8),
          height: Math.max(100, displayHeight * 0.8)
        };
        
        setCropArea(cropArea);
        
        // Guardar dimensiones reales para uso posterior en recorte
        setPdfPageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('🎯 Área de encuadre para imagen inicializada:', cropArea);
          console.log('📐 Dimensiones reales guardadas:', img.naturalWidth, 'x', img.naturalHeight);
        }
        };
        
        img.src = url;
        setPreviewUrl(url);
        setShowPreview(true);
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ URL de imagen generada');
        }
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Previsualización generada exitosamente');
      }
    } catch (error) {
      console.error('❌ Error generando previsualización:', error);
      mostrarMensaje('error', 'Error generando previsualización del archivo');
    }
  }, [mostrarMensaje]);

  // Función para manejar cambios en el encuadre
  const handleCropChange = useCallback((newCropArea) => {
    setCropArea(newCropArea);
  }, []);

  // Función para aplicar el encuadre
  const applyCrop = useCallback(async () => {
    if (!previewUrl || !selectedFile) return;
    
    try {
      setIsCropping(true);
      
      if (selectedFile.type === 'application/pdf') {
        // Para PDFs, recortar la sección seleccionada desde el canvas renderizado
        if (!pdfPageDimensions) {
          mostrarMensaje('error', 'No se pudieron obtener las dimensiones del PDF');
          return;
        }
        
        // Convertir coordenadas de píxeles a normalizadas (0-1)
        const normalizedCoords = convertToNormalizedCoordinates(cropArea, pdfPageDimensions);
        
        if (!normalizedCoords) {
          mostrarMensaje('error', 'Error convirtiendo coordenadas del encuadre');
          return;
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('🎯 Aplicando encuadre para PDF:', {
            originalCropArea: cropArea,
            normalizedCoords,
            pageDimensions: pdfPageDimensions
          });
        }
        
        // Obtener el canvas renderizado del preview
        if (!pageReady || !pageCanvasRef.current) {
          throw new Error('Espera a que la página termine de renderizar (canvas no disponible)');
        }
        
        const sourceCanvas = pageCanvasRef.current ?? imageCanvasRef.current;
        if (!sourceCanvas) {
          throw new Error('No se encontró el canvas para recortar');
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('🎯 Canvas disponible para recorte:', {
            width: sourceCanvas.width,
            height: sourceCanvas.height,
            ready: pageReady
          });
        }
        
        // Recortar desde el canvas usando coordenadas normalizadas
        const croppedBlob = await cropFromRenderedCanvas(
          sourceCanvas, 
          normalizedCoords, 
          1200, // Ancho fijo para estandarizar
          null  // Alto proporcional
        );
        
        // Crear archivo recortado
        const croppedFile = new File(
          [croppedBlob], 
          `cropped_${selectedFile.name.replace('.pdf', '.jpg')}`, 
          { 
            type: 'image/jpeg',
            lastModified: Date.now()
          }
        );
        
        // Agregar metadatos del recorte para referencia
        croppedFile.cropMetadata = {
          page: 1,
          bbox: normalizedCoords,
          normalized: true,
          originalFile: selectedFile.name,
          pageDimensions: pdfPageDimensions
        };
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ PDF recortado exitosamente:', {
            originalSize: selectedFile.size,
            croppedSize: croppedFile.size,
            compression: ((1 - croppedFile.size / selectedFile.size) * 100).toFixed(1) + '%'
          });
        }

        // Subir inmediatamente el recorte al bucket para habilitar el gating por path
        const userId = currentUser?.id;
        if (!userId) {
          mostrarMensaje('error', 'Debe iniciar sesión para subir el recorte');
          return;
        }
        const bucketName = 'inventario-ia';
        const fileExtension = croppedFile.type === 'image/png' ? 'png' : 'jpg';
        const fileName = `${Date.now()}.${fileExtension}`;
        const previewPath = `${userId}/previews/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(previewPath, croppedFile, {
            upsert: true,
            contentType: normalizarMimeType(croppedFile.type)
          });
        if (uploadError) {
          console.error('❌ Error subiendo recorte:', uploadError.message);
          mostrarMensaje('error', `Error subiendo recorte: ${uploadError.message}`);
          return;
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Recorte subido al bucket:', { bucket: bucketName, path: previewPath });
        }

        const croppedWithPath = {
          name: `cropped_${selectedFile.name.replace('.pdf', '.jpg')}`,
          type: 'image/jpeg',
          size: croppedFile.size,
          path: previewPath,
          cropMetadata: croppedFile.cropMetadata
        };
        setCroppedFile(croppedWithPath);
        setHasCropSignedUrl(true);
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔍 Estado tras setCroppedFile (post-upload):', {
            keys: Object.keys(croppedWithPath),
            hasPath: !!croppedWithPath.path,
            path: croppedWithPath.path
          });
        }
        
        mostrarMensaje('success', `PDF recortado exitosamente: ${(normalizedCoords.w * 100).toFixed(1)}% × ${(normalizedCoords.h * 100).toFixed(1)}% de la página`);
      } else {
        // Para imágenes, crear archivo recortado usando canvas
        if (!pdfPageDimensions) {
          mostrarMensaje('error', 'No se pudieron obtener las dimensiones de la imagen');
          return;
        }
        
        // Crear canvas para recortar
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Crear imagen para obtener datos
        const img = new Image();
        img.onload = async () => {
          // Usar las dimensiones reales guardadas
          const naturalWidth = pdfPageDimensions.width;
          const naturalHeight = pdfPageDimensions.height;
          
          // Obtener el canvas del preview para dimensiones de visualización
          const previewCanvas = pageContainerRef.current?.querySelector('canvas');
          if (!previewCanvas) {
            mostrarMensaje('error', 'No se encontró el canvas de la imagen');
            return;
          }
          
          const displayWidth = previewCanvas.width;
          const displayHeight = previewCanvas.height;
          
          // Calcular escala entre visualización y dimensiones reales
          const scaleX = naturalWidth / displayWidth;
          const scaleY = naturalHeight / displayHeight;
          
          // Convertir coordenadas de visualización a coordenadas reales
          const realX = Math.round(cropArea.x * scaleX);
          const realY = Math.round(cropArea.y * scaleY);
          const realWidth = Math.round(cropArea.width * scaleX);
          const realHeight = Math.round(cropArea.height * scaleY);
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 Aplicando encuadre para imagen:', {
              display: cropArea,
              displayDimensions: { width: displayWidth, height: displayHeight },
              real: { x: realX, y: realY, width: realWidth, height: realHeight },
              natural: { width: naturalWidth, height: naturalHeight },
              scale: { x: scaleX, y: scaleY }
            });
          }
          
          // Configurar canvas con dimensiones reales del recorte
          canvas.width = realWidth;
          canvas.height = realHeight;
          
          // Dibujar solo la parte recortada
          ctx.drawImage(
            img,
            realX, realY, realWidth, realHeight,  // Coordenadas de origen (imagen real)
            0, 0, realWidth, realHeight            // Coordenadas de destino (canvas)
          );
          
          // Exportar según el tipo de archivo original (normalizar MIME)
          const normalizedType = normalizarMimeType(selectedFile.type);
          const isPNG = normalizedType === 'image/png';
          const mimeType = isPNG ? 'image/png' : 'image/jpeg';
          const quality = isPNG ? undefined : 0.92;
          const extension = isPNG ? 'png' : 'jpg';
          
          // Promisificar toBlob para evitar archivos vacíos
          const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Error generando blob del recorte'));
              }
            }, mimeType, quality);
          });
          
          if (!blob) {
            console.warn('⚠️ toBlob devolvió null');
            setIsProcessing(false);
            return;
          }
          
          const croppedFile = new File([blob], `cropped_${selectedFile.name.replace(/\.[^/.]+$/, '')}.${extension}`, {
            type: mimeType,
            lastModified: Date.now()
          });
          
          // Agregar metadatos del recorte para referencia
          croppedFile.cropMetadata = {
            type: 'image',
            bbox: {
              x: realX / naturalWidth,
              y: realY / naturalHeight,
              w: realWidth / naturalWidth,
              h: realHeight / naturalHeight
            },
            normalized: true,
            originalFile: selectedFile.name,
            originalDimensions: { width: naturalWidth, height: naturalHeight }
          };
          
          // Subir recorte de imagen a previews y setear path
          try {
            const { previewPath } = await subirAPreviews(croppedFile);
            setCroppedFile({
              name: croppedFile.name,
              type: croppedFile.type,
              size: croppedFile.size,
              path: previewPath,
              cropMetadata: croppedFile.cropMetadata
            });
            setHasCropSignedUrl(true);
            mostrarMensaje('success', `Imagen recortada y subida: ${realWidth} × ${realHeight} píxeles`);
          } catch (e) {
            console.error('❌ Error subiendo recorte de imagen a previews:', e);
            mostrarMensaje('error', 'No se pudo subir el recorte');
            return;
          }
        };
        
        img.src = previewUrl;
      }
      
      // Mantener la previsualización hasta que el usuario decida, no cerrar automáticamente
      // setShowPreview(false);
    } catch (error) {
      console.error('Error aplicando encuadre:', error);
      mostrarMensaje('error', 'Error aplicando encuadre');
    } finally {
      setIsCropping(false);
    }
  }, [previewUrl, selectedFile, cropArea, mostrarMensaje, pdfPageDimensions, pageReady]);

  // Función para cancelar previsualización
  const cancelPreview = useCallback(() => {
    // Revocar URL si existe
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setShowPreview(false);
    setPreviewUrl(null);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    // No limpiar croppedFile ni flags al cerrar previsualización
    setPdfPageDimensions(null);
    setPageReady(false);
    setImageReady(false);
    pageCanvasRef.current = null;
    imageCanvasRef.current = null;
  }, [previewUrl]);

  // Cargar fecha actual y schemaHints al inicializar (una sola vez)
  const hintsInitRef = useRef(false);
  useEffect(() => {
    if (hintsInitRef.current) return;
    hintsInitRef.current = true;
    const fechaActual = obtenerFechaHoyChile();
    setFechaIngreso(fechaActual);
    cargarSchemaHints();
  }, [cargarSchemaHints]);
  
  // Log de depuración para verificar que react-pdf esté disponible (solo cuando se monte el componente)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Debug react-pdf:', {
        Document: typeof Document,
        Page: typeof Page,
        pdfjs: typeof pdfjs,
        workerSrc: pdfjs.GlobalWorkerOptions.workerSrc
      });
    }
  }, []);
  
  // Cargar usuario autenticado al montar el componente
  const userInitRef = useRef(false);
  useEffect(() => {
    if (userInitRef.current) return;
    userInitRef.current = true;
    if (currentUser || authLoading === false) return;
    
    let alive = true;
    
    (async () => {
      try {
        const user = await authService.getCurrentUser();
        if (alive) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.warn('⚠️ No se pudo cargar usuario:', error.message);
        if (alive) {
          setCurrentUser(null);
        }
      } finally {
        if (alive) {
          setAuthLoading(false);
        }
      }
    })();
    
    return () => { alive = false; };
  }, []);
  
  // Listener de autenticación eliminado: se gestiona globalmente en sessionManager

  // Debug: monitorear cambios en estados de previsualización (solo en desarrollo)
  useEffect(() => {
    if (!DEBUG || process.env.NODE_ENV === 'production') return;
    console.log('🔍 [EFFECT] Estados de previsualización cambiaron:', {
      previewUrl: !!previewUrl,
      showPreview,
      cropArea,
      isCropping,
      croppedFile: croppedFile ? {
        name: croppedFile.name,
        type: croppedFile.type,
        size: croppedFile.size,
        hasPath: !!croppedFile.path,
        path: croppedFile.path
      } : null
    });
  }, [previewUrl, showPreview, cropArea, isCropping, DEBUG]);

  // Depuración rápida: verificar estado del draft y alimentación de la tabla (solo en desarrollo)
  useEffect(() => {
    if (!DEBUG || process.env.NODE_ENV === 'production') return;
    console.log('🔍 [EFFECT] Debug Draft State:', {
      draft: draft,
      itemsCount: draft.items?.length || 0,
      haProcesado: haProcesado,
      timestamp: new Date().toISOString()
    });
    if (draft.items && draft.items.length > 0) {
      console.log('📊 [EFFECT] Tabla alimentada con:', draft.items.length, 'ítems');
      console.log('📋 [EFFECT] Primer ítem:', draft.items[0]);
    }
  }, [draft, haProcesado, DEBUG]);

  // Función para validar el encuadre
  const validarEncuadre = useCallback(() => {
    if (!previewUrl) return false;
    
    // Validar que el área de encuadre sea válida
    if (!cropArea || cropArea.width <= 0 || cropArea.height <= 0) {
      console.log('⚠️ Área de encuadre inválida:', cropArea);
      return false;
    }
    
    // Validar que las coordenadas estén dentro de los límites
    if (cropArea.x < 0 || cropArea.y < 0) {
      console.log('⚠️ Coordenadas de encuadre fuera de límites:', cropArea);
      return false;
    }
    
    if (selectedFile?.type === 'application/pdf') {
      // Para PDFs, validar que el canvas esté listo
      if (!pageReady || !pageCanvasRef.current) {
        console.log('⚠️ Canvas de PDF no está listo');
        return false;
      }
      
      // Validar que el encuadre no se salga del canvas
      const canvas = pageCanvasRef.current;
      if (cropArea.x + cropArea.width > canvas.width || cropArea.y + cropArea.height > canvas.height) {
        console.log('⚠️ Encuadre se sale del canvas PDF:', {
          cropArea,
          canvasSize: { width: canvas.width, height: canvas.height }
        });
        return false;
      }
      
      return true;
    } else if (selectedFile?.type.startsWith('image/')) {
      // Para imágenes, validar que el canvas esté listo
      if (!imageReady || !imageCanvasRef.current) {
        console.log('⚠️ Canvas de imagen no está listo');
        return false;
      }
      
      // Validar que el encuadre no se salga del canvas
      const canvas = imageCanvasRef.current;
      if (cropArea.x + cropArea.width > canvas.width || cropArea.y + cropArea.height > canvas.height) {
        console.log('⚠️ Encuadre se sale del canvas de imagen:', {
          cropArea,
          canvasSize: { width: canvas.width, height: canvas.height }
        });
        return false;
      }
      
      return true;
    }
    
    return false;
  }, [cropArea, previewUrl, selectedFile, pageReady, imageReady]);

  // Función para obtener información del encuadre
  const obtenerInfoEncuadre = useCallback(() => {
    if (!previewUrl) return null;
    
    if (selectedFile?.type === 'application/pdf') {
      // Para PDFs, usar las dimensiones guardadas
      if (!pdfPageDimensions) return null;
      
      const { width: naturalWidth, height: naturalHeight } = pdfPageDimensions;
      const previewCanvas = pageContainerRef.current?.querySelector('canvas');
      
      if (!previewCanvas) return null;
      
      const displayWidth = previewCanvas.width;
      const displayHeight = previewCanvas.height;
      
      // Calcular escala
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
      
      // Convertir a coordenadas reales
      const realX = cropArea.x * scaleX;
      const realY = cropArea.y * scaleY;
      const realWidth = cropArea.width * scaleX;
      const realHeight = cropArea.height * scaleY;
      
      return {
        display: { ...cropArea },
        real: { x: realX, y: realY, width: realWidth, height: realHeight },
        natural: { width: naturalWidth, height: naturalHeight },
        scale: { x: scaleX, y: scaleY },
        porcentaje: {
          x: (realX / naturalWidth) * 100,
          y: (realY / naturalHeight) * 100,
          width: (realWidth / naturalWidth) * 100,
          height: (realHeight / naturalHeight) * 100
        }
      };
    } else if (selectedFile?.type.startsWith('image/')) {
      // Para imágenes, usar el canvas del preview
      const previewCanvas = pageContainerRef.current?.querySelector('canvas');
      if (!previewCanvas || !pdfPageDimensions) return null;
      
      const displayWidth = previewCanvas.width;
      const displayHeight = previewCanvas.height;
      const { width: naturalWidth, height: naturalHeight } = pdfPageDimensions;
      
      // Calcular escala
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
      
      // Convertir a coordenadas reales
      const realX = cropArea.x * scaleX;
      const realY = cropArea.y * scaleY;
      const realWidth = cropArea.width * scaleX;
      const realHeight = cropArea.height * scaleY;
      
      return {
        display: { ...cropArea },
        real: { x: realX, y: realY, width: realWidth, height: realHeight },
        natural: { width: naturalWidth, height: naturalHeight },
        scale: { x: scaleX, y: scaleY },
        porcentaje: {
          x: (realX / naturalWidth) * 100,
          y: (realY / naturalHeight) * 100,
          width: (realWidth / naturalWidth) * 100,
          height: (realHeight / naturalHeight) * 100
        }
      };
    }
    
    return null;
  }, [cropArea, previewUrl, selectedFile, pdfPageDimensions]);

  // Función para convertir coordenadas de píxeles a normalizadas (0-1)
  const convertToNormalizedCoordinates = useCallback((cropArea, pageDimensions) => {
    if (!pageDimensions || !cropArea) return null;
    
    const { width: pageWidth, height: pageHeight } = pageDimensions;
    
    // Convertir coordenadas de píxeles a normalizadas (0-1)
    // Origen: arriba-izquierda (como en el frontend)
    const normalized = {
      x: cropArea.x / pageWidth,
      y: cropArea.y / pageHeight,
      w: cropArea.width / pageWidth,
      h: cropArea.height / pageHeight
    };
    
    // Asegurar que las coordenadas estén en el rango 0-1
    normalized.x = Math.max(0, Math.min(1, normalized.x));
    normalized.y = Math.max(0, Math.min(1, normalized.y));
    normalized.w = Math.max(0, Math.min(1, normalized.w));
    normalized.h = Math.max(0, Math.min(1, normalized.h));
    
    // Asegurar que el rectángulo no se salga de los límites
    if (normalized.x + normalized.w > 1) {
      normalized.w = 1 - normalized.x;
    }
    if (normalized.y + normalized.h > 1) {
      normalized.h = 1 - normalized.y;
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Coordenadas normalizadas:', {
        original: cropArea,
        pageDimensions,
        normalized,
        validation: {
          xInRange: normalized.x >= 0 && normalized.x <= 1,
          yInRange: normalized.y >= 0 && normalized.y <= 1,
          wInRange: normalized.w >= 0 && normalized.w <= 1,
          hInRange: normalized.h >= 0 && normalized.h <= 1,
          withinBounds: (normalized.x + normalized.w) <= 1 && (normalized.y + normalized.h) <= 1
        }
      });
    }
    
    return normalized;
  }, []);

  // Función para obtener dimensiones de la página del PDF
  const getPdfPageDimensions = useCallback(async (file) => {
    if (file.type !== 'application/pdf') return null;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1); // Primera página
      const viewport = page.getViewport({ scale: 1.0 }); // Escala 1.0 para dimensiones reales
      
      return {
        width: viewport.width,
        height: viewport.height,
        pageCount: pdf.numPages
      };
    } catch (error) {
      console.error('❌ Error obteniendo dimensiones del PDF:', error);
      return null;
    }
  }, []);

  // Función para recortar desde canvas renderizado (client-side)
  const cropFromRenderedCanvas = useCallback(async (pageCanvas, sel, outW = null, outH = null) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Recortando desde canvas:', {
          canvasSize: { width: pageCanvas.width, height: pageCanvas.height },
          selection: sel,
          outputSize: { width: outW, height: outH }
        });
      }
      
      // Convertir coordenadas normalizadas a píxeles del canvas
      const sx = Math.round(sel.x * pageCanvas.width);
      const sy = Math.round(sel.y * pageCanvas.height);
      const sw = Math.round(sel.w * pageCanvas.width);
      const sh = Math.round(sel.h * pageCanvas.height);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📐 Coordenadas de recorte en píxeles:', { sx, sy, sw, sh });
      }
      
      // Validar dimensiones del recorte como enteros > 0
      const w = Math.max(1, Math.round(outW ?? sw));
      const h = Math.max(1, Math.round(outH ?? Math.round((sh / sw) * w)));
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📐 Dimensiones validadas del recorte:', { w, h, originalSw: sw, originalSh: sh });
      }
      
      // Crear canvas de recorte con dimensiones validadas
      const crop = document.createElement('canvas');
      crop.width = w;
      crop.height = h;
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📐 Dimensiones del recorte:', { width: crop.width, height: crop.height });
      }
      
      // Contexto del canvas con optimización para lectura frecuente
      const ctx = crop.getContext('2d', { willReadFrequently: true });
      
      // Dibujar la región seleccionada en el canvas de recorte
      ctx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
      
      // Convertir a blob según el tipo de archivo original (normalizar MIME)
      const normalizedType = normalizarMimeType(selectedFile?.type);
      const isPNG = normalizedType === 'image/png';
      const mimeType = isPNG ? 'image/png' : 'image/jpeg';
      const quality = isPNG ? undefined : 0.92;
      
      return new Promise((resolve, reject) => {
        crop.toBlob(
          (blob) => {
            if (blob) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('✅ Recorte generado:', {
                  size: blob.size,
                  type: blob.type,
                  dimensions: { width: crop.width, height: crop.height }
                });
              }
              resolve(blob);
            } else {
              reject(new Error('Error generando blob del recorte'));
            }
          },
          mimeType,
          quality
        );
      });
      
    } catch (error) {
      console.error('❌ Error en cropFromRenderedCanvas:', error);
      throw error;
    }
  }, []);

  // Función para corregir orientación EXIF de imágenes
  const correctImageOrientation = useCallback((img, canvas, ctx) => {
    // Obtener orientación EXIF si está disponible
    const orientation = img.exifdata?.Orientation || 1;
    
    if (orientation === 1) {
      // Sin rotación, dibujar normal
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return;
    }
    
    // Para rotaciones 90°, necesitamos ajustar las dimensiones del canvas
    const needsRotation = orientation === 5 || orientation === 6 || orientation === 7 || orientation === 8;
    
    if (needsRotation) {
      // Intercambiar width y height para rotaciones 90°
      const tempWidth = canvas.width;
      canvas.width = canvas.height;
      canvas.height = tempWidth;
      
      // Obtener el contexto actualizado
      ctx = canvas.getContext('2d');
    }
    
    // Aplicar transformaciones según la orientación EXIF
    ctx.save();
    
    // Mover al centro del canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Aplicar rotación según orientación
    switch (orientation) {
      case 2: // Flip horizontal
        ctx.scale(-1, 1);
        break;
      case 3: // Rotación 180°
        ctx.rotate(Math.PI);
        break;
      case 4: // Flip vertical
        ctx.scale(1, -1);
        break;
      case 5: // Flip horizontal + rotación 90° CCW
        ctx.scale(-1, 1);
        ctx.rotate(Math.PI / 2);
        break;
      case 6: // Rotación 90° CW
        ctx.rotate(Math.PI / 2);
        break;
      case 7: // Flip horizontal + rotación 90° CW
        ctx.scale(-1, 1);
        ctx.rotate(-Math.PI / 2);
        break;
      case 8: // Rotación 90° CCW
        ctx.rotate(-Math.PI / 2);
        break;
    }
    
    // Dibujar imagen centrada
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    
    ctx.restore();
  }, []);

  // Función para detectar cuando el canvas del PDF esté listo
  const onPageRender = useCallback(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 onPageRender ejecutado, buscando canvas...');
    }
    
    // Buscar el canvas dentro de pageContainerRef usando el selector de react-pdf
    const canvas = pageContainerRef.current?.querySelector('canvas.react-pdf__Page__canvas');
    
    if (canvas) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Canvas encontrado:', {
          width: canvas.width,
          height: canvas.height,
          element: canvas
        });
      }
      
      pageCanvasRef.current = canvas;
      setPageReady(true);
      
      // Inicializar área de encuadre basada en las dimensiones del canvas
      const cropArea = {
        x: Math.max(0, canvas.width * 0.1),
        y: Math.max(0, canvas.height * 0.1),
        width: Math.max(100, canvas.width * 0.8),
        height: Math.max(100, canvas.height * 0.8)
      };
      setCropArea(cropArea);
      
      // Guardar dimensiones de la página para coordenadas normalizadas
      setPdfPageDimensions({
        width: canvas.width,
        height: canvas.height
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🎯 Estado pageReady actualizado a true');
        console.log('🎯 Área de encuadre inicializada:', cropArea);
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Canvas no encontrado aún, pageReady permanece false');
      }
      setPageReady(false);
    }
  }, []);

  // Función para manejar cuando se carga el documento PDF completo
  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Documento PDF cargado, páginas:', numPages);
    }
    setNumPages(numPages);
    
    // Resetear estado del canvas al cambiar documento
    setPageReady(false);
    pageCanvasRef.current = null;
    
    // Obtener dimensiones de la primera página para inicializar el encuadre
    if (numPages > 0) {
      // Esperar un frame para que el DOM se actualice y luego buscar el canvas
      requestAnimationFrame(() => {
        onPageRender();
      });
    }
  }, [onPageRender]);

  // Función helper para el gating del botón (una sola fuente de verdad)
  const getButtonState = useCallback(() => {
    const esPdf = selectedFile?.type === 'application/pdf';
    const hasCropped = Boolean(croppedFile?.path);
    const isDisabled = !selectedFile || loading || isProcessing || (esPdf && !hasCropped);
    
    let text = '🤖 Procesar con IA';
    if (loading) text = '⏳ Procesando...';
    else if (isProcessing) text = '⏳ Procesando IA...';
    else if (!selectedFile) text = '📁 Selecciona un archivo';
    else if (esPdf && !hasCropped) text = '📄 Aplica recorte primero';
    
    return { isDisabled, text };
  }, [selectedFile, loading, isProcessing, croppedFile]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a3d1a' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Botón Volver al Inicio */}
          <div className="mb-4 md:mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium text-sm md:text-base"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-lg md:text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Inventario IA</h1>
            <p className="text-green-200 text-lg">Deja que la IA trabaje por ti</p>
          </div>

          {/* Mensajes */}
          {mensaje.texto && (
            <div className={`mb-6 p-4 rounded-lg ${
              mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' :
              mensaje.tipo === 'error' ? 'bg-red-100 text-red-800' :
              mensaje.tipo === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* Paso A: Subir documento */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20 mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">📄 Cargar Documento</h2>
            
            {/* Configuración global */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  📅 Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  💰 % Ganancia (global)
                  <span className="ml-2 text-xs text-gray-300">(0-100%)</span>
                </label>
                <input
                  type="number"
                  value={gananciaGlobal}
                  onChange={(e) => setGananciaGlobal(parseFloat(e.target.value) || GANANCIA_GLOBAL_DEFAULT)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                  title="Ganancia global aplicada a todos los ítems que no tengan ganancia específica"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  🏷️ IVA
                  <span className="ml-2 text-xs text-gray-300">(no editable)</span>
                </label>
                <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-gray-300 backdrop-blur-sm">
                  19% (fijo)
                </div>
                <p className="text-xs text-gray-400 mt-2">Aplicado automáticamente al precio de venta</p>
              </div>
            </div>

            {/* Panel de Campos a detectar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg md:text-xl font-bold text-white">
                  🔍 Campos a detectar (opcional)
                  {usingDefaults && (
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                      (defaults)
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setShowSchemaHints(!showSchemaHints)}
                  className="text-sm text-green-400 hover:text-green-300 font-medium transition-colors duration-200"
                >
                  {showSchemaHints ? '👁️ Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
              
              {showSchemaHints && (
                                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 space-y-4 md:space-y-6 border border-white/10">
                    {/* Producto */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2 md:mb-3">
                        🍎 Producto
                      </label>
                      <input
                        type="text"
                        value={schemaHints.producto}
                        onChange={(e) => setSchemaHints(prev => ({ ...prev, producto: e.target.value }))}
                        placeholder="detalle, descripción, producto, concepto"
                        className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200 text-sm md:text-base"
                      />
                      <p className="text-xs text-gray-400 mt-2">Lista separada por comas</p>
                    </div>

                  {/* Cantidad */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      ⚖️ Cantidad
                    </label>
                    <input
                      type="text"
                      value={schemaHints.cantidad}
                      onChange={(e) => setSchemaHints(prev => ({ ...prev, cantidad: e.target.value }))}
                      placeholder="cantidad, cant, qty"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    />
                    <p className="text-xs text-gray-400 mt-2">Lista separada por comas</p>
                  </div>

                  {/* Unidad */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      📏 Unidad
                    </label>
                    <input
                      type="text"
                      value={schemaHints.unidad}
                      onChange={(e) => setSchemaHints(prev => ({ ...prev, unidad: e.target.value }))}
                      placeholder="unidad, unid, u, c/u"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    />
                    <p className="text-xs text-gray-400 mt-2">Lista separada por comas</p>
                  </div>

                  {/* Costo Total */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      💰 Costo Total
                    </label>
                    <input
                      type="text"
                      value={schemaHints.total ?? ''}
                      onChange={(e) => setSchemaHints(prev => ({ ...prev, total: e.target.value }))}
                      placeholder="total, importe, monto, precio total"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    />
                    <p className="text-xs text-gray-400 mt-2">Lista separada por comas</p>
                  </div>

                  {/* Botón para guardar cambios */}
                  <div className="pt-4 border-t border-white/10">
                    <button
                      onClick={guardarSchemaHints}
                      className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium mb-3 transition-all duration-200 shadow-lg"
                    >
                      💾 Guardar configuración
                    </button>
                    
                    {/* Botón de debug */}
                    <button
                      onClick={mostrarDebugSchemaHints}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg"
                    >
                      🔍 Debug SchemaHints
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dropzone */}
            <div className="mb-8">
              <div
                className="border-2 border-dashed border-white/30 rounded-2xl p-8 md:p-12 text-center hover:border-green-400/50 transition-all duration-300 bg-white/5 backdrop-blur-sm"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-6xl md:text-7xl mb-6">📁</div>
                  <p className="text-lg md:text-xl text-white mb-3">
                    Arrastra un archivo aquí o <span className="text-green-400 font-semibold">haz clic para seleccionar</span>
                  </p>
                  <p className="text-sm text-gray-300">
                    PNG, JPEG o PDF (máx. 10MB)
                  </p>
                </label>
              </div>
            </div>

            {/* Archivo seleccionado */}
            {selectedFile && (
              <div className="mb-8 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">📄 Documento Seleccionado</h3>
                  <p className="text-sm text-gray-300 mb-4">{selectedFile.name}</p>
                  <p className="text-xs text-blue-300 mb-4">
                    💾 Se guardará en: <strong>inventario-ia/usuario/</strong>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => {
                        if (!previewUrl) {
                          generatePreview(selectedFile);
                        } else {
                          setShowPreview(true);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🔍 Ver Previsualización y Encuadre
                    </button>
                    
                    {/* Botón de debug temporal */}
                    <button
                                          onClick={() => {
                      if (process.env.NODE_ENV !== 'production') {
                        console.log('🔍 Debug completo del estado actual:', {
                          selectedFile,
                          schemaHints: normalizarSchemaHints(),
                          draft,
                          haProcesado
                        });
                      }
                      mostrarMensaje('info', 'Información de debug enviada a la consola');
                    }}
                      className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🐛 Debug
                    </button>
                    
                    {/* Botón de debug de Supabase */}
                    <button
                      onClick={async () => {
                        try {
                          if (process.env.NODE_ENV !== 'production') {
                            console.log('🔍 Debug de Supabase...');
                            
                            // Verificar usuario actual del estado local
                            console.log('🔑 Usuario:', currentUser ? 'Autenticado' : 'No autenticado');
                            
                            if (currentUser) {
                              console.log('👤 Usuario:', currentUser.email);
                              console.log('🆔 User ID:', currentUser?.id);
                              console.log('👤 Nombre:', currentUser?.nombre);
                              console.log('🔑 Rol:', currentUser?.rol);
                            }
                            
                            // Verificar sesión de Supabase para token
                            const { data: { session } } = await supabase.auth.getSession();
                            console.log('🔑 Access Token:', session?.access_token ? 'Presente' : 'Ausente');
                            
                            // Verificar acceso al bucket inventario-ia
                            console.log('🔐 Verificando acceso al bucket inventario-ia...');
                            
                            try {
                              // Intentar listar archivos del usuario en el bucket
                              const userId = currentUser?.id;
                              const userFolder = userId ? `${userId}/` : 'test/';
                              const { data: files, error: listError } = await supabase.storage
                                .from('inventario-ia')
                                .list(userFolder, { limit: 1 });
                              
                              if (listError) {
                                console.log(`⚠️ Error accediendo al bucket inventario-ia:`, listError.message);
                                
                                if (listError.message.includes('row-level security policy')) {
                                  console.log('🔒 Problema de RLS detectado. Verifica las políticas en Supabase Dashboard');
                                }
                              } else {
                                console.log(`✅ Acceso al bucket inventario-ia: OK`);
                                console.log(`📁 Archivos en carpeta ${userFolder}:`, files?.length || 0);
                              }
                            } catch (bucketError) {
                              console.log(`❌ Error verificando bucket:`, bucketError.message);
                            }
                            
                            // Verificar configuración de la Edge Function
                            console.log('🔧 Verificando configuración de Edge Function...');
                            console.log('🌐 Supabase URL:', supabaseUrl);
                            console.log('🔑 Edge Function: inventario-ia-process');
                          }
                          
                          mostrarMensaje('info', 'Debug de Supabase enviado a consola');
                        } catch (error) {
                          console.error('❌ Error en debug de Supabase:', error);
                          mostrarMensaje('error', 'Error en debug de Supabase');
                        }
                      }}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🔧 Supabase
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Previsualización con encuadre */}
            {showPreview && previewUrl && (
              <div className="mb-8 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4 text-center">🔍 Previsualización y Encuadre</h3>
                <p className="text-sm text-gray-300 mb-4 text-center">
                  Selecciona el área del documento que contiene los productos a procesar
                </p>
                
                <div ref={pageContainerRef} className="relative mb-4 overflow-hidden rounded-lg border-2 border-white/20">
                  {selectedFile?.type === 'application/pdf' ? (
                    // Renderizar PDF usando react-pdf
                    <Document 
                      file={previewUrl} 
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={<div className="text-center py-8 text-white">📄 Cargando PDF...</div>}
                      error={<div className="text-center py-8 text-red-400">❌ Error cargando PDF</div>}
                    >
                      <Page 
                        pageNumber={currentPage} 
                        onRenderSuccess={onPageRender}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={500} // Ancho fijo para consistencia
                        loading={<div className="text-center py-4 text-white">🔄 Renderizando página...</div>}
                      />
                    </Document>
                  ) : selectedFile?.type.startsWith('image/') ? (
                    // Para imágenes, crear canvas para poder recortar
                    <canvas
                      ref={(canvas) => {
                        if (canvas && previewUrl) {
                          // Crear imagen y dibujarla en el canvas
                          const img = new Image();
                          img.onload = () => {
                            // Calcular escala para visualización (máximo 500px de alto)
                            const maxHeight = 500;
                            const scale = Math.min(1, maxHeight / img.naturalHeight);
                            const displayWidth = img.naturalWidth * scale;
                            const displayHeight = img.naturalHeight * scale;
                            
                            // Configurar canvas con dimensiones de visualización
                            canvas.width = displayWidth;
                            canvas.height = displayHeight;
                            
                            // Dibujar imagen escalada
                            const ctx = canvas.getContext('2d');
                            correctImageOrientation(img, canvas, ctx);
                            
                                    // Asignar canvas a imageCanvasRef y marcar como listo
        imageCanvasRef.current = canvas;
        setImageReady(true);
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Canvas de imagen creado y listo para recorte');
        }
                          };
                          img.src = previewUrl;
                        }
                      }}
                      className="w-full h-auto"
                      style={{ maxHeight: '500px' }}
                    />
                  ) : (
                    // Fallback para otros tipos
                    <div className="text-center py-8 text-white">❌ Tipo de archivo no soportado</div>
                  )}
                  
                  {/* Indicador de estado del canvas para PDFs */}
                  {selectedFile?.type === 'application/pdf' && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium">
                      {pageReady ? (
                        <span className="bg-green-500 text-white">✅ Canvas Listo</span>
                      ) : (
                        <span className="bg-yellow-500 text-xs font-medium">⏳ Renderizando...</span>
                      )}
                    </div>
                  )}
                  
                  {/* Indicador de estado del canvas para imágenes */}
                  {selectedFile?.type.startsWith('image/') && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium">
                      {imageReady ? (
                        <span className="bg-green-500 text-white">✅ Canvas Listo</span>
                      ) : (
                        <span className="bg-yellow-500 text-white">⏳ Cargando...</span>
                      )}
                    </div>
                  )}
                  
                  {/* Área de encuadre */}
                  <div
                    className="absolute border-2 border-blue-400 bg-blue-400/20 cursor-move"
                    style={{
                      left: `${cropArea.x}px`,
                      top: `${cropArea.y}px`,
                      width: `${cropArea.width}px`,
                      height: `${cropArea.height}px`
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Obtener dimensiones del canvas o imagen según el tipo de archivo
                      let displayElement, displayRect, naturalWidth, naturalHeight;
                      
                      if (selectedFile?.type === 'application/pdf') {
                        // Para PDFs, usar el canvas renderizado
                        const pdfCanvas = pageContainerRef.current?.querySelector('canvas');
                        if (!pdfCanvas) return;
                        
                        displayElement = pdfCanvas;
                        displayRect = pdfCanvas.getBoundingClientRect();
                        naturalWidth = pdfCanvas.width;
                        naturalHeight = pdfCanvas.height;
                      } else if (selectedFile?.type.startsWith('image/')) {
                        // Para imágenes, usar el canvas del preview
                        const imgCanvas = pageContainerRef.current?.querySelector('canvas');
                        if (!imgCanvas) return;
                        
                        displayElement = imgCanvas;
                        displayRect = imgCanvas.getBoundingClientRect();
                        naturalWidth = imgCanvas.width;
                        naturalHeight = imgCanvas.height;
                      } else {
                        return;
                      }
                      
                      // Calcular escala de la imagen compensando devicePixelRatio
                      const devicePixelRatio = window.devicePixelRatio || 1;
                      const scaleX = naturalWidth / (displayRect.width * devicePixelRatio);
                      const scaleY = naturalHeight / (displayRect.height * devicePixelRatio);
                      
                      console.log('🔍 Movimiento del encuadre:', {
                        displayRect: { width: displayRect.width, height: displayRect.height },
                        natural: { width: naturalWidth, height: naturalHeight },
                        scale: { x: scaleX, y: scaleY },
                        cropArea
                      });
                      
                      const startX = e.clientX - cropArea.x;
                      const startY = e.clientY - cropArea.y;
                      
                      const handleMouseMove = (moveEvent) => {
                        const newX = moveEvent.clientX - startX;
                        const newY = moveEvent.clientY - startY;
                        
                        // Limitar el movimiento dentro de los límites de la imagen
                        const maxX = displayRect.width - cropArea.width;
                        const maxY = displayRect.height - cropArea.height;
                        
                        const clampedX = Math.max(0, Math.min(newX, maxX));
                        const clampedY = Math.max(0, Math.min(newY, maxY));
                        
                        setCropArea(prev => ({
                          ...prev,
                          x: clampedX,
                          y: clampedY
                        }));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                    {/* Controles de redimensionamiento en las esquinas */}
                    {/* Esquina superior izquierda */}
                    <div
                      className="absolute w-3 h-3 bg-blue-500 border border-white cursor-nw-resize"
                      style={{ top: '-6px', left: '-6px' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startCrop = { ...cropArea };
                        
                        // Obtener dimensiones del canvas para límites
                        let displayElement, displayRect;
                        
                        if (selectedFile?.type === 'application/pdf') {
                          const pdfCanvas = pageContainerRef.current?.querySelector('canvas');
                          if (!pdfCanvas) return;
                          displayElement = pdfCanvas;
                          displayRect = pdfCanvas.getBoundingClientRect();
                        } else if (selectedFile?.type.startsWith('image/')) {
                          const imgCanvas = pageContainerRef.current?.querySelector('canvas');
                          if (!imgCanvas) return;
                          displayElement = imgCanvas;
                          displayRect = imgCanvas.getBoundingClientRect();
                        } else {
                          return;
                        }
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaY = moveEvent.clientY - startY;
                          
                          // Calcular nuevas dimensiones con límites
                          const newX = Math.max(0, startCrop.x + deltaX);
                          const newY = Math.max(0, startCrop.y + deltaY);
                          const newWidth = Math.max(50, startCrop.width - deltaX);
                          const newHeight = Math.max(50, startCrop.height - deltaY);
                          
                          // Asegurar que no exceda los límites del canvas
                          const finalX = Math.min(newX, startCrop.x + startCrop.width - 50);
                          const finalY = Math.min(newY, startCrop.y + startCrop.height - 50);
                          const finalWidth = startCrop.x + startCrop.width - finalX;
                          const finalHeight = startCrop.y + startCrop.height - finalY;
                          
                          setCropArea({
                            x: finalX,
                            y: finalY,
                            width: finalWidth,
                            height: finalHeight
                          });
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Esquina superior derecha */}
                    <div
                      className="absolute w-3 h-3 bg-blue-500 border border-white cursor-ne-resize"
                      style={{ top: '-6px', right: '-6px' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaY = moveEvent.clientY - startY;
                          
                          setCropArea(prev => ({
                            x: startCrop.x,
                            y: Math.max(0, startCrop.y + deltaY),
                            width: Math.max(50, startCrop.width + deltaX),
                            height: Math.max(50, startCrop.height - deltaY)
                          }));
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Esquina inferior izquierda */}
                    <div
                      className="absolute w-3 h-3 bg-blue-500 border border-white cursor-sw-resize"
                      style={{ bottom: '-6px', left: '-6px' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaY = moveEvent.clientY - startY;
                          
                          setCropArea(prev => ({
                            x: Math.max(0, startCrop.x + deltaX),
                            y: startCrop.y,
                            width: Math.max(50, startCrop.width - deltaX),
                            height: Math.max(50, startCrop.height + deltaY)
                          }));
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Esquina inferior derecha */}
                    <div
                      className="absolute w-3 h-3 bg-blue-500 border border-white cursor-se-resize"
                      style={{ bottom: '-6px', right: '-6px' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaY = moveEvent.clientY - startY;
                          
                          setCropArea(prev => ({
                            x: startCrop.x,
                            y: startCrop.y,
                            width: Math.max(50, startCrop.width + deltaX),
                            height: Math.max(50, startCrop.height + deltaY)
                          }));
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Controles de redimensionamiento en los bordes */}
                    {/* Borde superior */}
                    <div
                      className="absolute h-2 bg-blue-500/50 cursor-n-resize"
                      style={{ top: '-4px', left: '0', right: '0' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const startY = e.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaY = moveEvent.clientY - startY;
                          
                          setCropArea(prev => ({
                            ...prev,
                            y: Math.max(0, startCrop.y + deltaY),
                            height: Math.max(50, startCrop.height - deltaY)
                          }));
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Borde inferior */}
                    <div
                      className="absolute h-2 bg-blue-500/50 cursor-s-resize"
                      style={{ bottom: '-4px', left: '0', right: '0' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const startY = e.clientY;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaY = moveEvent.clientY - startY;
                          
                          setCropArea(prev => ({
                            ...prev,
                            height: Math.max(50, startCrop.height + deltaY)
                          }));
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Borde izquierdo */}
                    <div
                      className="absolute w-2 bg-blue-500/50 cursor-w-resize"
                      style={{ left: '-4px', top: '0', bottom: '0' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const startX = e.clientX;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          
                          setCropArea(prev => ({
                            ...prev,
                            x: Math.max(0, startCrop.x + deltaX),
                            width: Math.max(50, startCrop.width - deltaX)
                          }));
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Borde derecho */}
                    <div
                      className="absolute w-2 bg-blue-500/50 cursor-e-resize"
                      style={{ right: '-4px', top: '0', bottom: '0' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const startX = e.clientX;
                        const startCrop = { ...cropArea };
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          
                          setCropArea(prev => ({
                            ...prev,
                            width: Math.max(50, startCrop.width + deltaX)
                          }));
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                  </div>
                </div>
                
                {/* Controles de encuadre */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={applyCrop}
                    disabled={isCropping || !validarEncuadre() || !(pageReady || imageReady) || !currentUser?.id}
                    title={
                      isCropping ? 'Aplicando encuadre...' :
                      !validarEncuadre() ? 'Ajusta el encuadre para que sea válido' :
                      !(pageReady || imageReady) ? 'Espera a que el documento termine de cargar' :
                      !currentUser?.id ? 'Debes estar autenticado' :
                      'Aplicar encuadre seleccionado'
                    }
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCropping ? '⏳ Aplicando...' : 
                     !validarEncuadre() ? '⏳ Ajusta el encuadre...' :
                     !(pageReady || imageReady) ? '⏳ Esperando Documento...' :
                     '✅ Aplicar Encuadre'}
                  </button>
                  <button
                    onClick={cancelPreview}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    ❌ Cancelar
                  </button>
                </div>
                
                {/* Controles adicionales de encuadre */}
                <div className="flex flex-col sm:flex-row gap-2 justify-center mt-3">
                  <button
                    onClick={() => {
                      // Centrar el encuadre
                      if (selectedFile?.type === 'application/pdf') {
                        const pdfCanvas = pageContainerRef.current?.querySelector('canvas');
                        if (pdfCanvas) {
                          const centerX = Math.max(0, (pdfCanvas.width - cropArea.width) / 2);
                          const centerY = Math.max(0, (pdfCanvas.height - cropArea.height) / 2);
                          
                          setCropArea(prev => ({
                            ...prev,
                            x: centerX,
                            y: centerY
                          }));
                          
                          mostrarMensaje('info', 'Encuadre centrado');
                        }
                      } else if (selectedFile?.type.startsWith('image/')) {
                        const imgCanvas = pageContainerRef.current?.querySelector('canvas');
                        if (imgCanvas) {
                          const centerX = Math.max(0, (imgCanvas.width - cropArea.width) / 2);
                          const centerY = Math.max(0, (imgCanvas.height - cropArea.height) / 2);
                          
                          setCropArea(prev => ({
                            ...prev,
                            x: centerX,
                            y: centerY
                          }));
                          
                          mostrarMensaje('info', 'Encuadre centrado');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🎯 Centrar
                  </button>
                  
                  <button
                    onClick={() => {
                      // Ajustar al tamaño completo de la imagen
                      if (selectedFile?.type === 'application/pdf') {
                        const pdfCanvas = pageContainerRef.current?.querySelector('canvas');
                        if (pdfCanvas) {
                          setCropArea({
                            x: 0,
                            y: 0,
                            width: pdfCanvas.width,
                            height: pdfCanvas.height
                          });
                          
                          mostrarMensaje('info', 'Encuadre ajustado al tamaño completo');
                        }
                      } else if (selectedFile?.type.startsWith('image/')) {
                        const imgCanvas = pageContainerRef.current?.querySelector('canvas');
                        if (imgCanvas) {
                          setCropArea({
                            x: 0,
                            y: 0,
                            width: imgCanvas.width,
                            height: imgCanvas.height
                          });
                          
                          mostrarMensaje('info', 'Encuadre ajustado al tamaño completo');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    📏 Tamaño Completo
                  </button>
                  
                  <button
                    onClick={() => {
                      // Resetear al tamaño inicial (80% del centro)
                      if (selectedFile?.type === 'application/pdf') {
                        const pdfCanvas = pageContainerRef.current?.querySelector('canvas');
                        if (pdfCanvas) {
                          const newWidth = Math.max(100, pdfCanvas.width * 0.8);
                          const newHeight = Math.max(100, pdfCanvas.height * 0.8);
                          const newX = Math.max(0, (pdfCanvas.width - newWidth) / 2);
                          const newY = Math.max(0, (pdfCanvas.height - newHeight) / 2);
                          
                          setCropArea({
                            x: newX,
                            y: newY,
                            width: newWidth,
                            height: newHeight
                          });
                          
                          mostrarMensaje('info', 'Encuadre reseteado');
                        }
                      } else if (selectedFile?.type.startsWith('image/')) {
                        const imgCanvas = pageContainerRef.current?.querySelector('canvas');
                        if (imgCanvas) {
                          const newWidth = Math.max(100, imgCanvas.width * 0.8);
                          const newHeight = Math.max(100, imgCanvas.height * 0.8);
                          const newX = Math.max(0, (imgCanvas.width - newWidth) / 2);
                          const newY = Math.max(0, (imgCanvas.height - newHeight) / 2);
                          
                          setCropArea({
                            x: newX,
                            y: newY,
                            width: newWidth,
                            height: newHeight
                          });
                          
                          mostrarMensaje('info', 'Encuadre reseteado');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🔄 Resetear
                  </button>
                </div>
                
                {/* Estado del encuadre */}
                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg text-center">
                  {croppedFile ? (
                    <p className="text-lg font-bold text-green-400 animate-pulse">
                      ✅ Encuadre aplicado
                    </p>
                  ) : (
                    <p className="text-lg font-semibold text-blue-300">
                      🔄 Arrastra para ajustar el encuadre
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Botón procesar */}
            <div className="flex items-center justify-between mb-4">
              {Object.values(schemaHints).some(hints => hints && hints.trim().length > 0) && (
                <span className="text-sm text-green-400 font-medium">🎯 Usando pistas personalizadas</span>
              )}
            </div>
            
            {/* Debug del botón movido a useEffect con DEBUG */}
            
            <button
              type="button"
                          onClick={(e) => {
              if (process.env.NODE_ENV !== 'production') {
                console.log('🎯 Click en botón detectado, disabled:', getButtonState().isDisabled);
                console.log('📊 Estado actual en onClick:', {
                  croppedFile,
                  croppedFilePath: croppedFile?.path,
                  selectedFileType: selectedFile?.type
                });
              }
              if (!getButtonState().isDisabled) {
                procesarConIA();
              }
            }}
            onMouseDown={() => {
              if (process.env.NODE_ENV !== 'production') {
                console.log('🖱️ MouseDown en botón');
              }
            }}
              disabled={getButtonState().isDisabled}
              style={{ position: 'relative', zIndex: 50 }}
              className={`w-full py-4 px-8 rounded-2xl font-bold text-white text-lg transition-all duration-300 shadow-lg ${
                getButtonState().isDisabled
                  ? 'bg-gray-500/50 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {getButtonState().text}
            </button>
          </div>

          {/* Mensaje cuando no hay items en el draft */}
          {haProcesado && draft.items.length === 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 mb-6 border border-white/20">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">❌ No se detectó draft válido</h2>
                <p className="text-gray-300 mb-6 text-lg">El documento no pudo generar un borrador con ítems válidos. Revisa la consola para más detalles.</p>
                
                {/* Información de debug visible */}
                <div className="mb-6 p-4 bg-yellow-500/10 backdrop-blur-sm border border-yellow-400/30 rounded-xl text-left">
                  <h4 className="text-lg font-bold text-yellow-300 mb-3">🔍 Información del documento:</h4>
                  <div className="text-sm text-yellow-200 space-y-2">
                    <p>• <strong>Archivo:</strong> {selectedFile?.name || 'N/A'}</p>
                    <p>• <strong>Tipo:</strong> {selectedFile?.type || 'N/A'}</p>
                    <p>• <strong>Tamaño:</strong> {selectedFile ? (selectedFile.size / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
                    <p>• <strong>Schema hints activos:</strong> {Object.keys(schemaHints).length}</p>
                  </div>
                </div>

                {/* Sugerencias para mejorar */}
                <div className="mb-6 p-4 bg-blue-500/10 backdrop-blur-sm border border-blue-400/30 rounded-xl text-left">
                  <h4 className="text-lg font-bold text-blue-300 mb-3">💡 Sugerencias para mejorar la extracción:</h4>
                  <div className="text-sm text-blue-200 space-y-2">
                    <ul className="space-y-1">
                      <li>• Asegúrate de que el PDF tenga texto seleccionable (no solo imágenes)</li>
                      <li>• El documento debe contener información de productos con cantidades y precios</li>
                      <li>• Verifica que el formato sea similar a una factura, boleta o inventario</li>
                      <li>• Si es una imagen, asegúrate de que sea clara y legible</li>
                      <li>• Los schema hints pueden ayudar a la IA a identificar campos específicos</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setShowSchemaHints(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    🔧 Editar pistas y reintentar
                  </button>
                  <button
                    onClick={() => {
                      if (process.env.NODE_ENV !== 'production') {
                        console.log('🔍 Debug completo del estado actual:', {
                          selectedFile,
                          schemaHints: normalizarSchemaHints(),
                          draft,
                          haProcesado
                        });
                      }
                      mostrarMensaje('info', 'Información de debug enviada a la consola');
                    }}
                    className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    📋 Debug en Consola
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Paso B: Previsualización */}
          {draft.items.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 mb-6 border border-white/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 sm:mb-0">📋 Borrador IA</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={agregarItemManual}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    title="Agregar un elemento manual al borrador para productos que la IA no detectó"
                  >
                    ➕ Agregar Elemento
                  </button>
                  <button
                    onClick={guardarBorrador}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    💾 Guardar borrador
                  </button>
                  <button
                    onClick={aplicarAInventario}
                    disabled={loading || !validarDraft()}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Aplica todos los ítems del borrador al inventario principal. Esta acción no se puede deshacer."
                  >
                    🚀 Aplicar a inventario
                  </button>
                  <div className="text-xs text-green-400 mt-2 text-center cursor-help" title="Transfiere todos los ítems del borrador al inventario principal. Los ítems se agregarán con la fecha de ingreso especificada y estarán disponibles para ventas.">
                    💡 Transferir al stock
                  </div>
                  <button
                    onClick={reiniciar}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    🔄 Reiniciar
                  </button>
                </div>
              </div>





              {/* Tabla editable */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-white/20 table-auto rounded-2xl overflow-hidden">
                  <thead className="bg-white/10 backdrop-blur-sm">
                    <tr>
                      <th className="border border-white/20 px-4 py-3 text-left text-sm font-bold text-white">Producto</th>
                      <th className="border border-white/20 px-4 py-3 text-center text-sm font-bold text-white w-[150px]" style={{ minWidth: '150px', width: '150px' }}>Cantidad</th>
                      <th className="border border-white/20 px-4 py-3 text-center text-sm font-bold text-white w-[110px]">Unidad</th>
                      <th className="border border-white/20 px-4 py-3 text-center text-sm font-bold text-white w-[150px]">Costo Total</th>
                      <th className="border border-white/20 px-4 py-3 text-center text-sm font-bold text-white w-[100px]">
                        % Ganancia
                        <span className="ml-2 text-xs text-gray-300">(global: {gananciaGlobal}%)</span>
                      </th>
                      <th className="border border-white/20 px-4 py-3 text-center text-sm font-bold text-white w-[180px]">$ Precio Unitario</th>
                      <th className="border border-white/20 px-4 py-3 text-center text-sm font-bold text-white w-[180px]">$ Precio Venta</th>
                      <th className="border border-white/20 px-4 py-3 text-center text-sm font-bold text-white w-10">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.items.map((item) => {
                      const { precioUnitario, precioVenta } = calcularPrecios(item);
                      const errores = validarItem(item);
                      
                      return (
                        <tr key={item.id} className={`${errores.length > 0 ? 'bg-red-500/10' : 'hover:bg-white/5'} transition-colors duration-200`}>
                          <td className="border border-white/20 px-4 py-3 align-middle min-w-[250px]">
                            <textarea
                              value={item.producto || ''}
                              onChange={(e) => actualizarItem(item.id, 'producto', e.target.value)}
                              onInput={handleTextareaResize}
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 resize-none h-10 text-sm leading-tight bg-white/10 text-white placeholder-gray-400 ${
                                !item.producto?.trim() ? 'border-red-400 bg-red-500/10' : 'border-white/20'
                              }`}
                              rows={1}
                              style={{ 
                                minHeight: '2.5rem',
                                maxHeight: '8rem',
                                height: 'auto',
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                whiteSpace: 'normal'
                              }}
                              title={`${item.producto || 'Ver detalle'}${item.producto ? ' - Click para editar' : ''}`}
                              placeholder="Descripción del producto..."
                            />
                          </td>
                          <td className="border border-white/20 px-4 py-3 align-middle w-[150px]" style={{ minWidth: '150px', width: '150px' }}>
                            <input
                              type="number"
                              value={item.cantidad || ''}
                              onChange={(e) => actualizarItem(item.id, 'cantidad', e.target.value)}
                              min="0"
                              step="0.001"
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 h-10 text-sm leading-tight bg-white/10 text-white placeholder-gray-400 ${
                                !item.cantidad || parseFloat(item.cantidad) <= 0 ? 'border-red-400 bg-red-500/10' : 'border-white/20'
                              }`}
                              style={{ textAlign: 'right', fontFamily: 'monospace' }}
                              title="Cantidad del producto (debe ser mayor a 0)"
                              placeholder="0.000"
                            />
                          </td>
                          <td className="border border-white/20 px-4 py-3 align-middle w-[110px]">
                            <div className="relative">
                              <div
                                onClick={() => {
                                  setDraft(prev => ({
                                    ...prev,
                                    items: prev.items.map(tableItem => 
                                      tableItem.id === item.id 
                                        ? { ...tableItem, showUnidadDropdown: !tableItem.showUnidadDropdown }
                                        : { ...tableItem, showUnidadDropdown: false }
                                    )
                                  }));
                                }}
                                className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 h-8 text-sm leading-tight cursor-pointer flex items-center justify-between"
                                style={{ 
                                  backgroundColor: 'white',
                                  color: 'black',
                                  fontWeight: '500'
                                }}
                                title="Unidad de medida del producto"
                              >
                                <span className="text-black">
                                  {item.unidad || 'Seleccionar'}
                                </span>
                                <span className="text-gray-500">▼</span>
                              </div>
                              
                              {item.showUnidadDropdown && (
                                <div className={`absolute left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 ${
                                  // Si es una de las últimas 2 filas, despliega hacia arriba
                                  draft.items.indexOf(item) >= draft.items.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'
                                }`}>
                                  <div
                                    onClick={() => {
                                      actualizarItem(item.id, 'unidad', '');
                                      setDraft(prev => ({
                                        ...prev,
                                        items: prev.items.map(tableItem => ({ ...tableItem, showUnidadDropdown: false }))
                                      }));
                                    }}
                                    className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-black"
                                  >
                                    Seleccionar
                                  </div>
                                  <div
                                    onClick={() => {
                                      actualizarItem(item.id, 'unidad', 'unidad');
                                      setDraft(prev => ({
                                        ...prev,
                                        items: prev.items.map(tableItem => ({ ...tableItem, showUnidadDropdown: false }))
                                      }));
                                    }}
                                    className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-black"
                                  >
                                    unidad
                                  </div>
                                  <div
                                    onClick={() => {
                                      actualizarItem(item.id, 'unidad', 'kg');
                                      setDraft(prev => ({
                                        ...prev,
                                        items: prev.items.map(tableItem => ({ ...tableItem, showUnidadDropdown: false }))
                                      }));
                                    }}
                                    className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-black"
                                  >
                                    kg
                                  </div>
                                  <div
                                    onClick={() => {
                                      actualizarItem(item.id, 'unidad', 'gr');
                                      setDraft(prev => ({
                                        ...prev,
                                        items: prev.items.map(tableItem => ({ ...tableItem, showUnidadDropdown: false }))
                                      }));
                                    }}
                                    className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-black"
                                  >
                                    gr
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="border border-white/20 px-4 py-3 align-middle w-[150px]" style={{ minWidth: '150px', width: '150px' }}>
                            <input
                              type="number"
                              value={item.costo_total || ''}
                              onChange={(e) => actualizarItem(item.id, 'costo_total', e.target.value)}
                              min="0"
                              step="0.01"
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 h-10 text-sm leading-tight bg-white/10 text-white placeholder-gray-400 ${
                                item.costo_total === null || item.costo_total === undefined || item.costo_total === '' ? 'border-red-400 bg-red-500/10' : 'border-white/20'
                              }`}
                              style={{ textAlign: 'right', fontFamily: 'monospace' }}
                              title="Costo total del producto (requerido)"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="border border-white/20 px-4 py-3 align-middle w-[100px]">
                            <div className="relative">
                              <input
                                type="number"
                                value={item.porcentaje_ganancia || gananciaGlobal}
                                onChange={(e) => actualizarItem(item.id, 'porcentaje_ganancia', parseFloat(e.target.value) || gananciaGlobal)}
                                min="0"
                                max="100"
                                step="0.1"
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 h-10 text-sm leading-tight bg-white/10 text-white placeholder-gray-400 ${
                                  item.porcentaje_ganancia ? 'border-blue-300' : 'border-white/20'
                                }`}
                                style={{ textAlign: 'center', fontFamily: 'monospace' }}
                                title={`Ganancia por ítem (global: ${gananciaGlobal}%). Deja vacío para usar la ganancia global.`}
                                placeholder={gananciaGlobal.toString()}
                              />
                              {!item.porcentaje_ganancia && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" title="Usando ganancia global"></div>
                              )}
                            </div>
                          </td>
                          <td className="border border-white/20 px-4 py-3 align-middle w-[180px]">
                            <span 
                              className="font-mono text-right whitespace-nowrap cursor-help block py-2 text-white"
                              title={`Cálculo: ${formatearPrecioCLP(item.costo_total || 0)} ÷ ${Math.max(1, item.cantidad || 0)} = ${formatearPrecioCLP(item.precio_unitario || 0)} (calculado)`}
                            >
                              {item.precio_unitario ? formatearPrecioCLP(item.precio_unitario).replace('$', '').trim() : '0'}
                            </span>
                          </td>
                          <td className="border border-white/20 px-4 py-3 align-middle w-[180px]">
                            <span 
                              className="font-mono text-right whitespace-nowrap cursor-help block py-2 text-white"
                              title={`Cálculo: ${formatearPrecioCLP(item.precio_unitario || 0)} × (1 + ${item.margen || gananciaGlobal}%) × 1.19 = ${formatearPrecioCLP(item.precio_venta || 0)} (calculado). Precio final con ganancia e IVA incluido.`}
                            >
                              {item.precio_venta ? formatearPrecioCLP(item.precio_venta).replace('$', '').trim() : '0'}
                            </span>
                          </td>
                          <td className="border border-white/20 px-4 py-3 align-middle w-10 text-center whitespace-nowrap overflow-hidden">
                            <button
                              onClick={() => eliminarItem(item.id)}
                              className="w-8 h-8 inline-flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full text-sm font-bold transition-all duration-200"
                              title="Eliminar este ítem del borrador"
                              aria-label="Eliminar"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Errores de validación */}
              {!draftValidation.isValid && (
                <div className="mt-6 p-6 bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-2xl">
                  <h4 className="text-lg font-bold text-red-300 mb-4">⚠️ Errores de validación:</h4>
                  <ul className="text-sm text-red-200 space-y-2">
                    {draft.items.map((item, i) => (
                      draftValidation.errorsByIndex[i].map((error, index) => (
                        <li key={`${item.id}-${index}`}>• {item.producto || 'Item'}: {error}</li>
                      ))
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}


        </div>
      </div>
      <Footer />
    </div>
  );
};

export default InventarioIA;