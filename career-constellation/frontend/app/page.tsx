'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardView from '@/components/DashboardView';
import GalaxyScene from '@/components/GalaxyScene';
import JobDetailsPanel from '@/components/JobDetailsPanel';
import { fetchConstellationData } from '@/lib/api';
import { ConstellationData, JobPoint } from '@/types';
import { LayoutGrid, Globe, Loader2, AlertCircle } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<ConstellationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'dashboard' | '3d'>('dashboard');
  const [selectedJob, setSelectedJob] = useState<JobPoint | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const constellationData = await fetchConstellationData();
      setData(constellationData);
    } catch (err) {
      setError('Failed to load data. Please ensure the backend is running on port 8000.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle job selection
  const handleJobSelect = useCallback((job: JobPoint | null) => {
    setSelectedJob(job);
  }, []);

  // Handle cluster selection
  const handleClusterSelect = useCallback((clusterId: number | null) => {
    setSelectedCluster(clusterId);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Loading Job Data...</h2>
          <p className="text-gray-400 mt-2">Processing 600 job descriptions</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md text-center"
        >
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className="h-screen bg-gray-950 overflow-hidden">
      {/* View Switcher */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-1.5 flex items-center gap-1 shadow-xl">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${viewMode === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }
            `}
          >
            <LayoutGrid className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${viewMode === '3d'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }
            `}
          >
            <Globe className="w-4 h-4" />
            3D Galaxy
          </button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <DashboardView
              jobs={data.jobs}
              clusters={data.clusters}
              selectedCluster={selectedCluster}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClusterSelect={handleClusterSelect}
              onJobSelect={handleJobSelect}
              onSwitchTo3D={() => setViewMode('3d')}
            />
          </motion.div>
        ) : (
          <motion.div
            key="3d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full relative"
          >
            {/* 3D Back Button */}
            <button
              onClick={() => setViewMode('dashboard')}
              className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              Back to Dashboard
            </button>

            <GalaxyScene
              jobs={data.jobs}
              clusters={data.clusters}
              selectedJob={selectedJob}
              hoveredJob={null}
              selectedCluster={selectedCluster}
              onJobSelect={handleJobSelect}
              onJobHover={() => {}}
              onClusterSelect={handleClusterSelect}
            />

            {/* Job Details Panel for 3D view */}
            <AnimatePresence>
              {selectedJob && (
                <JobDetailsPanel
                  job={selectedJob}
                  onClose={() => handleJobSelect(null)}
                  onJobSelect={handleJobSelect}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Details Panel for Dashboard view */}
      <AnimatePresence>
        {viewMode === 'dashboard' && selectedJob && (
          <JobDetailsPanel
            job={selectedJob}
            onClose={() => handleJobSelect(null)}
            onJobSelect={handleJobSelect}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
