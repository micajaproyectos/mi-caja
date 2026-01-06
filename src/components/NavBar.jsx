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
  const [mostrarQRPreview, setMostrarQRPreview] = useState(true);
  const [mostrarSeccionQR, setMostrarSeccionQR] = useState(false);
  const [googleLink, setGoogleLink] = useState('');
  const [qrCodeUrlGoogle, setQrCodeUrlGoogle] = useState('');
  const [isGenerandoQRGoogle, setIsGenerandoQRGoogle] = useState(false);
  const [mostrarQRPreviewGoogle, setMostrarQRPreviewGoogle] = useState(true);
  const [mostrarSeccionGoogle, setMostrarSeccionGoogle] = useState(false);
  const [logoLink, setLogoLink] = useState('');
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
        
        // Cargar link de Instagram, Google y logo
        await cargarInstagramLink();
        await cargarGoogleLink();
        await cargarLogoLink();
      } catch (e) {
        console.error('Error cargando perfil:', e);
        setUserInfo({ nombre: 'Error', email: 'Error' });
      } finally {
        setIsLoadingProfile(false);
      }
    } else {
      // Si ya tenemos los datos básicos, solo cargar Instagram, Google y logo
      await cargarInstagramLink();
      await cargarGoogleLink();
      await cargarLogoLink();
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

  // Función para convertir enlace de Google Drive a enlace directo
  const convertGoogleDriveLink = (url) => {
    if (!url || !url.includes('drive.google.com')) return url;
    
    // Extraer el ID del archivo del enlace de Google Drive
    // Formato: https://drive.google.com/file/d/FILE_ID/view...
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      // Convertir a enlace directo de imagen
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return url;
  };

  // Función para obtener URL de imagen a través de proxy CORS
  const getProxiedImageUrl = (url) => {
    if (!url || url.trim() === '') return '';
    
    // Convertir enlaces de Google Drive primero
    const convertedUrl = convertGoogleDriveLink(url);
    
    // Si es Google Drive, usar proxy también (puede tener problemas de CORS)
    if (convertedUrl.includes('drive.google.com')) {
      return `https://images.weserv.nl/?url=${encodeURIComponent(convertedUrl)}&output=webp`;
    }
    
    // Si la URL es de Instagram o tiene problemas de CORS, usar proxy
    if (convertedUrl.includes('instagram.com') || convertedUrl.includes('fbcdn.net')) {
      // Usar proxy CORS público para imágenes
      return `https://images.weserv.nl/?url=${encodeURIComponent(convertedUrl)}&output=webp`;
    }
    
    return convertedUrl;
  };

  // Función para cargar el link de Google Reviews desde la base de datos
  const cargarGoogleLink = async () => {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('usuarios')
        .select('opiniones_google')
        .eq('usuario_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error al cargar link de Google:', error);
        return;
      }

      const link = data?.opiniones_google || '';
      setGoogleLink(link);
      
      // Generar QR si existe el link
      if (link) {
        await generarQRGoogle(link);
      }
    } catch (error) {
      console.error('Error inesperado al cargar Google:', error);
    }
  };

  // Función para cargar el link del logo desde la base de datos
  const cargarLogoLink = async () => {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('link_logo')
        .eq('usuario_id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Error al cargar link del logo:', error);
        }
        return;
      }

      const link = data?.link_logo || '';
      console.log('Logo link cargado:', link);
      // Usar URL original o proxy según sea necesario
      setLogoLink(link);
    } catch (error) {
      console.error('Error inesperado al cargar logo:', error);
    }
  };

  // Función para generar el código QR estilo Google con branding Mi Caja
  const generarQRGoogle = async (link) => {
    if (!link || !link.trim()) {
      alert('⚠️ No hay link de Google Reviews configurado');
      return;
    }

    setIsGenerandoQRGoogle(true);
    try {
      // 1. Generar el QR básico en BLANCO sobre fondo azul de Google
      const qrDataUrl = await QRCode.toDataURL(link, {
        width: 400,
        margin: 2,
        color: {
          dark: '#FFFFFF', // QR en blanco
          light: '#4285F4' // Azul de Google
        }
      });

      // 2. Crear un canvas para el diseño completo (estilo Google)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Dimensiones: formato cuadrado estilo Google
      canvas.width = 500;
      canvas.height = 650;

      // 3. Fondo con degradado de Google (azul → rojo → amarillo → verde)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#4285F4');    // Azul Google
      gradient.addColorStop(0.33, '#EA4335'); // Rojo Google
      gradient.addColorStop(0.66, '#FBBC04'); // Amarillo Google
      gradient.addColorStop(1, '#34A853');    // Verde Google
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Función para dibujar el contenido (con o sin logo)
      const dibujarContenido = (logoImg = null) => {
        // Logo de Mi Caja en esquina superior izquierda (discreto)
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

        // Nombre del usuario en la parte superior
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        const nombreUsuario = userInfo.nombre || 'Usuario';
        ctx.fillText(nombreUsuario, canvas.width / 2, 80);

        // QR Code centrado
        const qrSize = 300;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 110;
        
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          
          // Mensaje bajo el QR
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 18px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Su opinión es nuestra propina ❤️', canvas.width / 2, qrY + qrSize + 35);
          
          // Texto "Opiniones de Google"
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Opiniones de Google', canvas.width / 2, qrY + qrSize + 60);
          
          // Marca de agua "Powered by Mi Caja 💰" en la parte inferior
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Powered by Mi Caja 💰', canvas.width / 2, canvas.height - 20);
          
          setQrCodeUrlGoogle(canvas.toDataURL('image/png'));
        };
        qrImg.src = qrDataUrl;
      };

      // Cargar siempre el logo de Mi Caja desde la carpeta public (no el logo del usuario)
      const logoImage = new Image();
      logoImage.onload = () => {
        dibujarContenido(logoImage);
      };
      logoImage.onerror = () => {
        dibujarContenido(null);
      };
      logoImage.src = '/favicon.png';
      
      // Timeout de seguridad: si no carga en 2 segundos, usar emoji
      setTimeout(() => {
        if (!logoImage.complete) {
          dibujarContenido(null);
        }
      }, 2000);
    } catch (error) {
      console.error('Error al generar QR de Google:', error);
      alert('❌ Error al generar el QR de Google Reviews');
    } finally {
      setIsGenerandoQRGoogle(false);
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
          ctx.fillText('Powered by Mi Caja 💰', canvas.width / 2, canvas.height - 15);

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

  // Función para descargar el QR de Google
  const descargarQRGoogle = () => {
    if (!qrCodeUrlGoogle) return;

    const link = document.createElement('a');
    link.href = qrCodeUrlGoogle;
    // Nombre de archivo descriptivo con el nombre del usuario
    const nombreArchivo = userInfo.nombre 
      ? `micaja-google-${userInfo.nombre.replace(/\s+/g, '-').toLowerCase()}.png`
      : 'micaja-google-qr.png';
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
        // Cargar logo del usuario
        await cargarLogoLink();
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
                          <p className="text-white text-xs font-medium">🎊 ¡Feliz Año Nuevo 2026!</p>
                          <p className="text-gray-300 text-xs mt-1">
                            El equipo de Mi Caja te desea un próspero año lleno de éxito. ¡Gracias por confiar en nosotros!
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
              <div className="flex items-center gap-3">
                {logoLink && logoLink.trim() !== '' ? (
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white/20 bg-white/5 flex items-center justify-center">
                    <img 
                      src={getProxiedImageUrl(logoLink)} 
                      alt="Logo usuario" 
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        // Si falla el proxy, intentar con la URL original
                        if (e.target.src !== logoLink) {
                          e.target.src = logoLink;
                        } else {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                ) : null}
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Perfil</h3>
                  <p className="text-gray-300 text-xs sm:text-sm">Información de tu cuenta</p>
                </div>
              </div>
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
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📱</span>
                        <h4 className="text-lg font-semibold text-white">QR de Instagram</h4>
                      </div>
                      <button
                        onClick={() => setMostrarSeccionQR(!mostrarSeccionQR)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 text-white"
                        title={mostrarSeccionQR ? "Contraer sección" : "Desplegar sección"}
                      >
                        {mostrarSeccionQR ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Contenido desplegable */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      mostrarSeccionQR ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <p className="text-xs text-gray-300 mb-3">
                        Genera un código QR para compartir tu Instagram con tus clientes
                      </p>
                      
                      {/* Mostrar mensaje si no hay link en la base de datos */}
                      {!instagramLink || instagramLink.trim() === '' ? (
                        <div className="p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                          <p className="text-xs text-yellow-200 text-center">
                            ⚠️ No hay link de Instagram configurado en tu cuenta
                          </p>
                        </div>
                      ) : null}

                      {/* Mostrar QR si existe */}
                      {qrCodeUrl && (
                        <div className="mt-4">
                          {/* Botón para ocultar/mostrar previsualización */}
                          <button
                            onClick={() => setMostrarQRPreview(!mostrarQRPreview)}
                            className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-all duration-200 mb-2 flex items-center justify-center gap-2"
                          >
                            <span>{mostrarQRPreview ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'} Previsualización</span>
                          </button>
                          
                          {/* Previsualización del QR (ocultable) */}
                          {mostrarQRPreview && (
                            <div className="p-2 bg-white rounded-lg">
                              <div className="flex flex-col items-center gap-2">
                                <img 
                                  src={qrCodeUrl} 
                                  alt="QR Code Instagram" 
                                  className="w-full max-w-[320px] h-auto object-contain"
                                />
                                <button
                                  onClick={descargarQR}
                                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm flex items-center justify-center gap-2"
                                >
                                  <span>📥</span>
                                  <span>Descargar QR</span>
                                </button>
                                <p className="text-xs text-gray-500 text-center px-2">
                                  Comparte este QR para que tus clientes puedan seguirte en Instagram
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sección de Opiniones Google */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⭐</span>
                        <h4 className="text-lg font-semibold text-white">Opiniones Google</h4>
                      </div>
                      <button
                        onClick={() => setMostrarSeccionGoogle(!mostrarSeccionGoogle)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 text-white"
                        title={mostrarSeccionGoogle ? "Contraer sección" : "Desplegar sección"}
                      >
                        {mostrarSeccionGoogle ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Contenido desplegable */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      mostrarSeccionGoogle ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <p className="text-xs text-gray-300 mb-3">
                        Genera un código QR para que tus clientes puedan dejar su opinión en Google
                      </p>
                      
                      {/* Mostrar mensaje si no hay link en la base de datos */}
                      {!googleLink || googleLink.trim() === '' ? (
                        <div className="p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                          <p className="text-xs text-yellow-200 text-center">
                            ⚠️ No hay link de Google Reviews configurado en tu cuenta
                          </p>
                        </div>
                      ) : null}

                      {/* Mostrar QR si existe */}
                      {qrCodeUrlGoogle && (
                        <div className="mt-4">
                          {/* Botón para ocultar/mostrar previsualización */}
                          <button
                            onClick={() => setMostrarQRPreviewGoogle(!mostrarQRPreviewGoogle)}
                            className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-all duration-200 mb-2 flex items-center justify-center gap-2"
                          >
                            <span>{mostrarQRPreviewGoogle ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'} Previsualización</span>
                          </button>
                          
                          {/* Previsualización del QR (ocultable) */}
                          {mostrarQRPreviewGoogle && (
                            <div className="p-2 bg-white rounded-lg">
                              <div className="flex flex-col items-center gap-2">
                                <img 
                                  src={qrCodeUrlGoogle} 
                                  alt="QR Code Google Reviews" 
                                  className="w-full max-w-[320px] h-auto object-contain"
                                />
                                <button
                                  onClick={descargarQRGoogle}
                                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm flex items-center justify-center gap-2"
                                >
                                  <span>📥</span>
                                  <span>Descargar QR</span>
                                </button>
                                <p className="text-xs text-gray-500 text-center px-2">
                                  Comparte este QR para que tus clientes puedan dejar su opinión en Google
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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