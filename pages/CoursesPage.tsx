import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Clock, Users, Star, ArrowRight, BookOpen, Target, Award } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const CoursesPage: React.FC = () => {
  const { theme } = useTheme();
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [coursesRef, coursesInView] = useInView({ threshold: 0.1, triggerOnce: true });

  const courses = [
    {
      title: 'Bharatanatyam Fundamentals',
      description: 'Learn the basic postures, hand gestures, and movements of this classical dance form',
      image: '/danceImages/responsive/large/DSC03395_DxO.webp',
      duration: '3 Months',
      students: '25',
      level: 'Beginner',
      rating: 4.9,
      features: ['Basic Adavus', 'Hand Gestures', 'Posture Training', 'Cultural Context'],
      price: '$120'
    },
    {
      title: 'Advanced Bharatanatyam',
      description: 'Master complex choreographies and expressive storytelling through dance',
      image: '/danceImages/responsive/large/EGM_7524_DxO.webp',
      duration: '6 Months',
      students: '15',
      level: 'Advanced',
      rating: 4.8,
      features: ['Complex Choreography', 'Abhinaya', 'Performance Skills', 'Competition Prep'],
      price: '$200'
    },
    {
      title: 'Drawing Classes',
      description: 'Develop your artistic skills through structured drawing lessons and creative expression',
      image: '/danceImages/responsive/large/EGM_7698_DxO.webp',
      duration: '4 Months',
      students: '22',
      level: 'All Levels',
      rating: 4.8,
      features: ['Basic Sketching', 'Color Theory', 'Creative Expression', 'Portfolio Development'],
      price: '$120'
    },
    {
      title: 'Vocal Music Classes',
      description: 'Learn classical Carnatic music to complement your dance training',
      image: '/danceImages/responsive/large/PRAP3795_DxO.webp',
      duration: '6 Months',
      students: '20',
      level: 'All Levels',
      rating: 4.9,
      features: ['Carnatic Basics', 'Ragas', 'Compositions', 'Voice Training'],
      price: '$100'
    },
    {
      title: 'Kids Dance Program',
      description: 'Fun and engaging introduction to classical dance for children ages 5-12',
      image: '/danceImages/responsive/large/DSC07875~2.webp',
      duration: '2 Months',
      students: '30',
      level: 'Kids',
      rating: 5.0,
      features: ['Age-appropriate', 'Fun Activities', 'Cultural Education', 'Performance Opportunities'],
      price: '$80'
    },
    {
      title: 'Abacus Classes',
      description: 'Enhance mathematical skills and mental calculation abilities through traditional abacus training',
      image: '/danceImages/responsive/large/EGM_7745_DxO.webp',
      duration: '6 Months',
      students: '25',
      level: 'All Levels',
      rating: 4.9,
      features: ['Mental Math', 'Speed Calculation', 'Concentration Training', 'Problem Solving'],
      price: '$90'
    },
    {
      title: 'Phonics Classes',
      description: 'Build strong reading foundations with systematic phonics instruction for early learners',
      image: '/danceImages/responsive/large/DSC03395_DxO.webp',
      duration: '4 Months',
      students: '20',
      level: 'Beginner',
      rating: 4.9,
      features: ['Letter Sounds', 'Reading Skills', 'Pronunciation', 'Language Development'],
      price: '$100'
    }
  ];

  const benefits = [
    {
      icon: BookOpen,
      title: "Expert Instructors",
      description: "Learn from certified professionals with years of experience in their respective fields."
    },
    {
      icon: Target,
      title: "Flexible Learning",
      description: "Choose from online or offline classes that fit your schedule and learning preferences."
    },
    {
      icon: Award,
      title: "Performance Opportunities",
      description: "Showcase your skills in regular recitals, competitions, and cultural events."
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">

      {/* Hero Section */}
      <section className="relative min-h-[70vh] overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900"></div>

        {/* Floating Elements */}
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
          animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-30"
          animate={{ y: [0, 30, 0], x: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-br from-pink-400 to-yellow-400 rounded-full opacity-25"
          animate={{ scale: [1, 1.2, 1], rotate: [0, -180, -360] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1 }}
              className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Our <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Courses</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed"
            >
              Discover a world of artistic and educational opportunities designed to nurture creativity,
              develop skills, and inspire lifelong learning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-6"
            >
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-full">
                  <benefit.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{benefit.title}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800" ref={coursesRef}>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={coursesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Choose Your <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Learning Path</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              From traditional arts to modern skills, our comprehensive course catalog offers something for every learner.
            </p>
          </motion.div>

          {/* Courses Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group"
              >
                {/* Course Image */}
                <div className="relative h-48 overflow-hidden">
                  <motion.img
                    whileHover={{ scale: 1.1 }}
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {course.level}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {course.price}/month
                  </div>
                </div>

                {/* Course Content */}
                <div className="p-6">
                  <motion.h3
                    className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                  >
                    {course.title}
                  </motion.h3>

                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Course Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {course.students} students
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {course.rating}
                    </div>
                  </div>

                  {/* Course Features */}
                  <div className="space-y-2 mb-6">
                    {course.features.slice(0, 3).map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                        {feature}
                      </div>
                    ))}
                    {course.features.length > 3 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        +{course.features.length - 3} more features
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group"
                  >
                    Enroll Now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={coursesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-16 text-center"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Need Help Choosing?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Our team is here to help you find the perfect course for your goals and experience level.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
              >
                Contact Our Advisors
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CoursesPage;