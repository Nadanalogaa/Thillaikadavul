import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  UserPlus,
  FileText,
  CheckCircle,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  Clock,
  MapPin,
  Users,
  Award,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import EnrollmentModal from '../components/EnrollmentModal';

const RegistrationInfoPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const [enrollmentModal, setEnrollmentModal] = useState<{
    isOpen: boolean;
    courseTitle: string;
    courseType: 'instrument' | 'regular';
  }>({
    isOpen: false,
    courseTitle: 'General Registration',
    courseType: 'regular'
  });

  const registrationSteps = [
    {
      step: 1,
      title: 'Course Selection',
      description: 'Choose from our available courses: Bharatanatyam, Carnatic Vocal, Drawing, Abacus, or Phonics',
      icon: <BookOpen className="w-8 h-8" />,
      details: ['Browse course catalog', 'Check prerequisites', 'Select difficulty level', 'Choose online/offline mode']
    },
    {
      step: 2,
      title: 'Contact & Inquiry',
      description: 'Get in touch with our admissions team to discuss your requirements and available slots',
      icon: <Phone className="w-8 h-8" />,
      details: ['Call or email us', 'Discuss your goals', 'Check availability', 'Schedule demo class']
    },
    {
      step: 3,
      title: 'Application Form',
      description: 'Fill out the comprehensive application form with personal and academic details',
      icon: <FileText className="w-8 h-8" />,
      details: ['Personal information', 'Emergency contacts', 'Medical information', 'Previous experience']
    },
    {
      step: 4,
      title: 'Document Submission',
      description: 'Submit required documents including ID proof, address proof, and photographs',
      icon: <FileText className="w-8 h-8" />,
      details: ['ID proof copy', 'Address proof', 'Recent photographs', 'Medical certificate (if required)']
    },
    {
      step: 5,
      title: 'Fee Payment',
      description: 'Complete the registration fee payment and monthly fee structure setup',
      icon: <CreditCard className="w-8 h-8" />,
      details: ['Registration fee', 'First month fee', 'Payment methods', 'Fee structure discussion']
    },
    {
      step: 6,
      title: 'Enrollment Confirmation',
      description: 'Receive confirmation with class schedule, batch details, and portal access',
      icon: <CheckCircle className="w-8 h-8" />,
      details: ['Enrollment confirmation', 'Class schedule', 'Student ID', 'Portal access details']
    }
  ];

  const requiredDocuments = [
    {
      document: 'Identity Proof',
      description: 'Aadhaar Card, Passport, or Driving License',
      icon: <FileText className="w-6 h-6" />
    },
    {
      document: 'Address Proof',
      description: 'Utility Bill, Bank Statement, or Aadhaar Card',
      icon: <MapPin className="w-6 h-6" />
    },
    {
      document: 'Photographs',
      description: '2 passport size recent photographs',
      icon: <Users className="w-6 h-6" />
    },
    {
      document: 'Age Proof (for minors)',
      description: 'Birth Certificate or School ID',
      icon: <Calendar className="w-6 h-6" />
    }
  ];

  const feeStructure = [
    {
      course: 'Bharatanatyam',
      registrationFee: '₹500',
      monthlyFee: '₹1,500',
      duration: '60 minutes',
      classes: '4 classes/month'
    },
    {
      course: 'Carnatic Vocal',
      registrationFee: '₹500',
      monthlyFee: '₹1,200',
      duration: '45 minutes',
      classes: '4 classes/month'
    },
    {
      course: 'Drawing',
      registrationFee: '₹300',
      monthlyFee: '₹800',
      duration: '60 minutes',
      classes: '4 classes/month'
    },
    {
      course: 'Abacus',
      registrationFee: '₹300',
      monthlyFee: '₹600',
      duration: '45 minutes',
      classes: '4 classes/month'
    },
    {
      course: 'Phonics',
      registrationFee: '₹250',
      monthlyFee: '₹500',
      duration: '30 minutes',
      classes: '4 classes/month'
    }
  ];

  const registrationMethods = [
    {
      method: 'Online Registration',
      description: 'Complete the registration process online through our website',
      steps: ['Fill online form', 'Upload documents', 'Online payment', 'Instant confirmation'],
      icon: <FileText className="w-8 h-8" />
    },
    {
      method: 'Visit Our Office',
      description: 'Come to our office for in-person registration and guidance',
      steps: ['Visit office', 'Meet counselor', 'Fill forms', 'Submit documents'],
      icon: <MapPin className="w-8 h-8" />
    },
    {
      method: 'Phone Registration',
      description: 'Start your registration process over a phone call with our team',
      steps: ['Call our number', 'Initial discussion', 'Form sent via email', 'Follow-up process'],
      icon: <Phone className="w-8 h-8" />
    }
  ];

  const benefits = [
    {
      title: 'Flexible Scheduling',
      description: 'Choose from morning, evening, and weekend batches',
      icon: <Clock className="w-6 h-6" />
    },
    {
      title: 'Multiple Locations',
      description: 'Classes available at both our branches',
      icon: <MapPin className="w-6 h-6" />
    },
    {
      title: 'Family Discounts',
      description: 'Special rates for multiple family members',
      icon: <Users className="w-6 h-6" />
    },
    {
      title: 'Performance Opportunities',
      description: 'Regular stage performances and competitions',
      icon: <Award className="w-6 h-6" />
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
      courseTitle: 'General Registration',
      courseType: 'regular'
    });
  };

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
            Registration <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Process</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Simple and transparent registration process to begin your artistic journey with us
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Registration Steps */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Registration <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Steps</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Follow these simple steps to complete your registration and start your learning journey
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {registrationSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {step.step}
                    </span>
                  </div>
                  <div className="text-purple-600 dark:text-purple-400">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {step.description}
                </p>
                <ul className="space-y-2">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Required Documents */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Required <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Documents</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Please prepare these documents for a smooth registration process
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {requiredDocuments.map((doc, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
                  {doc.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {doc.document}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {doc.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Fee Structure */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Fee <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Structure</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Transparent and affordable fee structure for all our courses
            </p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Course</th>
                  <th className="px-6 py-4 text-center">Registration Fee</th>
                  <th className="px-6 py-4 text-center">Monthly Fee</th>
                  <th className="px-6 py-4 text-center">Class Duration</th>
                  <th className="px-6 py-4 text-center">Classes per Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {feeStructure.map((fee, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {fee.course}
                    </td>
                    <td className="px-6 py-4 text-center text-purple-600 dark:text-purple-400 font-semibold">
                      {fee.registrationFee}
                    </td>
                    <td className="px-6 py-4 text-center text-green-600 dark:text-green-400 font-semibold">
                      {fee.monthlyFee}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">
                      {fee.duration}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">
                      {fee.classes}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Registration Methods */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Registration <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Methods</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose the most convenient way to register for your courses
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {registrationMethods.map((method, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
                  {method.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 text-center">
                  {method.method}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">
                  {method.description}
                </p>
                <ul className="space-y-2">
                  {method.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {step}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Registration <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Benefits</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Enjoy these exclusive benefits when you register with Nadanaloga Academy
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg text-center"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {benefit.description}
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
              Ready to Start Your Registration?
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Contact us today to begin your registration process and join our community of passionate learners.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <motion.button
                onClick={() => handleEnrollClick('General Registration', 'regular')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-yellow-400 text-purple-900 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Enroll Now
              </motion.button>
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Call: +91 95668 66588
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
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="font-semibold mb-2">Head Office Branch:</h4>
                <p className="text-sm">Plot no3, VIT Serasa avenue, beside VIT College Ponmar, Mambakkam, Chennai, Tamil Nadu 600127</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Sembakkam Branch:</h4>
                <p className="text-sm">4th St, Ayyappa Nagar, Sadasivam Nagar, Sembakkam Chennai, Tamil Nadu 600064</p>
              </div>
            </div>
          </motion.div>
        </section>
      </div>

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

export default RegistrationInfoPage;