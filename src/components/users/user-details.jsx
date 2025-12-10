"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Shield, 
  UserCheck, 
  Key, 
  Edit, 
  KeyRound, 
  Users2,
  Calendar,
  BookOpen,
  Activity,
  Clock,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { lessonsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

export function UserDetails({ user, onEdit, onResetPassword, onDeleteUser, onManageAssignments }) {
  const [userStats, setUserStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    scheduledLessons: 0,
    recentLessons: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchUserStats();
    }
  }, [user?.id]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      
      // Fetch lessons based on user role
      const params = {};
      if (user.role === "STUDENT") {
        params.studentId = user.id;
      } else if (user.role === "INSTRUCTOR") {
        params.instructorId = user.id;
      }
      
      const response = await lessonsAPI.getAll(params);
      const lessons = response.data || [];
      
      setUserStats({
        totalLessons: lessons.length,
        completedLessons: lessons.filter(l => l.status === "COMPLETED").length,
        scheduledLessons: lessons.filter(l => l.status === "SCHEDULED").length,
        recentLessons: lessons
          .sort((a, b) => new Date(b.start_at) - new Date(a.start_at))
          .slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "STUDENT":
        return <User className="h-5 w-5 text-blue-600" />;
      case "INSTRUCTOR":
        return <UserCheck className="h-5 w-5 text-purple-600" />;
      case "ADMIN":
        return <Shield className="h-5 w-5 text-green-600" />;
      case "MAINT":
        return <Key className="h-5 w-5 text-orange-600" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case "STUDENT":
        return "Student";
      case "INSTRUCTOR":
        return "Instructor";
      case "ADMIN":
        return "Administrator";
      case "MAINT":
        return "Maintenance";
      default:
        return role;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: "text-blue-600 bg-blue-50 border-blue-200",
      COMPLETED: "text-green-600 bg-green-50 border-green-200",
      CANCELED: "text-gray-600 bg-gray-50 border-gray-200"
    };
    return colors[status] || colors.SCHEDULED;
  };

  const formatDateTime = (dateTime) => {
    return format(new Date(dateTime), "MMM dd, yyyy 'at' h:mm a");
  };

  return (
    <div className="space-y-6 pb-6">
      <SheetHeader className="sticky top-0 bg-background pb-4 border-b z-10">
        <SheetTitle className="flex items-center gap-2">
          {getRoleIcon(user.role)}
          {user.name || user.email}
        </SheetTitle>
        <SheetDescription>
          {getRoleName(user.role)} • {user.is_active ? "Active" : "Inactive"}
        </SheetDescription>
      </SheetHeader>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit User
        </Button>
        
        <Button variant="outline" size="sm" onClick={onResetPassword}>
          <KeyRound className="h-4 w-4 mr-2" />
          Reset Password
        </Button>
        
        {(user.role === "INSTRUCTOR" || user.role === "STUDENT") && (
          <Button variant="outline" size="sm" onClick={onManageAssignments}>
            <Users2 className="h-4 w-4 mr-2" />
            Manage Assignments
          </Button>
        )}
        
        <Button variant="destructive" size="sm" onClick={onDeleteUser}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete User
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">{user.name || "Not provided"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(
                      "text-xs",
                      user.role === "STUDENT" && "bg-blue-50 text-blue-700 border-blue-200",
                      user.role === "INSTRUCTOR" && "bg-purple-50 text-purple-700 border-purple-200",
                      user.role === "ADMIN" && "bg-green-50 text-green-700 border-green-200",
                      user.role === "MAINT" && "bg-orange-50 text-orange-700 border-orange-200"
                    )}>
                      {getRoleName(user.role)}
                    </Badge>
                    {user.is_lead_instructor && (
                      <Badge variant="outline" className="text-xs">
                        Lead Instructor
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge 
                    variant={user.is_active ? "secondary" : "outline"}
                    className={user.is_active 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-red-50 text-red-700 border-red-200"
                    }
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Statistics */}
      {(user.role === "STUDENT" || user.role === "INSTRUCTOR") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lesson Statistics
            </CardTitle>
            <CardDescription>
              {user.role === "STUDENT" ? "Student's lesson progress" : "Instructor's teaching activity"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading statistics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{userStats.totalLessons}</p>
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{userStats.completedLessons}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{userStats.scheduledLessons}</p>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Lessons */}
      {(user.role === "STUDENT" || user.role === "INSTRUCTOR") && userStats.recentLessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Recent Lessons
            </CardTitle>
            <CardDescription>
              Latest lesson activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userStats.recentLessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                      {lesson.kind === "FLIGHT" ? (
                        <Calendar className="h-4 w-4 text-purple-600" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {lesson.lesson || `${lesson.kind} Lesson`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(lesson.start_at)}
                      </p>
                    </div>
                  </div>
                  
                  <Badge className={cn("text-xs", getStatusColor(lesson.status))}>
                    {lesson.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">User ID</p>
              <p className="text-muted-foreground font-mono text-xs">{user.id}</p>
            </div>
            
            <div>
              <p className="font-medium">Account Type</p>
              <p className="text-muted-foreground">{getRoleName(user.role)}</p>
            </div>
            
            {user.role === "INSTRUCTOR" && (
              <div>
                <p className="font-medium">Instructor Level</p>
                <p className="text-muted-foreground">
                  {user.is_lead_instructor ? "Lead Instructor" : "Standard Instructor"}
                </p>
              </div>
            )}
            
            <div>
              <p className="font-medium">Account Status</p>
              <p className="text-muted-foreground">
                {user.is_active ? "Active and can log in" : "Inactive - cannot log in"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
