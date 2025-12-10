"use client"

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AlertTriangle, Plane, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Form schema
const squawkSchema = z.object({
  aircraftId: z.string().min(1, "Please select an aircraft"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters"),
});

export function SquawksForm({ aircraft, onSubmit, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(squawkSchema),
    defaultValues: {
      aircraftId: "",
      description: "",
    },
  });

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data.aircraftId, {
        description: data.description.trim(),
      });
      form.reset();
    } catch (error) {
      // Error handling is done in parent component
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAircraft = aircraft.find(ac => ac.id === form.watch("aircraftId"));

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-full">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Report Aircraft Squawk</h3>
          <p className="text-sm text-muted-foreground">
            Document an issue or defect that requires attention
          </p>
        </div>
      </div>

      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Aircraft Selection */}
          <FormField
            control={form.control}
            name="aircraftId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Aircraft
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select aircraft to report squawk for" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {aircraft.map((ac) => (
                      <SelectItem key={ac.id} value={ac.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ac.tail_number}</span>
                          <Badge variant={ac.status === "AVAILABLE" ? "secondary" : "destructive"} className="text-xs">
                            {ac.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Selected Aircraft Info */}
          {selectedAircraft && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Plane className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{selectedAircraft.tail_number}</span>
                      <Badge variant={selectedAircraft.status === "AVAILABLE" ? "secondary" : "destructive"}>
                        {selectedAircraft.status}
                      </Badge>
                    </div>
                    {selectedAircraft.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedAircraft.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Issue Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the issue in detail... (e.g., 'Engine runs rough during taxi', 'Landing light inoperative', 'Radio static on COM1')"
                    className="min-h-[120px] resize-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Be specific and include when the issue occurs</span>
                  <span>{field.value.length}/500 characters</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Guidelines */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Reporting Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Be specific about when and where the issue occurs</li>
                <li>• Include any error messages or unusual sounds</li>
                <li>• Note if the issue affects flight safety</li>
                <li>• Mention any troubleshooting already attempted</li>
              </ul>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Reporting...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Squawk
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
