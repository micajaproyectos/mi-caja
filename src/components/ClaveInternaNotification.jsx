import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../lib/authService.js';

const ClaveInternaNotification = ({ isOpen, onClose, onSave }) => {
  const [claveIngresada, setClaveIngresada] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [actualizandoClave, setActualizandoClave] = useState(false);
  const [claveActual, setClaveActual] = useState('');

  // Verificar si el usuario ya tiene una clave configurada
  const verificarClaveExistente = async () => {
    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) return false;

      const { data, error } = await supabase
        .from('usuarios')
        .select('clave_interna')
        .eq('usuario_id', usuarioId)
        .single();

      if (error || !data) return false;
      return !!data.clave_interna;
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Error verificando clave:', e);
      }
      return false;
    }
  };

  const [tieneClave, setTieneClave] = useState(false);

  React.useEffect(() => {
    verificarClaveExistente().then(setTieneClave);
  }, []);

  const guardarClave = async () => {
    if (!claveIngresada.trim()) {
      setError('La clave no puede estar vacía');
      return;
    }

    if (claveIngresada.length < 4) {
      setError('La clave debe tener al menos 4 caracteres');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        setError('Usuario no autenticado');
        return;
      }

      const { error } = await supabase
        .from('usuarios')
        .update({ clave_interna: claveIngresada })
        .eq('usuario_id', usuarioId);

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error guardando clave:', error);
        }
        setError('Error al guardar la clave');
        return;
      }

      alert('✅ Clave interna configurada exitosamente');
      onSave();
      onClose();
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Error:', e);
      }
      setError('Error inesperado al guardar la clave');
    } finally {
      setGuardando(false);
    }
  };

  const actualizarClave = async () => {
    if (!claveActual.trim()) {
      setError('Ingresa tu clave actual');
      return;
    }

    if (!claveIngresada.trim()) {
      setError('La nueva clave no puede estar vacía');
      return;
    }

    if (claveIngresada.length < 4) {
      setError('La clave debe tener al menos 4 caracteres');
      return;
    }

    setActualizandoClave(true);
    setError('');

    try {
      const usuarioId = await authService.getCurrentUserId();
      if (!usuarioId) {
        setError('Usuario no autenticado');
        return;
      }

      // Verificar clave actual
      const { data: usuarioData, error: errorVerificacion } = await supabase
        .from('usuarios')
        .select('clave_interna')
        .eq('usuario_id', usuarioId)
        .single();

      if (errorVerificacion || !usuarioData) {
        setError('Error al verificar usuario');
        return;
      }

      if (usuarioData.clave_interna !== claveActual) {
        setError('La clave actual es incorrecta');
        return;
      }

      // Actualizar clave
      const { error } = await supabase
        .from('usuarios')
        .update({ clave_interna: claveIngresada })
        .eq('usuario_id', usuarioId);

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error actualizando clave:', error);
        }
        setError('Error al actualizar la clave');
        return;
      }
      
      alert('✅ Clave interna actualizada exitosamente');
      onSave();
      onClose();
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Error:', e);
      }
      setError('Error inesperado al actualizar la clave');
    } finally {
      setActualizandoClave(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl shadow-2xl max-w-md w-full p-6" style={{ backgroundColor: '#1a3d1a', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">🔒 Clave Interna</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        <p className="text-gray-300 mb-6">
          Configura una clave interna para proteger los datos sensibles de tu negocio. 
          Solo tú podrás acceder a ellos con esta clave.
        </p>

        {!tieneClave ? (
          <>
            <div className="mb-4">
              <label className="block text-white font-medium mb-2">
                Nueva Clave
              </label>
              <input
                type="password"
                value={claveIngresada}
                onChange={(e) => setClaveIngresada(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Ingresa tu clave (mínimo 4 caracteres)"
              />
            </div>

            {error && (
              <div className="mb-4 text-red-400 text-sm">{error}</div>
            )}

            <button
              onClick={guardarClave}
              disabled={guardando}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {guardando ? 'Guardando...' : '✅ Guardar Clave'}
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-white font-medium mb-2">
                Clave Actual
              </label>
              <input
                type="password"
                value={claveActual}
                onChange={(e) => setClaveActual(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Ingresa tu clave actual"
              />
            </div>

            <div className="mb-4">
              <label className="block text-white font-medium mb-2">
                Nueva Clave
              </label>
              <input
                type="password"
                value={claveIngresada}
                onChange={(e) => setClaveIngresada(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Nueva clave (mínimo 4 caracteres)"
              />
            </div>

            {error && (
              <div className="mb-4 text-red-400 text-sm">{error}</div>
            )}

            <button
              onClick={actualizarClave}
              disabled={actualizandoClave}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {actualizandoClave ? 'Actualizando...' : '🔄 Actualizar Clave'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ClaveInternaNotification;

