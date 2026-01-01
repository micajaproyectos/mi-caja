import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import logo from '../assets/logo.png';
import Footer from './Footer';
import { authService } from '../lib/authService.js';
import InfoPopup from './InfoPopup.jsx';

export default function Home() {
  const navigate = useNavigate();
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [activeInfoPopup, setActiveInfoPopup] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setNombreUsuario(userData?.nombre || '');
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
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
      id: 'comunidad',
      icon: '💬',
      label: 'Comunidad Mi Caja',
      route: '/comunidad'
    }
  ], []);

  // Generar partículas para la sección principal solo una vez
  const mainParticles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
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
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.4,
    }));
  }, []);

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

      {/* Header con logo - Glassmorphism con animación */}
      <div className="relative z-10 p-6">
        {/* Efecto de brillo sutil en el fondo - se extiende hacia abajo */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse 150% 200% at 50% -20%, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.2) 40%, transparent 70%)',
            animation: 'headerGlow 4s ease-in-out infinite',
          }}
        />

        <div className="flex items-center relative">
          {/* Logo con animación suave */}
          <div 
            className="w-16 h-16 mr-4 drop-shadow-lg relative"
            style={{
              animation: 'logoFloat 3s ease-in-out infinite',
            }}
          >
            {/* Halo sutil alrededor del logo */}
            <div 
              className="absolute inset-0 rounded-full blur-md -z-10"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)',
                animation: 'logoGlow 2.5s ease-in-out infinite',
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
                animation: 'textShimmer 3s ease-in-out infinite',
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
          <div className="absolute -top-2 -right-2 w-2 h-2 rounded-full bg-green-400/60 animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="absolute top-1/2 -right-4 w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
        </div>

        {/* Estilos de animación para el header */}
        <style>{`
          @keyframes headerGlow {
            0%, 100% {
              opacity: 0.15;
            }
            50% {
              opacity: 0.3;
            }
          }
          @keyframes logoFloat {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-5px);
            }
          }
          @keyframes logoGlow {
            0%, 100% {
              opacity: 0.4;
              transform: scale(0.9);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.1);
            }
          }
          @keyframes fadeInSlide {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes textShimmer {
            0%, 100% {
              text-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
            }
            50% {
              text-shadow: 0 2px 12px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.2);
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
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
              }}
            />
          ))}
        </div>

        {/* Efecto de brillo animado - se extiende hacia arriba para fusionarse */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 150% 200% at 50% 120%, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 35%, rgba(34, 197, 94, 0.15) 50%, transparent 75%)',
            animation: 'pulseGlow 4s ease-in-out infinite',
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
            {/* Efecto de brillo detrás del título */}
            <div 
              className="absolute inset-0 blur-2xl -z-10"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.5) 0%, rgba(34, 197, 94, 0.2) 100%)',
                animation: 'glowPulse 3s ease-in-out infinite',
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
              {/* Overlay animado para efecto de pulso coherente con el fondo */}
              <div 
                className="absolute inset-0 rounded-xl backdrop-blur-sm"
                style={{
                  background: 'rgba(34, 197, 94, 0.03)',
                  animation: 'containerPulse 4s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              />
              <p 
                className="text-sm sm:text-base md:text-lg font-medium whitespace-nowrap overflow-hidden text-ellipsis relative z-10"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: '#e5f9e5',
                  textShadow: '0 2px 10px rgba(34, 197, 94, 0.3)',
                }}
              >
                Un 2026 lleno de éxito y crecimiento para tu negocio. <span className="inline-block animate-bounce" style={{ animationDuration: '2s' }}>🚀</span>
              </p>
            </div>
          </div>
        </div>

        {/* Estilos de animación */}
        <style>{`
          @keyframes sparkle {
            0%, 100% {
              opacity: 0;
              transform: scale(0);
            }
            50% {
              opacity: 1;
              transform: scale(1.5);
            }
          }
          @keyframes pulseGlow {
            0%, 100% {
              opacity: 0.25;
              transform: scale(1);
            }
            50% {
              opacity: 0.4;
              transform: scale(1.05);
            }
          }
          @keyframes gradientShift {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
          @keyframes glowPulse {
            0%, 100% {
              opacity: 0.5;
              transform: scale(0.95);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.05);
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes containerPulse {
            0%, 100% {
              opacity: 0.2;
            }
            50% {
              opacity: 0.4;
            }
          }
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-20px) translateY(-50%);
            }
            to {
              opacity: 1;
              transform: translateX(0) translateY(-50%);
            }
          }
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(20px) translateY(-50%);
            }
            to {
              opacity: 1;
              transform: translateX(0) translateY(-50%);
            }
          }
          @keyframes panelGlow {
            0%, 100% {
              opacity: 0.25;
            }
            50% {
              opacity: 0.4;
            }
          }
          @keyframes panelGlowSubtle {
            0%, 100% {
              opacity: 0.22;
            }
            50% {
              opacity: 0.28;
            }
          }
        `}</style>
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
              }}
            />
          ))}
        </div>

        {/* Efecto de brillo animado - continúa el efecto de la sección INICIO */}
        <div 
          className="absolute inset-0 opacity-25"
          style={{
            background: 'radial-gradient(ellipse 150% 200% at 50% 120%, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 35%, rgba(34, 197, 94, 0.15) 50%, transparent 75%)',
            animation: 'panelGlowSubtle 5s ease-in-out infinite',
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
    </div>
  );
}  