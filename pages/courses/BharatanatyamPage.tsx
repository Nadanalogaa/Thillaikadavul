import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Star,
  Clock,
  Users,
  Award,
  CheckCircle,
  Calendar,
  BookOpen,
  Music,
  Heart,
  Sparkles,
  Phone,
  Mail
} from 'lucide-react';

const BharatanatyamPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true, initialInView: true });

  const courseFeatures = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Traditional Curriculum',
      description: 'Learn authentic Bharatanatyam following the traditional Kalakshetra style and Pandanallur tradition'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Expert Instructors',
      description: 'Learn from qualified teachers with decades of performance and teaching experience'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Certification Program',
      description: 'Structured curriculum with grade-wise certification and performance opportunities'
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Cultural Heritage',
      description: 'Deep understanding of the cultural and spiritual significance of this ancient art form'
    }
  ];

  const curriculumLevels = [
    {
      level: 'Beginner (Foundation)',
      duration: '6-12 months',
      topics: [
        'Basic positions and movements (Araimandi, Samapada)',
        'Hand gestures (Hasta mudras)',
        'Simple dance steps (Adavus)',
        'Basic theory and history',
        'Slokas and basic mantras'
      ],
      age: '5+ years'
    },
    {
      level: 'Intermediate (Grade 1-2)',
      duration: '12-18 months',
      topics: [
        'Complex Adavus and combinations',
        'Introduction to Alarippu and Jatiswaram',
        'Facial expressions (Abhinaya)',
        'Theory of Tala and Raga',
        'First performance pieces'
      ],
      age: '7+ years'
    },
    {
      level: 'Advanced (Grade 3-5)',
      duration: '18-24 months',
      topics: [
        'Varnam - the cornerstone of Bharatanatyam',
        'Padam and Javali',
        'Advanced Abhinaya techniques',
        'Composition analysis',
        'Solo performance preparation'
      ],
      age: '10+ years'
    },
    {
      level: 'Senior (Grade 6+)',
      duration: 'Ongoing',
      topics: [
        'Tillana and complex compositions',
        'Choreography and improvisation',
        'Teaching methodology',
        'Arangetram preparation',
        'Competition training'
      ],
      age: '13+ years'
    }
  ];

  const classSchedule = [
    {
      day: 'Monday & Thursday',
      time: '5:00 PM - 6:00 PM',
      level: 'Beginner',
      location: 'Head Office'
    },
    {
      day: 'Tuesday & Friday',
      time: '6:00 PM - 7:00 PM',
      level: 'Intermediate',
      location: 'Both Branches'
    },
    {
      day: 'Wednesday & Saturday',
      time: '4:00 PM - 5:00 PM',
      level: 'Advanced',
      location: 'Head Office'
    },
    {
      day: 'Saturday',
      time: '10:00 AM - 12:00 PM',
      level: 'Senior & Competition',
      location: 'Head Office'
    }
  ];

  const feeStructure = {
    registration: '₹500',
    monthly: '₹1,500',
    quarterly: '₹4,200',
    costume: '₹3,000 - ₹8,000',
    examFee: '₹300 - ₹800'
  };

  const benefits = [
    'Improved posture and flexibility',
    'Enhanced grace and coordination',
    'Cultural awareness and appreciation',
    'Increased confidence and stage presence',
    'Discipline and focus development',
    'Physical fitness and stamina',
    'Creative expression and artistry',
    'Community and lifelong friendships'
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Bharatanatyam</span> Classes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Master the ancient classical dance form that combines devotion, drama, music, and pure dance
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
              About <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Bharatanatyam</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Bharatanatyam is a major form of Indian classical dance that originated in Tamil Nadu. This ancient art form is a perfect blend of
              Bhava (expression), Raga (music), Tala (rhythm), and Natya (dance/drama). Our comprehensive program teaches traditional techniques
              while fostering individual artistic growth and cultural understanding.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courseFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
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

        {/* Curriculum Levels */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Curriculum <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Levels</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our structured curriculum progresses from basic foundations to advanced performance levels
            </p>
          </motion.div>

          <div className="space-y-8">
            {curriculumLevels.map((level, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {level.level}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-purple-600 dark:text-purple-400">
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
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Learning Objectives:</h4>
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
              Class <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Schedule</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose from our flexible class timings designed to accommodate different schedules
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {classSchedule.map((schedule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {schedule.level}
                  </h3>
                  <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
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
              Fee <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Structure</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Transparent and affordable pricing for quality Bharatanatyam education
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Music className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Fee</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">{feeStructure.registration}</p>
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
              <strong>Additional Costs:</strong> Costume ({feeStructure.costume}), Exam Fees ({feeStructure.examFee})
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Family discounts available for multiple enrollments
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
              Benefits of <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Learning</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Bharatanatyam offers numerous physical, mental, and cultural benefits
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl shadow-lg text-center"
              >
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
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
            className="text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white"
          >
            <h3 className="text-3xl font-bold mb-6">
              Begin Your Bharatanatyam Journey
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our Bharatanatyam classes and immerse yourself in the beauty of this ancient classical dance form.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com?subject=Bharatanatyam Classes Inquiry"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300 flex items-center"
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

export default BharatanatyamPage;