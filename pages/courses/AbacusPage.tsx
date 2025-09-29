import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Calculator,
  Brain,
  Zap,
  Target,
  Clock,
  Users,
  Award,
  CheckCircle,
  Calendar,
  Star,
  TrendingUp,
  Lightbulb,
  Phone,
  Mail,
  BookOpen
} from 'lucide-react';

const AbacusPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true, initialInView: true });

  const courseFeatures = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'Mental Math Mastery',
      description: 'Develop extraordinary mental calculation abilities using visualization techniques'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Enhanced Brain Power',
      description: 'Stimulate both brain hemispheres for improved cognitive development'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Concentration Building',
      description: 'Strengthen focus, attention span, and listening skills through structured practice'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Academic Improvement',
      description: 'Boost overall academic performance and confidence in mathematics'
    }
  ];

  const curriculumLevels = [
    {
      level: 'Foundation (Level 1)',
      duration: '3-4 months',
      topics: [
        'Introduction to abacus structure',
        'Basic bead movements',
        'Numbers 1-99 recognition',
        'Simple addition and subtraction',
        'Finger techniques and positioning'
      ],
      age: '4-6 years',
      skills: 'Two-digit calculations'
    },
    {
      level: 'Elementary (Level 2-3)',
      duration: '6-8 months',
      topics: [
        'Three and four-digit numbers',
        'Advanced addition and subtraction',
        'Introduction to multiplication',
        'Mental calculation basics',
        'Speed and accuracy development'
      ],
      age: '6-8 years',
      skills: 'Four-digit calculations'
    },
    {
      level: 'Intermediate (Level 4-6)',
      duration: '8-12 months',
      topics: [
        'Complex multiplication techniques',
        'Division methods',
        'Decimal calculations',
        'Mental math visualization',
        'Competition preparation'
      ],
      age: '8-12 years',
      skills: 'Multi-digit operations'
    },
    {
      level: 'Advanced (Level 7+)',
      duration: 'Ongoing',
      topics: [
        'Advanced division techniques',
        'Square roots and percentages',
        'Advanced mental calculations',
        'Speed competition training',
        'Instructor preparation'
      ],
      age: '12+ years',
      skills: 'Expert mental math'
    }
  ];

  const mentalBenefits = [
    {
      benefit: 'Enhanced Memory',
      description: 'Improves both photographic and working memory through visualization',
      icon: <Brain className="w-6 h-6" />
    },
    {
      benefit: 'Faster Processing',
      description: 'Develops rapid information processing and decision-making abilities',
      icon: <Zap className="w-6 h-6" />
    },
    {
      benefit: 'Better Concentration',
      description: 'Significantly improves focus and attention span in all activities',
      icon: <Target className="w-6 h-6" />
    },
    {
      benefit: 'Analytical Thinking',
      description: 'Enhances logical reasoning and problem-solving capabilities',
      icon: <Lightbulb className="w-6 h-6" />
    },
    {
      benefit: 'Confidence Building',
      description: 'Boosts self-confidence through achievement and mental agility',
      icon: <Star className="w-6 h-6" />
    },
    {
      benefit: 'Academic Excellence',
      description: 'Improves performance in mathematics and overall academic subjects',
      icon: <TrendingUp className="w-6 h-6" />
    }
  ];

  const classSchedule = [
    {
      day: 'Monday & Wednesday',
      time: '4:00 PM - 5:00 PM',
      level: 'Foundation (Ages 4-6)',
      location: 'Both Branches'
    },
    {
      day: 'Tuesday & Thursday',
      time: '5:00 PM - 6:00 PM',
      level: 'Elementary (Ages 6-8)',
      location: 'Both Branches'
    },
    {
      day: 'Friday',
      time: '6:00 PM - 7:00 PM',
      level: 'Intermediate (Ages 8-12)',
      location: 'Head Office'
    },
    {
      day: 'Saturday',
      time: '9:00 AM - 10:00 AM',
      level: 'Advanced & Competition',
      location: 'Head Office'
    }
  ];

  const skillDevelopment = [
    'Rapid mental calculations',
    'Enhanced concentration and focus',
    'Improved memory and visualization',
    'Better listening skills',
    'Increased confidence in mathematics',
    'Faster problem-solving abilities',
    'Better hand-eye coordination',
    'Improved academic performance'
  ];

  const feeStructure = {
    registration: '₹300',
    monthly: '₹600',
    quarterly: '₹1,650',
    materials: '₹200 - ₹500',
    examFee: '₹150 - ₹400'
  };

  const competitionBenefits = [
    {
      competition: 'National Abacus Competition',
      description: 'Annual competition testing speed and accuracy',
      benefits: ['National recognition', 'Certificates and trophies', 'Scholarship opportunities']
    },
    {
      competition: 'Mental Math Olympics',
      description: 'International platform for mental calculation',
      benefits: ['Global exposure', 'International certificates', 'Cultural exchange']
    },
    {
      competition: 'Speed Math Championships',
      description: 'Regional competitions for different age groups',
      benefits: ['Regional rankings', 'Speed calculation awards', 'Practice opportunities']
    }
  ];

  const learningMethods = [
    {
      method: 'Visual Learning',
      description: 'Using abacus visualization to perform mental calculations',
      technique: 'Mental abacus formation and bead movement visualization'
    },
    {
      method: 'Auditory Learning',
      description: 'Following verbal instructions and number dictation',
      technique: 'Listening exercises and oral number practice'
    },
    {
      method: 'Kinesthetic Learning',
      description: 'Physical manipulation of abacus beads',
      technique: 'Hands-on practice with actual abacus tools'
    },
    {
      method: 'Game-Based Learning',
      description: 'Fun activities and competitions to maintain engagement',
      technique: 'Educational games and interactive exercises'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-green-900 via-teal-900 to-cyan-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Abacus</span> Classes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Unlock your child's potential with mental math mastery and enhanced cognitive development
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
              About <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Abacus Learning</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Abacus learning is a time-tested method that enhances mental calculation abilities and overall brain development.
              Our program uses the traditional abacus tool to teach mental arithmetic, developing both logical and creative
              thinking. Students learn to perform complex calculations mentally while building confidence and concentration.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courseFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-green-600 dark:text-green-400 mb-4 flex justify-center">
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

        {/* Learning Methods */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Learning <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Methods</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Multi-sensory approach to ensure effective learning for different learning styles
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {learningMethods.map((method, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {method.method}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  {method.description}
                </p>
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    <strong>Technique:</strong> {method.technique}
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
              Learning <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Progression</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Systematic progression from basic abacus handling to advanced mental calculations
            </p>
          </motion.div>

          <div className="space-y-8">
            {curriculumLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {level.level}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.duration}</span>
                      </div>
                      <div className="flex items-center text-blue-600 dark:text-blue-400">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.age}</span>
                      </div>
                      <div className="flex items-center text-purple-600 dark:text-purple-400">
                        <Calculator className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">{level.skills}</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-3">
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

        {/* Mental Benefits */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Mental <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Benefits</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive cognitive development through abacus learning
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mentalBenefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="text-green-600 dark:text-green-400 mr-4">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {benefit.benefit}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Competition Opportunities */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Competition <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Opportunities</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Participate in various competitions to showcase skills and gain recognition
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {competitionBenefits.map((comp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="text-center mb-4">
                  <Award className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {comp.competition}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {comp.description}
                  </p>
                </div>
                <ul className="space-y-2">
                  {comp.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 mr-2" />
                      {benefit}
                    </li>
                  ))}
                </ul>
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
              Class <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Schedule</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Age-appropriate class timings for optimal learning and retention
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {classSchedule.map((schedule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {schedule.level}
                  </h3>
                  <span className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
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
              Fee <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Structure</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Affordable pricing for quality abacus education and cognitive development
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Calculator className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Fee</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{feeStructure.registration}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">One-time payment</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Calendar className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Monthly Fee</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{feeStructure.monthly}</p>
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
              <strong>Additional:</strong> Abacus & Materials ({feeStructure.materials}), Exam Fees ({feeStructure.examFee})
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Abacus tool and practice books provided by the academy
            </p>
          </div>
        </section>

        {/* Skill Development */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Skills <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Developed</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive skill development through structured abacus learning
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skillDevelopment.map((skill, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl shadow-lg text-center"
              >
                <Brain className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {skill}
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
            className="text-center bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-12 text-white"
          >
            <h3 className="text-3xl font-bold mb-6">
              Unlock Your Child's Mental Math Potential
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our abacus program and watch your child develop extraordinary mental calculation abilities and enhanced cognitive skills.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com?subject=Abacus Classes Inquiry"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-all duration-300 flex items-center"
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

export default AbacusPage;