import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ArrowRight, BookOpen, Target, Award } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import EnrollmentModal from '../components/EnrollmentModal';
import { COURSE_CARDS } from '../components/modern/courseCards';

const CoursesPage: React.FC = () => {
  const { theme } = useTheme();
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [coursesRef, coursesInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [enrollmentModal, setEnrollmentModal] = useState<{
    isOpen: boolean;
    courseTitle: string;
    courseType: 'instrument' | 'regular';
  }>({
    isOpen: false,
    courseTitle: '',
    courseType: 'regular'
  });

  const courses = COURSE_CARDS;

  const handleEnrollClick = (courseTitle: string, courseType: 'instrument' | 'regular') => {
    setEnrollmentModal({
      isOpen: true,
      courseTitle,
      courseType
    });
  };

  const closeEnrollmentModal = () => {
    setEnrollmentModal({
      isOpen: false,
      courseTitle: '',
      courseType: 'regular'
    });
  };

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
      <section className="relative min-h-[50vh] overflow-hidden" ref={heroRef}>
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

        <div className="relative z-10 flex items-center justify-center min-h-[50vh] px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6"
            >
              Our <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Courses</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 leading-relaxed"
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
      <section className="py-12 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800" ref={coursesRef}>
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
                <div className={`relative h-48 overflow-hidden ${course.illustration ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-700 dark:to-gray-800' : ''}`}>
                  <motion.img
                    whileHover={{ scale: 1.1 }}
                    src={course.image}
                    alt={course.title}
                    className={`w-full h-full transition-transform duration-500 ${course.illustration ? 'object-contain p-3' : 'object-cover'}`}
                  />
                  <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {course.level}
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
                    onClick={() => handleEnrollClick(course.title, course.type)}
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

      {/* Enrollment Modal */}
      <EnrollmentModal
        isOpen={enrollmentModal.isOpen}
        onClose={closeEnrollmentModal}
        courseTitle={enrollmentModal.courseTitle}
        courseType={enrollmentModal.courseType}
      />
    </div>
  );
};

export default CoursesPage;