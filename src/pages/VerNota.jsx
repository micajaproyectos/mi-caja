import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import thermalPrinter from '../lib/thermalPrinter.js';

const TIPO_PAGO_TEXTO = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
};

function VerNota() {
  const { token } = useParams();
  const [recibo, setRecibo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('notas_venta_publicas')
        .select('datos_recibo')
        .eq('token', token)
        .single();

      if (error || !data) {
        setError('Este enlace no es válido o el recibo ya no existe.');
      } else {
        setRecibo(data.datos_recibo);
      }
      setLoading(false);
    };
    cargar();
  }, [token]);

  const descargar = async () => {
    setDescargando(true);
    try {
      await thermalPrinter.descargarPDF(recibo, recibo.nombreUsuario || 'MI CAJA');
    } finally {
      setDescargando(false);
    }
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '';
    const [year, month, day] = fechaISO.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CL', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Cargando recibo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Recibo no encontrado</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const tipoPago = TIPO_PAGO_TEXTO[recibo.tipo_pago] || recibo.tipo_pago;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">

      {/* Encabezado */}
      <div className="w-full max-w-sm mb-6 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Nota de Venta</p>
        <h1 className="text-xl font-bold text-gray-800">
          {recibo.nombreUsuario || 'MI CAJA'}
        </h1>
      </div>

      {/* Recibo */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden">

        {/* Fecha y pago */}
        <div className="bg-green-600 px-5 py-4">
          <p className="text-green-100 text-xs uppercase tracking-wide">Fecha</p>
          <p className="text-white font-semibold text-base">{formatearFecha(recibo.fecha)}</p>
          <span className="inline-block mt-2 bg-white/20 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {tipoPago}
          </span>
        </div>

        {/* Productos */}
        <div className="px-5 py-4 divide-y divide-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">Detalle</p>
          {recibo.productos.map((p, i) => (
            <div key={i} className="py-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-800 flex-1 pr-2">{p.producto}</span>
                <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                  ${parseFloat(p.subtotal).toLocaleString('es-CL')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {parseFloat(p.cantidad).toLocaleString('es-CL')} {p.unidad} × ${parseFloat(p.precio_unitario).toLocaleString('es-CL')}
              </p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-600">Total</span>
          <span className="text-xl font-bold text-green-700">
            ${parseFloat(recibo.total).toLocaleString('es-CL')}
          </span>
        </div>
      </div>

      {/* Botón descargar */}
      <div className="w-full max-w-sm mt-5">
        <button
          onClick={descargar}
          disabled={descargando}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors duration-200 text-sm"
        >
          {descargando ? 'Generando PDF...' : '⬇️ Descargar PDF'}
        </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-300">Generado con Mi Caja · micajaempresa.cl</p>
    </div>
  );
}

export default VerNota;
