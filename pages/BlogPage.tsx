import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Construction, Clock, Bell, BookOpen, Users, Star } from 'lucide-react';

const BlogPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const upcomingFeatures = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Learning Tips & Techniques',
      description: 'Expert advice on mastering classical dance, vocal music, and creative arts'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Student Success Stories',
      description: 'Inspiring journeys of our students and their artistic achievements'
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Performance Highlights',
      description: 'Coverage of our academy performances, competitions, and cultural events'
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Academy News & Updates',
      description: 'Latest announcements, new course launches, and academy milestones'
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
            Academy <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Blog</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Your source for learning tips, student stories, and academy updates
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Under Construction Section */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={inView ? { scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.2, type: "spring" }}
              className="text-purple-600 dark:text-purple-400 mb-8 flex justify-center"
            >
              <Construction className="w-32 h-32" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Under <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Construction</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              We're working hard to bring you an amazing blog experience filled with educational content,
              student success stories, and insights into the world of classical Indian arts.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-8 rounded-2xl shadow-lg max-w-md mx-auto"
            >
              <Clock className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Coming Soon!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our blog will be launching soon with exciting content for students, parents, and art enthusiasts.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* What to Expect Section */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What to <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Expect</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our upcoming blog will feature a variety of content to enhance your learning experience
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {upcomingFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white text-center"
          >
            <Bell className="w-16 h-16 mx-auto mb-6" />
            <h3 className="text-3xl font-bold mb-6">
              Stay Updated!
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Be the first to know when our blog launches. Get notified about new posts,
              learning resources, and academy updates.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="mailto:nadanalogaa@gmail.com?subject=Blog Updates Subscription"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Subscribe for Updates
              </motion.a>
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                Call for Info
              </motion.a>
            </div>
          </motion.div>
        </section>

        {/* Temporary Content */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              In the Meantime...
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <motion.a
                href="/about"
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 block"
              >
                <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Learn About Us
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Discover our academy's history and mission
                </p>
              </motion.a>

              <motion.a
                href="/courses"
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 block"
              >
                <Star className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Explore Courses
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Browse our available programs and classes
                </p>
              </motion.a>

              <motion.a
                href="/contact"
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 block"
              >
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Contact Us
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Get in touch with our team
                </p>
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default BlogPage;