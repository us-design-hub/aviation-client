"use client"

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { GoldenButton } from '@/components/ui/golden-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { aircraftAPI } from '@/lib/api';
import { toast } from 'sonner';

const aircraftSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required').max(10, 'Tail number too long'),
  status: z.enum(['OK', 'HOLD', 'MAINTENANCE']),
  notes: z.string().optional(),
});



export function AircraftForm({ aircraft, onSuccess, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!aircraft;

  const form = useForm({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      tailNumber: aircraft?.tail_number || '',
      status: aircraft?.status || 'OK',
      notes: aircraft?.notes || '',
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await aircraftAPI.update(aircraft.id, data);
      } else {
        await aircraftAPI.create(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving aircraft:', error);
      toast.error('Failed to save aircraft');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Aircraft Information */}
        <Card>
          <CardHeader>
            <CardTitle>Aircraft Information</CardTitle>
            <CardDescription>
              Basic aircraft details supported by the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tailNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tail Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="N123AB" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OK">Active</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="HOLD">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="Enter any additional notes about this aircraft..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <GoldenButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Aircraft' : 'Add Aircraft')}
          </GoldenButton>
        </div>
      </form>
    </Form>
  );
}
