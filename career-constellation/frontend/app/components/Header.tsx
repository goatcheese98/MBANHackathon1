import { motion } from 'framer-motion';
import { Sparkles, Info, Search, Moon, Sun, Palette } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  totalJobs: number;
  numClusters: number;
  onSearch?: (query: string) => void;
  onFilterChange?: (filter: string) => void;
}

const themes = [
  { name: 'light', icon: Sun, label: 'Light' },
  { name: 'dark', icon: Moon, label: 'Dark' },
  { name: 'cupcake', icon: Palette, label: 'Cupcake' },
  { name: 'synthwave', icon: Palette, label: 'Synthwave' },
];

export default function Header({ totalJobs, numClusters, onSearch, onFilterChange }: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed top-0 left-0 right-0 z-30 px-6 py-4 bg-base-100/80 backdrop-blur border-b border-base-300"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-content" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-primary to-secondary rounded-xl blur-lg opacity-30 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-base-content">
                  Career Constellation
                </h1>
                <p className="text-xs text-base-content/50">AI-Powered Job Family Navigator</p>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 ml-8">
              <div className="badge badge-lg gap-2 p-3">
                <span className="text-xs text-base-content/60 uppercase">Jobs</span>
                <span className="text-lg font-bold text-info">{totalJobs.toLocaleString()}</span>
              </div>
              <div className="badge badge-lg gap-2 p-3">
                <span className="text-xs text-base-content/60 uppercase">Clusters</span>
                <span className="text-lg font-bold text-secondary">{numClusters}</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={handleSearch}
                className="input input-sm input-bordered w-64 pl-10"
              />
            </div>

            {/* Theme Selector */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-sm btn-ghost gap-2">
                {currentTheme === 'light' && <Sun className="w-4 h-4" />}
                {currentTheme === 'dark' && <Moon className="w-4 h-4" />}
                {(currentTheme === 'cupcake' || currentTheme === 'synthwave') && <Palette className="w-4 h-4" />}
                <span className="capitalize hidden sm:inline">{currentTheme}</span>
              </label>
              <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-40 mt-4 border border-base-300">
                {themes.map((theme) => (
                  <li key={theme.name}>
                    <button
                      onClick={() => handleThemeChange(theme.name)}
                      className={`flex items-center gap-2 ${currentTheme === theme.name ? 'active' : ''}`}
                    >
                      <theme.icon className="w-4 h-4" />
                      <span>{theme.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Info Button */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`btn btn-sm btn-square ${showInfo ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Info Panel */}
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed top-20 right-6 w-80 card bg-base-100 border border-base-300 shadow-xl p-6 z-30"
        >
          <h3 className="text-lg font-bold text-base-content mb-3">About This Visualization</h3>
          <p className="text-sm text-base-content/60 leading-relaxed mb-4">
            This AI-powered tool uses natural language processing to cluster job descriptions 
            into related families. Each star represents a job, and constellations show 
            similar roles that could be standardized.
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-base-content/70">
              <div className="w-3 h-3 rounded-full bg-info" />
              <span>Click a star to view job details</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/70">
              <div className="w-3 h-3 rounded-full bg-secondary" />
              <span>Drag to rotate the galaxy</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/70">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Scroll to zoom in/out</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-base-300">
            <p className="text-xs text-base-content/40">
              Built with Sentence-BERT embeddings, HDBSCAN clustering, and React Three Fiber.
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
}
