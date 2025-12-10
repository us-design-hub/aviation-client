"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, User, Plane, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { availabilityAPI, usersAPI, aircraftAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

const availabilitySchema = z.object({
  type: z.enum(["user", "aircraft"], {
    required_error: "Please select a type",
  }),
  userId: z.string().optional(),
  aircraftId: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required", 
  }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().default(true),
  recurring: z.boolean().default(false),
  recurringType: z.enum(["daily", "weekly", "monthly"]).optional(),
  reason: z.string().min(1, "Reason is required"),
}).refine((data) => {
  if (data.type === "user" && !data.userId) {
    return false;
  }
  if (data.type === "aircraft" && !data.aircraftId) {
    return false;
  }
  return true;
}, {
  message: "Please select a resource",
  path: ["userId"],
}).refine((data) => {
  // Allow same day if times are different
  if (data.startDate.toDateString() === data.endDate.toDateString()) {
    // Same day - check times if not all day
    if (!data.allDay && data.startTime && data.endTime) {
      return data.startTime < data.endTime;
    }
    return true; // All day on same day is valid
  }
  return data.startDate < data.endDate;
}, {
  message: "End time must be after start time",
  path: ["endDate"],
}).refine((data) => {
  if (!data.allDay && (!data.startTime || !data.endTime)) {
    return false;
  }
  return true;
}, {
  message: "Start and end times are required when not all day",
  path: ["startTime"],
});

export function AvailabilityForm({ 
  availability, 
  initialValues,
  users: propUsers = [],
  aircraft: propAircraft = [],
  onSubmit, 
  onCancel,
  loading = false 
}) {
  const [users, setUsers] = useState(propUsers);
  const [aircraft, setAircraft] = useState(propAircraft);
  const [loadingData, setLoadingData] = useState(true);
  
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      type: availability?.type || initialValues?.type || "user",
      userId: availability?.user_id?.toString() || initialValues?.userId?.toString() || (user?.role !== 'ADMIN' ? user?.id?.toString() : ""),
      aircraftId: availability?.aircraft_id?.toString() || initialValues?.aircraftId?.toString() || "",
      startDate: availability?.start_date ? parseISO(availability.start_date) : (initialValues?.startDate ? new Date(initialValues.startDate) : new Date()),
      endDate: availability?.end_date ? parseISO(availability.end_date) : (initialValues?.endDate || initialValues?.startDate ? new Date(initialValues.endDate || initialValues.startDate) : new Date()),
      startTime: availability?.start_time || initialValues?.startTime || "",
      endTime: availability?.end_time || initialValues?.endTime || "",
      allDay: availability ? (!availability?.start_time && !availability?.end_time) : (initialValues?.allDay !== undefined ? initialValues.allDay : true),
      recurring: availability?.recurring || initialValues?.recurring || false,
      recurringType: availability?.recurring_type || initialValues?.recurringType || "weekly",
      reason: availability?.reason || initialValues?.reason || "",
    },
  });

  const watchType = form.watch("type");
  const watchAllDay = form.watch("allDay");
  const watchRecurring = form.watch("recurring");

  // Reset form when initialValues changes (e.g., clicking a time slot)
  useEffect(() => {
    if (initialValues && !availability) {
      form.reset({
        type: initialValues.type || "user",
        userId: initialValues.userId?.toString() || (user?.role !== 'ADMIN' ? user?.id?.toString() : ""),
        aircraftId: initialValues.aircraftId?.toString() || "",
        startDate: initialValues.startDate ? new Date(initialValues.startDate) : new Date(),
        endDate: initialValues.endDate || initialValues.startDate ? new Date(initialValues.endDate || initialValues.startDate) : new Date(),
        startTime: initialValues.startTime || "",
        endTime: initialValues.endTime || "",
        allDay: initialValues.allDay !== undefined ? initialValues.allDay : true,
        recurring: initialValues.recurring || false,
        recurringType: initialValues.recurringType || "weekly",
        reason: initialValues.reason || "",
      });
    }
  }, [initialValues, availability, form, user]);

  // Load users and aircraft with role-based access
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        
        // Wait for user to be loaded
        if (!user?.role) {
          return;
        }
        
        // If we have props data, use it first
        if (propUsers.length > 0) {
          setUsers(propUsers);
        } else if (user?.role !== 'ADMIN') {
          // For non-admin users, create a users array with just their own data
          const currentUserData = [{
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            role: user.role
          }];
          setUsers(currentUserData);
          
          // Auto-select the current user if no user is selected yet
          if (!form.getValues('userId') && user?.id) {
            form.setValue('userId', user.id.toString());
          }
        }
        
        if (propAircraft.length > 0) {
          setAircraft(propAircraft);
        }
        
        // Only fetch if we don't have prop data
        if ((propUsers.length === 0 && user?.role === 'ADMIN') || propAircraft.length === 0) {
          const apiCalls = [];
          
          // Only ADMIN can fetch users data - RBAC FIXED
          if (user?.role === 'ADMIN' && propUsers.length === 0) {
            apiCalls.push(usersAPI.getAll());
          } else {
            if (propUsers.length === 0) {
              apiCalls.push(Promise.resolve({ data: [] }));
            }
          }
          
          // All roles can access aircraft
          if (propAircraft.length === 0) {
            apiCalls.push(aircraftAPI.getAll());
          }
          
          if (apiCalls.length > 0) {
            const results = await Promise.allSettled(apiCalls);
            
            let resultIndex = 0;
            
            // Handle users result
            if (propUsers.length === 0) {
              const usersRes = results[resultIndex++];
              if (usersRes.status === 'fulfilled') {
                setUsers(usersRes.value.data || []);
              } else {
                setUsers([]);
              }
            }
            
            // Handle aircraft result
            if (propAircraft.length === 0) {
              const aircraftRes = results[resultIndex++];
              if (aircraftRes.status === 'fulfilled') {
                setAircraft(aircraftRes.value.data || []);
              }
            }
          }
        }
      } catch (error) {
        console.error("AvailabilityForm Error loading data:", error);
        toast.error("Failed to load users and aircraft");
      } finally {
        setLoadingData(false);
      }
    };

    if (user?.role) {
      loadData();
    }
  }, [user?.role, propUsers, propAircraft]);

  // Generate RFC 5545 rrule string
  const generateRRule = (recurringType, startDate) => {
    if (!recurringType) return null;
    
    const freq = recurringType.toUpperCase(); // DAILY, WEEKLY, MONTHLY
    const dtstart = format(startDate, "yyyyMMdd'T'000000'Z'");
    
    // Generate rrule string (simplified, no end date for now)
    return `DTSTART:${dtstart}\nRRULE:FREQ=${freq};COUNT=52`; // 52 occurrences (1 year for weekly, etc.)
  };

  const handleSubmit = async (data) => {
    try {
      // Create proper datetime strings for the server
      const startDateTime = data.allDay 
        ? `${format(data.startDate, "yyyy-MM-dd")}T00:00:00Z`
        : `${format(data.startDate, "yyyy-MM-dd")}T${data.startTime}:00Z`;
      
      const endDateTime = data.allDay 
        ? `${format(data.endDate, "yyyy-MM-dd")}T23:59:59Z`
        : `${format(data.endDate, "yyyy-MM-dd")}T${data.endTime}:00Z`;

      const availabilityData = {
        type: data.type,
        user_id: data.type === "user" ? data.userId : null,
        aircraft_id: data.type === "aircraft" ? data.aircraftId : null,
        start_date: startDateTime,
        end_date: endDateTime,
        start_time: data.allDay ? null : data.startTime,
        end_time: data.allDay ? null : data.endTime,
        recurring: data.recurring,
        recurring_type: data.recurring ? data.recurringType : null,
        rrule: data.recurring ? generateRRule(data.recurringType, data.startDate) : null,
        reason: data.reason,
      };

      await onSubmit(availabilityData);
    } catch (error) {
      console.error("Error submitting availability:", error);
    }
  };

  if (loadingData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Type Selection */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      User Unavailability
                    </div>
                  </SelectItem>
                  <SelectItem value="aircraft">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Aircraft Maintenance
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Resource Selection */}
        {watchType === "user" && (
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User</FormLabel>
                {users.length === 1 && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Setting availability for your own account
                  </p>
                )}
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={users.length === 1 ? "Your availability" : "Select a user"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{user.name || user.email}</span>
                          <Badge variant="outline">{user.role}</Badge>
                          {users.length === 1 && <Badge variant="secondary">You</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchType === "aircraft" && (
          <FormField
            control={form.control}
            name="aircraftId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aircraft</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an aircraft" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {aircraft.map((ac) => (
                      <SelectItem key={ac.id} value={ac.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{ac.tail_number}</span>
                          <Badge variant="outline">{ac.status}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* All Day Toggle */}
        <FormField
          control={form.control}
          name="allDay"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">All Day</FormLabel>
                <FormDescription>
                  This availability applies to the entire day
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

        {/* Time Range */}
        {!watchAllDay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Recurring */}
        <FormField
          control={form.control}
          name="recurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Recurring</FormLabel>
                <FormDescription>
                  Repeat this availability on a schedule
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

        {/* Recurring Type */}
        {watchRecurring && (
          <FormField
            control={form.control}
            name="recurringType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recurring Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recurring type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Reason */}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the reason for unavailability..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a clear reason for this availability period
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>}
            {availability ? "Update" : "Create"} Availability
          </Button>
        </div>
      </form>
    </Form>
  );
}
