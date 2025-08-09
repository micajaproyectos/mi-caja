import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { authService } from '../lib/authService.js';
import { sessionManager } from '../lib/sessionManager.js';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#1a3d1a' }}>
      {/* Fondo degradado moderno - igual que Home */}
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
      <div className="relative z-10 flex justify-center items-center h-screen">
        <div 
          className="p-8 rounded-2xl w-96 transition-all duration-200 transform hover:scale-105"
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
            <p className="text-gray-300 italic">Bienvenido a Mi Caja</p>
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
        </div>
      </div>
    </div>
  );
}

export default Login; 