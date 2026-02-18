import { createFileRoute, Outlet } from '@tanstack/react-router'
import Sidebar from '@/components/ui/Sidebar';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
});

function LayoutComponent() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark') || 
                        document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDark(isDarkMode);
    };
    
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme'] 
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`h-screen flex bg-base-200 overflow-hidden ${isDark ? 'dark' : ''}`}>
      <Sidebar />
      <main className="flex-1 min-w-0 relative">
        <Outlet />
      </main>
    </div>
  );
}
