import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Network, 
  Settings,
  HelpCircle,
  X,
  Moon,
  Sun,
  Monitor,
  BarChart3,
  Filter,
  Search,
  Keyboard,
  Info,
  CheckCircle2,
  Palette,
  ChevronLeft,
  ChevronRight,
  Bot,
  ChevronDown,
  BookOpen
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';

// Settings Modal Component
function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [defaultView, setDefaultView] = useState<'dashboard' | 'constellation'>('dashboard');
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic' | 'local'>('openai');
  const [chartAnimations, setChartAnimations] = useState(true);

  // Apply theme immediately when changed
  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    }
  };

  useEffect(() => {
    // Load saved preferences
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    const savedView = localStorage.getItem('defaultView') as 'dashboard' | 'constellation' | null;
    const savedAiProvider = localStorage.getItem('aiProvider') as 'openai' | 'anthropic' | 'local' | null;
    const savedAnimations = localStorage.getItem('chartAnimations');
    
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
    if (savedView) setDefaultView(savedView);
    if (savedAiProvider) setAiProvider(savedAiProvider);
    if (savedAnimations !== null) setChartAnimations(savedAnimations === 'true');
  }, []);

  const saveSettings = () => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('defaultView', defaultView);
    localStorage.setItem('aiProvider', aiProvider);
    localStorage.setItem('chartAnimations', String(chartAnimations));
    
    // Apply theme
    applyTheme(theme);
    
    // Navigate to default view if it changed
    const currentPath = window.location.pathname;
    const isOnDashboard = currentPath.includes('/dashboard');
    const isOnConstellation = currentPath.includes('/constellation');
    
    if (defaultView === 'dashboard' && isOnConstellation) {
      navigate({ to: '/dashboard' });
    } else if (defaultView === 'constellation' && isOnDashboard) {
      navigate({ to: '/constellation' });
    }
    
    onClose();
  };

  // Handle theme change immediately for preview
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-base-content">Settings</h2>
              <p className="text-sm text-base-content/60">Customize your dashboard experience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-base-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-base-content/50" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Theme Settings */}
          <section>
            <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-primary" />
              Appearance
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  theme === 'light' ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-400'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-sm font-medium">Light</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  theme === 'dark' ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-400'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-sm font-medium">Dark</span>
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  theme === 'system' ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-400'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-sm font-medium">System</span>
              </button>
            </div>
          </section>

          {/* Default View */}
          <section>
            <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              Default View
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDefaultView('dashboard')}
                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                  defaultView === 'dashboard' ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-400'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm font-medium">Dashboard</span>
              </button>
              <button
                onClick={() => setDefaultView('constellation')}
                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                  defaultView === 'constellation' ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-400'
                }`}
              >
                <Network className="w-4 h-4" />
                <span className="text-sm font-medium">Constellation</span>
              </button>
            </div>
            <p className="text-xs text-base-content/50 mt-2">
              Changes will navigate you to the selected view immediately.
            </p>
          </section>

          {/* AI Provider */}
          <section>
            <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-primary" />
              AI Provider
            </h3>
            <div className="relative">
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as 'openai' | 'anthropic' | 'local')}
                className="w-full p-3 pr-10 bg-base-200/50 border border-base-300 rounded-xl text-sm appearance-none cursor-pointer hover:bg-base-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="local">Local Model (Ollama)</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none" />
            </div>
            <p className="text-xs text-base-content/50 mt-2">
              Select your preferred AI provider for future AI-powered features.
            </p>
          </section>

          {/* Chart Animations */}
          <section>
            <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              Chart Animations
            </h3>
            <label className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl cursor-pointer hover:bg-base-200 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Enable chart animations</span>
              </div>
              <input
                type="checkbox"
                checked={chartAnimations}
                onChange={(e) => setChartAnimations(e.target.checked)}
                className="checkbox checkbox-primary checkbox-sm"
              />
            </label>
          </section>
        </div>

        <div className="p-6 border-t border-base-300 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={saveSettings} className="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// Help Modal Component
function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'filters' | 'shortcuts'>('overview');

  if (!isOpen) return null;

  const tabs: { id: 'overview' | 'charts' | 'filters' | 'shortcuts'; label: string; icon: typeof Info }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'charts', label: 'Charts', icon: BarChart3 },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  ];

  const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
  const canGoPrevious = currentTabIndex > 0;
  const canGoNext = currentTabIndex < tabs.length - 1;

  const goToPrevious = () => {
    if (canGoPrevious) setActiveTab(tabs[currentTabIndex - 1].id);
  };

  const goToNext = () => {
    if (canGoNext) setActiveTab(tabs[currentTabIndex + 1].id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-base-content">Help Center</h2>
              <p className="text-sm text-base-content/60">Learn how to use the dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-base-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-base-content/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-base-300 px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-base-content/60 hover:text-base-content'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Content area with consistent min-height and navigation arrows */}
        <div className="relative">
          {/* Previous arrow */}
          {canGoPrevious && (
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-base-200/80 hover:bg-base-300 text-base-content/70 hover:text-base-content transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          {/* Next arrow */}
          {canGoNext && (
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-base-200/80 hover:bg-base-300 text-base-content/70 hover:text-base-content transition-colors"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="p-6 min-h-[400px]">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <section>
                  <h3 className="font-semibold text-base-content mb-3">Welcome to Workforce Dashboard</h3>
                  <p className="text-sm text-base-content/80 leading-relaxed">
                    The Workforce Dashboard provides a comprehensive view of all job positions in your organization. 
                    Use it to explore job families, analyze skill distributions, and identify standardization opportunities.
                  </p>
                </section>
                <section className="bg-base-200/50 rounded-xl p-4">
                  <h3 className="font-semibold text-base-content mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {[
                      'View all positions organized by job families',
                      'Analyze skill and keyword distributions',
                      'Filter by clusters, keywords, or search terms',
                      'Compare similar positions',
                      'Export data for further analysis'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-base-content/80">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="space-y-4">
                <section>
                  <h3 className="font-semibold text-base-content mb-3">Understanding the Charts</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-base-200/50 rounded-xl">
                      <div className="font-medium text-base-content mb-1">Jobs by Family</div>
                      <p className="text-sm text-base-content/70">
                        Shows the distribution of positions across different job families. 
                        Click on any bar to filter by that family.
                      </p>
                    </div>
                    <div className="p-4 bg-base-200/50 rounded-xl">
                      <div className="font-medium text-base-content mb-1">Top Keywords</div>
                      <p className="text-sm text-base-content/70">
                        Displays the most frequently occurring keywords across all positions. 
                        Useful for identifying common skills and requirements.
                      </p>
                    </div>
                    <div className="p-4 bg-base-200/50 rounded-xl">
                      <div className="font-medium text-base-content mb-1">Distribution</div>
                      <p className="text-sm text-base-content/70">
                        Pie chart showing the percentage breakdown of jobs by family. 
                        Hover over slices for detailed counts.
                      </p>
                    </div>
                    <div className="p-4 bg-base-200/50 rounded-xl">
                      <div className="font-medium text-base-content mb-1">Position Landscape</div>
                      <p className="text-sm text-base-content/70">
                        2D projection of all positions. Similar jobs are clustered together. 
                        Click any point to view job details.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'filters' && (
              <div className="space-y-4">
                <section>
                  <h3 className="font-semibold text-base-content mb-3">Using Filters</h3>
                  <p className="text-sm text-base-content/80 mb-4">
                    Filters help you narrow down the data to focus on specific positions or job families.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-base-200/50 rounded-xl">
                      <Search className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-base-content">Search</div>
                        <p className="text-sm text-base-content/70">
                          Type in the search box to find positions by title or description.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-base-200/50 rounded-xl">
                      <Filter className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-base-content">Job Families</div>
                        <p className="text-sm text-base-content/70">
                          Select one or more job families to show only positions from those clusters.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-base-200/50 rounded-xl">
                      <Search className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-base-content">Keywords</div>
                        <p className="text-sm text-base-content/70">
                          Filter by specific keywords to find positions with particular skills or requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <section>
                  <h3 className="font-semibold text-base-content mb-3">Keyboard Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'F', action: 'Open filters' },
                      { key: 'Esc', action: 'Close modal/panel' },
                      { key: 'Ctrl + K', action: 'Search positions' },
                      { key: 'Ctrl + R', action: 'Reset all filters' },
                      { key: 'C', action: 'Toggle customize mode' },
                      { key: '1', action: 'Go to Dashboard' },
                      { key: '2', action: 'Go to Constellation' },
                    ].map((shortcut, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                        <span className="text-sm text-base-content/80">{shortcut.action}</span>
                        <kbd className="px-2 py-1 bg-base-300 rounded text-xs font-mono">{shortcut.key}</kbd>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Footer with navigation dots */}
        <div className="p-4 border-t border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  activeTab === tab.id ? 'bg-primary' : 'bg-base-300 hover:bg-base-400'
                }`}
                title={tab.label}
              />
            ))}
          </div>
          <button onClick={onClose} className="btn btn-primary">Got it</button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { id: 'clusters', label: 'Clusters', icon: BarChart3, to: '/clusters' },
    { id: 'constellation', label: 'Constellation', icon: Network, to: '/constellation' },
    { id: 'research-hub', label: 'Research Hub', icon: BookOpen, to: '/research-hub' },
    { id: 'ai-chat', label: 'AI Chat', icon: Bot, to: '/ai-chat' },
  ];

  return (
    <>
      <aside className="w-16 lg:w-56 bg-base-100 border-r border-base-300 flex flex-col h-full shrink-0 z-50">
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
            const isActive = location.pathname === item.to;
            
            return (
              <Link
                key={item.id}
                to={item.to}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-content'
                    : 'text-base-content/70 hover:bg-base-200'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-base-300 space-y-1">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/70 hover:bg-base-200 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block">Settings</span>
          </button>
          <button 
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/70 hover:bg-base-200 transition-colors"
            title="Help"
          >
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block">Help</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
