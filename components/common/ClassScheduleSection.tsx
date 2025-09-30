import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, MapPin, Users, CheckCircle } from 'lucide-react';

interface ClassScheduleSectionProps {
  inView: boolean;
}

const ClassScheduleSection: React.FC<ClassScheduleSectionProps> = ({ inView }) => {
  const classSchedule = [
    {
      day: 'Twice Weekly (Flexible Days)',
      time: 'Evening Batches - 1 Hour Each',
      level: 'All Levels',
      location: 'Offline Classes'
    },
    {
      day: 'Available Slot Basis',
      time: 'Flexible Timing',
      level: 'All Levels',
      location: 'Online Classes'
    },
    {
      day: 'Weekends Available',
      time: 'Morning & Evening Slots',
      level: 'All Levels',
      location: 'Both Online & Offline'
    },
    {
      day: 'Chennai Branches',
      time: 'All Days Evening Batches',
      level: 'Head Office & Branch',
      location: 'Offline Classes'
    }
  ];

  return (
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
          <strong>Flexible scheduling for global learners!</strong> Join our twice-weekly classes (1 hour each) with evening batches at our Chennai branches.
          Online classes available on slot basis. Weekend classes also available for both online and offline students.
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
  );
};

export default ClassScheduleSection;