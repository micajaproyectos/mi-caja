import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/authService.js';

function RutaPrivada({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verificarAutenticacion = async () => {
      try {
        const isAuth = await authService.isAuthenticated();
        
        if (!isAuth) {
          // No hay usuario autenticado, redirigir a login
          navigate('/login');
          return;
        }
        
        // Usuario autenticado, permitir acceso
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        navigate('/login');
      }
    };

    verificarAutenticacion();
  }, [navigate]);

  // Mostrar loading mientras verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center" style={{ backgroundColor: '#1a3d1a' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si está autenticado, renderizar el contenido
  if (isAuthenticated) {
    return children;
  }

  // No debería llegar aquí, pero por seguridad
  return null;
}

export default RutaPrivada; 