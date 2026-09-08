"use client";

import { User, Mail, Shield, UserCheck, Key, MoreHorizontal, Eye, Edit, KeyRound, Users2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function UsersTable({ 
  users, 
  onUserClick, 
  onEditUser, 
  onResetPassword,
  onDeleteUser, 
  onManageAssignments 
}) {
  /** Dark-safe role tones. The previous bg-*-50 fills were invisible in dark mode. */
  const getRoleBadge = (role, isLeadInstructor) => {
    const tones = {
      STUDENT: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
      RENTER: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
      INSTRUCTOR: "bg-purple-500/12 text-purple-700 dark:text-purple-400",
      ADMIN: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
      MAINT: "bg-orange-500/12 text-orange-700 dark:text-orange-400",
    };
    const labels = { MAINT: "Maintenance", RENTER: "Renter" };

    return (
      <div className="flex items-center gap-2">
        <span className={cn(
          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
          tones[role] || "bg-muted text-muted-foreground",
        )}>
          {labels[role] || role}
        </span>
        {isLeadInstructor && (
          <span className="inline-flex items-center rounded-full bg-golden/12 px-2 py-0.5 text-xs font-semibold text-golden">
            Lead
          </span>
        )}
      </div>
    );
  };

  const getStatusBadge = (isActive) => (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
      isActive
        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
        : "bg-muted text-muted-foreground",
    )}>
      <span className={cn("size-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-muted-foreground/50")} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case "STUDENT":
        return <User className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
      case "INSTRUCTOR":
        return <UserCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "RENTER":
        return <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "ADMIN":
        return <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "MAINT":
        return <Key className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Users2 className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium">No users found</h3>
              <p className="text-muted-foreground">
                No users match your current filters. Try adjusting the filters or create a new user.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Users ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onUserClick(user)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.name || "No name"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {user.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getRoleBadge(user.role, user.is_lead_instructor)}
                      {user.category && (
                        <Badge variant="outline" className="text-xs">
                          {user.category === 'PRIVATE_PILOT' ? 'Private Pilot' : user.category === 'INSTRUMENT' ? 'Instrument' : user.category === 'COMMERCIAL_PILOT' ? 'Commercial Pilot' : user.category}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(user.is_active)}
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserClick(user);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditUser(user);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onResetPassword(user);
                          }}
                        >
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        
                        {(user.role === "INSTRUCTOR" || user.role === "STUDENT") && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onManageAssignments(user);
                            }}
                          >
                            <Users2 className="h-4 w-4 mr-2" />
                            Manage Assignments
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUser(user);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
