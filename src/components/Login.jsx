import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import logoNavbar from '../assets/logo_nvbar.png';
import logoFooter from '../assets/footer.png';
import { authService } from '../lib/authService.js';
import { sessionManager } from '../lib/sessionManager.js';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreTitular, setNombreTitular] = useState('');
  const [correoContacto, setCorreoContacto] = useState('');
  const [fonoContacto, setFonoContacto] = useState('');
  const [mensajeContacto, setMensajeContacto] = useState('');
  const [enviandoContacto, setEnviandoContacto] = useState(false);
  const [contactoEnviado, setContactoEnviado] = useState(false);
  const [botAbierto, setBotAbierto] = useState(false);
  const [preguntaActiva, setPreguntaActiva] = useState(null);
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

  const GOOGLE_SCRIPT_URL = 'https://script.google.com/a/macros/amconsultora.cl/s/AKfycbwckE9Xid5KEeYv-ni971F5PusOhsVB1luK6TH_92Gm68UpptLhW3Qf7ZuQ-LMb_sCC/exec';

  const handleContactoSubmit = async (e) => {
    e.preventDefault();
    setEnviandoContacto(true);
    try {
      const formData = new URLSearchParams();
      formData.append('nombre_titular', nombreTitular);
      formData.append('correo_electronico', correoContacto);
      formData.append('fono_contacto', fonoContacto);
      formData.append('mensaje', mensajeContacto);

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      });
      setContactoEnviado(true);
    } catch {
      setContactoEnviado(true);
    } finally {
      setEnviandoContacto(false);
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

      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-30"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex-shrink-0">
              <img src={logoNavbar} alt="Mi Caja" className="h-8 object-contain" />
            </div>

            {/* Links desktop */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Qué hace Mi Caja', href: '#que-hace' },
                { label: 'Clientes',          href: '#clientes' },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: '#16a34a' }}
                  onMouseEnter={e => e.target.style.color = '#15803d'}
                  onMouseLeave={e => e.target.style.color = '#16a34a'}
                >
                  {label}
                </a>
              ))}
            </div>

            {/* Botón + hamburguesa */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMostrarLogin(true)}
                className="px-5 py-2 rounded-lg font-bold text-white text-sm transition-all duration-200 transform hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: '#16a34a',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                }}
              >
                Cliente Mi Caja
              </button>

              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="md:hidden transition-colors duration-200 p-1"
                style={{ color: '#16a34a' }}
                aria-label="Abrir menú"
              >
                {menuAbierto ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Menú mobile desplegable */}
        {menuAbierto && (
          <div
            className="md:hidden px-4 pt-2 pb-4 flex flex-col gap-1"
            style={{
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e5e7eb'
            }}
          >
            {[
              { label: 'Qué hace Mi Caja', href: '#que-hace' },
              { label: 'Clientes',          href: '#clientes' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuAbierto(false)}
                className="text-sm font-medium py-3 border-b transition-colors duration-200"
                style={{ color: '#16a34a', borderColor: '#f3f4f6' }}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </nav>

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

      {/* Hero Section */}
      <section id="hero" className="relative z-10 min-h-screen flex items-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Columna izquierda — texto */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold"
                style={{
                  backgroundColor: 'rgba(74, 222, 128, 0.12)',
                  border: '1px solid rgba(74, 222, 128, 0.5)',
                  color: '#16a34a'
                }}
              >
                ⚡ 7 días gratis · Sin tarjeta de crédito
              </div>

              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
                Deja de perder ventas<br />
                por desorden.{' '}
                <span style={{ color: '#16a34a' }}><br /> Ordena tu negocio hoy.</span>
              </h1>

              <p className="text-lg text-gray-500 mb-8 max-w-lg">
                Ventas, stock, insumos, pedidos, comandas en un solo lugar. Simple, rápido y sin complicaciones.
              </p>

              <a
                href="https://wa.me/56985660954?text=Hola%2C%20quiero%20probar%20Mi%20Caja%20gratis%207%20d%C3%ADas"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all duration-200 transform hover:scale-105 active:scale-95 mb-10"
                style={{
                  backgroundColor: '#f97316',
                  boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)',
                  textDecoration: 'none'
                }}
              >
                👉 Empieza gratis 7 días
              </a>

              {/* Social proof */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[
                    { inicial: 'R', color: '#4ade80' },
                    { inicial: 'A', color: '#22c55e' },
                    { inicial: 'T', color: '#16a34a' },
                    { inicial: 'M', color: '#15803d' },
                    { inicial: 'C', color: '#166534' },
                  ].map(({ inicial, color }) => (
                    <div
                      key={inicial}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: color }}
                    >
                      {inicial}
                    </div>
                  ))}
                </div>
                <p className="text-gray-500 text-sm">
                  <span className="font-semibold text-gray-800">+50 negocios</span> como el tuyo ya lo están usando
                </p>
              </div>
            </div>

            {/* Columna derecha — formulario de contacto */}
            <div>
              <div
                className="rounded-2xl p-8"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)'
                }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-1">¿Te interesa Mi Caja?</h2>
                <p className="text-gray-500 text-sm mb-6">Déjanos tus datos y te contactamos a la brevedad.</p>

                {contactoEnviado ? (
                  <div className="py-10 text-center">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="text-gray-800 font-semibold text-lg">¡Mensaje recibido!</p>
                    <p className="text-gray-500 text-sm mt-1">Te contactaremos a la brevedad.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactoSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre titular</label>
                      <input
                        type="text"
                        value={nombreTitular}
                        onChange={(e) => setNombreTitular(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                        style={{ border: '1px solid #e5e7eb' }}
                        placeholder="Juan Pérez"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                      <input
                        type="email"
                        value={correoContacto}
                        onChange={(e) => setCorreoContacto(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                        style={{ border: '1px solid #e5e7eb' }}
                        placeholder="tu@correo.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de contacto</label>
                      <input
                        type="tel"
                        value={fonoContacto}
                        onChange={(e) => setFonoContacto(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                        style={{ border: '1px solid #e5e7eb' }}
                        placeholder="+56 9 1234 5678"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                      <textarea
                        value={mensajeContacto}
                        onChange={(e) => setMensajeContacto(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                        style={{ border: '1px solid #e5e7eb' }}
                        placeholder="Hola, quiero usar Mi Caja para mi negocio"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={enviandoContacto}
                      className="w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: '#4ade80',
                        boxShadow: '0 4px 14px rgba(74, 222, 128, 0.4)'
                      }}
                    >
                      {enviandoContacto ? 'Enviando...' : 'Enviar mensaje'}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Qué hace Mi Caja */}
      <section id="que-hace" className="relative z-10 py-20" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Encabezado */}
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(74, 222, 128, 0.12)',
                border: '1px solid rgba(74, 222, 128, 0.4)',
                color: '#16a34a'
              }}
            >
              Todo en un solo sistema
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">
              ¿Qué puedes hacer con <span style={{ color: '#16a34a' }}>Mi Caja</span>?
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Diseñado para negocios reales. Cada módulo resuelve un problema concreto de tu operación diaria.
            </p>
          </div>

          {/* Grid de módulos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '💵',
                nombre: 'Ventas',
                desc: 'Registra cada venta en segundos. Cierre de caja diario sin errores ni papeles.',
              },
              {
                icon: '📦',
                nombre: 'Inventario y Stock',
                desc: 'Stock en tiempo real con alertas de quiebre. Cada movimiento queda registrado.',
              },
              {
                icon: '🍽️',
                nombre: 'Pedidos',
                desc: 'Toma pedidos por mesa, para llevar o delivery. Sin papel, sin confusiones.',
              },
              {
                icon: '🔔',
                nombre: 'Gestión Cocina',
                desc: 'Las comandas llegan a cocina al instante. Sin gritos, sin papelitos perdidos.',
              },
              {
                icon: '🤝',
                nombre: 'Proveedores',
                desc: 'Centraliza tus proveedores y el historial de compras en un solo lugar.',
              },
              {
                icon: '💸',
                nombre: 'Gastos',
                desc: 'Controla cada egreso por categoría. Sabe exactamente a dónde va tu dinero.',
              },
              {
                icon: '⏰',
                nombre: 'Control Asistencia',
                desc: 'Registro de entrada y salida del equipo. Reportes simples para gestionar turnos.',
              },
              {
                icon: '🤖',
                nombre: 'IA para Inventario',
                desc: 'Sube la foto de tu factura y la IA carga tu inventario en menos de 1 minuto.',
              },
            ].map(({ icon, nombre, desc }) => (
              <div
                key={nombre}
                className="rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-1"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 flex-shrink-0"
                  style={{
                    backgroundColor: 'rgba(74, 222, 128, 0.12)',
                    border: '1px solid rgba(74, 222, 128, 0.3)'
                  }}
                >
                  {icon}
                </div>
                <h3 className="text-gray-900 font-bold text-base mb-2">{nombre}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Nuestros Clientes */}
      <section id="clientes" className="relative z-10 py-20" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Encabezado */}
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(74, 222, 128, 0.12)',
                border: '1px solid rgba(74, 222, 128, 0.4)',
                color: '#16a34a'
              }}
            >
              Clientes reales · Negocios reales
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">
              Ellos ya ordenaron su negocio.<br />
              <span style={{ color: '#16a34a' }}>¿Y el tuyo?</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Restaurantes, tiendas, clínicas y más — todos con algo en común: eligieron simplificar.
            </p>
          </div>

          {/* Tarjetas de testimonios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                comentario: 'Facil de utilizar.',
                negocio: 'Panadería Emanuel',
                estrellas: 5,
              },
              {
                comentario: 'Muy recomendado, gracias a mi caja puedo conocer mi inventario en tiempo real, ver mis ventas, que productos tiene.',
                negocio: 'Millanolli',
                estrellas: 5,
              },
              {
                comentario: 'Gracias a mi caja pude ordenar mi negocio de productos.',
                negocio: 'Clínica Beauty Lab',
                estrellas: 5,
              },
              {
                comentario: 'Tengo todo ordenado dentro de mi caja. Muy fácil de usar.',
                negocio: 'Perfumería Sur',
                estrellas: 5,
              },
              {
                comentario: 'Muy fácil de usar, ordené todo mi negocio con mi caja.',
                negocio: 'Tienda Zathia',
                estrellas: 5,
              },
              {
                comentario: 'Muy facil, tengo todo ordenado.',
                negocio: 'Cafetería Real',
                estrellas: 5,
              },
            ].map(({ comentario, negocio, estrellas }) => (
              <div
                key={negocio}
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                }}
              >
                {/* Estrellas */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-5 h-5" fill={i < estrellas ? '#f97316' : '#e5e7eb'} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Comentario */}
                <p className="text-gray-700 text-sm leading-relaxed flex-1">
                  "{comentario}"
                </p>

                {/* Negocio */}
                <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    {negocio.charAt(0)}
                  </div>
                  <span className="text-gray-800 text-sm font-semibold">{negocio}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Modal de Login */}
      {mostrarLogin && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setMostrarLogin(false)}
        >
          <div
            className="p-6 md:p-8 rounded-2xl w-full max-w-sm md:max-w-md lg:max-w-lg relative"
            style={{
              backgroundColor: 'rgba(31, 74, 31, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMostrarLogin(false)}
              className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors duration-200 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 z-10"
            >
              ✕
            </button>

            <div className="text-center mb-8">
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
      )}

      {/* Footer */}
      <footer className="relative z-10 py-12" style={{ backgroundColor: '#1a3d1a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Cuerpo del footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Columna 1 — Marca */}
            <div>
              <img src={logoFooter} alt="Mi Caja" className="h-8 object-contain mb-4" />
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Gestiona ventas, stock y pedidos desde un solo lugar. Simple, rápido y sin complicaciones.
              </p>
            </div>

            {/* Columna 2 — Navegación */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Explora</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Qué hace Mi Caja', href: '#que-hace' },
                  { label: 'Clientes',          href: '#clientes' },
                  { label: 'Empieza gratis',    href: 'https://wa.me/56985660954?text=Hola%2C%20quiero%20probar%20Mi%20Caja%20gratis%207%20d%C3%ADas', external: true },
                ].map(({ label, href, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.6)' }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna 3 — Legal y redes */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Legal y contacto</h4>
              <ul className="space-y-3 mb-6">
                <li>
                  <button
                    onClick={() => setMostrarTerminos(true)}
                    className="text-sm transition-colors duration-200 hover:text-white text-left"
                    style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    Términos y Condiciones
                  </button>
                </li>
                <li>
                  <a
                    href="tel:+56985660954"
                    className="text-sm transition-colors duration-200 hover:text-white flex items-center gap-2"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    <span>📞</span> +56 9 8566 0954
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contacto@amconsultora.cl"
                    className="text-sm transition-colors duration-200 hover:text-white flex items-center gap-2"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    <span>✉️</span> contacto@amconsultora.cl
                  </a>
                </li>
              </ul>

              {/* Redes sociales */}
              <div className="flex items-center gap-3">
                <a
                  href="https://www.instagram.com/micajaempresa/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                  aria-label="Instagram Mi Caja"
                >
                  <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>

          </div>

          {/* Pie de página */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              © {new Date().getFullYear()} Mi Caja. Todos los derechos reservados.
            </p>
            <p className="text-xs">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Creado por </span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>AM</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}> Tecnología</span>
            </p>
          </div>

        </div>

      </footer>

      {/* Bot de respuesta rápida */}
      {(() => {
        const faqs = [
          {
            pregunta: '¿Qué es Mi Caja?',
            respuesta: 'Plataforma digital para gestionar ventas, inventario, pedidos, gastos y más — todo desde un solo lugar, sin papel ni Excel.',
          },
          {
            pregunta: '¿Para qué tipo de negocio sirve?',
            respuesta: 'Restaurantes, tiendas, almacenes, clínicas de belleza, panaderías, perfumerías y cualquier negocio que necesite ordenar su operación diaria.',
          },
          {
            pregunta: '¿Cómo funciona la prueba gratis?',
            respuesta: '7 días completamente gratis, sin tarjeta de crédito. Contáctanos por WhatsApp y te activamos el acceso de inmediato.',
          },
          {
            pregunta: '¿Cuánto cuesta?',
            respuesta: 'Mi Caja cuesta $20.000 pesos chilenos al mes. Incluye todos los módulos sin costo adicional.',
          },
          {
            pregunta: '¿Necesito instalar algo?',
            respuesta: 'No. Mi Caja es 100% web. Funciona desde cualquier navegador en tu computador, tablet o celular.',
          },
          {
            pregunta: '¿Puedo usarlo desde el celular?',
            respuesta: 'Sí. Funciona perfectamente en móvil, tablet y computador. Solo necesitas conexión a internet.',
          },
          {
            pregunta: '¿Cómo funciona la carga de inventario con IA?',
            respuesta: 'Sube la foto o PDF de tu factura y la IA extrae productos, cantidades y costos automáticamente. Listo en menos de 1 minuto.',
          },
        ];

        return (
          <div className="fixed bottom-6 left-6" style={{ zIndex: 35 }}>
            {/* Panel del bot */}
            {botAbierto && (
              <div
                className="mb-3 rounded-2xl overflow-hidden"
                style={{
                  width: '320px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  border: '1px solid #e5e7eb',
                }}
              >
                {/* Header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: '#1a3d1a' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-white text-sm font-semibold">Mi Caja — Asistente</span>
                  </div>
                  <button
                    onClick={() => { setBotAbierto(false); setPreguntaActiva(null); }}
                    className="text-white/60 hover:text-white transition-colors text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>

                {/* Cuerpo */}
                <div className="p-4">
                  {preguntaActiva === null ? (
                    <>
                      <p className="text-gray-500 text-xs mb-3">Selecciona una pregunta para obtener información:</p>
                      <ul className="space-y-2">
                        {faqs.map((faq, i) => (
                          <li key={i}>
                            <button
                              onClick={() => setPreguntaActiva(i)}
                              className="w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all duration-150 hover:scale-[1.01]"
                              style={{
                                backgroundColor: 'rgba(22, 163, 74, 0.07)',
                                border: '1px solid rgba(22, 163, 74, 0.2)',
                                color: '#15803d',
                              }}
                            >
                              {faq.pregunta}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-800 font-semibold text-sm mb-2">
                        {faqs[preguntaActiva].pregunta}
                      </p>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {faqs[preguntaActiva].respuesta}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreguntaActiva(null)}
                          className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                          style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
                        >
                          ← Volver
                        </button>
                        <a
                          href="https://wa.me/56985660954?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20Mi%20Caja"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 rounded-lg text-xs font-bold text-white text-center transition-all hover:scale-105"
                          style={{ backgroundColor: '#25d366' }}
                        >
                          Hablar con ventas
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Botón disparador + texto invitación */}
            <div className="flex items-center gap-3">
              {!botAbierto && (
                <div
                  className="px-3 py-2 rounded-xl text-xs font-medium shadow-md"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#1a3d1a',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  💬 ¿Tienes dudas? Pregúntame
                </div>
              )}
              <button
                onClick={() => { setBotAbierto(!botAbierto); setPreguntaActiva(null); }}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
                style={{
                  backgroundColor: '#f97316',
                  boxShadow: '0 4px 20px rgba(249, 115, 22, 0.5)',
                }}
                aria-label="Asistente Mi Caja"
              >
                {botAbierto ? (
                  <svg className="w-6 h-6" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                ) : (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                    {/* Arco sobre la cabeza */}
                    <path d="M5 11a7 7 0 0114 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    {/* Copa izquierda */}
                    <rect x="3" y="11" width="4" height="6" rx="2" fill="white"/>
                    {/* Copa derecha */}
                    <rect x="17" y="11" width="4" height="6" rx="2" fill="white"/>
                    {/* Boom del micrófono */}
                    <path d="M21 15v1.5a2.5 2.5 0 01-2.5 2.5H15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    {/* Punto del micrófono */}
                    <circle cx="14.5" cy="19" r="1" fill="white"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Botón flotante WhatsApp */}
      <a
        href="https://wa.me/56985660954?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20Mi%20Caja"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-35 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          backgroundColor: '#25d366',
          boxShadow: '0 4px 20px rgba(37, 211, 102, 0.5)',
          zIndex: 35
        }}
        aria-label="Contactar por WhatsApp"
      >
        <svg className="w-7 h-7" fill="white" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

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
                      Los comprobantes, notas de venta y registros generados por Mi Caja tienen carácter interno y de gestión solamente. En ningún caso reemplazan ni tienen validez como boletas electrónicas, facturas u otros documentos tributarios oficiales emitidos a través del SII.
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