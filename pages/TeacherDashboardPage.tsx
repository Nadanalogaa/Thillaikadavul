
import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import type { User } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

// --- SVG Icons for Sidebar ---
const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{children}</svg>
);
const DashboardIcon = () => <IconWrapper><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></IconWrapper>;
const ProfileIcon = () => <IconWrapper><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></IconWrapper>;
const CoursesIcon = () => <IconWrapper><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></IconWrapper>;
const BookMaterialsIcon = () => <IconWrapper><path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></IconWrapper>;
const EventsIcon = () => <IconWrapper><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></IconWrapper>;
const NoticeIcon = () => <IconWrapper><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></IconWrapper>;
const PaymentHistoryIcon = () => <IconWrapper><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></IconWrapper>;
const LogoutIcon = () => <IconWrapper><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></IconWrapper>;

interface TeacherDashboardPageProps {
    user: User;
    onLogout: () => void;
    onUpdate: (user: User) => void;
}

// --- Sidebar Component ---
const Sidebar: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { theme } = useTheme();
    const NAV_ITEMS = [
        { name: 'Dashboard', path: '/dashboard/teacher', icon: DashboardIcon, end: true },
        { name: 'Profile', path: 'profile', icon: ProfileIcon },
        { name: 'Your Courses', path: 'courses', icon: CoursesIcon },
        { name: 'Book Materials', path: 'book-materials', icon: BookMaterialsIcon },
        { name: 'Events', path: 'events', icon: EventsIcon },
        { name: 'Notice', path: 'notice', icon: NoticeIcon },
        { name: 'Payment History', path: 'payment-history', icon: PaymentHistoryIcon },
    ];
    
    return (
        <aside className={`w-64 shadow-lg flex-col hidden lg:flex transition-colors duration-300 ${
            theme === 'dark' 
                ? 'bg-gray-800/90 backdrop-blur-sm border-r border-gray-700/50' 
                : 'bg-white/90 backdrop-blur-sm border-r border-gray-200/50'
        }`}>
            {/* Logo Section - Compact */}
            <div className="px-6 py-4 border-b border-opacity-20 border-gray-300 dark:border-gray-600">
                <div className="flex items-center space-x-2">
                    <img
                        src="/danceImages/responsive/large/Logo.webp"
                        alt="Nadanaloga Academy"
                        className="h-8 w-auto"
                    />
                    <span className={`text-lg font-bold transition-colors duration-300 ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-brand-primary'
                    }`} style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>Nadanaloga</span>
                </div>
            </div>
            <nav className="flex-grow px-4 py-2">
                <ul className="space-y-1">
                    {NAV_ITEMS.map(item => (
                        <li key={item.name}>
                            <NavLink 
                                to={item.path} 
                                end={item.end}
                                className={({isActive}) => {
                                    if (isActive) {
                                        return `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 text-sm font-medium ${
                                            theme === 'dark' 
                                                ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg'
                                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                                        }`;
                                    }
                                    return `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 text-sm font-medium ${
                                        theme === 'dark'
                                            ? 'text-gray-300 hover:bg-emerald-900/30 hover:text-white'
                                            : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-600'
                                    }`;
                                }}
                            >
                                <item.icon />
                                <span>{item.name}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            
            {/* Footer Section */}
            <div className="px-4 py-3 border-t border-opacity-20 border-gray-300 dark:border-gray-600 space-y-2">
                {/* Theme Toggle */}
                <div className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                }`}>
                    <ThemeToggle />
                </div>
                
                {/* Logout Button */}
                <button 
                    onClick={onLogout} 
                    className={`flex items-center w-full space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 text-sm font-medium ${
                        theme === 'dark'
                            ? 'text-gray-300 hover:bg-red-900/30 hover:text-red-400'
                            : 'text-gray-700 hover:bg-red-100 hover:text-red-600'
                    }`}
                >
                    <LogoutIcon />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

const TeacherDashboardPage: React.FC<TeacherDashboardPageProps> = ({ user, onLogout, onUpdate }) => {
    const { theme } = useTheme();
    
    return (
        <div className={`flex min-h-screen font-sans transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-background'
        }`}>
            <Sidebar onLogout={onLogout} />
            <main className="flex-1 overflow-y-auto">
                <Outlet context={{ user, onUpdate }} />
            </main>
        </div>
    );
};

export default TeacherDashboardPage;
