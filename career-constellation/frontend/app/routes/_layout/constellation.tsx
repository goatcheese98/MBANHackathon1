import { createFileRoute } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import SolarSystemScene from '@/components/SolarSystemScene';
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
      className="h-full relative"
    >
      <SolarSystemScene data={data} />
    </motion.div>
  );
}
