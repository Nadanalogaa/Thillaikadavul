import React, { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { NAV_LINKS } from '../constants';
import type { User } from '../types';
import { UserRole } from '../types';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  const visibleNavLinks = NAV_LINKS.filter(link => !isAdminPage);

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
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(199, 210, 254, 0.3)'
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
    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea, #764ba2) border-box',
    transition: 'all 0.3s ease'
  };

  return (
    <header style={headerStyle} className="sticky top-0 z-40 border-0">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <NavLink to="/" style={logoStyle} className="text-2xl font-bold hover:scale-105 transition-transform duration-300">
          Thillaikadavul
        </NavLink>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          {visibleNavLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `text-gray-700 hover:text-indigo-600 transition-all duration-300 font-medium relative ${
                  isActive ? 'text-indigo-600 after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-600 after:to-purple-600' : ''
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
                `text-gray-700 hover:text-indigo-600 transition-all duration-300 font-medium relative ${
                  isActive ? 'text-indigo-600 after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-600 after:to-purple-600' : ''
                }`
              }
            >
              Dashboard
            </NavLink>
          )}
        </div>

        <div className="hidden md:flex items-center space-x-4">
          {currentUser ? (
            <>
              <NotificationBell />
              <span className="text-gray-700 ml-2 font-medium">Welcome, {displayName.split(' ')[0]}!</span>
              <button 
                onClick={onLogout} 
                style={outlineButtonStyle}
                className="text-indigo-600 font-semibold px-6 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white hover:shadow-lg hover:-translate-y-0.5"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={onLoginClick} 
                className="px-6 py-2.5 text-gray-700 hover:text-indigo-600 transition-colors duration-300 font-medium"
              >
                Login
              </button>
              <Link 
                to="/register" 
                style={buttonStyle}
                className="text-white font-semibold px-6 py-2.5 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center space-x-4">
            {currentUser && <NotificationBell />}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="text-gray-700 hover:text-indigo-600 focus:outline-none p-2 rounded-lg hover:bg-indigo-50 transition-all duration-300"
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
                </svg>
            </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(199, 210, 254, 0.3)'
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
                  `text-gray-700 hover:text-indigo-600 py-3 px-4 rounded-lg transition-all duration-300 font-medium ${
                    isActive ? 'text-indigo-600 bg-indigo-50' : 'hover:bg-indigo-50'
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
                    `text-gray-700 hover:text-indigo-600 py-3 px-4 rounded-lg transition-all duration-300 font-medium ${
                      isActive ? 'text-indigo-600 bg-indigo-50' : 'hover:bg-indigo-50'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
             )}
            <div className="flex flex-col space-y-4 pt-4 border-t border-indigo-100">
              {currentUser ? (
                <>
                  <span className="px-4 py-2 text-gray-700 font-medium">Welcome, {displayName.split(' ')[0]}!</span>
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
                    className="px-6 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-left font-medium transition-all duration-300"
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