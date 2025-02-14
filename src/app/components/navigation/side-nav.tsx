// app/dashboard/components/navigation/side-nav.tsx
"use client";

import { useSession } from 'next-auth/react';
import { Home, Calendar, Users, Book, Settings, User, LucideIcon, Menu, X, Table, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// Side navigation items in Thai
const adminNavItems = [
  { href: '/dashboard/admin', label: 'แดชบอร์ด', icon: Home },
  { href: '/dashboard/admin/tables', label: 'นำเข้าตารางสอบ', icon: Table },
  { href: '/dashboard/admin/departments', label: 'ภาควิชา', icon: Book },
  { href: '/dashboard/admin/invigilators', label: 'ผู้คุมสอบ', icon: Users },
  { href: '/dashboard/admin/messages', label: 'ข้อความ', icon: MessageCircle },
  { href: '/dashboard/admin/professors', label: 'อาจารย์', icon: Users },
  { href: '/dashboard/admin/exams', label: 'ตารางสอบ', icon: Calendar },
  { href: '/dashboard/admin/subjects', label: 'รายวิชา', icon: Book },
  { href: '/dashboard/admin/subjectgroups', label: 'กลุ่มเรียน', icon: Book },
  { href: '/dashboard/admin/rooms', label: 'ห้องสอบ', icon: Book },
  { href: '/dashboard/admin/users', label: 'ผู้ใช้งาน', icon: Users },
  { href: '/dashboard/admin/settings', label: 'ตั้งค่า', icon: Settings },
];

const userNavItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: Home },
  { href: '/schedule', label: 'ตารางคุมสอบ', icon: Calendar },
  { href: '/complaints', label: 'ร้องเรียน', icon: MessageCircle },
  { href: '/profile', label: 'โปรไฟล์', icon: User },
];

// Updated NavItem component with improved styling
const NavItem = ({ icon: Icon, label, href, onClick }: {
  icon: LucideIcon;
  label: string;
  href: string;
  onClick?: () => void;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link 
      href={href}
      onClick={onClick}
      className={`
        group flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200
        ${isActive 
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
          : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
        }
      `}
    >
      <Icon className={`
        h-5 w-5 mr-3 transition-transform duration-200
        ${isActive ? 'scale-110' : 'group-hover:scale-110'}
      `} />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
};

interface SideNavProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export const SideNav = ({ isMobileMenuOpen, setIsMobileMenuOpen}: SideNavProps) => {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  const navItems = session?.user?.role === 'admin' ? adminNavItems : userNavItems;

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Mobile Menu Button with animation */}
      <button
        className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-lg bg-blue-600 text-white
          hover:bg-blue-700 transition-colors shadow-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 animate-in" />
        ) : (
          <Menu className="h-6 w-6 animate-in" />
        )}
      </button>

      {/* Improved Sidebar Navigation */}
      <nav className={`
        fixed top-0 left-0 h-full w-64 
        bg-gradient-to-b from-gray-900 to-gray-800
        transform transition-all duration-300 ease-in-out
        border-r border-gray-800/50 backdrop-blur-xl
        lg:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        z-40
      `}>
        {/* Logo section */}
        <div className="pt-16 lg:pt-6 px-4 mb-8">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
            KMITL Invigilator
          </h1>
          <p className="text-sm text-gray-400 mt-1">ระบบจัดการการคุมสอบ</p>
        </div>
        
        {/* Navigation Items */}
        <div className="space-y-1 px-2">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              onClick={closeMobileMenu}
            />
          ))}
        </div>
      </nav>

      {/* Improved Overlay with blur */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden
            transition-opacity duration-300 ease-in-out"
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
};