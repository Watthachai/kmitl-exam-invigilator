// app/dashboard/components/dashboard/activity-feed.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useActivities } from "@/app/hooks/useActivities";
import { getActivityIcon } from "@/app/utils/activity-icons";
import { formatDistanceToNow, parseISO } from 'date-fns';


export function ActivityFeed() {
  const { activities, isLoading, error } = useActivities();

  // Format date safely
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch {
      console.error('Invalid date:', dateString);
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              <div className="rounded-full p-2 bg-gray-50">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{activity.description}</p>
                <div className="flex items-center text-xs text-gray-500 gap-2">
                  <span>{formatDate(activity.createdAt)}</span>
                  <span>•</span>
                  <span>by {activity.user?.name || 'System'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}