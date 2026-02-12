import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Calendar, DollarSign, Bell, User } from 'lucide-react';
import type { User } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { getBatches, getNotifications } from '../../api';

interface ParentStudentViewProps {
  parentUser: User;
}

const ParentStudentView: React.FC<ParentStudentViewProps> = ({ parentUser }) => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [student, setStudent] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get student from parent's students array
    const students = (parentUser as any).students || [];
    const foundStudent = students.find((s: any) => s.id.toString() === studentId);

    if (foundStudent) {
      setStudent(foundStudent);
      loadStudentData(foundStudent.id);
    } else {
      // Try to get from sessionStorage as fallback
      const storedStudent = sessionStorage.getItem('selectedStudent');
      if (storedStudent) {
        const parsed = JSON.parse(storedStudent);
        setStudent(parsed);
        loadStudentData(parsed.id);
      } else {
        navigate('/parent/dashboard');
      }
    }
  }, [studentId, parentUser, navigate]);

  const loadStudentData = async (studentId: number) => {
    try {
      const [batchesData, notificationsData] = await Promise.all([
        getBatches(),
        getNotifications()
      ]);

      setBatches(batchesData);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !student) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/parent/dashboard')}
                className={`p-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div className="flex items-center space-x-3">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.display_name || student.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {(student.display_name || student.name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {student.display_name || student.name}
                  </h1>
                  {student.grade && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Grade {student.grade}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Courses Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`lg:col-span-2 rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <BookOpen className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Enrolled Courses
              </h2>
            </div>

            {student.courses && student.courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.courses.map((course: string, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-750 border border-gray-600' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {course}
                    </h3>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No courses enrolled yet
              </p>
            )}
          </motion.div>

          {/* Notifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Bell className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Recent Notifications
              </h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'
                    }`}
                  >
                    <h4 className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {notification.title}
                    </h4>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {notification.message}
                    </p>
                    {notification.created_at && (
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No notifications yet
                </p>
              )}
            </div>
          </motion.div>

          {/* Batches Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`lg:col-span-2 rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Calendar className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Class Schedule
              </h2>
            </div>

            {batches.length > 0 ? (
              <div className="space-y-4">
                {batches.slice(0, 5).map((batch: any) => (
                  <div
                    key={batch.id}
                    className={`p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-750 border border-gray-600' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {batch.name}
                    </h3>
                    {batch.time_slot && (
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {batch.time_slot}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No batches assigned yet
              </p>
            )}
          </motion.div>

          {/* Profile Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <User className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Profile Info
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Full Name
                </label>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {student.name || student.display_name}
                </p>
              </div>

              {student.grade && (
                <div>
                  <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Grade
                  </label>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {student.grade}
                  </p>
                </div>
              )}

              <div>
                <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Status
                </label>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {student.status === 'active' ? 'Active' : student.status || 'Unknown'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ParentStudentView;
