import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import EnrollmentModal from '../EnrollmentModal';

const CoursesSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const navigate = useNavigate();
  const [enrollmentModal, setEnrollmentModal] = useState<{
    isOpen: boolean;
    courseTitle: string;
    courseType: 'instrument' | 'regular';
  }>({
    isOpen: false,
    courseTitle: '',
    courseType: 'regular'
  });

  const courses = [
    {
      title: 'Bharatanatyam Fundamentals',
      description: 'Learn the basic postures, hand gestures, and movements of this classical dance form',
      image: '/danceImages/responsive/large/DSC03395_DxO.webp',
      duration: '3 Months',
      level: 'Beginner',
      features: ['Basic Adavus', 'Hand Gestures', 'Posture Training', 'Cultural Context'],
      type: 'regular' as const
    },
    {
      title: 'Advanced Bharatanatyam',
      description: 'Master complex choreographies and expressive storytelling through dance',
      image: '/danceImages/responsive/large/EGM_7524_DxO.webp',
      duration: '6 Months',
      level: 'Advanced',
      features: ['Complex Choreography', 'Abhinaya', 'Performance Skills', 'Competition Prep'],
      type: 'regular' as const
    },
    {
      title: 'Drawing Classes',
      description: 'Develop your artistic skills through structured drawing lessons and creative expression',
      image: '/danceImages/responsive/large/EGM_7698_DxO.webp',
      duration: '4 Months',
      level: 'All Levels',
      features: ['Basic Sketching', 'Color Theory', 'Creative Expression', 'Portfolio Development'],
      type: 'regular' as const
    },
    {
      title: 'Vocal Music Classes',
      description: 'Learn classical Carnatic music to complement your dance training',
      image: '/danceImages/responsive/large/PRAP3795_DxO.webp',
      duration: '6 Months',
      level: 'All Levels',
      features: ['Carnatic Basics', 'Ragas', 'Compositions', 'Voice Training'],
      type: 'regular' as const
    },
    {
      title: 'Abacus Classes',
      description: 'Enhance mathematical skills and mental calculation abilities through traditional abacus training',
      image: '/danceImages/responsive/large/EGM_7745_DxO.webp',
      duration: '6 Months',
      level: 'All Levels',
      features: ['Mental Math', 'Speed Calculation', 'Concentration Training', 'Problem Solving'],
      type: 'regular' as const
    },
    {
      title: 'Phonics Classes',
      description: 'Build strong reading foundations with systematic phonics instruction for early learners',
      image: '/danceImages/responsive/large/DSC03395_DxO.webp',
      duration: '4 Months',
      level: 'Beginner',
      features: ['Letter Sounds', 'Reading Skills', 'Pronunciation', 'Language Development'],
      type: 'regular' as const
    },
    {
      title: 'Private Classes',
      description: 'Personalized one-on-one instruction tailored to your individual learning pace and goals',
      image: '/danceImages/responsive/large/EGM_7524_DxO.webp',
      duration: 'Flexible',
      level: 'All Levels',
      features: ['Personalized Attention', 'Flexible Schedule', 'Customized Curriculum', 'Faster Progress'],
      type: 'regular' as const
    },
    {
      title: 'Instrument Classes',
      description: 'Learn to play traditional and modern instruments with expert guidance',
      image: '/danceImages/responsive/large/PRAP3795_DxO.webp',
      duration: '6 Months',
      level: 'All Levels',
      features: ['Multiple Instruments', 'Professional Training', 'Music Theory', 'Performance Skills'],
      type: 'instrument' as const
    },
    {
      title: 'Yoga Classes',
      description: 'Enhance flexibility, mindfulness, and overall well-being through traditional yoga practices',
      image: '/danceImages/responsive/large/DSC07875~2.webp',
      duration: '3 Months',
      level: 'All Levels',
      features: ['Asanas & Pranayama', 'Meditation', 'Flexibility Training', 'Stress Relief'],
      type: 'regular' as const
    }
  ];

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

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-5 sm:mb-6">
            Our <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Courses</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover the perfect course for your artistic journey. From beginner fundamentals to advanced performance techniques.
          </p>
        </motion.div>

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {courses.map((course, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group"
            >
              {/* Course Image */}
              <div className="relative h-44 sm:h-48 overflow-hidden">
                <motion.img
                  whileHover={{ scale: 1.1 }}
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {course.level}
                </div>
              </div>

              {/* Course Content */}
              <div className="p-5 sm:p-6">
                <motion.h3
                  className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                >
                  {course.title}
                </motion.h3>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mb-4 line-clamp-2">
                  {course.description}
                </p>

                {/* Course Duration */}
                <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <Clock className="w-4 h-4 mr-2" />
                  Duration: {course.duration}
                </div>

                {/* Course Features */}
                <div className="space-y-1.5 sm:space-y-2 mb-5 sm:mb-6">
                  {course.features.slice(0, 3).map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                      {feature}
                    </div>
                  ))}
                  {course.features.length > 3 && (
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      +{course.features.length - 3} more features
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEnrollClick(course.title, course.type)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group"
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
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12 sm:mt-16 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 15px 40px rgba(0,0,0,0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/courses')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 sm:px-12 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            View All Courses
          </motion.button>
          <p className="text-gray-600 dark:text-gray-300 mt-3 sm:mt-4 text-sm sm:text-base">
            Can't find what you're looking for? <span className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">Contact us</span> for custom programs.
          </p>
        </motion.div>
      </div>

      {/* Enrollment Modal */}
      <EnrollmentModal
        isOpen={enrollmentModal.isOpen}
        onClose={closeEnrollmentModal}
        courseTitle={enrollmentModal.courseTitle}
        courseType={enrollmentModal.courseType}
      />
    </section>
  );
};

export default CoursesSection;
