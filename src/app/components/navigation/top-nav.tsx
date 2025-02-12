"use client";

import { 
  Bell, 
  ChevronDown, 
  Menu, 
  BellRing, 
  UserCog, 
  LogOut,
  User 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
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

interface TopNavProps {
  onMenuClickAction: () => Promise<void>;
}

export const TopNav = ({ onMenuClickAction }: TopNavProps) => {
  const router = useRouter();
  const { data: session, status } = useSession();

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
        <Button variant="default" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

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