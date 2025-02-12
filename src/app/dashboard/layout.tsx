"use client";

import { useState, useEffect } from 'react';
import { SessionProvider } from "next-auth/react";
import { Toaster } from 'react-hot-toast';
import { SideNav } from '@/app/components/navigation/side-nav';
import { TopNav } from '@/app/components/navigation/top-nav';
import { NetworkError } from '@/components/network-error';
import { useRoleChange } from '@/app/hooks/useRoleChange';
import { Suspense } from 'react';
import Loading from '@/app/loading';

function RoleChangeDetector() {
  useRoleChange();
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOffline, setIsOffline] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <SessionProvider>
      <RoleChangeDetector />
      <Toaster />
      {isOffline && <NetworkError />}
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