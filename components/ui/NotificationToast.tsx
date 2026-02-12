import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Notification, NotificationType } from './NotificationProvider';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const icons: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

const styles: Record<NotificationType, { icon: string; border: string; progress: string }> = {
  success: {
    icon: 'text-emerald-500',
    border: 'border-emerald-500/30',
    progress: 'bg-emerald-500',
  },
  error: {
    icon: 'text-red-500',
    border: 'border-red-500/30',
    progress: 'bg-red-500',
  },
  warning: {
    icon: 'text-amber-500',
    border: 'border-amber-500/30',
    progress: 'bg-amber-500',
  },
  info: {
    icon: 'text-blue-500',
    border: 'border-blue-500/30',
    progress: 'bg-blue-500',
  },
};

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const { id, type, title, message, duration, createdAt } = notification;
  const [progress, setProgress] = useState(100);
  const style = styles[type];

  useEffect(() => {
    if (duration <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - createdAt;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, createdAt]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`
        relative overflow-hidden
        w-80 max-w-[calc(100vw-2rem)]
        bg-white/90 backdrop-blur-xl
        border ${style.border} border-white/20
        rounded-xl shadow-lg shadow-black/10
      `}
    >
      {/* Content */}
      <div className="p-4 flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${style.icon}`}>
          {icons[type]}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
          {message && (
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{message}</p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(id)}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
          <motion.div
            className={`h-full ${style.progress}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
};
