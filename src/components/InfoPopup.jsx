import React, { useState, useEffect } from 'react';

const InfoPopup = ({ item, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar el popup con una pequeña animación
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150); // Esperar a que termine la animación
  };

  // Definir descripciones para cada componente
  const getDescription = (id) => {
    const descriptions = {
      'ventas': 'Registra todas las ventas diarias de tu negocio. Controla productos, cantidades, precios y formas de pago de manera organizada. Si realizas una venta, se descontará desde tu inventario actual.',
      'asistencia': 'Controla el registro de entrada y salida de tus trabajadores. Gestiona la cantidad de horas laborales.',
      'gastos': 'Registra y categoriza todos los gastos de tu negocio. Mantén control total sobre tus egresos y presupuesto.',
      'inventario': 'Agrega productos a tu inventario con precios, costos y cantidades. Base fundamental para el control de stock.',
      'proveedores': 'Administra la información de tus proveedores. Contactos, productos que suministran y historial de compras.',
      'stock': 'Visualiza el inventario actual de todos tus productos. Genera las alertas de bajo stock, identifica el producto más vendido y encuentra los artículos que no se venden por +30 días.',
      'inventario-ia': 'Carga de manera automática tu inventario con procesamiento de IA. Agrega un PDF o JPG y el sistema reconocerá los productos para incluirlos en el inventario.',
      'clientes': 'Gestiona tu base de datos de clientes. Información de contacto, historial de compras y segmentación.',
      'pedidos': 'Crea y administra pedidos de tus clientes. Controla estado, productos solicitados y tiempos de entrega.',
      'insumos': 'Crea recetas con ingredientes y cantidades. Calcula automáticamente los insumos necesarios para producción.',
      'comunidad': 'Accede a recursos, tips y conecta con otros usuarios de Mi Caja. Comparte experiencias y aprende.',
      'seguimiento': 'Analiza el rendimiento de tu negocio con gráficos y reportes. Toma decisiones basadas en datos.',
      'venta-rapida': 'Sistema de ventas acelerado para transacciones rápidas. Ideal para quienes necesiten registrar ventas sin inventario.',
      'auditoria': 'Revisa todos los cambios y actividades realizadas en el sistema. Control completo de modificaciones.',
      'autoservicio': 'Abre otro punto de venta independiente para que tus clientes puedan realizar sus compras de manera más rápida y expedita, actualizando tu inventario actual.'
    };
    return descriptions[id] || 'Descripción no disponible.';
  };

  if (!item) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Fondo con blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Contenedor del popup */}
      <div className={`relative z-10 w-11/12 max-w-md p-6 rounded-2xl shadow-lg transform transition-all duration-150 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
           style={{
             backgroundColor: 'rgba(31, 74, 31, 0.95)',
             border: '1px solid rgba(255, 255, 255, 0.1)',
             backdropFilter: 'blur(10px)'
           }}>
        
        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 text-white text-lg font-semibold"
          title="Cerrar"
        >
          ✕
        </button>
        
        {/* Contenido del popup */}
        <div className="text-center">
          {/* Icono grande */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
              <span className="text-3xl">{item.icon}</span>
            </div>
          </div>

          {/* Título */}
          <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {item.label}
          </h3>
          
          {/* Descripción */}
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            {getDescription(item.id)}
          </p>

          {/* Botón de acción */}
          <button
            onClick={handleClose}
            className="px-6 py-2 rounded-lg transition-all font-medium"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.2)', 
              color: 'white', 
              border: '1px solid rgba(34, 197, 94, 0.3)' 
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoPopup;
