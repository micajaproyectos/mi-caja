import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import Footer from './Footer';

function Insumos() {
  const navigate = useNavigate();
  
  // Estados principales
  const [vistaActual, setVistaActual] = useState('stock'); // 'stock' o 'recetas'
  
  // Estados para gestión de stock de insumos (con cache inicial)
  const [insumos, setInsumos] = useState(() => {
    try {
      const cached = localStorage.getItem('insumos_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingInsumos, setLoadingInsumos] = useState(false);
  
  // Estados para historial de compras (con cache inicial)
  const [compras, setCompras] = useState(() => {
    try {
      const cached = localStorage.getItem('compras_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingCompras, setLoadingCompras] = useState(false);
  
  // Estados para registrar compras de insumos
  const [modalCompraAbierto, setModalCompraAbierto] = useState(false);
  const [lineasCompra, setLineasCompra] = useState([
    { ingrediente: '', cantidad: '', unidad: '' }
  ]);
  
  // Estados para gestión de recetas (con cache inicial)
  const [recetas, setRecetas] = useState(() => {
    try {
      const cached = localStorage.getItem('recetas_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingRecetas, setLoadingRecetas] = useState(false);
  const [recetasCargadas, setRecetasCargadas] = useState(false);
  
  // Obtener ingredientes únicos de las recetas para el dropdown de compras
  const ingredientesDisponibles = useMemo(() => {
    const ingredientesSet = new Set();
    recetas.forEach(receta => {
      receta.ingredientes?.forEach(ing => {
        if (ing.nombre) {
          ingredientesSet.add(JSON.stringify({
            nombre: ing.nombre,
            unidad: ing.unidad
          }));
        }
      });
    });
    return Array.from(ingredientesSet).map(str => JSON.parse(str));
  }, [recetas]);
  
  // Estados para crear nueva receta
  const [productosInventario, setProductosInventario] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadBaseLote, setCantidadBaseLote] = useState('1'); // Para cuántas unidades es esta receta
  const [ingredientesReceta, setIngredientesReceta] = useState([
    { nombre_ingrediente: '', cantidad_necesaria: '', unidad: 'kg' }
  ]);
  
  // Estado para notificación toast
  const [notificacionToast, setNotificacionToast] = useState({ visible: false, mensaje: '', tipo: 'success' });
  
  const unidades = ['kg', 'gr', 'ml', 'Lt', 'unidad', 'pz'];
  
  // Función helper para mostrar notificaciones toast
  const mostrarToast = (mensaje, tipo = 'success', duracion = 3000) => {
    setNotificacionToast({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacionToast(prev => ({ ...prev, visible: false }));
    }, duracion);
  };

  // Función para cargar insumos desde la vista global (OPTIMIZADA con cache)
  const cargarInsumos = async () => {
    try {
      setLoadingInsumos(true);
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      const { data, error } = await supabase
        .from('vista_stock_insumos')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('nombre_insumo', { ascending: true });

      if (error) {
        console.error('Error al cargar insumos:', error);
        return;
      }

      setInsumos(data || []);
      
      // Cache para carga instantánea
      try {
        localStorage.setItem('insumos_cache', JSON.stringify(data || []));
      } catch (e) {
        console.warn('No se pudo cachear insumos:', e);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setLoadingInsumos(false);
    }
  };

  // Función para cargar historial de compras (OPTIMIZADA con cache)
  const cargarCompras = async () => {
    try {
      setLoadingCompras(true);
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      const { data, error } = await supabase
        .from('compras_insumos')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('fecha_hora', { ascending: false })
        .limit(50); // Últimas 50 compras

      if (error) {
        console.error('Error al cargar compras:', error);
        return;
      }

      setCompras(data || []);
      
      // Cache para carga instantánea
      try {
        localStorage.setItem('compras_cache', JSON.stringify(data || []));
      } catch (e) {
        console.warn('No se pudo cachear compras:', e);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setLoadingCompras(false);
    }
  };

  // Función para cargar recetas (OPTIMIZADA - 1 sola query)
  const cargarRecetas = async () => {
    try {
      setLoadingRecetas(true);
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      // OPTIMIZACIÓN: Una sola query para TODO (productos + ingredientes)
      const { data: todasLasFilas, error } = await supabase
        .from('recetas_productos')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar recetas:', error);
        return;
      }

      // Separar productos (headers) de ingredientes en memoria (mucho más rápido)
      const productos = todasLasFilas.filter(fila => fila.nombre_producto !== null);
      const ingredientesPorProducto = {};
      
      todasLasFilas.forEach(fila => {
        if (fila.nombre_ingrediente !== null && fila.producto_receta_id) {
          if (!ingredientesPorProducto[fila.producto_receta_id]) {
            ingredientesPorProducto[fila.producto_receta_id] = [];
          }
          ingredientesPorProducto[fila.producto_receta_id].push({
            nombre: fila.nombre_ingrediente,
            cantidad: fila.cantidad_ingrediente,
            unidad: fila.unidad_ingrediente
          });
        }
      });

      // Construir recetas completas
      const recetasCompletas = productos.map(producto => ({
        id: producto.id,
        nombre_producto: producto.nombre_producto,
        cantidad_base: producto.cantidad_base,
        unidad: producto.unidad_producto,
        ingredientes: ingredientesPorProducto[producto.id] || []
      }));

      setRecetas(recetasCompletas);
      
      // Cache en localStorage para carga instantánea
      try {
        localStorage.setItem('recetas_cache', JSON.stringify(recetasCompletas));
      } catch (e) {
        console.warn('No se pudo cachear recetas:', e);
      }
      
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setLoadingRecetas(false);
    }
  };

  // Cargar productos del inventario para las recetas
  const cargarProductosInventario = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return;

      const { data, error } = await supabase
        .from('inventario')
        .select('producto')
        .eq('usuario_id', usuarioId)
        .order('producto', { ascending: true });

      if (error) {
        console.error('Error al cargar productos:', error);
        return;
      }

      // Obtener productos únicos
      const productosUnicos = [...new Set(data.map(p => p.producto))];
      setProductosInventario(productosUnicos);
    } catch (error) {
      console.error('Error inesperado:', error);
    }
  };

  // OPTIMIZACIÓN: Lazy loading - Solo cargar datos de la pestaña activa
  useEffect(() => {
    if (vistaActual === 'stock') {
      // Vista Stock: Cargar insumos y compras
      cargarInsumos();
      cargarCompras();
    } else if (vistaActual === 'recetas') {
      // Vista Recetas: Cargar productos de inventario y recetas
      cargarProductosInventario();
      if (!recetasCargadas) {
        cargarRecetas();
        setRecetasCargadas(true);
      }
    }
  }, [vistaActual]); // Se ejecuta al cambiar de pestaña
  
  // Cargar recetas al inicio solo si no hay cache
  useEffect(() => {
    if (recetas.length === 0 && !recetasCargadas) {
      cargarRecetas();
      setRecetasCargadas(true);
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a3d1a' }}>
      <div className="pt-16">
        <div className="relative z-10 p-3 sm:p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium text-sm"
              >
                <span className="text-lg">←</span>
                <span>Volver al Inicio</span>
              </button>
              
              <h1 className="text-2xl md:text-3xl font-bold text-green-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                🍳 Gestión de Insumos
              </h1>
              
              <div className="w-24"></div>
            </div>

            {/* Pestañas de navegación */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setVistaActual('stock')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  vistaActual === 'stock'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                📦 Stock de Insumos
              </button>
              
              <button
                onClick={() => setVistaActual('recetas')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  vistaActual === 'recetas'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                📝 Recetas de Productos
              </button>
            </div>

            {/* Contenido según vista actual */}
            {vistaActual === 'stock' ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-green-400 mb-2">
                    📦 Stock de Ingredientes
                  </h2>
                  <p className="text-gray-300 text-sm">
                    Los ingredientes aparecen cuando registras tu primera compra. El <strong className="text-blue-300">Stock Comprado</strong> suma todas tus compras, el <strong className="text-orange-300">Stock Consumido</strong> se calcula automáticamente según las ventas, y el <strong className="text-green-300">Stock Disponible</strong> es la diferencia entre ambos.
                  </p>
                </div>
                
                {/* Estadísticas de stock */}
                {insumos.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Total ingredientes */}
                    <div className="bg-blue-600/10 border border-blue-400/30 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-blue-400 text-3xl">📦</span>
                        <div>
                          <p className="text-blue-200 text-xs">Total Ingredientes</p>
                          <p className="text-white text-2xl font-bold">{insumos.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Con consumo activo */}
                    <div className="bg-orange-600/10 border border-orange-400/30 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-orange-400 text-3xl">📊</span>
                        <div>
                          <p className="text-orange-200 text-xs">Con Consumo</p>
                          <p className="text-white text-2xl font-bold">
                            {insumos.filter(i => parseFloat(i.stock_consumido) > 0).length}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stock bajo o agotado */}
                    <div className="bg-red-600/10 border border-red-400/30 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-red-400 text-3xl">⚠️</span>
                        <div>
                          <p className="text-red-200 text-xs">Stock Bajo/Crítico</p>
                          <p className="text-white text-2xl font-bold">
                            {insumos.filter(i => parseFloat(i.stock_disponible) <= 10).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Botón para ingresar compras - Siempre visible */}
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => setModalCompraAbierto(true)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-lg"
                  >
                    ➕ Ingresar Compra
                  </button>
                </div>
                
                {/* Lista de insumos */}
                {insumos.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <div className="text-5xl mb-4">📦</div>
                    <p className="text-lg mb-2">No hay stock de ingredientes registrado</p>
                    <p className="text-sm">Los ingredientes aparecerán cuando registres tu primera compra usando el botón "➕ Ingresar Compra"</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/20">
                          <th className="text-left py-3 px-4 text-white font-semibold text-sm">Ingrediente</th>
                          <th className="text-center py-3 px-4 text-white font-semibold text-sm">Unidad</th>
                          <th className="text-center py-3 px-4 text-blue-300 font-semibold text-sm">Stock Comprado</th>
                          <th className="text-center py-3 px-4 text-orange-300 font-semibold text-sm">Stock Consumido</th>
                          <th className="text-center py-3 px-4 text-green-300 font-semibold text-sm">Stock Disponible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insumos.map((insumo, index) => {
                          const stockDisponible = parseFloat(insumo.stock_disponible);
                          return (
                            <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                              <td className="py-3 px-4 text-white font-medium">{insumo.nombre_insumo}</td>
                              <td className="py-3 px-4 text-center text-gray-300">{insumo.unidad}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-blue-300 font-semibold text-base">
                                  {parseFloat(insumo.stock_comprado).toFixed(2)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-orange-300 font-semibold text-base">
                                  {parseFloat(insumo.stock_consumido).toFixed(2)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`font-bold text-lg ${
                                  stockDisponible <= 0 
                                    ? 'text-red-400' 
                                    : stockDisponible <= 10
                                    ? 'text-yellow-400'
                                    : 'text-green-400'
                                }`}>
                                  {stockDisponible.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Historial de Compras */}
                {compras.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-green-400 mb-4">
                      📋 Historial de Compras
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/20">
                            <th className="text-left py-3 px-4 text-white font-semibold text-sm">Fecha</th>
                            <th className="text-left py-3 px-4 text-white font-semibold text-sm">Ingrediente</th>
                            <th className="text-center py-3 px-4 text-white font-semibold text-sm">Cantidad</th>
                            <th className="text-center py-3 px-4 text-white font-semibold text-sm">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            // Agrupar compras por fecha_hora
                            const comprasAgrupadas = compras.reduce((acc, compra) => {
                              const key = compra.fecha_hora;
                              if (!acc[key]) {
                                acc[key] = {
                                  fecha_hora: compra.fecha_hora,
                                  ingredientes: []
                                };
                              }
                              acc[key].ingredientes.push({
                                id: compra.id,
                                nombre: compra.nombre_insumo,
                                cantidad: compra.cantidad,
                                unidad: compra.unidad
                              });
                              return acc;
                            }, {});
                            
                            const filas = [];
                            Object.values(comprasAgrupadas).forEach((grupo, grupoIndex) => {
                              grupo.ingredientes.forEach((ing, ingIndex) => {
                                filas.push(
                                  <tr key={`${grupoIndex}-${ingIndex}`} className="border-b border-white/10 hover:bg-white/5">
                                    <td className="py-3 px-4 text-white">
                                      {ingIndex === 0 ? new Date(grupo.fecha_hora).toLocaleDateString('es-CL') : ''}
                                    </td>
                                    <td className="py-3 px-4 text-white font-medium">{ing.nombre}</td>
                                    <td className="py-3 px-4 text-center text-green-300 font-semibold">
                                      +{ing.cantidad} {ing.unidad}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={async () => {
                                            const nuevaCantidad = prompt(`Nueva cantidad para ${ing.nombre}:`, ing.cantidad);
                                            if (nuevaCantidad && !isNaN(parseFloat(nuevaCantidad)) && parseFloat(nuevaCantidad) > 0) {
                                              try {
                                                const diferencia = parseFloat(nuevaCantidad) - ing.cantidad;
                                                const usuarioId = await authService.getCurrentUserId();
                                                
                                                // Actualizar registro de compra
                                                const { error: errorCompra } = await supabase
                                                  .from('compras_insumos')
                                                  .update({ cantidad: parseFloat(nuevaCantidad) })
                                                  .eq('id', ing.id);
                                                
                                                if (errorCompra) {
                                                  alert('Error al actualizar compra');
                                                  return;
                                                }
                                                
                                                // Ajustar stock en insumos
                                                const { data: stockActual } = await supabase
                                                  .from('insumos')
                                                  .select('cantidad_disponible')
                                                  .eq('nombre_insumo', ing.nombre)
                                                  .eq('usuario_id', usuarioId)
                                                  .limit(1)
                                                  .single();
                                                
                                                const nuevoStock = (stockActual?.cantidad_disponible || 0) + diferencia;
                                                
                                                await supabase
                                                  .from('insumos')
                                                  .update({ cantidad_disponible: nuevoStock })
                                                  .eq('nombre_insumo', ing.nombre)
                                                  .eq('usuario_id', usuarioId);
                                                
                                                mostrarToast('✅ Compra actualizada', 'success');
                                                await cargarCompras();
                                                await cargarInsumos();
                                              } catch (error) {
                                                console.error('Error:', error);
                                                alert('Error al actualizar');
                                              }
                                            }
                                          }}
                                          className="text-blue-400 hover:text-blue-300 text-sm"
                                          title="Editar cantidad"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (!confirm(`¿Eliminar compra de ${ing.cantidad} ${ing.unidad} de ${ing.nombre}?`)) return;
                                            
                                            try {
                                              const usuarioId = await authService.getCurrentUserId();
                                              
                                              // Eliminar registro de compra
                                              const { error: errorCompra } = await supabase
                                                .from('compras_insumos')
                                                .delete()
                                                .eq('id', ing.id);
                                              
                                              if (errorCompra) {
                                                alert('Error al eliminar compra');
                                                return;
                                              }
                                              
                                              // Restar del stock en insumos
                                              const { data: stockActual } = await supabase
                                                .from('insumos')
                                                .select('cantidad_disponible')
                                                .eq('nombre_insumo', ing.nombre)
                                                .eq('usuario_id', usuarioId)
                                                .limit(1)
                                                .single();
                                              
                                              const nuevoStock = Math.max(0, (stockActual?.cantidad_disponible || 0) - ing.cantidad);
                                              
                                              await supabase
                                                .from('insumos')
                                                .update({ cantidad_disponible: nuevoStock })
                                                .eq('nombre_insumo', ing.nombre)
                                                .eq('usuario_id', usuarioId);
                                              
                                              mostrarToast('✅ Compra eliminada', 'success');
                                              await cargarCompras();
                                              await cargarInsumos();
                                            } catch (error) {
                                              console.error('Error:', error);
                                              alert('Error al eliminar');
                                            }
                                          }}
                                          className="text-red-400 hover:text-red-300 text-sm"
                                          title="Eliminar compra"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            });
                            
                            return filas;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Modal para ingresar compras */}
                {modalCompraAbierto && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-3xl w-full p-6" style={{ backgroundColor: 'rgba(31, 74, 31, 0.95)' }}>
                      <h3 className="text-xl font-bold text-white mb-4">
                        🛒 Registrar Compra de Insumos
                      </h3>
                      
                      <div className="bg-blue-600/20 border border-blue-400/40 rounded-lg p-3 mb-4">
                        <p className="text-blue-200 text-sm">
                          💡 <strong>Importante:</strong> En tu primera compra de cada ingrediente, ingresa el <strong>stock total físico</strong> que tienes actualmente (lo que ya tenías + lo que acabas de comprar).
                        </p>
                        <p className="text-blue-200 text-sm mt-2">
                          En las siguientes compras, el sistema sumará automáticamente las cantidades al stock actual.
                        </p>
                      </div>
                      
                      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                        {lineasCompra.map((linea, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-white/5 p-3 rounded-lg">
                            <select
                              value={linea.ingrediente}
                              onChange={(e) => {
                                const nuevasLineas = [...lineasCompra];
                                const ingredienteSeleccionado = ingredientesDisponibles.find(i => i.nombre === e.target.value);
                                nuevasLineas[index].ingrediente = e.target.value;
                                nuevasLineas[index].unidad = ingredienteSeleccionado?.unidad || '';
                                setLineasCompra(nuevasLineas);
                              }}
                              style={{ fontSize: '14px' }}
                              className="px-2 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                            >
                              <option value="" className="bg-gray-800">
                                {ingredientesDisponibles.length > 0 
                                  ? 'Seleccionar ingrediente' 
                                  : 'Primero crea recetas en "Recetas de Productos"'}
                              </option>
                              {ingredientesDisponibles.map((ing) => (
                                <option key={ing.nombre} value={ing.nombre} className="bg-gray-800">
                                  {ing.nombre} ({ing.unidad})
                                </option>
                              ))}
                            </select>
                            
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Cantidad"
                              value={linea.cantidad}
                              onChange={(e) => {
                                const nuevasLineas = [...lineasCompra];
                                nuevasLineas[index].cantidad = e.target.value;
                                setLineasCompra(nuevasLineas);
                              }}
                              style={{ fontSize: '14px' }}
                              className="px-2 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                            
                            <input
                              type="text"
                              value={linea.unidad}
                              disabled
                              placeholder="Unidad"
                              style={{ fontSize: '14px' }}
                              className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400"
                            />
                            
                            <button
                              onClick={() => {
                                if (lineasCompra.length > 1) {
                                  setLineasCompra(lineasCompra.filter((_, i) => i !== index));
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded-lg text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-3 mb-4">
                        <button
                          onClick={() => setLineasCompra([...lineasCompra, { ingrediente: '', cantidad: '', unidad: '' }])}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          ➕ Agregar línea
                        </button>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setModalCompraAbierto(false);
                            setLineasCompra([{ ingrediente: '', cantidad: '', unidad: '' }]);
                          }}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              // Validar que haya recetas creadas
                              if (ingredientesDisponibles.length === 0) {
                                alert('Primero debes crear recetas en la pestaña "Recetas de Productos".\n\nLos ingredientes de las recetas aparecerán aquí automáticamente.');
                                return;
                              }
                              
                              const usuarioId = await authService.getCurrentUserId();
                              if (!usuarioId) {
                                alert('Usuario no autenticado');
                                return;
                              }
                              
                              // Validar líneas
                              const lineasValidas = lineasCompra.filter(l => 
                                l.ingrediente && 
                                l.ingrediente.trim() !== '' &&
                                l.cantidad && 
                                parseFloat(l.cantidad) > 0 &&
                                l.unidad &&
                                l.unidad.trim() !== ''
                              );
                              
                              if (lineasValidas.length === 0) {
                                alert('Selecciona al menos un ingrediente con cantidad válida');
                                return;
                              }
                              
                              // Obtener cliente_id
                              const { data: usuarioData } = await supabase
                                .from('usuarios')
                                .select('cliente_id')
                                .eq('usuario_id', usuarioId)
                                .single();
                              
                              const cliente_id = usuarioData?.cliente_id || null;
                              
                              // Generar un timestamp único para toda la compra
                              const timestampCompra = new Date().toISOString();
                              
                              // Registrar compras en compras_insumos
                              for (const linea of lineasValidas) {
                                const nombreInsumo = linea.ingrediente
                                  .toUpperCase()
                                  .normalize("NFD")
                                  .replace(/[\u0300-\u036f]/g, "")
                                  .trim();
                                
                                // Registrar en compras_insumos con el MISMO timestamp
                                const { error: errorCompra } = await supabase
                                  .from('compras_insumos')
                                  .insert({
                                    fecha_hora: timestampCompra,
                                    nombre_insumo: nombreInsumo,
                                    cantidad: parseFloat(linea.cantidad),
                                    unidad: linea.unidad,
                                    usuario_id: usuarioId,
                                    cliente_id: cliente_id
                                  });
                                
                                if (errorCompra) {
                                  console.error('Error al registrar compra:', errorCompra);
                                }
                              }
                              
                              mostrarToast(`✅ Compra registrada: ${lineasValidas.length} ingrediente(s) actualizados`, 'success');
                              
                              // Recargar y cerrar
                              await cargarCompras();
                              setModalCompraAbierto(false);
                              setLineasCompra([{ ingrediente: '', cantidad: '', unidad: '' }]);
                              
                            } catch (error) {
                              console.error('Error inesperado:', error);
                              alert('Error al registrar compra');
                            }
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg"
                        >
                          💾 Guardar Compra
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
                <h2 className="text-xl font-bold text-green-400 mb-4">
                  📝 Recetas de Productos
                </h2>
                <p className="text-gray-300 text-sm mb-6">
                  Vincula cada producto de tu inventario con los ingredientes que necesita. Esto permitirá descontar automáticamente los insumos al vender.
                </p>
                
                {/* Formulario para crear receta */}
                <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                  <h3 className="text-white font-semibold mb-3">Crear Nueva Receta</h3>
                  
                  {/* Buscar producto del inventario */}
                  <div className="mb-4">
                    <label className="block text-white text-sm mb-2">Producto del Inventario</label>
                    <select
                      value={productoSeleccionado}
                      onChange={(e) => setProductoSeleccionado(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                    >
                      <option value="" className="bg-gray-800">Selecciona un producto...</option>
                      {productosInventario.map((producto, index) => (
                        <option key={index} value={producto} className="bg-gray-800">
                          {producto}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {productoSeleccionado && (
                    <>
                      {/* Campo para cantidad base del lote */}
                      <div className="mb-4 bg-blue-600/10 border border-blue-400/30 rounded-lg p-3">
                        <label className="block text-white text-sm mb-2">
                          Esta receta es para producir cuántas unidades de {productoSeleccionado}?
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={cantidadBaseLote}
                            onChange={(e) => setCantidadBaseLote(e.target.value)}
                            placeholder="1"
                            className="w-24 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-center"
                          />
                          <span className="text-white text-sm">
                            unidades de {productoSeleccionado}
                          </span>
                        </div>
                        <p className="text-blue-200 text-xs mt-2">
                          Ejemplo: Si produces en lotes de 10, ingresa "10"
                        </p>
                      </div>
                      
                      <h4 className="text-white text-sm mb-2">
                        Ingredientes necesarios para hacer {cantidadBaseLote} {productoSeleccionado}
                      </h4>
                      
                      {/* Lista de ingredientes */}
                      {ingredientesReceta.map((ing, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Nombre ingrediente (ej: LECHE)"
                            value={ing.nombre_ingrediente}
                            onChange={(e) => {
                              const nuevos = [...ingredientesReceta];
                              // Normalizar: mayúsculas y sin acentos
                              const normalizado = e.target.value
                                .toUpperCase()
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "");
                              nuevos[index].nombre_ingrediente = normalizado;
                              setIngredientesReceta(nuevos);
                            }}
                            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                          />
                          
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Cantidad total"
                            value={ing.cantidad_necesaria}
                            onChange={(e) => {
                              const nuevos = [...ingredientesReceta];
                              nuevos[index].cantidad_necesaria = e.target.value;
                              setIngredientesReceta(nuevos);
                            }}
                            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                          />
                          
                          <select
                            value={ing.unidad}
                            onChange={(e) => {
                              const nuevos = [...ingredientesReceta];
                              nuevos[index].unidad = e.target.value;
                              setIngredientesReceta(nuevos);
                            }}
                            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                          >
                            {unidades.map((u) => (
                              <option key={u} value={u} className="bg-gray-800">{u}</option>
                            ))}
                          </select>
                          
                          <button
                            onClick={() => {
                              if (ingredientesReceta.length > 1) {
                                setIngredientesReceta(ingredientesReceta.filter((_, i) => i !== index));
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setIngredientesReceta([...ingredientesReceta, { nombre_ingrediente: '', cantidad_necesaria: '', unidad: 'kg' }])}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          ➕ Agregar ingrediente
                        </button>
                        
                        <button
                          onClick={async () => {
                            // Validar campos
                            if (!productoSeleccionado || !cantidadBaseLote) {
                              alert('Por favor completa el producto y cantidad base');
                              return;
                            }
                            
                            const ingredientesValidos = ingredientesReceta.filter(
                              ing => ing.nombre_ingrediente && ing.nombre_ingrediente.trim() !== '' && 
                                     ing.cantidad_necesaria && parseFloat(ing.cantidad_necesaria) > 0
                            );
                            
                            console.log('Ingredientes receta:', ingredientesReceta);
                            console.log('Ingredientes válidos:', ingredientesValidos);
                            
                            if (ingredientesValidos.length === 0) {
                              alert('Por favor agrega al menos un ingrediente con cantidad válida');
                              return;
                            }
                            
                            try {
                              const usuarioId = await authService.getCurrentUserId();
                              if (!usuarioId) {
                                alert('Usuario no autenticado');
                                return;
                              }
                              
                              // Obtener cliente_id
                              const { data: usuarioData } = await supabase
                                .from('usuarios')
                                .select('cliente_id')
                                .eq('usuario_id', usuarioId)
                                .single();
                              
                              const cliente_id = usuarioData?.cliente_id || null;
                              
                              // Verificar si ya existe una receta con este producto (para edición)
                              const { data: recetaExistente } = await supabase
                                .from('recetas_productos')
                                .select('id')
                                .eq('usuario_id', usuarioId)
                                .eq('nombre_producto', productoSeleccionado)
                                .is('nombre_ingrediente', null)
                                .maybeSingle();
                              
                              // Si existe, eliminar la receta anterior completa
                              if (recetaExistente) {
                                // Eliminar ingredientes asociados
                                await supabase
                                  .from('recetas_productos')
                                  .delete()
                                  .eq('producto_receta_id', recetaExistente.id)
                                  .eq('usuario_id', usuarioId);
                                
                                // Eliminar encabezado del producto
                                await supabase
                                  .from('recetas_productos')
                                  .delete()
                                  .eq('id', recetaExistente.id)
                                  .eq('usuario_id', usuarioId);
                              }
                              
                              // Paso 1: Insertar fila de encabezado del producto
                              const { data: productoData, error: errorProducto } = await supabase
                                .from('recetas_productos')
                                .insert({
                                  nombre_producto: productoSeleccionado,
                                  cantidad_base: parseFloat(cantidadBaseLote),
                                  unidad_producto: 'unidad',
                                  nombre_ingrediente: null,
                                  cantidad_ingrediente: null,
                                  unidad_ingrediente: null,
                                  producto_receta_id: null,
                                  usuario_id: usuarioId,
                                  cliente_id: cliente_id
                                })
                                .select()
                                .single();
                              
                              if (errorProducto) {
                                console.error('Error al guardar producto:', errorProducto);
                                alert('Error al guardar receta: ' + errorProducto.message);
                                return;
                              }
                              
                              const productoRecetaId = productoData.id;
                              
                              // Paso 2: Insertar ingredientes vinculados al producto
                              const filasIngredientes = ingredientesValidos.map(ing => {
                                const nombreInsumoNormalizado = ing.nombre_ingrediente
                                  .toUpperCase()
                                  .normalize("NFD")
                                  .replace(/[\u0300-\u036f]/g, "")
                                  .trim();
                                
                                return {
                                  nombre_producto: null,
                                  cantidad_base: null,
                                  unidad_producto: null,
                                  nombre_ingrediente: nombreInsumoNormalizado,
                                  cantidad_ingrediente: parseFloat(ing.cantidad_necesaria),
                                  unidad_ingrediente: ing.unidad,
                                  producto_receta_id: productoRecetaId,
                                  usuario_id: usuarioId,
                                  cliente_id: cliente_id
                                };
                              });
                              
                              console.log('Filas de ingredientes a insertar:', filasIngredientes);
                              console.log('producto_receta_id:', productoRecetaId);
                              
                              const { data: dataIngredientes, error: errorRecetas } = await supabase
                                .from('recetas_productos')
                                .insert(filasIngredientes)
                                .select();
                              
                              console.log('Ingredientes insertados:', dataIngredientes);
                              
                              if (errorRecetas) {
                                console.error('Error al guardar ingredientes:', errorRecetas);
                                alert('Error al guardar ingredientes: ' + errorRecetas.message);
                                return;
                              }
                              
                              // OPTIMIZACIÓN: Crear/actualizar insumos EN PARALELO con Promise.all()
                              const upsertPromises = ingredientesValidos.map(ing => {
                                const nombreInsumoNormalizado = ing.nombre_ingrediente
                                  .toUpperCase()
                                  .normalize("NFD")
                                  .replace(/[\u0300-\u036f]/g, "")
                                  .trim();
                                
                                return supabase
                                  .from('insumos')
                                  .upsert({
                                    nombre_producto: productoSeleccionado,
                                    nombre_insumo: nombreInsumoNormalizado,
                                    unidad: ing.unidad,
                                    usuario_id: usuarioId,
                                    cliente_id: cliente_id
                                  }, {
                                    onConflict: 'nombre_producto,nombre_insumo,usuario_id'
                                  })
                                  .catch(error => console.error('Error al crear insumo:', error));
                              });
                              
                              // Ejecutar todos los upserts en paralelo (no bloquea UI)
                              await Promise.all(upsertPromises);
                              
                              // FEEDBACK INMEDIATO: Mostrar toast ANTES de recargar
                              mostrarToast(`✅ Receta de ${productoSeleccionado} guardada con ${ingredientesValidos.length} ingredientes`, 'success');
                              
                              // Limpiar formulario INMEDIATAMENTE
                              setProductoSeleccionado('');
                              setCantidadBaseLote('1');
                              setIngredientesReceta([{ nombre_ingrediente: '', cantidad_necesaria: '', unidad: 'kg' }]);
                              
                              // OPTIMIZACIÓN: Recargar en background (no await = no bloquea)
                              cargarRecetas().catch(err => console.error('Error al recargar recetas:', err));
                              cargarInsumos().catch(err => console.error('Error al recargar insumos:', err));
                              
                            } catch (error) {
                              console.error('Error inesperado:', error);
                              alert('Error al guardar receta');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm"
                        >
                          💾 Guardar Receta
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Lista de recetas guardadas */}
                <div className="mt-8">
                  <h3 className="text-white font-semibold text-lg mb-4">📚 Recetas Guardadas</h3>
                  
                  {recetas.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <div className="text-4xl mb-3">📝</div>
                      <p>No hay recetas registradas aún</p>
                      <p className="text-sm mt-2">Crea tu primera receta seleccionando un producto arriba</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recetas.map((receta, index) => (
                        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-bold text-base">{receta.nombre_producto}</h4>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`¿Eliminar receta de ${receta.nombre_producto}?`)) {
                                  return;
                                }
                                
                                try {
                                  const usuarioId = await authService.getCurrentUserId();
                                  if (!usuarioId) return;
                                  
                                  // Eliminar fila de producto (los ingredientes se eliminan en CASCADE)
                                  const { error } = await supabase
                                    .from('recetas_productos')
                                    .delete()
                                    .eq('id', receta.id)
                                    .eq('usuario_id', usuarioId);
                                  
                                  if (error) {
                                    console.error('Error al eliminar:', error);
                                    alert('Error al eliminar receta');
                                    return;
                                  }
                                  
                                  // Eliminar ingredientes vinculados
                                  await supabase
                                    .from('recetas_productos')
                                    .delete()
                                    .eq('producto_receta_id', receta.id)
                                    .eq('usuario_id', usuarioId);
                                  
                                  mostrarToast(`✅ Receta de ${receta.nombre_producto} eliminada`, 'success');
                                  
                                  // Recargar recetas
                                  await cargarRecetas();
                                } catch (error) {
                                  console.error('Error:', error);
                                }
                              }}
                              className="text-red-400 hover:text-red-300 text-sm"
                              title="Eliminar receta"
                            >
                              🗑️
                            </button>
                          </div>
                          
                          <div className="bg-blue-600/10 border border-blue-400/30 rounded px-2 py-1 mb-3 inline-block">
                            <span className="text-blue-200 text-xs">
                              Por cada <span className="font-bold text-white">{receta.cantidad_base}</span> unidades
                            </span>
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="text-xs text-gray-400 font-semibold mb-1">Ingredientes:</div>
                            {receta.ingredientes.map((ing, i) => (
                              <div key={i} className="flex items-center justify-between text-xs bg-white/5 px-2 py-1.5 rounded">
                                <span className="text-gray-300">{ing.nombre}</span>
                                <span className="text-white font-medium">{ing.cantidad} {ing.unidad}</span>
                              </div>
                            ))}
                          </div>
                          
                          <button
                            onClick={() => {
                              // Solo cargar datos en el formulario, NO eliminar de DB
                              setProductoSeleccionado(receta.nombre_producto);
                              setCantidadBaseLote(receta.cantidad_base.toString());
                              setIngredientesReceta(receta.ingredientes.map(ing => ({
                                nombre_ingrediente: ing.nombre,
                                cantidad_necesaria: ing.cantidad.toString(),
                                unidad: ing.unidad
                              })));
                              
                              // Scroll al formulario
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              
                              mostrarToast('✏️ Receta cargada para edición. Modifica y guarda', 'success');
                            }}
                            className="w-full mt-3 bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-2 rounded text-xs font-medium border border-green-400/30 transition-all"
                          >
                            ✏️ Editar Receta
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      
      {/* Notificación Toast */}
      {notificacionToast.visible && (
        <div className="fixed top-20 right-4 z-50 animate-[slideIn_0.3s_ease-out]">
          <div className={`rounded-lg shadow-2xl p-4 border ${
            notificacionToast.tipo === 'success' 
              ? 'bg-green-600 border-green-400' 
              : notificacionToast.tipo === 'error'
              ? 'bg-red-600 border-red-400'
              : 'bg-blue-600 border-blue-400'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {notificacionToast.tipo === 'success' ? '✅' : 
                 notificacionToast.tipo === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p className="text-white font-medium text-sm">
                {notificacionToast.mensaje}
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      
      <Footer />
    </div>
  );
}

export default Insumos;
