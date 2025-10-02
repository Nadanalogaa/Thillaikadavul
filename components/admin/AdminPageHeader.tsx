import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface AdminPageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, subtitle, action }) => {
    const { theme } = useTheme();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            {/* Title and Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                <h1 className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                    {title}
                </h1>
                {subtitle && (
                    <>
                        <span className={`hidden sm:inline text-gray-400`}>•</span>
                        <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            {subtitle}
                        </p>
                    </>
                )}
            </div>

            {/* Action Button */}
            {action && (
                <div className="flex-shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
};

export default AdminPageHeader;
