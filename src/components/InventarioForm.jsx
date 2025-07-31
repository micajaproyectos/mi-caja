import React, { useState } from 'react';

export default function InventarioForm() {
  const [fechaInventario, setFechaInventario] = useState(new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));
  const [productos, setProductos] = useState([
    {
      id: 1,
      nombre: '',
      cantidad: 0,
      unidad: 'Unid',
      costo: 0
    }
  ]);

  const unidades = ['Unid', 'Kg', 'gr'];

  const agregarProducto = () => {
    if (productos.length >= 20) {
      alert('Máximo 20 productos permitidos');
      return;
    }

    const nuevoProducto = {
      id: Date.now(),
      nombre: '',
      cantidad: 0,
      unidad: 'Unid',
      costo: 0
    };

    setProductos([...productos, nuevoProducto]);
  };

  const eliminarProducto = (id) => {
    if (productos.length === 1) {
      alert('Debe mantener al menos un producto');
      return;
    }
    setProductos(productos.filter(producto => producto.id !== id));
  };

  const actualizarProducto = (id, campo, valor) => {
    setProductos(productos.map(producto => 
      producto.id === id ? { ...producto, [campo]: valor } : producto
    ));
  };



  const registrarInventario = async () => {
    // Validar que todos los productos tengan nombre
    const productosSinNombre = productos.filter(p => !p.nombre.trim());
    if (productosSinNombre.length > 0) {
      alert('Todos los productos deben tener un nombre');
      return;
    }

    // Validar que todos los productos tengan cantidad y costo
    const productosSinDatos = productos.filter(p => p.cantidad <= 0 || p.costo <= 0);
    if (productosSinDatos.length > 0) {
      alert('Todos los productos deben tener cantidad y costo mayor a 0');
      return;
    }

    // Formatear fecha para el backend (DD-MM-YYYY)
    const fechaFormateada = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).split('/').join('-');

    // Preparar datos en el formato requerido
    const datosInventario = {
      fecha: fechaFormateada,
      productos: productos
        .filter(p => p.nombre.trim() !== '')
        .map(producto => ({
          nombre: producto.nombre.trim(),
          cantidad: producto.cantidad,
          unidad: producto.unidad,
          costo: producto.costo
        }))
    };

    console.log('📦 Inventario preparado:', datosInventario);

    // TODO: Implementar lógica de guardado local o en otro backend
    alert("✅ Inventario preparado para guardar");

    // Limpiar formulario después del envío exitoso
    setProductos([{
      id: Date.now(),
      nombre: '',
      cantidad: 0,
      unidad: 'Unid',
      costo: 0
    }]);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-gray-800 text-white p-6 rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-green-400 text-3xl font-bold mb-2">📦 Sistema de Inventario</h1>
          <p className="text-sm text-gray-400">Registro completo de inventario</p>
        </div>

        {/* Fecha de Inventario */}
        <div className="mb-8">
          <div className="flex items-center mb-3">
            <span className="text-xl mr-2">🗓️</span>
            <label className="text-green-400 text-lg font-semibold">Fecha de Inventario</label>
          </div>
          <input
            type="text"
            value={fechaInventario}
            onChange={(e) => setFechaInventario(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-700 border border-green-500 focus:border-green-400 focus:outline-none transition-colors"
            placeholder="Fecha del inventario"
          />
        </div>

        {/* Lista de Productos */}
        <div className="space-y-6 mb-8">
          {productos.map((producto, index) => (
            <div key={producto.id} className="bg-gray-700 rounded-lg border border-green-500 p-4 relative">
              {/* Header del producto */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-green-400 text-lg font-semibold">
                  Producto #{index + 1}
                </h3>
                {productos.length > 1 && (
                  <button
                    onClick={() => eliminarProducto(producto.id)}
                    className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    title="Eliminar producto"
                  >
                    ❌
                  </button>
                )}
              </div>

              {/* Campos del producto */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Nombre del producto */}
                <div>
                  <label className="flex items-center text-sm text-gray-300 mb-2">
                    <span className="mr-1">🍓</span>
                    Producto
                  </label>
                  <input
                    type="text"
                    value={producto.nombre}
                    onChange={(e) => actualizarProducto(producto.id, 'nombre', e.target.value)}
                    placeholder="Ej: Manzanas rojas"
                    className="w-full p-3 rounded bg-gray-600 border border-green-500 focus:border-green-400 focus:outline-none transition-colors"
                  />
                </div>

                {/* Cantidad */}
                <div>
                  <label className="flex items-center text-sm text-gray-300 mb-2">
                    <span className="mr-1">⚖️</span>
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={producto.cantidad}
                    onChange={(e) => actualizarProducto(producto.id, 'cantidad', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className="w-full p-3 rounded bg-gray-600 border border-green-500 focus:border-green-400 focus:outline-none transition-colors"
                  />
                </div>

                {/* Unidad */}
                <div>
                  <label className="flex items-center text-sm text-gray-300 mb-2">
                    <span className="mr-1">📏</span>
                    Unidad
                  </label>
                  <select
                    value={producto.unidad}
                    onChange={(e) => actualizarProducto(producto.id, 'unidad', e.target.value)}
                    className="w-full p-3 rounded bg-gray-600 border border-green-500 focus:border-green-400 focus:outline-none transition-colors"
                  >
                    {unidades.map(unidad => (
                      <option key={unidad} value={unidad}>{unidad}</option>
                    ))}
                  </select>
                </div>

                {/* Costo */}
                <div>
                  <label className="flex items-center text-sm text-gray-300 mb-2">
                    <span className="mr-1">💰</span>
                    Costo $
                  </label>
                  <input
                    type="number"
                    value={producto.costo}
                    onChange={(e) => actualizarProducto(producto.id, 'costo', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1"
                    className="w-full p-3 rounded bg-gray-600 border border-green-500 focus:border-green-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>


            </div>
          ))}
        </div>

        {/* Botones de acción */}
        <div className="space-y-4">
          {/* Botón Agregar Producto */}
          <button
            onClick={agregarProducto}
            disabled={productos.length >= 20}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-lg flex items-center justify-center"
          >
            <span className="mr-2">🛒</span>
            Agregar Producto al Inventario
            <span className="ml-2 text-sm">({productos.length}/20)</span>
          </button>



          {/* Botón Registrar Inventario */}
          <button
            onClick={registrarInventario}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-lg flex items-center justify-center"
          >
            <span className="mr-2">📄</span>
            Registrar Inventario Completo
          </button>
        </div>
      </div>
    </div>
  );
} 