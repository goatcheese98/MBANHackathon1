import { createFileRoute } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { fetchConstellationData } from '@/lib/api';

export const Route = createFileRoute('/_layout/constellation')({
  component: ConstellationComponent,
  loader: async () => {
    const data = await fetchConstellationData();
    return { data };
  },
});

function ConstellationComponent() {
  const { data } = Route.useLoaderData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full relative flex items-center justify-center bg-base-200"
    >
      <div className="text-center text-base-content/50 space-y-3">
        <p className="text-2xl font-bold">🌌 Constellation View</p>
        <p className="text-sm">Coming soon — interactive 2D cluster map</p>
        <p className="text-xs opacity-60">{data?.total_jobs} positions · {data?.num_clusters} clusters</p>
      </div>
    </motion.div>
  );
}
