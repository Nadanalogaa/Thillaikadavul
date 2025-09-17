import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface BeautifulLoaderProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const BeautifulLoader: React.FC<BeautifulLoaderProps> = ({ 
  message = "Loading...", 
  size = 'medium' 
}) => {
  const { theme } = useTheme();
  
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Animated Lotus/Dance Icon */}
      <motion.div
        className="relative mb-4"
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <motion.div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 relative overflow-hidden`}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Inner rotating element */}
          <motion.div
            className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-600"
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Center dot */}
          <motion.div
            className="absolute inset-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </motion.div>

      {/* Animated Dots */}
      <div className="flex space-x-1 mb-4">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`w-2 h-2 rounded-full ${
              theme === 'dark' 
                ? 'bg-purple-400' 
                : 'bg-purple-600'
            }`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Loading Message */}
      <motion.p
        className={`text-sm font-medium ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {message}
      </motion.p>

      {/* Background Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 blur-xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

export default BeautifulLoader;