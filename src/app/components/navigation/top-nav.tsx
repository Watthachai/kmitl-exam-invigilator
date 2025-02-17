"use client";

import { useState, useEffect } from 'react';
import { 
  Bell, 
  ChevronDown, 
  Menu, 
  BellRing,
  UserCog, 
  LogOut,
  User,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { initSocket } from '@/lib/socket';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/app/components/ui/avatar";

// Add new interface for notifications
interface AppealNotification {
  id: string;
  type: 'CHANGE_DATE' | 'FIND_REPLACEMENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  read: boolean;
  schedule: {
    subjectGroup: {
      subject: {
        name: string;
      }
    }
  };
  adminResponse?: string;
}

interface TopNavProps {
  onMenuClickAction: () => Promise<void>;
}

export const TopNav = ({ onMenuClickAction }: TopNavProps) => {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Add new states
  const [notifications, setNotifications] = useState<AppealNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/appeals/my-appeals', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch appeals');
      }
      
      const data = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: AppealNotification) => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/appeals/${id}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark appeal as read:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Initialize socket connection
    const socketInstance = initSocket();
    setSocket(socketInstance);

    // Join user's room
    if (session?.user?.id && socketInstance) {
      socketInstance.emit('join', session.user.id);
    }

    // Listen for new notifications
    if (socketInstance) {
      socketInstance.on('newAppeal', async () => {
        await fetchNotifications();
      });

      socketInstance.on('appealUpdated', async () => {
        await fetchNotifications();
      });
    }

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-2">
      {/* Left side - Menu button */}
      <Button 
        onClick={async () => await onMenuClickAction()}
        variant="ghost" 
        size="icon"
        className="lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Right side - Profile dropdown and notifications */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Updated Notification Button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative hover:bg-gray-100 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Notification Panel */}
          <AnimatePresence>
            {showNotifications && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">การแจ้งเตือน</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        กำลังโหลด...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        ไม่มีการแจ้งเตือนใหม่
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer
                            ${notification.status === 'PENDING' ? 'bg-yellow-50' :
                              notification.status === 'APPROVED' ? 'bg-green-50' : 
                              notification.status === 'REJECTED' ? 'bg-red-50' : 'bg-white'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-medium">
                                {notification.type === 'CHANGE_DATE' ? 'ขอเปลี่ยนวันสอบ' : 'ขอหาผู้คุมสอบแทน'}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {notification.schedule.subjectGroup.subject.name}
                              </p>
                              {notification.adminResponse && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.adminResponse}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(notification.createdAt).toLocaleString('th-TH')}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              notification.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              notification.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {notification.status === 'PENDING' ? 'รอดำเนินการ' :
                              notification.status === 'APPROVED' ? 'อนุมัติ' : 'ไม่อนุมัติ'}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 bg-gray-50 border-t border-gray-100">
                      <button
                        onClick={() => {
                          // Mark all as read functionality
                          notifications.forEach(n => !n.read && markAsRead(n.id));
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        อ่านทั้งหมดแล้ว
                      </button>
                    </div>
                  )}
                </motion.div>

                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
              </>
            )}
          </AnimatePresence>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost"
              className="flex items-center gap-2 p-1"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">{session?.user?.name || 'User'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">สวัสดี!, {session?.user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center">
              <BellRing className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>การแจ้งเตือน</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center">
              <UserCog className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>โปรไฟล์และการตั้งค่า</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
              className="flex items-center text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};