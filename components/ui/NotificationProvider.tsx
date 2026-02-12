import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration: number;
  createdAt: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: NotificationType, title: string, message?: string, duration?: number) => string;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 4000;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeNotification = useCallback((id: string) => {
    // Clear the timeout if it exists
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }

    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message?: string,
    duration: number = DEFAULT_DURATION
  ): string => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration,
      createdAt: Date.now(),
    };

    setNotifications(prev => {
      const updated = [notification, ...prev];
      // Remove oldest notifications if exceeding max
      if (updated.length > MAX_VISIBLE) {
        const toRemove = updated.slice(MAX_VISIBLE);
        toRemove.forEach(n => {
          const timeout = timeoutRefs.current.get(n.id);
          if (timeout) {
            clearTimeout(timeout);
            timeoutRefs.current.delete(n.id);
          }
        });
        return updated.slice(0, MAX_VISIBLE);
      }
      return updated;
    });

    // Set auto-dismiss timeout
    if (duration > 0) {
      const timeout = setTimeout(() => {
        removeNotification(id);
      }, duration);
      timeoutRefs.current.set(id, timeout);
    }

    return id;
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
