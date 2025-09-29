import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Music,
  Clock,
  Users,
  Award,
  Star,
  Heart,
  Target,
  BookOpen,
  Calendar,
  IndianRupee,
  Check,
  ArrowRight,
  Guitar,
  Piano,
  Mic,
  Volume2,
  Zap,
  Headphones
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const WesternPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true, initialInView: true });
  const { theme } = useTheme();

  const westernPrograms = [
    {
      name: 'Piano Lessons',
      icon: Piano,
      description: 'Master classical and contemporary piano with proper technique and musical theory',
      ageGroup: '6+ years',
      duration: '1 hour per session',
      focus: 'Technique, sight-reading, and performance'
    },
    {
      name: 'Guitar Classes',
      icon: Guitar,
      description: 'Learn acoustic and electric guitar with various genres from classical to rock',
      ageGroup: '8+ years',
      duration: '45 minutes per session',
      focus: 'Chords, strumming, and song playing'
    },
    {
      name: 'Western Vocal',
      icon: Mic,
      description: 'Develop vocal techniques for pop, rock, jazz, and classical Western music styles',
      ageGroup: '10+ years',
      duration: '45 minutes per session',
      focus: 'Voice training and performance skills'
    },
    {
      name: 'Keyboard & Synthesizer',
      icon: Headphones,
      description: 'Electronic music production and keyboard skills for modern music creation',
      ageGroup: '12+ years',
      duration: '1 hour per session',
      focus: 'Digital music and sound design'
    },
    {
      name: 'Drums & Percussion',
      icon: Zap,
      description: 'Rock, jazz, and contemporary drumming with rhythm and coordination training',
      ageGroup: '8+ years',
      duration: '45 minutes per session',
      focus: 'Rhythm patterns and coordination'
    },
    {
      name: 'Music Production',
      icon: Volume2,
      description: 'Learn recording, mixing, and digital audio production using modern software',
      ageGroup: '14+ years',
      duration: '1.5 hours per session',
      focus: 'Recording and production techniques'
    }
  ];

  const courseFeatures = [
    {
      icon: Music,
      title: 'Contemporary Approach',
      description: 'Modern teaching methods combining traditional techniques with current music trends'
    },
    {
      icon: Users,
      title: 'Professional Instructors',
      description: 'Certified Western music teachers with performance and recording experience'
    },
    {
      icon: BookOpen,
      title: 'Comprehensive Curriculum',
      description: 'Structured learning from basics to advanced performance and composition skills'
    },
    {
      icon: Target,
      title: 'Genre Diversity',
      description: 'Explore various musical styles including pop, rock, jazz, blues, and classical'
    },
    {
      icon: Heart,
      title: 'Performance Focus',
      description: 'Regular band sessions, recitals, and opportunities to perform with other musicians'
    },
    {
      icon: Award,
      title: 'Modern Equipment',
      description: 'State-of-the-art instruments, amplifiers, and recording equipment for hands-on learning'
    }
  ];

  const curriculumLevels = [
    {
      level: 'Beginner Level (0-6 months)',
      skills: [
        'Basic instrument familiarization and proper posture',
        'Fundamental music theory and note reading',
        'Simple songs and chord progressions',
        'Basic rhythm patterns and timing',
        'Introduction to different musical styles'
      ],
      outcomes: 'Students can play simple songs and understand basic music theory concepts'
    },
    {
      level: 'Intermediate Level (6-18 months)',
      skills: [
        'Advanced techniques and complex chord progressions',
        'Improvisation and creative expression',
        'Ensemble playing and band skills',
        'Music composition and songwriting basics',
        'Performance techniques and stage presence'
      ],
      outcomes: 'Students can perform with confidence and create their own musical arrangements'
    },
    {
      level: 'Advanced Level (18+ months)',
      skills: [
        'Professional performance techniques',
        'Advanced music theory and composition',
        'Recording and production skills',
        'Teaching methodology and music direction',
        'Professional music industry knowledge'
      ],
      outcomes: 'Students can pursue music professionally or teach others independently'
    }
  ];

  const classSchedules = [
    {
      program: 'Piano & Keyboard',
      beginner: 'Mon, Wed, Fri - 3:00 PM to 4:00 PM',
      intermediate: 'Tue, Thu, Sat - 4:00 PM to 5:00 PM',
      advanced: 'Mon, Wed, Fri - 5:00 PM to 6:00 PM'
    },
    {
      program: 'Guitar Classes',
      beginner: 'Tue, Thu, Sat - 3:00 PM to 3:45 PM',
      intermediate: 'Mon, Wed, Fri - 4:00 PM to 4:45 PM',
      advanced: 'Tue, Thu, Sat - 5:00 PM to 5:45 PM'
    },
    {
      program: 'Vocal & Drums',
      beginner: 'Mon, Wed, Fri - 4:45 PM to 5:30 PM',
      intermediate: 'Tue, Thu, Sat - 5:45 PM to 6:30 PM',
      advanced: 'Weekend band sessions available'
    },
    {
      program: 'Music Production',
      beginner: 'Saturday - 10:00 AM to 11:30 AM',
      intermediate: 'Saturday - 2:00 PM to 3:30 PM',
      advanced: 'Sunday - 10:00 AM to 11:30 AM'
    }
  ];

  const benefits = [
    'Enhanced creativity and self-expression through contemporary music',
    'Improved cognitive abilities and mathematical thinking',
    'Development of fine motor skills and hand-eye coordination',
    'Stress relief and emotional outlet through musical performance',
    'Social skills through band playing and ensemble work',
    'Confidence building through regular performances and recitals',
    'Exposure to global music cultures and contemporary trends',
    'Preparation for music careers and professional opportunities',
    'Technical skills in modern music production and recording',
    'Foundation for music therapy and entertainment industry'
  ];

  const musicGenres = [
    { name: 'Pop Music', description: 'Contemporary hits and chart-toppers' },
    { name: 'Rock & Metal', description: 'Classic rock to modern metal styles' },
    { name: 'Jazz & Blues', description: 'Improvisation and soulful expressions' },
    { name: 'Classical Western', description: 'Traditional European compositions' },
    { name: 'Country & Folk', description: 'Storytelling through simple melodies' },
    { name: 'Electronic Music', description: 'Digital production and synthesized sounds' }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 bg-[url('/danceImages/western-music-bg.jpg')] bg-cover bg-center opacity-30"></div>

        <div className="relative container mx-auto px-6 text-center" ref={ref}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Western Music Classes
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
              Explore the world of contemporary music with professional training in Western instruments and techniques
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-3 rounded-full font-semibold hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105"
              >
                Start Rocking
              </Link>
              <Link
                to="/courses"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-900 transition-all duration-300"
              >
                View All Courses
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Course Overview */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Master Contemporary Music
            </h2>
            <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Our Western music program offers comprehensive training in contemporary musical styles and instruments.
              From rock guitars to electronic production, we provide modern musical education that prepares students
              for today's diverse music landscape.
            </p>
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {westernPrograms.map((program, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-50 hover:bg-white shadow-lg hover:shadow-xl'
                } transition-all duration-300 transform hover:scale-105`}
              >
                <program.icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {program.name}
                </h3>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {program.description}
                </p>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Users className="w-4 h-4" />
                    <span>{program.ageGroup}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-4 h-4" />
                    <span>{program.duration}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Target className="w-4 h-4" />
                    <span>{program.focus}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Musical Genres */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Explore Musical Genres
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {musicGenres.map((genre, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`p-6 rounded-xl text-center ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-white hover:bg-blue-50 shadow-lg hover:shadow-xl'
                } transition-all duration-300 transform hover:scale-105`}
              >
                <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {genre.name}
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {genre.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Features */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Why Choose Our Western Music Program?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courseFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-50 hover:bg-white shadow-lg hover:shadow-xl'
                } transition-all duration-300`}
              >
                <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {feature.title}
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Progressive Learning Path
          </h2>

          <div className="space-y-8 max-w-5xl mx-auto">
            {curriculumLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className={`p-8 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-800'
                    : 'bg-white shadow-lg'
                }`}
              >
                <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {level.level}
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 text-blue-600`}>Skills Developed</h4>
                    <ul className="space-y-2">
                      {level.skills.map((skill, skillIndex) => (
                        <li key={skillIndex} className={`flex items-start gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 text-blue-600`}>Learning Outcomes</h4>
                    <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {level.outcomes}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Class Schedules */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Class Schedules
          </h2>

          <div className="max-w-4xl mx-auto space-y-6">
            {classSchedules.map((schedule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-700 border border-gray-600'
                    : 'bg-gray-50 shadow-lg border border-gray-200'
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {schedule.program}
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">Beginner Level</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {schedule.beginner}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">Intermediate Level</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {schedule.intermediate}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-600 mb-2">Advanced Level</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {schedule.advanced}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Fee Structure
          </h2>

          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className={`p-8 rounded-xl ${
                theme === 'dark'
                  ? 'bg-gray-800 border border-gray-700'
                  : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200'
              }`}
            >
              <div className="text-center mb-8">
                <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Western Music Classes
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Contemporary music education for all ages
                </p>
              </div>

              <div className="space-y-6">
                <div className={`flex justify-between items-center p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                }`}>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Registration Fee
                  </span>
                  <span className="flex items-center text-2xl font-bold text-blue-600">
                    <IndianRupee className="w-6 h-6" />
                    800
                  </span>
                </div>

                <div className={`flex justify-between items-center p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                }`}>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Monthly Fee
                  </span>
                  <span className="flex items-center text-2xl font-bold text-blue-600">
                    <IndianRupee className="w-6 h-6" />
                    1,800
                  </span>
                </div>

                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'
                } border-l-4 border-blue-600`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    What's Included:
                  </h4>
                  <ul className={`space-y-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    <li>• 3 classes per week (45-60 minutes each)</li>
                    <li>• Access to professional instruments and equipment</li>
                    <li>• Band sessions and ensemble opportunities</li>
                    <li>• Recording studio access for advanced students</li>
                    <li>• Performance opportunities and recitals</li>
                    <li>• Music theory and composition guidance</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Benefits of Western Music Education
          </h2>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50 shadow-md'
                }`}
              >
                <Star className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" />
                <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {benefit}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Rock Your Way to Musical Success
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our dynamic Western music program and discover your potential as a contemporary musician. From first chords to professional performance!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Your Musical Journey
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/courses"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                Explore All Courses
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default WesternPage;