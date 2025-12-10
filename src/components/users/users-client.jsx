"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Search, Filter, UserCheck, UserPlus, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usersAPI } from "@/lib/api";
import { UsersTable } from "./users-table";
import { UserForm } from "./user-form";
import { UserDetails } from "./user-details";
import { AssignmentsManager } from "./assignments-manager";
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  
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

  const handleResetPassword = async (user) => {
    const confirmed = await showConfirm({
      title: "Reset Password",
      description: `Reset password for ${user.name || user.email}? The new password will be 'pass1234'.`,
    });

    if (!confirmed) return;

    try {
      await usersAPI.resetPassword(user.id);
      toast.success("Password reset successfully");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchUsers}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage students, instructors, and staff
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userCounts.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students</p>
                <p className="text-2xl font-bold text-blue-600">{userCounts.students}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Instructors</p>
                <p className="text-2xl font-bold text-purple-600">{userCounts.instructors}</p>
              </div>
              <UserCheck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold text-green-600">{userCounts.admins}</p>
              </div>
              <UserPlus className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{userCounts.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{userCounts.inactive}</p>
              </div>
              <Users className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
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
            
            <Button variant="outline" onClick={resetFilters} size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <UsersTable
        users={filteredUsers}
        onUserClick={handleUserClick}
        onEditUser={handleEditUser}
        onResetPassword={handleResetPassword}
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
                handleResetPassword(selectedUser);
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

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
