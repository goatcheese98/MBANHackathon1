import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Check for saved default view preference
    const savedView = typeof window !== 'undefined' 
      ? localStorage.getItem('defaultView') as 'dashboard' | 'constellation' | null
      : null;
    
    const targetPath = savedView === 'constellation' ? '/constellation' : '/dashboard';
    throw redirect({ to: targetPath as '/dashboard' | '/constellation' });
  },
});
