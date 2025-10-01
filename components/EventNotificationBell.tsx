import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon } from './icons';
import { getEventNotifications, markEventNotificationAsRead, getCurrentUser } from '../api';
import type { EventNotification } from '../types';

const EventNotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentUser = getCurrentUser();

  // Fetch event notifications
  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    
    setIsLoading(true);
    try {
      const notificationsData = await getEventNotifications(currentUser.id);
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching event notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markEventNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial data and set up polling
  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();

      // Poll for new notifications every 5 minutes (300000ms) - optimized to reduce API calls
      // Only poll when tab is visible to save resources
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchNotifications();
        }
      }, 300000);

      // Also fetch when tab becomes visible after being hidden
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchNotifications();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [currentUser?.id]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getEventTypeIcon = (eventType?: string) => {
    switch (eventType) {
      case 'Academic': return '🎓';
      case 'Cultural': return '🎨';
      case 'Sports': return '⚽';
      case 'Notice': return '📢';
      default: return '📅';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High': return 'border-l-red-500 bg-red-50';
      case 'Low': return 'border-l-gray-400 bg-gray-50';
      default: return 'border-l-yellow-500 bg-yellow-50';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <motion.button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 rounded-full hover:bg-gray-100"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <BellIcon className="h-6 w-6" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <h3 className="font-semibold text-gray-800 flex items-center">
                📅 Event Notifications
              </h3>
              <button
                onClick={fetchNotifications}
                disabled={isLoading}
                className="text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                ) : (
                  '🔄'
                )}
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading && notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-pulse">Loading notifications...</div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="font-medium">No event notifications</p>
                  <p className="text-xs mt-1">You'll be notified about new events here</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-l-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                      notification.isRead 
                        ? 'bg-white border-l-gray-200' 
                        : getPriorityColor(notification.event?.priority)
                    }`}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 text-2xl">
                          {getEventTypeIcon(notification.event?.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-800 text-sm">
                              {notification.event?.title}
                            </p>
                            {!notification.isRead && (
                              <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></span>
                            )}
                          </div>
                          
                          {notification.event?.date && (
                            <div className="flex items-center mt-1 text-xs text-gray-600">
                              <span>📅 {new Date(notification.event.date).toLocaleDateString()}</span>
                              {notification.event.time && (
                                <span className="ml-2">🕐 {notification.event.time}</span>
                              )}
                            </div>
                          )}
                          
                          {notification.event?.location && (
                            <div className="text-xs text-gray-600 mt-1">
                              📍 {notification.event.location}
                            </div>
                          )}
                          
                          <p className="text-gray-700 text-sm mt-2 line-clamp-2">
                            {notification.event?.description}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex space-x-2">
                              {notification.event?.priority && (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  notification.event.priority === 'High' ? 'bg-red-100 text-red-700' :
                                  notification.event.priority === 'Low' ? 'bg-gray-100 text-gray-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {notification.event.priority}
                                </span>
                              )}
                              {notification.event?.eventType && (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  notification.event.eventType === 'Academic' ? 'bg-blue-100 text-blue-700' :
                                  notification.event.eventType === 'Cultural' ? 'bg-purple-100 text-purple-700' :
                                  notification.event.eventType === 'Sports' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {notification.event.eventType}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 text-center">
                <span className="text-xs text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} • 
                  <span className="ml-1">Last updated: {formatTime(new Date())}</span>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventNotificationBell;