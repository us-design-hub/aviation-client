"use client"

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GoldenBadge } from '@/components/ui/golden-badge';
import { Button } from '@/components/ui/button';
import { 
  Plane, 
  Calendar, 
  Wrench, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { aircraftAPI, lessonsAPI, maintenanceAPI, squawksAPI, usersAPI } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    aircraft: 0,
    lessons: 0,
    maintenance: 0,
    squawks: 0,
    users: 0,
    todayLessons: 0,
    completedLessons: 0,
    activeMaintenance: 0,
  });
  const [studentData, setStudentData] = useState(null); // For student dashboard
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Debug user loading
  useEffect(() => {
    if (!user?.role) {
      return; // Wait for user to be loaded
    }
    
    const fetchStats = async () => {
      try {
        // For STUDENT role, fetch specialized dashboard data
        if (user?.role === 'STUDENT') {
          try {
            const dashboardRes = await usersAPI.getStudentDashboard(user.id);
            setStudentData(dashboardRes.data);
          } catch (error) {
            console.error('Error fetching student dashboard:', error);
          }
        }
        
        // Role-based API calls - only fetch what the user can access
        const apiCalls = [];
        
        // All roles can view aircraft
        apiCalls.push(aircraftAPI.getAll());
        
        // Only STUDENT, INSTRUCTOR, ADMIN can access lessons
        if (user?.role === 'STUDENT' || user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') {
          apiCalls.push(lessonsAPI.getAll());
        }
        
        // Only ADMIN, MAINT can access maintenance
        if (user?.role === 'ADMIN' || user?.role === 'MAINT') {
          apiCalls.push(maintenanceAPI.getAll());
        }
        
        // All roles can view squawks (read-only for students per scope)
        apiCalls.push(squawksAPI.getAll());
        
        // Only admins can fetch users data - RBAC FIXED
        if (user?.role === 'ADMIN') {
          apiCalls.push(usersAPI.getAll());
        }
        
        // Fetch data with individual error handling
        const results = await Promise.allSettled(apiCalls);

        // Handle results based on role - map results to correct variables
        let aircraftRes = { status: 'rejected' };
        let lessonsRes = { status: 'rejected' };
        let maintenanceRes = { status: 'rejected' };
        let squawksRes = { status: 'rejected' };
        let usersRes = { status: 'rejected' };
        
        let resultIndex = 0;
        
        // Aircraft is always first
        aircraftRes = results[resultIndex++];
        
        // Lessons (STUDENT, INSTRUCTOR, ADMIN)
        if (user?.role === 'STUDENT' || user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') {
          lessonsRes = results[resultIndex++];
        }
        
        // Maintenance (ADMIN, MAINT)
        if (user?.role === 'ADMIN' || user?.role === 'MAINT') {
          maintenanceRes = results[resultIndex++];
        }
        
        // Squawks (all roles can view)
        squawksRes = results[resultIndex++];
        
        // Users (ADMIN only)
        if (user?.role === 'ADMIN') {
          usersRes = results[resultIndex++];
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Handle aircraft data
        const aircraftRaw = aircraftRes.status === 'fulfilled' ? aircraftRes.value : null;
        const aircraftData = Array.isArray(aircraftRaw) ? aircraftRaw : (aircraftRaw?.data || []);
        
        // Handle lessons data
        const lessonsRaw = lessonsRes.status === 'fulfilled' ? lessonsRes.value : null;
        const lessonsData = Array.isArray(lessonsRaw) ? lessonsRaw : (lessonsRaw?.data || []);
        const todayLessons = Array.isArray(lessonsData) ? lessonsData.filter(lesson => 
          lesson.start_at?.startsWith(today)
        ).length : 0;
        const completedLessons = Array.isArray(lessonsData) ? lessonsData.filter(lesson => 
          lesson.status === 'COMPLETED'
        ).length : 0;

        // Handle maintenance data (handle both direct array and wrapped response)
        const maintenanceRaw = maintenanceRes.status === 'fulfilled' ? maintenanceRes.value : null;
        const maintenanceData = Array.isArray(maintenanceRaw) ? maintenanceRaw : (maintenanceRaw?.data || []);
        const activeMaintenance = Array.isArray(maintenanceData) ? maintenanceData.filter(item => 
          item.status !== 'COMPLETED'
        ).length : 0;

        // Handle squawks data (handle both direct array and wrapped response)
        const squawksRaw = squawksRes.status === 'fulfilled' ? squawksRes.value : null;
        const squawksData = Array.isArray(squawksRaw) ? squawksRaw : (squawksRaw?.data || []);

        // Handle users data (only for admins)
        const usersData = usersRes.status === 'fulfilled' ? usersRes.value.data || [] : [];

        setStats({
          aircraft: Array.isArray(aircraftData) ? aircraftData.length : 0,
          lessons: Array.isArray(lessonsData) ? lessonsData.length : 0,
          maintenance: Array.isArray(maintenanceData) ? maintenanceData.length : 0,
          squawks: Array.isArray(squawksData) ? squawksData.filter(s => s.status === 'OPEN').length : 0,
          users: Array.isArray(usersData) ? usersData.length : 0,
          todayLessons,
          completedLessons,
          activeMaintenance,
        });

        // Log any failed requests
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const apiNames = ['aircraft', 'lessons', 'maintenance', 'squawks', 'users'];
            console.error(`Failed to fetch ${apiNames[index]} data:`, result.reason);
          }
        });

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.role]); // Re-run when user role changes

  const statCards = [
    {
      title: 'Total Aircraft',
      value: stats.aircraft,
      icon: Plane,
      description: 'Fleet size',
      color: 'text-golden dark:text-golden-dark',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    },
    {
      title: 'Total Lessons',
      value: stats.lessons,
      icon: Calendar,
      description: 'All time lessons',
      color: 'text-golden dark:text-golden-dark',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      title: 'Active Maintenance',
      value: stats.activeMaintenance,
      icon: Wrench,
      description: 'Items in progress',
      color: 'text-golden dark:text-golden-dark',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      title: 'Open Squawks',
      value: stats.squawks,
      icon: AlertTriangle,
      description: 'Issues to resolve',
      color: 'text-golden dark:text-golden-dark',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
    },
  ];

  // Role-based quick stats
  const baseQuickStats = [
    {
      title: 'Today\'s Lessons',
      value: stats.todayLessons,
      icon: Clock,
      color: 'text-golden dark:text-golden-dark',
    },
    {
      title: 'Completed Lessons',
      value: stats.completedLessons,
      icon: CheckCircle,
      color: 'text-golden dark:text-golden-dark',
    },
  ];
  
  const quickStats = user?.role === 'ADMIN' 
    ? [
        ...baseQuickStats,
        {
          title: 'Total Users',
          value: stats.users,
          icon: Users,
          color: 'text-golden dark:text-golden-dark',
        },
      ]
    : baseQuickStats;

  if (loading || !user?.role) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        {user?.role === 'STUDENT' ? (
          /* Student Dashboard */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Welcome, {user.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Your flight training dashboard
                </p>
              </div>
              <GoldenBadge variant="default" className="text-sm">
                <TrendingUp className="w-4 h-4 mr-1 icon-black dark:icon-black-dark" />
                Active Student
              </GoldenBadge>
            </div>

            {/* Progress Summary */}
            {studentData?.progressSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 icon-black dark:icon-black-dark" />
                    Progress Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Program</p>
                      <p className="text-lg font-semibold">{studentData.progressSummary.currentProgram}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Stage</p>
                      <p className="text-lg font-semibold">{studentData.progressSummary.currentStage}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-golden dark:bg-golden-dark h-2 rounded-full" 
                            style={{ width: `${studentData.progressSummary.overallProgress}%` }}
                          />
                        </div>
                        <span className="text-lg font-semibold">{studentData.progressSummary.overallProgress}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Lessons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 icon-black dark:icon-black-dark" />
                  Upcoming Lessons
                </CardTitle>
                <CardDescription>Your scheduled flight training</CardDescription>
              </CardHeader>
              <CardContent>
                {studentData?.upcomingLessons && studentData.upcomingLessons.length > 0 ? (
                  <div className="space-y-3">
                    {studentData.upcomingLessons.slice(0, 5).map((lesson) => (
                      <div 
                        key={lesson.id} 
                        className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="icon-container dark:icon-container-dark">
                            <Plane className="w-4 h-4 icon-black dark:icon-black-dark" />
                          </div>
                          <div>
                            <p className="font-medium">{lesson.lesson || 'Flight Lesson'}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(lesson.start_at).toLocaleDateString()} at{' '}
                              {lesson.start_time} • {lesson.instructor_name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{lesson.tail_number}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming lessons scheduled</p>
                )}
              </CardContent>
            </Card>

            {/* Assigned Aircraft & Latest Notes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assigned Aircraft */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5 icon-black dark:icon-black-dark" />
                    Assigned Aircraft
                  </CardTitle>
                  <CardDescription>Aircraft you're scheduled to fly</CardDescription>
                </CardHeader>
                <CardContent>
                  {studentData?.assignedAircraft && studentData.assignedAircraft.length > 0 ? (
                    <div className="space-y-3">
                      {studentData.assignedAircraft.map((aircraft) => (
                        <div 
                          key={aircraft.id} 
                          className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{aircraft.tail_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {aircraft.make} {aircraft.model}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {aircraft.open_maintenance_count > 0 && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <Wrench className="w-3 h-3 mr-1" />
                                {aircraft.open_maintenance_count}
                              </Badge>
                            )}
                            {aircraft.open_squawk_count > 0 && (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {aircraft.open_squawk_count}
                              </Badge>
                            )}
                            {aircraft.open_maintenance_count === 0 && aircraft.open_squawk_count === 0 && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                OK
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No aircraft assigned yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Latest Instructor Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 icon-black dark:icon-black-dark" />
                    Latest Instructor Notes
                  </CardTitle>
                  <CardDescription>Recent feedback from your instructors</CardDescription>
                </CardHeader>
                <CardContent>
                  {studentData?.latestNotes && studentData.latestNotes.length > 0 ? (
                    <div className="space-y-3">
                      {studentData.latestNotes.map((note) => (
                        <div 
                          key={note.id} 
                          className="p-3 border dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">{note.lesson_title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            — {note.instructor_name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No instructor notes yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/lessons">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="w-4 h-4 mr-2 icon-black dark:icon-black-dark" />
                      View Schedule
                    </Button>
                  </Link>
                  <Link href="/progress">
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="w-4 h-4 mr-2 icon-black dark:icon-black-dark" />
                      View Progress
                    </Button>
                  </Link>
                  <Link href="/squawks">
                    <Button variant="outline" className="w-full justify-start">
                      <AlertTriangle className="w-4 h-4 mr-2 icon-black dark:icon-black-dark" />
                      Report Squawk
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Admin/Instructor/Maintenance Dashboard */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Welcome to Wings of Angel Aviation CRM
                </p>
              </div>
              <GoldenBadge variant="default" className="text-sm">
                <TrendingUp className="w-4 h-4 mr-1 icon-black dark:icon-black-dark" />
                System Online
              </GoldenBadge>
            </div>

          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className="icon-container dark:icon-container-dark">
                    <stat.icon className={`icon-lg ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="icon-container dark:icon-container-dark">
                      <stat.icon className={`icon-xl ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/lessons">
                  <Button variant="outline" className="h-20 flex flex-col w-full">
                    <Calendar className="icon-xl mb-2 icon-black dark:icon-black-dark" />
                    Schedule Lesson
                  </Button>
                </Link>
                <Link href="/aircraft">
                  <Button variant="outline" className="h-20 flex flex-col w-full">
                    <Plane className="icon-xl mb-2 icon-black dark:icon-black-dark" />
                    Manage Aircraft
                  </Button>
                </Link>
                <Link href="/maintenance">
                  <Button variant="outline" className="h-20 flex flex-col w-full">
                    <Wrench className="icon-xl mb-2 icon-black dark:icon-black-dark" />
                    Log Maintenance
                  </Button>
                </Link>
                <Link href="/squawks">
                  <Button variant="outline" className="h-20 flex flex-col w-full">
                    <AlertTriangle className="icon-xl mb-2 icon-black dark:icon-black-dark" />
                    Report Squawk
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
