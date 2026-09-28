import React from 'react';
import { LayoutDashboard, BookOpen, Database, BarChart, Cloud, Layers, Briefcase } from 'lucide-react';

export type TabId = 'dashboard' | 'turmas' | 'cadastros' | 'estagios' | 'analises' | 'consolidacao' | 'sync';

interface MainLayoutProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cadastros', label: 'Cadastros', icon: Database },
    { id: 'turmas', label: 'Turmas', icon: BookOpen },
    { id: 'estagios', label: 'Estágios', icon: Briefcase },
    { id: 'consolidacao', label: 'Consolidação', icon: Layers },
    { id: 'analises', label: 'Análises', icon: BarChart },
    { id: 'sync', label: 'Sync e Backup', icon: Cloud },
  ] as const;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 shadow-xl shrink-0">
        <div className="h-16 flex items-center px-6 bg-slate-950/50 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-wide">IFS Gestão</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
