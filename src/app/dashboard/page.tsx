"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
       return // Do nothing while loading
    }

    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role === "admin") {
      router.push("/dashboard/admin");
    } else if (session?.user?.role === "user") {
      router.push("/dashboard/user");
    } else {
        throw new Error('Failed to fetch');
    }
  }, [session, status, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Loading...</p>
    </div>
  );
}