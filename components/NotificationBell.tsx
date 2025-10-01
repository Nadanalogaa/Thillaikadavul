import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from './icons';
import { getUserNotifications, markNotificationAsRead, getUnreadNotificationCount } from '../api';
import type { User } from '../types';

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
}

const NotificationBell: React.FC<NotificationBellProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications and unread count
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        getUserNotifications(user.id),
        getUnreadNotificationCount(user.id)
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
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
  }, [user?.id]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'Success': return '✅';
      case 'Warning': return '⚠️';
      case 'Error': return '❌';
      default: return '📢';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <button
              onClick={fetchNotifications}
              disabled={isLoading}
              className="text-sm text-brand-primary hover:underline disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="text-4xl mb-2">🔔</div>
                <p>No notifications yet</p>
                <p className="text-xs mt-1">You'll be notified about new events, exams, and materials here</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors duration-200 ${
                    notification.read 
                      ? 'bg-white hover:bg-gray-50' 
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 text-lg">
                      {getNotificationIcon(notification.type)}
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
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
              <span className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} • Last updated: {formatTime(new Date())}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;