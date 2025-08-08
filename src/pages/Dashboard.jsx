import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/authService.js';

const Dashboard = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setNombreUsuario(userData?.nombre || '');
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        setNombreUsuario('');
      }
    };
    loadUserData();
  }, []);

  // El manejo de cierre de sesión ahora está en el menú del NavBar

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#1a3d1a' }}>
      {/* Fondo degradado moderno - igual que Home */}
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

      {/* Efecto de vidrio esmerilado adicional */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/5"></div>

      {/* Contenido principal */}
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header sin botón; el cierre de sesión está en la barra superior */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Bienvenido, {nombreUsuario}!
              </h1>
              <p className="text-gray-300 italic">Aquí verás un resumen de tu negocio</p>
            </div>
          </div>
          
          {/* Cards de módulos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              className="p-6 rounded-2xl transition-all duration-200 transform hover:scale-105"
              style={{
                backgroundColor: 'rgba(31, 74, 31, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 className="text-xl font-semibold text-white mb-3 drop-shadow-sm">Ventas</h3>
              <p className="text-gray-300">Gestiona tus ventas diarias</p>
            </div>
            
            <div 
              className="p-6 rounded-2xl transition-all duration-200 transform hover:scale-105"
              style={{
                backgroundColor: 'rgba(31, 74, 31, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 className="text-xl font-semibold text-white mb-3 drop-shadow-sm">Inventario</h3>
              <p className="text-gray-300">Controla tu stock</p>
            </div>
            
            <div 
              className="p-6 rounded-2xl transition-all duration-200 transform hover:scale-105"
              style={{
                backgroundColor: 'rgba(31, 74, 31, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 className="text-xl font-semibold text-white mb-3 drop-shadow-sm">Gastos</h3>
              <p className="text-gray-300">Registra tus gastos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;