import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { ChevronDown, FileText } from 'lucide-react';

interface TaskSelectorProps {
  tasks: Task[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
}

export const TaskSelector: React.FC<TaskSelectorProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (taskId: string) => {
    onSelectTask(taskId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-slate-200 rounded-xl hover:border-brand-300 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="w-5 h-5 text-brand-500 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-slate-900 truncate">
              {selectedTask?.title || 'Select a task'}
            </p>
            <p className="text-xs text-slate-500">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto z-50">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleSelect(task.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                task.id === selectedTaskId
                  ? 'bg-brand-50 text-brand-700'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <p className="font-medium text-sm truncate">{task.title}</p>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {task.prompt}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
