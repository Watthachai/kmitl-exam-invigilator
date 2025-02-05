import { useState, useEffect } from 'react';

export interface Activity {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'LOGIN';
  description: string;
  user: { name: string; email: string; } | null;
  timestamp: string;
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch('/api/activities');
        if (!response.ok) throw new Error('Failed to fetch activities');
        const { data } = await response.json(); // Extract data property
        setActivities(data || []); // Ensure we always set an array
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchActivities();
    const interval = setInterval(fetchActivities, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return { activities, isLoading, error };
}