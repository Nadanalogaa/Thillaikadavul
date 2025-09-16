
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

type ModalSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: ModalSize;
}

const SIZES: { [key in ModalSize]: string } = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: '',
};


const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, size = 'md' }) => {
  if (!isOpen) return null;

  const { theme } = useTheme();
  const isFull = size === 'full';

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-60 z-50 ${isFull ? '' : 'flex justify-center items-center p-4'}`}
      onClick={onClose}
    >
      <div
        className={`${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } ${isFull ? 'w-full h-full' : `${
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
        } rounded-lg ${SIZES[size]}`} shadow-2xl relative animate-modal-fade-in-up w-full flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {!isFull && (
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 transition-colors z-20 ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-gray-200' 
                : 'text-gray-400 hover:text-gray-800'
            }`}
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className={isFull ? 'flex-grow' : 'p-6 flex-grow overflow-y-auto'}>
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;