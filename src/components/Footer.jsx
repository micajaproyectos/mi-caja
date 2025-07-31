import logoam from '../assets/logoam.png';

export default function Footer() {
  return (
    <footer className="relative bg-gray-900 text-gray-300 py-6 mt-2 overflow-hidden">
      {/* Fondo degradado para el footer */}
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

      {/* Efecto de vidrio esmerilado para el footer */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>

      {/* Contenido del footer */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 text-center">
        {/* Logo */}
        <div className="mb-4">
          <img 
            src={logoam} 
            alt="AM Consultora Logo" 
            className="mx-auto w-32 h-auto md:w-36 drop-shadow-lg"
          />
        </div>
        
        {/* Texto */}
        <div className="space-y-2">
          <p className="text-sm md:text-base drop-shadow-sm">
            ¿Buscas soluciones tecnológicas para tu negocio?
          </p>
          <p className="text-sm md:text-base drop-shadow-sm">
            Visítanos en{' '}
            <a 
              href="https://amconsultora.cl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline transition-colors duration-200 hover:text-blue-300"
            >
              amconsultora.cl
            </a>
            {' '}o escríbenos a{' '}
            <a 
              href="mailto:contacto@amconsultora.cl"
              className="text-blue-400 hover:underline transition-colors duration-200 hover:text-blue-300"
            >
              contacto@amconsultora.cl
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
} 