import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { FileSpreadsheet, Building, Users, Calendar, Settings, Database } from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      title: 'Import Schedule',
      icon: <FileSpreadsheet className="h-8 w-8 text-blue-500" />,
      href: '/dashboard/admin/tables',
      description: 'Import exam schedules'
    },
    {
      title: 'Manage Rooms',
      icon: <Building className="h-8 w-8 text-green-500" />,
      href: '/dashboard/admin/rooms',
      description: 'Configure exam rooms'
    },
    {
      title: 'Invigilators',
      icon: <Users className="h-8 w-8 text-purple-500" />,
      href: '/dashboard/admin/invigilators',
      description: 'Manage staff'
    },
    {
      title: 'View Schedule',
      icon: <Calendar className="h-8 w-8 text-orange-500" />,
      href: '/dashboard/admin/schedule',
      description: 'View exam timetable'
    },
    {
      title: 'System Settings',
      icon: <Settings className="h-8 w-8 text-gray-500" />,
      href: '/dashboard/admin/settings',
      description: 'Configure system'
    },
    {
      title: 'Database',
      icon: <Database className="h-8 w-8 text-red-500" />,
      href: '/dashboard/admin/database',
      description: 'Manage data'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {actions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer h-full">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-2">
                {action.icon}
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}