import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { authService } from '../lib/authService.js';

export default function Footer() {
  // Estados del componente
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userHasRated, setUserHasRated] = useState(false);
  const [recentRatings, setRecentRatings] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Función para abrir el modal de calificación desde otros componentes
  const openRatingModal = () => {
    if (!userHasRated) {
      setShowRatingModal(true);
    }
  };

  // Función para verificar si el usuario actual ya calificó
  const checkUserRating = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        setUserHasRated(false);
        return;
      }

      const { data, error } = await supabase.rpc('usuario_ya_califico', {
        p_usuario_id: currentUser.id
      });

      if (error) {
        console.error('Error al verificar calificación del usuario:', error);
        setUserHasRated(false);
        return;
      }

      setUserHasRated(data || false);
    } catch (error) {
      console.error('Error al verificar calificación del usuario:', error);
      setUserHasRated(false);
    }
  };

  // Función para cargar calificaciones recientes
  const loadRecentRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('calificaciones')
        .select('nombre_usuario, estrellas, comentarios, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error al cargar calificaciones recientes:', error);
        setRecentRatings([]);
        return;
      }

      setRecentRatings(data || []);
    } catch (error) {
      console.error('Error al cargar calificaciones recientes:', error);
      setRecentRatings([]);
    }
  };

  // Exponer la función globalmente para que otros componentes puedan usarla
  useEffect(() => {
    window.openRatingModal = openRatingModal;
    return () => {
      delete window.openRatingModal;
    };
  }, [userHasRated]);

  // Cargar datos de calificaciones desde Supabase
  useEffect(() => {
    checkUserRating();
    loadRecentRatings();
  }, []);

  // Verificar estado de calificación cuando cambia el usuario
  useEffect(() => {
    const checkUserStatus = async () => {
      await checkUserRating();
      await loadRecentRatings();
    };
    
    // Verificar cada 5 segundos para detectar cambios
    const interval = setInterval(checkUserStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Auto-slide para el carrusel de calificaciones
  useEffect(() => {
    if (recentRatings.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % recentRatings.length);
      }, 4000); // Cambiar cada 4 segundos

      return () => clearInterval(interval);
    }
  }, [recentRatings.length]);

  const handleStarClick = (starValue) => {
    setRating(starValue);
  };

  const handleStarHover = (starValue) => {
    // Solo permitir hover si no hay una calificación seleccionada
    if (rating === 0) {
      setHoverRating(starValue);
    }
  };

  const handleStarLeave = () => {
    // Solo limpiar hover si no hay una calificación seleccionada
    if (rating === 0) {
      setHoverRating(0);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      // Obtener usuario actual
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        alert('Debes iniciar sesión para calificar');
        setIsSubmitting(false);
        return;
      }

      // Preparar datos de la calificación
      const ratingData = {
        usuario_id: currentUser.id,
        cliente_id: currentUser.cliente_id || currentUser.id,
        estrellas: rating,
        comentarios: comment.trim() || null,
        nombre_usuario: currentUser.nombre
      };

      console.log('Enviando calificación:', ratingData);

      // Insertar calificación en Supabase
      const { data, error } = await supabase
        .from('calificaciones')
        .insert([ratingData])
        .select();

      if (error) {
        console.error('Error al enviar calificación:', error);
        alert('Error al enviar la calificación. Intenta de nuevo.');
        return;
      }

      console.log('✅ Calificación enviada exitosamente:', data);
      
      // Actualizar estado local
      setUserHasRated(true);
      setShowRatingModal(false);
      setRating(0);
      setComment('');
      
      // Recargar calificaciones recientes
      await loadRecentRatings();
      
      // Notificar que se completó la calificación (para cerrar popup de notificación)
      if (window.onRatingCompleted) {
        window.onRatingCompleted();
      }
      
      // Mostrar mensaje de éxito
      alert('¡Gracias por tu calificación!');
      
    } catch (error) {
      console.error('Error al enviar calificación:', error);
      alert('Error al enviar la calificación. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating, interactive = false, size = 'text-2xl') => {
    return (
      <div className="flex items-center justify-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => {
          let shouldBeActive = false;
          
          if (interactive) {
            // Para estrellas interactivas, usar hover o rating actual
            const activeRating = hoverRating || rating;
            shouldBeActive = star <= activeRating;
          } else {
            // Para mostrar calificación promedio
            shouldBeActive = star <= currentRating;
          }
          
          return (
            <button
              key={star}
              type="button"
              className={`${size} transition-all duration-200 ${
                interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
              }`}
              onClick={interactive ? () => handleStarClick(star) : undefined}
              onMouseEnter={interactive ? () => handleStarHover(star) : undefined}
              onMouseLeave={interactive ? handleStarLeave : undefined}
              disabled={!interactive}
            >
              <span
                className={`${
                  shouldBeActive ? 'text-yellow-500' : 'text-gray-500'
                } transition-colors duration-200`}
              >
                ★
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <footer className="relative bg-gray-900 text-gray-300 py-6 mt-2">
        {/* Fondo degradado para el footer */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            background: `
              linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
              radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%)
            `
          }}
        />

        {/* Efecto de vidrio esmerilado para el footer */}
        <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>

        {/* Contenido del footer */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 text-center">
          {/* Slider de Calificaciones Recientes */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-200 mb-3 text-center">
              Lo que dicen nuestros usuarios
            </h4>
            
            {recentRatings.length > 0 ? (
              <div 
                className="relative overflow-hidden rounded-lg p-3"
                style={{
                  background: `
                    linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
                    radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%)
                  `,
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {recentRatings.map((rating, index) => (
                    <div key={index} className="w-full flex-shrink-0 px-2">
                      <div className="text-center">
                        {/* Estrellas */}
                        <div className="flex justify-center mb-2">
                          {renderStars(rating.estrellas, false, 'text-sm')}
                        </div>
                        
                        {/* Comentario */}
                        {rating.comentarios && (
                          <p 
                            className="text-gray-200 text-xs italic mb-2"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            "{rating.comentarios}"
                          </p>
                        )}
                        
                        {/* Usuario y fecha */}
                        <div className="text-gray-400 text-xs">
                          <span className="font-medium">{rating.nombre_usuario}</span>
                          <span className="mx-1">•</span>
                          <span>{new Date(rating.created_at).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Indicadores de slide */}
                {recentRatings.length > 1 && (
                  <div className="flex justify-center mt-3 space-x-1">
                    {recentRatings.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          index === currentSlide ? 'bg-yellow-400' : 'bg-gray-500'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="relative overflow-hidden rounded-lg p-6"
                style={{
                  background: `
                    linear-gradient(135deg, #1a3d1a 0%, #0a1e0a 100%),
                    radial-gradient(circle at 20% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(31, 74, 31, 0.2) 0%, transparent 50%)
                  `,
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-2xl text-gray-400">⭐</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Sé el primero en calificar Mi Caja
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Tu opinión nos ayuda a mejorar
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Separador */}
          <div className="border-t border-gray-600 my-6"></div>
          
          {/* Texto de AM Consultora */}
          <div className="space-y-2">
            <p className="text-sm md:text-base drop-shadow-sm">
              ¿Buscas soluciones tecnológicas para tu negocio?
            </p>
            <p className="text-sm md:text-base drop-shadow-sm">
              Visítanos en{' '}
              <a 
                href="https://amconsultora.cl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-300 hover:underline"
              >
                amconsultora.cl
              </a>
              {' '}o escríbenos a{' '}
              <a 
                href="mailto:contacto@amconsultora.cl"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-300 hover:underline"
              >
                contacto@amconsultora.cl
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Calificación */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-2xl p-6 w-full max-w-md relative"
            style={{
              backgroundColor: 'rgba(31, 74, 31, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)'
            }}
          >
            {/* Botón cerrar */}
            <button
              onClick={() => setShowRatingModal(false)}
              className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors duration-200"
            >
              ✕
            </button>

            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                ¿Cómo calificarías Mi Caja?
              </h3>
              <p className="text-gray-200 text-sm mb-6">
                Tu opinión nos ayuda a mejorar
              </p>

              {/* Estrellas interactivas */}
              <div className="mb-6">
                {renderStars(0, true, 'text-3xl')}
                {rating > 0 && (
                  <p className="text-gray-200 text-sm mt-2">
                    {rating === 1 && 'Muy malo'}
                    {rating === 2 && 'Malo'}
                    {rating === 3 && 'Regular'}
                    {rating === 4 && 'Bueno'}
                    {rating === 5 && 'Excelente'}
                  </p>
                )}
              </div>

              {/* Comentario opcional */}
              <div className="mb-6">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tu comentario será público"
                  className="w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    backdropFilter: 'blur(5px)'
                  }}
                  rows="3"
                  maxLength="200"
                />
                <p className="text-gray-300 text-xs mt-1 text-right">
                  {comment.length}/200
                </p>
              </div>

              {/* Botones */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="flex-1 py-2 px-4 rounded-lg transition-all duration-200 font-medium"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(5px)'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={rating === 0 || isSubmitting}
                  className="flex-1 py-2 px-4 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: rating > 0 ? '#4ade80' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: rating > 0 ? '0 4px 14px rgba(74, 222, 128, 0.4)' : 'none'
                  }}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </div>
                  ) : (
                    'Enviar Calificación'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 