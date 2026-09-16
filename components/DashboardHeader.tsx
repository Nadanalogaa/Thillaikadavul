import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardHeaderProps {
    userName: string;
    userRole: 'Teacher' | 'Student' | 'Guardian';
    pageTitle?: string;
    pageSubtitle?: string;
    children: React.ReactNode;
    showWelcome?: boolean; // New prop to control welcome message
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
    userName, 
    userRole, 
    pageTitle, 
    pageSubtitle,
    children,
    showWelcome = false 
}) => {
    const { theme } = useTheme();
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const firstName = userName?.split(' ')[0] || userRole;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header Section */}
            {(showWelcome || pageTitle) && (
                <div className="px-6 py-5">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            {showWelcome && (
                                <>
                                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                        Welcome back, {firstName}!
                                    </h1>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {dateString}
                                    </p>
                                </>
                            )}
                            {pageTitle && !showWelcome && (
                                <div>
                                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {pageTitle}
                                    </h1>
                                    {pageSubtitle && (
                                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {pageSubtitle}
                                        </p>
                                    )}
                                </div>
                            )}
                            {pageTitle && showWelcome && (
                                <div className="mt-3">
                                    <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {pageTitle}
                                    </h2>
                                    {pageSubtitle && (
                                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {pageSubtitle}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="pb-6">
                {children}
            </div>
        </div>
    );
};

export default DashboardHeader;