
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface StatCardProps {
    title: string;
    value: number | string;
    isLink?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, isLink }) => {
    const { theme } = useTheme();

    const cardClasses = `
        ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
        p-3 sm:p-6 rounded-lg sm:rounded-xl shadow-md
        flex flex-col justify-between h-full
        ${isLink ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''}
        ${isLink && theme === 'dark' ? 'hover:bg-gray-750' : ''}
    `;

    return (
        <div className={cardClasses}>
            <h3 className={`text-[10px] sm:text-sm font-medium uppercase tracking-wide sm:tracking-wider mb-1 sm:mb-2
                ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
            `}>
                {title}
            </h3>
            <p className={`text-xl sm:text-3xl font-bold
                ${theme === 'dark' ? 'text-brand-light' : 'text-brand-primary'}
            `}>
                {value}
            </p>
        </div>
    );
};

export default StatCard;
