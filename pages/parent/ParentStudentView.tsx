import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Calendar, DollarSign, Bell, User, Clock,
  MapPin, Users, GraduationCap, Phone, Mail, Home, School, FileText, Award, Book
} from 'lucide-react';
import type { User, StudentEnrollment, Event, Notice, BookMaterial, GradeExam } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { getStudentEnrollmentsForFamily, getNotifications, getStudentInvoicesForFamily, getEvents, getNotices, getBookMaterials, getGradeExams } from '../../api';

interface ParentStudentViewProps {
  parentUser: User;
}

const ParentStudentView: React.FC<ParentStudentViewProps> = ({ parentUser }) => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [student, setStudent] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [bookMaterials, setBookMaterials] = useState<BookMaterial[]>([]);
  const [gradeExams, setGradeExams] = useState<GradeExam[]>([]);
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
      const [
        enrollmentsData,
        notificationsData,
        invoicesData,
        eventsData,
        noticesData,
        bookMaterialsData,
        gradeExamsData
      ] = await Promise.all([
        getStudentEnrollmentsForFamily(studentId.toString()),
        getNotifications(),
        getStudentInvoicesForFamily(studentId.toString()).catch(() => []),
        getEvents().catch(() => []),
        getNotices().catch(() => []),
        getBookMaterials().catch(() => []),
        getGradeExams().catch(() => [])
      ]);

      setEnrollments(enrollmentsData);
      setNotifications(notificationsData);
      setEvents(eventsData);
      setNotices(noticesData);
      setBookMaterials(bookMaterialsData);
      setGradeExams(gradeExamsData);
      setInvoices(invoicesData); // Already filtered by getStudentInvoicesForFamily
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
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Loading student details...</p>
        </div>
      </div>
    );
  }

  // Calculate years studying
  const calculateYearsStudying = () => {
    if (!student.date_of_joining) return null;
    const joinDate = new Date(student.date_of_joining);
    const today = new Date();
    const years = today.getFullYear() - joinDate.getFullYear();
    const months = today.getMonth() - joinDate.getMonth();

    if (years === 0) {
      return months === 0 ? 'Just joined' : `${months} month${months > 1 ? 's' : ''}`;
    }
    if (months < 0) {
      return `${years - 1} year${years - 1 > 1 ? 's' : ''}`;
    }
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  const yearsStudying = calculateYearsStudying();

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
                    className="w-16 h-16 rounded-full object-cover border-4 border-indigo-500"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-indigo-500">
                    <span className="text-2xl font-bold text-white">
                      {(student.display_name || student.name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {student.display_name || student.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {student.grade && (
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Grade {student.grade}
                      </span>
                    )}
                    {/* Course badges */}
                    {student.courses && student.courses.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>•</span>
                        {student.courses.slice(0, 3).map((course: string, idx: number) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              theme === 'dark'
                                ? 'bg-indigo-900/50 text-indigo-300'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {course}
                          </span>
                        ))}
                        {student.courses.length > 3 && (
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            +{student.courses.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
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
              {yearsStudying && (
                <span className={`text-xs px-3 py-1 rounded-full ${
                  theme === 'dark'
                    ? 'bg-purple-900/50 text-purple-300'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  🎓 {yearsStudying} with us
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Enrollments with Batch Timings & Teachers */}
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
                Course Enrollments
              </h2>
            </div>

            {enrollments.length > 0 ? (
              <div className="space-y-4">
                {enrollments.map((enrollment, index) => (
                  <div
                    key={index}
                    className={`p-5 rounded-lg border ${
                      theme === 'dark' ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {enrollment.courseName}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {enrollment.batchName}
                        </p>
                      </div>
                      {enrollment.mode && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          theme === 'dark' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {enrollment.mode}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Teacher */}
                      {enrollment.teacher && (
                        <div className="flex items-center space-x-2">
                          <Users className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Teacher: <span className="font-medium">{enrollment.teacher.name}</span>
                          </span>
                        </div>
                      )}

                      {/* Timings */}
                      {enrollment.timings && enrollment.timings.length > 0 && (
                        <div className="flex items-start space-x-2">
                          <Clock className={`w-4 h-4 mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                          <div className="flex-1">
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Schedule:
                            </span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {enrollment.timings.map((timing, idx) => (
                                <span
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded ${
                                    theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {timing}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Location */}
                      {enrollment.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {enrollment.location.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No course enrollments found
              </p>
            )}
          </motion.div>

          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <User className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Student Profile
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Full Name
                </label>
                <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {student.name || student.display_name}
                </p>
              </div>

              {student.grade && (
                <div>
                  <label className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Grade/Standard
                  </label>
                  <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Grade {student.grade}
                  </p>
                </div>
              )}

              <div>
                <label className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Status
                </label>
                <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {student.status === 'active' ? 'Active' : student.status || 'Unknown'}
                </p>
              </div>

              <div>
                <label className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Courses
                </label>
                <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {enrollments.length} {enrollments.length === 1 ? 'Course' : 'Courses'}
                </p>
              </div>

              {student.dob && (
                <div>
                  <label className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Date of Birth
                  </label>
                  <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(student.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}

              {student.date_of_joining && (
                <div>
                  <label className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Date of Joining
                  </label>
                  <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(student.date_of_joining).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}

              {yearsStudying && (
                <div>
                  <label className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Duration
                  </label>
                  <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {yearsStudying} with Nadanaloga
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Fee & Invoices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`lg:col-span-2 rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <DollarSign className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Fee & Invoices
              </h2>
            </div>

            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className={`p-4 rounded-lg border flex items-center justify-between ${
                      theme === 'dark' ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div>
                      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Invoice #{invoice.invoice_number || invoice.id}
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {invoice.course_name || 'Course Fee'}
                      </p>
                      {invoice.due_date && (
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        ₹{invoice.total_amount || invoice.amount}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        invoice.status === 'paid'
                          ? theme === 'dark'
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-green-100 text-green-800'
                          : theme === 'dark'
                          ? 'bg-orange-900/50 text-orange-300'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {invoice.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No invoices available
              </p>
            )}
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
                notifications.slice(0, 10).map((notification: any) => (
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

          {/* Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`lg:col-span-2 rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Calendar className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Upcoming Events
              </h2>
            </div>

            {events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border ${
                      theme === 'dark' ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {event.title}
                    </h4>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {event.description}
                    </p>
                    {event.event_date && (
                      <p className={`text-xs mt-2 flex items-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(event.event_date).toLocaleDateString()}
                        {event.event_time && ` at ${event.event_time}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No upcoming events
              </p>
            )}
          </motion.div>

          {/* Notices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <FileText className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Notices
              </h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notices.length > 0 ? (
                notices.slice(0, 5).map((notice) => (
                  <div
                    key={notice.id}
                    className={`p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'
                    }`}
                  >
                    <h4 className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {notice.title}
                    </h4>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {notice.content}
                    </p>
                    {notice.created_at && (
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {new Date(notice.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No notices available
                </p>
              )}
            </div>
          </motion.div>

          {/* Book Materials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`lg:col-span-2 rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Book className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Book Materials
              </h2>
            </div>

            {bookMaterials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookMaterials.map((material) => (
                  <div
                    key={material.id}
                    className={`p-4 rounded-lg border ${
                      theme === 'dark' ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {material.title}
                    </h4>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {material.course_name}
                    </p>
                    {material.description && (
                      <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {material.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No book materials available
              </p>
            )}
          </motion.div>

          {/* Grade Exams */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className={`rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Award className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Grade Exams
              </h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {gradeExams.length > 0 ? (
                gradeExams.map((exam) => (
                  <div
                    key={exam.id}
                    className={`p-4 rounded-lg border ${
                      theme === 'dark' ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {exam.title || exam.grade_name}
                    </h4>
                    {exam.course_name && (
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {exam.course_name}
                      </p>
                    )}
                    {exam.exam_date && (
                      <p className={`text-xs mt-2 flex items-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(exam.exam_date).toLocaleDateString()}
                        {exam.exam_time && ` at ${exam.exam_time}`}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No grade exams scheduled
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ParentStudentView;
