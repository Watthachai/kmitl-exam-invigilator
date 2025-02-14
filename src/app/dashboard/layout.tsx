"use client";

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react"; // Remove SessionProvider import
import { Toaster } from 'react-hot-toast';
import { SideNav } from '@/app/components/navigation/side-nav';
import { TopNav } from '@/app/components/navigation/top-nav';
import { NetworkError } from '@/components/network-error';
import { Suspense } from 'react';
import Loading from '@/app/loading';
import { useRouter, usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOffline, setIsOffline] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/dashboard/admin");

  useEffect(() => {
    setIsMounted(true);
    setIsOffline(!navigator.onLine);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      if (isAdminRoute && session?.user?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
    }
  }, [status, session, router, pathname, isAdminRoute]);

  const handleMenuClickAction = async () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Prevent hydration mismatch
  if (!isMounted || status === "loading") {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SideNav 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      
      <main className={`
        transition-[margin] duration-200 ease-in-out
        lg:ml-64 
        ${isMobileMenuOpen ? 'ml-64' : 'ml-0'}
      `}>
        <TopNav onMenuClickAction={handleMenuClickAction} />
        <Suspense fallback={<Loading />}>
          {children}
        </Suspense>
      </main>

      {/* Overlay and Toaster */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <Toaster position="top-right" />
      
      {/* Network Error */}
      {isOffline && <NetworkError />}
    </div>
  );
}