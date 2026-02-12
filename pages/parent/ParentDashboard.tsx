import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ArrowRight, BookOpen, Calendar } from 'lucide-react';
import type { User } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface ParentDashboardProps {
  user: User;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Get students array from user object (populated by login API)
  const students = (user as any).students || [];

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    // Store selected student in session storage for other pages to use
    sessionStorage.setItem('selectedStudent', JSON.stringify(student));
    // Navigate to student dashboard view
    navigate(`/parent/student/${student.id}`);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Welcome, {user.name}
              </h1>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Select a student to view their details
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Users className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {students.length} {students.length === 1 ? 'Child' : 'Children'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
              Your Children
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Select a student to view their courses, batches, fees, and notifications
            </p>
          </motion.div>
        </div>

        {/* Student Cards */}
        {students.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No students found</p>
            <p className="text-sm mt-2">Please contact support if this is an error</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student: any, index: number) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
                onClick={() => handleSelectStudent(student)}
                className={`rounded-2xl p-6 cursor-pointer shadow-lg transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-750 border border-gray-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {/* Student Photo */}
                <div className="flex items-center mb-4">
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.display_name || student.name}
                      className="w-16 h-16 rounded-full object-cover border-4 border-indigo-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-indigo-500">
                      <span className="text-2xl font-bold text-white">
                        {(student.display_name || student.name).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="ml-4">
                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {student.display_name || student.name}
                    </h3>
                    {student.grade && (
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Grade {student.grade}
                      </p>
                    )}
                  </div>
                </div>

                {/* Student Info */}
                <div className="space-y-3 mb-4">
                  {/* Courses */}
                  {student.courses && student.courses.length > 0 && (
                    <div className="flex items-start">
                      <BookOpen className={`w-5 h-5 mt-0.5 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <div className="ml-3 flex-1">
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Courses
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {student.courses.slice(0, 3).map((course: string, idx: number) => (
                            <span
                              key={idx}
                              className={`text-xs px-2 py-1 rounded-full ${
                                theme === 'dark'
                                  ? 'bg-indigo-900/50 text-indigo-300'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}
                            >
                              {course}
                            </span>
                          ))}
                          {student.courses.length > 3 && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                theme === 'dark'
                                  ? 'bg-gray-700 text-gray-400'
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              +{student.courses.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center">
                    <Calendar className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.status === 'active'
                          ? theme === 'dark'
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-green-100 text-green-800'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {student.status === 'active' ? 'Active' : student.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View Button */}
                <motion.button
                  whileHover={{ x: 5 }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
