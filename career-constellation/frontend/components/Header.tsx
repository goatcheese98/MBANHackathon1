'use client';

import { motion } from 'framer-motion';
import { Sparkles, Info, Github, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  totalJobs: number;
  numClusters: number;
  onSearch?: (query: string) => void;
  onFilterChange?: (filter: string) => void;
}

export default function Header({ totalJobs, numClusters, onSearch, onFilterChange }: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        className="fixed top-0 left-0 right-0 z-30 px-6 py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cosmic-blue to-cosmic-purple flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-cosmic-blue to-cosmic-purple rounded-xl blur-lg opacity-50 animate-pulse-slow" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white glow-text">
                  Career Constellation
                </h1>
                <p className="text-xs text-white/50">AI-Powered Job Family Navigator</p>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 ml-8">
              <div className="glass px-4 py-2 rounded-lg">
                <span className="text-xs text-white/40 uppercase tracking-wider">Jobs</span>
                <span className="ml-2 text-lg font-bold text-cosmic-cyan">{totalJobs.toLocaleString()}</span>
              </div>
              <div className="glass px-4 py-2 rounded-lg">
                <span className="text-xs text-white/40 uppercase tracking-wider">Clusters</span>
                <span className="ml-2 text-lg font-bold text-cosmic-pink">{numClusters}</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-64 pl-10 pr-4 py-2 glass rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cosmic-blue/50"
              />
            </div>

            {/* Info Button */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showInfo ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/60'
              )}
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
          className="fixed top-20 right-6 w-80 glass rounded-xl p-6 z-30"
        >
          <h3 className="text-lg font-bold text-white mb-3">About This Visualization</h3>
          <p className="text-sm text-white/60 leading-relaxed mb-4">
            This AI-powered tool uses natural language processing to cluster job descriptions 
            into related families. Each star represents a job, and constellations show 
            similar roles that could be standardized.
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-white/70">
              <div className="w-3 h-3 rounded-full bg-cosmic-blue" />
              <span>Click a star to view job details</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <div className="w-3 h-3 rounded-full bg-cosmic-pink" />
              <span>Drag to rotate the galaxy</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <div className="w-3 h-3 rounded-full bg-cosmic-yellow" />
              <span>Scroll to zoom in/out</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40">
              Built with Sentence-BERT embeddings, HDBSCAN clustering, and React Three Fiber.
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
}
