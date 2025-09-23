import React from 'react';

interface TeacherLoaderProps {
  message?: string;
  minHeight?: string;
}

const TeacherLoader: React.FC<TeacherLoaderProps> = ({
  message = 'Loading...',
  minHeight = 'min-h-screen'
}) => (
  <div className={`bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center ${minHeight}`}>
    <div className="text-center space-y-3">
      <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
      <p className="text-gray-600 dark:text-gray-400 text-sm font-medium tracking-wide">{message}</p>
    </div>
  </div>
);

export default TeacherLoader;
