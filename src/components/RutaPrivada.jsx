import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { sessionManager } from '../lib/sessionManager.js';

function RutaPrivada({ children }) {
  const [auth, setAuth] = useState({ loading: true, user: null });
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (alive) setAuth({ loading: false, user: session?.user || null });
      } catch (error) {
        console.error('Error al obtener sesión inicial:', error);
        if (alive) setAuth({ loading: false, user: null });
      }
    })();

    const unsubscribe = sessionManager.subscribe((event, session) => {
      setAuth({ loading: false, user: session?.user || null });
    });

    return () => { alive = false; unsubscribe(); };
  }, []);

  // Redirigir si no hay usuario y no está cargando
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      navigate('/login', { replace: true });
    }
  }, [auth.loading, auth.user, navigate]);

  // Mostrar loading mientras verifica la autenticación
  if (auth.loading) {
    return (
      <div className="min-h-screen flex justify-center items-center" style={{ backgroundColor: '#1a3d1a' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, no renderizar nada (la redirección ya se ejecutó)
  if (!auth.user) {
    return null;
  }

  // Si está autenticado, renderizar el contenido
  return children;
}

export default RutaPrivada; 