import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../lib/authService.js';
import { sessionManager } from '../lib/sessionManager.js';
import { supabase } from '../lib/supabaseClient.js';
import SubscriptionNotification from './SubscriptionNotification.jsx';
import NewFeaturesNotification from './NewFeaturesNotification.jsx';
import RatingNotification from './RatingNotification.jsx';
import ClaveInternaNotification from './ClaveInternaNotification.jsx';
import QRCode from 'qrcode';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({ nombre: '', email: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showSubscriptionNotification, setShowSubscriptionNotification] = useState(false);
  const [showVisualNotification, setShowVisualNotification] = useState(false);
  const [showNewFeaturesNotification, setShowNewFeaturesNotification] = useState(false);
  const [showNewFeaturesVisualNotification, setShowNewFeaturesVisualNotification] = useState(false);
  const [showRatingNotification, setShowRatingNotification] = useState(false);
  const [showRatingVisualNotification, setShowRatingVisualNotification] = useState(false); // Ya no se usa automáticamente
  const [showClaveInternaNotification, setShowClaveInternaNotification] = useState(false);
  const [instagramLink, setInstagramLink] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isSavingInstagram, setIsSavingInstagram] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      authService.clearUserData();
      navigate('/login');
    }
  };

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);
  const openProfile = async () => {
    setIsProfileOpen(true);
    closeMenu();
    
    // Solo cargar datos si no los tenemos ya
    if (!userInfo.nombre && !userInfo.email) {
      setIsLoadingProfile(true);
      try {
        const profile = await authService.getCurrentUser();
        setUserInfo({
          nombre: profile?.nombre || '',
          email: profile?.email || ''
        });
        
        // Cargar link de Instagram
        await cargarInstagramLink();
      } catch (e) {
        console.error('Error cargando perfil:', e);
        setUserInfo({ nombre: 'Error', email: 'Error' });
      } finally {
        setIsLoadingProfile(false);
      }
    } else {
      // Si ya tenemos los datos básicos, solo cargar Instagram
      await cargarInstagramLink();
    }
  };

  // Función para cargar el link de Instagram desde la base de datos
  const cargarInstagramLink = async () => {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('usuarios')
        .select('link_instagram')
        .eq('usuario_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error al cargar link de Instagram:', error);
        return;
      }

      const link = data?.link_instagram || '';
      setInstagramLink(link);
      
      // Generar QR si existe el link
      if (link) {
        await generarQR(link);
      }
    } catch (error) {
      console.error('Error inesperado al cargar Instagram:', error);
    }
  };

  // Función para guardar el link de Instagram
  const guardarInstagramLink = async () => {
    if (!instagramLink.trim()) {
      alert('Por favor ingresa un link de Instagram válido');
      return;
    }

    setIsSavingInstagram(true);
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        alert('Error: Usuario no autenticado');
        return;
      }

      const { error } = await supabase
        .from('usuarios')
        .update({ link_instagram: instagramLink.trim() })
        .eq('usuario_id', userId);

      if (error) {
        console.error('Error al guardar link de Instagram:', error);
        alert('Error al guardar el link de Instagram');
        return;
      }

      // Generar el QR
      await generarQR(instagramLink.trim());
      alert('✅ Link de Instagram guardado exitosamente');
    } catch (error) {
      console.error('Error inesperado al guardar Instagram:', error);
      alert('Error inesperado al guardar el link');
    } finally {
      setIsSavingInstagram(false);
    }
  };

  // Función para generar el código QR estilo Instagram con branding Mi Caja
  const generarQR = async (link) => {
    try {
      // 1. Generar el QR básico en BLANCO sobre fondo morado de Instagram
      const qrDataUrl = await QRCode.toDataURL(link, {
        width: 400,
        margin: 2,
        color: {
          dark: '#FFFFFF', // QR en blanco
          light: '#833AB4' // Morado de Instagram
        }
      });

      // 2. Crear un canvas para el diseño completo (estilo Instagram)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Dimensiones: formato cuadrado estilo Instagram
      canvas.width = 500;
      canvas.height = 650;

      // 3. Fondo con degradado de Instagram (naranja → rosa → morado)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#f09433');    // Naranja Instagram
      gradient.addColorStop(0.25, '#e6683c'); // Naranja-rosa
      gradient.addColorStop(0.5, '#dc2743');  // Rosa Instagram
      gradient.addColorStop(0.75, '#cc2366'); // Rosa-morado
      gradient.addColorStop(1, '#bc1888');    // Morado Instagram
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Función para dibujar el contenido (con o sin logo)
      const dibujarContenido = (logoImg = null) => {
        // Logo pequeño en esquina superior izquierda (discreto)
        if (logoImg) {
          // Logo pequeño: máximo 40px
          const maxLogoSize = 40;
          let logoWidth = logoImg.width;
          let logoHeight = logoImg.height;
          
          // Escalar manteniendo proporciones
          const aspectRatio = logoWidth / logoHeight;
          if (aspectRatio > 1) {
            logoWidth = maxLogoSize;
            logoHeight = maxLogoSize / aspectRatio;
          } else {
            logoHeight = maxLogoSize;
            logoWidth = maxLogoSize * aspectRatio;
          }
          
          // Posicionar en esquina superior izquierda
          const logoX = 20;
          const logoY = 20;
          
          // Añadir opacidad sutil para que no predomine
          ctx.globalAlpha = 0.7;
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0; // Restaurar opacidad
        } else {
          // Si no hay logo, solo emoji discreto en esquina
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = '24px Inter, Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('🏪', 20, 45);
        }

        // INFORMACIÓN DEL USUARIO - PROTAGONISTA
        // Nombre del usuario en grande y destacado
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(userInfo.nombre || 'Usuario', canvas.width / 2, 100);

        // Separador sutil en blanco
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, 130);
        ctx.lineTo(canvas.width - 80, 130);
        ctx.stroke();

        // 5. Cargar y dibujar el QR
        const qrImage = new Image();
        qrImage.onload = () => {
          // Dibujar el QR centrado (ajustado para nueva posición)
          const qrSize = 350;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = 150;
          
          // Fondo morado oscuro de Instagram detrás del QR para el contraste
          ctx.fillStyle = '#833AB4';
          ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
          
          // Sombra suave para el QR
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 5;
          
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
          
          // Resetear sombra
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          // Footer: Instrucciones en blanco (estilo Instagram)
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 18px Inter, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('📷 Síguenos en Instagram', canvas.width / 2, qrY + qrSize + 35);
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = '13px Inter, Arial, sans-serif';
          ctx.fillText('Escanea con tu cámara', canvas.width / 2, qrY + qrSize + 58);

          // Marca de agua Mi Caja (sutil en blanco)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '11px Inter, Arial, sans-serif';
          ctx.fillText('Powered by Mi Caja', canvas.width / 2, canvas.height - 15);

          // Convertir el canvas a URL y guardar
          const finalImageUrl = canvas.toDataURL('image/png', 1.0);
          setQrCodeUrl(finalImageUrl);
        };
        
        qrImage.onerror = () => {
          console.error('Error al cargar QR image');
          // Intentar continuar sin imagen
          const finalImageUrl = canvas.toDataURL('image/png', 1.0);
          setQrCodeUrl(finalImageUrl);
        };
        
        qrImage.src = qrDataUrl;
      };

      // 4. Intentar cargar el logo de Mi Caja
      const logoImage = new Image();
      logoImage.onload = () => {
        console.log('✅ Logo cargado correctamente');
        dibujarContenido(logoImage);
      };
      
      logoImage.onerror = () => {
        console.warn('⚠️ No se pudo cargar el logo, usando texto alternativo');
        dibujarContenido(null);
      };
      
      // Cargar el logo desde la carpeta public
      logoImage.src = '/favicon.png';
      
      // Timeout de seguridad: si no carga en 2 segundos, usar texto
      setTimeout(() => {
        if (!logoImage.complete) {
          console.warn('⏱️ Timeout al cargar logo, usando texto alternativo');
          dibujarContenido(null);
        }
      }, 2000);

    } catch (error) {
      console.error('Error al generar QR:', error);
    }
  };

  // Función para descargar el QR
  const descargarQR = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    // Nombre de archivo descriptivo con el nombre del usuario
    const nombreArchivo = userInfo.nombre 
      ? `micaja-instagram-${userInfo.nombre.replace(/\s+/g, '-').toLowerCase()}.png`
      : 'micaja-instagram-qr.png';
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeProfile = () => setIsProfileOpen(false);

  // Función para cerrar la notificación de suscripción
  const closeSubscriptionNotification = () => {
    setShowSubscriptionNotification(false);
    markNotificationAsShown();
    // Activar la notificación visual después de cerrar el popup
    setShowVisualNotification(true);
  };

  // Función para cerrar la notificación de nuevas funcionalidades
  const closeNewFeaturesNotification = () => {
    setShowNewFeaturesNotification(false);
    markNewFeaturesNotificationAsShown();
    // Activar la notificación visual después de cerrar el popup
    setShowNewFeaturesVisualNotification(true);
  };

  // Función para abrir manualmente la notificación de nuevas funcionalidades
  const openNewFeaturesNotification = () => {
    setShowNewFeaturesNotification(true);
    setIsMenuOpen(false); // Cerrar el menú
  };

  // Función para abrir manualmente la notificación de calificación
  const openRatingNotification = () => {
    setShowRatingNotification(true);
    setIsMenuOpen(false); // Cerrar el menú
  };

  // Función para abrir la notificación de clave interna
  const openClaveInternaNotification = () => {
    setShowClaveInternaNotification(true);
    setIsMenuOpen(false); // Cerrar el menú
  };

  // Función para cerrar la notificación de clave interna
  const closeClaveInternaNotification = () => {
    setShowClaveInternaNotification(false);
  };

  // Función para manejar cuando se guarda la clave
  const handleClaveGuardada = () => {
    // Solo cierra el modal, Seguimiento.jsx detectará el cambio al navegar
    if (import.meta.env.DEV) {
      console.log('✅ Clave interna configurada/actualizada');
    }
  };

  // Función para cerrar la notificación de calificación
  const closeRatingNotification = (action) => {
    setShowRatingNotification(false);
    
    // Manejar diferentes acciones
    if (action === 'rated') {
      // Si calificó, marcar permanentemente que no debe mostrar más
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const storageKey = `ratingNotificationShown_${currentUser.id}`;
        localStorage.setItem(storageKey, 'true');
        if (import.meta.env.DEV) {
          console.log('✅ Usuario calificó, no mostrar más notificaciones');
        }
      }
      // No mostrar más la notificación visual
      setShowRatingVisualNotification(false);
    } else if (action === 'later') {
      // Si postergó, marcar para no mostrar más (persiste entre recargas)
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const storageKey = `ratingNotificationShown_${currentUser.id}`;
        localStorage.setItem(storageKey, 'true');
        if (import.meta.env.DEV) {
          console.log('⏰ Usuario postergó, no mostrar más notificaciones');
        }
      }
      // No mostrar más la notificación visual
      setShowRatingVisualNotification(false);
    }
  };

  // ⚠️ DESACTIVADO - Lógica de calificación removida
  // const shouldShowRatingNotification = async () => {
  //   try {
  //     // Verificar si el usuario está autenticado
  //     const currentUser = await authService.getCurrentUser();
  //     if (!currentUser) {
  //       if (import.meta.env.DEV) {
  //         console.log('❌ Usuario no autenticado');
  //       }
  //       return false;
  //     }
  //
  //     // PRIMERO: Verificar si ya calificó en la base de datos (fuente de verdad)
  //     const { data: hasRated } = await supabase.rpc('usuario_ya_califico', {
  //       p_usuario_id: currentUser.id
  //     });
  //
  //     if (hasRated) {
  //       if (import.meta.env.DEV) {
  //         console.log('Usuario ya calificó en la base de datos, no mostrar notificación');
  //       }
  //       // Marcar como mostrada para no volver a verificar
  //       const storageKey = `ratingNotificationShown_${currentUser.id}`;
  //       localStorage.setItem(storageKey, 'true');
  //       return false;
  //     }
  //
  //     // SEGUNDO: Si no calificó, verificar localStorage solo como referencia
  //     const storageKey = `ratingNotificationShown_${currentUser.id}`;
  //     const hasShown = localStorage.getItem(storageKey);
  //     if (hasShown) {
  //       if (import.meta.env.DEV) {
  //         console.log('Notificación marcada como mostrada en localStorage, pero usuario no calificó');
  //         console.log('Limpiando localStorage y permitiendo mostrar notificación');
  //       }
  //       // Limpiar localStorage si el usuario no calificó realmente
  //       localStorage.removeItem(storageKey);
  //     }
  //
  //     if (import.meta.env.DEV) {
  //       console.log('Usuario puede calificar:', currentUser.nombre);
  //     }
  //     return true;
  //   } catch (error) {
  //     console.error('Error al verificar notificación de calificación:', error);
  //     return false;
  //   }
  // };

  // Función para verificar si debe mostrar la notificación de suscripción
  const shouldShowSubscriptionNotification = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    // Verificar si está en el rango del 28 al fin de mes o del 1 al 5
    const isInNotificationPeriod = day >= 28 || day <= 5;
    
    if (isInNotificationPeriod) {
      // Verificar si ya se mostró hoy (usando localStorage)
      const lastShown = localStorage.getItem('subscriptionNotificationLastShown');
      const todayString = `${year}-${month}-${day}`;
      
      if (lastShown !== todayString) {
        return true;
      }
    }
    return false;
  };

  // Función para verificar si debe mostrar la notificación visual
  const shouldShowVisualNotification = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    // Verificar si está en el rango del 28 al fin de mes o del 1 al 5
    const isInNotificationPeriod = day >= 28 || day <= 5;
    
    if (isInNotificationPeriod) {
      // Verificar si ya se mostró el popup en este periodo
      const lastShown = localStorage.getItem('subscriptionNotificationLastShown');
      if (lastShown) {
        const [lastYear, lastMonth, lastDay] = lastShown.split('-').map(Number);
        // Si se mostró este mes o mes anterior (dependiendo del periodo), mostrar la notificación visual
        if (lastYear === year && lastMonth === month) {
          return true;
        }
        // Si estamos en los primeros 5 días y se mostró el mes anterior
        if (day <= 5 && lastYear === year && lastMonth === month - 1) {
          return true;
        }
      }
    }
    return false;
  };

  // Función para marcar la notificación como mostrada
  const markNotificationAsShown = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    const todayString = `${year}-${month}-${day}`;
    localStorage.setItem('subscriptionNotificationLastShown', todayString);
  };

  // Función para verificar si debe mostrar la notificación de nuevas funcionalidades
  const shouldShowNewFeaturesNotification = () => {
    // Verificar si ya se mostró permanentemente
    const permanentlyShown = localStorage.getItem('newFeaturesNotificationShown');
    if (permanentlyShown) {
      console.log('❌ Notificación ya marcada como mostrada permanentemente');
      console.log('🔧 Limpiando localStorage para resetear notificación...');
      localStorage.removeItem('newFeaturesNotificationShown');
      localStorage.removeItem('newFeaturesNotificationDismissed');
      return true; // Mostrar después de limpiar
    }
    
    // Por ahora, mostrar siempre para testing (después podemos ajustar la lógica de fechas)
    console.log('✅ Mostrando notificación - modo testing activado');
    return true;
  };

  // Función para verificar si debe mostrar la notificación visual de nuevas funcionalidades
  const shouldShowNewFeaturesVisualNotification = () => {
    const today = new Date();
    const featureStartDate = '2025-01-26'; // Fecha de implementación de cuadre de caja (ayer)
    const daysSinceFeature = Math.floor((today - new Date(featureStartDate)) / (1000 * 60 * 60 * 24));
    
    // Verificar si ya se ocultó permanentemente (después de 9 días total)
    const permanentlyDismissed = localStorage.getItem('newFeaturesNotificationShown');
    if (permanentlyDismissed) {
      return false;
    }
    
    // Mostrar en notificaciones del menú entre el día 3 y 9 (7 días)
    // Días 0-2: Popup automático
    // Días 3-9: Solo en notificaciones del menú
    // Día 10+: Desaparece completamente
    return daysSinceFeature >= 3 && daysSinceFeature <= 9;
  };

  // Función para marcar la notificación de nuevas funcionalidades como mostrada
  const markNewFeaturesNotificationAsShown = () => {
    // No marcar como mostrada permanentemente aquí
    // La lógica de tiempo se maneja en shouldShowNewFeaturesNotification
    // Solo ocultar temporalmente la notificación visual
    setShowNewFeaturesVisualNotification(false);
    
    // Marcar como permanentemente ocultada solo después de 9 días totales
    const today = new Date();
    const featureStartDate = '2025-01-26';
    const daysSinceFeature = Math.floor((today - new Date(featureStartDate)) / (1000 * 60 * 60 * 24));
    
    if (daysSinceFeature >= 9) {
      localStorage.setItem('newFeaturesNotificationShown', 'true');
    }
  };

  // Cargar datos básicos del usuario al montar el componente
  useEffect(() => {
    const loadBasicUserInfo = async () => {
      try {
        const profile = await authService.getCurrentUser();
        setUserInfo(prev => ({
          ...prev,
          nombre: profile?.nombre || '',
          email: profile?.email || ''
        }));
      } catch (e) {
        console.error('Error cargando datos básicos:', e);
      }
    };
    loadBasicUserInfo();

    // Suscribirse SOLO a cambios de perfil (no a datos de ventas/inventario)
    const unsubscribe = sessionManager.subscribe((event, session, extra) => {
      const { previousUserId, newUserId } = extra || {};
      
      // Solo procesar cambios de perfil del usuario actual
      if (event === 'SIGNED_OUT') {
        setUserInfo({ nombre: '', email: '' });
        if (process.env.NODE_ENV !== 'production') {
          console.log('🧹 NavBar: Datos de usuario limpiados tras logout');
        }
      } else if (event === 'SIGNED_IN' && newUserId && newUserId !== previousUserId) {
        loadBasicUserInfo();
      }
    });

    return unsubscribe;
  }, []);

  // Verificar si debe mostrar las notificaciones al montar el componente
  useEffect(() => {
    // Verificar notificación de suscripción
    if (shouldShowSubscriptionNotification()) {
      setShowSubscriptionNotification(true);
    } else if (shouldShowVisualNotification()) {
      // Si no debe mostrar el popup pero sí la notificación visual
      setShowVisualNotification(true);
    }

    // ⚠️ DESACTIVADO - Lógica de calificación removida
    // const checkRatingNotification = async () => {
    //   if (await shouldShowRatingNotification()) {
    //     // Solo mostrar notificación visual en el menú, no popup automático
    //     setShowRatingVisualNotification(true);
    //   }
    // };
    // checkRatingNotification();
  }, []);

  // Escuchar cambios de autenticación para mostrar notificación
  // OPTIMIZADO: Usar sessionManager en lugar de suscripción directa a Supabase
  useEffect(() => {
    let hasShownNotification = false;
    let isInitialLoad = true;
    
    // Suscribirse al sessionManager (un solo listener centralizado)
    const unsubscribe = sessionManager.subscribe((event, session) => {
      if (import.meta.env.DEV) {
        console.log('🔔 NavBar recibió evento de auth:', event, session?.user?.id);
      }
      
      // Ignorar el primer evento (INITIAL_SESSION) y solo procesar SIGNED_IN real
      if (isInitialLoad) {
        isInitialLoad = false;
        if (import.meta.env.DEV) {
          console.log('⏭️ Ignorando evento inicial, esperando login real');
        }
        return;
      }
      
      // Solo mostrar notificación en SIGNED_IN (login real), no en INITIAL_SESSION
      if (event === 'SIGNED_IN' && session?.user && !hasShownNotification) {
        hasShownNotification = true; // Evitar múltiples ejecuciones
        
        // ⚠️ DESACTIVADO - Lógica de calificación removida
        // setTimeout(async () => {
        //   if (await shouldShowRatingNotification()) {
        //     if (import.meta.env.DEV) {
        //       console.log('Usuario inició sesión, mostrando notificación visual de calificación');
        //     }
        //     setShowRatingVisualNotification(true);
        //   }
        // }, 1000);
      }
    });

    // Cleanup: desuscribirse al desmontar
    return () => unsubscribe();
  }, []);

  // Función para cerrar el popup de notificación cuando se completa la calificación
  useEffect(() => {
    window.onRatingCompleted = () => {
      if (import.meta.env.DEV) {
        console.log('✅ Calificación completada, cerrando popup de notificación');
      }
      setShowRatingNotification(false);
      
      // Marcar que el usuario ya calificó (persiste entre recargas)
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const storageKey = `ratingNotificationShown_${currentUser.id}`;
        localStorage.setItem(storageKey, 'true');
      }
    };
    
    return () => {
      delete window.onRatingCompleted;
    };
  }, []);

  // Verificar notificación de nuevas funcionalidades
  useEffect(() => {
    console.log('🔍 Verificando notificación de nuevas funcionalidades...');
    
    const showPopup = shouldShowNewFeaturesNotification();
    const showVisual = shouldShowNewFeaturesVisualNotification();
    
    console.log('🔍 Resultados:', { showPopup, showVisual });
    
    if (showPopup || showVisual) {
      console.log('✅ Mostrando notificación visual en menú');
      setShowNewFeaturesVisualNotification(true);
    } else {
      console.log('❌ No se muestra ninguna notificación');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // No mostrar NavBar en la página de login
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <>
      <div
        className="shadow-lg fixed top-0 left-0 right-0 z-50"
        style={{ backgroundColor: '#1a3d1a', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end h-16 relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 relative"
              style={{
                backgroundColor: '#0a1e0a',
                color: 'white',
                boxShadow: '0 4px 14px rgba(10, 30, 10, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex flex-col space-y-1">
                <div className="w-5 h-0.5 bg-white rounded"></div>
                <div className="w-5 h-0.5 bg-white rounded"></div>
                <div className="w-5 h-0.5 bg-white rounded"></div>
              </div>
              
              {/* Indicador de notificación */}
              {(showVisualNotification || showNewFeaturesVisualNotification) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"
                     style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }}>
                </div>
              )}
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-14 w-72 rounded-2xl shadow-lg border border-white/10 overflow-hidden animate-[fadeIn_150ms_ease-out]"
                style={{
                  backgroundColor: 'rgba(31, 74, 31, 0.95)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div className="p-4">
                  {/* Notificación de suscripción en el menú */}
                  {showVisualNotification && (
                    <div className="mb-4 p-3 rounded-lg border-l-4"
                         style={{ 
                           backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                           borderLeftColor: '#ef4444',
                           border: '1px solid rgba(239, 68, 68, 0.2)'
                         }}>
                      <div className="flex items-center">
                        <span className="text-lg mr-2">🔔</span>
                        <div>
                          <p className="text-white text-xs font-medium">Recordatorio de Suscripción</p>
                          <p className="text-gray-300 text-xs mt-1">
                            No olvides cancelar tu suscripción mensual. Si ya has cancelado omite esta notificación.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notificación de nuevas funcionalidades en el menú */}
                  {showNewFeaturesVisualNotification && (
                    <div className="mb-4 p-3 rounded-lg border-l-4 cursor-pointer hover:bg-white/5 transition-colors"
                         style={{ 
                           backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                           borderLeftColor: '#22c55e',
                           border: '1px solid rgba(34, 197, 94, 0.2)'
                         }}
                         onClick={openNewFeaturesNotification}>
                      <div className="flex items-center">
                        <span className="text-lg mr-2">🎉</span>
                        <div>
                          <p className="text-white text-xs font-medium">¡Nuevas Mejoras Disponibles!</p>
                          <p className="text-gray-300 text-xs mt-1">
                            Previsualización de imágenes de productos y mejoras en cuadre de caja. ¡Haz clic para ver más!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notificación de calificación en el menú - SIEMPRE VISIBLE */}
                  <div className="mb-4 p-3 rounded-lg border-l-4 cursor-pointer hover:bg-white/5 transition-colors"
                       style={{ 
                         backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                         borderLeftColor: '#ffc107',
                         border: '1px solid rgba(255, 193, 7, 0.2)'
                       }}
                       onClick={openRatingNotification}>
                    <div className="flex items-center">
                      <span className="text-lg mr-2">⭐</span>
                      <div>
                        <p className="text-white text-xs font-medium">¡Tu opinión es importante!</p>
                        <p className="text-gray-300 text-xs mt-1">
                          ¿Mi Caja te ha sido útil? Cuéntanos tu experiencia. ¡Haz clic para calificar!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-white text-sm font-semibold">{userInfo.nombre || 'Usuario'}</p>
                    <p className="text-gray-300 text-xs break-all">{userInfo.email || ''}</p>
                  </div>
                  <button
                    onClick={openProfile}
                    className="w-full text-left px-4 py-2 rounded-lg mb-2 transition-colors"
                    style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Perfil
                  </button>
                  <button
                    onClick={openClaveInternaNotification}
                    className="w-full text-left px-4 py-2 rounded-lg mb-2 transition-colors hover:bg-white/5"
                    style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    🔒 Clave Interna
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'white', border: '1px solid rgba(239, 68, 68, 0.35)' }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeProfile} />
          <div
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-lg"
            style={{
              backgroundColor: 'rgba(31, 74, 31, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Perfil</h3>
              <p className="text-gray-300 text-sm">Información de tu cuenta</p>
            </div>
            
            <div className="space-y-4 text-white">
              {isLoadingProfile ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                  <span className="ml-2 text-gray-300">Cargando...</span>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-gray-300">Nombre</p>
                    <p className="font-medium">{userInfo.nombre || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-300">Correo electrónico</p>
                    <p className="font-medium break-all">{userInfo.email || '—'}</p>
                  </div>

                  {/* Sección de Instagram QR */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">📱</span>
                      <h4 className="text-lg font-semibold text-white">QR de Instagram</h4>
                    </div>
                    <p className="text-xs text-gray-300 mb-3">
                      Genera un código QR para compartir tu Instagram con tus clientes
                    </p>
                    
                    {/* Input para link de Instagram */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Link de Instagram
                      </label>
                      <input
                        type="url"
                        value={instagramLink}
                        onChange={(e) => setInstagramLink(e.target.value)}
                        placeholder="https://instagram.com/tu_usuario"
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 text-sm"
                      />
                      
                      {/* Botón para guardar y generar QR */}
                      <button
                        onClick={guardarInstagramLink}
                        disabled={isSavingInstagram || !instagramLink.trim()}
                        className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-sm"
                      >
                        {isSavingInstagram ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Guardando...
                          </span>
                        ) : (
                          '💾 Guardar y Generar QR'
                        )}
                      </button>
                    </div>

                    {/* Mostrar QR si existe */}
                    {qrCodeUrl && (
                      <div className="mt-4 p-4 bg-white rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          <img 
                            src={qrCodeUrl} 
                            alt="QR Code Instagram" 
                            className="w-48 h-48 object-contain"
                          />
                          <button
                            onClick={descargarQR}
                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm flex items-center justify-center gap-2"
                          >
                            <span>📥</span>
                            <span>Descargar QR</span>
                          </button>
                          <p className="text-xs text-gray-500 text-center">
                            Comparte este QR para que tus clientes puedan seguirte en Instagram
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeProfile}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Cerrar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: '#ef4444', color: 'white', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de suscripción */}
      {showSubscriptionNotification && (
        <SubscriptionNotification onClose={closeSubscriptionNotification} />
      )}

      {/* Notificación de nuevas funcionalidades */}
      {showNewFeaturesNotification && (
        <NewFeaturesNotification onClose={closeNewFeaturesNotification} show={true} />
      )}

      {/* Notificación de calificación */}
      {showRatingNotification && (
        <RatingNotification onClose={closeRatingNotification} show={true} />
      )}

      {showClaveInternaNotification && (
        <ClaveInternaNotification 
          isOpen={showClaveInternaNotification}
          onClose={closeClaveInternaNotification}
          onSave={handleClaveGuardada}
        />
      )}
    </>
  );
};

export default NavBar; 