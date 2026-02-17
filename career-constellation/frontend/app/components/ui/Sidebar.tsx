import { 
  LayoutDashboard, 
  Network, 
  Settings,
  HelpCircle
} from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | '3d';
  onViewChange: (view: 'dashboard' | '3d') => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: '3d', label: 'Constellation', icon: Network },
  ];

  return (
    <aside className="w-16 lg:w-56 bg-base-100 border-r border-base-300 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-base-300">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Network className="w-4 h-4 text-primary-content" />
        </div>
        <span className="hidden lg:block ml-3 font-semibold text-base-content text-sm">
          Job Analytics
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-content'
                  : 'text-base-content/70 hover:bg-base-200'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-base-300 space-y-1">
        <button 
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/70 hover:bg-base-200 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block">Settings</span>
        </button>
        <button 
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/70 hover:bg-base-200 transition-colors"
          title="Help"
        >
          <HelpCircle className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block">Help</span>
        </button>
      </div>
    </aside>
  );
}
