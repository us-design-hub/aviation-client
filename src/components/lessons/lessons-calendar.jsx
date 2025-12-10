"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plane, BookOpen, Clock, User, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { WeekScheduleView } from "@/components/ui/schedule-view";

export function LessonsCalendar({ 
  lessons, 
  users, 
  aircraft, 
  onLessonClick, 
  onEditLesson, 
  onDeleteLesson, 
  onCompleteLesson,
  onTimeSlotClick 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('schedule'); // 'day', 'week', 'month', or 'schedule'

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  // Generate calendar grid
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const dayLessons = lessons.filter(lesson => 
        isSameDay(new Date(lesson.start_at), day)
      );

      days.push(
        <CalendarDay
          key={day}
          day={day}
          formattedDate={formattedDate}
          isCurrentMonth={isSameMonth(day, monthStart)}
          isSelected={selectedDate && isSameDay(day, selectedDate)}
          isToday={isSameDay(day, new Date())}
          lessons={dayLessons}
          users={users}
          aircraft={aircraft}
          user={user}
          onClick={() => setSelectedDate(cloneDay)}
          onLessonClick={onLessonClick}
          onEditLesson={onEditLesson}
          onDeleteLesson={onDeleteLesson}
          onCompleteLesson={onCompleteLesson}
        />
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day}>
        {days}
      </div>
    );
    days = [];
  }

  // Handle time slot click for creating new lesson
  const handleTimeSlotClickInternal = ({ date, hour, resourceId }) => {
    // Determine resource type - check if it's an aircraft or instructor
    let resourceType = null;
    if (resourceId) {
      if (aircraft.find(a => a.id === resourceId)) {
        resourceType = 'aircraft';
      } else if (users.find(u => u.id === resourceId && (u.role === 'INSTRUCTOR' || u.role === 'ADMIN'))) {
        resourceType = 'instructor';
      }
    }
    
    // Call parent handler
    if (onTimeSlotClick) {
      onTimeSlotClick({ 
        date, 
        hour, 
        resourceId, 
        resourceType 
      });
    }
  };

  // Custom lesson event renderer for schedule view
  const renderLessonEvent = (lesson) => {
    const getUserName = (userId) => {
      const u = users.find(user => user.id === userId);
      return u ? u.name.split(' ')[0] : "Unknown";
    };

    const getAircraftTail = (aircraftId) => {
      if (!aircraftId) return null;
      const ac = aircraft.find(a => a.id === aircraftId);
      return ac ? ac.tail_number : null;
    };

    // Use start_time/end_time if available, otherwise extract from date
    const startTime = lesson.start_time || format(new Date(lesson.start_at), "h:mm a");
    const endTime = lesson.end_time || format(new Date(lesson.end_at), "h:mm a");

    return (
      <div
        className={cn(
          "h-full p-2 rounded border text-xs overflow-hidden",
          "hover:shadow-md transition-shadow cursor-pointer group",
          lesson.kind === "FLIGHT" && "bg-purple-100 border-purple-300 text-purple-900",
          lesson.kind === "GROUND" && "bg-orange-100 border-orange-300 text-orange-900",
          lesson.status === "COMPLETED" && "opacity-70 bg-gray-100 border-gray-300 text-gray-600",
          lesson.status === "CANCELED" && "opacity-50"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            {lesson.kind === "FLIGHT" ? (
              <Plane className="h-3 w-3" />
            ) : (
              <BookOpen className="h-3 w-3" />
            )}
            <span className="font-semibold truncate">
              {getUserName(lesson.student_id)}
            </span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLessonClick(lesson); }}>
                View Details
              </DropdownMenuItem>
              {(user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditLesson(lesson); }}>
                    Edit
                  </DropdownMenuItem>
                  {lesson.status === "SCHEDULED" && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCompleteLesson(lesson); }}>
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDeleteLesson(lesson); }}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="text-[10px] opacity-75 truncate">
          {startTime} - {endTime}
        </div>
        
        {lesson.aircraft_id && getAircraftTail(lesson.aircraft_id) && (
          <div className="text-[10px] opacity-75 truncate flex items-center gap-1">
            <Plane className="h-2 w-2" />
            {getAircraftTail(lesson.aircraft_id)}
          </div>
        )}
        
        {lesson.lesson && (
          <div className="text-[10px] opacity-75 truncate mt-1">
            {lesson.lesson}
          </div>
        )}
        
        <Badge variant="outline" className="text-[9px] h-4 mt-1">
          {lesson.status}
        </Badge>
      </div>
    );
  };

  // Filter instructors only
  const instructors = users.filter(u => u.role === 'INSTRUCTOR' || u.role === 'ADMIN');

  // Render different views
  if (view === 'schedule') {
    // Schedule view - Instructor rows (FlightCircle style)
    // Default to day view
    return (
      <WeekScheduleView
        currentDate={currentDate}
        events={lessons}
        onEventClick={onLessonClick}
        onTimeSlotClick={handleTimeSlotClickInternal}
        onDateChange={setCurrentDate}
        view="day"
        onViewChange={setView}
        renderEvent={renderLessonEvent}
        startHour={6}
        endHour={22}
        resources={instructors}
        showResourceColumns={true}
      />
    );
  } else if (view === 'day' || view === 'week') {
    return (
      <WeekScheduleView
        currentDate={currentDate}
        events={lessons}
        onEventClick={onLessonClick}
        onTimeSlotClick={handleTimeSlotClickInternal}
        onDateChange={setCurrentDate}
        view={view}
        onViewChange={setView}
        renderEvent={renderLessonEvent}
        startHour={6}
        endHour={22}
      />
    );
  }

  // Month view (existing calendar)
  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold w-48">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-0">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="p-4 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="divide-y">
            {rows}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <SelectedDateDetails
          date={selectedDate}
          lessons={lessons.filter(lesson => 
            isSameDay(new Date(lesson.start_at), selectedDate)
          )}
          users={users}
          aircraft={aircraft}
          user={user}
          onLessonClick={onLessonClick}
          onEditLesson={onEditLesson}
          onDeleteLesson={onDeleteLesson}
          onCompleteLesson={onCompleteLesson}
        />
      )}
    </div>
  );
}

function CalendarDay({ 
  day, 
  formattedDate, 
  isCurrentMonth, 
  isSelected, 
  isToday, 
  lessons, 
  users,
  aircraft,
  user,
  onClick, 
  onLessonClick,
  onEditLesson,
  onDeleteLesson,
  onCompleteLesson
}) {
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : "Unknown";
  };

  const getAircraftTail = (aircraftId) => {
    if (!aircraftId) return null;
    const ac = aircraft.find(a => a.id === aircraftId);
    return ac ? ac.tail_number : "Unknown";
  };

  return (
    <div
      className={cn(
        "min-h-[120px] p-2 border-r last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors",
        !isCurrentMonth && "text-muted-foreground bg-muted/20",
        isSelected && "bg-primary/10",
        isToday && "bg-blue-50 border-blue-200"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-sm font-medium",
          isToday && "text-blue-600 font-bold"
        )}>
          {formattedDate}
        </span>
        {isToday && (
          <Badge variant="secondary" className="text-xs">
            Today
          </Badge>
        )}
      </div>
      
      <div className="space-y-1">
        {lessons.slice(0, 3).map((lesson) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            users={users}
            aircraft={aircraft}
            user={user}
            onLessonClick={onLessonClick}
            onEditLesson={onEditLesson}
            onDeleteLesson={onDeleteLesson}
            onCompleteLesson={onCompleteLesson}
          />
        ))}
        
        {lessons.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{lessons.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

function LessonItem({ 
  lesson, 
  users, 
  aircraft, 
  user,
  onLessonClick, 
  onEditLesson, 
  onDeleteLesson, 
  onCompleteLesson 
}) {
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name.split(' ')[0] : "Unknown"; // First name only for space
  };

  const getAircraftTail = (aircraftId) => {
    if (!aircraftId) return null;
    const ac = aircraft.find(a => a.id === aircraftId);
    return ac ? ac.tail_number : "Unknown";
  };

  const startTime = format(new Date(lesson.start_at), "HH:mm");
  const endTime = format(new Date(lesson.end_at), "HH:mm");

  const handleClick = (e) => {
    e.stopPropagation();
    onLessonClick(lesson);
  };

  const handleAction = (e, action) => {
    e.stopPropagation();
    action(lesson);
  };

  return (
    <div
      className={cn(
        "text-xs p-2 rounded border cursor-pointer hover:shadow-sm transition-shadow",
        lesson.status === "COMPLETED" && "bg-green-50 border-green-200",
        lesson.status === "SCHEDULED" && "bg-blue-50 border-blue-200",
        lesson.status === "CANCELED" && "bg-gray-50 border-gray-200",
        lesson.kind === "FLIGHT" && "border-l-4 border-l-purple-500",
        lesson.kind === "GROUND" && "border-l-4 border-l-orange-500"
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          {lesson.kind === "FLIGHT" ? (
            <Plane className="h-3 w-3" />
          ) : (
            <BookOpen className="h-3 w-3" />
          )}
          <span className="font-medium">
            {startTime}-{endTime}
          </span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleAction(e, onLessonClick)}>
              View Details
            </DropdownMenuItem>
            
            {/* RBAC: Only ADMIN and INSTRUCTOR can edit, complete, delete */}
            {(user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') && (
              <>
                <DropdownMenuItem onClick={(e) => handleAction(e, onEditLesson)}>
                  Edit
                </DropdownMenuItem>
                {lesson.status === "SCHEDULED" && (
                  <DropdownMenuItem onClick={(e) => handleAction(e, onCompleteLesson)}>
                    Mark Complete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={(e) => handleAction(e, onDeleteLesson)}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{getUserName(lesson.student_id)}</span>
        </div>
        
        {lesson.aircraft_id && (
          <div className="flex items-center gap-1">
            <Plane className="h-3 w-3" />
            <span>{getAircraftTail(lesson.aircraft_id)}</span>
          </div>
        )}
        
        {lesson.lesson && (
          <div className="text-muted-foreground truncate">
            {lesson.lesson}
          </div>
        )}
        
        <Badge 
          variant={lesson.status === "COMPLETED" ? "secondary" : "outline"} 
          className="text-xs"
        >
          {lesson.status}
        </Badge>
      </div>
    </div>
  );
}

function SelectedDateDetails({ 
  date, 
  lessons, 
  users, 
  aircraft, 
  user,
  onLessonClick, 
  onEditLesson, 
  onDeleteLesson, 
  onCompleteLesson 
}) {
  if (lessons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {format(date, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No lessons scheduled for this date.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {format(date, "EEEE, MMMM d, yyyy")}
        </CardTitle>
        <p className="text-muted-foreground">
          {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} scheduled
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lessons
            .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
            .map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                users={users}
                aircraft={aircraft}
                user={user}
                onLessonClick={onLessonClick}
                onEditLesson={onEditLesson}
                onDeleteLesson={onDeleteLesson}
                onCompleteLesson={onCompleteLesson}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LessonCard({ 
  lesson, 
  users, 
  aircraft, 
  user,
  onLessonClick, 
  onEditLesson, 
  onDeleteLesson, 
  onCompleteLesson 
}) {
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : "Unknown";
  };

  const getAircraftTail = (aircraftId) => {
    if (!aircraftId) return null;
    const ac = aircraft.find(a => a.id === aircraftId);
    return ac ? ac.tail_number : "Unknown";
  };

  const startTime = format(new Date(lesson.start_at), "HH:mm");
  const endTime = format(new Date(lesson.end_at), "HH:mm");

  return (
    <div
      className={cn(
        "p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow",
        lesson.status === "COMPLETED" && "bg-green-50 border-green-200",
        lesson.status === "SCHEDULED" && "bg-blue-50 border-blue-200",
        lesson.status === "CANCELED" && "bg-gray-50 border-gray-200"
      )}
      onClick={() => onLessonClick(lesson)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {lesson.kind === "FLIGHT" ? (
              <Plane className="h-4 w-4 text-purple-600" />
            ) : (
              <BookOpen className="h-4 w-4 text-orange-600" />
            )}
            <span className="font-medium">
              {lesson.kind} - {startTime} to {endTime}
            </span>
            <Badge variant={lesson.status === "COMPLETED" ? "secondary" : "outline"}>
              {lesson.status}
            </Badge>
          </div>
          
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>Student: {getUserName(lesson.student_id)}</div>
            <div>Instructor: {getUserName(lesson.instructor_id)}</div>
            {lesson.aircraft_id && (
              <div>Aircraft: {getAircraftTail(lesson.aircraft_id)}</div>
            )}
            {lesson.lesson && <div>Lesson: {lesson.lesson}</div>}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* All users can view details */}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLessonClick(lesson); }}>
              View Details
            </DropdownMenuItem>
            
            {/* RBAC: Only ADMIN and INSTRUCTOR can edit, complete, delete */}
            {(user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') && (
              <>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditLesson(lesson); }}>
                  Edit
                </DropdownMenuItem>
                {lesson.status === "SCHEDULED" && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCompleteLesson(lesson); }}>
                    Mark Complete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDeleteLesson(lesson); }}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
