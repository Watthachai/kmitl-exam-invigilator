import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useDashboardStats } from '@/app/hooks/useDashboardStats';
import { Building, Users, CalendarCheck, BarChart2 } from 'lucide-react';

export function StatsOverview() {
  const { stats, isLoading, error } = useDashboardStats();

  if (isLoading) return (
    <div className="flex justify-center items-center p-8 text-blue-600">
      <div className="animate-spin mr-2 h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      <span className="text-lg">กำลังโหลดข้อมูล...</span>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
      <div className="flex items-center">
        <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-700">เกิดข้อผิดพลาด: {error}</p>
      </div>
    </div>
  );
  
  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="overflow-hidden border-t-4 border-t-blue-500 hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-blue-50 to-white">
          <CardTitle className="text-sm font-medium text-blue-700">ภาควิชา</CardTitle>
          <div className="p-2 rounded-full bg-blue-100">
            <Building className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700">{stats.departmentCount}</div>
          <div className="text-xs text-gray-500">ภาควิชาทั้งหมดในคณะ</div>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden border-t-4 border-t-green-500 hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-green-50 to-white">
          <CardTitle className="text-sm font-medium text-green-700">ผู้คุมสอบ</CardTitle>
          <div className="p-2 rounded-full bg-green-100">
            <Users className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">{stats.invigilatorCount}</div>
          <div className="text-xs text-green-500">พร้อมสำหรับการจัดการ</div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-t-4 border-t-purple-500 hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-purple-50 to-white">
          <CardTitle className="text-sm font-medium text-purple-700">การสอบที่จะมาถึง</CardTitle>
          <div className="p-2 rounded-full bg-purple-100">
            <CalendarCheck className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700">{stats.upcomingExams}</div>
          <div className="text-xs text-purple-500">ภายใน 7 วันข้างหน้า</div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-t-4 border-t-orange-500 hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-orange-50 to-white">
          <CardTitle className="text-sm font-medium text-orange-700">การใช้งานห้องสอบ</CardTitle>
          <div className="p-2 rounded-full bg-orange-100">
            <BarChart2 className="h-4 w-4 text-orange-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-700">{stats.roomUtilization}%</div>
          <div className="text-xs text-orange-500">ช่วงการจัดสอบปัจจุบัน</div>
        </CardContent>
      </Card>
    </div>
  );
}