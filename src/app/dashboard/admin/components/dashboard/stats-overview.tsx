import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useDashboardStats } from '@/app/hooks/useDashboardStats';
import { Building, Users, CalendarCheck, BarChart2 } from 'lucide-react';

export function StatsOverview() {
  const { stats, isLoading, error } = useDashboardStats();

  if (isLoading) return <div>Loading stats...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Departments</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.departmentCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Invigilators</CardTitle>
          <Users className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.invigilatorCount}</div>
          <div className="text-xs text-green-500">Available for assignments</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
          <CalendarCheck className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.upcomingExams}</div>
          <div className="text-xs text-blue-500">Next 7 days</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Room Utilization</CardTitle>
          <BarChart2 className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.roomUtilization}%</div>
          <div className="text-xs text-orange-500">Current scheduling period</div>
        </CardContent>
      </Card>
    </div>
  );
}