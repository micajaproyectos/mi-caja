import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';

function Insumos() {
  const navigate = useNavigate();
  const [nombreProducto, setNombreProducto] = useState('');
  const [cantidadDeseada, setCantidadDeseada] = useState('');
  const [cantidadBase, setCantidadBase] = useState('1');
  const [ingredientes, setIngredientes] = useState([
    { nombre: '', unidad: 'kg', cantidad: '' },
    { nombre: '', unidad: 'kg', cantidad: '' },
    { nombre: '', unidad: 'kg', cantidad: '' }
  ]);
  const [ingredientesDisponibles, setIngredientesDisponibles] = useState([]);

  const unidades = ['kg', 'gr', 'ml', 'Lt', 'pz', 'unidad', 'tazas', 'cucharadas', 'cucharaditas'];

  // Función para convertir unidades
  const convertirUnidad = (cantidad, unidadOrigen, unidadDestino) => {
    const conversiones = {
      // Peso
      'kg': { 'gr': 1000, 'kg': 1 },
      'gr': { 'kg': 0.001, 'gr': 1 },
      // Volumen
      'Lt': { 'ml': 1000, 'Lt': 1 },
      'ml': { 'Lt': 0.001, 'ml': 1 },
      // Unidades
      'pz': { 'pz': 1, 'unidad': 1 },
      'unidad': { 'pz': 1, 'unidad': 1 },
      // Tazas (aproximado)
      'tazas': { 'ml': 250, 'Lt': 0.25, 'tazas': 1 },
      'cucharadas': { 'ml': 15, 'Lt': 0.015, 'cucharadas': 1 },
      'cucharaditas': { 'ml': 5, 'Lt': 0.005, 'cucharaditas': 1 }
    };

    if (unidadOrigen === unidadDestino) return cantidad;
    
    const factor = conversiones[unidadOrigen]?.[unidadDestino];
    if (factor) {
      return cantidad * factor;
    }
    
    // Si no hay conversión directa, devolver la cantidad original
    return cantidad;
  };

  // Sincronizar ingredientes disponibles con la receta
  useEffect(() => {
    const ingredientesConNombre = ingredientes.filter(ing => ing.nombre.trim() !== '');
    
    if (ingredientesConNombre.length > 0) {
      const nuevosIngredientesDisponibles = ingredientesConNombre.map(ing => {
        const existente = ingredientesDisponibles.find(disp => 
          disp.nombre.toLowerCase() === ing.nombre.toLowerCase()
        );
        
        return {
          nombre: ing.nombre,
          unidad: ing.unidad,
          cantidadDisponible: existente ? existente.cantidadDisponible : ''
        };
      });
      
      setIngredientesDisponibles(nuevosIngredientesDisponibles);
    } else {
      setIngredientesDisponibles([]);
    }
  }, [ingredientes]);

  const handleIngredienteChange = (index, field, value) => {
    const nuevosIngredientes = [...ingredientes];
    nuevosIngredientes[index][field] = value;
    setIngredientes(nuevosIngredientes);
  };

  const agregarIngrediente = () => {
    setIngredientes([...ingredientes, { nombre: '', unidad: 'kg', cantidad: '' }]);
  };

  const eliminarIngrediente = (index) => {
    if (ingredientes.length > 1) {
      const nuevosIngredientes = ingredientes.filter((_, i) => i !== index);
      setIngredientes(nuevosIngredientes);
    }
  };

  const handleIngredienteDisponibleChange = (index, field, value) => {
    const nuevosIngredientes = [...ingredientesDisponibles];
    
    if (field === 'unidad') {
      // Convertir la cantidad cuando cambia la unidad
      const cantidadActual = parseFloat(nuevosIngredientes[index].cantidadDisponible) || 0;
      const unidadAnterior = nuevosIngredientes[index].unidad;
      const cantidadConvertida = convertirUnidad(cantidadActual, unidadAnterior, value);
      
      nuevosIngredientes[index].unidad = value;
      nuevosIngredientes[index].cantidadDisponible = cantidadConvertida.toString();
    } else {
      nuevosIngredientes[index][field] = value;
    }
    
    setIngredientesDisponibles(nuevosIngredientes);
  };

  // Calcular ingredientes necesarios
  const calcularIngredientesNecesarios = () => {
    const cantidadDeseadaNum = parseFloat(cantidadDeseada) || 0;
    const cantidadBaseNum = parseFloat(cantidadBase) || 1;
    
    if (cantidadDeseadaNum === 0 || cantidadBaseNum === 0) {
      return ingredientes.map(ing => ({ ...ing, cantidadNecesaria: 0 }));
    }

    const factor = cantidadDeseadaNum / cantidadBaseNum;
    
    return ingredientes.map(ing => ({
      ...ing,
      cantidadNecesaria: parseFloat(ing.cantidad) * factor || 0
    }));
  };

  const ingredientesCalculados = calcularIngredientesNecesarios();

  // Calcular productos posibles con ingredientes disponibles
  const calcularProductosPosibles = () => {
    const cantidadBaseNum = parseFloat(cantidadBase) || 1;
    
    if (cantidadBaseNum === 0 || ingredientesDisponibles.length === 0) return 0;

    let productosPosibles = Infinity;

    ingredientesDisponibles.forEach((ingredienteDisponible, index) => {
      const ingredienteReceta = ingredientes[index];
      
      if (ingredienteReceta && ingredienteReceta.nombre && ingredienteReceta.cantidad && 
          ingredienteDisponible.cantidadDisponible) {
        const cantidadDisponible = parseFloat(ingredienteDisponible.cantidadDisponible) || 0;
        const cantidadNecesaria = parseFloat(ingredienteReceta.cantidad) || 0;
        
        if (cantidadNecesaria > 0) {
          // Convertir la cantidad disponible a la unidad de la receta
          const cantidadDisponibleConvertida = convertirUnidad(
            cantidadDisponible, 
            ingredienteDisponible.unidad, 
            ingredienteReceta.unidad
          );
          
          const productosConEsteIngrediente = Math.floor(cantidadDisponibleConvertida / cantidadNecesaria);
          productosPosibles = Math.min(productosPosibles, productosConEsteIngrediente);
        }
      } else {
        // Si no hay ingrediente disponible o no está en la receta, no se puede hacer ningún producto
        productosPosibles = 0;
      }
    });

    return productosPosibles === Infinity ? 0 : productosPosibles;
  };

  const productosPosibles = calcularProductosPosibles();

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
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Insumos
            </h1>
            <p className="text-green-200 text-lg md:text-xl italic animate-fade-in-delayed">
              Gestiona y controla los insumos de tu negocio
            </p>
          </div>

          {/* Formulario de Insumos */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
            <div className="space-y-8">
              {/* Nombre del Producto */}
              <div className="space-y-2">
                <label className="block text-white font-semibold text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  value={nombreProducto}
                  onChange={(e) => setNombreProducto(e.target.value)}
                  placeholder="Ej: Café en grano"
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              {/* Configuración de Cantidades */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white font-semibold text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Cantidad Deseada
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cantidadDeseada}
                      onChange={(e) => setCantidadDeseada(e.target.value)}
                      placeholder="500"
                      className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <span className="text-white font-medium">unidades</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-white font-semibold text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Receta Base (por)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={cantidadBase}
                      onChange={(e) => setCantidadBase(e.target.value)}
                      placeholder="1"
                      className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <span className="text-white font-medium">unidad</span>
                  </div>
                </div>
              </div>

              {/* Sección de Ingredientes */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Ingredientes
                </h3>
                
                {/* Tabla de Ingredientes */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-2 text-white font-semibold text-sm md:text-base">Nombre Ingrediente</th>
                        <th className="text-left py-3 px-2 text-white font-semibold text-sm md:text-base">Unidad</th>
                        <th className="text-left py-3 px-2 text-white font-semibold text-sm md:text-base">Cantidad Base</th>
                        <th className="text-left py-3 px-2 text-white font-semibold text-sm md:text-base">Necesario</th>
                        <th className="text-center py-3 px-2 text-white font-semibold text-sm md:text-base">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientes.map((ingrediente, index) => (
                        <tr key={index} className="border-b border-white/10">
                          <td className="py-3 px-2">
                            <input
                              type="text"
                              value={ingrediente.nombre}
                              onChange={(e) => handleIngredienteChange(index, 'nombre', e.target.value)}
                              placeholder="Nombre del ingrediente"
                              className="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-sm"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <select
                              value={ingrediente.unidad}
                              onChange={(e) => handleIngredienteChange(index, 'unidad', e.target.value)}
                              className="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-sm"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            >
                              {unidades.map((unidad) => (
                                <option key={unidad} value={unidad} className="bg-gray-800 text-white">
                                  {unidad}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ingrediente.cantidad}
                              onChange={(e) => handleIngredienteChange(index, 'cantidad', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-sm"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <div className="px-3 py-2 bg-green-600/30 border border-green-400/50 rounded-md text-green-100 font-semibold text-sm text-center">
                              {ingredientesCalculados[index]?.cantidadNecesaria?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {ingredientes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => eliminarIngrediente(index)}
                                className="text-red-400 hover:text-red-300 transition-colors duration-200 p-1"
                                title="Eliminar ingrediente"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Botón Agregar Ingrediente */}
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={agregarIngrediente}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Agregar ingrediente
                  </button>
                </div>
              </div>

              {/* Resumen de Ingredientes Necesarios */}
              {cantidadDeseada && parseFloat(cantidadDeseada) > 0 && (
                <div className="mt-8 p-6 bg-green-600/20 border border-green-400/30 rounded-xl">
                  <h4 className="text-white font-bold text-xl mb-4 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    📋 Resumen de Ingredientes Necesarios
                  </h4>
                  <div className="text-center mb-4">
                    <span className="text-green-200 text-lg">
                      Para producir <span className="font-bold text-white">{cantidadDeseada}</span> unidades de{' '}
                      <span className="font-bold text-white">{nombreProducto || 'tu producto'}</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {ingredientesCalculados
                      .filter(ing => ing.nombre && ing.cantidadNecesaria > 0)
                      .map((ingrediente, index) => {
                        // Redondear hacia arriba para cantidades realistas de compra
                        const cantidadRealista = Math.ceil(ingrediente.cantidadNecesaria);
                        return (
                          <div key={index} className="flex justify-between items-center py-2 px-4 bg-white/10 rounded-lg">
                            <span className="text-white font-medium">{ingrediente.nombre}</span>
                            <span className="text-green-200 font-bold">
                              {cantidadRealista} {ingrediente.unidad}
                            </span>
                          </div>
                        );
                      })}
                    {ingredientesCalculados.filter(ing => ing.nombre && ing.cantidadNecesaria > 0).length === 0 && (
                      <div className="text-center text-gray-300 py-4">
                        Completa los ingredientes para ver el resumen
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Calculadora Reversa - Ingredientes Disponibles */}
              {ingredientesDisponibles.length > 0 && (
                <div className="mt-12 p-6 bg-blue-600/20 border border-blue-400/30 rounded-xl">
                  <h3 className="text-white font-bold text-2xl mb-6 text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    🔄 Calculadora Reversa
                  </h3>
                  <p className="text-blue-200 text-center mb-6">
                    ¿Cuántos productos puedes hacer con los ingredientes que tienes?
                  </p>

                  {/* Ingredientes Disponibles */}
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Ingredientes Disponibles
                    </h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left py-3 px-2 text-white font-semibold text-sm md:text-base">Nombre Ingrediente</th>
                            <th className="text-left py-3 px-2 text-white font-semibold text-sm md:text-base">Unidad</th>
                            <th className="text-left py-3 px-2 text-white font-semibold text-sm md:text-base">Cantidad Disponible</th>
                            <th className="text-left py-3 px-2 text-white font-semibold text-sm md:text-base">Necesario por Producto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredientesDisponibles.map((ingrediente, index) => (
                            <tr key={index} className="border-b border-white/10">
                              <td className="py-3 px-2">
                                <div className="px-3 py-2 bg-blue-600/30 border border-blue-400/50 rounded-md text-blue-100 font-semibold text-sm text-center">
                                  {ingrediente.nombre}
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <select
                                  value={ingrediente.unidad}
                                  onChange={(e) => handleIngredienteDisponibleChange(index, 'unidad', e.target.value)}
                                  className="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-sm"
                                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                                >
                                  {unidades.map((unidad) => (
                                    <option key={unidad} value={unidad} className="bg-gray-800 text-white">
                                      {unidad}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 px-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={ingrediente.cantidadDisponible}
                                  onChange={(e) => handleIngredienteDisponibleChange(index, 'cantidadDisponible', e.target.value)}
                                  placeholder="0.00"
                                  className="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-sm"
                                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                                />
                              </td>
                              <td className="py-3 px-2">
                                <div className="px-3 py-2 bg-green-600/30 border border-green-400/50 rounded-md text-green-100 font-semibold text-sm text-center">
                                  {ingredientes[index]?.cantidad || '0.00'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                {/* Resultado de Productos Posibles */}
                {productosPosibles > 0 && (
                  <div className="mt-6 p-4 bg-green-600/30 border border-green-400/50 rounded-lg text-center">
                    <div className="text-4xl mb-2">🎉</div>
                    <h4 className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      ¡Puedes hacer {productosPosibles} {productosPosibles === 1 ? 'producto' : 'productos'}!
                    </h4>
                    <p className="text-green-200">
                      Con los ingredientes disponibles puedes producir <span className="font-bold text-white">{productosPosibles}</span> unidades de{' '}
                      <span className="font-bold text-white">{nombreProducto || 'tu producto'}</span>
                    </p>
                  </div>
                )}

                {productosPosibles === 0 && ingredientesDisponibles.some(ing => ing.cantidadDisponible) && (
                  <div className="mt-6 p-4 bg-red-600/30 border border-red-400/50 rounded-lg text-center">
                    <div className="text-4xl mb-2">⚠️</div>
                    <h4 className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      No puedes hacer ningún producto
                    </h4>
                    <p className="text-red-200">
                      Te faltan ingredientes o no tienes suficiente cantidad para hacer la receta
                    </p>
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Insumos;

