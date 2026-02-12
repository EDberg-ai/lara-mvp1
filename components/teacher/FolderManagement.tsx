import React, { useState } from 'react';
import { Folder } from '../../types';
import { FolderPlus, Folder as FolderIcon, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface FolderManagementProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onCreateFolder: (name: string, description?: string, color?: string) => string;
  onSelectFolder: (folderId: string | null) => void;
  onDeleteFolder?: (folderId: string) => void;
  onUpdateFolder?: (folderId: string, name: string, description?: string, color?: string) => void;
  onMoveTaskToFolder?: (taskId: string, folderId: string | null) => void;
}

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export const FolderManagement: React.FC<FolderManagementProps> = ({
  folders = [],
  selectedFolderId,
  onCreateFolder,
  onSelectFolder,
  onDeleteFolder,
  onUpdateFolder,
  onMoveTaskToFolder,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null | undefined>(undefined);

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(undefined);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(undefined);
    const taskId = e.dataTransfer.getData('text/task-id');
    if (taskId && onMoveTaskToFolder) {
      onMoveTaskToFolder(taskId, folderId);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderDescription.trim() || undefined, newFolderColor);
      setNewFolderName('');
      setNewFolderDescription('');
      setNewFolderColor(FOLDER_COLORS[0]);
      setShowCreateForm(false);
    }
  };

  const handleStartEdit = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditName(folder.name);
  };

  const handleSaveEdit = (folderId: string) => {
    if (editName.trim() && onUpdateFolder) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        onUpdateFolder(folderId, editName.trim(), folder.description, folder.color);
      }
    }
    setEditingFolderId(null);
    setEditName('');
  };

  return (
    <div className="space-y-3">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
          leftIcon={showCreateForm ? <X className="w-3.5 h-3.5" /> : <FolderPlus className="w-3.5 h-3.5" />}
        >
          {showCreateForm ? 'Cancel' : 'New'}
        </Button>
      </div>

      {/* Create Folder Form */}
      {showCreateForm && (
        <div className="bg-slate-50 rounded-lg p-3 space-y-3 border border-slate-200">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            autoFocus
          />
          <input
            type="text"
            value={newFolderDescription}
            onChange={(e) => setNewFolderDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />

          {/* Color Picker */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-500 shrink-0">Color:</span>
            <div
              className="flex gap-1 overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none',height: '32px','align-items' :'center','padding-left': '10px','padding-right': '10px' }}
            >
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewFolderColor(color)}
                  className={`w-6 h-6 rounded-full transition-transform shrink-0 ${
                    newFolderColor === color ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
          >
            Create Folder
          </Button>
        </div>
      )}

      {/* Folder List */}
      <div className="space-y-1">
        {/* All Tasks (no folder) — also a drop target */}
        <button
          onClick={() => onSelectFolder(null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            dragOverFolderId === null
              ? 'bg-brand-100 border-2 border-dashed border-brand-400 text-brand-700 font-medium'
              : selectedFolderId === null
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FolderIcon className="w-4 h-4 text-slate-400" />
          <span>All Tasks</span>
          {dragOverFolderId === null && <span className="text-xs text-brand-500 ml-auto">Drop here</span>}
        </button>

        {/* Folder Items — also drop targets */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              dragOverFolderId === folder.id
                ? 'bg-brand-100 border-2 border-dashed border-brand-400 text-brand-700 font-medium'
                : selectedFolderId === folder.id
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {editingFolderId === folder.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(folder.id);
                    if (e.key === 'Escape') setEditingFolderId(null);
                  }}
                />
                <button
                  onClick={() => handleSaveEdit(folder.id)}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingFolderId(null)}
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex items-center gap-2 flex-1"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: folder.color }}
                  />
                  <span className="truncate">{folder.name}</span>
                </button>

                {/* Edit/Delete Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  {onUpdateFolder && (
                    <button
                      onClick={() => handleStartEdit(folder)}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                  {onDeleteFolder && (
                    <button
                      onClick={() => onDeleteFolder(folder.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {folders.length === 0 && !showCreateForm && (
          <p className="text-xs text-slate-400 px-3 py-2">
            No folders yet. Create one to organise your tasks.
          </p>
        )}
      </div>
    </div>
  );
};
