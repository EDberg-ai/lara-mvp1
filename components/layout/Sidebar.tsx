import React from 'react';
import { BookOpen, BarChart2, Settings, Users, PenTool, List, LogOut, User } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenSettings: () => void;
  teacherName?: string;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate, onOpenSettings, teacherName, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Sessions', icon: BookOpen },
    { id: 'tasks', label: 'All Tasks', icon: List },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'insights', label: 'Class Insights', icon: BarChart2 },
    { id: 'create', label: 'Create Task', icon: PenTool },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-20">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img src="/iceberg.png" alt="LARA" className="w-10 h-10 object-contain" />
          <span className="text-2xl tracking-wide font-logo font-extrabold text-navy-800">LARA</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              data-tutorial={item.id === 'create' ? 'create-task' : item.id === 'tasks' ? 'folders' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-navy-800 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-gold-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-2">
        {teacherName && (
          <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold-100 text-gold-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">{teacherName}</p>
                <p className="text-xs text-slate-500">Teacher</p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 w-full transition-colors rounded-lg hover:bg-slate-50"
        >
            <Settings className="w-5 h-5 text-slate-400" />
            Settings
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 w-full transition-colors rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        )}
      </div>
    </aside>
  );
};