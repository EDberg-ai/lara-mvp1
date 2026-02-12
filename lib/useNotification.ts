import { useCallback } from 'react';
import { useNotificationContext, NotificationType } from '../components/ui/NotificationProvider';

export interface NotificationAPI {
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  custom: (type: NotificationType, title: string, message?: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

export function useNotification(): NotificationAPI {
  const { addNotification, removeNotification } = useNotificationContext();

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      addNotification('success', title, message, duration),
    [addNotification]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      addNotification('error', title, message, duration),
    [addNotification]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) =>
      addNotification('warning', title, message, duration),
    [addNotification]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) =>
      addNotification('info', title, message, duration),
    [addNotification]
  );

  const custom = useCallback(
    (type: NotificationType, title: string, message?: string, duration?: number) =>
      addNotification(type, title, message, duration),
    [addNotification]
  );

  const dismiss = useCallback(
    (id: string) => removeNotification(id),
    [removeNotification]
  );

  return { success, error, warning, info, custom, dismiss };
}
