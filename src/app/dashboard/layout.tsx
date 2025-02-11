"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from 'react-hot-toast';
import { SideNav } from '@/app/components/navigation/side-nav';
import { TopNav } from '@/app/components/navigation/top-nav';
import { useRoleChange } from '@/app/hooks/useRoleChange';
import { Suspense } from 'react';
import Loading from '@/app/loading';
import { useState } from 'react';

function RoleChangeDetector() {
  useRoleChange();
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <SessionProvider>
      <RoleChangeDetector />
      <Toaster />
      <div className="min-h-screen bg-gray-100">
        {/* Left Sidebar */}
        <SideNav 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Main Content */}
        <div className={`
          transition-[margin] duration-200 ease-in-out
          lg:ml-64 
          ${isMobileMenuOpen ? 'ml-64' : 'ml-0'}
        `}>
          {/* Top Navigation */}
          <header className="bg-white border-b">
            <div className="px-4 py-3">
              <TopNav onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
            </div>
          </header>

          <Suspense fallback={<Loading />}>
            {children}
          </Suspense>
        </div>

        {/* Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </SessionProvider>
  );
}