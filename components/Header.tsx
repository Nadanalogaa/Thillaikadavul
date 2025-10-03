import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  GraduationCap,
  Music,
  Mic,
  Palette,
  Calculator,
  BookOpen,
  Users,
  Trophy,
  Guitar,
  Piano,
  Heart,
  Sparkles,
  Phone,
  Mail
} from 'lucide-react';
import { MessageCircle } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import type { User } from '../types';
import { UserRole } from '../types';
import UnifiedNotificationBell from './UnifiedNotificationBell';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCoursesDropdownOpen, setIsCoursesDropdownOpen] = useState(false);
  const [isMobileCoursesOpen, setIsMobileCoursesOpen] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const { theme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [menuOffset, setMenuOffset] = useState(0);

  const visibleNavLinks = NAV_LINKS.filter(link => !isAdminPage);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCoursesDropdownOpen(false);
      }
    };

    if (isCoursesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCoursesDropdownOpen]);

  const updateMenuOffset = React.useCallback(() => {
    if (headerRef.current) {
      setMenuOffset(headerRef.current.getBoundingClientRect().height);
    }
  }, []);

  useEffect(() => {
    updateMenuOffset();
    window.addEventListener('resize', updateMenuOffset);
    return () => window.removeEventListener('resize', updateMenuOffset);
  }, [updateMenuOffset]);

  useEffect(() => {
    if (isMenuOpen) {
      updateMenuOffset();
    }
  }, [isMenuOpen, updateMenuOffset]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow || '';
    }

    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, [isMenuOpen]);

  const courseMenuItems = [
    { name: 'All Courses', path: '/courses', icon: <GraduationCap className="w-4 h-4" /> },
    { name: 'Bharatanatyam', path: '/courses/bharatanatyam', icon: <Music className="w-4 h-4" /> },
    { name: 'Classical Vocal', path: '/courses/classical-vocal', icon: <Mic className="w-4 h-4" /> },
    { name: 'Drawing', path: '/courses/drawing', icon: <Palette className="w-4 h-4" /> },
    { name: 'Abacus', path: '/courses/abacus', icon: <Calculator className="w-4 h-4" /> },
    { name: 'Phonics', path: '/courses/phonics', icon: <BookOpen className="w-4 h-4" /> },
    { name: 'Private Class (1 to 1)', path: '/private-class', icon: <Heart className="w-4 h-4" /> },
    { name: 'Class for Adults', path: '/courses/adults', icon: <Users className="w-4 h-4" /> },
    { name: 'Performance Workshops', path: '/performance-workshops', icon: <Trophy className="w-4 h-4" /> },
    { name: 'Instrument', path: '/courses/instrument', icon: <Guitar className="w-4 h-4" /> },
    { name: 'Western Classes', path: '/courses/western', icon: <Piano className="w-4 h-4" /> }
  ];

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

  const mobileActionBarStyle = {
    background: theme === 'dark'
      ? 'rgba(17, 24, 39, 0.96)'
      : 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(12px)',
    borderTop: theme === 'dark'
      ? '1px solid rgba(75, 85, 99, 0.45)'
      : '1px solid rgba(199, 210, 254, 0.6)'
  };

  return (
    <header ref={headerRef} style={headerStyle} className="sticky top-0 z-40 border-0">
      {/* Row 1: Brand and User Info */}
      <div className="w-full px-4 sm:px-6 py-1.5 sm:py-2">
        <div className="flex items-center justify-between w-full">
          {/* Logo, Theme Toggle */}
          <div className="flex items-center gap-3 sm:gap-4 mr-auto">
            <NavLink to="/" className="flex items-center hover:scale-105 transition-transform duration-300">
              <img
                src="/danceImages/Nadanaloga.png"
                alt="Nadanaloga Academy"
                className="h-10 sm:h-14 md:h-16 w-auto"
              />
            </NavLink>
            <ThemeToggle className="p-1.5 sm:p-2.5 md:p-3 text-indigo-600 dark:text-indigo-200" />
          </div>

          {/* User Info and Social - Desktop Only */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Contact Information */}
            <div className="flex items-center space-x-4 mr-2 text-xs">
              {/* Phone Numbers */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <a
                    href="https://wa.me/919566866588"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 transition-colors"
                    title="WhatsApp +91 95668 66588"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <a
                    href="tel:+919566866588"
                    className={`${theme === 'dark' ? 'text-gray-300 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} transition-colors flex items-center space-x-1`}
                    title="Call +91 95668 66588"
                  >
                    <Phone className="w-3 h-3" />
                    <span className="font-medium">+91 95668 66588</span>
                  </a>
                </div>

                <div className="flex items-center space-x-1">
                  <a
                    href="https://wa.me/919092908888"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 transition-colors"
                    title="WhatsApp +91 90929 08888"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <a
                    href="tel:+919092908888"
                    className={`${theme === 'dark' ? 'text-gray-300 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} transition-colors flex items-center space-x-1`}
                    title="Call +91 90929 08888"
                  >
                    <Phone className="w-3 h-3" />
                    <span className="font-medium">+91 90929 08888</span>
                  </a>
                </div>
              </div>

              {/* Email */}
              <a
                href="mailto:nadanalogaa@gmail.com"
                className={`${theme === 'dark' ? 'text-gray-300 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} transition-colors flex items-center space-x-1`}
                title="Email us"
              >
                <Mail className="w-3 h-3" />
                <span className="font-medium">nadanalogaa@gmail.com</span>
              </a>
            </div>

            {/* Divider */}
            <div className={`h-6 w-px ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

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

            {/* Divider */}
            <div className={`h-6 w-px ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

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
          <div className="lg:hidden flex items-center space-x-2">
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
      <div className="hidden lg:block border-t border-opacity-20 border-gray-300 dark:border-gray-600">
        <nav className="container mx-auto px-6 py-2">
          <div className="flex justify-center items-center space-x-8">
            {visibleNavLinks.map((link) => {
              if (link.name === 'Our Courses') {
                return (
                  <div
                    key={link.name}
                    className="relative"
                    ref={dropdownRef}
                  >
                    <button
                      onClick={() => setIsCoursesDropdownOpen(!isCoursesDropdownOpen)}
                      className={`${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'} transition-all duration-300 font-medium text-sm relative flex items-center gap-1 ${
                        location.pathname.startsWith('/courses') || location.pathname === '/private-class' || location.pathname === '/performance-workshops'
                          ? `${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-600 after:to-purple-600`
                          : ''
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 mr-1" />
                      {link.name}
                      <svg
                        className={`w-4 h-4 ml-1 transition-transform duration-200 ${isCoursesDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isCoursesDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute top-full left-0 mt-2 w-72 ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                        } border rounded-lg shadow-xl py-2 z-50`}
                      >
                        {courseMenuItems.map((courseItem) => {
                          const isCurrentPage = location.pathname === courseItem.path;
                          return (
                            <Link
                              key={courseItem.name}
                              to={courseItem.path}
                              onClick={() => setIsCoursesDropdownOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-md mx-2 ${
                                isCurrentPage
                                  ? theme === 'dark'
                                    ? 'bg-indigo-900 text-indigo-300 border-l-2 border-indigo-400'
                                    : 'bg-indigo-100 text-indigo-700 border-l-2 border-indigo-500'
                                  : theme === 'dark'
                                    ? 'text-gray-200 hover:bg-gray-700 hover:text-indigo-400'
                                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                              }`}
                            >
                              <span className={`${isCurrentPage ? 'text-indigo-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {courseItem.icon}
                              </span>
                              <span className="font-medium">{courseItem.name}</span>
                              {isCurrentPage && (
                                <Sparkles className="w-3 h-3 text-indigo-500 ml-auto" />
                              )}
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                );
              }

              return (
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
              );
            })}
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
              : '1px solid rgba(199, 210, 254, 0.3)',
            top: menuOffset,
            height: `calc(100vh - ${Math.max(menuOffset, 0)}px)`
          }}
          className="lg:hidden fixed inset-x-0 z-40 px-4 pb-5 overflow-y-auto"
        >
          <div className="flex flex-col space-y-4 pb-24 pt-4">
            {visibleNavLinks.map((link) => {
              if (link.name === 'Our Courses') {
                return (
                  <div key={link.name}>
                    <button
                      onClick={() => setIsMobileCoursesOpen(!isMobileCoursesOpen)}
                      className={`w-full text-left py-2.5 px-4 rounded-lg transition-all duration-300 font-medium flex items-center justify-between ${
                        location.pathname.startsWith('/courses') || location.pathname === '/private-class' || location.pathname === '/performance-workshops'
                          ? `${theme === 'dark' ? 'text-indigo-400 bg-gray-800' : 'text-indigo-600 bg-indigo-50'}`
                          : `${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'}`
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        {link.name}
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isMobileCoursesOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isMobileCoursesOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-2 ml-4 space-y-2"
                      >
                        {courseMenuItems.map((courseItem) => {
                          const isCurrentPage = location.pathname === courseItem.path;
                          return (
                            <Link
                              key={courseItem.name}
                              to={courseItem.path}
                              onClick={() => {
                                setIsMenuOpen(false);
                                setIsMobileCoursesOpen(false);
                              }}
                              className={`flex items-center gap-3 py-2.5 px-4 rounded-lg text-sm transition-all duration-200 ${
                                isCurrentPage
                                  ? theme === 'dark'
                                    ? 'bg-indigo-900 text-indigo-300 border-l-2 border-indigo-400'
                                    : 'bg-indigo-100 text-indigo-700 border-l-2 border-indigo-500'
                                  : theme === 'dark'
                                    ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-800'
                                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                              }`}
                            >
                              <span className={`${isCurrentPage ? 'text-indigo-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {courseItem.icon}
                              </span>
                              <span className="font-medium flex-1">{courseItem.name}</span>
                              {isCurrentPage && (
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                              )}
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                );
              }

              return (
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
              );
            })}
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

            {/* Contact Information - Mobile */}
            <div className={`pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-indigo-100'}`}>
              <div className="space-y-3">
                {/* Phone Numbers */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-opacity-50">
                    <a
                      href="tel:+919566866588"
                      className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} flex items-center space-x-2 text-sm`}
                    >
                      <Phone className="w-4 h-4" />
                      <span>+91 95668 66588</span>
                    </a>
                    <a
                      href="https://wa.me/919566866588"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-opacity-50">
                    <a
                      href="tel:+919092908888"
                      className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} flex items-center space-x-2 text-sm`}
                    >
                      <Phone className="w-4 h-4" />
                      <span>+91 90929 08888</span>
                    </a>
                    <a
                      href="https://wa.me/919092908888"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                {/* Email */}
                <a
                  href="mailto:nadanalogaa@gmail.com"
                  className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} flex items-center space-x-2 px-4 py-2 text-sm`}
                >
                  <Mail className="w-4 h-4" />
                  <span>nadanalogaa@gmail.com</span>
                </a>
              </div>
            </div>

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
          </div>

          <div
            className="sticky bottom-0 left-0 right-0 -mx-4 px-4 sm:-mx-6 sm:px-6"
            style={mobileActionBarStyle}
          >
            <div className="flex flex-col gap-3 py-4">
              {currentUser ? (
                <>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    Welcome, {displayName.split(' ')[0]}!
                  </span>
                  <button
                    onClick={() => { onLogout(); setIsMenuOpen(false); }}
                    style={outlineButtonStyle}
                    className="w-full text-indigo-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white transition-all duration-300"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
                      className={`w-1/2 px-4 py-2.5 ${theme === 'dark' ? 'text-gray-200 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'} rounded-xl text-center font-medium transition-all duration-300`}
                    >
                      Login
                    </button>
                    <Link
                      to="/register"
                      onClick={() => setIsMenuOpen(false)}
                      style={buttonStyle}
                      className="w-1/2 text-white font-semibold px-4 py-2.5 rounded-xl text-center hover:shadow-lg transition-all duration-300"
                    >
                      Register
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
