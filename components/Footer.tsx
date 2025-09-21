import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Youtube, Linkedin } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

const Footer: React.FC = () => {
  const { theme } = useTheme();

  const socialLinks = [
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/nadanaloga_chennai/',
      icon: Instagram,
      color: 'from-pink-500 to-purple-600',
      hoverColor: 'hover:from-pink-400 hover:to-purple-500'
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/bharathanaatiyam',
      icon: Facebook,
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-500 hover:to-blue-600'
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@Nadanaloga',
      icon: Youtube,
      color: 'from-red-600 to-red-700',
      hoverColor: 'hover:from-red-500 hover:to-red-600'
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/nadanaloga-fine-arts-school-0431b6324/',
      icon: Linkedin,
      color: 'from-blue-700 to-blue-800',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    }
  ];

  return (
    <footer className={`${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-brand-dark text-brand-light'} transition-colors duration-300`}>
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold tangerine-title text-white">Nadanaloga</h3>
            <p className="mt-2 text-gray-300 max-w-md">
              Nurturing artistic talent through dedicated training in classical and contemporary arts. Join us to embark on your creative journey.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Quick Links</h4>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-300 hover:text-brand-secondary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/admin/login" className="text-gray-300 hover:text-brand-secondary transition-colors">
                  Admin Login / Register
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-white'}`}>Connect</h4>
            <div className={`mt-4 space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-300'}`}>
               <p>Email: contact@nadanaloga.com</p>
               <p>Phone: +91 12345 67890</p>
            </div>
            <div className="mt-6">
              <h5 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-200'} mb-3`}>Follow Us</h5>
              <div className="flex space-x-3">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group"
                    whileHover={{ scale: 1.1, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      y: [0, -2, 0],
                      rotateZ: [0, 1, -1, 0],
                    }}
                    transition={{
                      duration: 4 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.3
                    }}
                  >
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${social.color} ${social.hoverColor} transition-all duration-300 shadow-lg hover:shadow-xl group-hover:shadow-2xl`}>
                      <social.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className={`absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50`}>
                      {social.name}
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={`mt-12 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'} pt-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
          <p>&copy; {new Date().getFullYear()} Nadanaloga.com. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;