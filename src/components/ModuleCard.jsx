import React from 'react';

const ModuleCard = ({ 
  name, 
  icon, 
  description, 
  href = '#', 
  onClick,
  className = "" 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(href);
    } else if (href && href !== '#') {
      window.location.href = href;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-6 text-center hover:bg-white/20 transition-all duration-300 cursor-pointer border border-gray-700 hover:border-gray-500 hover:shadow-xl hover:shadow-blue-500/20 transform hover:-translate-y-1 active:scale-95 ${className}`}
    >
      {/* Icon Container */}
      <div className="relative mb-1 sm:mb-2 lg:mb-4">
        <div className="text-2xl sm:text-3xl lg:text-5xl group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3">
          {icon}
        </div>
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-xs sm:text-sm lg:text-lg mb-1 sm:mb-2 group-hover:text-blue-300 transition-colors duration-300 leading-tight">
        {name}
      </h3>

      {/* Description */}
      <p className="text-gray-300 text-xs sm:text-sm group-hover:text-gray-200 transition-colors duration-300 leading-tight">
        {description}
      </p>

      {/* Hover indicator */}
      <div className="absolute top-1 sm:top-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-1 sm:w-1.5 lg:w-2 h-1 sm:h-1.5 lg:h-2 bg-blue-400 rounded-full"></div>
      </div>

      {/* Bottom border animation */}
      <div className="absolute bottom-0 left-0 w-0 h-0.5 sm:h-1 bg-gradient-to-r from-blue-400 to-purple-500 group-hover:w-full transition-all duration-300 rounded-b-lg sm:rounded-b-xl"></div>
    </div>
  );
};

export default ModuleCard; 