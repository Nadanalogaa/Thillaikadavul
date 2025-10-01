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
  experienceYears?: number;
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
        experienceYears: 14,
        course: 'Senior Bharathanatyam Instructor',
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
    accent: 'border-purple-400',
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
    key: 'Western Class',
    title: 'Western Dance Faculty',
    emoji: '🩰',
    gradient: 'from-blue-500 to-indigo-500',
    accent: 'border-indigo-400',
    members: [
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
    key: 'Instruments',
    title: 'Instrumental Faculty',
    emoji: '🎹',
    gradient: 'from-amber-500 to-yellow-500',
    accent: 'border-amber-400',
    members: [
      {
        name: 'Mr. Pravin',
        experienceYears: 15,
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
        experienceYears: 13,
        course: 'Senior Drawing Instructor',
        image: 'Mrs.Yuvasree_drawing.jpeg',
      },
      {
        name: 'Ms. Yuvasree',
        experienceYears: 7,
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
        experienceYears: 10,
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
        experienceYears: 8,
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
        experienceYears: 12,
        course: 'Academy Administration',
        image: 'Mrs.Amutha.S_Admin_MBA.jpeg',
      },
      {
        name: 'Mrs. K. Suganya',
        education: 'DCE, BCA',
        experienceYears: 11,
        course: 'Administration & Technical Support',
        image: 'Mrs.K.Suganya_Admin_DCE.,BCA.jpeg',
      },
      {
        name: 'Mrs. Suganya (Admin)',
        experienceYears: 9,
        course: 'Administrative Coordinator',
        image: 'Mrs.Suganya_admin.jpeg',
      },
      {
        name: 'Mrs. B. Tamil Thendral',
        experienceYears: 15,
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
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className={`relative flex h-full flex-col rounded-3xl border-2 ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-white/90 border-purple-200'} backdrop-blur-sm shadow-lg transition-all duration-300 hover:shadow-2xl`}
    >
      <div className={`absolute top-0 right-0 h-40 w-40 -translate-y-16 translate-x-16 rounded-full bg-gradient-to-br ${section.gradient} opacity-10`} />

      <div className="relative m-6 mb-0 overflow-hidden rounded-2xl shadow-md">
        <div className="relative h-80 w-full overflow-hidden">
          <img
            src={imageSrc}
            alt={member.name}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="space-y-3 text-center">
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {member.name}
          </h3>
          {member.education && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <GraduationCap className={`h-4 w-4 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`} />
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{member.education}</p>
            </div>
          )}
          {member.experienceYears && (
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-200' : 'text-purple-600'}`}>
              {member.experienceYears}+ years experience
            </p>
          )}
        </div>
      </div>
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
          <h2 className={`text-3xl md:text-4xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>
            {section.title}
          </h2>
          <div className={`w-24 h-1 bg-gradient-to-r ${section.gradient} mx-auto rounded-full`} />
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
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
