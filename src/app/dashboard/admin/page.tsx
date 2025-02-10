"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

import { Overview } from '@/app/dashboard/admin/components/dashboard/overview';
import { ActivityFeed } from '@/app/dashboard/admin/components/dashboard/activity-feed';
import { StatsOverview } from '@/app/dashboard/admin/components/dashboard/stats-overview';
import { QuickActions } from '@/app/dashboard/admin/components/dashboard/quick-actions';
import { ActiveUsers } from '@/app/dashboard/admin/components/active-users';

const handleSignOut = () => {
  signOut({ 
    callbackUrl: '/',
    redirect: true 
  });
};

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    } else {
      setIsLoading(false);
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            ระบบจัดการการคุมสอบ
          </h1>
          <p className="text-gray-500 text-sm">
            คณะวิศวกรรมศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-black text-sm">
            ผู้ใช้: {session?.user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      <StatsOverview />
      
      <QuickActions />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Overview />
        <ActivityFeed />
        <ActiveUsers />
      </div>

      <footer className="text-center text-gray-500 text-sm mt-8">
        © 2024 ระบบจัดการการคุมสอบ KMITL
      </footer>
    </div>
  );
}
