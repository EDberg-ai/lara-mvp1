import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Plus, Trash2, Save, Edit3, Upload, X, Image as ImageIcon, FileText, HelpCircle, Loader2 } from 'lucide-react';
import { Task } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { uploadApi } from '../../lib/api';
import { useNotification } from '../../lib/useNotification';

// Universal Learning Expectations - LARA standard criteria
export const UNIVERSAL_LEARNING_EXPECTATIONS = [
  "Clarity of response - Is the answer clear and easy to understand?",
  "Use of evidence and/or examples - Does the response include relevant evidence or examples?",
  "Reasoning and explanation - Is the thinking process explained?",
  "Organisation - Is the response well-structured?",
  "Language for audience and purpose - Is the language appropriate?"
];

interface CreateTaskFormProps {
  onSave: (task: Task) => void | Promise<void>;
  onCancel: () => void;
  editTask?: Task | null; // Task to edit (null for create mode)
  onUpdate?: (taskId: string, updates: Partial<Task>) => void | Promise<void>; // Update callback for edit mode
}

export const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ onSave, onCancel, editTask, onUpdate }) => {
  const isEditMode = !!editTask;
  const notify = useNotification();

  const [title, setTitle] = useState(editTask?.title || '');
  const [prompt, setPrompt] = useState(editTask?.prompt || '');
  const [useUniversalExpectations, setUseUniversalExpectations] = useState(
    editTask ? editTask.universalExpectations : false
  );
  const [criteria, setCriteria] = useState<string[]>(
    editTask?.successCriteria?.length ? editTask.successCriteria : ['']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(editTask?.imageUrl || null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(editTask?.fileType || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUleTooltip, setShowUleTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea for title
  const autoResizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    autoResizeTitle();
  }, [title, autoResizeTitle]);

  // Reset form when editTask changes
  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setPrompt(editTask.prompt);
      setUseUniversalExpectations(editTask.universalExpectations);
      setCriteria(editTask.successCriteria?.length ? editTask.successCriteria : ['']);
      setImageUrl(editTask.imageUrl || null);
      setFileType(editTask.fileType || null);
    } else {
      setTitle('');
      setPrompt('');
      setUseUniversalExpectations(false);
      setCriteria(['']);
      setImageUrl(null);
      setFileType(null);
    }
  }, [editTask]);

  const handleAddCriteria = () => {
    setCriteria([...criteria, '']);
  };

  const handleCriteriaChange = (index: number, value: string) => {
    const newCriteria = [...criteria];
    newCriteria[index] = value;
    setCriteria(newCriteria);
  };

  const handleRemoveCriteria = (index: number) => {
    const newCriteria = criteria.filter((_, i) => i !== index);
    setCriteria(newCriteria);
  };

  // File upload handlers (images and PDFs)
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);

    // Validate file type
    if (!isPdf && !isImage) {
      setUploadError('Only JPEG, PNG images and PDF files are allowed');
      return;
    }

    // Validate file size (10MB max for PDFs, 5MB for images)
    const maxSize = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(isPdf ? 'PDF must be smaller than 10MB' : 'Image must be smaller than 5MB');
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const result = await uploadApi.uploadImage(file);
      setImageUrl(result.url);
      setFileType(result.fileType || (isPdf ? 'pdf' : 'image'));
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleRemoveFile = () => {
    setImageUrl(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // ULE always forms the baseline; task-specific criteria are additive
    const customCriteria = criteria.filter(c => c.trim() !== '');
    const finalCriteria = useUniversalExpectations
      ? UNIVERSAL_LEARNING_EXPECTATIONS
      : [...UNIVERSAL_LEARNING_EXPECTATIONS, ...customCriteria];

    try {
      if (isEditMode && editTask && onUpdate) {
        // Update existing task
        await onUpdate(editTask.id, {
          title,
          prompt,
          successCriteria: finalCriteria,
          universalExpectations: useUniversalExpectations,
          imageUrl: imageUrl || undefined,
          fileType: fileType || undefined,
        });
        notify.success('Task Updated', `"${title}" has been updated.`);
      } else {
        // Create new task
        const now = new Date();
        const newTask: Task = {
          id: uuidv4(),
          title,
          prompt,
          successCriteria: finalCriteria,
          universalExpectations: useUniversalExpectations,
          imageUrl: imageUrl || undefined,
          fileType: fileType || undefined,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };
        await onSave(newTask);
        notify.success('Task Created', `"${title}" is ready for learners.`);
      }
    } catch (error: any) {
      const message = error?.message || 'Could not save the task. Please try again.';
      notify.error('Save Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEditMode && (
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Edit3 className="w-5 h-5" />
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-900">
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </h2>
        </div>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Question</label>
            <textarea
              ref={titleRef}
              required
              rows={1}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all resize-none overflow-hidden"
              placeholder="Using Source A, explain the biogeographical process shown."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1 italic">LARA uses this question to guide feedback on clarity, evidence, reasoning, and subject knowledge.</p>
            <br></br>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Writing Prompt (Optional)</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              placeholder="What should the learners write about?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* File Upload Section (Images and PDFs) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task Attachment (Optional)</label>
            <p className="text-xs text-slate-500 mb-3">Add a source or stimulus for students to reference</p>

            {imageUrl ? (
              <div className="relative inline-block">
                {fileType === 'pdf' ? (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <FileText className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">PDF Document</p>
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View PDF
                      </a>
                    </div>
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt="Task attachment"
                    className="max-w-full max-h-48 rounded-lg border border-slate-200"
                  />
                )}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {isUploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <p className="text-sm text-slate-600">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-2">
                      <div className="p-3 bg-slate-100 rounded-full">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="p-3 bg-slate-100 rounded-full">
                        <FileText className="w-6 h-6 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Drag and drop a file, or click to browse
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        JPEG, PNG (max 5MB) or PDF (max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploadError && (
              <p className="text-sm text-red-600 mt-2">{uploadError}</p>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Success Criteria</label>
            <p className="text-xs text-slate-500">LARA needs success criteria to guide feedback. You can use the defaults, add your own, or do both.</p>
          </div>

          {/* Criteria Type Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setUseUniversalExpectations(true)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                  useUniversalExpectations
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Universal Expectations
              </button>
              <button
                type="button"
                onClick={() => setUseUniversalExpectations(false)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  !useUniversalExpectations
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Task Specific Criteria
              </button>
            </div>

            {/* ULE Info Tooltip */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUleTooltip(!showUleTooltip)}
                onBlur={() => setTimeout(() => setShowUleTooltip(false), 200)}
                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
                title="What are Universal Learning Expectations?"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              {showUleTooltip && (
                <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                  <h4 className="font-semibold text-slate-900 mb-2">Universal Learning Expectations</h4>
                  <p className="text-sm text-slate-600">
                    LARA uses these general writing expectations to guide feedback on student writing. You do not need to change these for most tasks.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Show ULE info banner and preview when selected */}
          {useUniversalExpectations ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Universal Learning Expectations Active</h4>
                    <p className="text-sm text-blue-700">
                      LARA uses these general writing expectations to guide feedback on student writing. You do not need to change these for most tasks.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-brand-800">Universal Learning Expectations:</p>
              <ul className="space-y-1.5">
                {UNIVERSAL_LEARNING_EXPECTATIONS.map((exp, index) => (
                  <li key={index} className="text-sm text-brand-700 flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">•</span>
                    {exp}
                  </li>
                ))}
              </ul>
              </div>
            </div>
          ) : (
            /* Custom criteria inputs */
            <>
              <div className="space-y-3">
                {criteria.map((criterion, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder={`Criterion ${index + 1}`}
                      value={criterion}
                      onChange={(e) => handleCriteriaChange(index, e.target.value)}
                    />
                    {criteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCriteria(index)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCriteria}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Criteria
                </Button>
              </div>
            </>
          )}

          {/* Success Criteria Guidance */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-amber-800">
              Use this section to guide LARA's feedback. LARA combines these criteria with the general writing expectations. If you leave this blank, LARA will still use the general writing expectations.
            </p>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            leftIcon={isEditMode ? <Edit3 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          >
            {isEditMode ? 'Save Changes' : 'Publish Task'}
          </Button>
        </div>
      </form>
    </div>
  );
};