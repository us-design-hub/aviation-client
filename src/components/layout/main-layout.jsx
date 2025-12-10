"use client"

import { Sidebar } from '@/components/navigation/sidebar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Footer } from '@/components/layout/footer';

export function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        {/* Top bar with notifications */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-end h-14 px-6">
            <NotificationBell />
          </div>
        </div>
        
        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
        
        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}
