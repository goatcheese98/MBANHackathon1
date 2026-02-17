import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/ui/Sidebar';
import DashboardView from '@/components/DashboardView';
import GalaxyScene from '@/components/GalaxyScene';
import JobDetailsPanel from '@/components/JobDetailsPanel';
import { fetchConstellationData } from '@/lib/api';
import { ConstellationData, JobPoint } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const [data, setData] = useState<ConstellationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'dashboard' | '3d'>('dashboard');
  const [selectedJob, setSelectedJob] = useState<JobPoint | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleJobSelect = useCallback((job: JobPoint | null) => {
    setSelectedJob(job);
  }, []);

  const handleClusterSelect = useCallback((clusterId: number | null) => {
    setSelectedCluster(clusterId);
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary mb-4 block mx-auto"></span>
          <h2 className="text-lg font-medium text-base-content">Loading positions...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card bg-base-100 border border-error shadow-lg max-w-md text-center">
          <div className="card-body">
            <AlertCircle className="w-10 h-10 text-error mx-auto mb-4" />
            <h2 className="card-title justify-center text-base-content">Connection Error</h2>
            <p className="text-base-content/60 mb-6">{error}</p>
            <button
              onClick={loadData}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-screen flex bg-base-200 overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentView={viewMode} onViewChange={setViewMode} />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
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
              />
              
              {/* Job Details Panel */}
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
          ) : (
            <motion.div
              key="3d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full relative"
            >
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
      </main>
    </div>
  );
}
