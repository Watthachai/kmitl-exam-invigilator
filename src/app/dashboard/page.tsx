"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export default function Dashboard() {
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
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-3xl font-bold mb-4">ยินดีต้อนรับสู่ Dashboard</h1>
            <div className="bg-gray-100 p-4 rounded-lg shadow-md text-center">
                <p className="text-lg mb-2">
                    สวัสดี, <strong>{session?.user?.name || "ผู้ใช้"}</strong>!
                </p>
                <p className="text-gray-700">
                    อีเมล: {session?.user?.email || "ไม่มีอีเมล"}
                </p>
            </div>
            <button
                onClick={() => signOut()}
                className="mt-6 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
                ออกจากระบบ
            </button>
        </div>
    );

}