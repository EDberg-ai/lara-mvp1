import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNotificationContext } from './NotificationProvider';
import { NotificationToast } from './NotificationToast';

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationContext();

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onDismiss={removeNotification}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
