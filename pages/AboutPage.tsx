import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, Heart, Star, Award, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const AboutPage: React.FC = () => {
  const { theme } = useTheme();
  
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [storyRef, storyInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [valuesRef, valuesInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [teamRef, teamInView] = useInView({ threshold: 0.1, triggerOnce: true });

  const values = [
    {
      icon: Heart,
      title: "Passion for Arts",
      description: "We believe in nurturing the inherent artistic talents in every individual through dedicated practice and guidance."
    },
    {
      icon: Users,
      title: "Community Spirit",
      description: "Building a supportive community where students learn from each other and grow together in their artistic journey."
    },
    {
      icon: Star,
      title: "Excellence",
      description: "Striving for the highest standards in teaching methodology and student performance across all disciplines."
    },
    {
      icon: Award,
      title: "Cultural Heritage",
      description: "Preserving and promoting traditional art forms while embracing contemporary learning approaches."
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <ThemeToggle position="fixed" />
      
      {/* Hero Section with Parallax */}
      <section className="relative min-h-[85vh] overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900"></div>
          
          {/* Floating Elements */}
          <motion.div
            className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
            animate={{
              y: [0, -20, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-20"
            animate={{
              y: [0, 20, 0],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-20"
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
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-[85vh] px-6">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center max-w-4xl"
          >
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-8"
            >
              About Nadanaloga
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className={`text-xl md:text-2xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-8`}
            >
              Where tradition meets innovation in the world of arts and creativity
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className="w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-600 mx-auto rounded-full"
            />
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center text-center cursor-pointer"
            onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
          >
            <span className="text-sm text-gray-600 dark:text-gray-300 mb-2 whitespace-nowrap">Scroll to explore</span>
            <ChevronDown className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent dark:via-gray-800/30"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            ref={storyRef}
            initial={{ opacity: 0, y: 50 }}
            animate={storyInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="max-w-6xl mx-auto"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.h2
                  initial={{ opacity: 0, x: -50 }}
                  animate={storyInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-8`}
                >
                  Our Story
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={storyInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="space-y-6"
                >
                  <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                    Nadanaloga began as a vision to create a sanctuary where art, culture, and learning converge. 
                    Founded with the belief that every individual has an innate creative spark, we've grown into 
                    a vibrant community of artists, students, and educators.
                  </p>
                  <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                    Our journey started with classical Indian dance and has evolved to encompass various art forms 
                    including music, drawing, and intellectual development through abacus training. Each discipline 
                    is taught with the same dedication to excellence and cultural authenticity.
                  </p>
                  <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                    Today, we serve students across multiple locations and time zones, bringing the joy of learning 
                    to communities worldwide while maintaining the personal touch that makes each student's journey unique.
                  </p>
                </motion.div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
                animate={storyInView ? { opacity: 1, scale: 1, rotateY: 0 } : {}}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src="/danceImages/responsive/large/Logo.webp" 
                    alt="Nadanaloga Heritage" 
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                </div>
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-80 blur-lg"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-gray-800 dark:via-indigo-900 dark:to-purple-900"></div>
          
          {/* Animated Background Patterns */}
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/4 left-10 w-40 h-40 border-2 border-purple-200 dark:border-purple-700 rounded-full opacity-20"
          />
          <motion.div
            animate={{
              rotate: [360, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-1/4 right-10 w-32 h-32 border-2 border-blue-200 dark:border-blue-700 rounded-full opacity-20"
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            ref={valuesRef}
            initial={{ opacity: 0, y: 50 }}
            animate={valuesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>
              Our Values
            </h2>
            <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              The principles that guide everything we do at Nadanaloga
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={valuesInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`relative p-8 rounded-2xl ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-purple-200'} border-2 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 mx-auto"
                >
                  <value.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 text-center`}>
                  {value.title}
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-center leading-relaxed`}>
                  {value.description}
                </p>
                
                {/* Decorative corner elements */}
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-purple-300 dark:border-purple-600"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-300 dark:border-purple-600"></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            ref={teamRef}
            initial={{ opacity: 0, y: 50 }}
            animate={teamInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="max-w-6xl mx-auto"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={teamInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 1, delay: 0.2 }}
                className={`p-10 rounded-3xl ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200'} border-2 relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-10 -translate-y-6 translate-x-6"></div>
                <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>
                  Our Vision
                </h3>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  We envision a world where art is an integral part of everyone's life, fostering discipline, 
                  joy, and a deep connection to culture. We strive to be a leading institution where students 
                  of all ages can discover their passion and unlock their potential under the guidance of 
                  world-class instructors.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={teamInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 1, delay: 0.4 }}
                className={`p-10 rounded-3xl ${theme === 'dark' ? 'bg-gradient-to-br from-indigo-900 to-purple-900 border-indigo-700' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'} border-2 relative overflow-hidden`}
              >
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full opacity-10 translate-y-6 -translate-x-6"></div>
                <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>
                  Our Mission
                </h3>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  Our curriculum is built on a foundation of authentic traditions, ensuring that students receive 
                  a comprehensive education in their chosen art form. We blend time-honored techniques with modern 
                  pedagogical tools, offering both in-person and online classes to provide a flexible and enriching 
                  learning experience for our global community of students.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Floating decorative elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-20 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-20"
        />
        <motion.div
          animate={{
            y: [0, 15, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-20 w-12 h-12 bg-gradient-to-br from-green-400 to-teal-400 rounded-full opacity-20"
        />
      </section>
    </div>
  );
};

export default AboutPage;