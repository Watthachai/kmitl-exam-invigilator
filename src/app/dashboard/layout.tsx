"use client";

import { SessionProvider } from "next-auth/react";
import { SideNav } from '@/app/components/navigation/side-nav';
import { TopNav } from '@/app/components/navigation/top-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-100">
        {/* Left Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white">
          <div className="p-4">
            <h1 className="text-xl font-bold">KMITL Invigilator</h1>
          </div>
          <SideNav />
        </aside>

        {/* Main Content */}
        <div className="ml-64 flex flex-col min-h-screen">
          {/* Top Navigation */}
          <header className="bg-white border-b">
            <div className="px-4 py-3">
              <TopNav />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}