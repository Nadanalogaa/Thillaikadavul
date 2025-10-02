import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { GraduationCap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type CourseCategory =
  | 'Founder'
  | 'Bharathanatyam'
  | 'Vocal'
  | 'Instruments'
  | 'Drawing'
  | 'Abacus'
  | 'Admin';

interface CourseMember {
  name: string;
  education?: string;
  experienceYears?: number;
  course: string;
  image: string;
}

interface CourseSection {
  key: CourseCategory;
  title: string;
  emoji: string;
  gradient: string;
  members: CourseMember[];
}

const courseSections: CourseSection[] = [
  {
    key: 'Founder',
    title: 'Founder & Managing Director',
    emoji: '👑',
    gradient: 'from-amber-500 to-orange-500',
    members: [
      {
        name: 'Mrs. B. Tamil Thendral',
        experienceYears: 15,
        course: 'Managing Director',
        image: 'Mrs.B.TamilThendral_Managing Director.jpeg',
      },
    ],
  },
  {
    key: 'Bharathanatyam',
    title: 'Bharathanatyam Faculty',
    emoji: '💃',
    gradient: 'from-orange-500 to-red-500',
    members: [
      {
        name: 'Mrs. Geetha',
        experienceYears: 14,
        course: 'Bharathanatyam Instructor',
        image: 'Mrs.Geetha_Bharatahanatyam.jpeg',
      },
      {
        name: 'Mrs. M. Shri Bhuvaneshwari',
        education: 'B.Sc',
        experienceYears: 11,
        course: 'Bharathanatyam Instructor',
        image: 'Mrs.M.shri bhuvaneshwari_Bharathanatyam,B.sc.jpeg',
      },
      {
        name: 'Mrs. Reshma Balasubramani',
        experienceYears: 9,
        course: 'Bharathanatyam Instructor',
        image: 'Mrs.Reshma Balasubramani_bharathanatyam.jpeg',
      },
      {
        name: 'Ms. Subhashini',
        experienceYears: 8,
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
    members: [
      {
        name: 'Ms. Aishwarya',
        experienceYears: 10,
        course: 'Carnatic Vocal Instructor',
        image: 'Aishwarya_vocal.jpeg',
      },
      {
        name: 'Mrs. Kasthuri',
        experienceYears: 12,
        course: 'Carnatic Vocal Instructor',
        image: 'Mrs.Kasthuri_Vocal.jpeg',
      },
    ],
  },
  {
    key: 'Instruments',
    title: 'Instruments & Western Dance Faculty',
    emoji: '🎹',
    gradient: 'from-blue-500 to-indigo-500',
    members: [
      {
        name: 'Mr. Pravin',
        experienceYears: 15,
        course: 'Keyboard Instructor',
        image: 'Mr.Pravin_Keyboard.jpeg',
      },
      {
        name: 'Mr. Arun',
        education: 'MCA',
        experienceYears: 9,
        course: 'Western Dance Master',
        image: 'Mr.Arun_MCA_Western dance master.jpeg',
      },
    ],
  },
  {
    key: 'Drawing',
    title: 'Drawing Faculty',
    emoji: '🎨',
    gradient: 'from-rose-500 to-fuchsia-500',
    members: [
      {
        name: 'Ms. Yuvasree',
        experienceYears: 7,
        course: 'Drawing Instructor',
        image: 'Yuvasree_drawing.jpeg',
      },
      {
        name: 'Ms. Lavanya',
        experienceYears: 7,
        course: 'Drawing Instructor',
        image: 'Ms.Lavanya_Drawing.jpeg',
      },
    ],
  },
  {
    key: 'Abacus',
    title: 'Abacus & Phonics Faculty',
    emoji: '🧮',
    gradient: 'from-emerald-500 to-teal-500',
    members: [
      {
        name: 'Mrs. Vanitha',
        experienceYears: 10,
        course: 'Abacus & Phonics Trainer',
        image: 'Mrs.Vanitha_Abacus_Phonics.jpeg',
      },
      {
        name: 'Mrs. Suganya',
        experienceYears: 8,
        course: 'Phonics Instructor',
        image: 'Mrs.Suganya_phonics.jpeg',
      },
    ],
  },
  {
    key: 'Admin',
    title: 'Administration Team',
    emoji: '🖥️',
    gradient: 'from-slate-500 to-purple-500',
    members: [
      {
        name: 'Mrs. Amutha S.',
        education: 'MBA',
        experienceYears: 12,
        course: 'Academy Administration',
        image: 'Mrs.Amutha.S_Admin_MBA.jpeg',
      },
      {
        name: 'Mrs. K. Suganya',
        education: 'DCE, BCA',
        experienceYears: 7,
        course: 'Administration & Technical Support',
        image: 'Mrs.K.Suganya_Admin_DCE.,BCA.jpeg',
      },
      {
        name: 'Mrs. Sivagami',
        experienceYears: 9,
        course: 'Administrative Coordinator',
        image: 'Mrs.Suganya_admin.jpeg',
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
    : `/NadanalogaTeachers/${member.image}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className={`relative flex flex-col rounded-xl border ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700/80' : 'bg-white/95 border-purple-100'} px-4 pb-4 pt-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl`}
    >
      <div className={`pointer-events-none absolute -top-6 right-0 h-20 w-20 translate-x-6 rounded-full bg-gradient-to-br ${section.gradient} opacity-10`} />

      <div className="mx-auto flex flex-col items-center">
        <div className="relative w-24 overflow-hidden rounded-xl border-2 border-white bg-white shadow-md sm:w-28">
          <div className="aspect-[3/4] w-full">
            <img
              src={imageSrc}
              alt={member.name}
              loading="lazy"
              className="h-full w-full object-cover object-top"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-center">
        <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {member.name}
        </h3>
          {member.education && (
            <div className="flex items-center justify-center gap-1.5 text-xs">
              <GraduationCap className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`} />
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{member.education}</p>
            </div>
          )}
          {member.experienceYears && (
            <p className={`text-xs font-medium ${theme === 'dark' ? 'text-purple-200' : 'text-purple-600'}`}>
              {member.experienceYears}+ years experience
            </p>
          )}
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{member.course}</p>
        </div>
    </motion.div>
  );
};

const CategorySection: React.FC<CategorySectionProps> = ({ section, theme }) => {
  const [sectionRef, inView] = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section className="py-8 relative overflow-hidden" ref={sectionRef}>
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
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-8"
        >
          <h2 className={`text-2xl md:text-3xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
            {section.title}
          </h2>
          <div className={`w-20 h-0.5 bg-gradient-to-r ${section.gradient} mx-auto rounded-full`} />
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
