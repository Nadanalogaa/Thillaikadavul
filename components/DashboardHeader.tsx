import React from 'react';
import { motion } from 'framer-motion';
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full"
                    animate={{
                        y: [0, -30, 0],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-1/3 left-10 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-lg rotate-12"
                    animate={{
                        y: [0, 20, 0],
                        rotate: [12, 25, 12],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full"
                    animate={{
                        y: [0, -25, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                
                {/* Background Pattern Dots */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-300/40 dark:bg-purple-600/40 rounded-full"></div>
                    <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-pink-300/40 dark:bg-pink-600/40 rounded-full"></div>
                    <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-blue-300/40 dark:bg-blue-600/40 rounded-full"></div>
                    <div className="absolute top-2/3 left-1/5 w-2 h-2 bg-indigo-300/40 dark:bg-indigo-600/40 rounded-full"></div>
                </div>
            </div>

            {/* Header Section */}
            {(showWelcome || pageTitle) && (
                <div className="relative z-10 px-6 py-4">
                    <div className="flex justify-between items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            className="flex flex-col"
                        >
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
                        </motion.div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="relative z-10 pb-6">
                {children}
            </div>
        </div>
    );
};

export default DashboardHeader;