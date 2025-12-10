"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { notificationsAPI } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { on, isConnected } = useSocket();
  const audioRef = useRef(null);

  // Initialize audio on mount
  useEffect(() => {
    try {
      audioRef.current = new Audio('/notification.mp3');
      audioRef.current.volume = 0.5; // 50% volume
      
      // Preload the audio
      audioRef.current.load();
      
      audioRef.current.addEventListener('error', (e) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Audio loading error:', e);
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating audio element:', error);
      }
    }
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.play().catch(() => {
        // Silently fail - autoplay restrictions are normal
      });
    }
  };

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll();
      const notifs = response.data || [];
      
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    } catch (error) {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      // Fail silently
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const unsubscribe = on('notification', (data) => {
      
      // Play notification sound
      playNotificationSound();
      
      // Add new notification to the list using the REAL database ID
      const newNotification = {
        id: data.payload._notificationId || `realtime-${Date.now()}`, // Use real DB ID
        type: data.type,
        payload: data.payload,
        created_at: data.payload._created_at || new Date(data.timestamp).toISOString(),
        isRead: false,
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.info(data.payload?.message || 'New notification received', {
        description: data.payload?.description,
        duration: 5000,
      });
    });

    return unsubscribe;
  }, [isConnected, on]);

  // Mark single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Format notification title and message
  const formatNotification = (notification) => {
    const payload = notification.payload || {};
    
    switch (notification.type) {
      case 'lesson_scheduled':
        return {
          title: 'Lesson Scheduled',
          message: payload.message || 'A new lesson has been scheduled',
        };
      case 'maintenance_alert':
        return {
          title: 'Maintenance Alert',
          message: payload.message || 'Aircraft maintenance required',
        };
      case 'squawk_reported':
        return {
          title: 'Squawk Reported',
          message: payload.message || 'A new squawk has been reported',
        };
      case 'squawk_resolved':
        return {
          title: 'Squawk Resolved',
          message: payload.message || 'A squawk has been resolved',
        };
      case 'availability_updated':
        return {
          title: 'Availability Updated',
          message: payload.message || 'Availability has been updated',
        };
      default:
        return {
          title: 'Notification',
          message: payload.message || 'You have a new notification',
        };
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          {isConnected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            {isConnected && (
              <p className="text-xs text-muted-foreground">Real-time updates enabled</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {notifications.map((notification) => {
              const { title, message } = formatNotification(notification);
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 cursor-pointer",
                    !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
                  )}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between w-full">
                    <p className="font-medium text-sm">{title}</p>
                    {!notification.isRead && (
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-1 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{message}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(notification.created_at), "MMM d, h:mm a")}
                  </p>
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

