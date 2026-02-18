import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion';
import DashboardView from '@/components/DashboardView';
import JobDetailsPanel from '@/components/JobDetailsPanel';
import { fetchConstellationData } from '@/lib/api';
import { useState } from 'react';

export const Route = createFileRoute('/_layout/dashboard')({
  component: DashboardComponent,
  loader: async () => {
    const data = await fetchConstellationData();
    return { data };
  },
});

function DashboardComponent() {
  const { data } = Route.useLoaderData();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <motion.div
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
        onClusterSelect={setSelectedCluster}
        onJobSelect={setSelectedJob}
      />
      
      {selectedJob && (
        <JobDetailsPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onJobSelect={setSelectedJob}
        />
      )}
    </motion.div>
  );
}
