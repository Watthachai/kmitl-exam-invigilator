"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

import { Overview } from '@/app/dashboard/admin/components/dashboard/overview';
import { ActivityFeed } from '@/app/dashboard/admin/components/dashboard/activity-feed';
import { StatsOverview } from '@/app/dashboard/admin/components/dashboard/stats-overview';

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("Session status:", status);
    console.log("Session data:", session);
    if (status === "loading") return; // Avoid redirecting while session status is loading

    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    } else {
      setIsLoading(false); // Loading is complete when authenticated with admin role
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-black">Admin</h2>
        <div className="text-black">Logged in as: {session?.user?.email}</div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Sign Out
        </button>
      </div>
      <StatsOverview />
      <div className="grid gap-6 md:grid-cols-2">
        <Overview />
        <ActivityFeed />
      </div>
    </div>
  );
}
