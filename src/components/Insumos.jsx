import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
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
  const [guardando, setGuardando] = useState(false);
  const [recetasGuardadas, setRecetasGuardadas] = useState([]);
  const [cargandoRecetas, setCargandoRecetas] = useState(false);
  const [mostrarRecetas, setMostrarRecetas] = useState(false);

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

  // Función para guardar la receta en Supabase
  const guardarReceta = async () => {
    // Validar que los campos obligatorios estén completos
    if (!nombreProducto.trim()) {
      alert('Por favor ingresa el nombre del producto');
      return;
    }

    const ingredientesConDatos = ingredientes.filter(ing => 
      ing.nombre.trim() !== '' && ing.cantidad !== ''
    );

    if (ingredientesConDatos.length === 0) {
      alert('Por favor agrega al menos un ingrediente con nombre y cantidad');
      return;
    }

    setGuardando(true);

    try {
      // Obtener el usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('No hay usuario autenticado. Por favor inicia sesión.');
        setGuardando(false);
        return;
      }

      const recetaData = {
        nombre_producto: nombreProducto.trim(),
        cantidad_deseada: parseFloat(cantidadDeseada) || 0,
        cantidad_base: parseFloat(cantidadBase) || 1,
        ingredientes: ingredientesConDatos.map(ing => ({
          nombre: ing.nombre.trim(),
          unidad: ing.unidad,
          cantidad: parseFloat(ing.cantidad) || 0
        })),
        fecha_cl: new Date().toISOString(),
        usuario_id: user.id, // ID del usuario autenticado
        cliente_id: user.id  // Por ahora usar el mismo ID, se puede ajustar según tu lógica
      };

      const { data, error } = await supabase
        .from('recetas')
        .insert([recetaData]);

      if (error) {
        console.error('Error al guardar la receta:', error);
        alert('Error al guardar la receta. Por favor intenta de nuevo.');
      } else {
        alert('¡Receta guardada exitosamente!');
        console.log('Receta guardada:', data);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('Error inesperado al guardar la receta.');
    } finally {
      setGuardando(false);
    }
  };

  // Función para cargar recetas guardadas desde Supabase
  const cargarRecetas = async () => {
    setCargandoRecetas(true);
    try {
      const { data, error } = await supabase
        .from('recetas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar recetas:', error);
        alert('Error al cargar las recetas guardadas.');
      } else {
        setRecetasGuardadas(data || []);
        setMostrarRecetas(true);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('Error inesperado al cargar las recetas.');
    } finally {
      setCargandoRecetas(false);
    }
  };

  // Función para cargar una receta seleccionada
  const cargarReceta = (receta) => {
    setNombreProducto(receta.nombre_producto);
    setCantidadDeseada(receta.cantidad_deseada.toString());
    setCantidadBase(receta.cantidad_base.toString());
    
    // Cargar ingredientes
    const ingredientesCargados = receta.ingredientes.map(ing => ({
      nombre: ing.nombre,
      unidad: ing.unidad,
      cantidad: ing.cantidad.toString()
    }));
    
    // Asegurar que hay al menos 3 filas de ingredientes
    while (ingredientesCargados.length < 3) {
      ingredientesCargados.push({ nombre: '', unidad: 'kg', cantidad: '' });
    }
    
    setIngredientes(ingredientesCargados);
    setMostrarRecetas(false);
    
    alert(`Receta "${receta.nombre_producto}" cargada exitosamente.`);
  };

  // Función para eliminar una receta
  const eliminarReceta = async (recetaId, nombreReceta) => {
    const confirmar = window.confirm(`¿Estás seguro de que quieres eliminar la receta "${nombreReceta}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from('recetas')
        .delete()
        .eq('id', recetaId);

      if (error) {
        console.error('Error al eliminar la receta:', error);
        alert('Error al eliminar la receta. Por favor intenta de nuevo.');
      } else {
        alert('Receta eliminada exitosamente.');
        // Actualizar la lista de recetas
        const recetasActualizadas = recetasGuardadas.filter(receta => receta.id !== recetaId);
        setRecetasGuardadas(recetasActualizadas);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('Error inesperado al eliminar la receta.');
    }
  };

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
    setNombreProducto('');
    setCantidadDeseada('');
    setCantidadBase('1');
    setIngredientes([
      { nombre: '', unidad: 'kg', cantidad: '' },
      { nombre: '', unidad: 'kg', cantidad: '' },
      { nombre: '', unidad: 'kg', cantidad: '' }
    ]);
    setIngredientesDisponibles([]);
  };

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

                {/* Botones de Acción */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
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
                  
                  <button
                    type="button"
                    onClick={cargarRecetas}
                    disabled={cargandoRecetas}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {cargandoRecetas ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Cargando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Cargar recetas
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={guardarReceta}
                    disabled={guardando || !nombreProducto.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {guardando ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Guardar receta
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Modal de Recetas Guardadas */}
              {mostrarRecetas && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          📚 Recetas Guardadas
                        </h3>
                        <button
                          onClick={() => setMostrarRecetas(false)}
                          className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {recetasGuardadas.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-6xl mb-4">📝</div>
                          <p className="text-gray-600 text-lg">No hay recetas guardadas</p>
                          <p className="text-gray-500">Crea y guarda tu primera receta para verla aquí.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                          {recetasGuardadas.map((receta) => (
                            <div
                              key={receta.id}
                              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 relative group"
                            >
                              {/* Botón de eliminar */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Evitar que se active el onClick del contenedor
                                  eliminarReceta(receta.id, receta.nombre_producto);
                                }}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                                title="Eliminar receta"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>

                              {/* Contenido de la receta */}
                              <div 
                                className="cursor-pointer"
                                onClick={() => cargarReceta(receta)}
                              >
                                <h4 className="font-bold text-gray-800 mb-2 truncate pr-8" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                  {receta.nombre_producto}
                                </h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p><span className="font-semibold">Base:</span> {receta.cantidad_base} unidad</p>
                                  <p><span className="font-semibold">Ingredientes:</span> {receta.ingredientes.length}</p>
                                  <p><span className="font-semibold">Creada:</span> {new Date(receta.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Haz clic para cargar</span>
                                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                      Con los ingredientes disponibles puedes producir <span className="font-bold text-white">{productosPosibles}</span> preparaciones de{' '}
                      <span className="font-bold text-white">{nombreProducto || 'tu producto'}</span>
                    </p>
                    <p className="text-green-200 mt-2">
                      Esto equivale a <span className="font-bold text-white">{productosPosibles * parseFloat(cantidadBase || 1)}</span> unidades de{' '}
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

