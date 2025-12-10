"use client";

import { format } from "date-fns";
import { Plane, BookOpen, User, Clock, MoreHorizontal, Eye, Edit, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

export function LessonsTable({ 
  lessons, 
  users, 
  aircraft, 
  onLessonClick, 
  onEditLesson, 
  onDeleteLesson, 
  onCompleteLesson 
}) {
  const { user } = useAuth();
  
  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.name : "Unknown";
  };

  const getAircraftTail = (aircraftId) => {
    if (!aircraftId) return "N/A";
    const ac = aircraft.find(a => a.id === aircraftId);
    return ac ? ac.tail_number : "Unknown";
  };

  const formatDateTime = (dateTime) => {
    return format(new Date(dateTime), "MMM dd, yyyy HH:mm");
  };

  const formatTime = (dateTime, timeString) => {
    // Use timeString if available (e.g., "09:00"), otherwise parse dateTime
    if (timeString) {
      // Convert 24-hour to 12-hour format
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return format(new Date(dateTime), "h:mm a");
  };

  const getStatusBadge = (status) => {
    const variants = {
      SCHEDULED: "default",
      COMPLETED: "secondary", 
      CANCELED: "outline"
    };

    const colors = {
      SCHEDULED: "text-blue-600 bg-blue-50 border-blue-200",
      COMPLETED: "text-green-600 bg-green-50 border-green-200",
      CANCELED: "text-gray-600 bg-gray-50 border-gray-200"
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  const getKindIcon = (kind) => {
    return kind === "FLIGHT" ? (
      <Plane className="h-4 w-4 text-purple-600" />
    ) : (
      <BookOpen className="h-4 w-4 text-orange-600" />
    );
  };

  if (lessons.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium">No lessons found</h3>
              <p className="text-muted-foreground">
                No lessons match your current filters. Try adjusting the filters or schedule a new lesson.
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
          <Clock className="h-5 w-5" />
          Lessons ({lessons.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons
                .sort((a, b) => new Date(b.start_at) - new Date(a.start_at)) // Most recent first
                .map((lesson) => (
                  <TableRow 
                    key={lesson.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onLessonClick(lesson)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getKindIcon(lesson.kind)}
                        <span className="font-medium text-sm">
                          {lesson.kind}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {format(new Date(lesson.start_at.split('T')[0]), "MMM dd, yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(lesson.start_at, lesson.start_time)} - {formatTime(lesson.end_at, lesson.end_time)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{getUserName(lesson.student_id)}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{getUserName(lesson.instructor_id)}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {lesson.aircraft_id ? (
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          <span>{getAircraftTail(lesson.aircraft_id)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-[200px]">
                        {lesson.lesson ? (
                          <div>
                            <div className="font-medium text-sm truncate">
                              {lesson.lesson}
                            </div>
                            {lesson.stage && (
                              <div className="text-xs text-muted-foreground truncate">
                                {lesson.stage}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No lesson specified</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(lesson.status)}
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
                              onLessonClick(lesson);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          
                          {/* RBAC: Only ADMIN or lesson's INSTRUCTOR can edit, complete, delete */}
                          {(user?.role === 'ADMIN' || (user?.role === 'INSTRUCTOR' && user?.id === lesson.instructor_id)) && (
                            <>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditLesson(lesson);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              
                              {lesson.status === "SCHEDULED" && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCompleteLesson(lesson);
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLesson(lesson);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
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
