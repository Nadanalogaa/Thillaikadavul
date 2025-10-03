import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Calendar, UserPlus, LogIn, BookOpen } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ParallaxImageSlider from './ParallaxImageSlider';
import DemoBookingModal, { type DemoBookingData } from '../DemoBookingModal';
import { createDemoBooking } from '../../api';

interface HeroSectionProps {
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
  onBookDemoClick?: () => void;
  currentUser?: any;
}

const HeroSection: React.FC<HeroSectionProps> = ({ 
  onLoginClick, 
  onRegisterClick, 
  onBookDemoClick,
  currentUser 
}) => {
  const { theme } = useTheme();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const heroImages = [
    '/danceImages/responsive/large/DSC07521~3.webp',
    '/danceImages/responsive/large/EGM_7361_DxO.webp',
    '/danceImages/responsive/large/DSC02946~2.webp',
    '/danceImages/responsive/large/EGM_7524_DxO.webp',
    '/danceImages/responsive/large/PRAP3795_DxO.webp'
  ];

  // Beautiful dance performance images for parallax sliders
  const sliderImages1 = [
    '/danceImages/responsive/large/EGM_7361_DxO.webp',
    '/danceImages/responsive/large/EGM_7524_DxO.webp',
    '/danceImages/responsive/large/EGM_7414_DxO.webp',
    '/danceImages/responsive/large/EGM_7745_DxO.webp',
    '/danceImages/responsive/large/PRAP3795_DxO.webp',
    '/danceImages/responsive/large/PRAP3850_DxO.webp',
    '/danceImages/responsive/large/DSC03395_DxO.webp',
    '/danceImages/responsive/large/EGM_7698_DxO.webp'
  ];

  const sliderImages2 = [
    '/danceImages/responsive/large/PRAP4509_DxO.webp',
    '/danceImages/responsive/large/EGM_7783_DxO.webp',
    '/danceImages/responsive/large/DSC02946~2.webp',
    '/danceImages/responsive/large/EGM_7657_DxO.webp',
    '/danceImages/responsive/large/PRAP4418_DxO.webp',
    '/danceImages/responsive/large/EGM_7764_DxO.webp',
    '/danceImages/responsive/large/DSC03919_DxO.webp',
    '/danceImages/responsive/large/EGM_7914_DxO.webp'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleDemoBooking = async (bookingData: DemoBookingData) => {
    try {
      await createDemoBooking(bookingData);
      // Success is handled by the modal component
    } catch (error) {
      console.error('Demo booking error:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  return (
    <div className="relative min-h-[70vh] md:min-h-[90vh] lg:h-screen overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 dark:from-gray-900 dark:via-gray-800 dark:to-black">
      {/* Parallax Background Images */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 w-full h-full hidden sm:block"
      >
        {heroImages.map((image, index) => (
          <motion.div
            key={index}
            className="absolute inset-0 w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: index === currentImageIndex ? 0.3 : 0 
            }}
            transition={{ duration: 1 }}
          >
            <img
              src={image}
              alt={`Dance performance ${index + 1}`}
              className="w-full h-full object-cover filter brightness-50"
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 hidden sm:block">
        <motion.div
          className="absolute top-20 left-20 w-4 h-4 bg-yellow-400 rounded-full animate-float"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-40 right-32 w-6 h-6 bg-pink-400 rounded-full animate-parallax-slow"
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-40 left-40 w-8 h-8 bg-blue-400 rounded-full animate-parallax-fast"
          animate={{
            scale: [1, 0.8, 1.2, 1],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Content */}
      <motion.div 
        style={{ opacity }}
        className="relative z-10 flex items-center justify-center min-h-[70vh] md:min-h-[80vh] text-center text-white px-4 pb-16 sm:pb-0"
      >
        <div className="max-w-6xl mx-auto w-full">
          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent"
          >
            Nadanaloga Fine Arts Academy
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-200 dark:text-gray-300 max-w-3xl mx-auto"
          >
            Where Tradition Meets Innovation in Classical Dance & Arts
          </motion.p>

          {/* Online & Offline Availability Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mb-6 sm:mb-8"
          >
            <div className="inline-block bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-1 rounded-2xl shadow-2xl">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl">
                <motion.p
                  animate={{
                    textShadow: ["0 0 10px rgba(255,255,0,0.5)", "0 0 20px rgba(255,255,0,0.8)", "0 0 10px rgba(255,255,0,0.5)"]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-sm sm:text-lg md:text-2xl font-bold text-white text-center"
                >
                  🌍 <span className="text-yellow-300">ONLINE</span> & <span className="text-orange-300">OFFLINE</span> Classes Available Worldwide 🌍
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* Conditional Content based on Authentication */}
          {!currentUser ? (
            // Show login/register cards for non-authenticated users
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto mb-10 sm:mb-12"
            >
              {/* Book Demo Class Card */}
              <motion.div
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-2xl p-6 md:p-8 backdrop-blur-lg border transition-all duration-300 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/10 border-white/20 hover:bg-white/15'
                    : 'bg-white/15 border-white/30 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2.5 text-white">Book Demo Class</h3>
                <p className="text-gray-200 text-sm sm:text-base mb-5">Experience our teaching methodology with a free demo class</p>
                <motion.button
                  onClick={() => setIsDemoModalOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white px-4 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Book Now
                </motion.button>
              </motion.div>

              {/* Login/Register Card */}
              <motion.div
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-2xl p-6 md:p-8 backdrop-blur-lg border transition-all duration-300 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/10 border-white/20 hover:bg-white/15'
                    : 'bg-white/15 border-white/30 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl">
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2.5 text-white">Join Our Community</h3>
                <p className="text-gray-200 text-sm sm:text-base mb-5">Login to your account or register as a new student or teacher</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button
                    onClick={onLoginClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 bg-gradient-to-r from-blue-400 to-purple-500 text-white px-4 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </motion.button>
                  <motion.button
                    onClick={onRegisterClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 border-2 border-white text-white px-4 py-2.5 sm:py-3 rounded-xl font-semibold backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            // Show parallax slider for authenticated users
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="w-full mb-10 sm:mb-12"
            >
              {/* Full Width Slider - Left to Right */}
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 1 }}
                className="w-full mb-8"
              >
                <ParallaxImageSlider 
                  images={[...sliderImages1, ...sliderImages2]} 
                  direction="left-to-right" 
                  speed={50}
                />
              </motion.div>

              {/* Explore Dashboard Button */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 1.3 }}
                className="flex justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (currentUser.role === 'Student') {
                      window.location.href = '/dashboard/student';
                    } else if (currentUser.role === 'Teacher') {
                      window.location.href = '/dashboard/teacher';
                    } else if (currentUser.role === 'Admin') {
                      window.location.href = '/admin/dashboard';
                    }
                  }}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Explore your Dashboard
                </motion.button>
              </motion.div>
            </motion.div>
          )}

        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 text-white cursor-pointer hidden sm:block"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-8 h-8" />
        </motion.div>
        <p className="text-sm mt-2">Scroll to explore</p>
      </motion.div>

      {/* Demo Booking Modal */}
      <DemoBookingModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSubmit={handleDemoBooking}
      />
    </div>
  );
};

export default HeroSection;
