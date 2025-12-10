"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * RoleGate component for role-based access control
 * @param {string[]} allowedRoles - Array of roles that can access the content
 * @param {React.ReactNode} children - Content to render if user has access
 * @param {React.ReactNode} fallback - Optional custom fallback component
 */
export function RoleGate({ allowedRoles, children, fallback }) {
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has required role
  const hasAccess = user?.role && allowedRoles.includes(user.role);

  if (!hasAccess) {
    // Show custom fallback or default access denied message
    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-red-600">
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  This page requires one of the following roles: {allowedRoles.join(", ")}
                </span>
              </div>
              <div className="text-sm text-yellow-700 mt-1">
                Your current role: <strong>{user?.role || "Unknown"}</strong>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}

/**
 * Hook to check if user has specific role(s)
 * @param {string|string[]} roles - Role or array of roles to check
 * @returns {boolean} Whether user has the required role(s)
 */
export function useRole(roles) {
  const { user } = useAuth();
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return user?.role && roleArray.includes(user.role);
}

/**
 * Hook to check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether user has the permission
 */
export function usePermission(permission) {
  const { user } = useAuth();
  
  // Define role-based permissions (matches server-side RBAC rules)
  const permissions = {
    // User Management
    manageUsers: ["ADMIN"],
    assignStudents: ["ADMIN"],
    
    // Aircraft Operations
    createAircraft: ["ADMIN", "MAINT"],
    updateAircraft: ["ADMIN", "MAINT"],
    viewAircraft: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT"],
    updateWB: ["ADMIN", "MAINT"],
    logAircraft: ["INSTRUCTOR", "ADMIN", "MAINT"],
    
    // Lessons & Scheduling
    scheduleLesson: ["INSTRUCTOR", "ADMIN"],
    viewAllLessons: ["ADMIN"],
    viewOwnLessons: ["STUDENT", "INSTRUCTOR"],
    modifyLesson: ["INSTRUCTOR", "ADMIN"],
    
    // Notes & Progress
    createNote: ["INSTRUCTOR"],
    viewOwnNotes: ["STUDENT"],
    viewAllNotes: ["ADMIN"],
    viewAssignedStudentNotes: ["INSTRUCTOR"],
    viewOwnProgress: ["STUDENT"],
    viewAllProgress: ["ADMIN"],
    viewAssignedStudentProgress: ["INSTRUCTOR"],
    
    // Availability
    setPersonalAvailability: ["STUDENT", "INSTRUCTOR"],
    viewOwnAvailability: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT"],
    viewAllAvailability: ["ADMIN"],
    viewAssignedStudentAvailability: ["INSTRUCTOR"],
    
    // Maintenance
    postMaintenance: ["MAINT", "ADMIN"],
    resolveMaint: ["MAINT", "ADMIN"],
    viewMaintenance: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT"],
    
    // Squawks
    reportSquawk: ["INSTRUCTOR", "ADMIN"],
    resolveSquawk: ["MAINT", "ADMIN"],
    viewSquawks: ["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT"],
  };
  
  const allowedRoles = permissions[permission];
  return user?.role && allowedRoles?.includes(user.role);
}
