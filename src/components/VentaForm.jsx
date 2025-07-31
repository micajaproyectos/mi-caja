import React, { useState, useEffect } from 'react';

export default function VentaForm() {
  const [inventario, setInventario] = useState([]);
  const [productosVenta, setProductosVenta] = useState([]);
  const [tipoPagoSeleccionado, setTipoPagoSeleccionado] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  useEffect(() => {
    // Aquí se puede conectar con Supabase o backend
    setInventario([
      { producto: 'Manzana Roja', precio: 1250 },
      { producto: 'Palta Hass', precio: 3500 },
      { producto: 'Zanahoria', precio: 800 }
    ]);
  }, []);

  const seleccionarProducto = (nombre, precio) => {
    setProductoSeleccionado({ nombre, precio });
  };

  const agregarProducto = () => {
    const cantidad = parseFloat(document.getElementById('cantidad-producto').value);
    const unidad = document.getElementById('unidad-producto').value;
    const precio = parseInt(document.getElementById('precio-producto').value);

    if (!productoSeleccionado || !cantidad || !precio) return;

    const nuevoProducto = {
      id: Date.now(),
      nombre: productoSeleccionado.nombre,
      cantidad,
      unidad,
      precio,
      subtotal: cantidad * precio
    };

    setProductosVenta([...productosVenta, nuevoProducto]);
    setProductoSeleccionado(null);
    setTerminoBusqueda('');
    document.getElementById('cantidad-producto').value = '';
    document.getElementById('precio-producto').value = '';
  };

  const eliminarProducto = (id) => {
    setProductosVenta(productosVenta.filter(p => p.id !== id));
  };



  // Calcular total para mostrar en el JSX
  const total = productosVenta.reduce((sum, p) => sum + p.subtotal, 0);

  const procesarVenta = async () => {
    if (!tipoPagoSeleccionado) {
      alert('Por favor selecciona un método de pago');
      return;
    }
    
    if (productosVenta.length === 0) {
      alert('Por favor agrega al menos un producto');
      return;
    }

    // Preparar datos para enviar - formato para filas separadas
    const fecha = new Date().toISOString();
    const tipoPago = tipoPagoSeleccionado;
    const totalVenta = total;

    // Crear array de filas para Google Sheets
    const filasVenta = productosVenta.map((producto, index) => ({
      fecha: fecha,
      tipoPago: tipoPago,
      nombreProducto: producto.nombre,
      cantidad: producto.cantidad,
      unidad: producto.unidad,
      precioUnitario: producto.precio,
      totalVenta: index === 0 ? totalVenta : null // Solo en la primera fila
    }));

    const datosVenta = {
      venta: {
        fecha: fecha,
        tipoPago: tipoPago,
        total: totalVenta,
        cantidadProductos: productosVenta.length
      },
      productos: filasVenta
    };

    console.log('Procesando venta:', datosVenta);

    // TODO: Implementar lógica de guardado local o en otro backend
    alert("✅ Venta procesada exitosamente");

    // Limpiar formulario después del envío exitoso
    setProductosVenta([]);
    setTipoPagoSeleccionado('');
    setProductoSeleccionado(null);
    setTerminoBusqueda('');
  };

  const metodosPago = [
    { id: 'efectivo', nombre: 'Efectivo', icono: '💵' },
    { id: 'debito', nombre: 'Débito', icono: '💳' },
    { id: 'transferencia', nombre: 'Transferencia', icono: '📱' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-gray-800 text-white p-6 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-green-400 text-2xl font-bold mb-2">Sistema de Ventas</h1>
          <p className="text-sm text-gray-400">Formulario para registrar ventas</p>
        </div>

        <div className="mb-6">
          <h3 className="text-green-400 text-lg font-semibold mb-3">Buscar Producto</h3>
          <input
            type="text"
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-green-500 focus:outline-none transition-colors"
            placeholder="Escribe el nombre del producto..."
            value={terminoBusqueda}
            onChange={e => setTerminoBusqueda(e.target.value)}
          />
          <div className="bg-gray-700 mt-2 rounded overflow-y-auto max-h-40 border border-gray-600">
            {terminoBusqueda.length >= 2 && inventario.filter(p =>
              p.producto.toLowerCase().includes(terminoBusqueda.toLowerCase())
            ).map(item => (
              <div
                key={item.producto}
                className="p-3 border-b border-gray-600 hover:bg-green-600 cursor-pointer transition-colors"
                onClick={() => seleccionarProducto(item.producto, item.precio)}
              >
                {item.producto} - ${item.precio.toLocaleString()}
              </div>
            ))}
          </div>

          {productoSeleccionado && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input 
                  id="cantidad-producto" 
                  type="number" 
                  placeholder="Cantidad" 
                  min="0.1" 
                  step="0.1" 
                  className="p-3 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none" 
                />
                <select 
                  id="unidad-producto" 
                  className="p-3 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                >
                  <option value="Kg">Kg</option>
                  <option value="gr">gr</option>
                  <option value="Unidad">Unidad</option>
                </select>
                <input 
                  id="precio-producto" 
                  type="number" 
                  placeholder="Precio $" 
                  min="1" 
                  step="1" 
                  defaultValue={productoSeleccionado.precio} 
                  className="p-3 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none" 
                />
              </div>
              <button 
                onClick={agregarProducto} 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Agregar Producto
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-green-400 text-lg font-semibold mb-3">Productos en la Venta</h3>
          <div className="bg-gray-700 p-4 rounded max-h-64 overflow-y-auto border border-gray-600">
            {productosVenta.length === 0 ? (
              <p className="text-gray-400 italic text-center">No hay productos agregados</p>
            ) : (
              productosVenta.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b border-gray-600 py-3">
                  <div>
                    <div className="font-bold text-green-400">{item.nombre}</div>
                    <div className="text-sm text-gray-300">{item.cantidad} {item.unidad} × ${item.precio.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-bold mr-3 text-lg">${item.subtotal.toLocaleString()}</div>
                    <button 
                      onClick={() => eliminarProducto(item.id)} 
                      className="bg-red-600 hover:bg-red-700 px-3 py-2 text-sm rounded transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-green-500 text-center text-white text-xl font-bold py-4 rounded-lg shadow-lg mb-6">
          Total: ${total.toLocaleString()}
        </div>

        {/* Sección Tipo de Pago */}
        <div className="mb-6">
          <h3 className="text-green-400 text-lg font-semibold mb-3 text-center">Tipo de Pago</h3>
          <div className="grid grid-cols-3 gap-3">
            {metodosPago.map((metodo) => (
              <button
                key={metodo.id}
                onClick={() => setTipoPagoSeleccionado(metodo.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 font-semibold ${
                  tipoPagoSeleccionado === metodo.id
                    ? 'border-green-500 bg-green-600 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-green-500 hover:bg-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">{metodo.icono}</div>
                <div className="text-sm">{metodo.nombre}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Botón Procesar Venta */}
        <button
          onClick={procesarVenta}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-lg"
        >
          💰 Procesar Venta
        </button>
      </div>
    </div>
  );
} 