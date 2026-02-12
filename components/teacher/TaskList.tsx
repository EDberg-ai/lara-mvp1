import React, { useState } from 'react';
import { Task, Submission, Student, Folder } from '../../types';
import { FileText, Users, CheckCircle, Clock, Calendar, ToggleLeft, ToggleRight, FolderInput, MoreVertical, Power, PowerOff, Folder as FolderIcon } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  submissions: Record<string, Submission>;
  students: Student[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  folders?: Folder[];
  onDeactivateTask?: (taskId: string) => void;
  onReactivateTask?: (taskId: string) => void;
  onMoveTaskToFolder?: (taskId: string, folderId: string | null) => void;
  selectedFolderId?: string | null;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  submissions,
  students,
  selectedTaskId,
  onSelectTask,
  folders = [],
  onDeactivateTask,
  onReactivateTask,
  onMoveTaskToFolder,
  selectedFolderId,
}) => {
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/task-id', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };
  // Calculate statistics for each task
  const getTaskStats = (taskId: string) => {
    const taskSubmissions = Object.values(submissions).filter(
      (sub) => sub.taskId === taskId
    );
    const taskStudents = students.filter((student) =>
      taskSubmissions.some((sub) => sub.studentId === student.id)
    );
    const completedCount = taskStudents.filter(
      (s) => s.status === 'feedback_ready' || s.status === 'revising'
    ).length;
    const pendingCount = taskStudents.filter(
      (s) => s.status === 'submitted'
    ).length;
    const totalCount = taskStudents.length;

    return { completedCount, pendingCount, totalCount };
  };

  // Format date
  const formatDate = (taskId: string) => {
    // For demo purposes, we'll just show relative dates
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === 0) return 'Today';
    if (index === 1) return 'Yesterday';
    return `${index} days ago`;
  };

  // Filter tasks by selected folder
  const filteredTasks = selectedFolderId !== undefined
    ? selectedFolderId === null
      ? tasks // Show all tasks when "All Tasks" is selected
      : tasks.filter(t => t.folderId === selectedFolderId)
    : tasks;

  // Handle toggle task status
  const handleToggleTaskStatus = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (task.status === 'active' && onDeactivateTask) {
      onDeactivateTask(task.id);
    } else if (task.status === 'inactive' && onReactivateTask) {
      onReactivateTask(task.id);
    }
    setOpenMenuTaskId(null);
  };

  // Handle move to folder
  const handleMoveToFolder = (e: React.MouseEvent, taskId: string, folderId: string | null) => {
    e.stopPropagation();
    if (onMoveTaskToFolder) {
      onMoveTaskToFolder(taskId, folderId);
    }
    setOpenMenuTaskId(null);
  };

  // Get folder name by ID
  const getFolderName = (folderId: string | null | undefined) => {
    if (!folderId) return null;
    const folder = folders.find(f => f.id === folderId);
    return folder?.name || null;
  };

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 text-lg font-medium mb-2">
          {selectedFolderId ? 'No tasks in this folder' : 'No tasks yet'}
        </p>
        <p className="text-slate-400 text-sm">
          {selectedFolderId ? 'Move tasks here or create a new one' : 'Create your first task to get started'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredTasks.map((task) => {
        const { completedCount, pendingCount, totalCount } = getTaskStats(task.id);
        const isSelected = task.id === selectedTaskId;

        const isInactive = task.status === 'inactive';
        const folderName = getFolderName(task.folderId);

        return (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            className={`relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-grab active:cursor-grabbing ${
              draggingTaskId === task.id
                ? 'opacity-50 border-brand-400 bg-brand-50/50'
                : isInactive
                  ? 'border-slate-200 bg-slate-50 opacity-70'
                  : isSelected
                    ? 'border-brand-500 bg-brand-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30'
            }`}
          >
            <button
              onClick={() => onSelectTask(task.id)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={`font-semibold text-base truncate ${
                        isInactive
                          ? 'text-slate-500'
                          : isSelected
                            ? 'text-brand-700'
                            : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        isInactive
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isInactive ? (
                        <>
                          <PowerOff className="w-2.5 h-2.5" />
                          Inactive
                        </>
                      ) : (
                        <>
                          <Power className="w-2.5 h-2.5" />
                          Live
                        </>
                      )}
                    </span>
                  </div>
                  <p className={`text-sm line-clamp-2 ${isInactive ? 'text-slate-400' : 'text-slate-600'}`}>
                    {task.prompt}
                  </p>
                </div>
                {isSelected && !isInactive && (
                  <CheckCircle className="w-5 h-5 text-brand-500 ml-2 flex-shrink-0" />
                )}
              </div>

              {/* Task Statistics */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(task.id)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{totalCount} student{totalCount !== 1 ? 's' : ''}</span>
                </div>
                {folderName && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <FolderIcon className="w-3.5 h-3.5" />
                    <span>{folderName}</span>
                  </div>
                )}
                {!isInactive && pendingCount > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{pendingCount} pending</span>
                  </div>
                )}
                {!isInactive && completedCount > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{completedCount} completed</span>
                  </div>
                )}
              </div>
            </button>

            {/* Action Menu Button */}
            {(onDeactivateTask || onReactivateTask || onMoveTaskToFolder) && (
              <div className="absolute top-3 right-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {openMenuTaskId === task.id && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                    {/* Toggle Status */}
                    {(onDeactivateTask || onReactivateTask) && (
                      <button
                        onClick={(e) => handleToggleTaskStatus(e, task)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          isInactive
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-amber-600 hover:bg-amber-50'
                        }`}
                      >
                        {isInactive ? (
                          <>
                            <ToggleRight className="w-4 h-4" />
                            Activate Task
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4" />
                            Deactivate Task
                          </>
                        )}
                      </button>
                    )}

                    {/* Move to Folder */}
                    {onMoveTaskToFolder && folders.length > 0 && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Move to folder
                        </div>
                        <button
                          onClick={(e) => handleMoveToFolder(e, task.id, null)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 ${
                            !task.folderId ? 'bg-slate-50 font-medium' : ''
                          }`}
                        >
                          <FolderIcon className="w-4 h-4 text-slate-400" />
                          No Folder
                        </button>
                        {folders.map((folder) => (
                          <button
                            key={folder.id}
                            onClick={(e) => handleMoveToFolder(e, task.id, folder.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 ${
                              task.folderId === folder.id ? 'bg-slate-50 font-medium' : ''
                            }`}
                          >
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: folder.color }}
                            />
                            {folder.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
