import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, Clock, Layers, AlertCircle, BookOpen } from 'lucide-react';
import type { User, Batch, BatchSchedule, ClassPreference } from '../../types';
import { getBatches, getUsersByIds } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import TeacherLoader from '../../components/TeacherLoader';
import { formatBatchScheduleLabel } from '../../utils/schedule';

interface StudentAllocationRow {
  student: User;
  allocations: Array<{
    batch: Pick<Batch, 'id' | 'name' | 'courseName' | 'mode'>;
    scheduleLabel: string;
  }>;
}

const modeLabels: Record<ClassPreference, string> = {
  Online: 'Online',
  Offline: 'Offline',
  Hybrid: 'Hybrid'
};

const TeacherStudentsPage: React.FC = () => {
  const { user } = useOutletContext<{ user: User }>();
  const { theme } = useTheme();
  const [students, setStudents] = useState<StudentAllocationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [headerRef, headerInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [tableRef, tableInView] = useInView({ threshold: 0.1, triggerOnce: true });

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.id) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const batches = await getBatches();
        const teacherBatches = batches.filter(batch => {
          const teacherId = typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id;
          return teacherId === user.id;
        });

        const allocationMap = new Map<string, StudentAllocationRow['allocations']>();

        teacherBatches.forEach(batch => {
          (batch.schedule || []).forEach((schedule: BatchSchedule) => {
            const scheduleLabel = formatBatchScheduleLabel(schedule);
            (schedule.studentIds || []).forEach(studentId => {
              if (!allocationMap.has(studentId)) {
                allocationMap.set(studentId, []);
              }

              allocationMap.get(studentId)!.push({
                batch: {
                  id: batch.id,
                  name: batch.name,
                  courseName: batch.courseName,
                  mode: batch.mode
                },
                scheduleLabel
              });
            });
          });
        });

        const studentIds = Array.from(allocationMap.keys());
        if (!studentIds.length) {
          setStudents([]);
          return;
        }

        const studentsData = await getUsersByIds(studentIds);
        const studentLookup = new Map(studentsData.map(studentEntry => [studentEntry.id, studentEntry]));

        const rows: StudentAllocationRow[] = studentIds
          .map(studentId => {
            const studentRecord = studentLookup.get(studentId);
            if (!studentRecord) {
              return null;
            }

            const allocations = allocationMap.get(studentId) || [];

            return {
              student: studentRecord,
              allocations: allocations.sort((a, b) => a.batch.courseName.localeCompare(b.batch.courseName))
            };
          })
          .filter((row): row is StudentAllocationRow => Boolean(row));

        rows.sort((a, b) => (a.student.name || '').localeCompare(b.student.name || ''));

        setStudents(rows);
      } catch (fetchError) {
        console.error('Failed to load teacher students:', fetchError);
        setError('Unable to load students right now. Please try again shortly.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [user?.id]);

  const emptyState = useMemo(() => (
    <div className={`rounded-3xl border ${theme === 'dark' ? 'border-gray-700 bg-gray-800/80' : 'border-emerald-100 bg-white/80'} p-10 text-center shadow-xl`}
    >
      <Users className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">No students allocated yet</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Once students are assigned to your batches, they will show up here with their timings.
      </p>
    </div>
  ), [theme]);

  if (isLoading) {
    return <TeacherLoader message="Loading your students..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full"
          animate={{ y: [0, -30, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-24 left-16 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-2xl"
          animate={{ y: [0, 25, 0], rotate: [5, 15, 5] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 px-6 py-6 space-y-8">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className={`rounded-3xl border backdrop-blur-sm ${theme === 'dark' ? 'border-gray-700/60 bg-gray-900/60' : 'border-emerald-100/70 bg-white/80'} p-6 shadow-xl`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Students
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                A quick overview of every student currently assigned to your batches, along with their scheduled timings.
              </p>
            </div>
            <div className="flex items-center space-x-3 text-sm text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full">
              <Users className="w-5 h-5" />
              <span>{students.length} {students.length === 1 ? 'student' : 'students'}</span>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-red-600 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200"
          >
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        <motion.div
          ref={tableRef}
          initial={{ opacity: 0, y: 40 }}
          animate={tableInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          {students.length === 0 ? (
            emptyState
          ) : (
            <div className={`overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-sm ${theme === 'dark' ? 'border-gray-700/70 bg-gray-900/70' : 'border-emerald-100 bg-white/90'}`}>
              <div className={`hidden md:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'bg-gray-800/80 text-gray-300' : 'bg-emerald-50/70 text-emerald-700'}`}>
                <span className="col-span-3">Student</span>
                <span className="col-span-3">Course</span>
                <span className="col-span-3">Batch</span>
                <span className="col-span-3">Allocated Timings</span>
              </div>
              <div className="divide-y divide-emerald-50 dark:divide-gray-800">
                {students.map((row, index) => (
                  <div
                    key={row.student.id}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-6 ${theme === 'dark' ? 'bg-gray-900/60 hover:bg-gray-900/80' : index % 2 === 0 ? 'bg-white/80' : 'bg-emerald-50/60'} transition-colors duration-300`}
                  >
                    <div className="col-span-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-semibold">
                          {row.student.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{row.student.name || 'Unnamed Student'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{row.student.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 space-y-2">
                      {row.allocations.map((allocation, allocIndex) => (
                        <div key={`${allocation.batch.id}-course-${allocIndex}`} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                          <BookOpen className="w-4 h-4 text-emerald-500" />
                          <span>{allocation.batch.courseName}</span>
                        </div>
                      ))}
                    </div>

                    <div className="col-span-3 space-y-2">
                      {row.allocations.map((allocation, allocIndex) => (
                        <div key={`${allocation.batch.id}-batch-${allocIndex}`} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                          <Layers className="w-4 h-4 text-indigo-500" />
                          <div>
                            <p>{allocation.batch.name}</p>
                            {allocation.batch.mode && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {modeLabels[allocation.batch.mode] || allocation.batch.mode}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="col-span-3 space-y-3">
                      {row.allocations.map((allocation, allocIndex) => (
                        <div
                          key={`${allocation.batch.id}-timing-${allocIndex}`}
                          className={`flex items-center space-x-2 rounded-xl px-3 py-2 text-xs font-medium ${theme === 'dark' ? 'bg-indigo-900/40 text-indigo-200' : 'bg-indigo-50 text-indigo-700'}`}
                        >
                          <Clock className="w-4 h-4" />
                          <span>{allocation.scheduleLabel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TeacherStudentsPage;
