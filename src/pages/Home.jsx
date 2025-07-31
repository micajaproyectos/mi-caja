import React from 'react';
import Header from '../components/Header';
import QuickAccess from '../components/QuickAccess';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      
      {/* Animated gradient layers for depth and movement */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/5 via-transparent to-purple-900/5 animate-subtle-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-gray-800/10 via-transparent to-gray-900/10 animate-gentle-float"></div>
      
      {/* Subtle moving gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-800/3 to-transparent animate-slow-drift"></div>
      
      {/* Additional depth layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-transparent to-black/20 animate-subtle-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-black/5 backdrop-blur-sm"></div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header Component */}
        <Header />

        {/* Quick Access Component */}
        <QuickAccess />

        {/* Footer Component */}
        <Footer />
      </div>
    </div>
  );
};

export default Home;
