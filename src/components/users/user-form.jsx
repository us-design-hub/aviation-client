"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, User, Mail, Shield, Key, UserCheck, GraduationCap, Phone } from "lucide-react";
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
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT", "RENTER"], {
    required_error: "Role is required",
  }),
  roles: z.array(z.enum(["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT", "RENTER"])).optional(),
  activeRoles: z.array(z.enum(["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT", "RENTER"])).optional(),
  password: z.string().refine(
    (value) => value === "" || value.length >= 6,
    "Password must be at least 6 characters",
  ),
  isLeadInstructor: z.boolean().optional(),
  is_active: z.boolean().optional(),
  category: z.string().optional(),
  phone: z.string().optional(),
});

export function UserForm({ user, onSubmit, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const isEditing = !!user;

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user?.email || "",
      name: user?.name || "",
      role: user?.role || "STUDENT",
      roles: user?.roles || [user?.role || "STUDENT"],
      activeRoles: user?.activeRoles || user?.roles || [user?.role || "STUDENT"],
      password: "",
      isLeadInstructor: !!user?.is_lead_instructor,
      is_active: user?.is_active !== undefined ? !!user.is_active : true,
      category: user?.category || "",
      phone: user?.phone || "",
    },
  });

  const watchedRole = form.watch("role");
  const watchedRoles = form.watch("roles") || [];
  const activeRoles = form.watch("activeRoles") || [];

  const updateAssignedRoles = (nextRoles) => {
    const normalizedRoles = [...new Set(nextRoles)];
    const currentRoles = form.getValues("roles") || [];
    const currentActiveRoles = form.getValues("activeRoles") || [];
    const newlyAssigned = normalizedRoles.filter((role) => !currentRoles.includes(role));
    const nextActiveRoles = [...new Set([
      ...currentActiveRoles.filter((role) => normalizedRoles.includes(role)),
      ...newlyAssigned,
    ])];
    form.setValue("roles", normalizedRoles, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue("activeRoles", nextActiveRoles, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const updateRoleActive = (role, isActive) => {
    const current = form.getValues("activeRoles") || [];
    const nextActiveRoles = isActive
      ? [...new Set([...current, role])]
      : current.filter((item) => item !== role);
    form.setValue("activeRoles", nextActiveRoles, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleSubmit = async (data) => {
    try {
      setLoading(true);
      setSubmitError("");
      if (data.is_active && !(data.activeRoles || []).length) {
        throw new Error("An active account must have at least one active role.");
      }
      
      const userData = {
        email: data.email,
        name: data.name,
        role: data.role,
        roles: [...new Set([data.role, ...(data.roles || [])])],
        activeRoles: data.activeRoles || [],
        isLeadInstructor: data.isLeadInstructor,
        is_active: data.is_active,
        category: [data.role, ...(data.roles || [])].includes("STUDENT") ? (data.category || null) : null,
        phone: data.phone || null,
      };

      // Include password for new users
      if (!isEditing) {
        userData.password = data.password;
      }

      await onSubmit(userData);
    } catch (error) {
      console.error("Error submitting user:", error);
      setSubmitError(
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        "The user could not be updated. Review the fields and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitCurrentValues = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      const firstError = Object.keys(form.formState.errors)[0];
      if (firstError) form.setFocus(firstError);
      return;
    }
    await handleSubmit(form.getValues());
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
      case "RENTER":
        return "Can manage rental bookings, hours, and compliance documents";
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
      case "RENTER":
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitCurrentValues();
        }}
        className="space-y-6"
      >
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

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Used for SMS lesson notifications (optional)
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
                        required
                        minLength={6}
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
                    Primary Role
                  </FormLabel>
                  <Select
                    onValueChange={(role) => {
                      field.onChange(role);
                      updateAssignedRoles([...watchedRoles, role]);
                    }}
                    value={field.value}
                  >
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
                      <SelectItem value="RENTER">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Renter
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The preferred profile after sign-in when that role is active. {getRoleDescription(watchedRole)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
                  <FormLabel>Assigned Roles</FormLabel>
                  <FormDescription>
                    Assign access with the checkbox, then enable or pause each profile independently.
                  </FormDescription>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {["STUDENT", "INSTRUCTOR", "ADMIN", "MAINT", "RENTER"].map((role) => {
                      const checked = role === watchedRole || watchedRoles.includes(role);
                      return (
                        <div key={role} className="flex items-start gap-3 rounded-md border p-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-current"
                            checked={checked}
                            disabled={role === watchedRole}
                            onChange={(event) => {
                              updateAssignedRoles(event.target.checked
                                ? [...watchedRoles, role]
                                : watchedRoles.filter((item) => item !== role));
                            }}
                          />
                          <span>
                            <span className="flex items-center gap-2 text-sm font-medium">
                              {getRoleIcon(role)}
                              {role === "MAINT" ? "Maintenance" : role.charAt(0) + role.slice(1).toLowerCase()}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {getRoleDescription(role)}
                            </span>
                          </span>
                          <div className="ml-auto flex flex-col items-end gap-1 pl-2">
                            <Switch
                              type="button"
                              checked={checked && activeRoles.includes(role)}
                              disabled={!checked}
                              onCheckedChange={(isActive) => updateRoleActive(role, isActive)}
                              aria-label={`${role} profile active`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {checked && activeRoles.includes(role) ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage />
            </FormItem>

            {(watchedRole === "INSTRUCTOR" || watchedRoles.includes("INSTRUCTOR")) && (
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

            {(watchedRole === "STUDENT" || watchedRoles.includes("STUDENT")) && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Student Category
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PRIVATE_PILOT">Private Pilot</SelectItem>
                        <SelectItem value="INSTRUMENT">Instrument</SelectItem>
                        <SelectItem value="COMMERCIAL_PILOT">Commercial Pilot</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Training program the student is enrolled in
                    </FormDescription>
                    <FormMessage />
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
                        Account Active
                      </FormLabel>
                      <FormDescription>
                        When off, the user cannot log in under any role
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
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={submitCurrentValues}
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
