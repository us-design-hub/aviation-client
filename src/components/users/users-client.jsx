"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Search, Filter, UserCheck, GraduationCap, Plane, Wrench, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/panels";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usersAPI } from "@/lib/api";
import { UsersTable } from "./users-table";
import { UserForm } from "./user-form";
import { UserDetails } from "./user-details";
import { AssignmentsManager } from "./assignments-manager";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export function UsersClient() {
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAssignmentsOpen, setIsAssignmentsOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
  });

  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to fetch users data");
      toast.error("Failed to fetch users data");
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on current filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !filters.search || 
      user.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesRole = filters.role === "all" || user.role === filters.role;
    const matchesStatus = filters.status === "all" || 
      (filters.status === "active" && user.is_active) ||
      (filters.status === "inactive" && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get user counts by role
  const userCounts = {
    total: users.length,
    students: users.filter(u => u.role === "STUDENT").length,
    instructors: users.filter(u => u.role === "INSTRUCTOR").length,
    admins: users.filter(u => u.role === "ADMIN").length,
    maintenance: users.filter(u => u.role === "MAINT").length,
    renters: users.filter(u => u.role === "RENTER").length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
  };

  // Handlers
  const handleCreateUser = async (userData) => {
    try {
      await usersAPI.create(userData);
      toast.success("User created successfully");
      setIsFormOpen(false);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
      throw error;
    }
  };

  const handleUpdateUser = async (id, userData) => {
    try {
      await usersAPI.update(id, userData);
      toast.success("User updated successfully");
      setIsFormOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
      throw error;
    }
  };

  const handleOpenResetPassword = (user) => {
    setResetPasswordUser(user);
    setIsResetPasswordOpen(true);
  };

  const handleResetPassword = async (userId, password) => {
    try {
      await usersAPI.resetPassword(userId, password);
      toast.success("Password reset successfully");
    } catch (error) {
      console.error("Error resetting password:", error);
      const errorMsg = error.response?.data?.error || "Failed to reset password";
      toast.error(errorMsg);
      throw error; // Re-throw to let dialog handle it
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = await showConfirm({
      title: "Delete User",
      description: `Are you sure you want to delete ${user.name || user.email}? This action cannot be undone. All related data (lessons, assignments, availability) will be removed.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await usersAPI.delete(user.id);
      toast.success("User deleted successfully");
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMsg = error.response?.data?.error || "Failed to delete user";
      toast.error(errorMsg);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleManageAssignments = (user) => {
    setSelectedUser(user);
    setIsAssignmentsOpen(true);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      role: "all",
      status: "all",
    });
  };

  const activeFilterCount = [
    filters.search,
    filters.role !== 'all' ? filters.role : '',
    filters.status !== 'all' ? filters.status : '',
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((key) => <Skeleton key={key} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <Card className="gap-0 py-0">
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-red-500/12">
              <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Could not load users</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchUsers} className="mt-2">Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage students, renters, instructors, and staff
          </p>
        </div>
        
        <Sheet open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingUser(null); // Clear editing user when closing
        }}>
          <SheetTrigger asChild>
            <Button 
              className="bg-golden-gradient hover:bg-golden-gradient/90"
              onClick={() => setEditingUser(null)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:w-[600px] lg:w-[700px] overflow-y-auto max-w-full">
            <SheetHeader className="sticky top-0 bg-background pb-4 border-b">
              <SheetTitle>
                {editingUser ? "Edit User" : "Add New User"}
              </SheetTitle>
              <SheetDescription>
                {editingUser 
                  ? "Update the user details below."
                  : "Fill in the details to create a new user."
                }
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 pb-6">
              <UserForm
                user={editingUser}
                onSubmit={editingUser ? 
                  (data) => handleUpdateUser(editingUser.id, data) : 
                  handleCreateUser
                }
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingUser(null);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* One tile per role: renters and maintenance were counted but never shown. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatTile
          label="Total Users"
          value={userCounts.total}
          icon={Users}
          tone="gold"
          hint={`${userCounts.active} active · ${userCounts.inactive} inactive`}
          progress={userCounts.total > 0 ? (userCounts.active / userCounts.total) * 100 : 0}
        />
        <StatTile
          label="Students"
          value={userCounts.students}
          icon={GraduationCap}
          tone="info"
          hint="In training"
        />
        <StatTile
          label="Renters"
          value={userCounts.renters}
          icon={Plane}
          tone="warning"
          hint="Rental-only pilots"
        />
        <StatTile
          label="Instructors"
          value={userCounts.instructors}
          icon={UserCheck}
          tone="neutral"
          hint="Teaching staff"
        />
        <StatTile
          label="Maintenance"
          value={userCounts.maintenance}
          icon={Wrench}
          tone="neutral"
          hint="Airworthiness staff"
        />
        <StatTile
          label="Admins"
          value={userCounts.admins}
          icon={ShieldCheck}
          tone="success"
          hint="Full portal access"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="STUDENT">Students</SelectItem>
                <SelectItem value="RENTER">Renters</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructors</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
                <SelectItem value="MAINT">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground tabular-nums">{filteredUsers.length}</span>
              {' of '}<span className="tabular-nums">{userCounts.total}</span> users
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`}
            </p>
            <Button variant="outline" onClick={resetFilters} size="sm" disabled={activeFilterCount === 0}>
              <Filter className="h-4 w-4 mr-2" />
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <UsersTable
        users={filteredUsers}
        onUserClick={handleUserClick}
        onEditUser={handleEditUser}
        onResetPassword={handleOpenResetPassword}
        onDeleteUser={handleDeleteUser}
        onManageAssignments={handleManageAssignments}
      />

      {/* User Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[600px] lg:w-[800px] overflow-y-auto max-w-full">
          {selectedUser && (
            <UserDetails
              user={selectedUser}
              onEdit={() => {
                setIsDetailsOpen(false);
                handleEditUser(selectedUser);
              }}
              onResetPassword={() => {
                setIsDetailsOpen(false);
                handleOpenResetPassword(selectedUser);
              }}
              onDeleteUser={() => {
                setIsDetailsOpen(false);
                handleDeleteUser(selectedUser);
              }}
              onManageAssignments={() => {
                setIsDetailsOpen(false);
                handleManageAssignments(selectedUser);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Assignments Manager Sheet */}
      <Sheet open={isAssignmentsOpen} onOpenChange={setIsAssignmentsOpen}>
        <SheetContent className="w-full sm:w-[600px] lg:w-[800px] overflow-y-auto max-w-full">
          {selectedUser && (
            <AssignmentsManager
              user={selectedUser}
              onClose={() => setIsAssignmentsOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        user={resetPasswordUser}
        onResetPassword={handleResetPassword}
      />

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
