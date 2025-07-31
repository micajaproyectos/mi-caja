import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Home() {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'ventas',
      icon: '🤝',
      label: 'Registro de Venta',
      route: '/ventas'
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
      id: 'inventario',
      icon: '📦',
      label: 'Inventario',
      route: '/inventario'
    },
    {
      id: 'proveedores',
      icon: '🚚',
      label: 'Proveedor',
      route: '/proveedores'
    },
    {
      id: 'stock',
      icon: '✅',
      label: 'Stock',
      route: '/stock'
    }
  ];

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
            <h1 className="text-xl font-bold text-gray-100 drop-shadow-sm">Sistema de Gestión</h1>
            <p className="text-sm text-gray-300">Control y administración de ventas e inventario</p>
          </div>
        </div>
      </div>

      {/* Barra de navegación superior - Sticky */}
      <nav className="sticky top-0 z-50 px-6 py-3" style={{ backgroundColor: '#0a1e0a' }}>
        <div className="flex flex-wrap gap-8 text-white text-xs font-medium">
          <a href="/" className="flex items-center gap-2 hover:text-green-300 transition-colors duration-200 relative group">
            <span>🏠</span>
            <span>Inicio</span>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-300 transition-all duration-300 group-hover:w-full"></div>
          </a>
          <a href="/ventas" className="flex items-center gap-2 hover:text-green-300 transition-colors duration-200 relative group">
            <span>🤝</span>
            <span>Ventas</span>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-300 transition-all duration-300 group-hover:w-full"></div>
          </a>
          <a href="/asistencia" className="flex items-center gap-2 hover:text-green-300 transition-colors duration-200 relative group">
            <span>📋</span>
            <span>Asistencia</span>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-300 transition-all duration-300 group-hover:w-full"></div>
          </a>
          <a href="/gastos" className="flex items-center gap-2 hover:text-green-300 transition-colors duration-200 relative group">
            <span>💰</span>
            <span>Gastos</span>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-300 transition-all duration-300 group-hover:w-full"></div>
          </a>
          <a href="/inventario" className="flex items-center gap-2 hover:text-green-300 transition-colors duration-200 relative group">
            <span>📦</span>
            <span>Inventario</span>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-300 transition-all duration-300 group-hover:w-full"></div>
          </a>
          <a href="/stock" className="flex items-center gap-2 hover:text-green-300 transition-colors duration-200 relative group">
            <span>✅</span>
            <span>Stock</span>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-300 transition-all duration-300 group-hover:w-full"></div>
          </a>
          <a href="/proveedores" className="flex items-center gap-2 hover:text-green-300 transition-colors duration-200 relative group">
            <span>🚚</span>
            <span>Proveedores</span>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-300 transition-all duration-300 group-hover:w-full"></div>
          </a>
        </div>
      </nav>

      {/* Título principal centrado */}
      <div className="relative z-10 flex items-center justify-center" style={{ height: '35vh' }}>
        <div className="text-center animate-fade-in">
          <h1 className="text-6xl font-bold text-white text-center drop-shadow-lg mb-4 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Inicio
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto animate-fade-in-delayed italic" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Bienvenido a Mi Caja - Tu negocio en un solo lugar
          </p>
        </div>
      </div>

      {/* Panel inferior con iconos - Neumorfismo */}
      <div className="relative z-10 py-12" style={{ backgroundColor: '#1f4a1f' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.route)}
                className="group relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 transform hover:scale-105"
                style={{
                  backgroundColor: '#1f4a1f',
                  borderRadius: '1rem',
                  boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-8px) scale(1.05)';
                  e.target.style.boxShadow = '12px 12px 24px rgba(0, 0, 0, 0.4), -12px -12px 24px rgba(255, 255, 255, 0.08)';
                  e.target.style.backgroundColor = '#2d5a27';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)';
                  e.target.style.backgroundColor = '#1f4a1f';
                }}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                  {item.icon}
                </div>
                <span className="text-white text-sm font-medium text-center drop-shadow-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {item.label}
                </span>
                
                {/* Efecto de brillo en hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 