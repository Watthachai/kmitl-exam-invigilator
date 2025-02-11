// src/app/dashboard/admin/components/active-users.tsx
'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ActiveUser {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
  expires: Date;
}

export function ActiveUsers() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setActiveUsers(data.activeSessions);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      toast.error('Failed to fetch active users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogout = async (sessionId: string, userId: string) => {
    try {
      setIsProcessing(sessionId);
      const response = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          userId 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to logout user');
      }

      toast.success('User logged out successfully');
      fetchActiveSessions(); // Refresh the list
    } catch (error) {
      console.error('Error forcing logout:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to logout user');
    } finally {
      setIsProcessing(null);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <div>Loading active users...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Active Users ({activeUsers.length})</h2>
      <div className="space-y-4">
        {activeUsers.map((session) => (
          <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">{session.user.name || 'Unknown'}</p>
              <p className="text-sm text-gray-600">{session.user.email}</p>
              <p className="text-xs text-gray-500">
                Expires: {new Date(session.expires).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => handleForceLogout(session.id, session.user.id)}
              disabled={isProcessing === session.id}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            >
              {isProcessing === session.id ? 'Processing...' : 'Force Logout'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}