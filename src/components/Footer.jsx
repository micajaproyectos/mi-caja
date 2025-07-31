import React from 'react';

const Footer = ({ 
  title = "Sistema de Gestión Completo",
  description = "Control total de tu negocio con herramientas intuitivas y reportes detallados",
  className = "" 
}) => {
  return (
    <div className={`mt-6 sm:mt-8 lg:mt-16 text-center px-2 sm:px-4 lg:px-0 ${className}`}>
      <div className="bg-white/5 backdrop-blur-md rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-700">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3 lg:mb-4">
          {title}
        </h2>
        <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-300">
          {description}
        </p>
      </div>
    </div>
  );
};

export default Footer; 