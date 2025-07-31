import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Footer from './Footer';

export default function Stock() {
  const navigate = useNavigate();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Nuevos estados para el producto más vendido
  const [productoMasVendido, setProductoMasVendido] = useState(null);
  const [loadingMasVendido, setLoadingMasVendido] = useState(true);
  const [errorMasVendido, setErrorMasVendido] = useState(null);
  
  // Estado para indicar actualización automática
  const [actualizandoAutomaticamente, setActualizandoAutomaticamente] = useState(false);

  // Referencias para limpiar intervalos y suscripciones
  const intervalRef = useRef(null);
  const subscriptionRef = useRef(null);

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

  // Nueva función para cargar el producto más vendido
  const cargarProductoMasVendido = async () => {
    try {
      setLoadingMasVendido(true);
      setErrorMasVendido(null);

      // Función de depuración para verificar datos
      const debugDatos = async () => {
        // Verificar datos en ventas
        const { data: ventasData, error: ventasError } = await supabase
          .from('ventas')
          .select('*')
          .ilike('producto', '%T1%');
        
        console.log('🔍 Datos de ventas con T1:', ventasData);
        console.log('🔍 Error en ventas:', ventasError);

        // Verificar todos los datos en productos_mas_vendidos
        const { data: todosProductos, error: todosError } = await supabase
          .from('productos_mas_vendidos')
          .select('*');
        
        console.log('🔍 Todos los productos más vendidos:', todosProductos);
        console.log('🔍 Error en productos_mas_vendidos:', todosError);
      };

      // Ejecutar depuración
      await debugDatos();

      const { data, error } = await supabase
        .from('productos_mas_vendidos')
        .select('*')
        .order('cantidad_vendida', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error al cargar producto más vendido:', error);
        setErrorMasVendido('Error al cargar el producto más vendido');
        return;
      }

      setProductoMasVendido(data && data.length > 0 ? data[0] : null);
      console.log('✅ Producto más vendido cargado:', data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error inesperado al cargar producto más vendido:', error);
      setErrorMasVendido('Error inesperado al cargar el producto más vendido');
    } finally {
      setLoadingMasVendido(false);
    }
  };

  // Función para configurar suscripción en tiempo real
  const configurarSuscripcionTiempoReal = () => {
    // Suscripción a cambios en la tabla de ventas
    subscriptionRef.current = supabase
      .channel('ventas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ventas'
        },
        (payload) => {
          console.log('🔄 Cambio detectado en ventas:', payload);
          // Actualizar datos cuando hay cambios en ventas
          setActualizandoAutomaticamente(true);
          cargarStock();
          cargarProductoMasVendido();
          setTimeout(() => setActualizandoAutomaticamente(false), 2000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventario'
        },
        (payload) => {
          console.log('🔄 Cambio detectado en inventario:', payload);
          // Actualizar datos cuando hay cambios en inventario
          setActualizandoAutomaticamente(true);
          cargarStock();
          cargarProductoMasVendido();
          setTimeout(() => setActualizandoAutomaticamente(false), 2000);
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status);
      });
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
    cargarProductoMasVendido();
    
    // Configurar suscripción en tiempo real
    configurarSuscripcionTiempoReal();
    
    // Configurar actualización periódica cada 30 segundos
    intervalRef.current = setInterval(() => {
      console.log('🔄 Actualización periódica automática...');
      setActualizandoAutomaticamente(true);
      cargarStock();
      cargarProductoMasVendido();
      setTimeout(() => setActualizandoAutomaticamente(false), 2000);
    }, 30000); // 30 segundos

    // Limpiar al desmontar el componente
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  // Función para recargar datos
  const recargarDatos = () => {
    cargarStock();
    cargarProductoMasVendido();
  };

  // Función para actualizar manualmente productos_mas_vendidos desde ventas
  const actualizarProductosMasVendidosManual = async () => {
    try {
      console.log('🔄 Actualizando productos_mas_vendidos manualmente...');
      
      // Primero verificar la estructura de la tabla
      const { data: schemaData, error: schemaError } = await supabase
        .from('productos_mas_vendidos')
        .select('*')
        .limit(1);
      
      console.log('🔍 Estructura de la tabla:', schemaData);
      console.log('🔍 Error de esquema:', schemaError);
      
      // Obtener datos agregados de ventas
      const { data: ventasAgregadas, error: ventasError } = await supabase
        .from('ventas')
        .select('producto, cantidad')
        .order('producto');
      
      if (ventasError) {
        console.error('Error al obtener datos de ventas:', ventasError);
        return;
      }

      console.log('📊 Datos de ventas obtenidos:', ventasAgregadas);

      // Agregar cantidades por producto
      const productosAgregados = {};
      ventasAgregadas.forEach(venta => {
        if (productosAgregados[venta.producto]) {
          productosAgregados[venta.producto] += parseFloat(venta.cantidad);
        } else {
          productosAgregados[venta.producto] = parseFloat(venta.cantidad);
        }
      });

      console.log('📦 Productos agregados:', productosAgregados);

      // Limpiar tabla productos_mas_vendidos
      const { error: deleteError } = await supabase
        .from('productos_mas_vendidos')
        .delete()
        .neq('id', 0); // Eliminar todos los registros

      if (deleteError) {
        console.error('Error al limpiar tabla:', deleteError);
        return;
      }

      // Insertar datos actualizados - versión simplificada sin fecha_ultima_venta
      for (const [producto, cantidad] of Object.entries(productosAgregados)) {
        const insertData = {
          producto: producto,
          cantidad_vendida: cantidad
        };
        
        // Solo agregar fecha_ultima_venta si la columna existe
        if (schemaData && schemaData.length > 0 && schemaData[0].hasOwnProperty('fecha_ultima_venta')) {
          insertData.fecha_ultima_venta = new Date().toISOString();
        }
        
        const { error: insertError } = await supabase
          .from('productos_mas_vendidos')
          .insert(insertData);

        if (insertError) {
          console.error(`Error al insertar ${producto}:`, insertError);
        } else {
          console.log(`✅ ${producto} insertado correctamente`);
        }
      }

      console.log('✅ Productos_mas_vendidos actualizado manualmente');
      
      // Recargar datos
      cargarProductoMasVendido();
      
    } catch (error) {
      console.error('Error en actualización manual:', error);
    }
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
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Botón de regreso */}
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

          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            📊 Sistema de Stock
          </h1>
          
          {/* Indicador de actualización automática */}
          {actualizandoAutomaticamente && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-sm text-green-300 px-4 py-2 rounded-full border border-green-400/30 animate-pulse">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                <span className="text-sm font-medium">Actualizando automáticamente...</span>
              </div>
            </div>
          )}

          {/* Botones de recarga */}
          <div className="mb-4 md:mb-6 text-center space-y-2">
            <button
              onClick={recargarDatos}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-colors flex items-center mx-auto text-sm md:text-base"
            >
              <span className="mr-2">🔄</span>
              {loading ? 'Cargando...' : 'Recargar Datos'}
            </button>
            
            <button
              onClick={actualizarProductosMasVendidosManual}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-colors flex items-center mx-auto text-sm md:text-base"
            >
              <span className="mr-2">🔧</span>
              Actualizar Productos Más Vendidos
            </button>
          </div>

          {/* Contenido principal */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            {/* Indicador de carga */}
            {loading && (
              <div className="text-center py-6 md:py-8">
                <div className="inline-block animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-green-400"></div>
                <p className="text-white mt-3 md:mt-4 text-sm md:text-base">Cargando datos del stock...</p>
              </div>
            )}

            {/* Mensaje de error */}
            {error && !loading && (
              <div className="text-center py-6 md:py-8">
                <div className="text-red-400 text-3xl md:text-4xl mb-3 md:mb-4">❌</div>
                <p className="text-red-400 text-base md:text-lg font-bold mb-2">Error</p>
                <p className="text-gray-300 mb-3 md:mb-4 text-sm md:text-base">{error}</p>
                <button
                  onClick={recargarDatos}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm md:text-base"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}

            {/* Tabla de datos */}
            {!loading && !error && (
              <>
                {stockData.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-gray-400 text-3xl md:text-4xl mb-3 md:mb-4">📦</div>
                    <p className="text-gray-300 text-base md:text-lg font-bold">No hay stock disponible</p>
                    <p className="text-gray-500 mt-2 text-sm md:text-base">
                      No se encontraron productos en el inventario
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="bg-white/10 backdrop-blur-sm">
                          <th className="text-white font-semibold p-2 md:p-4 text-left">📦 Producto</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">📥 Total Ingresado</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">📤 Total Vendido</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">📊 Stock Restante</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">🏷️ Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockData.map((item, index) => (
                          <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                            <td className="text-white p-2 md:p-4 font-medium text-xs md:text-sm truncate max-w-20 md:max-w-32">
                              {item.producto || 'Sin nombre'}
                            </td>
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {formatearNumero(item.total_ingresado || 0)}
                            </td>
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {formatearNumero(item.total_vendido || 0)}
                            </td>
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {formatearNumero(item.stock_restante || 0)}
                            </td>
                            <td className="p-2 md:p-4">
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
            <div className="mt-6 md:mt-8">
              <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-green-400 text-center">
                📊 Resumen de Stock
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
                  <div className="flex items-center">
                    <span className="text-green-400 text-2xl md:text-3xl mr-3 md:mr-4">📦</span>
                    <div>
                      <p className="text-gray-300 text-xs md:text-sm font-medium">Total Productos</p>
                      <p className="text-white text-xl md:text-2xl font-bold">
                        {stockData.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
                  <div className="flex items-center">
                    <span className="text-green-400 text-2xl md:text-3xl mr-3 md:mr-4">✅</span>
                    <div>
                      <p className="text-gray-300 text-xs md:text-sm font-medium">Disponibles</p>
                      <p className="text-white text-xl md:text-2xl font-bold">
                        {stockData.filter(item => item.estado?.toLowerCase() === 'disponible').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
                  <div className="flex items-center">
                    <span className="text-red-400 text-2xl md:text-3xl mr-3 md:mr-4">⚠️</span>
                    <div>
                      <p className="text-gray-300 text-xs md:text-sm font-medium">Bajo Stock</p>
                      <p className="text-white text-xl md:text-2xl font-bold">
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

          {/* Sección del Producto Más Vendido */}
          <div className="mt-6 md:mt-8">
            <div className="flex items-center justify-center gap-3 mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-semibold text-yellow-400 text-center">
                🏆 Producto Más Vendido
              </h2>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span>Actualización automática</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-yellow-400/30">
              {loadingMasVendido ? (
                <div className="text-center py-6 md:py-8">
                  <div className="inline-block animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-yellow-400"></div>
                  <p className="text-white mt-3 md:mt-4 text-sm md:text-base">Cargando producto más vendido...</p>
                </div>
              ) : errorMasVendido ? (
                <div className="text-center py-6 md:py-8">
                  <div className="text-red-400 text-3xl md:text-4xl mb-3 md:mb-4">❌</div>
                  <p className="text-red-400 text-base md:text-lg font-bold mb-2">Error</p>
                  <p className="text-gray-300 mb-3 md:mb-4 text-sm md:text-base">{errorMasVendido}</p>
                  <button
                    onClick={cargarProductoMasVendido}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm md:text-base"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              ) : productoMasVendido ? (
                <div className="text-center">
                  <div className="mb-6 md:mb-8">
                    <div className="text-yellow-400 text-5xl md:text-7xl mb-4 md:mb-6 animate-pulse">🏆</div>
                    <h3 className="text-white text-2xl md:text-3xl font-bold mb-3 md:mb-4">
                      {productoMasVendido.producto || 'Producto sin nombre'}
                    </h3>
                    <p className="text-gray-300 text-base md:text-lg mb-6">
                      El producto con mayor cantidad vendida
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-yellow-400/40 shadow-xl">
                      <div className="text-center">
                        <div className="text-yellow-400 text-4xl md:text-5xl mb-4">📦</div>
                        <p className="text-gray-300 text-sm md:text-base font-medium mb-2">Cantidad Vendida</p>
                        <p className="text-yellow-300 text-3xl md:text-4xl font-bold">
                          {formatearNumero(productoMasVendido.cantidad_vendida || 0)}
                        </p>
                        <p className="text-gray-400 text-xs md:text-sm mt-2">unidades</p>
                      </div>
                    </div>
                  </div>
                  
                  {productoMasVendido.fecha_ultima_venta && (
                    <div className="mt-6 md:mt-8 p-4 md:p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <p className="text-gray-300 text-sm md:text-base text-center">
                        <span className="text-yellow-400 font-medium">Última venta:</span> {' '}
                        {new Date(productoMasVendido.fecha_ultima_venta).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12">
                  <div className="text-gray-400 text-4xl md:text-6xl mb-4 md:mb-6">📊</div>
                  <p className="text-gray-300 text-lg md:text-xl font-bold mb-3">No hay productos vendidos</p>
                  <p className="text-gray-500 text-sm md:text-base">
                    Aún no se han registrado ventas de productos
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
} 