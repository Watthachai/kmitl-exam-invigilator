import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { FileSpreadsheet, Building, Users, Calendar, Settings, Database } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Database as DatabaseIcon } from 'lucide-react';

export const QuickActions = () => {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      const response = await fetch('/api/seed', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('อัพเดทข้อมูลสำเร็จ');
        console.log('Seed stats:', data.stats);
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    } finally {
      setIsSeeding(false);
    }
  };

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
    <div className="grid gap-4">
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
      
      <button
        onClick={handleSeedData}
        disabled={isSeeding}
        className="flex items-center justify-center gap-2 p-4 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors"
      >
        {isSeeding ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
            กำลังอัพเดทข้อมูล...
          </>
        ) : (
          <>
            <DatabaseIcon className="w-5 h-5 text-yellow-600" />
            อัพเดทโควต้าและสถานะตารางสอบ
          </>
        )}
      </button>
    </div>
  );
};