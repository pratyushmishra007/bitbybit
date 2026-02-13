"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Trophy,
  User,
  BarChart3,
  Bell,
  GraduationCap,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const studentNavItems: NavItem[] = [
  { href: "/dashboard/student", label: "Home", icon: Home },
  { href: "/courses", label: "Learn", icon: BookOpen },
  { href: "/contests", label: "Compete", icon: Trophy },
  { href: "/leaderboard", label: "Rank", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

const teacherNavItems: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: Home },
  { href: "/teacher/manage-courses", label: "Courses", icon: BookOpen },
  { href: "/teacher/students", label: "Students", icon: GraduationCap },
  { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

interface MobileBottomNavProps {
  role?: "student" | "teacher" | "org_admin" | "admin";
}

export default function MobileBottomNav({ role = "student" }: MobileBottomNavProps) {
  const pathname = usePathname();
  
  const navItems = role === "teacher" || role === "org_admin" || role === "admin"
    ? teacherNavItems
    : studentNavItems;

  return (
    <nav className="mobile-bottom-nav md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors touch-target ${
              isActive
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Floating Action Button for mobile
export function MobileFloatingButton({
  onClick,
  icon: Icon,
  label,
  className = "",
}: {
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-20 right-4 z-40 md:hidden
        w-14 h-14 rounded-full shadow-lg
        bg-gradient-to-r from-indigo-600 to-purple-600
        text-white flex items-center justify-center
        hover:shadow-xl active:scale-95 transition-all
        ${className}`}
      aria-label={label}
    >
      <Icon className="w-6 h-6" />
    </button>
  );
}

// Pull to refresh indicator
export function PullToRefreshIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-4 md:hidden">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );
}

// Mobile header with hamburger menu
export function MobileHeader({
  title,
  onMenuClick,
  showNotifications = true,
  notificationCount = 0,
}: {
  title: string;
  onMenuClick?: () => void;
  showNotifications?: boolean;
  notificationCount?: number;
}) {
  return (
    <header className="sticky top-0 z-40 md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 touch-target"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        
        <h1 className="text-lg font-semibold truncate flex-1 text-center">
          {title}
        </h1>
        
        {showNotifications && (
          <Link
            href="/notifications"
            className="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 touch-target relative"
          >
            <Bell className="w-6 h-6" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
