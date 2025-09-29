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
  Music2,
  Guitar,
  Piano,
  Mic,
  Volume2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const InstrumentPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true, initialInView: true });

  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isContentVisible = hasMounted || inView;
  const { theme } = useTheme();

  const instruments = [
    {
      name: 'Violin',
      icon: Music2,
      description: 'Master the art of classical Indian violin with traditional techniques and contemporary styles',
      difficulty: 'Beginner to Advanced',
      duration: '1-2 years for proficiency'
    },
    {
      name: 'Flute (Bansuri)',
      icon: Volume2,
      description: 'Learn the soulful melodies of classical Indian bamboo flute with breath control and finger techniques',
      difficulty: 'Beginner to Advanced',
      duration: '1-2 years for proficiency'
    },
    {
      name: 'Harmonium',
      icon: Piano,
      description: 'Explore the versatile harmonium for accompanying vocals and creating melodic arrangements',
      difficulty: 'Beginner to Intermediate',
      duration: '6 months to 1 year'
    },
    {
      name: 'Tabla',
      icon: Music,
      description: 'Master the rhythmic complexities of tabla with traditional compositions and modern fusion',
      difficulty: 'Beginner to Advanced',
      duration: '2-3 years for proficiency'
    },
    {
      name: 'Veena',
      icon: Guitar,
      description: 'Learn the ancient art of Veena playing with classical ragas and traditional compositions',
      difficulty: 'Intermediate to Advanced',
      duration: '2-4 years for proficiency'
    },
    {
      name: 'Mridangam',
      icon: Mic,
      description: 'Develop expertise in this primary percussion instrument of Carnatic music',
      difficulty: 'Beginner to Advanced',
      duration: '2-3 years for proficiency'
    }
  ];

  const courseFeatures = [
    {
      icon: Music,
      title: 'Multiple Instruments',
      description: 'Choose from violin, flute, harmonium, tabla, veena, and mridangam based on your interest'
    },
    {
      icon: Users,
      title: 'Expert Instructors',
      description: 'Learn from accomplished musicians with years of performance and teaching experience'
    },
    {
      icon: BookOpen,
      title: 'Progressive Learning',
      description: 'Structured curriculum from basic techniques to advanced compositions and improvisations'
    },
    {
      icon: Target,
      title: 'Performance Opportunities',
      description: 'Regular recitals, competitions, and cultural events to showcase your musical journey'
    },
    {
      icon: Heart,
      title: 'Individual Attention',
      description: 'Small batch sizes ensuring personalized guidance and technique correction'
    },
    {
      icon: Award,
      title: 'Certification Programs',
      description: 'Structured levels with certificates and preparation for music examinations'
    }
  ];

  const curriculumLevels = [
    {
      level: 'Foundation Level (3-6 months)',
      skills: [
        'Instrument familiarization and proper posture',
        'Basic finger techniques and breath control',
        'Elementary scales (Sa Re Ga Ma)',
        'Simple folk songs and devotional pieces',
        'Music theory fundamentals'
      ],
      outcomes: 'Students can play basic melodies and understand fundamental music concepts'
    },
    {
      level: 'Intermediate Level (6 months - 1 year)',
      skills: [
        'Advanced finger techniques and ornamentation',
        'Introduction to ragas and classical compositions',
        'Rhythmic patterns and tempo variations',
        'Ensemble playing with other instruments',
        'Basic improvisation techniques'
      ],
      outcomes: 'Students can perform classical pieces and understand raga structures'
    },
    {
      level: 'Advanced Level (1-2 years)',
      skills: [
        'Complex raga exploration and advanced compositions',
        'Advanced improvisation and creative expression',
        'Performance techniques and stage presence',
        'Teaching methodology and music arrangement',
        'Competition preparation and examination readiness'
      ],
      outcomes: 'Students can perform professionally and teach beginners independently'
    }
  ];

  const classSchedules = [
    {
      instrument: 'Violin & Flute',
      beginner: 'Mon, Wed, Fri - 4:00 PM to 5:00 PM',
      intermediate: 'Tue, Thu, Sat - 5:00 PM to 6:00 PM',
      advanced: 'Mon, Wed, Fri - 6:00 PM to 7:00 PM'
    },
    {
      instrument: 'Tabla & Mridangam',
      beginner: 'Tue, Thu, Sat - 4:00 PM to 5:00 PM',
      intermediate: 'Mon, Wed, Fri - 5:00 PM to 6:00 PM',
      advanced: 'Tue, Thu, Sat - 6:00 PM to 7:00 PM'
    },
    {
      instrument: 'Harmonium & Veena',
      beginner: 'Mon, Wed, Fri - 3:00 PM to 4:00 PM',
      intermediate: 'Tue, Thu, Sat - 3:00 PM to 4:00 PM',
      advanced: 'Weekend intensive sessions available'
    }
  ];

  const benefits = [
    'Enhanced cognitive abilities and memory improvement',
    'Improved concentration and discipline through regular practice',
    'Cultural appreciation and connection to Indian classical traditions',
    'Stress relief and emotional expression through music',
    'Development of fine motor skills and hand-eye coordination',
    'Performance confidence and stage presence skills',
    'Opportunities for cultural events and music competitions',
    'Foundation for music therapy and healing practices'
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 bg-[url('/danceImages/instruments-bg.jpg')] bg-cover bg-center opacity-30"></div>

        <div className="relative container mx-auto px-6 text-center" ref={ref}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Instrument Classes
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
              Master the art of Indian classical instruments with expert guidance and traditional teaching methods
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-3 rounded-full font-semibold hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105"
              >
                Enroll Now
              </Link>
              <Link
                to="/courses"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-purple-900 transition-all duration-300"
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
              Explore Musical Excellence
            </h2>
            <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Our instrument classes offer comprehensive training in traditional Indian classical instruments.
              Whether you're a complete beginner or looking to refine your skills, our experienced instructors
              will guide you through the beautiful journey of musical mastery.
            </p>
          </div>

          {/* Instruments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {instruments.map((instrument, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-50 hover:bg-white shadow-lg hover:shadow-xl'
                } transition-all duration-300 transform hover:scale-105`}
              >
                <instrument.icon className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {instrument.name}
                </h3>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {instrument.description}
                </p>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Target className="w-4 h-4" />
                    <span>{instrument.difficulty}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-4 h-4" />
                    <span>{instrument.duration}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Features */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Why Choose Our Instrument Classes?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courseFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-white hover:bg-gray-50 shadow-lg hover:shadow-xl'
                } transition-all duration-300`}
              >
                <feature.icon className="w-12 h-12 text-purple-600 mb-4" />
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
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Progressive Learning Curriculum
          </h2>

          <div className="space-y-8 max-w-5xl mx-auto">
            {curriculumLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={isContentVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className={`p-8 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-700'
                    : 'bg-gray-50 shadow-lg'
                }`}
              >
                <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {level.level}
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 text-purple-600`}>Skills Developed</h4>
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
                    <h4 className={`text-lg font-semibold mb-3 text-purple-600`}>Learning Outcomes</h4>
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
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Class Schedules
          </h2>

          <div className="max-w-4xl mx-auto space-y-6">
            {classSchedules.map((schedule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white shadow-lg border border-gray-200'
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {schedule.instrument}
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
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Fee Structure
          </h2>

          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className={`p-8 rounded-xl ${
                theme === 'dark'
                  ? 'bg-gray-700 border border-gray-600'
                  : 'bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200'
              }`}
            >
              <div className="text-center mb-8">
                <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Instrument Classes
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Professional training for all instruments
                </p>
              </div>

              <div className="space-y-6">
                <div className={`flex justify-between items-center p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-white'
                }`}>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Registration Fee
                  </span>
                  <span className="flex items-center text-2xl font-bold text-purple-600">
                    <IndianRupee className="w-6 h-6" />
                    600
                  </span>
                </div>

                <div className={`flex justify-between items-center p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-white'
                }`}>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Monthly Fee
                  </span>
                  <span className="flex items-center text-2xl font-bold text-purple-600">
                    <IndianRupee className="w-6 h-6" />
                    1,200
                  </span>
                </div>

                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-purple-50'
                } border-l-4 border-purple-600`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    What's Included:
                  </h4>
                  <ul className={`space-y-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    <li>• 3 classes per week (1 hour each)</li>
                    <li>• Personal instrument guidance and care tips</li>
                    <li>• Performance opportunities</li>
                    <li>• Progress certificates</li>
                    <li>• Access to practice rooms</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Benefits of Learning Instruments
          </h2>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={isContentVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
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
      <section className="relative py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isContentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Begin Your Musical Journey Today
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of students who have discovered the joy of musical expression through our instrument classes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Learning Today
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/courses"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
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

export default InstrumentPage;