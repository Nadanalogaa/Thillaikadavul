import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Calendar, MapPin, Globe, Monitor, Users, Phone } from 'lucide-react';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseType?: 'instrument' | 'regular';
}

interface EnrollmentFormData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  location: string;
  classMode: 'online' | 'offline';
  instrument?: string;
  customInstrument?: string;
}

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  courseType = 'regular'
}) => {
  const [formData, setFormData] = useState<EnrollmentFormData>({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    location: '',
    classMode: 'online',
    instrument: '',
    customInstrument: ''
  });

  const [errors, setErrors] = useState<Partial<EnrollmentFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const instrumentOptions = [
    { value: 'violin', label: 'Violin' },
    { value: 'keyboard', label: 'Keyboard' },
    { value: 'veena', label: 'Veena' },
    { value: 'others', label: 'Others' }
  ];


  const validateEmail = (email: string): { isValid: boolean; error?: string } => {
    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email format' };
    }

    return { isValid: true };
  };

  const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');

    // Check minimum length (should be at least 10 digits)
    if (cleanPhone.length < 10) {
      return { isValid: false, error: 'Phone number must be at least 10 digits' };
    }

    // Check for suspicious patterns
    if (/^(\d)\1{9,}$/.test(cleanPhone)) { // All same digit
      return { isValid: false, error: 'Please enter a valid phone number' };
    }

    if (/^(1234567890|0987654321|1111111111|0000000000)$/.test(cleanPhone)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }

    return { isValid: true };
  };

  const validateName = (name: string): { isValid: boolean; error?: string } => {
    // Check minimum length
    if (name.trim().length < 2) {
      return { isValid: false, error: 'Name must be at least 2 characters long' };
    }

    return { isValid: true };
  };


  const validateForm = (): boolean => {
    const newErrors: Partial<EnrollmentFormData> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else {
      const nameValidation = validateName(formData.name);
      if (!nameValidation.isValid) {
        newErrors.name = nameValidation.error;
      }
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error;
      }
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneValidation = validatePhoneNumber(formData.phone);
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error;
      }
    }

    // Validate date of birth
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      // Check if date is not in the future
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      if (birthDate > today) {
        newErrors.dateOfBirth = 'Birth date cannot be in the future';
      }

      // Check if age is reasonable (not more than 120 years old)
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age > 120) {
        newErrors.dateOfBirth = 'Please enter a valid birth date';
      }
    }

    // Validate location
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    } else if (formData.location.trim().length < 2) {
      newErrors.location = 'Please enter a valid location';
    }

    // Validate instrument selection
    if (courseType === 'instrument') {
      if (!formData.instrument) {
        newErrors.instrument = 'Please select an instrument';
      } else if (formData.instrument === 'others' && !formData.customInstrument?.trim()) {
        newErrors.customInstrument = 'Please specify the instrument';
      } else if (formData.instrument === 'others' && formData.customInstrument && formData.customInstrument.trim().length < 2) {
        newErrors.customInstrument = 'Please enter a valid instrument name';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare submission data
      const submissionData = {
        ...formData,
        courseTitle,
        courseType,
        finalInstrument: courseType === 'instrument'
          ? (formData.instrument === 'others' ? formData.customInstrument : formData.instrument)
          : undefined,
        submittedAt: new Date().toISOString()
      };

      // Prepare validation information for admin
      const emailValidation = validateEmail(formData.email);
      const nameValidation = validateName(formData.name);
      const phoneValidation = validatePhoneNumber(formData.phone);

      // Log enrollment data for admin to collect (in a real app, send to backend API)
      console.log('🎓 New Enrollment Submitted:', {
        course: courseTitle,
        student: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          location: formData.location,
          classMode: formData.classMode,
          instrument: courseType === 'instrument' ? submissionData.finalInstrument : null
        },
        submittedAt: new Date().toISOString()
      });

      // In a real application, you would send this data to your backend API
      // Example: await fetch('/api/enrollments', { method: 'POST', body: JSON.stringify(submissionData) })


      console.log('Enrollment submitted:', submissionData);

      setSubmitSuccess(true);

      // Reset form after 4 seconds to give user time to read success message
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
        setFormData({
          name: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          location: '',
          classMode: 'online',
          instrument: '',
          customInstrument: '',
        });
        setErrors({});
      }, 4000);

    } catch (error) {
      console.error('Failed to submit enrollment:', error);
      alert('Failed to submit enrollment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof EnrollmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Enroll Now
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {courseTitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Success Message */}
            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <div className="text-center">
                  <p className="text-green-800 dark:text-green-300 font-medium text-lg mb-2">
                    🎉 Enrollment submitted successfully!
                  </p>
                  <p className="text-green-700 dark:text-green-400 text-sm">
                    Thank you, {formData.name}! We'll contact you at {formData.email} within 24 hours.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.name
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-white`}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.email
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-white`}
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.phone
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-white`}
                  placeholder="Enter your phone number"
                />
                {errors.phone && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.dateOfBirth
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-white`}
                />
                {errors.dateOfBirth && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.dateOfBirth}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.location
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-white`}
                  placeholder="Enter your city/location"
                />
                {errors.location && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.location}</p>
                )}
              </div>

              {/* Class Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Preferred Class Mode *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleInputChange('classMode', 'online')}
                    className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
                      formData.classMode === 'online'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <Globe className="w-6 h-6" />
                    <span className="font-medium">Online</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleInputChange('classMode', 'offline')}
                    className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
                      formData.classMode === 'offline'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <Users className="w-6 h-6" />
                    <span className="font-medium">Offline</span>
                  </motion.button>
                </div>
              </div>

              {/* Instrument Selection (only for instrument courses) */}
              {courseType === 'instrument' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Monitor className="w-4 h-4 inline mr-2" />
                    Select Instrument *
                  </label>
                  <select
                    value={formData.instrument}
                    onChange={(e) => handleInputChange('instrument', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      errors.instrument
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } text-gray-900 dark:text-white`}
                  >
                    <option value="">Select an instrument</option>
                    {instrumentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.instrument && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.instrument}</p>
                  )}

                  {/* Custom Instrument Input */}
                  {formData.instrument === 'others' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={formData.customInstrument}
                        onChange={(e) => handleInputChange('customInstrument', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                          errors.customInstrument
                            ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                        } text-gray-900 dark:text-white`}
                        placeholder="Please specify the instrument"
                      />
                      {errors.customInstrument && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.customInstrument}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting || submitSuccess}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-300 ${
                  isSubmitting || submitSuccess
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg'
                } text-white`}
              >
                {isSubmitting ? 'Submitting...' : submitSuccess ? 'Submitted!' : 'Submit Enrollment'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnrollmentModal;