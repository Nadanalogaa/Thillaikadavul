import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ChevronDown, GraduationCap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Teacher {
  name: string;
  qualification: string;
  course: string;
  image: string;
  category: string;
}

interface TeacherCardProps {
  teacher: Teacher;
  index: number;
  inView: boolean;
  theme: string;
}

interface CategorySectionProps {
  title: string;
  emoji: string;
  teachers: Teacher[];
  sectionRef: (node?: Element | null) => void;
  inView: boolean;
  gradientColor: string;
  theme: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Vocal':
      return '🎵';
    case 'Bharathanatyam':
      return '💃';
    case 'Admin':
      return '🖥️';
    case 'Abacus':
      return '🧮';
    default:
      return '👥';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Vocal':
      return 'from-purple-500 to-pink-500';
    case 'Bharathanatyam':
      return 'from-orange-500 to-red-500';
    case 'Admin':
      return 'from-blue-500 to-indigo-500';
    case 'Abacus':
      return 'from-green-500 to-teal-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

const TeacherCard: React.FC<TeacherCardProps> = ({ teacher, index, inView, theme }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
    transition={{ duration: 0.8, delay: index * 0.1 }}
    whileHover={{ scale: 1.02, y: -5 }}
    className={`relative p-8 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-purple-200'} border-2 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden`}
  >
    {/* Background gradient */}
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${getCategoryColor(teacher.category)} opacity-10 rounded-full -translate-y-8 translate-x-8`}></div>
    
    {/* Profile Image */}
    <motion.div
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.3 }}
      className="relative w-32 h-32 mx-auto mb-6"
    >
      <img
        src={teacher.image}
        alt={teacher.name}
        className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
      />
      <div className={`absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br ${getCategoryColor(teacher.category)} rounded-full flex items-center justify-center shadow-lg`}>
        <span className="text-white text-lg">{getCategoryIcon(teacher.category)}</span>
      </div>
    </motion.div>

    {/* Teacher Info */}
    <div className="text-center space-y-4">
      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {teacher.name}
      </h3>
      
      <div className="flex items-center justify-center space-x-2">
        <GraduationCap className={`w-4 h-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} leading-relaxed text-center`}>
          {teacher.qualification}
        </p>
      </div>

      <div className="flex items-center justify-center space-x-2">
        <span className="text-lg">{getCategoryIcon(teacher.category)}</span>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} font-medium`}>
          {teacher.course}
        </p>
      </div>
    </div>

    {/* Decorative corner elements */}
    <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-opacity-30 ${getCategoryColor(teacher.category).includes('purple') ? 'border-purple-300' : getCategoryColor(teacher.category).includes('orange') ? 'border-orange-300' : getCategoryColor(teacher.category).includes('blue') ? 'border-blue-300' : 'border-green-300'} dark:border-opacity-60`}></div>
    <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-opacity-30 ${getCategoryColor(teacher.category).includes('purple') ? 'border-purple-300' : getCategoryColor(teacher.category).includes('orange') ? 'border-orange-300' : getCategoryColor(teacher.category).includes('blue') ? 'border-blue-300' : 'border-green-300'} dark:border-opacity-60`}></div>
  </motion.div>
);

const CategorySection: React.FC<CategorySectionProps> = ({ title, emoji, teachers, sectionRef, inView, gradientColor, theme }) => (
  <section className="py-20 relative overflow-hidden" ref={sectionRef}>
    <div className="absolute inset-0">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-5`}></div>
      
      {/* Floating decorative elements */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`absolute top-20 right-20 w-16 h-16 bg-gradient-to-br ${gradientColor} rounded-full opacity-20`}
      />
      <motion.div
        animate={{
          y: [0, 15, 0],
          rotate: [0, -5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`absolute bottom-20 left-20 w-12 h-12 bg-gradient-to-br ${gradientColor} rounded-full opacity-20`}
      />
    </div>

    <div className="container mx-auto px-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <h2 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6 flex items-center justify-center gap-4`}>
          <span className="text-5xl">{emoji}</span>
          {title}
        </h2>
        <div className={`w-24 h-1 bg-gradient-to-r ${gradientColor} mx-auto rounded-full`} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {teachers.map((teacher, index) => (
          <TeacherCard
            key={teacher.name}
            teacher={teacher}
            index={index}
            inView={inView}
            theme={theme}
          />
        ))}
      </div>
    </div>
  </section>
);

const TeamPage: React.FC = () => {
  const { theme } = useTheme();
  
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [vocalRef, vocalInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [bharatanatyamRef, bharatanatyamInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [adminRef, adminInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [abacusRef, abacusInView] = useInView({ threshold: 0.1, triggerOnce: true });

  const teachers: Teacher[] = [
    // Vocal Teachers
    {
      name: "R. Aiswarya",
      qualification: "BA (Vocal), DMT (Diploma in Music Teaching)",
      course: "Carnatic Vocal Music",
      image: "https://images.unsplash.com/photo-1494790108755-2616b332c2cd?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
      category: "Vocal"
    },
    {
      name: "S. Revathi",
      qualification: "B.Com, MSc (Yoga), Abacus, Phonics, Vedic Maths, Mid Brain Activation",
      course: "Vocal Music & Comprehensive Skills",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
      category: "Vocal"
    },
    // Bharathanatyam Teachers
    {
      name: "B. Geetha",
      qualification: "BFA, MA Bharathanatyam",
      course: "Classical Bharathanatyam",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
      category: "Bharathanatyam"
    },
    {
      name: "Reshma A.V",
      qualification: "M.Com",
      course: "Bharathanatyam Dance",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
      category: "Bharathanatyam"
    },
    {
      name: "M. Subashini",
      qualification: "M.Com",
      course: "Bharathanatyam Dance",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
      category: "Bharathanatyam"
    },
    // Admin Staff
    {
      name: "K. Suganya",
      qualification: "Diploma in Computer Engineering, BCA",
      course: "Administration & Technical Support",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
      category: "Admin"
    },
    {
      name: "Sivakami Kailasam",
      qualification: "M.Com",
      course: "Administrative Operations",
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
      category: "Admin"
    },
    // Abacus Teacher
    {
      name: "R. Vanitha",
      qualification: "B.Com, DAMT",
      course: "Mental Arithmetic & Abacus",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
      category: "Abacus"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      
      {/* Hero Section with Parallax */}
      <section className="relative min-h-[85vh] overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900"></div>
          
          {/* Floating Elements */}
          <motion.div
            className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
            animate={{
              y: [0, -20, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-20"
            animate={{
              y: [0, 20, 0],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-20"
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-[85vh] px-6">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center max-w-4xl"
          >
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-8"
            >
              Meet Our Team
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className={`text-xl md:text-2xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-8`}
            >
              Dedicated educators passionate about nurturing artistic excellence and creativity
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className="w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-600 mx-auto rounded-full"
            />
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
            <span className="text-sm text-gray-600 dark:text-gray-300 mb-2 whitespace-nowrap">Meet our educators</span>
            <ChevronDown className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* Bharathanatyam Teachers Section */}
      <CategorySection
        title="Bharathanatyam Teachers"
        emoji="💃"
        teachers={teachers.filter(t => t.category === 'Bharathanatyam')}
        sectionRef={bharatanatyamRef}
        inView={bharatanatyamInView}
        gradientColor="from-orange-500 to-red-500"
        theme={theme}
      />

      {/* Vocal Teachers Section */}
      <CategorySection
        title="Vocal Teachers"
        emoji="🎵"
        teachers={teachers.filter(t => t.category === 'Vocal')}
        sectionRef={vocalRef}
        inView={vocalInView}
        gradientColor="from-purple-500 to-pink-500"
        theme={theme}
      />

      {/* Admin Staff Section */}
      <CategorySection
        title="Administrative Staff"
        emoji="🖥️"
        teachers={teachers.filter(t => t.category === 'Admin')}
        sectionRef={adminRef}
        inView={adminInView}
        gradientColor="from-blue-500 to-indigo-500"
        theme={theme}
      />

      {/* Abacus Teachers Section */}
      <CategorySection
        title="Abacus Teacher"
        emoji="🧮"
        teachers={teachers.filter(t => t.category === 'Abacus')}
        sectionRef={abacusRef}
        inView={abacusInView}
        gradientColor="from-green-500 to-teal-500"
        theme={theme}
      />
    </div>
  );
};

export default TeamPage;