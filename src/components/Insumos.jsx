import { useNavigate } from 'react-router-dom';
import Footer from './Footer';

function Insumos() {
  const navigate = useNavigate();

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

          {/* Contenido principal */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🚧</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Sección en Construcción
              </h2>
              <p className="text-gray-300 text-lg">
                Esta sección estará disponible próximamente.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Insumos;

