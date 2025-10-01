import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FileText, CheckCircle, AlertCircle, CreditCard, UserX, Scale, BookOpen, Phone } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const TermsOfServicePage: React.FC = () => {
  const { theme } = useTheme();
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });

  const sections = [
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "Acceptance of Terms",
      content: [
        "By enrolling in classes at Nadanaloga Academy, you agree to these Terms of Service",
        "These terms apply to all students, parents/guardians, and visitors",
        "Continued use of our services constitutes acceptance of any updates to these terms",
        "If you do not agree with these terms, please do not enroll or use our services"
      ]
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Enrollment and Registration",
      content: [
        "All registrations must be completed with accurate and complete information",
        "Parent/guardian consent is required for students under 18 years of age",
        "Registration is subject to availability and course prerequisites",
        "We reserve the right to refuse admission or cancel enrollment at our discretion",
        "Students must complete the registration process and pay applicable fees before attending classes"
      ]
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "Fees and Payment",
      content: [
        "All fees are clearly communicated at the time of enrollment",
        "Fees must be paid in advance as per the payment schedule",
        "Late payment may result in suspension of services",
        "Refunds are subject to our refund policy (detailed below)",
        "We reserve the right to adjust fees with 30 days notice",
        "Payment methods accepted include cash, bank transfer, and online payment"
      ]
    },
    {
      icon: <UserX className="w-8 h-8" />,
      title: "Refund and Cancellation Policy",
      content: [
        "Cancellations must be made in writing (email or letter)",
        "Full refund if cancelled within 7 days of registration (before classes start)",
        "50% refund if cancelled within the first month of classes",
        "No refund after one month of classes",
        "Medical emergencies will be considered on a case-by-case basis",
        "Missed classes due to student absence are not eligible for refund",
        "Academy-initiated cancellations will receive full refund or credit"
      ]
    },
    {
      icon: <AlertCircle className="w-8 h-8" />,
      title: "Code of Conduct",
      content: [
        "Students must arrive on time and be prepared for class",
        "Appropriate attire as specified by the instructor is required",
        "Respectful behavior towards teachers, staff, and fellow students is mandatory",
        "Academy property must be treated with care",
        "Photography/videography during classes requires permission",
        "Disruptive behavior may result in dismissal without refund",
        "Parents/guardians must remain in designated waiting areas during classes"
      ]
    },
    {
      icon: <Scale className="w-8 h-8" />,
      title: "Intellectual Property",
      content: [
        "All course materials, choreography, and teaching methods are proprietary",
        "Students may not record, reproduce, or share class content without permission",
        "Performance recordings may be used by the academy for promotional purposes",
        "Copyright of all promotional materials belongs to Nadanaloga Academy",
        "Students retain ownership of their personal performances but grant us usage rights for promotion"
      ]
    },
    {
      icon: <AlertCircle className="w-8 h-8" />,
      title: "Liability and Safety",
      content: [
        "Students participate in physical activities at their own risk",
        "The academy maintains appropriate insurance coverage",
        "Medical conditions must be disclosed at the time of registration",
        "The academy is not liable for personal injuries sustained during classes",
        "Parents/guardians are responsible for their child's safety outside class hours",
        "Emergency contact information must be kept up-to-date",
        "We follow all COVID-19 and health safety protocols as required"
      ]
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Class Schedules and Changes",
      content: [
        "Class schedules are subject to change with reasonable notice",
        "Make-up classes may be offered for academy-cancelled sessions",
        "Holiday and vacation schedules will be communicated in advance",
        "Private lessons require 24-hour cancellation notice",
        "The academy reserves the right to change instructors if necessary",
        "Minimum enrollment numbers may be required for certain classes"
      ]
    },
    {
      icon: <Phone className="w-8 h-8" />,
      title: "Communication",
      content: [
        "Primary communication will be via email and phone",
        "Important updates may be shared through WhatsApp groups",
        "Parents/guardians must respond to communications within 48 hours",
        "Changes in contact information must be reported immediately",
        "Newsletters and promotional materials may be sent periodically",
        "You can opt-out of promotional communications at any time"
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
            className="absolute top-20 right-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
            animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-20 left-20 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-20"
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
              <FileText className="w-16 h-16 text-purple-600" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6"
            >
              Terms of Service
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className={`text-lg md:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}
            >
              Please read these terms carefully before enrolling. Last updated: October 2024
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
              Welcome to Nadanaloga Academy! These Terms of Service govern your use of our services, enrollment in our classes,
              and participation in our programs. By enrolling with us, you acknowledge that you have read, understood, and agree
              to be bound by these terms and conditions.
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

      {/* Contact Section */}
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
              Questions About These Terms?
            </h2>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-4`}>
              If you have any questions or concerns about these Terms of Service, please contact us:
            </p>
            <div className={`space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <p>Email: nadanalogaa@gmail.com</p>
              <p>Phone: +91 95668 66588, +91 90929 08888</p>
              <p>Address: Plot no3, VIT Serasa Ave, beside VIT College Ponmar, Chennai 600127</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Agreement Section */}
      <section className="py-12 px-6 pb-20">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`${theme === 'dark' ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} rounded-2xl p-8 shadow-2xl text-white`}
          >
            <h2 className="text-2xl font-bold mb-4">Amendments to Terms</h2>
            <p className="leading-relaxed mb-4">
              Nadanaloga Academy reserves the right to modify these Terms of Service at any time. We will notify students and
              parents of significant changes via email or through our website. Continued enrollment after such modifications
              constitutes acceptance of the updated terms.
            </p>
            <p className="leading-relaxed">
              By enrolling in our programs, you acknowledge that you have read these Terms of Service and agree to abide by them.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfServicePage;
