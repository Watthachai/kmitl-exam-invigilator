// app/dashboard/components/dashboard/activity-feed.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';

const activities = [
  {
    user: 'Howell Hand',
    amount: 375.53,
    date: '3 days ago',
    type: 'Deposit',
    account: 'Home Loan Account',
    progress: 70,
  },
  {
    user: 'Hope Howe',
    amount: 470.26,
    date: '3 days ago',
    type: 'Payment',
    account: 'Savings Account',
    progress: 68,
  },
  // Add more activities as needed
];

export const ActivityFeed = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.map((activity, i) => (
            <div key={i} className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{activity.user[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.user}</p>
                  <span className="text-sm text-gray-500">{activity.date}</span>
                </div>
                <p className="text-sm text-gray-500">
                  ${activity.amount} - {activity.type} - {activity.account}
                </p>
              </div>
              <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                {activity.progress}%
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };