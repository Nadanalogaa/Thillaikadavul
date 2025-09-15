import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { X, Play, Image as ImageIcon, Music, Palette, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const GalleryPage: React.FC = () => {
  const { theme } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [galleryRef, galleryInView] = useInView({ threshold: 0.1, triggerOnce: true });

  // Gallery images organized by category
  const galleryData = [
    { 
      src: '/danceImages/EGM_7361_DxO.jpg', 
      category: 'dance', 
      title: 'Classical Dance Performance',
      description: 'Students showcasing Bharatanatyam excellence'
    },
    { 
      src: '/danceImages/EGM_7362_DxO.jpg', 
      category: 'dance', 
      title: 'Graceful Movements',
      description: 'The beauty of traditional Indian dance'
    },
    { 
      src: '/danceImages/EGM_7414_DxO.jpg', 
      category: 'dance', 
      title: 'Cultural Expression',
      description: 'Art in motion'
    },
    { 
      src: '/danceImages/EGM_7424_DxO.jpg', 
      category: 'performance', 
      title: 'Stage Performance',
      description: 'Students performing on stage'
    },
    { 
      src: '/danceImages/EGM_7524_DxO.jpg', 
      category: 'dance', 
      title: 'Traditional Costume',
      description: 'Beautiful traditional attire'
    },
    { 
      src: '/danceImages/EGM_7549_DxO.jpg', 
      category: 'performance', 
      title: 'Group Performance',
      description: 'Synchronized artistry'
    },
    { 
      src: '/danceImages/EGM_7611_DxO.jpg', 
      category: 'dance', 
      title: 'Dance Postures',
      description: 'Perfect form and technique'
    },
    { 
      src: '/danceImages/EGM_7623_DxO.jpg', 
      category: 'performance', 
      title: 'Cultural Event',
      description: 'Community celebration through art'
    },
    { 
      src: '/danceImages/EGM_7634_DxO.jpg', 
      category: 'dance', 
      title: 'Student Achievement',
      description: 'Excellence in motion'
    },
    { 
      src: '/danceImages/PRAP2427_DxO.jpg', 
      category: 'events', 
      title: 'Annual Function',
      description: 'Celebrating artistic achievements'
    },
    { 
      src: '/danceImages/PRAP3017_DxO.jpg', 
      category: 'events', 
      title: 'Award Ceremony',
      description: 'Recognizing talent and dedication'
    },
    { 
      src: '/danceImages/DSC03395_DxO.jpg', 
      category: 'students', 
      title: 'Learning Moments',
      description: 'Students in their learning journey'
    }
  ];

  const categories = [
    { id: 'all', name: 'All', icon: Sparkles },
    { id: 'dance', name: 'Dance', icon: Music },
    { id: 'performance', name: 'Performances', icon: Play },
    { id: 'events', name: 'Events', icon: ImageIcon },
    { id: 'students', name: 'Students', icon: Palette }
  ];

  const filteredImages = selectedCategory === 'all' 
    ? galleryData 
    : galleryData.filter(img => img.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <ThemeToggle />
      
      {/* Hero Section with Parallax */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-purple-50 to-blue-100 dark:from-gray-800 dark:via-purple-900 dark:to-blue-900"></div>
          
          {/* Floating Gallery Elements */}
          <motion.div
            className="absolute top-20 left-10 w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-400 rounded-lg opacity-20 rotate-12"
            animate={{
              y: [0, -20, 0],
              rotate: [12, 25, 12],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-40 right-20 w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full opacity-20"
            animate={{
              y: [0, 30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-32 left-1/3 w-20 h-20 bg-gradient-to-br from-blue-400 to-teal-400 rounded-lg opacity-20 -rotate-12"
            animate={{
              y: [0, -25, 0],
              rotate: [-12, -30, -12],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Background Pattern */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-300 dark:bg-purple-600 rounded-full opacity-30"></div>
            <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-pink-300 dark:bg-pink-600 rounded-full opacity-30"></div>
            <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-blue-300 dark:bg-blue-600 rounded-full opacity-30"></div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center max-w-5xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="mb-8"
            >
              <ImageIcon className="w-20 h-20 mx-auto mb-6 text-purple-600 dark:text-purple-400" />
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-8">
                Our Gallery
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className={`text-xl md:text-2xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-8`}
            >
              Capturing moments of creativity, passion, and artistic excellence
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex justify-center space-x-4"
            >
              <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-50/30 to-transparent dark:via-gray-800/30"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={galleryInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            {categories.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={galleryInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                    : theme === 'dark'
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                }`}
              >
                <category.icon className="w-4 h-4" />
                <span className="font-medium">{category.name}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Gallery Grid */}
          <motion.div
            ref={galleryRef}
            initial={{ opacity: 0, y: 50 }}
            animate={galleryInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {filteredImages.map((image, index) => (
                <motion.div
                  key={`${selectedCategory}-${index}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedImage(image.src)}
                >
                  <div className="aspect-square overflow-hidden">
                    <img 
                      src={image.src} 
                      alt={image.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-bold text-lg mb-1">{image.title}</h3>
                      <p className="text-sm text-gray-200">{image.description}</p>
                    </div>
                  </div>
                  
                  {/* Hover Effect Glow */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={galleryInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-8"
          >
            {[
              { number: '500+', label: 'Happy Students' },
              { number: '50+', label: 'Performances' },
              { number: '20+', label: 'Awards Won' },
              { number: '5+', label: 'Years Experience' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={galleryInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
                className={`text-center p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-purple-200'} border backdrop-blur-sm`}
              >
                <motion.h3
                  initial={{ scale: 0 }}
                  animate={galleryInView ? { scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                  className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2"
                >
                  {stat.number}
                </motion.h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium`}>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Floating decorative elements */}
        <motion.div
          animate={{
            y: [0, -30, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-10 w-12 h-12 bg-gradient-to-br from-rose-400 to-pink-400 rounded-lg opacity-20"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-10 w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full opacity-20"
        />
      </section>

      {/* Image Modal */}
      <AnimatePresence mode="wait">
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-5xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Gallery image"
                className="w-full h-full object-contain rounded-2xl shadow-2xl"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryPage;