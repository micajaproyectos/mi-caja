import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const RegistroInventario = () => {
  const [inventario, setInventario] = useState({
    fecha_ingreso: '',
    producto: '',
    cantidad: '',
    unidad: '',
    costo_total: '',
    porcentaje_ganancia: ''
  });

  const [inventarioRegistrado, setInventarioRegistrado] = useState([]);
  const [loading, setLoading] = useState(false);

  // Opciones para el selector de unidad
  const opcionesUnidad = [
    { value: 'kg', label: 'Kg' },
    { value: 'gr', label: 'Gr' },
    { value: 'unidad', label: 'Unidad' }
  ];

  // Establecer fecha actual al cargar el componente
  useEffect(() => {
    const fechaActual = new Date().toISOString().split('T')[0];
    setInventario(prev => ({
      ...prev,
      fecha_ingreso: fechaActual
    }));
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('fecha_ingreso', { ascending: false });

      if (error) {
        console.error('Error al cargar inventario:', error);
        alert('Error al cargar el inventario');
        return;
      }

      setInventarioRegistrado(data || []);
      console.log('✅ Inventario cargado:', data);
    } catch (error) {
      console.error('Error inesperado al cargar inventario:', error);
      alert('Error inesperado al cargar el inventario');
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
      // Calcular precios automáticamente
      const precios = calcularPrecios();
      
      const inventarioParaInsertar = {
        fecha_ingreso: inventario.fecha_ingreso,
        producto: inventario.producto,
        cantidad: parseFloat(inventario.cantidad) || 0,
        unidad: inventario.unidad,
        costo_total: parseFloat(inventario.costo_total) || 0,
        precio_unitario: parseFloat(precios.precio_unitario) || 0,
        precio_venta: parseFloat(precios.precio_venta) || 0
      };

      console.log('📦 Registrando inventario:', inventarioParaInsertar);

      const { error } = await supabase
        .from('inventario')
        .insert([inventarioParaInsertar]);

      if (error) {
        console.error('Error al registrar inventario:', error);
        alert('Error al registrar el inventario: ' + error.message);
        return;
      }

      console.log('✅ Inventario registrado exitosamente');
      alert('Inventario registrado exitosamente');

      // Limpiar formulario
      setInventario({
        fecha_ingreso: new Date().toISOString().split('T')[0],
        producto: '',
        cantidad: '',
        unidad: '',
        costo_total: '',
        porcentaje_ganancia: ''
      });

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

      console.log('✅ Producto eliminado del inventario');
      alert('Producto eliminado del inventario');
      await cargarInventario();

    } catch (error) {
      console.error('Error inesperado al eliminar inventario:', error);
      alert('Error inesperado al eliminar el producto');
    }
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
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Botón de regreso */}
          <div className="mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          <h1 className="text-6xl font-bold text-white text-center drop-shadow-lg mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            📦 Gestión de Inventario
          </h1>

          {/* Formulario de Registro */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-green-400 text-center">
              ✨ Agregar Producto al Inventario
            </h2>
            
            <form onSubmit={registrarInventario} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Fecha de Ingreso */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    📅 Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    name="fecha_ingreso"
                    value={inventario.fecha_ingreso}
                    onChange={handleChange}
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                </div>

                {/* Producto */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    📦 Producto
                  </label>
                  <input
                    type="text"
                    name="producto"
                    value={inventario.producto}
                    onChange={handleChange}
                    placeholder="Nombre del producto"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                </div>

                {/* Cantidad */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    ⚖️ Cantidad
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    value={inventario.cantidad}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                </div>

                {/* Unidad */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    🏷️ Unidad
                  </label>
                  <select
                    name="unidad"
                    value={inventario.unidad}
                    onChange={handleChange}
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200"
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
                    💰 Costo Total
                  </label>
                  <input
                    type="number"
                    name="costo_total"
                    value={inventario.costo_total}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                </div>

                {/* Porcentaje de Ganancia */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    📈 Porcentaje de Ganancia
                  </label>
                  <input
                    type="number"
                    name="porcentaje_ganancia"
                    value={inventario.porcentaje_ganancia}
                    onChange={handleChange}
                    placeholder="0.30 (30%)"
                    step="0.01"
                    min="0"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Cálculos Automáticos */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mt-6 border border-white/10">
                <h3 className="text-xl font-semibold mb-4 text-yellow-400 text-center">
                  🧮 Cálculos Automáticos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      💵 Precio Unitario (con IVA 19%)
                    </label>
                    <p className="text-2xl font-bold text-green-400">
                      ${preciosCalculados.precio_unitario}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      🎯 Precio de Venta (redondeado a $10)
                    </label>
                    <p className="text-2xl font-bold text-blue-400">
                      ${preciosCalculados.precio_venta}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón de Registro */}
              <div className="flex justify-center mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-12 rounded-xl transition-all duration-200 flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">📦</span>
                      <span>Registrar Producto</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de Inventario */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-semibold mb-6 text-green-400 text-center">
              📋 Inventario Registrado
            </h2>
            
            {inventarioRegistrado.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-300 text-lg">
                  No hay productos registrados en el inventario
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Agrega tu primer producto usando el formulario de arriba
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/10 backdrop-blur-sm">
                      <th className="text-white font-semibold p-4 text-left">📅 Fecha</th>
                      <th className="text-white font-semibold p-4 text-left">📦 Producto</th>
                      <th className="text-white font-semibold p-4 text-left">⚖️ Cantidad</th>
                      <th className="text-white font-semibold p-4 text-left">🏷️ Unidad</th>
                      <th className="text-white font-semibold p-4 text-left">💰 Costo Total</th>
                      <th className="text-white font-semibold p-4 text-left">💵 Precio Unitario</th>
                      <th className="text-white font-semibold p-4 text-left">🎯 Precio Venta</th>
                      <th className="text-white font-semibold p-4 text-left">⚡ Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventarioRegistrado.map((item, index) => (
                      <tr key={item.id || index} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                        <td className="text-gray-300 p-4">
                          {new Date(item.fecha_ingreso).toLocaleDateString('es-ES')}
                        </td>
                        <td className="text-white p-4 font-medium">
                          {item.producto}
                        </td>
                        <td className="text-gray-300 p-4">
                          {item.cantidad}
                        </td>
                        <td className="text-gray-300 p-4">
                          {item.unidad}
                        </td>
                        <td className="text-green-300 p-4 font-bold">
                          ${parseFloat(item.costo_total).toLocaleString()}
                        </td>
                        <td className="text-blue-300 p-4 font-bold">
                          ${parseFloat(item.precio_unitario).toLocaleString()}
                        </td>
                        <td className="text-yellow-300 p-4 font-bold">
                          ${parseFloat(item.precio_venta).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => eliminarInventario(item.id)}
                            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistroInventario; 