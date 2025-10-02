import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { theme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
                {/* Mobile header with menu button */}
                <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 shadow-sm">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Admin Panel
                    </h2>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
