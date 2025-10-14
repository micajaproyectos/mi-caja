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
    // Cuarta fila: Clientes, Seguimiento, Auditoría, Comunidad Mi Caja
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

      {/* Header con logo - Glassmorphism */}
      <div className="relative z-10 p-6">
        <div className="flex items-center">
          {/* Logo con sombra suave */}
          <div className="w-16 h-16 mr-4 drop-shadow-lg">
            <img 
              src={logo} 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          
          {/* Título genérico con glassmorphism */}
          <div className="text-white">
            <h1 className="text-xl font-bold text-gray-100 drop-shadow-sm">Bienvenido a Mi Caja</h1>
            {nombreUsuario ? (
              <p className="text-sm text-gray-300 italic">Hola, {nombreUsuario} - Tu negocio en un solo lugar</p>
            ) : (
              <p className="text-sm text-gray-300 italic">Cargando...</p>
            )}
            <p className="text-sm text-gray-300 italic">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Título principal centrado */}
      <div className="relative z-10 flex items-center justify-center" style={{ height: '25vh' }}>
        <div className="text-center animate-fade-in">
          <h1 className="text-6xl font-bold text-white text-center drop-shadow-lg mb-4 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Inicio
          </h1>
          {/* Instagram con texto descriptivo */}
          <a 
            href="https://instagram.com/micajaempresa" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-3 text-gray-300 hover:text-pink-300 transition-all duration-300 animate-fade-in-delayed max-w-2xl mx-auto"
            title="Síguenos en Instagram"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-1.5 group-hover:scale-110 transition-transform duration-300">
              <svg 
                className="w-full h-full text-white" 
                fill="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  fillRule="evenodd" 
                  d="M12.017 0C8.396 0 7.929.013 6.71.066 5.493.119 4.677.278 3.982.598c-.719.275-1.253.635-1.759 1.141C1.717 2.245 1.357 2.779 1.082 3.498c-.32.695-.479 1.511-.532 2.728C.013 7.445 0 7.912 0 11.533s.013 4.088.066 5.307c.053 1.217.212 2.033.532 2.728.275.719.635 1.253 1.141 1.759.506.506 1.04.866 1.759 1.141.695.32 1.511.479 2.728.532C7.445 23.987 7.912 24 11.533 24s4.088-.013 5.307-.066c1.217-.053 2.033-.212 2.728-.532.719-.275 1.253-.635 1.759-1.141.506-.506.866-1.04 1.141-1.759.32-.695.479-1.511.532-2.728.053-1.219.066-1.686.066-5.307s-.013-4.088-.066-5.307c-.053-1.217-.212-2.033-.532-2.728a4.902 4.902 0 00-1.141-1.759A4.902 4.902 0 0019.562.598c-.695-.32-1.511-.479-2.728-.532C15.615.013 15.148 0 11.527 0h.49zm-.964 2.168c3.572 0 3.993.014 5.402.066 1.304.059 2.012.274 2.482.456.624.243 1.07.533 1.539 1.002.469.469.759.915 1.002 1.539.182.47.397 1.178.456 2.482.052 1.409.066 1.83.066 5.402s-.014 3.993-.066 5.402c-.059 1.304-.274 2.012-.456 2.482a4.147 4.147 0 01-1.002 1.539 4.147 4.147 0 01-1.539 1.002c-.47.182-1.178.397-2.482.456-1.409.052-1.83.066-5.402.066s-3.993-.014-5.402-.066c-1.304-.059-2.012-.274-2.482-.456a4.147 4.147 0 01-1.539-1.002 4.147 4.147 0 01-1.002-1.539c-.182-.47-.397-1.178-.456-2.482-.052-1.409-.066-1.83-.066-5.402s.014-3.993.066-5.402c.059-1.304.274-2.012.456-2.482a4.147 4.147 0 011.002-1.539A4.147 4.147 0 016.562 2.624c.47-.182 1.178-.397 2.482-.456 1.409-.052 1.83-.066 5.402-.066l.571-.004zm0 3.27a6.533 6.533 0 100 13.065 6.533 6.533 0 000-13.065zM12 16a4 4 0 110-8 4 4 0 010 8zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.441 1.441 0 012.88 0z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium group-hover:underline" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

                Síguenos en Instagram como <span className="text-pink-400 font-semibold">@micajaempresa</span>
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Panel inferior con iconos - Neumorfismo */}
      <div className="relative z-10 py-12" style={{ backgroundColor: '#1f4a1f' }}>
        <div className="max-w-6xl mx-auto px-6">
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