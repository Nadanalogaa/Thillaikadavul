import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon } from './icons';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  getUnreadNotificationCount,
  getEventNotifications, 
  markEventNotificationAsRead,
  getCurrentUser 
} from '../api';
import type { User, EventNotification } from '../types';

interface NotificationBellProps {
  user: User;
}

interface Notification {
  id: string;
  subject: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  updatedAt?: Date;
  source: 'general' | 'event';
  eventData?: any;
}

const UnifiedNotificationBell: React.FC<NotificationBellProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'events'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all notifications (general + events)
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const [generalNotifications, eventNotifications, unreadCountData] = await Promise.all([
        getUserNotifications(user.id),
        getEventNotifications(user.id),
        getUnreadNotificationCount(user.id)
      ]);
      
      // Combine and format notifications
      const combinedNotifications: Notification[] = [
        ...generalNotifications.map(n => ({
          ...n,
          source: 'general' as const
        })),
        ...eventNotifications.map(n => ({
          id: n.id,
          subject: n.event?.title || 'Event Notification',
          message: n.event?.description || 'New event notification',
          type: n.event?.eventType || 'General',
          read: n.isRead,
          createdAt: n.createdAt,
          source: 'event' as const,
          eventData: n.event
        }))
      ];
      
      // Sort by creation date (newest first)
      combinedNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(combinedNotifications);
      
      // Calculate total unread count
      const totalUnread = combinedNotifications.filter(n => !n.read).length;
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notification: Notification) => {
    try {
      if (notification.source === 'general') {
        await markNotificationAsRead(notification.id);
      } else {
        await markEventNotificationAsRead(notification.id);
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notification.id 
            ? { ...notif, read: true }
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
    if (user?.id) {
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.source === 'event') {
      switch (notification.eventData?.eventType) {
        case 'Academic': return '🎓';
        case 'Cultural': return '🎨';
        case 'Sports': return '⚽';
        case 'Notice': return '📢';
        default: return '📅';
      }
    } else {
      // Check if it's a demo booking notification by the title
      if (notification.subject?.includes('Demo Booking') || notification.subject?.includes('Demo Class')) {
        return '🎯';
      }
      switch (notification.type) {
        case 'Success': return '✅';
        case 'Warning': return '⚠️';
        case 'Error': return '❌';
        default: return '📢';
      }
    }
  };

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'general':
        return notifications.filter(n => n.source === 'general');
      case 'events':
        return notifications.filter(n => n.source === 'event');
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();

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
                🔔 All Notifications
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

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {[
                { key: 'all', label: 'All', count: notifications.length },
                { key: 'general', label: 'General', count: notifications.filter(n => n.source === 'general').length },
                { key: 'events', label: 'Events', count: notifications.filter(n => n.source === 'event').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.label} {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading && notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-pulse">Loading notifications...</div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="font-medium">No notifications</p>
                  <p className="text-xs mt-1">You'll be notified about events, exams, and updates here</p>
                </div>
              ) : (
                filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-l-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                      notification.read 
                        ? 'bg-white border-l-gray-200' 
                        : notification.source === 'event'
                          ? 'bg-purple-50 border-l-purple-500'
                          : (notification.subject?.includes('Demo Booking') || notification.subject?.includes('Demo Class'))
                            ? 'bg-orange-50 border-l-orange-500'
                            : 'bg-blue-50 border-l-blue-500'
                    }`}
                    onClick={() => !notification.read && handleMarkAsRead(notification)}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 text-lg">
                          {getNotificationIcon(notification)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-800 text-sm truncate">
                              {notification.subject}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></span>
                            )}
                          </div>
                          
                          {notification.source === 'event' && notification.eventData && (
                            <div className="flex items-center mt-1 text-xs text-gray-600">
                              {notification.eventData.date && (
                                <span>📅 {new Date(notification.eventData.date).toLocaleDateString()}</span>
                              )}
                              {notification.eventData.time && (
                                <span className="ml-2">🕐 {notification.eventData.time}</span>
                              )}
                            </div>
                          )}
                          
                          {(notification.subject?.includes('Demo Booking') || notification.subject?.includes('Demo Class')) && (
                            <div className="flex items-center mt-1 text-xs text-gray-600">
                              <span>🎯 Demo Class Request</span>
                              <span className="ml-2">📧 Action Required</span>
                            </div>
                          )}
                          
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                notification.source === 'event' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : (notification.subject?.includes('Demo Booking') || notification.subject?.includes('Demo Class'))
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}>
                                {notification.source === 'event' 
                                  ? 'Event' 
                                  : (notification.subject?.includes('Demo Booking') || notification.subject?.includes('Demo Class'))
                                    ? 'Demo Request'
                                    : 'General'}
                              </span>
                              {notification.source === 'event' && notification.eventData?.priority && (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  notification.eventData.priority === 'High' ? 'bg-red-100 text-red-700' :
                                  notification.eventData.priority === 'Low' ? 'bg-gray-100 text-gray-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {notification.eventData.priority}
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
            {filteredNotifications.length > 0 && (
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

export default UnifiedNotificationBell;