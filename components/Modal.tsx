
import React from 'react';

type ModalSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

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
  full: '',
};


const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, size = 'xl' }) => {
  if (!isOpen) return null;

  const isFull = size === 'full';

  return (
    <div 
      className={`nad-modal-overlay fixed inset-0 bg-black bg-opacity-60 ${isFull ? '' : 'flex justify-center items-center p-4'}`}
      onClick={onClose}
    >
      <div
        className={`nad-modal ${isFull ? 'w-full h-full' : `rounded-xl ${SIZES[size]}`} shadow-2xl relative animate-modal-fade-in-up w-full flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {!isFull && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors z-20"
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
