import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Mail, Phone, Globe, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getCourses } from '../api';
import { COUNTRIES } from '../constants';
import type { Course } from '../types';

interface DemoBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookingData: DemoBookingData) => Promise<void>;
}

export interface DemoBookingData {
  name: string;
  email: string;
  phoneNumber: string;
  country: string;
  courseName: string;
  courseId?: string;
  message?: string;
}

const DemoBookingModal: React.FC<DemoBookingModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [formData, setFormData] = useState<DemoBookingData>({
    name: '',
    email: '',
    phoneNumber: '',
    country: 'India', // Default to India
    courseName: '',
    courseId: '',
    message: ''
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Fetch courses when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      // Reset form when modal opens
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        country: 'India',
        courseName: '',
        courseId: '',
        message: ''
      });
      setValidationErrors({});
      setError(null);
      setIsSubmitted(false);
    }
  }, [isOpen]);

  const fetchCourses = async () => {
    try {
      const fetchedCourses = await getCourses();
      setCourses(fetchedCourses);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }

    if (!formData.country) {
      errors.country = 'Please select a country';
    }

    if (!formData.courseName) {
      errors.courseName = 'Please select a course';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof DemoBookingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCourseSelect = (courseId: string, courseName: string) => {
    setFormData(prev => ({ ...prev, courseId, courseName }));
    if (validationErrors.courseName) {
      setValidationErrors(prev => ({ ...prev, courseName: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      setIsSubmitted(true);
      
      // Close modal after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit demo booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-6">
                {!isSubmitted ? (
                  <>
                    {/* Header */}
                    <div className="mb-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <h2 className={`text-2xl font-bold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Book a Demo Class
                      </h2>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Experience our teaching methodology with a free demo class
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                            validationErrors.name ? 'border-red-500' : ''
                          }`}
                          placeholder="Enter your full name"
                        />
                        {validationErrors.name && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                            validationErrors.email ? 'border-red-500' : ''
                          }`}
                          placeholder="your.email@example.com"
                        />
                        {validationErrors.email && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                            validationErrors.phoneNumber ? 'border-red-500' : ''
                          }`}
                          placeholder="+1 (555) 123-4567"
                        />
                        {validationErrors.phoneNumber && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.phoneNumber}</p>
                        )}
                      </div>

                      {/* Country */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Country *
                        </label>
                        <select
                          value={formData.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                            validationErrors.country ? 'border-red-500' : ''
                          }`}
                        >
                          {COUNTRIES.map(country => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                        {validationErrors.country && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.country}</p>
                        )}
                      </div>

                      {/* Course Selection */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Select Course *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {courses.map(course => (
                            <button
                              key={course.id}
                              type="button"
                              onClick={() => handleCourseSelect(course.id, course.name)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                formData.courseId === course.id
                                  ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                                  : theme === 'dark'
                                    ? 'border-gray-600 hover:border-gray-500 text-gray-300 hover:bg-gray-700/50'
                                    : 'border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-sm font-medium">{course.name}</div>
                              {course.description && (
                                <div className={`text-xs mt-1 ${
                                  formData.courseId === course.id
                                    ? 'text-purple-500'
                                    : theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                                }`}>
                                  {course.description.slice(0, 50)}...
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        {validationErrors.courseName && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.courseName}</p>
                        )}
                      </div>

                      {/* Optional Message */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Message (Optional)
                        </label>
                        <textarea
                          value={formData.message}
                          onChange={(e) => handleInputChange('message', e.target.value)}
                          rows={3}
                          className={`w-full px-4 py-3 rounded-xl border transition-colors resize-none ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                          placeholder="Any specific questions or requirements?"
                        />
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-5 h-5" />
                            Book Demo Class
                          </>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  /* Success State */
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Demo Booking Confirmed!
                    </h3>
                    <p className={`text-sm mb-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Thank you for your interest! We'll contact you shortly to schedule your demo class.
                    </p>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      You should receive a confirmation email within a few minutes.
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DemoBookingModal;