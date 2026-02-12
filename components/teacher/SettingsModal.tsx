import React, { useState } from 'react';
import { X, User, Lock, Info, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNotification } from '../../lib/useNotification';

interface SettingsModalProps {
  onClose: () => void;
  teacherName: string;
  teacherEmail: string;
  tier: string;
  aiCallsUsed: number;
  aiCallsLimit: number;
  onUpdateName: (name: string) => Promise<boolean>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

const tierLabels: Record<string, string> = {
  starter: 'Starter Plan',
  classroom: 'Classroom Plan',
  school: 'School Plan',
  district: 'District Plan',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  teacherName,
  teacherEmail,
  tier,
  aiCallsUsed,
  aiCallsLimit,
  onUpdateName,
  onChangePassword,
}) => {
  const notify = useNotification();

  // Account info state
  const [name, setName] = useState(teacherName);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateName = async () => {
    if (!name.trim() || name === teacherName) return;

    setIsUpdatingName(true);
    setNameError(null);

    try {
      const success = await onUpdateName(name.trim());
      if (success) {
        notify.success('Name Updated', 'Your display name has been changed.');
      } else {
        setNameError('Failed to update name');
      }
    } catch (error) {
      setNameError(error instanceof Error ? error.message : 'Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const success = await onChangePassword(currentPassword, newPassword);
      if (success) {
        notify.success('Password Changed', 'Your password has been updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError('Failed to change password');
      }
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const usagePercentage = aiCallsLimit > 0 ? Math.min((aiCallsUsed / aiCallsLimit) * 100, 100) : 0;
  const hasNameChanged = name.trim() !== teacherName && name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-navy-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <p className="text-sm text-slate-300">Manage your account and preferences</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Account Information */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Account Information</h3>
            </div>
            <Card>
              <div className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleUpdateName}
                      disabled={!hasNameChanged || isUpdatingName}
                    >
                      {isUpdatingName ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Update'
                      )}
                    </Button>
                  </div>
                  {nameError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {nameError}
                    </p>
                  )}
                </div>

                {/* Email Field (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={teacherEmail}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                </div>

                {/* Tier Badge & Credits */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Plan</span>
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-full">
                      {tierLabels[tier] || tier}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">AI Credits</span>
                      <span className="text-sm text-slate-600">
                        {aiCallsUsed.toLocaleString()} / {aiCallsLimit.toLocaleString()} used
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          usagePercentage >= 90
                            ? 'bg-red-500'
                            : usagePercentage >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {(aiCallsLimit - aiCallsUsed).toLocaleString()} credits remaining this month
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Change Password */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
            </div>
            <Card>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {passwordError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {passwordError}
                  </p>
                )}

                <Button
                  variant="primary"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-slate-900">About</h3>
            </div>
            <Card className="bg-slate-50">
              <div className="space-y-2 text-sm text-slate-600">
                <p><strong className="text-slate-900">LARA</strong> – by EDberg Education – Formative Feedback Engine</p>
                <p>Version: 2.1</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
