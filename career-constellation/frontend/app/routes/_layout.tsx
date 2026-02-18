import { createFileRoute, Outlet } from '@tanstack/react-router'
import Sidebar from '@/components/ui/Sidebar';

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <div className="h-screen flex bg-base-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 relative">
        <Outlet />
      </main>
    </div>
  );
}
