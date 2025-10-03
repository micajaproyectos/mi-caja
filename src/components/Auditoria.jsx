import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';
import { useSessionData } from '../lib/useSessionData.js';
import Footer from './Footer';

const Auditoria = () => {
  const [loading, setLoading] = useState(true);
  const [registrosAuditoria, setRegistrosAuditoria] = useState([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
  
  // Estados para filtros
  const [filtroTabla, setFiltroTabla] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  
  // Estados para detalles expandidos
  const [registroExpandido, setRegistroExpandido] = useState(null);

  // Función para formatear fecha y hora en zona horaria de Chile
  const formatearFechaHoraChile = (fechaUTC) => {
    if (!fechaUTC) return { fecha: '-', hora: '-' };
    
    try {
      const fecha = new Date(fechaUTC);
      
      // Formatear fecha: DD/MM/YYYY
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const anio = fecha.getFullYear();
      const fechaFormateada = `${dia}/${mes}/${anio}`;
      
      // Formatear hora: HH:MM:SS
      const horas = fecha.getHours().toString().padStart(2, '0');
      const minutos = fecha.getMinutes().toString().padStart(2, '0');
      const segundos = fecha.getSeconds().toString().padStart(2, '0');
      const horaFormateada = `${horas}:${minutos}:${segundos}`;
      
      return { fecha: fechaFormateada, hora: horaFormateada };
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return { fecha: '-', hora: '-' };
    }
  };

  // Función para traducir nombre de tabla
  const traducirTabla = (tabla) => {
    const traducciones = {
      'ventas': 'Ventas',
      'venta_rapida': 'Venta Rápida',
      'inventario': 'Inventario'
    };
    return traducciones[tabla] || tabla;
  };

  // Función para traducir acción
  const traducirAccion = (accion) => {
    const traducciones = {
      'UPDATE': 'Edición',
      'DELETE': 'Eliminación'
    };
    return traducciones[accion] || accion;
  };

  // Función para obtener el icono según la acción
  const obtenerIconoAccion = (accion) => {
    return accion === 'UPDATE' ? '✏️' : '🗑️';
  };

  // Función para obtener el color según la acción
  const obtenerColorAccion = (accion) => {
    return accion === 'UPDATE' ? 'text-blue-300' : 'text-red-300';
  };

  // Función para extraer cambios importantes de los datos
  const extraerCambios = (datosAnteriores, datosNuevos, accion) => {
    if (accion === 'DELETE') {
      // Para eliminaciones, mostrar qué se eliminó
      const cambios = [];
      if (datosAnteriores.producto) {
        cambios.push(`Producto: ${datosAnteriores.producto}`);
      }
      if (datosAnteriores.monto) {
        cambios.push(`Monto: $${parseFloat(datosAnteriores.monto).toLocaleString('es-CL')}`);
      }
      if (datosAnteriores.cantidad) {
        cambios.push(`Cantidad: ${datosAnteriores.cantidad}`);
      }
      return cambios.join(', ');
    }
    
    // Para ediciones, mostrar qué cambió
    const cambios = [];
    
    // Comparar campos importantes
    const camposImportantes = ['producto', 'monto', 'cantidad', 'precio_unitario', 'precio_venta', 'costo_total', 'tipo_pago', 'total_venta'];
    
    camposImportantes.forEach(campo => {
      if (datosAnteriores[campo] !== undefined && datosNuevos[campo] !== undefined) {
        const valorAnterior = datosAnteriores[campo];
        const valorNuevo = datosNuevos[campo];
        
        if (valorAnterior !== valorNuevo) {
          // Formatear según el tipo de campo
          if (['monto', 'precio_unitario', 'precio_venta', 'costo_total', 'total_venta'].includes(campo)) {
            cambios.push(`${campo.replace(/_/g, ' ')}: $${parseFloat(valorAnterior).toLocaleString('es-CL')} → $${parseFloat(valorNuevo).toLocaleString('es-CL')}`);
          } else {
            cambios.push(`${campo.replace(/_/g, ' ')}: ${valorAnterior} → ${valorNuevo}`);
          }
        }
      }
    });
    
    return cambios.length > 0 ? cambios.join(', ') : 'Sin cambios detectados';
  };

  // Función para cargar registros de auditoría
  const cargarAuditoria = async () => {
    setLoading(true);
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        console.error('❌ No hay usuario autenticado');
        setRegistrosAuditoria([]);
        return;
      }

      const { data, error } = await supabase
        .from('auditoria')
        .select(`
          id,
          tabla_nombre,
          accion,
          usuario_id,
          cliente_id,
          registro_id,
          registro_id_numerico,
          datos_anteriores,
          datos_nuevos,
          fecha_hora
        `)
        .eq('usuario_id', usuarioId)
        .order('fecha_hora', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error al cargar auditoría:', error);
        setRegistrosAuditoria([]);
      } else {
        setRegistrosAuditoria(data || []);
        setRegistrosFiltrados(data || []);
      }
    } catch (error) {
      console.error('❌ Error inesperado al cargar auditoría:', error);
      setRegistrosAuditoria([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para recargar datos
  const recargarDatos = useCallback(() => {
    cargarAuditoria();
  }, []);

  // Hook para gestionar cambios de sesión
  useSessionData(recargarDatos, 'Auditoria');

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarAuditoria();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let registrosFiltrados = [...registrosAuditoria];

    if (filtroTabla) {
      registrosFiltrados = registrosFiltrados.filter(r => r.tabla_nombre === filtroTabla);
    }

    if (filtroAccion) {
      registrosFiltrados = registrosFiltrados.filter(r => r.accion === filtroAccion);
    }

    // Filtrar por mes
    if (filtroMes) {
      registrosFiltrados = registrosFiltrados.filter(r => {
        const fecha = new Date(r.fecha_hora);
        const mes = fecha.getMonth() + 1; // getMonth() retorna 0-11
        return mes === parseInt(filtroMes);
      });
    }

    // Filtrar por año
    if (filtroAnio) {
      registrosFiltrados = registrosFiltrados.filter(r => {
        const fecha = new Date(r.fecha_hora);
        const anio = fecha.getFullYear();
        return anio === parseInt(filtroAnio);
      });
    }

    setRegistrosFiltrados(registrosFiltrados);
  }, [filtroTabla, filtroAccion, filtroMes, filtroAnio, registrosAuditoria]);

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroTabla('');
    setFiltroAccion('');
    setFiltroMes('');
    setFiltroAnio('');
  };

  // Función para obtener los años únicos de los registros
  const obtenerAniosUnicos = () => {
    const anios = new Set();
    registrosAuditoria.forEach(r => {
      const fecha = new Date(r.fecha_hora);
      anios.add(fecha.getFullYear());
    });
    return Array.from(anios).sort((a, b) => b - a); // Ordenar de más reciente a más antiguo
  };

  // Función para expandir/contraer detalles
  const toggleDetalles = (id) => {
    setRegistroExpandido(registroExpandido === id ? null : id);
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
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-white hover:text-green-300 transition-colors duration-200 font-medium text-sm md:text-base"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-lg md:text-xl">←</span>
              <span>Volver al Inicio</span>
            </button>
          </div>

          {/* Título con icono */}
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <span className="text-5xl md:text-6xl">🔍</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Auditoría
            </h1>
            <p className="text-gray-300 text-sm md:text-base mt-2">
              Control y seguimiento de operaciones
            </p>
          </div>

          {/* Filtros */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 mb-6">
            <h3 className="text-lg md:text-xl font-semibold text-yellow-400 mb-4 text-center">
              Filtros
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por tabla */}
              <div>
                <label className="block text-gray-200 font-medium mb-2 text-xs md:text-sm">
                  Tabla:
                </label>
                <select
                  value={filtroTabla}
                  onChange={(e) => setFiltroTabla(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm md:text-base"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-gray-800">Todas las tablas</option>
                  <option value="ventas" className="bg-gray-800">Ventas</option>
                  <option value="venta_rapida" className="bg-gray-800">Venta Rápida</option>
                  <option value="inventario" className="bg-gray-800">Inventario</option>
                </select>
              </div>

              {/* Filtro por acción */}
              <div>
                <label className="block text-gray-200 font-medium mb-2 text-xs md:text-sm">
                  Acción:
                </label>
                <select
                  value={filtroAccion}
                  onChange={(e) => setFiltroAccion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm md:text-base"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-gray-800">Todas las acciones</option>
                  <option value="UPDATE" className="bg-gray-800">Ediciones</option>
                  <option value="DELETE" className="bg-gray-800">Eliminaciones</option>
                </select>
              </div>

              {/* Filtro por mes */}
              <div>
                <label className="block text-gray-200 font-medium mb-2 text-xs md:text-sm">
                  Mes:
                </label>
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm md:text-base"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-gray-800">Todos los meses</option>
                  <option value="1" className="bg-gray-800">Enero</option>
                  <option value="2" className="bg-gray-800">Febrero</option>
                  <option value="3" className="bg-gray-800">Marzo</option>
                  <option value="4" className="bg-gray-800">Abril</option>
                  <option value="5" className="bg-gray-800">Mayo</option>
                  <option value="6" className="bg-gray-800">Junio</option>
                  <option value="7" className="bg-gray-800">Julio</option>
                  <option value="8" className="bg-gray-800">Agosto</option>
                  <option value="9" className="bg-gray-800">Septiembre</option>
                  <option value="10" className="bg-gray-800">Octubre</option>
                  <option value="11" className="bg-gray-800">Noviembre</option>
                  <option value="12" className="bg-gray-800">Diciembre</option>
                </select>
              </div>

              {/* Filtro por año */}
              <div>
                <label className="block text-gray-200 font-medium mb-2 text-xs md:text-sm">
                  Año:
                </label>
                <select
                  value={filtroAnio}
                  onChange={(e) => setFiltroAnio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm md:text-base"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-gray-800">Todos los años</option>
                  {obtenerAniosUnicos().map(anio => (
                    <option key={anio} value={anio} className="bg-gray-800">
                      {anio}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón limpiar filtros */}
            {(filtroTabla || filtroAccion || filtroMes || filtroAnio) && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={limpiarFiltros}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <span>🗑️</span>
                  <span>Limpiar Filtros</span>
                </button>
              </div>
            )}
          </div>

          {/* Tabla de auditoría */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-semibold text-yellow-400">
                Registros de Auditoría ({registrosFiltrados.length})
              </h2>
              <button
                onClick={cargarAuditoria}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                🔄 Actualizar
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
                <span className="ml-3 text-white">Cargando auditoría...</span>
              </div>
            ) : registrosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-300 text-lg">
                  No hay registros de auditoría
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Las ediciones y eliminaciones aparecerán aquí automáticamente
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="bg-white/10 backdrop-blur-sm">
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Fecha</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Hora</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Tabla</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Acción</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-left">Datos Modificados</th>
                      <th className="text-white font-semibold p-2 md:p-4 text-center">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map((registro) => {
                      const { fecha, hora } = formatearFechaHoraChile(registro.fecha_hora);
                      const cambios = extraerCambios(registro.datos_anteriores, registro.datos_nuevos, registro.accion);
                      const estaExpandido = registroExpandido === registro.id;
                      
                      return (
                        <React.Fragment key={registro.id}>
                          <tr className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                            {/* Fecha */}
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {fecha}
                            </td>
                            
                            {/* Hora */}
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              {hora}
                            </td>
                            
                            {/* Tabla */}
                            <td className="text-blue-300 p-2 md:p-4 font-medium text-xs md:text-sm">
                              {traducirTabla(registro.tabla_nombre)}
                            </td>
                            
                            {/* Acción */}
                            <td className={`p-2 md:p-4 font-bold text-xs md:text-sm ${obtenerColorAccion(registro.accion)}`}>
                              <span className="flex items-center gap-1">
                                <span>{obtenerIconoAccion(registro.accion)}</span>
                                <span>{traducirAccion(registro.accion)}</span>
                              </span>
                            </td>
                            
                            {/* Datos modificados */}
                            <td className="text-gray-300 p-2 md:p-4 text-xs md:text-sm">
                              <div className="max-w-md truncate" title={cambios}>
                                {cambios}
                              </div>
                            </td>
                            
                            {/* Botón detalles */}
                            <td className="p-2 md:p-4 text-center">
                              <button
                                onClick={() => toggleDetalles(registro.id)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                              >
                                {estaExpandido ? '▲ Ocultar' : '▼ Ver más'}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Fila expandida con detalles completos */}
                          {estaExpandido && (
                            <tr className="bg-white/5">
                              <td colSpan="6" className="p-4">
                                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                                  <h4 className="text-yellow-400 font-semibold mb-2">Detalles Completos:</h4>
                                  
                                  {registro.accion === 'UPDATE' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-red-300 font-medium mb-2">📝 Antes de la edición:</p>
                                        <pre className="bg-black/30 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                                          {JSON.stringify(registro.datos_anteriores, null, 2)}
                                        </pre>
                                      </div>
                                      <div>
                                        <p className="text-green-300 font-medium mb-2">✅ Después de la edición:</p>
                                        <pre className="bg-black/30 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                                          {JSON.stringify(registro.datos_nuevos, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {registro.accion === 'DELETE' && (
                                    <div>
                                      <p className="text-red-300 font-medium mb-2">🗑️ Registro eliminado:</p>
                                      <pre className="bg-black/30 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                                        {JSON.stringify(registro.datos_anteriores, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  <div className="text-gray-400 text-xs mt-3">
                                    <p>ID del registro: {registro.registro_id || registro.registro_id_numerico || 'N/A'}</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Auditoria;

