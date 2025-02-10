import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export function useRoleChange(): void {
  const { data: session, update } = useSession();
  const router = useRouter();
  const prevRole = useRef(session?.user?.role);
  const toastShownRef = useRef(false);

  useEffect(() => {
    // Only run if we have a session and role has changed
    if (!session || !session.user) return;
    
    // Avoid showing toast multiple times for the same role change
    if (
      !toastShownRef.current && 
      (session.roleChanged || prevRole.current !== session.user.role)
    ) {
      toastShownRef.current = true;
      
      toast.success(
        (
          <div className="flex flex-col gap-2">
            <p>Your role has been updated to {session.user.role}</p>
            <button
              onClick={async () => {
                try {
                  await update();
                  router.refresh();
                  toast.dismiss();
                } catch (error) {
                  console.error('Failed to update session:', error);
                  toast.error('Failed to refresh. Please try again.');
                }
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh Now
            </button>
          </div>
        ) as ReactNode,
        {
          duration: 5000,
          position: 'top-center',
        }
      );

      prevRole.current = session.user.role;
    }

    if (session?.user?.role === 'admin') {
      router.replace('/dashboard/admin');
    } else if (session?.user?.role === 'user') {
      router.replace('/dashboard');
    }

    return () => {
      toastShownRef.current = false;
      toast.dismiss();
    };
  }, [session?.user?.role, session?.roleChanged, router, session, update]);
}