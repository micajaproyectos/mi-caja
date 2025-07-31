import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModuleCard from './ModuleCard';

const QuickAccess = ({ 
  items = [], 
  title = "Accesos Rápidos", 
  subtitle = "Accede rápidamente a las funciones principales",
  onItemClick,
  showViewAllButton = true,
  className = "" 
}) => {
  const navigate = useNavigate();

  // Items por defecto si no se proporcionan
  const defaultItems = [
    { name: 'Ventas', icon: '💰', description: 'Gestionar ventas', href: '/ventas' },
    { name: 'Inventario', icon: '📦', description: 'Control de stock', href: '/inventario' },
    { name: 'Empleados', icon: '👥', description: 'Gestión de personal', href: '/empleados' },
    { name: 'Gastos', icon: '💸', description: 'Control de gastos', href: '/gastos' },
    { name: 'Reportes', icon: '📊', description: 'Análisis y estadísticas', href: '/reportes' },
    { name: 'Proveedores', icon: '🤝', description: 'Gestión de proveedores', href: '/proveedores' },
  ];

  const displayItems = items.length > 0 ? items : defaultItems;

  const handleItemClick = (href) => {
    if (onItemClick) {
      onItemClick(href);
    } else if (href && href !== '#') {
      navigate(href);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header Section */}
      <div className="text-center mb-6 sm:mb-8 lg:mb-12 px-2 sm:px-4 lg:px-0">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3 lg:mb-4">
          {title}
        </h2>
        <p className="text-xs sm:text-sm lg:text-lg text-gray-300 max-w-2xl mx-auto">
          {subtitle}
        </p>
      </div>

      {/* Grid Container - Improved responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 px-2 sm:px-4 lg:px-0">
        {displayItems.map((item, index) => (
          <ModuleCard
            key={index}
            name={item.name}
            icon={item.icon}
            description={item.description}
            href={item.href}
            onClick={handleItemClick}
          />
        ))}
      </div>

      {/* Optional: Add a "View All" button */}
      {showViewAllButton && (
        <div className="text-center mt-6 sm:mt-8 px-2 sm:px-4 lg:px-0">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors duration-200 hover:shadow-lg hover:shadow-blue-500/25 text-xs sm:text-sm lg:text-base">
            Ver Todos los Módulos
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickAccess; 