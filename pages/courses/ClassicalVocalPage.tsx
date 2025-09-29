import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Music,
  Mic,
  Heart,
  BookOpen,
  Clock,
  Users,
  Award,
  CheckCircle,
  Calendar,
  Star,
  Volume2,
  Headphones,
  Phone,
  Mail
} from 'lucide-react';

const ClassicalVocalPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true, initialInView: true });

  const courseFeatures = [
    {
      icon: <Music className="w-8 h-8" />,
      title: 'Carnatic Tradition',
      description: 'Learn authentic South Indian classical music following traditional guru-shishya parampara'
    },
    {
      icon: <Mic className="w-8 h-8" />,
      title: 'Voice Training',
      description: 'Comprehensive vocal exercises to develop range, clarity, and breath control'
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Music Theory',
      description: 'Deep understanding of ragas, talas, and the theoretical foundations of Carnatic music'
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Devotional Aspect',
      description: 'Connect with the spiritual and devotional essence of classical compositions'
    }
  ];

  const curriculumLevels = [
    {
      level: 'Foundation (Beginner)',
      duration: '6-12 months',
      topics: [
        'Basic voice exercises (Sarali varase)',
        'Simple ragas (Mayamalava Gowla, Sankarabharanam)',
        'Geetham and simple compositions',
        'Introduction to solfege (Sa Re Ga Ma)',
        'Basic tala knowledge (Adi, Rupaka)'
      ],
      age: '7+ years'
    },
    {
      level: 'Elementary (Grade 1-2)',
      duration: '12-18 months',
      topics: [
        'Janta varase and datu varase',
        'Introduction to alankaras',
        'Simple kritis by Purandara Dasa',
        'Bhajans and devotional songs',
        'Basic manodharma (improvisation)'
      ],
      age: '9+ years'
    },
    {
      level: 'Intermediate (Grade 3-4)',
      duration: '18-24 months',
      topics: [
        'Complex alankaras and exercises',
        'Compositions by Trinity (Tyagaraja, Dikshitar, Syama Sastri)',
        'Varnam singing',
        'Raga alapana basics',
        'Introduction to different composers'
      ],
      age: '12+ years'
    },
    {
      level: 'Advanced (Grade 5+)',
      duration: 'Ongoing',
      topics: [
        'Advanced kritis and compositions',
        'Raga elaboration and neraval',
        'Kalpana swaras and improvisation',
        'Concert format and presentation',
        'Rare ragas and compositions'
      ],
      age: '15+ years'
    }
  ];

  const classSchedule = [
    {
      day: 'Tuesday & Friday',
      time: '4:00 PM - 5:00 PM',
      level: 'Foundation & Elementary',
      location: 'Both Branches'
    },
    {
      day: 'Monday & Thursday',
      time: '6:00 PM - 7:00 PM',
      level: 'Intermediate',
      location: 'Head Office'
    },
    {
      day: 'Wednesday & Saturday',
      time: '5:00 PM - 6:00 PM',
      level: 'Advanced',
      location: 'Head Office'
    },
    {
      day: 'Sunday',
      time: '10:00 AM - 12:00 PM',
      level: 'Group Practice & Concerts',
      location: 'Head Office'
    }
  ];

  const voiceTrainingTechniques = [
    {
      technique: 'Breath Control',
      description: 'Pranayama and breathing exercises for sustained vocal performance',
      icon: <Volume2 className="w-6 h-6" />
    },
    {
      technique: 'Voice Modulation',
      description: 'Techniques for pitch control, gamaka (oscillations), and dynamic expression',
      icon: <Mic className="w-6 h-6" />
    },
    {
      technique: 'Diction & Pronunciation',
      description: 'Clear articulation of Sanskrit and Telugu lyrics with proper pronunciation',
      icon: <Headphones className="w-6 h-6" />
    },
    {
      technique: 'Raga Development',
      description: 'Systematic approach to learning and presenting ragas with authenticity',
      icon: <Music className="w-6 h-6" />
    }
  ];

  const feeStructure = {
    registration: '₹500',
    monthly: '₹1,200',
    quarterly: '₹3,300',
    materials: '₹500',
    examFee: '₹200 - ₹600'
  };

  const benefits = [
    'Enhanced vocal range and clarity',
    'Improved breath control and lung capacity',
    'Cultural and spiritual enrichment',
    'Better concentration and memory',
    'Stress relief and emotional well-being',
    'Public speaking confidence',
    'Musical ear and appreciation',
    'Connection to Indian heritage'
  ];

  const famousComposers = [
    {
      name: 'Saint Tyagaraja',
      description: 'Greatest composer of Carnatic music with over 600 compositions',
      speciality: 'Devotional kritis in praise of Lord Rama'
    },
    {
      name: 'Muthuswami Dikshitar',
      description: 'Known for his scholarly compositions and use of Sanskrit',
      speciality: 'Complex ragas and intricate musical structures'
    },
    {
      name: 'Syama Sastri',
      description: 'Renowned for his compositions on the Divine Mother',
      speciality: 'Swarajati and compositions in praise of Devi'
    },
    {
      name: 'Purandara Dasa',
      description: 'Father of Carnatic music pedagogy',
      speciality: 'Simple devotional songs and teaching methodology'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Classical Vocal</span> Training
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Experience the divine beauty of Carnatic music and develop your voice through traditional teaching methods
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
              About <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Carnatic Music</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Carnatic music is the classical music tradition of South India, known for its sophisticated melodic and rhythmic structures.
              Our vocal training program emphasizes both the technical aspects of singing and the devotional spirit that characterizes
              this ancient art form. Students learn to express deep emotions through ragas while developing strong vocal techniques.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courseFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-blue-600 dark:text-blue-400 mb-4 flex justify-center">
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

        {/* Voice Training Techniques */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Voice Training <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Techniques</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive vocal development through time-tested techniques
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {voiceTrainingTechniques.map((technique, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="text-blue-600 dark:text-blue-400 mr-4">
                    {technique.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {technique.technique}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {technique.description}
                </p>
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
              Learning <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Progression</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Structured curriculum from basic voice training to advanced concert performance
            </p>
          </motion.div>

          <div className="space-y-8">
            {curriculumLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {level.level}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-blue-600 dark:text-blue-400">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.duration}</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.age}</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Curriculum Highlights:</h4>
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

        {/* Famous Composers */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Great <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Composers</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Learn compositions from the masters of Carnatic music
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {famousComposers.map((composer, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {composer.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  {composer.description}
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                  <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                    <strong>Speciality:</strong> {composer.speciality}
                  </p>
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
              Class <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Schedule</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Flexible timings to accommodate different age groups and skill levels
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {classSchedule.map((schedule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {schedule.level}
                  </h3>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
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

        {/* Fee Structure */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Fee <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Structure</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Affordable pricing for quality classical vocal education
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Music className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Fee</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{feeStructure.registration}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">One-time payment</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Calendar className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Monthly Fee</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{feeStructure.monthly}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">4 classes per month</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Star className="w-12 h-12 text-orange-600 dark:text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Quarterly Fee</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">{feeStructure.quarterly}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Save ₹300</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              <strong>Additional:</strong> Materials ({feeStructure.materials}), Exam Fees ({feeStructure.examFee})
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tanpura and other accompaniment instruments available for rent
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Benefits of <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Vocal Training</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Classical vocal training offers holistic development of mind, body, and spirit
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl shadow-lg text-center"
              >
                <Volume2 className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {benefit}
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
            className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white"
          >
            <h3 className="text-3xl font-bold mb-6">
              Discover Your Voice in Classical Music
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our classical vocal program and embark on a musical journey that will enrich your life with melody, rhythm, and devotion.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com?subject=Classical Vocal Classes Inquiry"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300 flex items-center"
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

export default ClassicalVocalPage;