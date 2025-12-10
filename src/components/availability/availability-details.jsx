"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Calendar, 
  Clock, 
  User, 
  Plane, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Repeat,
  FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

export function AvailabilityDetails({ 
  availability, 
  onEdit, 
  onDelete, 
  onClose 
}) {
  const { user } = useAuth();
  if (!availability) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No availability selected</p>
        </div>
      </div>
    );
  }

  const isUserAvailability = availability.type === 'user';
  const resourceName = isUserAvailability ? 
    (availability.user_name || `User ${availability.user_id}`) : 
    (availability.aircraft_tail || `Aircraft ${availability.aircraft_id}`);
  // Extract just the date part to avoid timezone conversion issues
  const startDate = availability.start_date ? parseISO(availability.start_date.split('T')[0]) : null;
  const endDate = availability.end_date ? parseISO(availability.end_date.split('T')[0]) : null;

  return (
    <div className="space-y-6 pb-6">
      <SheetHeader className="sticky top-0 bg-background pb-4 border-b z-10">
        <SheetTitle className="flex items-center gap-2">
          {isUserAvailability ? (
            <User className="h-5 w-5 text-blue-600" />
          ) : (
            <Plane className="h-5 w-5 text-green-600" />
          )}
          {resourceName} - Availability
        </SheetTitle>
        <SheetDescription>
          {startDate && endDate ? `${format(startDate, 'PPP')} - ${format(endDate, 'PPP')}` : 'No dates specified'}
        </SheetDescription>
      </SheetHeader>

      {/* Status and Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status & Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={isUserAvailability ? 'destructive' : 'secondary'} className="text-sm">
                {isUserAvailability ? 'User Unavailable' : 'Aircraft Maintenance'}
              </Badge>
            </div>
            
            {availability.recurring && (
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">
                  Recurring {availability.recurring_type}
                </Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Resource</div>
              <div className="flex items-center gap-2 mt-1">
                {isUserAvailability ? (
                  <User className="h-4 w-4 text-blue-600" />
                ) : (
                  <Plane className="h-4 w-4 text-green-600" />
                )}
                <span className="font-medium">{resourceName}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div className="mt-1">
                {isUserAvailability ? 'Personal Unavailability' : 'Aircraft Maintenance'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Start Date</div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{startDate ? format(startDate, 'PPP') : 'No start date'}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">End Date</div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{endDate ? format(endDate, 'PPP') : 'No end date'}</span>
              </div>
            </div>
          </div>

          {availability.start_time && availability.end_time ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Start Time</div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{availability.start_time}</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">End Time</div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{availability.end_time}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Duration</div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>All Day</span>
              </div>
            </div>
          )}

          {availability.recurring && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Recurring Pattern</div>
              <div className="flex items-center gap-2 mt-1">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{availability.recurring_type}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reason */}
      {availability.reason && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{availability.reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Created</div>
              <div className="mt-1">
                {format(parseISO(availability.created_at), 'PPp')}
              </div>
            </div>

            {availability.updated_at && (
              <div>
                <div className="font-medium text-muted-foreground">Last Updated</div>
                <div className="mt-1">
                  {format(parseISO(availability.updated_at), 'PPp')}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions - RBAC: Only ADMIN or owner can edit/delete */}
      {(user?.role === 'ADMIN' || user?.id === availability.user_id) && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onEdit?.(availability)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete?.(availability)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
