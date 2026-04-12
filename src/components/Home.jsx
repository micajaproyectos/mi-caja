import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import logo from '../assets/logo.png';
import Footer from './Footer';
import { authService } from '../lib/authService.js';
import InfoPopup from './InfoPopup.jsx';
import { supabase } from '../lib/supabaseClient';
import { obtenerFechaHoyChile, obtenerHoraActualChile } from '../lib/dateUtils.js';

export default function Home() {
  const navigate = useNavigate();
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [activeInfoPopup, setActiveInfoPopup] = useState(null);
  const [mostrarTerminosObligatorio, setMostrarTerminosObligatorio] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [procesandoAceptacion, setProcesandoAceptacion] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Optimizado: Una sola llamada para obtener TODOS los datos del usuario
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setNombreUsuario('');
          return;
        }

        // Una sola consulta a la tabla usuarios que trae nombre Y terminos_condiciones
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('usuario_id, nombre, rol, cliente_id, terminos_condiciones')
          .eq('usuario_id', user.id)
          .single();

        if (userError || !userData) {
          setNombreUsuario('');
          return;
        }

        // Establecer nombre del usuario
        setNombreUsuario(userData.nombre || '');

        // Verificar si el usuario necesita aceptar términos
        if (userData.terminos_condiciones === 'no') {
          setMostrarTerminosObligatorio(true);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error al cargar datos del usuario:', error);
        }
        setNombreUsuario('');
      }
    };
    loadUserData();
  }, []);

  // Función para mostrar el popup de información
  const showInfoPopup = (item, e) => {
    e.stopPropagation(); // Evitar que se ejecute la navegación
    setActiveInfoPopup(item);
  };

  // Función para cerrar el popup de información
  const closeInfoPopup = () => {
    setActiveInfoPopup(null);
  };

  // TAREA 2: Función para guardar la aceptación de términos
  const guardarAceptacionTerminos = async () => {
    try {
      setProcesandoAceptacion(true);
      
      // Obtener datos del usuario actual
      const userData = await authService.getCurrentUser();
      if (!userData?.id) {
        alert('Error: No se pudo identificar el usuario');
        return;
      }

      // Obtener fecha y hora de Chile
      const fecha = obtenerFechaHoyChile();
      const hora = obtenerHoraActualChile();
      
      // Obtener timestamp completo
      const timestamp = new Date().toLocaleString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // Obtener información del navegador y dispositivo
      const userAgent = navigator.userAgent;
      const navegador = navigator.userAgent.match(/(firefox|msie|chrome|safari|opera|edge|edg)/i)?.[0] || 'Desconocido';
      const plataforma = navigator.platform || 'Desconocida';
      
      // Intentar obtener IP (esto es limitado en el navegador, podría estar vacío)
      let ipAddress = 'No disponible';
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.log('No se pudo obtener IP:', error);
      }

      // Crear objeto con todos los datos de aceptación
      const datosAceptacion = {
        aceptado: true,
        fecha: fecha,
        hora: hora,
        timestamp: timestamp,
        usuario_id: userData.id,
        email: userData.email || 'No disponible',
        nombre: userData.nombre || 'No disponible',
        ip_address: ipAddress,
        navegador: navegador,
        plataforma: plataforma,
        user_agent: userAgent,
        version_terminos: '1.0'
      };

      // Convertir a JSON string para guardar en la columna
      const datosJSON = JSON.stringify(datosAceptacion, null, 2);

      console.log('📝 Guardando aceptación de términos:', datosAceptacion);

      // Actualizar en Supabase - tabla usuarios, columna terminos_condiciones
      const { error } = await supabase
        .from('usuarios')
        .update({ terminos_condiciones: datosJSON })
        .eq('usuario_id', userData.id);

      if (error) {
        console.error('❌ Error al guardar aceptación:', error);
        alert('Error al guardar la aceptación. Por favor intenta nuevamente.');
        return;
      }

      console.log('✅ Aceptación de términos guardada exitosamente');

      // Cerrar el modal
      setMostrarTerminosObligatorio(false);
      setAceptaTerminos(false);

      // Mostrar mensaje de éxito
      setTimeout(() => {
        alert('✅ Términos y Condiciones aceptados correctamente');
      }, 300);

    } catch (error) {
      console.error('❌ Error inesperado al guardar aceptación:', error);
      alert('Error inesperado. Por favor intenta nuevamente.');
    } finally {
      setProcesandoAceptacion(false);
    }
  };

  // Memoizar menuItems para evitar recreaciones innecesarias
  const menuItems = useMemo(() => [
    // Primera fila: Registro de Venta, Venta Rápida, Pedidos, Autoservicio
    {
      id: 'ventas',
      icon: '🤝',
      label: 'Registro de Venta',
      route: '/ventas'
    },
    {
      id: 'venta-rapida',
      icon: '⚡',
      label: 'Venta Rápida',
      route: '/venta-rapida'
    },
    {
      id: 'pedidos',
      icon: '🍴',
      label: 'Pedidos',
      route: '/pedidos'
    },
    {
      id: 'autoservicio',
      icon: '🛒',
      label: 'Autoservicio',
      route: '/autoservicio'
    },
    // Segunda fila: Inventario, Stock, Inventario IA, Insumos
    {
      id: 'inventario',
      icon: '📦',
      label: 'Inventario',
      route: '/inventario'
    },
    {
      id: 'stock',
      icon: '✅',
      label: 'Stock',
      route: '/stock'
    },
    {
      id: 'inventario-ia',
      icon: '🤖',
      label: 'Inventario IA',
      route: '/inventario-ia'
    },
    {
      id: 'insumos',
      icon: '🧑‍🍳',
      label: 'Insumos',
      route: '/insumos'
    },
    // Tercera fila: Gestión Cocina, Registro de Asistencia, Gastos, Proveedor
    {
      id: 'gestion-cocina',
      icon: '🍳',
      label: 'Gestión Cocina',
      route: '/gestion-cocina'
    },
    {
      id: 'asistencia',
      icon: '📋',
      label: 'Registro de Asistencia',
      route: '/asistencia'
    },
    {
      id: 'gastos',
      icon: '💰',
      label: 'Gastos',
      route: '/gastos'
    },
    {
      id: 'proveedores',
      icon: '🚚',
      label: 'Proveedor',
      route: '/proveedores'
    },
    // Cuarta fila: Clientes, Seguimiento, Auditoría, Transporte
    {
      id: 'transporte',
      icon: '🚛',
      label: 'Transporte',
      route: '/transporte'
    },
    {
      id: 'clientes',
      icon: '👥',
      label: 'Clientes',
      route: '/clientes'
    },
    {
      id: 'seguimiento',
      icon: '📊',
      label: 'Seguimiento',
      route: '/seguimiento'
    },
    {
      id: 'auditoria',
      icon: '🔍',
      label: 'Auditoría',
      route: '/auditoria'
    },
    {
      id: 'calendario',
      icon: '📅',
      label: 'Calendario Mi Caja',
      route: '/calendario'
    },
    {
      id: 'comunidad',
      icon: '💬',
      label: 'Comunidad Mi Caja',
      route: '/comunidad'
    }
  ], []);

  // Generar partículas para la sección principal solo una vez
  const mainParticles = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.4,
    }));
  }, []);

  // Generar partículas para el panel inferior solo una vez
  const panelParticles = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.4,
    }));
  }, []);

  const frasesMensuales = [
    { texto: 'El año nuevo es una página en blanco: llénala de acciones, no de promesas.', emoji: '📖' },
    { texto: 'Toda labor rinde sus frutos, pero hablar por hablar empobrece.', emoji: '🔨' },
    { texto: 'El que construye en silencio, lidera sin anunciarlo.', emoji: '🧱' },
    { texto: 'La disciplina hoy es la libertad financiera mañana.', emoji: '📈' },
    { texto: 'Sin acción, la idea solo es ilusión elegante.', emoji: '💡' },
    { texto: 'Paso firme supera talento sin constancia.', emoji: '👣' },
    { texto: 'Primero estructura, luego escala.', emoji: '🏗️' },
    { texto: 'El mercado paga soluciones, no intenciones.', emoji: '💰' },
    { texto: 'Si resuelves problemas reales, creas valor real.', emoji: '🛠️' },
    { texto: 'El enfoque multiplica lo que el esfuerzo inicia.', emoji: '🎯' },
    { texto: 'Aprende rápido, ejecuta más rápido.', emoji: '⚡' },
    { texto: 'La paciencia estratégica vence la prisa improvisada.', emoji: '⏳' },
  ];
  const fraseDelMes = frasesMensuales[new Date().getMonth()];

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

      {/* Overlay sutil sin blur para mejor rendimiento */}
      <div className="absolute inset-0 bg-black/5"></div>

      {/* Header con logo - Glassmorphism con animación */}
      <div className="relative z-10 p-6">
        {/* Efecto de brillo estático en el fondo del header */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse 150% 200% at 50% -20%, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.2) 40%, transparent 70%)',
          }}
        />

        <div className="flex items-center relative">
          {/* Logo con animación suave */}
          <div
            className="w-16 h-16 mr-4 drop-shadow-lg relative"
            style={{
              animation: 'logoFloat 3s ease-in-out infinite',
              willChange: 'transform',
            }}
          >
            {/* Halo sutil alrededor del logo */}
            <div 
              className="absolute inset-0 rounded-full -z-10"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                opacity: 0.5,
              }}
            />
            <img 
              src={logo} 
              alt="Logo" 
              className="w-full h-full object-contain relative z-10"
            />
          </div>
          
          {/* Título con animación de entrada */}
          <div 
            className="text-white"
            style={{
              animation: 'fadeInSlide 0.8s ease-out',
            }}
          >
            <h1 
              className="text-xl font-bold drop-shadow-sm mb-1"
              style={{
                color: '#e5f9e5',
                textShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                textShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
              }}
            >
              Bienvenido a Mi Caja
            </h1>
            {nombreUsuario ? (
              <p 
                className="text-sm italic mb-1"
                style={{
                  color: '#c8f5c8',
                  animation: 'fadeInUp 0.8s ease-out 0.2s both',
                }}
              >
                Hola, <span className="font-semibold text-green-300">{nombreUsuario}</span> - Tu negocio en un solo lugar
              </p>
            ) : (
              <p 
                className="text-sm italic mb-1"
                style={{
                  color: '#c8f5c8',
                  animation: 'fadeInUp 0.8s ease-out 0.2s both',
                }}
              >
                Cargando...
              </p>
            )}
            <p 
              className="text-sm italic"
              style={{
                color: '#a8d5a8',
                animation: 'fadeInUp 0.8s ease-out 0.4s both',
              }}
            >
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Partículas decorativas sutiles */}
        </div>

        {/* Estilos de animación para el header */}
        <style>{`
          @keyframes logoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          @keyframes fadeInSlide {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1.5); }
          }
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-20px) translateY(-50%); }
            to { opacity: 1; transform: translateX(0) translateY(-50%); }
          }
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(20px) translateY(-50%); }
            to { opacity: 1; transform: translateX(0) translateY(-50%); }
          }
        `}</style>
      </div>

      {/* Título principal centrado con animación de nuevo comienzo */}
      <div className="relative z-10 flex items-center justify-center" style={{ height: '25vh' }}>
        {/* Efecto de partículas de fondo animadas */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {mainParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: `rgba(34, 197, 94, ${particle.opacity})`,
                left: particle.left,
                top: particle.top,
                animation: `sparkle ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
                willChange: 'transform, opacity',
              }}
            />
          ))}
        </div>

        {/* Efecto de brillo estático - sin animación para mejor rendimiento */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: 'radial-gradient(ellipse 150% 200% at 50% 120%, rgba(34, 197, 94, 0.35) 0%, rgba(34, 197, 94, 0.2) 35%, transparent 70%)',
          }}
        />

        <div className="text-center relative z-10">
          {/* Título con efecto de gradiente animado */}
          <div className="relative inline-block mb-6">
            <h1 
              className="text-6xl md:text-7xl font-bold text-center drop-shadow-2xl mb-4"
              style={{ 
                fontFamily: 'Inter, system-ui, sans-serif',
                background: 'linear-gradient(135deg, #ffffff 0%, #22c55e 50%, #ffffff 100%)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'gradientShift 4s ease infinite',
              }}
            >
              Inicio
            </h1>
            {/* Efecto de brillo estático detrás del título */}
            <div
              className="absolute inset-0 -z-10 opacity-40"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.5) 0%, rgba(34, 197, 94, 0.2) 100%)',
              }}
            />
          </div>

          {/* Mensaje motivador año nuevo con efecto especial */}
          <div className="flex items-center justify-center max-w-xl mx-auto relative px-4">
            {/* Líneas decorativas laterales */}
            <div 
              className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-12 h-0.5"
              style={{
                background: 'linear-gradient(to right, transparent, rgba(34, 197, 94, 0.6))',
                animation: 'slideInLeft 1s ease-out 0.5s both',
              }}
            />
            <div 
              className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-12 h-0.5"
              style={{
                background: 'linear-gradient(to left, transparent, rgba(34, 197, 94, 0.6))',
                animation: 'slideInRight 1s ease-out 0.5s both',
              }}
            />
            
            <div 
              className="text-center px-3 py-2 md:px-4 md:py-2.5 rounded-xl w-full relative"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                animation: 'fadeInUp 1s ease-out 0.3s both',
              }}
            >
              <p 
                className="text-sm sm:text-base md:text-lg font-medium whitespace-nowrap relative z-10"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: '#e5f9e5',
                  textShadow: '0 2px 10px rgba(34, 197, 94, 0.3)',
                }}
              >
                {fraseDelMes.texto}{' '}
                <span className="inline-block animate-bounce" style={{ animationDuration: '2s' }}>{fraseDelMes.emoji}</span>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Panel inferior con iconos - Neumorfismo */}
      <div className="relative z-10 py-12" style={{ backgroundColor: '#1f4a1f' }}>
        {/* Efecto de partículas de fondo animadas */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {panelParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: `rgba(34, 197, 94, ${particle.opacity})`,
                left: particle.left,
                top: particle.top,
                animation: `sparkle ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
                willChange: 'transform, opacity',
              }}
            />
          ))}
        </div>

        {/* Efecto de brillo animado - continúa el efecto de la sección INICIO */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse 150% 200% at 50% 120%, rgba(34, 197, 94, 0.35) 0%, rgba(34, 197, 94, 0.2) 35%, transparent 70%)',
          }}
        />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.route)}
                className="group relative flex flex-col items-center p-6 rounded-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 active:translate-y-1 select-none"
                style={{
                  backgroundColor: '#1f4a1f',
                  borderRadius: '1rem',
                  boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Botón de información */}
                <div
                  onClick={(e) => showInfoPopup(item, e)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs font-bold transition-all duration-200 hover:scale-110 z-10 cursor-pointer"
                  title={`Información sobre ${item.label}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      showInfoPopup(item, e);
                    }
                  }}
                >
                  i
                </div>

                <div className="text-5xl mb-4 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 drop-shadow-sm">
                  {item.icon}
                </div>
                <span className="text-white text-sm font-medium text-center drop-shadow-sm transition-colors duration-200 group-hover:text-green-200" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {item.label}
                </span>
                
                {/* Efecto de sombra al presionar */}
                <div className="absolute inset-0 rounded-2xl bg-black/20 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                
                {/* Efecto de brillo en hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Popup de información */}
      {activeInfoPopup && (
        <InfoPopup 
          item={activeInfoPopup} 
          onClose={closeInfoPopup} 
        />
      )}

      {/* Modal OBLIGATORIO de Términos y Condiciones */}
      {mostrarTerminosObligatorio && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div 
            className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
            style={{
              backgroundColor: 'rgba(31, 74, 31, 0.98)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(74, 222, 128, 0.2)'
            }}
          >
            {/* Header del Modal - SIN botón cerrar */}
            <div 
              className="border-b p-4 text-center"
              style={{
                backgroundColor: 'rgba(74, 222, 128, 0.15)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h2 className="text-xl font-bold text-white drop-shadow-lg">
                ⚠️ Términos y Condiciones
              </h2>
              <p className="text-sm text-gray-300 mt-2">
                Debes aceptar los términos para continuar usando Mi Caja
              </p>
            </div>

            {/* Contenido del Modal */}
            <div 
              className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(74, 222, 128, 0.5) rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="text-gray-200 space-y-5 text-sm leading-relaxed">
                {/* Introducción */}
                <div className="text-center pb-4 border-b border-white/10">
                  <p className="text-base font-medium text-white">
                    Mi Caja es una plataforma digital destinada exclusivamente al control de stock, inventario y apoyo a la gestión interna del negocio.
                  </p>
                </div>

                <p className="text-gray-300 italic">
                  Al continuar usando Mi Caja, declaras conocer y aceptar los siguientes términos:
                </p>

                {/* 1. Responsabilidad del Titular */}
                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="text-green-400">1.</span>
                    Responsabilidad del Titular
                  </h3>
                  <p className="text-gray-300 pl-6">
                    El titular de la cuenta es el único responsable legal y tributario de la información ingresada, registrada y gestionada dentro de la plataforma, incluyendo movimientos de stock, ventas, compras, ajustes y cualquier otro registro asociado a la operación de su negocio.
                  </p>
                </div>

                {/* 2. Cumplimiento Tributario */}
                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="text-green-400">2.</span>
                    Cumplimiento Tributario
                  </h3>
                  <div className="text-gray-300 pl-6 space-y-2">
                    <p>
                      Mi Caja no reemplaza ni sustituye las obligaciones legales del contribuyente ante el Servicio de Impuestos Internos (SII) u otros organismos fiscalizadores.
                    </p>
                    <p>
                      Es responsabilidad exclusiva del titular declarar, respaldar y reportar correctamente todas las operaciones comerciales según la normativa vigente.
                    </p>
                  </div>
                </div>

                {/* 3. Uso del Sistema */}
                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="text-green-400">3.</span>
                    Uso del Sistema
                  </h3>
                  <p className="text-gray-300 pl-6">
                    La plataforma actúa como una herramienta de apoyo para la gestión interna. Los datos, reportes y cálculos generados tienen carácter referencial, y deben ser revisados y validados por el usuario antes de su uso contable, tributario o legal.
                  </p>
                </div>

                {/* 4. Exactitud de la Información */}
                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="text-green-400">4.</span>
                    Exactitud de la Información
                  </h3>
                  <p className="text-gray-300 pl-6 mb-2">
                    Mi Caja no se hace responsable por errores derivados de:
                  </p>
                  <ul className="text-gray-300 pl-10 space-y-1 list-disc">
                    <li>Ingreso incorrecto de datos</li>
                    <li>Uso indebido del sistema</li>
                    <li>Omisión de registros</li>
                    <li>Configuraciones realizadas por el usuario</li>
                  </ul>
                </div>

                {/* 5. Accesos y Seguridad */}
                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="text-green-400">5.</span>
                    Accesos y Seguridad
                  </h3>
                  <p className="text-gray-300 pl-6">
                    El titular es responsable de mantener la confidencialidad de sus credenciales y del uso que terceros autorizados realicen dentro de su cuenta.
                  </p>
                </div>

                {/* 6. Limitación de Responsabilidad */}
                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="text-green-400">6.</span>
                    Limitación de Responsabilidad
                  </h3>
                  <p className="text-gray-300 pl-6">
                    Mi Caja no será responsable por pérdidas económicas, sanciones, multas o perjuicios derivados del uso de la plataforma o del incumplimiento de obligaciones legales por parte del titular.
                  </p>
                </div>

                {/* 7. Aceptación */}
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="text-green-400">7.</span>
                    Aceptación
                  </h3>
                  <p className="text-gray-300 pl-6 font-medium">
                    Al aceptar estos términos, confirmas que has leído, entendido y estás de acuerdo con todas las condiciones establecidas.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer del Modal con Checkbox */}
            <div 
              className="border-t p-4"
              style={{
                backgroundColor: 'rgba(26, 61, 26, 0.6)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Checkbox de aceptación */}
              <div className="flex items-center justify-center mb-4">
                <label className="flex items-center gap-3 cursor-pointer text-white hover:text-green-300 transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-green-500 checked:border-green-500 cursor-pointer transition-all duration-200"
                  />
                  <span className="text-sm font-medium">
                    Acepto los Términos y Condiciones
                  </span>
                </label>
              </div>

              {/* Botón Aceptar */}
              <div className="flex justify-center">
                <button
                  onClick={guardarAceptacionTerminos}
                  disabled={!aceptaTerminos || procesandoAceptacion}
                  className="px-8 py-3 rounded-lg transition-all duration-200 transform font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  style={{
                    backgroundColor: aceptaTerminos && !procesandoAceptacion ? '#4ade80' : '#6b7280',
                    color: 'white',
                    boxShadow: aceptaTerminos && !procesandoAceptacion ? '0 4px 14px rgba(74, 222, 128, 0.4)' : 'none',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transform: aceptaTerminos && !procesandoAceptacion ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  {procesandoAceptacion ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Guardando...
                    </div>
                  ) : aceptaTerminos ? (
                    '✅ Aceptar y Continuar'
                  ) : (
                    'Continuar'
                  )}
                </button>
              </div>

              {/* Nota informativa */}
              <p className="text-center text-xs text-gray-400 mt-3">
                No podrás usar Mi Caja hasta que aceptes los términos
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}  