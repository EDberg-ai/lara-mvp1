import React from 'react';
import { BookOpen, BarChart2, Users, PenTool } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileBottomNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Session', icon: BookOpen },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'insights', label: 'Insights', icon: BarChart2 },
    { id: 'create', label: 'Task', icon: PenTool },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
      <div className="flex items-center justify-around px-2 pt-2 pb-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center py-1 min-w-[64px] relative"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-navy-800 bg-gold-100' : 'text-slate-400'
                }`}
              >
                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[10px] font-medium mt-1 ${
                isActive ? 'text-navy-800' : 'text-slate-500'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};