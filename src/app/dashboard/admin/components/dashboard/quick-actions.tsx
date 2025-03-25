import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { FileSpreadsheet, Building, Users, Calendar, Settings, Database } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

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
      title: 'นำเข้าตารางสอบ',
      icon: <FileSpreadsheet className="h-8 w-8 text-blue-500" />,
      href: '/dashboard/admin/tables',
      description: 'นำเข้าข้อมูลตารางสอบจากไฟล์',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      borderColor: 'border-blue-300'
    },
    {
      title: 'จัดการห้องสอบ',
      icon: <Building className="h-8 w-8 text-green-500" />,
      href: '/dashboard/admin/rooms',
      description: 'กำหนดและจัดการห้องสอบ',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      borderColor: 'border-green-300'
    },
    {
      title: 'ผู้คุมสอบ',
      icon: <Users className="h-8 w-8 text-purple-500" />,
      href: '/dashboard/admin/invigilators',
      description: 'จัดการอาจารย์และเจ้าหน้าที่',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      borderColor: 'border-purple-300'
    },
    {
      title: 'ตารางการสอบ',
      icon: <Calendar className="h-8 w-8 text-orange-500" />,
      href: '/dashboard/admin/schedule',
      description: 'ดูตารางการจัดสอบทั้งหมด',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      borderColor: 'border-orange-300'
    },
    {
      title: 'ตั้งค่าระบบ',
      icon: <Settings className="h-8 w-8 text-gray-500" />,
      href: '/dashboard/admin/settings',
      description: 'ปรับแต่งการทำงานของระบบ',
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100',
      borderColor: 'border-gray-300'
    },
    {
      title: 'ฐานข้อมูล',
      icon: <Database className="h-8 w-8 text-red-500" />,
      href: '/dashboard/admin/database',
      description: 'จัดการข้อมูลในระบบ',
      bgColor: 'bg-red-50',
      hoverColor: 'hover:bg-red-100',
      borderColor: 'border-red-300'
    }
  ];

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-bold text-gray-800 mb-2">คำสั่งด่วน</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action) => (
          <Link key={action.title} href={action.href} className="block">
            <Card className={`${action.bgColor} border ${action.borderColor} ${action.hoverColor} transition-all duration-200 cursor-pointer h-full shadow-sm hover:shadow-md`}>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 rounded-full bg-white shadow-inner">
                    {action.icon}
                  </div>
                  <p className="text-xs text-gray-600 text-center">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      <button
        onClick={handleSeedData}
        disabled={isSeeding}
        className="flex items-center justify-center gap-2 p-4 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors shadow-sm hover:shadow-md mt-2"
      >
        {isSeeding ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
            <span className="text-yellow-800 font-medium">กำลังอัพเดทข้อมูล...</span>
          </>
        ) : (
          <>
            <Database className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800 font-medium">อัพเดทโควต้าและสถานะตารางสอบ</span>
          </>
        )}
      </button>
      
      <div className="text-xs text-gray-500 text-center mt-1">
        กดปุ่มนี้เพื่ออัพเดทโควต้าของผู้คุมสอบและสถานะของตารางสอบในระบบให้เป็นปัจจุบัน
      </div>
    </div>
  );
};