"use client";

import { useState, useEffect } from "react";
import { Users2, UserPlus, UserMinus, Search, User, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { usersAPI } from "@/lib/api";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export function AssignmentsManager({ user, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const isInstructor = user.role === "INSTRUCTOR";

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();
      fetchAvailableUsers();
    }
  }, [user?.id]);

  const fetchAssignments = async () => {
    try {
      const response = await usersAPI.getAssignments(user.id);
      setAssignments(response.data || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to fetch assignments");
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch the opposite role users
      const response = isInstructor 
        ? await usersAPI.getStudents()
        : await usersAPI.getInstructors();
        
      setAvailableUsers(response.data || []);
    } catch (error) {
      console.error("Error fetching available users:", error);
      toast.error("Failed to fetch available users");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (targetUserId) => {
    try {
      if (isInstructor) {
        await usersAPI.assignStudent(user.id, targetUserId);
        toast.success("Student assigned successfully");
      } else {
        await usersAPI.assignStudent(targetUserId, user.id);
        toast.success("Assigned to instructor successfully");
      }
      
      fetchAssignments();
    } catch (error) {
      console.error("Error assigning user:", error);
      toast.error("Failed to assign user");
    }
  };

  const handleUnassignUser = async (targetUserId) => {
    const targetUser = assignments.find(a => a.id === targetUserId);
    const confirmed = await showConfirm({
      title: "Remove Assignment",
      description: `Remove ${targetUser?.name || targetUser?.email} from ${user.name || user.email}?`,
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      if (isInstructor) {
        await usersAPI.unassignStudent(user.id, targetUserId);
        toast.success("Student removed successfully");
      } else {
        await usersAPI.unassignStudent(targetUserId, user.id);
        toast.success("Removed from instructor successfully");
      }
      
      fetchAssignments();
    } catch (error) {
      console.error("Error unassigning user:", error);
      toast.error("Failed to remove assignment");
    }
  };

  // Filter available users based on search and exclude already assigned
  const filteredAvailableUsers = availableUsers.filter(availableUser => {
    const matchesSearch = !searchTerm || 
      availableUser.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      availableUser.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const notAssigned = !assignments.some(assigned => assigned.id === availableUser.id);
    
    return matchesSearch && notAssigned;
  });

  const getRoleIcon = (role) => {
    return role === "INSTRUCTOR" ? (
      <UserCheck className="h-4 w-4 text-purple-600" />
    ) : (
      <User className="h-4 w-4 text-blue-600" />
    );
  };

  return (
    <div className="space-y-6 pb-6">
      <SheetHeader className="sticky top-0 bg-background pb-4 border-b z-10">
        <SheetTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Manage Assignments
        </SheetTitle>
        <SheetDescription>
          {isInstructor 
            ? `Manage students assigned to ${user.name || user.email}`
            : `Manage instructors assigned to ${user.name || user.email}`
          }
        </SheetDescription>
      </SheetHeader>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            Current Assignments ({assignments.length})
          </CardTitle>
          <CardDescription>
            {isInstructor 
              ? "Students currently assigned to this instructor"
              : "Instructors currently assigned to this student"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No assignments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignedUser) => (
                <div 
                  key={assignedUser.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                      {getRoleIcon(isInstructor ? "STUDENT" : "INSTRUCTOR")}
                    </div>
                    <div>
                      <p className="font-medium">{assignedUser.name || assignedUser.email}</p>
                      <p className="text-sm text-muted-foreground">{assignedUser.email}</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnassignUser(assignedUser.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Available Users to Assign */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Available {isInstructor ? "Students" : "Instructors"}
          </CardTitle>
          <CardDescription>
            {isInstructor 
              ? "Students that can be assigned to this instructor"
              : "Instructors that can be assigned to this student"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={`Search ${isInstructor ? "students" : "instructors"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Available Users List */}
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
            </div>
          ) : filteredAvailableUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>
                {searchTerm 
                  ? "No matching users found" 
                  : `No available ${isInstructor ? "students" : "instructors"} to assign`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredAvailableUsers.map((availableUser) => (
                <div 
                  key={availableUser.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {getRoleIcon(isInstructor ? "STUDENT" : "INSTRUCTOR")}
                    </div>
                    <div>
                      <p className="font-medium">{availableUser.name || availableUser.email}</p>
                      <p className="text-sm text-muted-foreground">{availableUser.email}</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignUser(availableUser.id)}
                    className="bg-golden-gradient hover:bg-golden-gradient/90 text-white border-none"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
