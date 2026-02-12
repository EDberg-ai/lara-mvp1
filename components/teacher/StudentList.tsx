import React from 'react';
import { Student, Submission } from '../../types';
import { Card } from '../ui/Card';
import { ChevronRight, Clock } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  submissions: Record<string, Submission>;
  onNavigateToReview?: (studentId: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ students, submissions, onNavigateToReview }) => {
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        active: "bg-slate-100 text-slate-600",
        ready_for_feedback: "bg-purple-100 text-purple-700",
        generating: "bg-blue-100 text-blue-700",
        submitted: "bg-blue-100 text-blue-700",
        feedback_ready: "bg-emerald-100 text-emerald-700",
        revising: "bg-amber-100 text-amber-700",
        completed: "bg-slate-200 text-slate-700",
    };
    const labels: Record<string, string> = {
        active: "Writing",
        ready_for_feedback: "Ready for Feedback",
        generating: "Generating...",
        submitted: "Needs Review",
        feedback_ready: "Feedback Sent",
        revising: "Revising",
        completed: "Done",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${styles[status] || styles.active}`}>
            {labels[status] || status.replace('_', ' ')}
        </span>
    );
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Learners</h1>
        <p className="text-sm text-slate-500 mt-1">
          {students.length} learner{students.length !== 1 ? 's' : ''} across all tasks
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                      <th className="px-6 py-3">Learner</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Time on Task</th>
                      <th className="px-6 py-3">Revisions</th>
                      <th className="px-6 py-3">Joined</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {students.map(student => {
                    const sub = submissions[student.id];
                    const timeMin = sub?.timeElapsed ? Math.round(sub.timeElapsed / 60) : null;
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => onNavigateToReview?.(student.id)}
                      >
                          <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                          <td className="px-6 py-4"><StatusBadge status={student.status} /></td>
                          <td className="px-6 py-4 text-slate-500">
                            {timeMin !== null ? `${timeMin} min` : '--'}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {sub?.revisionCount || 0}
                          </td>
                          <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                             <Clock className="w-3 h-3 text-slate-400" />
                             <span>{formatTimeAgo(student.joinedAt)}</span>
                          </td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No learners have joined any tasks yet
                      </td>
                    </tr>
                  )}
              </tbody>
          </table>
        </div>

        {/* MOBILE LIST VIEW */}
        <div className="lg:hidden divide-y divide-slate-100">
          {students.map(student => {
            const sub = submissions[student.id];
            const timeMin = sub?.timeElapsed ? Math.round(sub.timeElapsed / 60) : null;
            return (
              <div key={student.id} onClick={() => onNavigateToReview?.(student.id)} className="p-4 flex items-center justify-between active:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-slate-900">{student.name}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={student.status} />
                    {timeMin !== null && (
                      <span className="text-xs text-slate-400">{timeMin} min</span>
                    )}
                    {(sub?.revisionCount || 0) > 0 && (
                      <span className="text-xs text-slate-400">{sub?.revisionCount} revision{(sub?.revisionCount || 0) > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            );
          })}
          {students.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No learners have joined any tasks yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
