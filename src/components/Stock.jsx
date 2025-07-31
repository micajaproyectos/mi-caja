import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Stock() {
  const navigate = useNavigate();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para cargar datos del stock desde la vista stock_view
  const cargarStock = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('stock_view')
        .select('*')
        .order('producto', { ascending: true });

      if (error) {
        console.error('Error al cargar datos del stock:', error);
        setError('Error al cargar los datos del stock');
        return;
      }

      setStockData(data || []);
      console.log('✅ Datos del stock cargados:', data);
    } catch (error) {
      console.error('Error inesperado al cargar datos del stock:', error);
      setError('Error inesperado al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el estilo del estado
  const obtenerEstiloEstado = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'disponible':
        return 'bg-green-100 text-green-800';
      case 'bajo':
        return 'bg-yellow-100 text-yellow-800';
      case 'agotado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para formatear números
  const formatearNumero = (numero) => {
    return Number(numero).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarStock();
  }, []);

  // Función para recargar datos
  const recargarDatos = () => {
    cargarStock();
  };

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
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Botón de regreso */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          <h1 className="text-6xl font-bold text-white text-center drop-shadow-lg mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            📊 Sistema de Stock
          </h1>

          {/* Botón de recarga */}
          <div className="mb-6 text-center">
            <button
              onClick={recargarDatos}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center mx-auto"
            >
              <span className="mr-2">🔄</span>
              {loading ? 'Cargando...' : 'Recargar Datos'}
            </button>
          </div>

          {/* Contenido principal */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Indicador de carga */}
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                <p className="text-white mt-4">Cargando datos del stock...</p>
              </div>
            )}

            {/* Mensaje de error */}
            {error && !loading && (
              <div className="text-center py-8">
                <div className="text-red-400 text-4xl mb-4">❌</div>
                <p className="text-red-400 text-lg font-bold mb-2">Error</p>
                <p className="text-gray-300 mb-4">{error}</p>
                <button
                  onClick={recargarDatos}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}

            {/* Tabla de datos */}
            {!loading && !error && (
              <>
                {stockData.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">📦</div>
                    <p className="text-gray-300 text-lg font-bold">No hay stock disponible</p>
                    <p className="text-gray-500 mt-2">
                      No se encontraron productos en el inventario
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/10 backdrop-blur-sm">
                          <th className="text-white font-semibold p-4 text-left">📦 Producto</th>
                          <th className="text-white font-semibold p-4 text-left">📥 Total Ingresado</th>
                          <th className="text-white font-semibold p-4 text-left">📤 Total Vendido</th>
                          <th className="text-white font-semibold p-4 text-left">📊 Stock Restante</th>
                          <th className="text-white font-semibold p-4 text-left">🏷️ Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockData.map((item, index) => (
                          <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                            <td className="text-white p-4 font-medium">
                              {item.producto || 'Sin nombre'}
                            </td>
                            <td className="text-gray-300 p-4">
                              {formatearNumero(item.total_ingresado || 0)}
                            </td>
                            <td className="text-gray-300 p-4">
                              {formatearNumero(item.total_vendido || 0)}
                            </td>
                            <td className="text-gray-300 p-4">
                              {formatearNumero(item.stock_restante || 0)}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerEstiloEstado(item.estado)}`}>
                                {item.estado || 'Sin estado'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Estadísticas resumidas */}
          {!loading && !error && stockData.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold mb-6 text-green-400 text-center">
                📊 Resumen de Stock
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
                  <div className="flex items-center">
                    <span className="text-green-400 text-3xl mr-4">📦</span>
                    <div>
                      <p className="text-gray-300 text-sm font-medium">Total Productos</p>
                      <p className="text-white text-2xl font-bold">
                        {stockData.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
                  <div className="flex items-center">
                    <span className="text-green-400 text-3xl mr-4">✅</span>
                    <div>
                      <p className="text-gray-300 text-sm font-medium">Disponibles</p>
                      <p className="text-white text-2xl font-bold">
                        {stockData.filter(item => item.estado?.toLowerCase() === 'disponible').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
                  <div className="flex items-center">
                    <span className="text-red-400 text-3xl mr-4">⚠️</span>
                    <div>
                      <p className="text-gray-300 text-sm font-medium">Bajo Stock</p>
                      <p className="text-white text-2xl font-bold">
                        {stockData.filter(item => 
                          item.estado?.toLowerCase() === 'bajo' || 
                          item.estado?.toLowerCase() === 'agotado'
                        ).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 