"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Calendar,
  PlaneIcon,
  Wrench,
  AlertTriangle,
  Clock,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  RefreshCw,
  GraduationCap,
  BookOpen,
  UserCircle,
  FileText,
  WalletCards,
} from "lucide-react";

const allNavigation = [
  { name: "Profile", href: "/profile", icon: UserCircle, roles: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT", "RENTER"] },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT", "RENTER"] },
  { name: "Lessons", href: "/lessons", icon: Calendar, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"] },
  { name: "Syllabus", href: "/syllabus", icon: BookOpen, roles: ["INSTRUCTOR", "ADMIN"] },
  { name: "Progress", href: "/progress", icon: GraduationCap, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"] },
  { name: "Schedule", href: "/rentals", icon: Calendar, roles: ["RENTER", "ADMIN"] },
  { name: "Aircraft", href: "/aircraft", icon: PlaneIcon, roles: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT", "RENTER"] },
  { name: "Documents", href: "/documents", icon: FileText, roles: ["RENTER", "ADMIN"] },
  { name: "Billing", href: "/billing", icon: WalletCards, roles: ["STUDENT", "INSTRUCTOR", "ADMIN", "RENTER"] },
  { name: "Maintenance", href: "/maintenance", icon: Wrench, roles: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT"] },
  { name: "Squawks", href: "/squawks", icon: AlertTriangle, roles: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT", "RENTER"] },
  { name: "Availability", href: "/availability", icon: Clock, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"] },
  { name: "Users", href: "/users", icon: Users, roles: ["ADMIN"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    router.replace('/login');
    router.refresh();
  };

  const handleClearCache = async () => {
    try {
      // Clear server-side cache
      await adminAPI.clearCache();
      
      // Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage (except auth token)
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      localStorage.clear();
      if (token) localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', user);
      
      toast.success("All caches cleared! Reloading...", { duration: 2000 });
      
      // Force hard refresh to clear all caches
      setTimeout(() => {
        window.location.reload(true);
      }, 500);
    } catch (error) {
      console.error("Failed to clear cache:", error);
      toast.error("Failed to clear cache. Please try again.");
    }
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-black">
                <Image
                  src="/icon.png"
                  alt="Wings of an Angel Aviation"
                  fill
                  sizes="48px"
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-golden dark:text-golden-dark">
                Wings CRM
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="mr-3 icon-lg icon-black dark:icon-black-dark" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.role}
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <UserCircle className="mr-2 icon-lg icon-black dark:icon-black-dark" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer" onClick={() => setIsMobileMenuOpen(false)}>
                    <UserCircle className="mr-2 icon-lg icon-black dark:icon-black-dark" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {user?.role === 'ADMIN' && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer" onClick={() => setIsMobileMenuOpen(false)}>
                      <Settings className="mr-2 icon-lg icon-black dark:icon-black-dark" />
                      App settings
                    </Link>
                  </DropdownMenuItem>
                )}
                {user?.role === 'ADMIN' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleClearCache}>
                      <RefreshCw className="mr-2 icon-lg icon-black dark:icon-black-dark" />
                      Clear All Caches
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 icon-lg icon-black dark:icon-black-dark" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
