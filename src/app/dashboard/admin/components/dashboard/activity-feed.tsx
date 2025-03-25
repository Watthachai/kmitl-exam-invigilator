import { Card, CardTitle } from '@/app/components/ui/card';
import { useActivities } from '@/app/hooks/useActivities';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { 
  FiCheck, 
  FiAlertTriangle, 
  FiX, 
  FiLogIn, 
  FiUserPlus,
  FiEdit,
  FiTrash2,
  FiInfo
} from 'react-icons/fi';

// เพิ่ม interface สำหรับ activity type
interface ActivityIconProps {
  type: string;
  className?: string;
}

// Component สำหรับแสดงไอคอนตามประเภทกิจกรรม
const ActivityIcon = ({ type, className = "w-5 h-5" }: ActivityIconProps) => {
  switch (type.toLowerCase()) {
    case 'success':
      return <FiCheck className={`${className} text-green-500`} />;
    case 'warning':
      return <FiAlertTriangle className={`${className} text-yellow-500`} />;
    case 'error':
      return <FiX className={`${className} text-red-500`} />;
    case 'login':
      return <FiLogIn className={`${className} text-blue-500`} />;
    case 'create':
      return <FiUserPlus className={`${className} text-purple-500`} />;
    case 'update':
      return <FiEdit className={`${className} text-orange-500`} />;
    case 'delete':
      return <FiTrash2 className={`${className} text-red-500`} />;
    default:
      return <FiInfo className={`${className} text-gray-500`} />;
  }
};

// ฟังก์ชันสำหรับกำหนดประเภทกิจกรรม
const getActivityType = (description: string): string => {
  const desc = description.toLowerCase();
  if (desc.includes('เข้าสู่ระบบ')) return 'login';
  if (desc.includes('สร้าง') || desc.includes('เพิ่ม')) return 'create';
  if (desc.includes('แก้ไข') || desc.includes('อัปเดต')) return 'update';
  if (desc.includes('ลบ')) return 'delete';
  if (desc.includes('ผิดพลาด') || desc.includes('error')) return 'error';
  if (desc.includes('เตือน') || desc.includes('warning')) return 'warning';
  if (desc.includes('สำเร็จ') || desc.includes('success')) return 'success';
  return 'info';
};

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

  return (
    <Card>
      <div className="p-6">
        <CardTitle>Recent Activities</CardTitle>
        
        <div className="mt-6 space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
          {isLoading ? (
            <p className="text-gray-500">กำลังโหลด...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : activities?.length === 0 ? (
            <p className="text-gray-500">ไม่มีกิจกรรมล่าสุด</p>
          ) : (
            activities?.map((activity) => {
              const activityType = getActivityType(activity.description);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    <ActivityIcon type={activityType} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(activity.createdAt.toString())}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}