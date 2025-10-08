import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface ParallaxImageSliderProps {
  images: string[];
  direction: 'left-to-right' | 'right-to-left';
  speed?: number;
}

const ParallaxImageSlider: React.FC<ParallaxImageSliderProps> = ({ 
  images, 
  direction, 
  speed = 30 
}) => {
  const { theme } = useTheme();
  const [duplicatedImages, setDuplicatedImages] = useState<string[]>([]);

  useEffect(() => {
    // Duplicate images multiple times to create seamless infinite loop
    setDuplicatedImages([...images, ...images, ...images, ...images]);
  }, [images]);

  const animationDirection = direction === 'left-to-right' ? '100%' : '-100%';

  return (
    <div className="overflow-hidden w-full md:w-screen md:relative md:left-1/2 md:right-1/2 md:-ml-[50vw] md:-mr-[50vw] py-6">
      <motion.div
        className="flex gap-8 will-change-transform"
        animate={{
          x: ['-25%', animationDirection === '100%' ? '0%' : '-50%']
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          width: 'max-content'
        }}
      >
        {duplicatedImages.map((image, index) => (
          <motion.div
            key={index}
            className={`relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 transform ${
              theme === 'dark' 
                ? 'bg-gray-800/50 border border-gray-600/30 shadow-purple-900/20' 
                : 'bg-white/80 border border-white/40 shadow-purple-500/20'
            }`}
            whileHover={{ 
              y: -15,
              scale: 1.08,
              rotate: (Math.random() - 0.5) * 6, // More dynamic rotation
              transition: { duration: 0.3 }
            }}
            style={{
              width: '320px',
              height: '220px',
              flexShrink: 0,
              backdropFilter: 'blur(8px)'
            }}
          >
            <img
              src={image}
              alt={`Dance performance ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
              loading="lazy"
            />
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-purple-500/10 opacity-60 hover:opacity-30 transition-opacity duration-500`} />
            
            {/* Shimmer effect on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
              whileHover={{
                x: ['100%', '200%'],
                transition: { duration: 0.6, ease: "easeInOut" }
              }}
            />
            
            {/* Bottom gradient for better text readability */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default ParallaxImageSlider;
