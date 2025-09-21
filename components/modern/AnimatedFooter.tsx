import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Instagram, 
  Youtube, 
  Twitter,
  Heart,
  ArrowUp,
  Music,
  Users
} from 'lucide-react';

const AnimatedFooter: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerSections = [
    {
      title: 'Contact Us',
      items: [
        { icon: <Phone className="w-4 h-4" />, text: '+1 (555) 123-4567' },
        { icon: <Mail className="w-4 h-4" />, text: 'info@nadanaloga.com' },
        { icon: <MapPin className="w-4 h-4" />, text: '123 Dance Street, Arts District, NY 10001' }
      ]
    },
    {
      title: 'Programs',
      items: [
        { text: 'Bharatanatyam Classes' },
        { text: 'Kuchipudi Training' },
        { text: 'Vocal Music' },
        { text: 'Kids Programs' },
        { text: 'Private Lessons' },
        { text: 'Performance Workshops' }
      ]
    },
    {
      title: 'Academy',
      items: [
        { text: 'About Us' },
        { text: 'Our Instructors' },
        { text: 'Student Gallery' },
        { text: 'Events & Performances' },
        { text: 'Testimonials' },
        { text: 'Careers' }
      ]
    },
    {
      title: 'Resources',
      items: [
        { text: 'Class Schedules' },
        { text: 'Student Portal' },
        { text: 'Registration' },
        { text: 'FAQ' },
        { text: 'Blog' },
        { text: 'Support' }
      ]
    }
  ];

  const socialLinks = [
    { icon: <Facebook className="w-5 h-5" />, href: '#', color: 'hover:text-blue-500' },
    { icon: <Instagram className="w-5 h-5" />, href: '#', color: 'hover:text-pink-500' },
    { icon: <Youtube className="w-5 h-5" />, href: 'https://www.youtube.com/@Nadanaloga', color: 'hover:text-red-500' },
    { icon: <Twitter className="w-5 h-5" />, href: '#', color: 'hover:text-blue-400' }
  ];

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white overflow-hidden" ref={ref}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-20 -right-20 w-60 h-60 bg-pink-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/3 w-32 h-32 bg-yellow-500 rounded-full blur-2xl"
        />
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="container mx-auto px-4 py-16">
          {/* Top Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={inView ? { scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <img
                src="/danceImages/responsive/large/Logo.webp"
                alt="Nadanaloga Academy"
                className="h-16 w-auto animate-float"
              />
            </motion.div>
            
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-2xl font-bold mb-4"
            >
              Nadanaloga Academy
            </motion.h3>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-gray-300 max-w-2xl mx-auto"
            >
              Preserving the beauty and tradition of classical Indian dance through dedicated teaching and passionate performances.
            </motion.p>
          </motion.div>

          {/* Footer Sections Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {footerSections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="space-y-4"
              >
                <h4 className="text-lg font-semibold text-yellow-400 mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <motion.li
                      key={itemIndex}
                      whileHover={{ x: 5 }}
                      className="text-gray-300 hover:text-white transition-all duration-300 cursor-pointer flex items-center gap-2"
                    >
                      {item.icon && item.icon}
                      {item.text}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-t border-gray-700"
          >
            {[
              { icon: <Users className="w-8 h-8" />, value: '200+', label: 'Happy Students' },
              { icon: <Music className="w-8 h-8" />, value: '15+', label: 'Courses Offered' },
              { icon: <Heart className="w-8 h-8" />, value: '12+', label: 'Years of Excellence' },
              { icon: <Youtube className="w-8 h-8" />, value: '50+', label: 'Performances' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                className="text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="text-yellow-400 mb-2 flex justify-center"
                >
                  {stat.icon}
                </motion.div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex justify-center space-x-6 py-8 border-t border-gray-700"
          >
            {socialLinks.map((social, index) => (
              <motion.a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.2, y: -3 }}
                whileTap={{ scale: 0.9 }}
                className={`text-gray-400 ${social.color} transition-colors duration-300 p-3 bg-white/5 rounded-full hover:bg-white/10`}
              >
                {social.icon}
              </motion.a>
            ))}
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="border-t border-gray-700 py-6"
        >
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 Nadanaloga Academy. All rights reserved. Made with{' '}
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-red-500 inline-block mx-1"
              >
                <Heart className="w-4 h-4 inline fill-current" />
              </motion.span>
              for the arts.
            </p>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <motion.a href="#" whileHover={{ scale: 1.05 }} className="hover:text-white transition-colors">
                Privacy Policy
              </motion.a>
              <motion.a href="#" whileHover={{ scale: 1.05 }} className="hover:text-white transition-colors">
                Terms of Service
              </motion.a>
            </div>
          </div>
        </motion.div>

        {/* Scroll to Top Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 1.6 }}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="absolute bottom-8 right-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-black p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      </div>
    </footer>
  );
};

export default AnimatedFooter;