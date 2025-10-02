
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface AdminPageHeaderProps {
    title: string;
    subtitle?: string;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, subtitle }) => {
    const { theme } = useTheme();

    return (
        <div className="mb-4 sm:mb-6">
            <h1 className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
            `}>
                {title}
            </h1>
            {subtitle && (
                <p className={`text-sm sm:text-base
                    ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}
                `}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default AdminPageHeader;
