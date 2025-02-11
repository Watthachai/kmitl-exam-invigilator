'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/app/components/ui/button";
import { Icons } from "@/app/components/ui/icons";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [previousSession, setPreviousSession] = useState<string | null>(null);
  const router = useRouter();
  const { status, data: session } = useSession();

  useEffect(() => {
    // Check for existing session token
    const sessionToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('next-auth.session-token'));
    
    if (sessionToken) {
      setPreviousSession(sessionToken);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      const redirectTimeout = setTimeout(() => {
        router.push('/dashboard');
      }, 2000); // Delay redirect for 2 seconds to show welcome message

      return () => clearTimeout(redirectTimeout);
    }
  }, [status, router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn('google');
    } catch {
      console.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'authenticated' && session?.user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none" />
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 z-10">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative w-20 h-20 rounded-full overflow-hidden">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                  <Icons.user className="h-10 w-10 text-blue-500" />
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-gray-800">
                ยินดีต้อนรับกลับ
              </h2>
              <p className="text-gray-600">{session.user.name}</p>
            </div>
            <div className="flex items-center justify-center">
              <Icons.spinner className="animate-spin h-5 w-5 mr-2" />
              <span className="text-sm text-gray-500">กำลังนำคุณไปยังแดชบอร์ด...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none" />
      <div className="max-w-md w-full mx-4 relative z-10">
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative w-24 h-24">
              <Image
                src="/kmitl-fight-logo.png"
                alt="KMITL Logo"
                fill
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                ระบบคุมสอบ KMITL
              </h1>
              <p className="text-gray-600">
                สำหรับอาจารย์และเจ้าหน้าที่คุมสอบ
              </p>
            </div>

            <div className="w-full space-y-4">
              {previousSession && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => signIn('google')}
                  className="w-full py-6 text-lg font-medium rounded-xl transition-all duration-300 
                  hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-blue-50 border-2 border-blue-200
                  hover:border-blue-300 flex items-center justify-center gap-3"
                >
                  <Icons.refresh className="h-5 w-5" />
                  <span>ดำเนินการต่อด้วยบัญชีที่เคยใช้</span>
                </Button>
              )}

              <Button
                variant="google"
                size="lg"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-6 text-lg font-medium rounded-xl transition-all duration-300 
                hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-white border-2 border-gray-200
                hover:border-gray-300 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <Icons.spinner className="animate-spin h-5 w-5" />
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : (
                  <>
                    <Icons.google className="h-6 w-6" />
                    <span>เข้าสู่ระบบด้วย Google</span>
                  </>
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p className="flex items-center gap-2 justify-center">
                <Icons.info className="h-4 w-4" />
                ใช้ได้เฉพาะอีเมล @kmitl.ac.th เท่านั้น
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}