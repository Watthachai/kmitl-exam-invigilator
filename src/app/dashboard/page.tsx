"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building, GraduationCap } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/login");
    },
  });
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "admin") {
        router.replace("/dashboard/admin");
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="space-y-6 text-center">
          <div className="relative animate-pulse">
            <Building className="h-16 w-16 text-[#FF4E00]" />
            <GraduationCap className="h-8 w-8 text-[#FF4E00] absolute -top-2 -right-2" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800">
              กำลังโหลด...
            </h2>
            <p className="text-sm text-gray-500">
              คณะวิศวกรรมศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-[#FF4E00] rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-[#FF4E00] rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-3 h-3 bg-[#FF4E00] rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    );
  }

  // Render regular user dashboard here
  return null;
}