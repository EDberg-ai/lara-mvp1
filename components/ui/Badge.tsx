import React from 'react';
import { FeedbackType } from '../../types';

interface BadgeProps {
  type: FeedbackType;
}

export const Badge: React.FC<BadgeProps> = ({ type }) => {
  const styles = {
    task: "bg-blue-50 text-blue-700 border-blue-200",
    process: "bg-emerald-50 text-emerald-700 border-emerald-200",
    self_reg: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const labels = {
    task: "What you wrote",
    process: "How you explained it",
    self_reg: "Self-Reg",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${styles[type]}`}>
      {labels[type]}
    </span>
  );
};