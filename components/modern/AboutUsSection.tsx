import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { Users, Award, Heart, BookOpen } from 'lucide-react';

const AboutUsSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Expert Instructors',
      description: 'Learn from seasoned professionals with decades of experience in classical Indian dance',
      count: '15+'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Awards Won',
      description: 'Our students have won numerous awards in regional and national competitions',
      count: '50+'
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Happy Students',
      description: 'Building confidence and artistic expression in students of all ages',
      count: '500+'
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Years of Excellence',
      description: 'Preserving and teaching traditional Indian classical arts for over two decades',
      count: '20+'
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-gray-900" ref={ref}>
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Side - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-5 sm:mb-6"
            >
              About <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Our Academy</span>
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 leading-relaxed"
            >
              At Nadanaloga Fine Arts Academy, we are dedicated to preserving the beauty of Indian arts while guiding students in both online and offline classes. With courses in Bharatanatyam, Carnatic Vocal, Drawing, Abacus, and Phonics, our academy blends traditional methods with modern learning to give every student a complete experience.
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 leading-relaxed"
            >
              We believe learning is not just about practice, but about expression, creativity, and personal growth. Our highly experienced teachers provide individual attention, helping students discover their talent and confidence while carrying forward the rich cultural traditions that have been nurtured at Nadanaloga Fine Arts Academy for over two decades.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/about')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Learn More
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/team')}
                className="border-2 border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400 px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300"
              >
                Meet Our Team
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Side - Stats Cards */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 gap-4 sm:gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-5 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={inView ? { scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1, type: "spring" }}
                  className="text-purple-600 dark:text-purple-400 mb-4"
                >
                  {feature.icon}
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                  className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2"
                >
                  {feature.count}
                </motion.div>
                
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h4>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom Section - Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 md:mt-20 text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 sm:p-12 text-white"
        >
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6"
          >
            Our Mission
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="text-base sm:text-xl max-w-3xl sm:max-w-4xl mx-auto leading-relaxed"
          >
            To preserve, promote, and pass on the timeless traditions of classical Indian dance while fostering creativity, 
            discipline, and cultural appreciation in every student who walks through our doors.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutUsSection;
