import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { User, Clock, Star, CheckCircle, Calendar, Users, Music, Palette } from 'lucide-react';

const PrivateClassPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const benefits = [
    {
      icon: <User className="w-8 h-8" />,
      title: 'Personalized Attention',
      description: 'One-on-one instruction tailored to your individual learning style and pace'
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Flexible Scheduling',
      description: 'Choose class times that fit your busy schedule and lifestyle'
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Accelerated Learning',
      description: 'Progress faster with dedicated instructor focus and customized curriculum'
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: 'Goal-Oriented Training',
      description: 'Achieve specific objectives whether for performances, competitions, or personal growth'
    }
  ];

  const courses = [
    {
      icon: <Music className="w-12 h-12" />,
      title: 'Bharatanatyam Private Classes',
      description: 'Traditional South Indian classical dance with personalized choreography and technique refinement.',
      features: ['Basic to Advanced levels', 'Classical items and Varnams', 'Performance preparation', 'Competition coaching']
    },
    {
      icon: <Music className="w-12 h-12" />,
      title: 'Carnatic Vocal Private Classes',
      description: 'Classical South Indian vocal music training with individual attention to voice development.',
      features: ['Voice training and breath control', 'Ragas and compositions', 'Classical songs', 'Concert preparation']
    },
    {
      icon: <Palette className="w-12 h-12" />,
      title: 'Drawing Private Classes',
      description: 'Personalized art instruction covering various drawing techniques and styles.',
      features: ['Sketching and shading', 'Portrait drawing', 'Creative expression', 'Art portfolio development']
    }
  ];

  const pricing = [
    {
      type: 'Single Session',
      price: '₹800',
      duration: '60 minutes',
      features: ['One-on-one instruction', 'Personalized curriculum', 'Flexible scheduling']
    },
    {
      type: 'Monthly Package',
      price: '₹2,800',
      duration: '4 sessions',
      features: ['Weekly classes', 'Progress tracking', 'Performance opportunities', 'Discounted rate']
    },
    {
      type: 'Intensive Course',
      price: '₹7,500',
      duration: '12 sessions',
      features: ['Comprehensive training', 'Competition preparation', 'Certificate completion', 'Best value']
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            One to One <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Private Classes</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Experience personalized learning with our expert instructors in a focused, one-on-one environment
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Benefits Section */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Private Classes?</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our private classes offer unparalleled personal attention and customized learning experiences
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Available Courses */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Available <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Private Courses</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose from our range of specialized private instruction programs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4">
                  {course.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {course.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {course.description}
                </p>
                <ul className="space-y-2">
                  {course.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Pricing <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Plans</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Flexible pricing options to suit your learning goals and budget
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                  index === 1 ? 'border-purple-500 scale-105' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.type}
                  </h3>
                  <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {plan.price}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {plan.duration}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                      index === 1
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                        : 'border-2 border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    Get Started
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white"
          >
            <h3 className="text-3xl font-bold mb-6">
              Ready to Start Your Private Learning Journey?
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Contact us today to schedule your first private class and experience personalized instruction like never before.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Call Now: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                Email Us
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default PrivateClassPage;