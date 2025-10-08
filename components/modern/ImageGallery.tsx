import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ChevronLeft, ChevronRight, Eye, Heart } from 'lucide-react';

const ImageGallery: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const galleryImages = [
    '/danceImages/responsive/large/DSC00609~3.webp',
    '/danceImages/responsive/large/DSC00617~2.webp',
    '/danceImages/responsive/large/DSC02648~2.webp',
    '/danceImages/responsive/large/DSC03395_DxO.webp',
    '/danceImages/responsive/large/DSC03919_DxO.webp',
    '/danceImages/responsive/large/DSC07864~2.webp',
    '/danceImages/responsive/large/DSC07875~2.webp',
    '/danceImages/responsive/large/DSC07882~2.webp',
    '/danceImages/responsive/large/EGM_7362_DxO.webp',
    '/danceImages/responsive/large/EGM_7414_DxO.webp',
    '/danceImages/responsive/large/EGM_7549_DxO.webp',
    '/danceImages/responsive/large/EGM_7611_DxO.webp',
    '/danceImages/responsive/large/EGM_7634_DxO.webp',
    '/danceImages/responsive/large/EGM_7698_DxO.webp',
    '/danceImages/responsive/large/EGM_7745_DxO.webp',
    '/danceImages/responsive/large/PRAP2427_DxO.webp',
    '/danceImages/responsive/large/PRAP3017_DxO.webp',
    '/danceImages/responsive/large/PRAP4418_DxO.webp'
  ];

  const imagesPerSlide = 6;
  const totalSlides = Math.ceil(galleryImages.length / imagesPerSlide);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(interval);
  }, [totalSlides]);

  const getCurrentSlideImages = () => {
    const startIndex = currentSlide * imagesPerSlide;
    return galleryImages.slice(startIndex, startIndex + imagesPerSlide);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-gray-900" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-5 sm:mb-6">
            Our <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Gallery</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Capturing moments of grace, tradition, and artistic excellence through our students' performances
          </p>
        </motion.div>

        {/* Gallery Grid with Vertical Slider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative"
        >
          {/* Navigation Buttons */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={prevSlide}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2.5 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={nextSlide}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2.5 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 h-[320px] sm:h-96 overflow-hidden">
            <AnimatePresence>
              {getCurrentSlideImages().map((image, index) => (
                <motion.div
                  key={`${currentSlide}-${index}`}
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -100 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="relative group cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => setSelectedImage(image)}
                >
                  <motion.img
                    whileHover={{ scale: 1.1 }}
                    src={image}
                    alt={`Dance performance ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                  
                  {/* Overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between p-4"
                  >
                    <div className="text-white">
                      <h3 className="font-semibold text-sm mb-1">Classical Performance</h3>
                      <p className="text-xs opacity-75">Traditional Dance</p>
                    </div>
                    <div className="flex gap-2">
                      <motion.div whileHover={{ scale: 1.2 }}>
                        <Eye className="w-5 h-5 text-white" />
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.2 }}>
                        <Heart className="w-5 h-5 text-white" />
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center gap-2 mt-6 sm:mt-8">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.2 }}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </motion.div>

        {/* Lightbox Modal */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <motion.img
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                src={selectedImage}
                alt="Selected dance performance"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ImageGallery;
