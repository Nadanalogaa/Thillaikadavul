import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { CalendarDays, Users, MapPin, Clock, AlertCircle } from 'lucide-react';
import type { Batch, BatchSchedule, User } from '../../types';
import { getBatches } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import TeacherLoader from '../../components/TeacherLoader';
import { formatBatchScheduleLabel } from '../../utils/schedule';

const TeacherBatchesPage: React.FC = () => {
  const { user } = useOutletContext<{ user: User }>();
  const { theme } = useTheme();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [headerRef, headerInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [cardsRef, cardsInView] = useInView({ threshold: 0.1, triggerOnce: true });

  useEffect(() => {
    const fetchBatches = async () => {
      if (!user?.id) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const batchesData = await getBatches();
        const assignedBatches = batchesData.filter(batch => {
          const teacherId = typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id;
          return teacherId === user.id;
        });

        setBatches(assignedBatches);
      } catch (fetchError) {
        console.error('Failed to load teacher batches:', fetchError);
        setError('Unable to load batch details at the moment. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatches();
  }, [user?.id]);

  if (isLoading) {
    return <TeacherLoader message="Loading your batches..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-24 left-16 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-full"
          animate={{ y: [0, -25, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 right-24 w-28 h-28 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-3xl"
          animate={{ y: [0, 20, 0], rotate: [10, -10, 10] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 px-6 py-6 space-y-8">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className={`rounded-3xl border backdrop-blur-sm ${theme === 'dark' ? 'border-gray-700/60 bg-gray-900/60' : 'border-indigo-100/70 bg-white/80'} p-6 shadow-xl`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Batches
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                Review every batch you lead, including schedules, capacity and current student load.
              </p>
            </div>
            <div className="flex items-center space-x-3 text-sm text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full">
              <CalendarDays className="w-5 h-5" />
              <span>{batches.length} {batches.length === 1 ? 'batch' : 'batches'}</span>
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
          ref={cardsRef}
          initial={{ opacity: 0, y: 40 }}
          animate={cardsInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          {batches.length === 0 ? (
            <div className={`rounded-3xl border ${theme === 'dark' ? 'border-gray-700 bg-gray-800/80' : 'border-indigo-100 bg-white/85'} p-10 text-center shadow-xl`}
            >
              <CalendarDays className="w-12 h-12 mx-auto text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">No batches assigned yet</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Once the admin allocates batches to you, they will appear here with complete details.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {batches.map((batch, index) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 35 }}
                  animate={cardsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  whileHover={{ y: -6 }}
                  className={`rounded-3xl border p-6 shadow-xl transition-colors duration-500 ${theme === 'dark' ? 'border-gray-700/60 bg-gray-900/70 hover:bg-gray-900' : 'border-indigo-100 bg-white/90 hover:bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-indigo-500 font-semibold">{batch.courseName}</p>
                      <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{batch.name}</h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-semibold">
                      {batch.name?.charAt(0) || 'B'}
                    </div>
                  </div>

                  <div className="mt-5 space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-emerald-500" />
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">Capacity:</span>
                        <span>{batch.capacity || 'N/A'}</span>
                        <span className="text-gray-400">|</span>
                        <span className="font-semibold">Enrolled:</span>
                        <span>{batch.enrolled ?? (batch.schedule || []).reduce((count, schedule) => count + (schedule.studentIds?.length || 0), 0)}</span>
                      </div>
                    </div>

                    {batch.mode && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-5 h-5 text-purple-500" />
                        <span>{batch.mode}</span>
                      </div>
                    )}

                    <div>
                      <p className="text-xs uppercase tracking-wider text-indigo-400 font-semibold mb-2">Schedule</p>
                      <div className="space-y-2">
                        {(batch.schedule || []).map((schedule: BatchSchedule, scheduleIndex) => (
                          <div
                            key={`${batch.id}-schedule-${scheduleIndex}`}
                            className={`flex items-center space-x-2 rounded-xl px-3 py-2 text-xs font-medium ${theme === 'dark' ? 'bg-indigo-900/40 text-indigo-200' : 'bg-indigo-50 text-indigo-700'}`}
                          >
                            <Clock className="w-4 h-4" />
                            <span>{formatBatchScheduleLabel(schedule)}</span>
                            <span className="text-[10px] text-indigo-400 ml-auto">
                              {(schedule.studentIds || []).length} {(schedule.studentIds || []).length === 1 ? 'student' : 'students'}
                            </span>
                          </div>
                        ))}

                        {!(batch.schedule || []).length && (
                          <div className={`rounded-xl px-3 py-2 text-xs ${theme === 'dark' ? 'bg-gray-800/70 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            Schedule details pending
                          </div>
                        )}
                      </div>
                    </div>
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

export default TeacherBatchesPage;
