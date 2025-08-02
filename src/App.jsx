import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import RegistroVenta from './components/RegistroVenta';
import RegistroInventario from './components/RegistroInventario';
import Stock from './components/Stock';
import RegistroAsistencia from './components/RegistroAsistencia';
import FormularioGastos from './components/FormularioGastos';
import Footer from './components/Footer';

// Componentes placeholder para las otras secciones

const Inventario = () => {
  return <RegistroInventario />;
};

const StockComponent = () => {
  return <Stock />;
};

const Proveedores = () => {
  const navigate = useNavigate();
  
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
        <div className="max-w-6xl mx-auto">
          {/* Botón de regreso */}
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
          
          <h1 className="text-2xl md:text-4xl font-bold text-white text-center drop-shadow-lg mb-6 md:mb-8 animate-slide-up" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            🚚 Gestión de Proveedores
          </h1>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-8 border border-white/20">
            <p className="text-gray-200 text-center py-6 md:py-8 text-base md:text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Sistema de gestión de proveedores en desarrollo...
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ventas" element={<RegistroVenta />} />
      <Route path="/asistencia" element={<RegistroAsistencia />} />
      <Route path="/gastos" element={<FormularioGastos />} />
      <Route path="/inventario" element={<Inventario />} />
      <Route path="/stock" element={<StockComponent />} />
      <Route path="/proveedores" element={<Proveedores />} />
    </Routes>
  );
}

export default App;