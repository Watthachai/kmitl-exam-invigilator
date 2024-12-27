"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
      
    if (status === "loading") return; // Do nothing while loading session

    if (status === "unauthenticated") {
      router.replace("/login"); // Use replace to prevent navigation history clutter
    } else if (session?.user?.role === "admin") {
      router.replace("/dashboard/admin");
    } else if (session?.user?.role === "user") {
      router.replace("/dashboard/"); // Example of a user-specific dashboard
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return null; // Avoid rendering anything else after redirection
}
