import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { authService } from '../lib/authService.js';
import { sessionManager } from '../lib/sessionManager.js';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const navigate = useNavigate();

  // Función para reproducir sonido de alerta cuando se inicia sesión
  const playLoginSound = () => {
    try {
      // Verificar si los sonidos están habilitados
      const soundsPref = localStorage.getItem('soundsEnabled');
      if (soundsPref === 'false') return;
      
      const audio = new Audio('/sounds/aleta-micaja.wav');
      audio.volume = 0.7; // 70% de volumen
      audio.play().catch(error => {
        // Si falla, ignorar silenciosamente (no afectar el flujo de login)
        if (import.meta.env.DEV) {
          console.warn('No se pudo reproducir el sonido de login:', error);
        }
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Error al reproducir sonido de login:', error);
      }
    }
  };

  // Verificar si ya existe un usuario logueado
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (email.trim() && password.trim()) {
      try {
        const userData = await authService.signIn(email.trim(), password);
        
        if (userData) {
          // Usuario autenticado correctamente
          console.log('✅ Login exitoso, marcando datos para recargar...');
          
          // Reproducir sonido de alerta
          playLoginSound();
          
          // Marcar que los datos necesitan ser recargados en todos los componentes
          sessionManager.invalidateUserData(userData.id);
          
          // Pequeña pausa para que se complete la configuración de la sesión
          setTimeout(() => {
            navigate('/');
          }, 100);
        } else {
          setError('Credenciales inválidas. Verifica tu correo y contraseña.');
        }
      } catch (error) {
        console.error('Error en login:', error);
        if (error.message.includes('Invalid login credentials')) {
          setError('Correo o contraseña incorrectos.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Por favor confirma tu correo electrónico antes de iniciar sesión.');
        } else {
          setError('Error al iniciar sesión. Intenta de nuevo.');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('Por favor ingresa tu correo y contraseña');
      setIsLoading(false);
    }
  };

  // Generar partículas estáticas para el login solo una vez
  const loginParticles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      opacity: 0.5 + Math.random() * 0.4, // Aumentada para mayor visibilidad
      size: 1.5 + Math.random() * 0.5, // Tamaño variable
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

      {/* Efecto de partículas de fondo estáticas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {loginParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: `rgba(34, 197, 94, ${particle.opacity})`,
              left: particle.left,
              top: particle.top,
              boxShadow: `0 0 ${particle.size * 2}px rgba(34, 197, 94, ${particle.opacity * 0.6})`,
            }}
          />
        ))}
      </div>

      {/* Efecto de brillo estático */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse 150% 200% at 50% 50%, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 35%, rgba(34, 197, 94, 0.15) 50%, transparent 75%)',
        }}
      />

      {/* Efecto de vidrio esmerilado adicional */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/5"></div>

      {/* Contenido principal */}
      <div className="relative z-10 flex justify-center items-center h-screen px-4 py-8">
        <div 
          className="p-6 md:p-8 rounded-2xl w-full max-w-sm md:max-w-md lg:max-w-lg transition-all duration-200 transform hover:scale-105"
          style={{
            backgroundColor: 'rgba(31, 74, 31, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '1rem',
            boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="text-center mb-8">
            {/* Logo en círculo con fondo transparente */}
            <div className="mx-auto mb-6 w-24 h-24 rounded-full flex items-center justify-center"
                 style={{
                   backgroundColor: 'rgba(255, 255, 255, 0.1)',
                   backdropFilter: 'blur(5px)',
                   border: '2px solid rgba(255, 255, 255, 0.2)',
                   boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                 }}>
              <img 
                src={logo} 
                alt="Mi Caja Logo" 
                className="w-16 h-16 object-contain drop-shadow-lg"
              />
            </div>
            
            <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Iniciar Sesión
            </h2>
            <p className="text-gray-300 italic mb-4">Bienvenido a Mi Caja</p>
            
            {/* Botón Activa tu cuenta */}
            <a
              href="https://wa.me/56985660954?text=Hola%2C%20quiero%20activar%20una%20cuenta%20de%20Mi%20Caja"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 font-medium text-center"
              style={{
                backgroundColor: '#25d366',
                color: 'white',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textDecoration: 'none'
              }}
            >
              Activa tu cuenta
            </a>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-3 drop-shadow-sm">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-transparent"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(5px)'
                }}
                placeholder="tu@correo.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-3 drop-shadow-sm">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-transparent"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(5px)'
                }}
                placeholder="Tu contraseña"
                required
                disabled={isLoading}
              />
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#4ade80',
                color: 'white',
                boxShadow: '0 4px 14px rgba(74, 222, 128, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Derechos Reservados y Términos */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-gray-300 text-xs font-medium drop-shadow-sm">
              Todos Los Derechos Reservados ®
            </p>
            <p className="text-gray-400 text-xs drop-shadow-sm">
              Al iniciar sesión con Mi Caja, acepta los{' '}
              <button
                onClick={() => setMostrarTerminos(true)}
                className="text-green-400 hover:text-green-300 underline transition-colors duration-200 font-medium"
              >
                Términos y Condiciones
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Términos y Condiciones */}
      {mostrarTerminos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div 
            className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            style={{
              backgroundColor: 'rgba(31, 74, 31, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(74, 222, 128, 0.1)'
            }}
          >
            {/* Header del Modal */}
            <div 
              className="border-b p-4 flex justify-between items-center"
              style={{
                backgroundColor: 'rgba(74, 222, 128, 0.15)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h2 className="text-xl font-bold text-white drop-shadow-lg">
                Términos y Condiciones
              </h2>
              <button
                onClick={() => setMostrarTerminos(false)}
                className="text-gray-300 hover:text-white transition-colors duration-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <div 
              className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]"
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
                  Al iniciar sesión, el titular de la cuenta declara conocer y aceptar los siguientes términos:
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
                    Al iniciar sesión en Mi Caja, el titular confirma que ha leído, entendido y aceptado estos términos y condiciones.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div 
              className="border-t p-4 flex justify-end"
              style={{
                backgroundColor: 'rgba(26, 61, 26, 0.6)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <button
                onClick={() => setMostrarTerminos(false)}
                className="px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 font-medium"
                style={{
                  backgroundColor: '#4ade80',
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(74, 222, 128, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Login; 