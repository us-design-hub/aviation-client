"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plane, Wrench } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const maintenanceSchema = z.object({
  aircraft_id: z.string().min(1, "Aircraft is required"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  due_date: z.date().optional(),
  due_hobbs: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Due hours must be a valid number"),
  status: z.enum(['POSTED', 'NEARING', 'DUE', 'COMPLETED']).default('POSTED'),
});

export function MaintenanceForm({ 
  maintenance, 
  aircraft, 
  onSubmit, 
  onCancel 
}) {
  const [loading, setLoading] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      aircraft_id: maintenance?.aircraft_id || "",
      title: maintenance?.title || "",
      due_date: maintenance?.due_date ? new Date(maintenance.due_date) : undefined,
      due_hobbs: maintenance?.due_hobbs ? maintenance.due_hobbs.toString() : "",
      status: maintenance?.status || 'POSTED',
    },
  });

  const selectedAircraft = aircraft.find(ac => ac.id === form.watch('aircraft_id'));

  const handleSubmit = async (data) => {
    try {
      setLoading(true);
      
      const submitData = {
        title: data.title,
        dueDate: data.due_date ? data.due_date.toISOString() : null,
        dueHobbs: data.due_hobbs ? parseFloat(data.due_hobbs) : null,
        status: data.status,
      };

      if (maintenance) {
        // Update existing maintenance item
        await onSubmit(submitData);
      } else {
        // Create new maintenance item
        await onSubmit(data.aircraft_id, submitData);
      }
    } catch (error) {
      // Error is handled by the parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Aircraft Selection */}
        {!maintenance && (
          <FormField
            control={form.control}
            name="aircraft_id"
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
                      <SelectItem key={ac.id} value={ac.id}>
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          <span className="font-medium">{ac.tail_number}</span>
                          <span className="text-muted-foreground">
                            {ac.make} {ac.model}
                          </span>
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

        {/* Show selected aircraft info for editing */}
        {maintenance && selectedAircraft && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Aircraft Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{selectedAircraft.tail_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAircraft.make} {selectedAircraft.model}
                  </div>
                </div>
                <Badge variant="outline">
                  {selectedAircraft.hobbs_time || 0}h Hobbs
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maintenance Item</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., 100-hour inspection, Oil change, Annual inspection"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Describe the maintenance task or inspection required
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Due Date */}
        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date (Optional)</FormLabel>
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
                        <span>Pick a due date</span>
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
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                When this maintenance is due (calendar-based)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Due Hobbs Hours */}
        <FormField
          control={form.control}
          name="due_hobbs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due at Hobbs Hours (Optional)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type="number"
                    step="0.1"
                    placeholder="e.g., 1250.0"
                    {...field} 
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                    hours
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                {selectedAircraft 
                  ? `When this maintenance is due (flight hours). Current: ${selectedAircraft.hobbs_time || 0}h`
                  : "When this maintenance is due (flight hours-based)"
                }
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status (only for editing) */}
        {maintenance && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="POSTED">Posted</SelectItem>
                    <SelectItem value="NEARING">Nearing</SelectItem>
                    <SelectItem value="DUE">Due</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Current status of this maintenance item
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-golden-gradient hover:bg-golden-gradient/90"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {maintenance ? "Updating..." : "Creating..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                {maintenance ? "Update Maintenance" : "Create Maintenance"}
              </div>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
