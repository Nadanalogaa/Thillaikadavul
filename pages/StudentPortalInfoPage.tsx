import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  User,
  BookOpen,
  Calendar,
  CreditCard,
  Award,
  Bell,
  FileText,
  Users,
  Video,
  Download,
  Shield,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';

const StudentPortalInfoPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const features = [
    {
      icon: <User className="w-8 h-8" />,
      title: 'Profile Management',
      description: 'Manage your personal information, family details, and student profiles in one central location.',
      benefits: ['Update contact information', 'Add family members', 'Profile picture upload', 'Emergency contacts']
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Course Enrollment',
      description: 'View available courses, enroll in new programs, and track your learning progress across all subjects.',
      benefits: ['Browse course catalog', 'Enroll in multiple courses', 'Track progress', 'View certificates']
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: 'Class Scheduling',
      description: 'Access your personalized class schedule, book makeup classes, and receive schedule updates.',
      benefits: ['View weekly schedule', 'Book makeup classes', 'Reschedule requests', 'Class reminders']
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: 'Fee Management',
      description: 'Track fee payments, view payment history, download receipts, and set up payment reminders.',
      benefits: ['Online fee payment', 'Payment history', 'Download receipts', 'Due date alerts']
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Grade & Exams',
      description: 'Access exam schedules, view results, track grade progressions, and download certificates.',
      benefits: ['Exam notifications', 'Grade reports', 'Certificate download', 'Progress tracking']
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Notices & Events',
      description: 'Stay updated with academy announcements, upcoming events, and important notifications.',
      benefits: ['Real-time notifications', 'Event calendar', 'Important announcements', 'RSVP for events']
    }
  ];

  const accessLevels = [
    {
      role: 'Student',
      description: 'Access to personal learning dashboard, assignments, and progress tracking',
      features: ['View courses', 'Submit assignments', 'Track progress', 'Access materials']
    },
    {
      role: 'Guardian/Parent',
      description: 'Monitor children\'s progress, manage payments, and communicate with instructors',
      features: ['Multiple child profiles', 'Payment management', 'Progress monitoring', 'Teacher communication']
    },
    {
      role: 'Teacher',
      description: 'Manage classes, track student progress, and communicate with families',
      features: ['Class management', 'Grade submissions', 'Student tracking', 'Resource sharing']
    }
  ];

  const securityFeatures = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure Login',
      description: 'Multi-factor authentication and secure password protection'
    },
    {
      icon: <User className="w-6 h-6" />,
      title: 'Role-based Access',
      description: 'Customized access levels for students, parents, and teachers'
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Data Privacy',
      description: 'Complete privacy protection for all personal and academic information'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: '24/7 Availability',
      description: 'Access your portal anytime, anywhere with mobile-friendly design'
    }
  ];

  const gettingStarted = [
    {
      step: 1,
      title: 'Registration',
      description: 'Complete your registration process with the academy administration',
      icon: <User className="w-8 h-8" />
    },
    {
      step: 2,
      title: 'Account Creation',
      description: 'Receive your login credentials via email and SMS',
      icon: <FileText className="w-8 h-8" />
    },
    {
      step: 3,
      title: 'Portal Access',
      description: 'Log in to your student portal and complete your profile setup',
      icon: <BookOpen className="w-8 h-8" />
    },
    {
      step: 4,
      title: 'Start Learning',
      description: 'Begin accessing courses, schedules, and academy resources',
      icon: <Star className="w-8 h-8" />
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
            Student <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Portal</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Your comprehensive dashboard for managing courses, schedules, payments, and academic progress
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Portal Features */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Portal <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Features</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Access all academy services and resources through our comprehensive student portal
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Access Levels */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Access <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Levels</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Different portal experiences tailored for students, parents, and teachers
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {accessLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                  {level.role}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                  {level.description}
                </p>
                <ul className="space-y-3">
                  {level.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4 text-purple-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Security Features */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Security & <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Privacy</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Your data and privacy are our top priorities with enterprise-level security
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((security, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
                  {security.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {security.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {security.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Getting Started */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Getting <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Started</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Simple steps to access your student portal and begin your digital learning journey
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {gettingStarted.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">
                    {step.step}
                  </span>
                </div>
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
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
              Need Help with Your Student Portal?
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Our support team is ready to help you navigate and make the most of your student portal experience.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Support: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                Email Support
              </motion.a>
            </div>
            <div className="mt-8 p-6 bg-white/10 rounded-lg">
              <p className="text-lg font-semibold mb-2">Already Registered?</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-yellow-400 text-purple-900 px-8 py-3 rounded-lg font-bold hover:bg-yellow-300 transition-all duration-300"
              >
                Access Student Portal
              </motion.button>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default StudentPortalInfoPage;