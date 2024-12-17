"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

import { Overview } from '@/app/components/dashboard/overview';
import { ActivityFeed } from '@/app/components/dashboard/activity-feed';
import { StatsOverview } from '@/app/components/dashboard/stats-overview';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      setIsLoading(false);
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-black">Admin</h2>
        <div className="text-black">Logged in as: {session?.user?.email}</div>

        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >Sign Out</button>
      </div>
      <StatsOverview />
      <div className="grid gap-6 md:grid-cols-2">
        <Overview />
        <ActivityFeed />
      </div>
    </div>
  );
}