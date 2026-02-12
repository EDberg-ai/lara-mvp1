import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { Users, Clock, TrendingUp, Award, BarChart3, BookOpen } from 'lucide-react';
import { Student, Submission, Task } from '../../types';
import { TaskSelector } from './TaskSelector';

// Fixed reteach tag set
const RETEACH_TAGS = {
  ATQ: { label: 'Answer the question directly', color: 'bg-red-100 text-red-800 border-red-200' },
  EVIDENCE: { label: 'Add evidence (use the source)', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  REASONING: { label: 'Explain why (link ideas)', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  TERMS: { label: 'Use key terms accurately', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  CLARITY: { label: 'Make it clearer (fix structure)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
} as const;

type ReteachTag = keyof typeof RETEACH_TAGS;

// Keyword-matching fallback for classifying growth areas without primaryTag
function classifyGrowthArea(text: string): ReteachTag {
  const lower = text.toLowerCase();

  const atqKeywords = ['off-task', 'off task', 'main point', 'question', 'does not answer', 'didn\'t answer', 'not answering', 'address the question', 'respond to the question'];
  const evidenceKeywords = ['evidence', 'source', 'support', 'example', 'quote', 'reference', 'data', 'cite'];
  const reasoningKeywords = ['explain', 'reasoning', 'cause', 'relationship', 'because', 'why', 'link', 'connect', 'justify'];
  const termsKeywords = ['vocabulary', 'terminology', 'key term', 'technical', 'subject-specific', 'definition', 'define'];
  const clarityKeywords = ['clearer', 'structure', 'organis', 'organiz', 'paragraph', 'flow', 'coherent', 'confusing', 'unclear'];

  const scores: Record<ReteachTag, number> = { ATQ: 0, EVIDENCE: 0, REASONING: 0, TERMS: 0, CLARITY: 0 };

  atqKeywords.forEach(k => { if (lower.includes(k)) scores.ATQ++; });
  evidenceKeywords.forEach(k => { if (lower.includes(k)) scores.EVIDENCE++; });
  reasoningKeywords.forEach(k => { if (lower.includes(k)) scores.REASONING++; });
  termsKeywords.forEach(k => { if (lower.includes(k)) scores.TERMS++; });
  clarityKeywords.forEach(k => { if (lower.includes(k)) scores.CLARITY++; });

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'CLARITY'; // Default fallback

  return (Object.entries(scores) as [ReteachTag, number][]).find(([, v]) => v === maxScore)![0];
}

interface ClassInsightsViewProps {
  students: Student[];
  submissions: Record<string, Submission>;
  tasks: Task[];
  selectedTaskId?: string;
  onSelectTask?: (taskId: string) => void;
}

export const ClassInsightsView: React.FC<ClassInsightsViewProps> = ({
  students,
  submissions,
  tasks,
  selectedTaskId,
  onSelectTask
}) => {
  const currentTask = tasks.find(t => t.id === selectedTaskId) || tasks[0];

  // Filter students for the selected task
  const taskStudents = useMemo(() => {
    if (!currentTask) return [];
    return students.filter(student => {
      const sub = submissions[student.id];
      if (sub && sub.taskId === currentTask.id) return true;
      if (student.taskId === currentTask.id) return true;
      return false;
    });
  }, [students, submissions, currentTask]);

  // Get all submissions with feedback for this task
  const taskSubmissions = useMemo((): Submission[] => {
    if (!currentTask) return [];
    return (Object.values(submissions) as Submission[]).filter(
      sub => sub.taskId === currentTask.id && sub.feedback
    );
  }, [submissions, currentTask]);

  // Aggregate reteach tags from growth areas
  const reteachData = useMemo(() => {
    const tagCounts: Record<ReteachTag, number> = { ATQ: 0, EVIDENCE: 0, REASONING: 0, TERMS: 0, CLARITY: 0 };

    taskSubmissions.forEach(sub => {
      if (!sub.feedback) return;

      sub.feedback.growthAreas.forEach((g: any) => {
        // Use primaryTag from AI if available, otherwise classify via keywords
        const tag: ReteachTag = (g.primaryTag && g.primaryTag in RETEACH_TAGS)
          ? g.primaryTag as ReteachTag
          : classifyGrowthArea(g.text);
        tagCounts[tag]++;
      });
    });

    // Sort by count descending, filter out zeros
    return (Object.entries(tagCounts) as [ReteachTag, number][])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [taskSubmissions]);

  // Statistics
  const totalStudents = taskStudents.length;
  const completedStudents = taskStudents.filter(s => s.status === 'completed').length;
  const feedbackCount = taskSubmissions.length;

  // Average time on task
  const avgTime = useMemo(() => {
    const times = taskSubmissions
      .map(s => s.timeElapsed)
      .filter((t): t is number => t !== undefined && t > 0);
    if (times.length === 0) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60);
  }, [taskSubmissions]);

  const hasData = taskSubmissions.length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Class Insights</h1>
          <p className="text-sm text-slate-500 mt-1">
            Feedback patterns and learner analytics per task
          </p>
        </div>
        {tasks.length > 0 && onSelectTask && selectedTaskId && (
          <div className="max-w-sm">
            <TaskSelector
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
            />
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Learners</p>
              <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Feedback Generated</p>
              <p className="text-2xl font-bold text-slate-900">{feedbackCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Avg. Time (min)</p>
              <p className="text-2xl font-bold text-slate-900">{avgTime || '--'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-2xl font-bold text-slate-900">{completedStudents}</p>
            </div>
          </div>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <div className="text-center py-12 text-slate-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-slate-600">No feedback data yet</p>
            <p className="text-sm mt-1">
              Insights will appear here once LARA generates feedback for learners on this task.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Top Reteach Moves */}
          <Card>
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-brand-600" />
                <h3 className="text-lg font-semibold text-slate-900">Top reteach moves</h3>
              </div>
              <p className="text-sm text-slate-600">
                Common growth areas across learners, grouped by type. Use these to plan targeted instruction.
              </p>
            </div>

            {reteachData.length > 0 ? (
              <div className="space-y-3">
                {reteachData.map(([tag, count]) => {
                  const config = RETEACH_TAGS[tag];
                  const percentage = Math.round((count / feedbackCount) * 100);
                  return (
                    <div key={tag} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">
                            {count} of {feedbackCount} learner{feedbackCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No growth areas identified yet</p>
            )}
          </Card>
        </>
      )}

      {/* Recent Activity Table */}
      <Card noPadding>
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Learner Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Learner</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Time on Task</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Revisions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taskStudents.map(student => {
                const sub = submissions[student.id];
                const timeMin = sub?.timeElapsed ? Math.round(sub.timeElapsed / 60) : null;
                return (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{student.status.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {timeMin !== null ? `${timeMin} min` : '--'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {sub?.revisionCount || 0}
                    </td>
                  </tr>
                );
              })}
              {taskStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No learners have joined this task yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
