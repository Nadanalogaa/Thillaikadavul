import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  BookOpen,
  Volume2,
  Type,
  Lightbulb,
  Clock,
  Users,
  Award,
  CheckCircle,
  Calendar,
  Star,
  Headphones,
  MessageCircle,
  Phone,
  Mail
} from 'lucide-react';

const PhonicsPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const courseFeatures = [
    {
      icon: <Type className="w-8 h-8" />,
      title: 'Letter Recognition',
      description: 'Master alphabet recognition and letter-sound relationships through systematic learning'
    },
    {
      icon: <Volume2 className="w-8 h-8" />,
      title: 'Sound Development',
      description: 'Develop clear pronunciation and phonetic awareness for confident reading'
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Reading Foundation',
      description: 'Build strong foundation skills for independent reading and comprehension'
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'Communication Skills',
      description: 'Enhance verbal communication and vocabulary development'
    }
  ];

  const curriculumLevels = [
    {
      level: 'Pre-Phonics (Foundation)',
      duration: '2-3 months',
      topics: [
        'Letter recognition (A-Z)',
        'Basic letter sounds',
        'Visual discrimination',
        'Fine motor skills',
        'Listening skills development'
      ],
      age: '3-4 years',
      skills: 'Letter identification'
    },
    {
      level: 'Beginning Phonics (Level 1)',
      duration: '4-6 months',
      topics: [
        'Single letter sounds',
        'Blending simple words',
        'CVC words (cat, dog, sun)',
        'Beginning and ending sounds',
        'Simple sight words'
      ],
      age: '4-5 years',
      skills: 'Simple word reading'
    },
    {
      level: 'Intermediate Phonics (Level 2)',
      duration: '6-8 months',
      topics: [
        'Digraphs (ch, sh, th)',
        'Long and short vowels',
        'Word families',
        'Simple sentences',
        'Reading comprehension basics'
      ],
      age: '5-6 years',
      skills: 'Sentence reading'
    },
    {
      level: 'Advanced Phonics (Level 3)',
      duration: '6-8 months',
      topics: [
        'Complex blends (str, spl)',
        'Silent letters',
        'Multi-syllable words',
        'Reading fluency',
        'Story comprehension'
      ],
      age: '6-7 years',
      skills: 'Fluent reading'
    }
  ];

  const learningActivities = [
    {
      activity: 'Sound Games',
      description: 'Interactive games to reinforce phonetic sounds and letter recognition',
      materials: 'Flashcards, audio resources, interactive toys',
      icon: <Headphones className="w-6 h-6" />
    },
    {
      activity: 'Word Building',
      description: 'Hands-on activities to construct words using letter tiles and blocks',
      materials: 'Letter tiles, magnetic letters, word building mats',
      icon: <Type className="w-6 h-6" />
    },
    {
      activity: 'Reading Practice',
      description: 'Guided reading sessions with age-appropriate books and stories',
      materials: 'Phonics readers, picture books, story cards',
      icon: <BookOpen className="w-6 h-6" />
    },
    {
      activity: 'Writing Exercises',
      description: 'Tracing and writing practice to reinforce letter formation',
      materials: 'Worksheets, writing books, tracing guides',
      icon: <MessageCircle className="w-6 h-6" />
    }
  ];

  const classSchedule = [
    {
      day: 'Monday & Wednesday',
      time: '3:30 PM - 4:15 PM',
      level: 'Pre-Phonics (Ages 3-4)',
      location: 'Both Branches'
    },
    {
      day: 'Tuesday & Thursday',
      time: '4:30 PM - 5:15 PM',
      level: 'Beginning Phonics (Ages 4-5)',
      location: 'Both Branches'
    },
    {
      day: 'Friday',
      time: '5:30 PM - 6:15 PM',
      level: 'Intermediate Phonics (Ages 5-6)',
      location: 'Head Office'
    },
    {
      day: 'Saturday',
      time: '9:00 AM - 9:45 AM',
      level: 'Advanced Phonics (Ages 6-7)',
      location: 'Head Office'
    }
  ];

  const readingSkills = [
    'Letter-sound correspondence',
    'Phonemic awareness',
    'Blending and segmenting',
    'Sight word recognition',
    'Reading fluency',
    'Vocabulary development',
    'Comprehension skills',
    'Spelling fundamentals'
  ];

  const feeStructure = {
    registration: '₹250',
    monthly: '₹500',
    quarterly: '₹1,350',
    materials: '₹300 - ₹600',
    assessmentFee: '₹100 - ₹200'
  };

  const parentBenefits = [
    {
      benefit: 'School Readiness',
      description: 'Prepares children for formal schooling with essential reading skills'
    },
    {
      benefit: 'Confidence Building',
      description: 'Boosts self-confidence through successful reading achievements'
    },
    {
      benefit: 'Language Development',
      description: 'Enhances overall language and communication abilities'
    },
    {
      benefit: 'Academic Foundation',
      description: 'Creates strong foundation for future academic success'
    },
    {
      benefit: 'Love for Reading',
      description: 'Instills lifelong love and appreciation for books and reading'
    },
    {
      benefit: 'Independent Learning',
      description: 'Develops self-directed learning and study habits'
    }
  ];

  const teachingMethods = [
    'Multi-sensory approach (visual, auditory, kinesthetic)',
    'Systematic phonics instruction',
    'Interactive games and activities',
    'Small group learning environment',
    'Individual attention and assessment',
    'Progress tracking and reporting',
    'Parent involvement and home practice',
    'Technology-enhanced learning tools'
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Phonics</span> Classes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Build strong reading foundations through systematic phonics instruction and engaging learning activities
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Course Overview */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              About <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Phonics Learning</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Phonics is a proven method for teaching children to read by connecting letters with their sounds.
              Our comprehensive phonics program helps children develop essential reading skills through systematic,
              multi-sensory instruction that makes learning fun and effective. Students build confidence as they
              progress from letter recognition to independent reading.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courseFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-indigo-600 dark:text-indigo-400 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Learning Activities */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Learning <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Activities</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Engaging and interactive activities designed to make phonics learning enjoyable
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {learningActivities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="text-indigo-600 dark:text-indigo-400 mr-4">
                    {activity.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {activity.activity}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  {activity.description}
                </p>
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="text-indigo-700 dark:text-indigo-300 text-sm">
                    <strong>Materials:</strong> {activity.materials}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Curriculum Levels */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Learning <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Progression</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Age-appropriate curriculum progression from letter recognition to fluent reading
            </p>
          </motion.div>

          <div className="space-y-8">
            {curriculumLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {level.level}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.duration}</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.age}</span>
                      </div>
                      <div className="flex items-center text-purple-600 dark:text-purple-400">
                        <BookOpen className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.skills}</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Learning Focus:</h4>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {level.topics.map((topic, topicIndex) => (
                        <li key={topicIndex} className="flex items-start text-gray-600 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Class Schedule */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Class <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Schedule</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Short, focused sessions designed for young learners' attention spans
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {classSchedule.map((schedule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {schedule.level}
                  </h3>
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">
                    {schedule.location}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-2" />
                    {schedule.day}
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4 mr-2" />
                    {schedule.time}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Teaching Methods */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Teaching <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Methods</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Research-based teaching approaches for effective phonics instruction
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teachingMethods.map((method, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-xl transition-all duration-300"
              >
                <Lightbulb className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                  {method}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Fee Structure */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Fee <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Structure</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Affordable pricing for quality early literacy education
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <BookOpen className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Fee</h3>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{feeStructure.registration}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">One-time payment</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Calendar className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Monthly Fee</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{feeStructure.monthly}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">4 classes per month</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Star className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Quarterly Fee</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">{feeStructure.quarterly}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Save ₹150</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              <strong>Additional:</strong> Learning Materials ({feeStructure.materials}), Assessment Fee ({feeStructure.assessmentFee})
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Phonics books and activity materials included in course fee
            </p>
          </div>
        </section>

        {/* Parent Benefits */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Benefits for <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Your Child</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive development through structured phonics learning
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {parentBenefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {benefit.benefit}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-white"
          >
            <h3 className="text-3xl font-bold mb-6">
              Give Your Child the Gift of Reading
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our phonics program and help your child develop strong reading foundations that will benefit them throughout their academic journey.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com?subject=Phonics Classes Inquiry"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition-all duration-300 flex items-center"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email Inquiry
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default PhonicsPage;