import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Plus, Minus, HelpCircle, Search, BookOpen, Users, Clock, Award, ChevronDown } from 'lucide-react';
import { FAQ_DATA } from '../constants';
import type { FAQItem } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const FaqAccordionItem: React.FC<{ 
  item: FAQItem; 
  isOpen: boolean; 
  onClick: () => void;
  index: number;
  theme: string;
}> = ({ item, isOpen, onClick, index, theme }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative rounded-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-purple-200'} border-2 backdrop-blur-sm mb-4 hover:shadow-lg transition-all duration-300`}
        >
            <motion.button
                type="button"
                className="flex justify-between items-center w-full p-6 text-left font-medium transition-all duration-300"
                onClick={onClick}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <span className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {item.question}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${isOpen 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                        : theme === 'dark' 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-600'
                    } transition-all duration-300`}
                >
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </motion.div>
            </motion.button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="overflow-hidden"
                    >
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="px-6 pb-6"
                        >
                            <div className={`w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4`}></div>
                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                                {item.answer}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-purple-500/10"></div>
        </motion.div>
    );
};

const FAQPage: React.FC = () => {
    const { theme } = useTheme();
    const [openIndex, setOpenIndex] = useState<number | null>(0); // First FAQ open by default
    const [searchTerm, setSearchTerm] = useState('');

    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [faqRef, faqInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [statsRef, statsInView] = useInView({ threshold: 0.1, triggerOnce: true });

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const filteredFAQs = FAQ_DATA.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = [
        { icon: BookOpen, title: 'Courses', count: '12+' },
        { icon: Users, title: 'Community', count: '500+' },
        { icon: Clock, title: 'Flexibility', count: '24/7' },
        { icon: Award, title: 'Excellence', count: '5★' }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
            <ThemeToggle />
            
            {/* Hero Section with Parallax */}
            <section className="relative min-h-[85vh] overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-purple-50 to-green-100 dark:from-gray-800 dark:via-blue-900 dark:to-purple-900"></div>
                    
                    {/* Floating Elements */}
                    <motion.div
                        className="absolute top-20 left-10 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20"
                        animate={{
                            y: [0, -30, 0],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                    <motion.div
                        className="absolute top-1/3 right-20 w-20 h-20 bg-gradient-to-br from-green-400 to-teal-400 rounded-lg opacity-20 rotate-45"
                        animate={{
                            y: [0, 20, 0],
                            rotate: [45, 75, 45],
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                    <motion.div
                        className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
                        animate={{
                            y: [0, -20, 0],
                            x: [0, 30, 0],
                        }}
                        transition={{
                            duration: 12,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Question Mark Patterns */}
                    <div className="absolute inset-0">
                        <HelpCircle className="absolute top-1/4 left-1/3 w-6 h-6 text-purple-300 dark:text-purple-600 opacity-30" />
                        <HelpCircle className="absolute top-2/3 right-1/4 w-4 h-4 text-blue-300 dark:text-blue-600 opacity-30" />
                        <HelpCircle className="absolute bottom-1/3 left-1/2 w-5 h-5 text-green-300 dark:text-green-600 opacity-30" />
                    </div>
                </div>

                <div className="relative z-10 flex items-center justify-center min-h-[85vh] px-6">
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
                            <HelpCircle className="w-20 h-20 mx-auto mb-6 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent mb-8">
                                FAQ
                            </h1>
                        </motion.div>
                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={heroInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 1, delay: 0.4 }}
                            className={`text-xl md:text-2xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-12`}
                        >
                            Find answers to your questions about our courses, enrollment, and more
                        </motion.p>

                        {/* Search Bar */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 1, delay: 0.6 }}
                            className="relative max-w-2xl mx-auto"
                        >
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search your question..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-6 py-4 text-lg rounded-2xl border-2 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 ${theme === 'dark' 
                                    ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                                    : 'bg-white/50 border-purple-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                                }`}
                            />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1, delay: 1 }}
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
                >
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="flex flex-col items-center justify-center text-center cursor-pointer"
                        onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
                    >
                        <span className="text-sm text-gray-600 dark:text-gray-300 mb-2 whitespace-nowrap">Scroll to explore</span>
                        <ChevronDown className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto" />
                    </motion.div>
                </motion.div>
            </section>

            {/* Quick Stats */}
            <section className="py-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-50/30 to-transparent dark:via-gray-800/30"></div>
                
                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        ref={statsRef}
                        initial={{ opacity: 0, y: 50 }}
                        animate={statsInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 1 }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-8"
                    >
                        {categories.map((category, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={statsInView ? { opacity: 1, scale: 1 } : {}}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className={`text-center p-8 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-purple-200'} border-2 backdrop-blur-sm relative overflow-hidden group`}
                            >
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.8 }}
                                    className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:shadow-lg transition-shadow duration-300"
                                >
                                    <category.icon className="w-8 h-8 text-white" />
                                </motion.div>
                                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                                    {category.count}
                                </h3>
                                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} font-medium`}>
                                    {category.title}
                                </p>

                                {/* Hover glow effect */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        ref={faqRef}
                        initial={{ opacity: 0, y: 50 }}
                        animate={faqInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 1 }}
                        className="max-w-4xl mx-auto"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={faqInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="text-center mb-16"
                        >
                            <h2 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>
                                Frequently Asked Questions
                            </h2>
                            <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {searchTerm 
                                    ? `Found ${filteredFAQs.length} result${filteredFAQs.length !== 1 ? 's' : ''} for "${searchTerm}"`
                                    : 'Everything you need to know about our programs and services'
                                }
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={faqInView ? { opacity: 1 } : {}}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="space-y-4"
                        >
                            {filteredFAQs.length > 0 ? (
                                filteredFAQs.map((item, index) => (
                                    <FaqAccordionItem
                                        key={index}
                                        item={item}
                                        isOpen={openIndex === index}
                                        onClick={() => handleToggle(index)}
                                        index={index}
                                        theme={theme}
                                    />
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`text-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}
                                >
                                    <HelpCircle className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                                    <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                                        No results found
                                    </h3>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Try searching with different keywords or browse all FAQs
                                    </p>
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full hover:shadow-lg transition-shadow duration-300"
                                    >
                                        Clear Search
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>

                        {/* Still have questions? */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={faqInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 1, delay: 0.8 }}
                            className={`mt-20 text-center p-12 rounded-3xl ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border-2 relative overflow-hidden`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="relative z-10">
                                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                                    Still have questions?
                                </h3>
                                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-8 text-lg`}>
                                    Our team is here to help! Reach out to us for personalized assistance.
                                </p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                                >
                                    Contact Us
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Floating decorative elements */}
                <motion.div
                    animate={{
                        y: [0, -20, 0],
                        rotate: [0, 5, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-20 right-20 w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20"
                />
                <motion.div
                    animate={{
                        y: [0, 25, 0],
                        rotate: [0, -5, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute bottom-20 left-20 w-16 h-16 bg-gradient-to-br from-green-400 to-teal-400 rounded-lg opacity-20"
                />
            </section>
        </div>
    );
};

export default FAQPage;