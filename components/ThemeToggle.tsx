import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  position?: 'fixed' | 'relative';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = "", 
  position = 'relative' 
}) => {
  const { theme, toggleTheme } = useTheme();

  const baseClasses = "bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 border border-gray-200 dark:border-gray-700";
  
  const positionClasses = position === 'fixed' 
    ? "fixed top-4 right-4 z-50" 
    : "relative z-10";

  return (
    <button
      onClick={toggleTheme}
      className={`${baseClasses} ${positionClasses} ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 animate-bounce-in" />
      ) : (
        <Sun className="w-5 h-5 animate-bounce-in" />
      )}
    </button>
  );
};

export default ThemeToggle;