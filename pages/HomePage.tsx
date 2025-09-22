

import React from 'react';
import HeroSection from '../components/modern/HeroSection';
import AboutUsSection from '../components/modern/AboutUsSection';
import ImageGallery from '../components/modern/ImageGallery';
import VideoSection from '../components/modern/VideoSection';
import CoursesSection from '../components/modern/CoursesSection';
import AnimatedFooter from '../components/modern/AnimatedFooter';
import ThemeToggle from '../components/ThemeToggle';

interface HomePageProps {
  onLoginClick: () => void;
  onRegisterClick?: () => void;
  onBookDemoClick?: () => void;
  currentUser?: any; // Add current user prop
}

const HomePage: React.FC<HomePageProps> = ({ 
  onLoginClick, 
  onRegisterClick, 
  onBookDemoClick,
  currentUser 
}) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Theme Toggle Button */}
      <ThemeToggle position="fixed" />
      
      {/* Hero Section with Parallax */}
      <HeroSection 
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        onBookDemoClick={onBookDemoClick}
        currentUser={currentUser}
      />
      
      {/* About Us Section */}
      <AboutUsSection />
      
      {/* Image Gallery with Vertical Slider */}
      <ImageGallery />
      
      {/* YouTube Videos Section */}
      <VideoSection />
      
      {/* Courses Section */}
      <CoursesSection />
      
      {/* Animated Footer */}
      <AnimatedFooter />
    </div>
  );
};

export default HomePage;