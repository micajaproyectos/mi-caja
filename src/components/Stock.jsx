import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Footer from './Footer';

export default function Stock() {
  const navigate = useNavigate();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  
  // Nuevos estados para el producto más vendido
  const [productoMasVendido, setProductoMasVendido] = useState(null);
  const [loadingMasVendido, setLoadingMasVendido] = useState(true);
  const [errorMasVendido, setErrorMasVendido] = useState(null);
  
  // Estados para productos sin ventas por más de 30 días
  const [productosSinVentas, setProductosSinVentas] = useState([]);
  const [loadingSinVentas, setLoadingSinVentas] = useState(true);
  const [errorSinVentas, setErrorSinVentas] = useState(null);
  
  // Estado para indicar actualización automática
  const [actualizandoAutomaticamente, setActualizandoAutomaticamente] = useState(false);
  
  // Estado para controlar cuántos productos mostrar
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // Referencias para limpiar intervalos y suscripciones
  const intervalRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Filtrar productos por nombre
  const productosFiltrados = stockData.filter(item =>
    item.producto?.toLowerCase().includes(busquedaProducto.toLowerCase())
  );
  
  // Obtener productos a mostrar (50 inicialmente o todos si mostrarTodos es true)
  const productosAMostrar = mostrarTodos ? productosFiltrados : productosFiltrados.slice(0, 50);

  // Función para cargar datos del stock desde la vista stock_view_new
  const cargarStock = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('stock_view_new')
        .select('*')
        .order('producto', { ascending: true });

      if (error) {
        console.error('Error al cargar datos del stock:', error);
        setError('Error al cargar los datos del stock');
        return;
      }

      setStockData(data || []);
      console.log('✅ Datos del stock cargados desde stock_view_new:', data);
    } catch (error) {
      console.error('Error inesperado al cargar datos del stock:', error);
      setError('Error inesperado al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar productos sin ventas por más de 30 días usando la vista optimizada
  const cargarProductosSinVentas = async () => {
    try {
      setLoadingSinVentas(true);
      setErrorSinVentas(null);

      console.log('🔄 Cargando productos sin ventas desde productos_sin_ventas_30d_view...');

      // Consultar directamente la vista optimizada
      const { data, error } = await supabase
        .from('productos_sin_ventas_30d_view')
        .select('*')
        .order('fecha_ingreso', { ascending: true });

      if (error) {
        console.error('❌ Error al cargar productos sin ventas:', error);
        setErrorSinVentas('Error al cargar productos sin ventas');
        return;
      }

      console.log('📊 Productos sin ventas encontrados:', data?.length || 0);

      setProductosSinVentas(data || []);

    } catch (error) {
      console.error('❌ Error inesperado al cargar productos sin ventas:', error);
      setErrorSinVentas('Error inesperado al cargar productos sin ventas');
    } finally {
      setLoadingSinVentas(false);
    }
  };

  // Nueva función para cargar el producto más vendido desde stock_view_new
  const cargarProductoMasVendido = async () => {
    try {
      setLoadingMasVendido(true);
      setErrorMasVendido(null);

      console.log('🔄 Cargando producto más vendido desde stock_view_new...');

      // Consultar la vista stock_view_new y ordenar por total_vendido descendente
      const { data, error } = await supabase
        .from('stock_view_new')
        .select('producto, total_vendido, total_ingresado, stock_restante, estado')
        .order('total_vendido', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Error al cargar producto más vendido:', error);
        setErrorMasVendido('Error al cargar el producto más vendido');
        return;
      }

      console.log('📊 Datos obtenidos de stock_view_new:', data);

      if (data && data.length > 0) {
        const producto = data[0];
        console.log('🏆 Producto más vendido encontrado:', {
          producto: producto.producto,
          total_vendido: producto.total_vendido,
          stock_restante: producto.stock_restante,
          estado: producto.estado
        });
        
        // Formatear el producto para el estado
        setProductoMasVendido({
          producto: producto.producto,
          cantidad_vendida: producto.total_vendido || 0,
          ultima_venta: null // stock_view no tiene esta información
        });
      } else {
        console.log('📭 No se encontraron productos en stock_view');
        setProductoMasVendido(null);
      }
    } catch (error) {
      console.error('❌ Error inesperado al cargar producto más vendido:', error);
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
          // Actualizar solo el stock cuando hay cambios en ventas
          setActualizandoAutomaticamente(true);
          cargarStock();
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
          // Actualizar solo el stock cuando hay cambios en inventario
          setActualizandoAutomaticamente(true);
          cargarStock();
          setTimeout(() => setActualizandoAutomaticamente(false), 2000);
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en suscripción en tiempo real');
          // Reintentar suscripción después de 5 segundos
          setTimeout(() => {
            console.log('🔄 Reintentando suscripción...');
            configurarSuscripcionTiempoReal();
          }, 5000);
        }
      });
  };

  // Función para calcular el estado basado en el stock restante
  const calcularEstado = (stockRestante) => {
    const cantidad = Number(stockRestante) || 0;
    
    if (cantidad <= 0) {
      return 'Agotado';
    } else if (cantidad <= 5) {
      return 'Bajo';
    } else {
      return 'Disponible';
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

  // Función para formatear números enteros (sin decimales)
  const formatearNumeroEntero = (numero) => {
    return Number(numero).toLocaleString('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Función para formatear números con 1 decimal
  const formatearNumeroUnDecimal = (numero) => {
    return Number(numero).toLocaleString('es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  // Función para formatear números con 2 decimales
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
    cargarProductosSinVentas();
    
    // Configurar suscripción en tiempo real
    configurarSuscripcionTiempoReal();

    // Limpiar al desmontar el componente
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  // Función para recargar datos
  const recargarDatos = () => {
    console.log('🔄 Recarga manual solicitada por el usuario');
    setActualizandoAutomaticamente(true);
    cargarStock();
    cargarProductoMasVendido();
    cargarProductosSinVentas();
    setTimeout(() => setActualizandoAutomaticamente(false), 2000);
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
            Sistema de Stock
          </h1>
          
          {/* Indicador de actualización automática */}
          {actualizandoAutomaticamente && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-sm text-green-300 px-4 py-2 rounded-full border border-green-400/30 animate-pulse">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                <span className="text-sm font-medium">Actualizando datos...</span>
              </div>
            </div>
          )}

                     {/* Botón de recarga */}
           <div className="mb-4 md:mb-6 text-center">
             <button
               onClick={recargarDatos}
               disabled={loading}
               className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-colors flex items-center mx-auto text-sm md:text-base"
             >
               <span className="mr-2">🔄</span>
               {loading ? 'Cargando...' : 'Recargar Datos'}
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
                {/* Barra de búsqueda */}
                {stockData.length > 0 && (
                  <div className="mb-6">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-lg">🔍</span>
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
                    {busquedaProducto && (
                      <div className="mt-2 text-sm text-gray-300">
                        Mostrando {productosAMostrar.length} de {productosFiltrados.length} productos
                      </div>
                    )}
                  </div>
                )}
                
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
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Producto</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Total Ingresado</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Total Vendido</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Stock Restante</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosAMostrar.map((item, index) => (
                          <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                            <td className="text-white p-2 md:p-4 font-medium text-xs md:text-sm truncate max-w-20 md:max-w-32">
                              {item.producto || 'Sin nombre'}
                            </td>
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {formatearNumeroEntero(item.total_ingresado || 0)}
                            </td>
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {formatearNumeroEntero(item.total_vendido || 0)}
                            </td>
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {formatearNumeroUnDecimal(item.stock_restante || 0)}
                            </td>
                            <td className="p-2 md:p-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerEstiloEstado(calcularEstado(item.stock_restante))}`}>
                                {calcularEstado(item.stock_restante)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Botón Mostrar Todo */}
                {!mostrarTodos && productosFiltrados.length > 50 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setMostrarTodos(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm md:text-base"
                    >
                      Mostrar todo
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Estadísticas resumidas */}
          {!loading && !error && stockData.length > 0 && (
            <div className="mt-6 md:mt-8">
              <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-green-400 text-center">
                Resumen de Stock
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
                        {stockData.filter(item => calcularEstado(item.stock_restante).toLowerCase() === 'disponible').length}
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
                        {stockData.filter(item => {
                          const estado = calcularEstado(item.stock_restante).toLowerCase();
                          return estado === 'bajo' || estado === 'agotado';
                        }).length}
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
                Producto Más Vendido
              </h2>
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
                  
                  {productoMasVendido.ultima_venta && (
                    <div className="mt-6 md:mt-8 p-4 md:p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <p className="text-gray-300 text-sm md:text-base text-center">
                        <span className="text-yellow-400 font-medium">Última venta:</span> {' '}
                        {new Date(productoMasVendido.ultima_venta).toLocaleDateString('es-ES', {
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

          {/* Sección de Productos Sin Ventas por más de 30 días */}
          <div className="mt-6 md:mt-8">
            <div className="flex items-center justify-center gap-3 mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-semibold text-red-400 text-center">
                Productos Sin Ventas (+30 días)
              </h2>
            </div>
            
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-red-400/30">
              {loadingSinVentas ? (
                <div className="text-center py-6 md:py-8">
                  <div className="inline-block animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-red-400"></div>
                  <p className="text-white mt-3 md:mt-4 text-sm md:text-base">Cargando productos sin ventas...</p>
                </div>
              ) : errorSinVentas ? (
                <div className="text-center py-6 md:py-8">
                  <div className="text-red-400 text-3xl md:text-4xl mb-3 md:mb-4">❌</div>
                  <p className="text-red-400 text-base md:text-lg font-bold mb-2">Error</p>
                  <p className="text-gray-300 mb-3 md:mb-4 text-sm md:text-base">{errorSinVentas}</p>
                  <button
                    onClick={cargarProductosSinVentas}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm md:text-base"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              ) : productosSinVentas.length > 0 ? (
                <div>
                  <div className="text-center mb-6">
                    <div className="text-red-400 text-4xl md:text-5xl mb-4">⚠️</div>
                    <p className="text-gray-300 text-base md:text-lg mb-2">
                      Productos que no han tenido ventas por más de 30 días
                    </p>
                    <p className="text-gray-400 text-sm">
                      Considera revisar estos productos para optimizar el inventario
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="bg-white/10 backdrop-blur-sm">
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Producto</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Fecha Ingreso</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Stock Disponible</th>
                          <th className="text-white font-semibold p-2 md:p-4 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosSinVentas.map((item, index) => (
                          <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                            <td className="text-white p-2 md:p-4 font-medium text-xs md:text-sm truncate max-w-20 md:max-w-32">
                              {item.producto || 'Sin nombre'}
                            </td>
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {new Date(item.fecha_ingreso).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {formatearNumeroUnDecimal(item.stock_restante || 0)}
                            </td>
                            <td className="p-2 md:p-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerEstiloEstado(calcularEstado(item.stock_restante))}`}>
                                {calcularEstado(item.stock_restante)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <p className="text-gray-300 text-sm">
                        <span className="text-red-400 font-medium">Total:</span> {productosSinVentas.length} productos sin ventas por más de 30 días
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 md:py-12">
                  <div className="text-green-400 text-4xl md:text-6xl mb-4 md:mb-6">✅</div>
                  <p className="text-gray-300 text-lg md:text-xl font-bold mb-3">¡Excelente gestión!</p>
                  <p className="text-gray-500 text-sm md:text-base">
                    Todos los productos han tenido ventas en los últimos 30 días
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