import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function useRoleChange(): void {
  const { data: session, update } = useSession();
  const router = useRouter();
  const prevRole = useRef<string | undefined>(undefined);
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!session?.user) {
      prevRole.current = undefined;
      return;
    }

    const currentRole = session.user.role;

    // Initialize prevRole if it hasn't been set yet
    if (prevRole.current === undefined) {
      prevRole.current = currentRole;
      return;
    }

    // Check for actual role change
    if (currentRole !== prevRole.current && !toastShownRef.current) {
      toastShownRef.current = true;
      
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p>Your role has been updated to {currentRole}</p>
          <button
            onClick={() => {
              update();
              router.refresh();
              toast.dismiss(t.id);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh Now
          </button>
        </div>
      ), {
        duration: 5000,
        position: 'top-center',
      });

      // Update role and redirect
      if (currentRole === 'admin') {
        router.replace('/dashboard/admin');
      } else if (currentRole === 'user') {
        router.replace('/dashboard');
      }
    }

    prevRole.current = currentRole;

    return () => {
      toastShownRef.current = false;
    };
  }, [session, router, update]);
}