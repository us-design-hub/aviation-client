"use client"

import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, Plane, User, Calendar, FileText, Shield, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function SquawksDetails({ squawk, aircraft, onResolve }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status) => {
    if (status === "OPEN") {
      return (
        <Badge variant="destructive" className="gap-2 px-3 py-1">
          <Clock className="h-4 w-4" />
          Open Issue
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-2 px-3 py-1 bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-4 w-4" />
          Resolved
        </Badge>
      );
    }
  };

  const getStatusIcon = (status) => {
    if (status === "OPEN") {
      return <AlertTriangle className="h-8 w-8 text-red-500" />;
    } else {
      return <CheckCircle className="h-8 w-8 text-green-500" />;
    }
  };

  const getSeverityColor = (description) => {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('safety') || lowerDesc.includes('emergency') || lowerDesc.includes('critical')) {
      return 'border-red-500 bg-red-50';
    } else if (lowerDesc.includes('inoperative') || lowerDesc.includes('failed') || lowerDesc.includes('broken')) {
      return 'border-orange-500 bg-orange-50';
    } else {
      return 'border-yellow-500 bg-yellow-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SheetHeader className="sticky top-0 bg-background pb-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(squawk.status)}
            <div>
              <SheetTitle className="text-xl">Squawk Details</SheetTitle>
              <SheetDescription>
                Aircraft issue reported on {formatDate(squawk.created_at)}
              </SheetDescription>
            </div>
          </div>
          {getStatusBadge(squawk.status)}
        </div>
      </SheetHeader>

      {/* Status & Actions */}
      {squawk.status === "OPEN" && onResolve && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Ready to Resolve?</p>
                  <p className="text-sm text-green-700">Mark this squawk as resolved once fixed</p>
                </div>
              </div>
              <Button
                onClick={onResolve}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Resolved
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue Description */}
      <Card className={`border-2 ${getSeverityColor(squawk.description)}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Issue Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{squawk.description}</p>
        </CardContent>
      </Card>

      {/* Aircraft Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Aircraft Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Tail Number</div>
              <div className="font-medium text-lg">
                {squawk.tail_number || "Unknown Aircraft"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Aircraft Status</div>
              <Badge variant={squawk.aircraft_status === "AVAILABLE" ? "secondary" : "destructive"}>
                {squawk.aircraft_status || "Unknown"}
              </Badge>
            </div>
          </div>
          
          {aircraft && aircraft.notes && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Aircraft Notes</div>
              <p className="text-sm bg-muted p-3 rounded-md">{aircraft.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Squawk Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Squawk ID & Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Squawk Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Squawk ID</div>
              <div className="font-medium">
                {squawk.id.slice(-12)}
              </div>
              <div className="text-sm text-muted-foreground">
                Issue identifier
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Status</div>
              {getStatusBadge(squawk.status)}
            </div>
          </CardContent>
        </Card>

        {/* People Involved */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              People Involved
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reported By */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {squawk.reported_by_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">
                  {squawk.reported_by_name || 'Unknown User'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Reported this issue
                </div>
              </div>
            </div>

            {/* Resolved By */}
            {squawk.status === "RESOLVED" && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {squawk.resolved_by_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">
                      {squawk.resolved_by_name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Resolved this issue
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Created */}
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-full mt-1">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Issue Reported</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(squawk.created_at)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Reported by {squawk.reported_by_name || 'Unknown User'}
                </div>
              </div>
            </div>

            {/* Resolved */}
            {squawk.status === "RESOLVED" && squawk.resolved_at && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 rounded-full mt-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Issue Resolved</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(squawk.resolved_at)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Resolved by {squawk.resolved_by_name || 'Unknown User'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
