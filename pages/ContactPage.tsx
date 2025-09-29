import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, Star, CheckCircle } from 'lucide-react';
import { submitContactForm } from '../api';
import { useTheme } from '../contexts/ThemeContext';

const ContactPage: React.FC = () => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({ name: '', email: '', message: '', subject: '', phone: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [contactRef, contactInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [formRef, formInView] = useInView({ threshold: 0.1, triggerOnce: true });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await submitContactForm(formData);
      setSuccess(true);
      setFormData({ name: '', email: '', message: '', subject: '', phone: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsLoading(false);
    }
  };

  const locations = [
    {
      name: "Main Branch - Sembakkam",
      address: "Nadanaloga Academy, Sembakkam Main Road, Chennai, Tamil Nadu 600073",
      phone: "+91 98765 43210",
      email: "sembakkam@nadanaloga.com",
      hours: "Mon - Sat: 9:00 AM - 8:00 PM",
      mapUrl: "https://maps.google.com/?q=Nadanaloga+Sembakkam",
      features: ['All Courses Available', 'Main Studio', 'Performance Hall', 'Parking Available']
    },
    {
      name: "Branch - Mambakkam VIT Avenue",
      address: "Nadanaloga Academy, VIT Avenue, Mambakkam, Chennai, Tamil Nadu 600127",
      phone: "+91 98765 43211", 
      email: "mambakkam@nadanaloga.com",
      hours: "Mon - Sat: 9:00 AM - 7:00 PM",
      mapUrl: "https://maps.google.com/?q=Nadanaloga+Mambakkam+VIT+avenue",
      features: ['Dance & Music', 'Modern Facilities', 'Easy Access', 'Student Parking']
    }
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: "Call Us",
      description: "Speak with our team",
      value: "+91 98765 43210",
      action: "tel:+919876543210"
    },
    {
      icon: Mail,
      title: "Email Us",
      description: "Send us a message",
      value: "info@nadanaloga.com",
      action: "mailto:info@nadanaloga.com"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Quick chat support",
      value: "Chat with us",
      action: "https://wa.me/919876543210"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      {/* Hero Section with Parallax */}
      <section className="relative min-h-[50vh] overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-blue-50 to-purple-100 dark:from-gray-800 dark:via-emerald-900 dark:to-blue-900"></div>
          
          {/* Floating Contact Elements */}
          <motion.div
            className="absolute top-20 left-10 w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-lg opacity-20 rotate-45"
            animate={{
              y: [0, -25, 0],
              rotate: [45, 75, 45],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-1/3 right-20 w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-20"
            animate={{
              y: [0, 20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-32 left-1/3 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
            animate={{
              y: [0, -30, 0],
              x: [0, 25, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Contact Icons Pattern */}
          <div className="absolute inset-0">
            <Mail className="absolute top-1/4 left-1/4 w-8 h-8 text-emerald-300 dark:text-emerald-600 opacity-20" />
            <Phone className="absolute top-2/3 right-1/3 w-6 h-6 text-blue-300 dark:text-blue-600 opacity-20" />
            <MapPin className="absolute bottom-1/4 left-1/2 w-7 h-7 text-purple-300 dark:text-purple-600 opacity-20" />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-[50vh] px-6">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center max-w-5xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="mb-8"
            >
              <MessageCircle className="w-20 h-20 mx-auto mb-6 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
                Get In Touch
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className={`text-xl md:text-2xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-8`}
            >
              Ready to begin your artistic journey? We're here to help you take the first step
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex justify-center space-x-4"
            >
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </motion.div>
          </motion.div>
        </div>

      </section>

      {/* Contact Methods */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-50/30 to-transparent dark:via-gray-800/30"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={contactInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          >
            {contactMethods.map((method, index) => (
              <motion.a
                key={index}
                href={method.action}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={contactInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                className={`block text-center p-8 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-emerald-200'} border-2 backdrop-blur-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300`}
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.8 }}
                  className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-shadow duration-300"
                >
                  <method.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                  {method.title}
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                  {method.description}
                </p>
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {method.value}
                </p>

                {/* Hover glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Locations & Contact Form */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-7xl mx-auto">
            {/* Locations */}
            <motion.div
              ref={contactRef}
              initial={{ opacity: 0, x: -50 }}
              animate={contactInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 1 }}
            >
              <h2 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-8`}>
                Our Locations
              </h2>
              
              <div className="space-y-8">
                {locations.map((location, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={contactInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                    className={`p-8 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-emerald-200'} border-2 backdrop-blur-sm relative overflow-hidden hover:shadow-lg transition-all duration-300`}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                          {location.name}
                        </h3>
                        <div className="flex items-center text-emerald-600 dark:text-emerald-400 mb-2">
                          {index === 0 ? (
                            <>
                              <Star className="w-4 h-4 mr-1 fill-current" />
                              <span className="text-sm font-medium">Main Branch</span>
                            </>
                          ) : (
                            <span className="text-sm font-medium">Branch Location</span>
                          )}
                        </div>
                      </div>
                      <MapPin className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {location.address}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <a 
                          href={`tel:${location.phone}`} 
                          className="text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          {location.phone}
                        </a>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <a 
                          href={`mailto:${location.email}`} 
                          className="text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          {location.email}
                        </a>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {location.hours}
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-2 gap-2">
                        {location.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Get Directions Button */}
                    <motion.a
                      href={location.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-6 inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-medium rounded-xl hover:shadow-lg transition-shadow duration-300"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Get Directions</span>
                    </motion.a>

                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-t-[30px] border-t-emerald-500/10"></div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              ref={formRef}
              initial={{ opacity: 0, x: 50 }}
              animate={formInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 1 }}
              className="sticky top-8"
            >
              <div className={`p-8 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-emerald-200'} border-2 backdrop-blur-sm shadow-xl relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                
                <div className="relative z-10">
                  <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Send us a Message
                  </h2>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-8`}>
                    Ready to start your artistic journey? Get in touch with us today!
                  </p>

                  {success ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center p-8 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-2xl border border-emerald-200 dark:border-emerald-700"
                    >
                      <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                        Message Sent Successfully!
                      </h3>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Thank you for reaching out. We'll get back to you within 24 hours!
                      </p>
                      <button
                        onClick={() => setSuccess(false)}
                        className="mt-4 px-6 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors duration-300"
                      >
                        Send Another Message
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="name" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            disabled={isLoading}
                            value={formData.name}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 ${theme === 'dark' 
                              ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-emerald-500' 
                              : 'bg-white/70 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-emerald-500'
                            }`}
                            placeholder="Your full name"
                          />
                        </div>

                        <div>
                          <label htmlFor="phone" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            id="phone"
                            disabled={isLoading}
                            value={formData.phone}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 ${theme === 'dark' 
                              ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-emerald-500' 
                              : 'bg-white/70 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-emerald-500'
                            }`}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          required
                          disabled={isLoading}
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 ${theme === 'dark' 
                            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-emerald-500' 
                            : 'bg-white/70 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-emerald-500'
                          }`}
                          placeholder="your.email@example.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="subject" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Subject
                        </label>
                        <select
                          name="subject"
                          id="subject"
                          disabled={isLoading}
                          value={formData.subject}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 ${theme === 'dark' 
                            ? 'bg-gray-700/50 border-gray-600 text-white focus:border-emerald-500' 
                            : 'bg-white/70 border-gray-300 text-gray-900 focus:border-emerald-500'
                          }`}
                        >
                          <option value="">Select a subject</option>
                          <option value="course-inquiry">Course Inquiry</option>
                          <option value="enrollment">Enrollment</option>
                          <option value="schedule">Schedule Information</option>
                          <option value="fees">Fees & Payment</option>
                          <option value="performance">Performance Opportunities</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="message" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Message *
                        </label>
                        <textarea
                          name="message"
                          id="message"
                          rows={5}
                          required
                          disabled={isLoading}
                          value={formData.message}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 resize-none ${theme === 'dark' 
                            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-emerald-500' 
                            : 'bg-white/70 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-emerald-500'
                          }`}
                          placeholder="Tell us about your interest in our programs or ask any questions you may have..."
                        />
                      </div>

                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-600 text-center bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-200 dark:border-red-800"
                        >
                          {error}
                        </motion.p>
                      )}

                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center space-x-3 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Sending Message...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span>Send Message</span>
                          </>
                        )}
                      </motion.button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating decorative elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-20 w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-400 rounded-lg opacity-20"
        />
        <motion.div
          animate={{
            y: [0, 25, 0],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-20 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
        />
      </section>
    </div>
  );
};

export default ContactPage;