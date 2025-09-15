import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, Star } from 'lucide-react';

const BookDemoSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    danceStyle: 'Bharatanatyam',
    timeSlot: 'morning',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Demo class booking:', formData);
    alert('Thank you! We will contact you soon to schedule your demo class.');
  };

  const features = [
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Flexible Scheduling',
      description: 'Choose your preferred time slot that fits your schedule'
    },
    {
      icon: <User className="w-6 h-6" />,
      title: 'Expert Instructors',
      description: 'Learn from certified classical dance professionals'
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: 'Free Assessment',
      description: 'Get personalized feedback and course recommendations'
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: 'All Levels Welcome',
      description: 'Perfect for beginners and experienced dancers alike'
    }
  ];

  const timeSlots = [
    { value: 'morning', label: 'Morning (9 AM - 12 PM)', popular: true },
    { value: 'afternoon', label: 'Afternoon (1 PM - 4 PM)', popular: false },
    { value: 'evening', label: 'Evening (5 PM - 8 PM)', popular: true },
    { value: 'weekend', label: 'Weekend Special', popular: false }
  ];

  const danceStyles = [
    'Bharatanatyam',
    'Kuchipudi', 
    'Classical Vocal',
    'Kids Program',
    'Fusion Dance'
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-800 dark:via-purple-900/20 dark:to-gray-900" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6"
          >
            Book Your <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Free Demo Class</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
          >
            Experience the beauty of classical Indian dance with a complimentary trial class. 
            Our expert instructors will guide you through the basics and help you discover your passion for dance.
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={inView ? { scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1, type: "spring" }}
                    className="text-purple-600 dark:text-purple-400 mb-4"
                  >
                    {feature.icon}
                  </motion.div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* What to Expect */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white"
            >
              <h3 className="text-2xl font-bold mb-4">What to Expect in Your Demo Class</h3>
              <ul className="space-y-3">
                {[
                  'Introduction to basic dance positions and movements',
                  'Understanding rhythm and classical music basics',
                  'Personalized assessment of your skill level',
                  'Discussion about suitable courses for your goals',
                  'Q&A session with our experienced instructors'
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    className="flex items-center"
                  >
                    <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* Booking Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8"
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Reserve Your Spot
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Fill out the form below and we'll contact you within 24 hours to confirm your demo class.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                    placeholder="Your age"
                    min="5"
                    max="80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Dance Style
                </label>
                <select
                  name="danceStyle"
                  value={formData.danceStyle}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                >
                  {danceStyles.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Preferred Time Slot
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {timeSlots.map(slot => (
                    <label
                      key={slot.value}
                      className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                        formData.timeSlot === slot.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="timeSlot"
                        value={slot.value}
                        checked={formData.timeSlot === slot.value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {slot.label.split(' ')[0]}
                          </span>
                          {slot.popular && (
                            <span className="ml-2 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {slot.label.split(' ').slice(1).join(' ')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                  placeholder="Tell us about your dance experience or any specific questions you have..."
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, boxShadow: "0 15px 40px rgba(0,0,0,0.15)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-8 rounded-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book My Free Demo Class
              </motion.button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              By booking a demo class, you agree to our terms and conditions. 
              <br />No payment required for the demo session.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BookDemoSection;