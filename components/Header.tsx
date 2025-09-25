import React, { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Youtube, Linkedin } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import type { User } from '../types';
import { UserRole } from '../types';
import UnifiedNotificationBell from './UnifiedNotificationBell';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const { theme } = useTheme();

  const visibleNavLinks = NAV_LINKS.filter(link => !isAdminPage);

  const socialLinks = [
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/nadanaloga_chennai/',
      icon: Instagram,
      color: 'from-pink-500 to-purple-600',
      brandColor: 'text-pink-500 hover:text-pink-600'
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/bharathanaatiyam',
      icon: Facebook,
      color: 'from-blue-600 to-blue-700',
      brandColor: 'text-blue-600 hover:text-blue-700'
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@Nadanaloga',
      icon: Youtube,
      color: 'from-red-600 to-red-700',
      brandColor: 'text-red-500 hover:text-red-600'
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/nadanaloga-fine-arts-school-0431b6324/',
      icon: Linkedin,
      color: 'from-blue-700 to-blue-800',
      brandColor: 'text-blue-700 hover:text-blue-800'
    }
  ];

  const getDashboardPath = () => {
    if (!currentUser) return "/";
    switch (currentUser.role) {
      case UserRole.Admin: return "/admin/dashboard";
      case UserRole.Student: return "/dashboard/student";
      case UserRole.Teacher: return "/dashboard/teacher";
      default: return "/";
    }
  };
  
  const displayName = currentUser ? (currentUser.role === UserRole.Student && currentUser.fatherName ? currentUser.fatherName : currentUser.name) : '';

  const headerStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    borderBottom: theme === 'dark' 
      ? '1px solid rgba(75, 85, 99, 0.3)'
      : '1px solid rgba(199, 210, 254, 0.3)'
  };

  const logoStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
  };

  const outlineButtonStyle = {
    border: '2px solid transparent',
    background: theme === 'dark'
      ? 'linear-gradient(rgb(17, 24, 39), rgb(17, 24, 39)) padding-box, linear-gradient(135deg, #667eea, #764ba2) border-box'
      : 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea, #764ba2) border-box',
    transition: 'all 0.3s ease'
  };

  return (
    <header style={headerStyle} className="sticky top-0 z-40 border-0">
      {/* Row 1: Brand and User Info */}
      <div className="container mx-auto px-6 py-2">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          <NavLink to="/" className="flex items-center space-x-2 hover:scale-105 transition-transform duration-300">
            <img
              src="/danceImages/Nadanaloga.png"
              alt="Nadanaloga Academy"
              className="h-8 w-auto"
            />
            <span style={logoStyle} className="text-lg font-bold">
              Nadanaloga
            </span>
          </NavLink>

          {/* User Info and Social - Desktop Only */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Social Media Icons */}
            <div className="flex items-center space-x-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <social.icon className={`w-4 h-4 ${social.brandColor} transition-colors duration-300`} strokeWidth={1.5} />
                  <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-2 py-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-black'} text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50`}>
                    {social.name}
                  </div>
                </motion.a>
              ))}
            </div>

            {/* User Actions */}
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <UnifiedNotificationBell user={currentUser} />
                <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} text-sm font-medium`}>
                  Welcome, {displayName.split(' ')[0]}!
                </span>
                <button 
                  onClick={onLogout} 
                  style={outlineButtonStyle}
                  className="text-indigo-600 font-semibold px-4 py-1.5 text-sm rounded-lg hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white hover:shadow-lg hover:-translate-y-0.5"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={onLoginClick} 
                  className={`px-4 py-1.5 text-sm ${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} transition-colors duration-300 font-medium`}
                >
                  Login
                </button>
                <Link 
                  to="/register" 
                  style={buttonStyle}
                  className="text-white font-semibold px-4 py-1.5 text-sm rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: User Info Only */}
          <div className="md:hidden flex items-center space-x-3">
            {currentUser && (
              <>
                <UnifiedNotificationBell user={currentUser} />
                <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} text-sm font-medium`}>
                  {displayName.split(' ')[0]}
                </span>
              </>
            )}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className={`${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'} focus:outline-none p-2 rounded-lg transition-all duration-300`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Navigation - Desktop Only */}
      <div className="hidden md:block border-t border-opacity-20 border-gray-300 dark:border-gray-600">
        <nav className="container mx-auto px-6 py-2">
          <div className="flex justify-center items-center space-x-8">
            {visibleNavLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} transition-all duration-300 font-medium text-sm relative ${
                    isActive ? `${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-600 after:to-purple-600` : ''
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
            {currentUser && (
              <NavLink
                to={getDashboardPath()}
                className={({ isActive }) =>
                  `${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} transition-all duration-300 font-medium text-sm relative ${
                    isActive ? `${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-600 after:to-purple-600` : ''
                  }`
                }
              >
                Dashboard
              </NavLink>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div 
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            borderTop: theme === 'dark'
              ? '1px solid rgba(75, 85, 99, 0.3)'
              : '1px solid rgba(199, 210, 254, 0.3)'
          }}
          className="md:hidden px-6 pb-6"
        >
          <div className="flex flex-col space-y-4">
            {visibleNavLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} py-3 px-4 rounded-lg transition-all duration-300 font-medium ${
                    isActive ? `${theme === 'dark' ? 'text-indigo-400 bg-gray-800' : 'text-indigo-600 bg-indigo-50'}` : `${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-indigo-50'}`
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
             {currentUser && (
                <NavLink
                  to={getDashboardPath()}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} py-3 px-4 rounded-lg transition-all duration-300 font-medium ${
                      isActive ? `${theme === 'dark' ? 'text-indigo-400 bg-gray-800' : 'text-indigo-600 bg-indigo-50'}` : `${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-indigo-50'}`
                    }`
                  }
                >
                  Dashboard
                </NavLink>
             )}
            
            {/* Social Media Icons - Mobile */}
            <div className={`pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-indigo-100'}`}>
              <div className="flex items-center justify-center space-x-6 mb-4">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <social.icon className={`w-6 h-6 ${social.brandColor} transition-colors duration-300`} strokeWidth={1.5} />
                  </motion.a>
                ))}
              </div>
            </div>
            
            <div className={`flex flex-col space-y-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-indigo-100'}`}>
              {currentUser ? (
                <>
                  <span className={`px-4 py-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} font-medium`}>Welcome, {displayName.split(' ')[0]}!</span>
                  <button 
                    onClick={() => { onLogout(); setIsMenuOpen(false); }} 
                    style={outlineButtonStyle}
                    className="text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white transition-all duration-300"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => { onLoginClick(); setIsMenuOpen(false); }} 
                    className={`px-6 py-3 ${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'} rounded-xl text-left font-medium transition-all duration-300`}
                  >
                    Login
                  </button>
                  <Link 
                    to="/register" 
                    onClick={() => setIsMenuOpen(false)} 
                    style={buttonStyle}
                    className="text-white font-semibold px-6 py-3 rounded-xl text-center hover:shadow-lg transition-all duration-300"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
