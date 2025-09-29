import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Clock, Calendar, MapPin, Users, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';

const ClassSchedulesPage: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const scheduleProcess = [
    {
      step: 1,
      title: 'Course Selection',
      description: 'Choose from our available courses: Bharatanatyam, Carnatic Vocal, Drawing, Abacus, or Phonics',
      icon: <BookOpen className="w-8 h-8" />
    },
    {
      step: 2,
      title: 'Skill Assessment',
      description: 'We assess your current skill level to place you in the appropriate batch',
      icon: <CheckCircle className="w-8 h-8" />
    },
    {
      step: 3,
      title: 'Schedule Matching',
      description: 'Our team matches your availability with suitable class timings and locations',
      icon: <Clock className="w-8 h-8" />
    },
    {
      step: 4,
      title: 'Batch Allocation',
      description: 'You are allocated to a batch with students of similar skill levels',
      icon: <Users className="w-8 h-8" />
    }
  ];

  const timeSlots = [
    { time: '6:00 AM - 7:00 AM', type: 'Early Morning', availability: 'Available', location: 'Both Branches' },
    { time: '7:00 AM - 8:00 AM', type: 'Morning', availability: 'Limited', location: 'Head Office' },
    { time: '4:00 PM - 5:00 PM', type: 'Afternoon', availability: 'Available', location: 'Both Branches' },
    { time: '5:00 PM - 6:00 PM', type: 'Evening', availability: 'High Demand', location: 'Both Branches' },
    { time: '6:00 PM - 7:00 PM', type: 'Evening', availability: 'Available', location: 'Sembakkam Branch' },
    { time: '7:00 PM - 8:00 PM', type: 'Evening', availability: 'Limited', location: 'Head Office' }
  ];

  const weeklySchedule = [
    {
      day: 'Monday',
      classes: [
        { time: '6:00 AM', course: 'Bharatanatyam - Beginner', location: 'Head Office' },
        { time: '5:00 PM', course: 'Carnatic Vocal - Intermediate', location: 'Sembakkam' },
        { time: '6:00 PM', course: 'Drawing - All Levels', location: 'Both Branches' }
      ]
    },
    {
      day: 'Tuesday',
      classes: [
        { time: '7:00 AM', course: 'Abacus - Level 1', location: 'Head Office' },
        { time: '4:00 PM', course: 'Bharatanatyam - Advanced', location: 'Head Office' },
        { time: '5:00 PM', course: 'Phonics - Beginner', location: 'Sembakkam' }
      ]
    },
    {
      day: 'Wednesday',
      classes: [
        { time: '6:00 AM', course: 'Carnatic Vocal - Beginner', location: 'Both Branches' },
        { time: '5:00 PM', course: 'Bharatanatyam - Intermediate', location: 'Sembakkam' },
        { time: '6:00 PM', course: 'Drawing - Advanced', location: 'Head Office' }
      ]
    },
    {
      day: 'Thursday',
      classes: [
        { time: '7:00 AM', course: 'Phonics - Intermediate', location: 'Sembakkam' },
        { time: '4:00 PM', course: 'Abacus - Level 2', location: 'Both Branches' },
        { time: '5:00 PM', course: 'Bharatanatyam - Beginner', location: 'Head Office' }
      ]
    },
    {
      day: 'Friday',
      classes: [
        { time: '6:00 AM', course: 'Carnatic Vocal - Advanced', location: 'Head Office' },
        { time: '5:00 PM', course: 'Drawing - Beginner', location: 'Both Branches' },
        { time: '6:00 PM', course: 'Bharatanatyam - All Levels', location: 'Sembakkam' }
      ]
    },
    {
      day: 'Saturday',
      classes: [
        { time: '9:00 AM', course: 'Special Workshops', location: 'Head Office' },
        { time: '10:00 AM', course: 'Competition Training', location: 'Head Office' },
        { time: '11:00 AM', course: 'Performance Practice', location: 'Both Branches' }
      ]
    }
  ];

  const branchInfo = [
    {
      name: 'Head Office Branch',
      address: 'Plot no3, VIT Serasa avenue, beside VIT College Ponmar, Mambakkam, Chennai, Tamil Nadu 600127',
      facilities: ['Large dance studio', 'Audio system', 'Mirrors', 'Parking available'],
      contact: '+91 95668 66588'
    },
    {
      name: 'Sembakkam Branch',
      address: '4th St, Ayyappa Nagar, Sadasivam Nagar, Sembakkam Chennai, Tamil Nadu 600064',
      facilities: ['Spacious classroom', 'Music room', 'Art supplies', 'Easy accessibility'],
      contact: '+91 78458 66588'
    }
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
            Class <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Schedules</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            Flexible scheduling and systematic allocation to ensure the best learning experience for every student
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16" ref={ref}>
        {/* Scheduling Process */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How We <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Schedule Classes</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our systematic approach ensures optimal learning environments and convenient timings for all students
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {scheduleProcess.map((process, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {process.step}
                  </span>
                </div>
                <div className="text-purple-600 dark:text-purple-400 mb-4 flex justify-center">
                  {process.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {process.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {process.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Available Time Slots */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Available <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Time Slots</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose from various time slots that fit your schedule and preferences
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timeSlots.map((slot, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {slot.time}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {slot.type}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    slot.availability === 'Available'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : slot.availability === 'Limited'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {slot.availability}
                  </span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <MapPin className="w-4 h-4 mr-2" />
                  {slot.location}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Weekly Schedule */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Sample <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Weekly Schedule</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Here's an example of how our weekly classes are organized across both branches
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weeklySchedule.map((day, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                  {day.day}
                </h3>
                <div className="space-y-4">
                  {day.classes.map((classInfo, classIndex) => (
                    <div key={classIndex} className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {classInfo.time}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {classInfo.location}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">
                        {classInfo.course}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Branch Information */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Branches</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Well-equipped facilities at both locations to provide the best learning environment
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {branchInfo.map((branch, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {branch.name}
                </h3>
                <div className="flex items-start mb-4">
                  <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2 mt-1" />
                  <p className="text-gray-600 dark:text-gray-300">
                    {branch.address}
                  </p>
                </div>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Facilities:</h4>
                  <ul className="space-y-1">
                    {branch.facilities.map((facility, facilityIndex) => (
                      <li key={facilityIndex} className="flex items-center text-gray-600 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        {facility}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center text-purple-600 dark:text-purple-400">
                  <Clock className="w-4 h-4 mr-2" />
                  Contact: {branch.contact}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white"
          >
            <h3 className="text-3xl font-bold mb-6">
              Ready to Join Our Classes?
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Contact us today to discuss your preferred schedule and get enrolled in the perfect batch for your learning journey.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="tel:+919566866588"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Call: +91 95668 66588
              </motion.a>
              <motion.a
                href="mailto:nadanalogaa@gmail.com"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                Email Us
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default ClassSchedulesPage;