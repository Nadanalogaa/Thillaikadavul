import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, Heart, Star, Clock, Award, CheckCircle, Mail, Phone } from 'lucide-react';

const CareersPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const openPositions = [
    {
      title: 'Bharatanatyam Instructor',
      department: 'Dance',
      type: 'Part-time / Full-time',
      location: 'Both Branches',
      description: 'Experienced Bharatanatyam dancer to teach students of all levels',
      requirements: ['Minimum 5 years of training', 'Performance experience', 'Teaching experience preferred', 'Passion for traditional arts']
    },
    {
      title: 'Carnatic Vocal Teacher',
      department: 'Music',
      type: 'Part-time',
      location: 'Head Office',
      description: 'Skilled Carnatic vocalist to guide students in classical Indian music',
      requirements: ['Strong foundation in Carnatic music', 'Grade certifications preferred', 'Good communication skills', 'Patient and encouraging approach']
    },
    {
      title: 'Art & Drawing Instructor',
      department: 'Visual Arts',
      type: 'Part-time',
      location: 'Sembakkam Branch',
      description: 'Creative art teacher for drawing and painting classes',
      requirements: ['Art education background', 'Portfolio of work', 'Experience with children', 'Various art technique knowledge']
    },
    {
      title: 'Academic Coordinator',
      department: 'Administration',
      type: 'Full-time',
      location: 'Head Office',
      description: 'Coordinate academic activities, schedules, and student progress',
      requirements: ['Graduate degree', 'Organizational skills', 'Computer proficiency', 'Communication skills']
    }
  ];

  const benefits = [
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Flexible Hours',
      description: 'Work schedules that balance your personal and professional life'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Supportive Environment',
      description: 'Collaborative team focused on artistic excellence and student success'
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Professional Growth',
      description: 'Opportunities for continuous learning and skill development'
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Meaningful Work',
      description: 'Make a difference in students\' lives through arts education'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Recognition',
      description: 'Appreciation and recognition for outstanding contributions'
    }
  ];

  const culture = [
    'Passion for preserving traditional Indian arts',
    'Commitment to student-centered learning',
    'Collaborative and respectful work environment',
    'Innovation in teaching methods',
    'Community engagement and cultural promotion',
    'Professional development and growth'
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
            Join Our <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Team</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Be part of a passionate team dedicated to preserving and teaching traditional Indian arts
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Why Work With Us */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Work <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">With Us?</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Join a team that values artistic excellence, student success, and cultural preservation
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
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

        {/* Open Positions */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Open <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Positions</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Explore current opportunities to join our academy family
            </p>
          </motion.div>

          <div className="space-y-6">
            {openPositions.map((position, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {position.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-3 py-1 rounded-full text-sm">
                        {position.department}
                      </span>
                      <span className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 px-3 py-1 rounded-full text-sm">
                        {position.type}
                      </span>
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                        {position.location}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 mt-4 md:mt-0"
                  >
                    Apply Now
                  </motion.button>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {position.description}
                </p>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Requirements:</h4>
                  <ul className="grid md:grid-cols-2 gap-2">
                    {position.requirements.map((req, reqIndex) => (
                      <li key={reqIndex} className="flex items-center text-gray-600 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Our Culture */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Culture</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Values that guide our work and shape our academy community
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {culture.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center"
              >
                <CheckCircle className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {value}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Application Process */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-8 rounded-2xl"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Application Process
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: 1, title: 'Submit Application', desc: 'Send your resume and cover letter' },
                { step: 2, title: 'Initial Review', desc: 'We review your qualifications' },
                { step: 3, title: 'Interview', desc: 'Meet with our team' },
                { step: 4, title: 'Welcome Aboard', desc: 'Join our academy family' }
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-white">{step.step}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
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
              Ready to Join Our Team?
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              We're always looking for passionate individuals who share our love for traditional Indian arts and education.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="mailto:nadanalogaa@gmail.com?subject=Career Inquiry"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email Your Resume
              </motion.a>
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300 flex items-center"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Us
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default CareersPage;