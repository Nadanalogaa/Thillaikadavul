import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { GraduationCap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type CourseCategory =
  | 'Bharathanatyam'
  | 'Vocal'
  | 'Drawing'
  | 'Abacus'
  | 'Phonics'
  | 'Instruments'
  | 'Western Class'
  | 'Admin';

interface CourseMember {
  name: string;
  education?: string;
  course: string;
  image: string;
}

interface CourseSection {
  key: CourseCategory;
  title: string;
  emoji: string;
  gradient: string;
  accent: string;
  members: CourseMember[];
}

const courseSections: CourseSection[] = [
  {
    key: 'Bharathanatyam',
    title: 'Bharathanatyam Faculty',
    emoji: '💃',
    gradient: 'from-orange-500 to-red-500',
    accent: 'border-orange-400',
    members: [
      {
        name: 'Mrs. Geetha',
        course: 'Senior Bharathanatyam Instructor',
        image: 'Mrs.Geetha_Bharatahanatyam.jpeg',
      },
      {
        name: 'Mrs. M. Shri Bhuvaneshwari',
        education: 'B.Sc',
        course: 'Bharathanatyam Instructor',
        image: 'Mrs.M.shri bhuvaneshwari_Bharathanatyam,B.sc.jpeg',
      },
      {
        name: 'Mrs. Reshma Balasubramani',
        course: 'Bharathanatyam Instructor',
        image: 'Mrs.Reshma Balasubramani_bharathanatyam.jpeg',
      },
      {
        name: 'Ms. Subhashini',
        course: 'Bharathanatyam Instructor',
        image: 'Subhashini_bharathanatyam.jpeg',
      },
    ],
  },
  {
    key: 'Vocal',
    title: 'Vocal Faculty',
    emoji: '🎵',
    gradient: 'from-purple-500 to-pink-500',
    accent: 'border-purple-400',
    members: [
      {
        name: 'Ms. Aishwarya',
        course: 'Carnatic Vocal Instructor',
        image: 'Aishwarya_vocal.jpeg',
      },
      {
        name: 'Mrs. Kasthuri',
        course: 'Carnatic Vocal Instructor',
        image: 'Mrs.Kasthuri_Vocal.jpeg',
      },
    ],
  },
  {
    key: 'Western Class',
    title: 'Western Dance Faculty',
    emoji: '🩰',
    gradient: 'from-blue-500 to-indigo-500',
    accent: 'border-indigo-400',
    members: [
      {
        name: 'Mr. Arun',
        education: 'MCA',
        course: 'Western Dance Master',
        image: 'Mr.Arun_MCA_Western dance master.jpeg',
      },
    ],
  },
  {
    key: 'Instruments',
    title: 'Instrumental Faculty',
    emoji: '🎹',
    gradient: 'from-amber-500 to-yellow-500',
    accent: 'border-amber-400',
    members: [
      {
        name: 'Mr. Pravin',
        course: 'Keyboard Instructor',
        image: 'Mr.Pravin_Keyboard.jpeg',
      },
    ],
  },
  {
    key: 'Drawing',
    title: 'Drawing Faculty',
    emoji: '🎨',
    gradient: 'from-rose-500 to-fuchsia-500',
    accent: 'border-rose-400',
    members: [
      {
        name: 'Mrs. Yuvasree',
        course: 'Senior Drawing Instructor',
        image: 'Mrs.Yuvasree_drawing.jpeg',
      },
      {
        name: 'Ms. Yuvasree',
        course: 'Drawing Instructor',
        image: 'Yuvasree_drawing.jpeg',
      },
    ],
  },
  {
    key: 'Abacus',
    title: 'Abacus Faculty',
    emoji: '🧮',
    gradient: 'from-emerald-500 to-teal-500',
    accent: 'border-emerald-400',
    members: [
      {
        name: 'Mrs. Vanitha',
        course: 'Abacus & Phonics Trainer',
        image: 'Mrs.Vanitha_Abacus_Phonics.jpeg',
      },
    ],
  },
  {
    key: 'Phonics',
    title: 'Phonics Faculty',
    emoji: '🔤',
    gradient: 'from-teal-500 to-cyan-500',
    accent: 'border-teal-400',
    members: [
      {
        name: 'Mrs. Suganya',
        course: 'Phonics Instructor',
        image: 'Mrs.Suganya_phonics.jpeg',
      },
    ],
  },
  {
    key: 'Admin',
    title: 'Leadership & Administration',
    emoji: '🖥️',
    gradient: 'from-slate-500 to-purple-500',
    accent: 'border-slate-400',
    members: [
      {
        name: 'Mrs. Amutha S.',
        education: 'MBA',
        course: 'Academy Administration',
        image: 'Mrs.Amutha.S_Admin_MBA.jpeg',
      },
      {
        name: 'Mrs. K. Suganya',
        education: 'DCE, BCA',
        course: 'Administration & Technical Support',
        image: 'Mrs.K.Suganya_Admin_DCE.,BCA.jpeg',
      },
      {
        name: 'Mrs. Suganya (Admin)',
        course: 'Administrative Coordinator',
        image: 'Mrs.Suganya_admin.jpeg',
      },
      {
        name: 'Mrs. B. Tamil Thendral',
        course: 'Managing Director',
        image: 'Mrs.B.TamilThendral_Managing Director.jpeg',
      },
    ],
  },
];

interface TeacherCardProps {
  member: CourseMember;
  index: number;
  inView: boolean;
  theme: string;
  section: CourseSection;
}

interface CategorySectionProps {
  section: CourseSection;
  theme: string;
}

const TeacherCard: React.FC<TeacherCardProps> = ({ member, index, inView, theme, section }) => {
  const imageSrc = member.image.startsWith('/')
    ? member.image
    : `/NadanalogaTeachers/${encodeURIComponent(member.image)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className={`relative p-8 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-purple-200'} border-2 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${section.gradient} opacity-10 rounded-full -translate-y-8 translate-x-8`}></div>

      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.3 }}
        className="relative w-32 h-32 mx-auto mb-6"
      >
        <img
          src={imageSrc}
          alt={member.name}
          loading="lazy"
          className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
        />
        <div className={`absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br ${section.gradient} rounded-full flex items-center justify-center shadow-lg`}>
          <span className="text-white text-lg">{section.emoji}</span>
        </div>
      </motion.div>

      <div className="text-center space-y-4">
        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {member.name}
        </h3>
        {member.education && (
          <div className="flex items-center justify-center space-x-2">
            <GraduationCap className={`w-4 h-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} leading-relaxed text-center`}>
              {member.education}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center space-x-2">
          <span className="text-lg">{section.emoji}</span>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} font-medium`}>
            {member.course}
          </p>
        </div>
      </div>

      <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-opacity-30 ${section.accent} dark:border-opacity-60`}></div>
      <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-opacity-30 ${section.accent} dark:border-opacity-60`}></div>
    </motion.div>
  );
};

const CategorySection: React.FC<CategorySectionProps> = ({ section, theme }) => {
  const [sectionRef, inView] = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section className="py-12 relative overflow-hidden" ref={sectionRef}>
      <div className="absolute inset-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-5`}></div>

        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`absolute top-20 right-20 w-16 h-16 bg-gradient-to-br ${section.gradient} rounded-full opacity-20`}
        />
        <motion.div
          animate={{
            y: [0, 15, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`absolute bottom-20 left-20 w-12 h-12 bg-gradient-to-br ${section.gradient} rounded-full opacity-20`}
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
            <span className="text-5xl">{section.emoji}</span>
            {section.title}
          </h2>
          <div className={`w-24 h-1 bg-gradient-to-r ${section.gradient} mx-auto rounded-full`} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {section.members.map((member, index) => (
            <TeacherCard
              key={`${section.key}-${member.name}-${index}`}
              member={member}
              index={index}
              inView={inView}
              theme={theme}
              section={section}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const TeamPage: React.FC = () => {
  const { theme } = useTheme();
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <section className="relative min-h-[50vh] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900"></div>

          <motion.div
            className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
            animate={{
              y: [0, -20, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
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
              ease: 'easeInOut',
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
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-[50vh] px-6">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: 'easeOut' }}
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
      </section>

      {courseSections
        .filter((section) => section.members.length > 0)
        .map((section) => (
          <CategorySection key={section.key} section={section} theme={theme} />
        ))}
    </div>
  );
};

export default TeamPage;
