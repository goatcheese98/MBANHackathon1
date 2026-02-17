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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading Talent Data...</h2>
          <p className="text-gray-500 mt-2">Processing position descriptions</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-red-200 rounded-2xl p-8 max-w-md text-center shadow-lg"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className="h-screen bg-gray-50 overflow-hidden">
      {/* View Switcher */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white border border-gray-200 rounded-xl p-1.5 flex items-center gap-1 shadow-lg">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${viewMode === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <Globe className="w-4 h-4" />
            Constellation
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
              className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
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
