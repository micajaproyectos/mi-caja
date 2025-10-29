import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';

const SeguimientoBloqueado = ({ onClaveValidada }) => {
  const navigate = useNavigate();
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);

  const validarClave = async () => {
    if (!clave.trim()) {
      setError('Por favor ingresa tu clave interna');
      return;
    }

    setVerificando(true);
    setError('');

    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        setError('Usuario no autenticado');
        return;
      }

      // Obtener la clave del usuario desde la base de datos
      const { data: usuarioData, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('clave_interna')
        .eq('usuario_id', usuarioId)
        .single();

      if (errorUsuario || !usuarioData) {
        setError('Error al verificar usuario');
        return;
      }

      if (!usuarioData.clave_interna) {
        setError('No tienes una clave interna configurada');
        return;
      }

      // Verificar si la clave es correcta
      if (usuarioData.clave_interna !== clave) {
        setError('Clave incorrecta');
        return;
      }

      // Notificar que la clave fue validada correctamente
      // NO guardar en sessionStorage - la validación solo existe en memoria del componente
      onClaveValidada();
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Error validando clave:', e);
      }
      setError('Error inesperado al validar la clave');
    } finally {
      setVerificando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      validarClave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20" style={{ backgroundColor: '#1a3d1a' }} onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-3xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-gray-300 text-lg">
            Para proteger tus datos sensibles, ingresa tu clave interna
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-white font-medium mb-2">
            Clave Interna
          </label>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="Ingresa tu clave interna..."
            autoFocus
          />
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={validarClave}
            disabled={verificando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {verificando ? 'Verificando...' : '🔓 Desbloquear Acceso'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            <span>Ir a Inicio</span>
          </button>
        </div>

        <p className="text-center text-gray-400 text-xs mt-4">
          Esta clave protege tu información sensible
        </p>
      </div>
    </div>
  );
};

export default SeguimientoBloqueado;

