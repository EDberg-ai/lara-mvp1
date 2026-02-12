import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { Button } from '../ui/Button';
import { SettingsModal } from '../teacher/SettingsModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onExit: () => void;
  teacherName?: string;
  teacherEmail?: string;
  tier?: string;
  aiCallsUsed?: number;
  aiCallsLimit?: number;
  onUpdateName?: (name: string) => Promise<boolean>;
  onChangePassword?: (currentPassword: string, newPassword: string) => Promise<boolean>;
  onLogout?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onNavigate,
  onExit,
  teacherName = '',
  teacherEmail = '',
  tier = 'classroom',
  aiCallsUsed = 0,
  aiCallsLimit = 800,
  onUpdateName,
  onChangePassword,
  onLogout
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleUpdateName = async (name: string): Promise<boolean> => {
    if (onUpdateName) {
      return onUpdateName(name);
    }
    return false;
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (onChangePassword) {
      return onChangePassword(currentPassword, newPassword);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={onNavigate}
        onOpenSettings={() => setShowSettings(true)}
        teacherName={teacherName}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 transition-all duration-300">

        {/* Mobile Header */}
        <header className="lg:hidden bg-navy-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <img src="/iceberg.png" alt="LARA" className="w-9 h-9 object-contain" />
            <span className="text-xl tracking-wide font-logo font-extrabold text-white">LARA</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onExit} className="text-xs text-white hover:bg-navy-700 hover:text-white">
            Logout
          </Button>
        </header>

        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onNavigate={onNavigate} />

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          teacherName={teacherName}
          teacherEmail={teacherEmail}
          tier={tier}
          aiCallsUsed={aiCallsUsed}
          aiCallsLimit={aiCallsLimit}
          onUpdateName={handleUpdateName}
          onChangePassword={handleChangePassword}
        />
      )}
    </div>
  );
};
