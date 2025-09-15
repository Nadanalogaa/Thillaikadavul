import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Clock, Users, Star, ArrowRight } from 'lucide-react';

const CoursesSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const courses = [
    {
      title: 'Bharatanatyam Fundamentals',
      description: 'Learn the basic postures, hand gestures, and movements of this classical dance form',
      image: '/danceImages/DSC03395_DxO.jpg',
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
      image: '/danceImages/EGM_7524_DxO.jpg',
      duration: '6 Months',
      students: '15',
      level: 'Advanced',
      rating: 4.8,
      features: ['Complex Choreography', 'Abhinaya', 'Performance Skills', 'Competition Prep'],
      price: '$200'
    },
    {
      title: 'Kuchipudi Dance',
      description: 'Explore this graceful dance form known for its fluid movements and dramatic expressions',
      image: '/danceImages/EGM_7698_DxO.jpg',
      duration: '4 Months',
      students: '18',
      level: 'Intermediate',
      rating: 4.7,
      features: ['Fluid Movements', 'Dramatic Expression', 'Traditional Stories', 'Performance Art'],
      price: '$150'
    },
    {
      title: 'Vocal Music Classes',
      description: 'Learn classical Carnatic music to complement your dance training',
      image: '/danceImages/PRAP3795_DxO.jpg',
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
      image: '/danceImages/DSC07875~2.JPG',
      duration: '2 Months',
      students: '30',
      level: 'Kids',
      rating: 5.0,
      features: ['Age-appropriate', 'Fun Activities', 'Cultural Education', 'Performance Opportunities'],
      price: '$80'
    },
    {
      title: 'Performance Workshop',
      description: 'Intensive workshop preparing students for stage performances and competitions',
      image: '/danceImages/EGM_7745_DxO.jpg',
      duration: '1 Month',
      students: '12',
      level: 'Advanced',
      rating: 4.8,
      features: ['Stage Presence', 'Costume & Makeup', 'Competition Strategy', 'Video Portfolio'],
      price: '$250'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Our <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Courses</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover the perfect course for your artistic journey. From beginner fundamentals to advanced performance techniques.
          </p>
        </motion.div>

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 15px 40px rgba(0,0,0,0.1)" }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            View All Courses
          </motion.button>
          <p className="text-gray-600 dark:text-gray-300 mt-4">
            Can't find what you're looking for? <span className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">Contact us</span> for custom programs.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CoursesSection;