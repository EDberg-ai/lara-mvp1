import React, { useState, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, X, Save } from 'lucide-react';
import { FeedbackSession, FeedbackItem, NextStep } from '../../types';

interface FeedbackEditFormProps {
  initialFeedback: FeedbackSession;
  onSave: (feedback: FeedbackSession) => void;
  onCancel: () => void;
}

export const FeedbackEditForm: React.FC<FeedbackEditFormProps> = ({
  initialFeedback,
  onSave,
  onCancel
}) => {
  const [goal, setGoal] = useState(initialFeedback.goal);
  const [strengths, setStrengths] = useState<FeedbackItem[]>(initialFeedback.strengths);
  const [growthAreas, setGrowthAreas] = useState<FeedbackItem[]>(initialFeedback.growthAreas);
  const [nextSteps, setNextSteps] = useState<NextStep[]>(initialFeedback.nextSteps);

  // Auto-resize textareas
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, []);

  const handleSave = () => {
    onSave({
      goal,
      strengths,
      growthAreas,
      nextSteps
    });
  };

  const addStrength = () => {
    setStrengths([...strengths, {
      id: `str-${Date.now()}`,
      type: 'task',
      text: '',
      anchors: []
    }]);
  };

  const removeStrength = (index: number) => {
    setStrengths(strengths.filter((_, i) => i !== index));
  };

  const updateStrength = (index: number, text: string) => {
    setStrengths(strengths.map((s, i) => i === index ? { ...s, text } : s));
  };

  const addGrowthArea = () => {
    setGrowthAreas([...growthAreas, {
      id: `grow-${Date.now()}`,
      type: 'task',
      text: '',
      anchors: []
    }]);
  };

  const removeGrowthArea = (index: number) => {
    setGrowthAreas(growthAreas.filter((_, i) => i !== index));
  };

  const updateGrowthArea = (index: number, text: string) => {
    setGrowthAreas(growthAreas.map((g, i) => i === index ? { ...g, text } : g));
  };

  const addNextStep = () => {
    setNextSteps([...nextSteps, {
      id: `next-${Date.now()}`,
      actionVerb: '',
      target: '',
      successIndicator: '',
      ctaText: '',
      actionType: 'revise'
    }]);
  };

  const removeNextStep = (index: number) => {
    setNextSteps(nextSteps.filter((_, i) => i !== index));
  };

  const updateNextStep = (index: number, field: keyof NextStep, value: string) => {
    setNextSteps(nextSteps.map((n, i) => i === index ? { ...n, [field]: value } : n));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Edit Feedback</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </div>
        </div>

        {/* Learning Goal */}
        <Card>
          <h3 className="text-sm font-medium text-slate-700 mb-3">Learning Goal</h3>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            placeholder="Describe the learning goal..."
          />
        </Card>

        {/* Strengths */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-emerald-700">Strengths</h3>
            <Button variant="outline" size="sm" onClick={addStrength} leftIcon={<Plus className="w-4 h-4" />}>
              Add Strength
            </Button>
          </div>
          <div className="space-y-3">
            {strengths.map((strength, idx) => (
              <div key={strength.id} className="flex gap-2">
                <textarea
                  ref={(el) => { if (el) autoResize(el); }}
                  value={strength.text}
                  onChange={(e) => {
                    updateStrength(idx, e.target.value);
                    autoResize(e.target);
                  }}
                  className="flex-1 px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50 resize-none overflow-hidden"
                  rows={1}
                  placeholder="What did the student do well?"
                />
                <button
                  onClick={() => removeStrength(idx)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Growth Areas */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-amber-700">Growth Areas</h3>
            <Button variant="outline" size="sm" onClick={addGrowthArea} leftIcon={<Plus className="w-4 h-4" />}>
              Add Growth Area
            </Button>
          </div>
          <div className="space-y-3">
            {growthAreas.map((area, idx) => (
              <div key={area.id} className="flex gap-2">
                <textarea
                  ref={(el) => { if (el) autoResize(el); }}
                  value={area.text}
                  onChange={(e) => {
                    updateGrowthArea(idx, e.target.value);
                    autoResize(e.target);
                  }}
                  className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-amber-50 resize-none overflow-hidden"
                  rows={1}
                  placeholder="What needs improvement?"
                />
                <button
                  onClick={() => removeGrowthArea(idx)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Next Steps */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">Next Steps</h3>
            <Button variant="outline" size="sm" onClick={addNextStep} leftIcon={<Plus className="w-4 h-4" />}>
              Add Next Step
            </Button>
          </div>
          <div className="space-y-4">
            {nextSteps.map((step, idx) => (
              <div key={step.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-700">Step {idx + 1}</h4>
                  <button
                    onClick={() => removeNextStep(idx)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={step.actionVerb}
                    onChange={(e) => updateNextStep(idx, 'actionVerb', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Action verb (e.g., Revise, Add, Clarify)"
                  />
                  <input
                    type="text"
                    value={step.target}
                    onChange={(e) => updateNextStep(idx, 'target', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Target (e.g., your introduction)"
                  />
                  <input
                    type="text"
                    value={step.successIndicator}
                    onChange={(e) => updateNextStep(idx, 'successIndicator', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Success indicator (e.g., Include 2-3 examples)"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
