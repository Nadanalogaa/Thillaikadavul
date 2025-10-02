import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { getCurrentUser, logout } from '../../api';
import type { User } from '../../types';
import AdminSidebar from './AdminSidebar';
import ThemeToggle from '../ThemeToggle';
import UnifiedNotificationBell from '../UnifiedNotificationBell';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { theme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await getCurrentUser();
                setCurrentUser(user);
            } catch (err) {
                console.error('Failed to fetch user:', err);
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Sidebar */}
            <AdminSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <div className="lg:pl-64 transition-all duration-300">
                {/* Top Admin Bar - Desktop */}
                <div className={`hidden lg:flex sticky top-0 z-10 items-center justify-between h-14 px-6 border-b ${
                    theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                }`}>
                    <div className="flex items-center space-x-3">
                        <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Admin Panel
                        </h2>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ThemeToggle />
                        {currentUser && <UnifiedNotificationBell currentUser={currentUser} />}
                        {currentUser && (
                            <div className="flex items-center space-x-3">
                                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span className="font-medium">{currentUser.name}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        theme === 'dark'
                                            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile header with menu button */}
                <div className={`lg:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 border-b ${
                    theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                }`}>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className={`p-2 rounded-md ${
                            theme === 'dark'
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h2 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Admin
                    </h2>
                    <div className="flex items-center space-x-2">
                        <ThemeToggle />
                        {currentUser && <UnifiedNotificationBell currentUser={currentUser} />}
                    </div>
                </div>

                {/* Page content */}
                <main className="p-3 sm:p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
