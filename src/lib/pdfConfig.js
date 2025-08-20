import { GlobalWorkerOptions } from 'pdfjs-dist';

// Configuración del worker de PDF.js
// Usar el worker copiado al directorio público para evitar problemas de CORS
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

console.log('Worker de PDF.js configurado desde directorio público:', GlobalWorkerOptions.workerSrc);

// También configurar en window para compatibilidad
if (typeof window !== 'undefined') {
  window.pdfjsLib = { GlobalWorkerOptions };
}

export default GlobalWorkerOptions;
