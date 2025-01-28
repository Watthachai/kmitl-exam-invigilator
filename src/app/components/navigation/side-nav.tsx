// app/dashboard/components/navigation/side-nav.tsx
"use client";

import { useSession } from 'next-auth/react';
import { Home, Calendar, Users, Book, Settings, User, LucideIcon, Menu, X, Table, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const adminNavItems = [
  { href: '/dashboard/admin', label: 'Dashboard', icon: Home },
  { href: '/dashboard/admin/tables', label: 'Import Exam Table', icon: Table },
  { href: '/dashboard/admin/departments', label: 'Departments', icon: Book },
  { href: '/dashboard/admin/invigilators', label: 'Invigilators', icon: Users },
  { href: '/dashboard/admin/messages', label: 'Messages', icon: MessageCircle},
  { href: '/dashboard/admin/professors', label: 'Professors', icon: Users },
  { href: '/dashboard/admin/exams', label: 'Exams', icon: Calendar },
  { href: '/dashboard/admin/subjects', label: 'Subjects', icon: Book },
  { href: '/dashboard/admin/subjectgroups', label: 'Subject Groups', icon: Book },
  { href: '/dashboard/admin/rooms', label: 'Rooms', icon: Book },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
];

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/complaints', label: 'Complaints', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

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
      className={`flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors
        ${isActive ? 'bg-gray-800 text-white' : ''}`}
    >
      <Icon className="h-5 w-5 mr-3" />
      <span>{label}</span>
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
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-md bg-gray-900 text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar Navigation */}
      <nav className={`
      fixed top-0 left-0 h-full w-64 bg-gray-900 
      transform transition-transform duration-200 ease-in-out
      lg:translate-x-0 
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      z-40
    `}>
        <div className="pt-16 lg:pt-4 px-4">
          <h1 className="text-xl font-bold text-white">KMITL Invigilator</h1>
        </div>
        
        <div className="space-y-1 mt-4">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              onClick={closeMobileMenu}
            />
          ))}
        </div>
      </nav>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
};