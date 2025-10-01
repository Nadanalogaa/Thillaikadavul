import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Shield, Lock, Eye, Database, UserCheck, Mail, Phone } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const PrivacyPolicyPage: React.FC = () => {
  const { theme } = useTheme();
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });

  const sections = [
    {
      icon: <Database className="w-8 h-8" />,
      title: "Information We Collect",
      content: [
        "Personal information (name, email, phone number, address)",
        "Student information (age, course preferences, parent/guardian details)",
        "Payment and billing information",
        "Attendance and performance records",
        "Photographs and videos from classes and performances (with consent)",
        "Communication history with our academy"
      ]
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "How We Use Your Information",
      content: [
        "To provide and manage our educational services",
        "To communicate about classes, schedules, and events",
        "To process payments and maintain billing records",
        "To track student progress and attendance",
        "To improve our courses and teaching methods",
        "To send newsletters and promotional materials (with consent)",
        "To comply with legal obligations and protect our rights"
      ]
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Data Security",
      content: [
        "We implement appropriate security measures to protect your personal information",
        "Access to student data is restricted to authorized personnel only",
        "We use secure payment processing systems for financial transactions",
        "Regular backups are maintained to prevent data loss",
        "We do not sell or rent your personal information to third parties"
      ]
    },
    {
      icon: <UserCheck className="w-8 h-8" />,
      title: "Your Rights",
      content: [
        "Access your personal information we hold about you",
        "Request corrections to inaccurate or incomplete data",
        "Request deletion of your personal information (subject to legal requirements)",
        "Opt-out of marketing communications at any time",
        "Withdraw consent for photo/video usage",
        "Request a copy of your data in a portable format"
      ]
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Children's Privacy",
      content: [
        "We take special care in protecting the privacy of minors",
        "Parent/guardian consent is required for students under 18 years",
        "We only collect information necessary for educational purposes",
        "Photos and videos of minors are only taken with explicit parental consent",
        "Parents have the right to review and request deletion of their child's information"
      ]
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: "Contact Information",
      content: [
        "If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:",
        "Email: nadanalogaa@gmail.com",
        "Phone: +91 95668 66588, +91 90929 08888",
        "Address: Plot no3, VIT Serasa Ave, beside VIT College Ponmar, Chennai 600127"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative min-h-[40vh] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900"></div>
          <motion.div
            className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
            animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-20"
            animate={{ y: [0, 20, 0], rotate: [360, 180, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-[40vh] px-6">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="text-center max-w-4xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={heroInView ? { scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <Shield className="w-16 h-16 text-purple-600" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6"
            >
              Privacy Policy
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className={`text-lg md:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}
            >
              Your privacy is important to us. Last updated: October 2024
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gradient-to-br from-purple-50 to-indigo-50'} rounded-2xl p-8 shadow-lg`}
          >
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              At Nadanaloga Academy, we are committed to protecting your privacy and ensuring the security of your personal information.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services,
              visit our website, or enroll in our classes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl space-y-12">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-purple-100'} border rounded-2xl p-8 shadow-lg`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="text-purple-600 dark:text-purple-400">
                  {section.icon}
                </div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-3">
                {section.content.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className={`flex items-start gap-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    <span className="text-purple-600 mt-1.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Cookie Policy */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gradient-to-br from-blue-50 to-purple-50'} rounded-2xl p-8 shadow-lg`}
          >
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Cookies and Tracking
            </h2>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-4`}>
              We use cookies and similar tracking technologies to improve your experience on our website.
              Cookies help us understand how you use our site and enable certain features.
            </p>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              You can control cookie settings through your browser preferences. However, disabling cookies may limit your ability
              to use certain features of our website.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Updates Section */}
      <section className="py-12 px-6 pb-20">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`${theme === 'dark' ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} rounded-2xl p-8 shadow-2xl text-white`}
          >
            <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.
              We will notify you of any significant changes by posting the new policy on our website with an updated "Last Updated" date.
              We encourage you to review this policy periodically.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;
