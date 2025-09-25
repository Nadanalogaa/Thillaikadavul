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

interface TeacherBatchGroup {
  batch: Pick<Batch, 'id' | 'name' | 'courseName' | 'mode'>;
  scheduleLabels: string[];
  students: User[];
}

const modeLabels: Record<ClassPreference, string> = {
  Online: 'Online',
  Offline: 'Offline',
  Hybrid: 'Hybrid'
};

const TeacherStudentsPage: React.FC = () => {
  const { user } = useOutletContext<{ user: User }>();
  const { theme } = useTheme();
  const [batchGroups, setBatchGroups] = useState<TeacherBatchGroup[]>([]);
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

        const batchScheduleMap = new Map<string, Set<string>>();
        const batchStudentsMap = new Map<string, Set<string>>();

        teacherBatches.forEach(batch => {
          (batch.schedule || []).forEach((schedule: BatchSchedule) => {
            const scheduleLabel = formatBatchScheduleLabel(schedule);
            (schedule.studentIds || []).forEach(studentId => {
              if (!batchStudentsMap.has(batch.id)) {
                batchStudentsMap.set(batch.id, new Set());
              }
              batchStudentsMap.get(batch.id)!.add(studentId);

              if (!batchScheduleMap.has(batch.id)) {
                batchScheduleMap.set(batch.id, new Set());
              }
              if (scheduleLabel) {
                batchScheduleMap.get(batch.id)!.add(scheduleLabel);
              }
            });
          });
        });

        const studentIds = Array.from(
          new Set(
            Array.from(batchStudentsMap.values()).flatMap(set => Array.from(set))
          )
        );

        if (!studentIds.length) {
          setBatchGroups([]);
          return;
        }

        const studentsData = await getUsersByIds(studentIds);
        const studentLookup = new Map(studentsData.map(studentEntry => [studentEntry.id, studentEntry]));

        const groups: TeacherBatchGroup[] = teacherBatches.map(batch => {
          const studentIdsForBatch = Array.from(batchStudentsMap.get(batch.id) || new Set());
          const scheduleLabels = Array.from(batchScheduleMap.get(batch.id) || new Set());

          const studentsForBatch = studentIdsForBatch
            .map(studentId => studentLookup.get(studentId))
            .filter((student): student is User => Boolean(student))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

          return {
            batch: {
              id: batch.id,
              name: batch.name,
              courseName: batch.courseName,
              mode: batch.mode
            },
            scheduleLabels,
            students: studentsForBatch
          };
        }).filter(group => group.students.length > 0);

        groups.sort((a, b) => {
          const courseCompare = (a.batch.courseName || '').localeCompare(b.batch.courseName || '');
          if (courseCompare !== 0) return courseCompare;
          return (a.batch.name || '').localeCompare(b.batch.name || '');
        });

        setBatchGroups(groups);
      } catch (fetchError) {
        console.error('Failed to load teacher students:', fetchError);
        setError('Unable to load students right now. Please try again shortly.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [user?.id]);

  const totalStudents = useMemo(() => {
    const ids = new Set<string>();
    batchGroups.forEach(group => group.students.forEach(student => ids.add(student.id)));
    return ids.size;
  }, [batchGroups]);

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
              <span>{totalStudents} {totalStudents === 1 ? 'student' : 'students'}</span>
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
          {batchGroups.length === 0 ? (
            emptyState
          ) : (
            <div className="space-y-6">
              {batchGroups.map((group, index) => (
                <motion.div
                  key={group.batch.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className={`rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden ${theme === 'dark' ? 'border-gray-700/70 bg-gray-900/70' : 'border-emerald-100 bg-white/90'}`}
                >
                  <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-emerald-100'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-3 text-sm uppercase tracking-widest text-emerald-500">
                          <BookOpen className="w-4 h-4" />
                          <span>{group.batch.courseName || 'Course name pending'}</span>
                        </div>
                        <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                          {group.batch.name || 'Batch name pending'}
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                          <span className={`inline-flex items-center space-x-2 rounded-full px-3 py-1 ${theme === 'dark' ? 'bg-indigo-900/40 text-indigo-200' : 'bg-indigo-50 text-indigo-700'}`}>
                            <Layers className="w-4 h-4" />
                            <span>{group.batch.mode ? modeLabels[group.batch.mode] || group.batch.mode : 'Mode pending'}</span>
                          </span>
                          {group.scheduleLabels.map(label => (
                            <span
                              key={`${group.batch.id}-${label}`}
                              className={`inline-flex items-center space-x-2 rounded-full px-3 py-1 ${theme === 'dark' ? 'bg-purple-900/30 text-purple-200' : 'bg-purple-50 text-purple-700'}`}
                            >
                              <Clock className="w-4 h-4" />
                              <span>{label}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={`px-4 py-3 rounded-2xl text-center ${theme === 'dark' ? 'bg-gray-800/80 border border-gray-700/60 text-gray-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        <p className="text-xs uppercase tracking-wider">Students</p>
                        <p className="text-xl font-bold">{group.students.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-6">
                    {group.students.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No students assigned to this batch yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.students.map(student => (
                          <div
                            key={student.id}
                            className={`flex items-center space-x-3 rounded-2xl px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/70 text-gray-200' : 'bg-emerald-50 text-emerald-700'}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-semibold">
                              {student.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{student.name || 'Unnamed Student'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TeacherStudentsPage;
