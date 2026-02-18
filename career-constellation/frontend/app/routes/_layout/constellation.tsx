import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion';
import GalaxyScene from '@/components/GalaxyScene';
import JobDetailsPanel from '@/components/JobDetailsPanel';
import { fetchConstellationData } from '@/lib/api';
import { useState } from 'react';

export const Route = createFileRoute('/_layout/constellation')({
  component: ConstellationComponent,
  loader: async () => {
    const data = await fetchConstellationData();
    return { data };
  },
});

function ConstellationComponent() {
  const { data } = Route.useLoaderData();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  return (
    <motion.div
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
        onJobSelect={setSelectedJob}
        onJobHover={() => {}}
        onClusterSelect={setSelectedCluster}
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
