import { supabase } from './supabaseClient.js';

export const authService = {
  // Iniciar sesión con correo y contraseña usando Supabase Auth
  async signIn(email, password) {
    try {
      console.log('Iniciando sesión con:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('Error al iniciar sesión:', error);
        throw error;
      }

      if (data.user) {
        // Obtener información adicional del usuario desde la tabla usuarios
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('usuario_id, nombre, rol, cliente_id')
          .eq('usuario_id', data.user.id)
          .single();

        if (userError) {
          console.error('Error al obtener datos del usuario:', userError);
          throw userError;
        }

        if (userData) {
          const userInfo = {
            id: userData.usuario_id,
            nombre: userData.nombre,
            rol: userData.rol,
            cliente_id: userData.cliente_id,
            email: data.user.email
          };

          // Guardar datos en localStorage para compatibilidad
          this.saveUserData(userInfo);
          return userInfo;
        }
      }

      return null;
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    }
  },

  // Registrar nuevo usuario
  async signUp(email, password, nombre, rol = 'usuario') {
    try {
      console.log('Registrando usuario:', email, nombre);
      
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
      });

      if (error) {
        console.error('Error al registrar usuario:', error);
        throw error;
      }

      if (data.user) {
        // Crear registro en la tabla usuarios
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert([{
            usuario_id: data.user.id,
            nombre: nombre,
            rol: rol,
            cliente_id: data.user.id // Usar el mismo ID como cliente_id por ahora
          }]);

        if (insertError) {
          console.error('Error al insertar en tabla usuarios:', insertError);
          throw insertError;
        }

        return {
          id: data.user.id,
          nombre: nombre,
          rol: rol,
          email: data.user.email
        };
      }

      return null;
    } catch (error) {
      console.error('Error en signUp:', error);
      throw error;
    }
  },

  // Cerrar sesión
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error al cerrar sesión:', error);
        throw error;
      }
      
      // Limpiar datos locales
      this.clearUserData();
    } catch (error) {
      console.error('Error en signOut:', error);
      throw error;
    }
  },

  // Obtener usuario actual desde Supabase Auth
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      // Obtener información adicional desde la tabla usuarios
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('usuario_id, nombre, rol, cliente_id')
        .eq('usuario_id', user.id)
        .single();

      if (userError || !userData) {
        return null;
      }

      return {
        id: userData.usuario_id,
        nombre: userData.nombre,
        rol: userData.rol,
        cliente_id: userData.cliente_id,
        email: user.email
      };
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  },

  // Verificar si el usuario está autenticado
  async isAuthenticated() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      return false;
    }
  },

  // Obtener el usuario_id actual para usar en las operaciones de ventas
  async getCurrentUserId() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user ? user.id : null;
    } catch (error) {
      console.error('Error al obtener usuario_id:', error);
      return null;
    }
  },

  // Guardar datos del usuario en localStorage (para compatibilidad)
  saveUserData(userData) {
    localStorage.setItem('usuario_data', JSON.stringify(userData));
    localStorage.setItem('nombre_usuario', userData.nombre);
    localStorage.setItem('usuario_id', userData.id);
  },

  // Limpiar datos del usuario
  clearUserData() {
    localStorage.removeItem('usuario_data');
    localStorage.removeItem('nombre_usuario');
    localStorage.removeItem('usuario_id');
  },

  // Función de compatibilidad para el login anterior (mantener temporalmente)
  async validateUser(nombreUsuario) {
    console.warn('validateUser está deprecado. Usar signIn con email y password.');
    return null;
  }
}; 