// app/dashboard/components/navigation/side-nav.tsx
import { Home, Table, FormInput, Layout, Smartphone, Palette, User, LogIn, AlertTriangle, Github, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NavItem = ({ icon: Icon, label, href }: {
  icon: LucideIcon;
  label: string;
  href: string;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link 
      href={href}
      className={`flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors
        ${isActive ? 'bg-gray-800 text-white' : ''}`}
    >
      <Icon className="h-5 w-5 mr-3" />
      <span>{label}</span>
    </Link>
  );
};

export const SideNav = () => {
  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Table, label: 'Tables', href: '/dashboard/tables' },
    { icon: FormInput, label: 'Forms', href: '/dashboard/forms' },
    { icon: Layout, label: 'UI', href: '/dashboard/ui' },
    { icon: Smartphone, label: 'Responsive', href: '/dashboard/responsive' },
    { icon: Palette, label: 'Styles', href: '/dashboard/styles' },
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
    { icon: LogIn, label: 'Login', href: '/dashboard/login' },
    { icon: AlertTriangle, label: 'Error', href: '/dashboard/error' },
    { icon: Github, label: 'GitHub', href: 'https://github.com' },
  ];

  return (
    <nav className="mt-4">
      {navItems.map((item, index) => (
        <NavItem key={index} {...item} />
      ))}
    </nav>
  );
};