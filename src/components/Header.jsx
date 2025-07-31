import React from 'react';

const Header = ({ 
  title = "Inicio", 
  subtitle = "Bienvenido al sistema de gestión de tu negocio. Accede rápidamente a todas las funciones principales.",
  className = "" 
}) => {
  return (
    <div className={`text-center mb-6 sm:mb-8 lg:mb-16 px-2 sm:px-4 lg:px-0 ${className}`}>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-3 lg:mb-4 tracking-tight leading-tight">
        {title}
      </h1>
      <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-300 max-w-2xl mx-auto">
        {subtitle}
      </p>
    </div>
  );
};

export default Header; 