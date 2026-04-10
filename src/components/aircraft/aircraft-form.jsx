"use client"

import { useState, useEffect, useMemo } from 'react';
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

export function AircraftForm({ aircraft, onSuccess, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!aircraft;

  const initialTach = useMemo(
    () => Number(aircraft?.tach_time ?? 0),
    [aircraft?.id, aircraft?.tach_time]
  );
  const initialHobbs = useMemo(
    () => Number(aircraft?.hobbs_time ?? 0),
    [aircraft?.id, aircraft?.hobbs_time]
  );

  const aircraftSchema = useMemo(() => {
    const base = z.object({
      tailNumber: z.string().min(1, 'Tail number is required').max(10, 'Tail number too long'),
      status: z.enum(['OK', 'HOLD', 'MAINTENANCE']),
      notes: z.string().optional(),
      tachTime: z.string().optional(),
      hobbsTime: z.string().optional(),
      meterJustification: z.string().optional(),
    });
    return base.superRefine((data, ctx) => {
      if (!isEditing) return;
      const t = parseFloat(String(data.tachTime ?? '').replace(',', '.'));
      const h = parseFloat(String(data.hobbsTime ?? '').replace(',', '.'));
      if (!Number.isFinite(t) || !Number.isFinite(h)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter valid numbers for tach and hobbs.',
          path: ['tachTime'],
        });
        return;
      }
      const changed =
        Math.abs(t - initialTach) > 1e-6 || Math.abs(h - initialHobbs) > 1e-6;
      if (changed && !String(data.meterJustification || '').trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Justification is required when changing current tach or hobbs.',
          path: ['meterJustification'],
        });
      }
    });
  }, [isEditing, initialTach, initialHobbs]);

  const form = useForm({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      tailNumber: aircraft?.tail_number || '',
      status: aircraft?.status || 'OK',
      notes: aircraft?.notes || '',
      tachTime: aircraft?.tach_time != null ? String(aircraft.tach_time) : '0',
      hobbsTime: aircraft?.hobbs_time != null ? String(aircraft.hobbs_time) : '0',
      meterJustification: '',
    },
  });

  useEffect(() => {
    if (!aircraft?.id) return;
    form.reset({
      tailNumber: aircraft.tail_number || '',
      status: aircraft.status || 'OK',
      notes: aircraft.notes || '',
      tachTime: String(aircraft.tach_time ?? 0),
      hobbsTime: String(aircraft.hobbs_time ?? 0),
      meterJustification: '',
    });
  }, [
    aircraft?.id,
    aircraft?.tail_number,
    aircraft?.status,
    aircraft?.notes,
    aircraft?.tach_time,
    aircraft?.hobbs_time,
    form,
  ]);

  const [wTach, wHobbs] = form.watch(['tachTime', 'hobbsTime']);
  const metersDirty =
    isEditing &&
    (Math.abs((parseFloat(String(wTach ?? '').replace(',', '.')) || 0) - initialTach) > 1e-6 ||
      Math.abs((parseFloat(String(wHobbs ?? '').replace(',', '.')) || 0) - initialHobbs) > 1e-6);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        const payload = {
          tailNumber: data.tailNumber,
          status: data.status,
          notes: data.notes ?? '',
          tachTime: parseFloat(String(data.tachTime ?? '').replace(',', '.')),
          hobbsTime: parseFloat(String(data.hobbsTime ?? '').replace(',', '.')),
        };
        if (String(data.meterJustification || '').trim()) {
          payload.meterJustification = data.meterJustification.trim();
        }
        await aircraftAPI.update(aircraft.id, payload);
      } else {
        await aircraftAPI.create({
          tailNumber: data.tailNumber,
          status: data.status,
          notes: data.notes,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving aircraft:', error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to save aircraft';
      toast.error(typeof msg === 'string' ? msg : 'Failed to save aircraft');
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

            {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tachTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Tach (hours)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hobbsTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Hobbs (hours)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {isEditing && metersDirty && (
              <FormField
                control={form.control}
                name="meterJustification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justification *</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        placeholder="Explain the meter correction, replacement, or calibration"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Lower readings are allowed for admin or maintenance corrections when hardware is replaced.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
