"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Shield, Key, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const userSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT"], {
    required_error: "Role is required",
  }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isLeadInstructor: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export function UserForm({ user, onSubmit, onCancel }) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!user;

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user?.email || "",
      name: user?.name || "",
      role: user?.role || "STUDENT",
      password: "",
      isLeadInstructor: user?.is_lead_instructor || false,
      is_active: user?.is_active !== undefined ? user.is_active : true,
    },
  });

  const watchedRole = form.watch("role");

  const handleSubmit = async (data) => {
    try {
      setLoading(true);
      
      const userData = {
        email: data.email,
        name: data.name,
        role: data.role,
        isLeadInstructor: data.isLeadInstructor,
        is_active: data.is_active,
      };

      // Include password for new users
      if (!isEditing) {
        userData.password = data.password;
      }

      await onSubmit(userData);
    } catch (error) {
      console.error("Error submitting user:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case "STUDENT":
        return "Can book lessons, view their schedule, and track progress";
      case "INSTRUCTOR":
        return "Can teach lessons, manage students, and view schedules";
      case "ADMIN":
        return "Full system access including user management and settings";
      case "MAINT":
        return "Can manage aircraft maintenance and resolve squawks";
      default:
        return "";
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "STUDENT":
        return <User className="h-4 w-4" />;
      case "INSTRUCTOR":
        return <UserCheck className="h-4 w-4" />;
      case "ADMIN":
        return <Shield className="h-4 w-4" />;
      case "MAINT":
        return <Key className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>
              User's personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="user@example.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    This will be used for login and system notifications
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Doe" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Display name shown throughout the system
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 6 characters required
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Role and Permissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Role and Permissions</CardTitle>
            <CardDescription>
              Define the user's role and access level in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="STUDENT">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Student
                        </div>
                      </SelectItem>
                      <SelectItem value="INSTRUCTOR">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Instructor
                        </div>
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="MAINT">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          Maintenance
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {getRoleDescription(watchedRole)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedRole === "INSTRUCTOR" && (
              <FormField
                control={form.control}
                name="isLeadInstructor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Lead Instructor
                      </FormLabel>
                      <FormDescription>
                        Can perform stage checks and approve student progress
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {isEditing && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Active Status
                      </FormLabel>
                      <FormDescription>
                        Inactive users cannot log in or access the system
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Role Information */}
        {watchedRole && (
          <Alert>
            <div className="flex items-center gap-2">
              {getRoleIcon(watchedRole)}
              <AlertDescription>
                <strong>{watchedRole}:</strong> {getRoleDescription(watchedRole)}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-golden-gradient hover:bg-golden-gradient/90"
          >
            {loading ? "Saving..." : isEditing ? "Update User" : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
