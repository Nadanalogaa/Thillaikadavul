import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ModalHeaderProps {
    title: string;
    subtitle?: string;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, subtitle }) => {
    const { theme } = useTheme();
    
    return (
        <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between">
                <h2 className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>{title}</h2>
                {subtitle && <p className={`mt-1 md:mt-0 md:ml-4 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>{subtitle}</p>}
            </div>
        </div>
    );
};

export default ModalHeader;
