"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { BookOpen, ChevronLeft, ChevronRight, User, Plane, Clock, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WeekScheduleView } from "@/components/ui/schedule-view";
import { useAuth } from "@/contexts/auth-context";
import { nowET, toET } from "@/lib/format-tz";

function CalendarDay({ 
  day, 
  formattedDate, 
  isCurrentMonth, 
  isSelected, 
  isToday, 
  availability, 
  users, 
  aircraft, 
  user,
  onClick, 
  onAvailabilityClick, 
  onEditAvailability, 
  onDeleteAvailability 
}) {
  const getUserName = (item) => {
    // Use the user_name field that's already provided by the server
    if (item.user_name) {
      return item.user_name;
    }
    // Fallback to looking up in users array
    const user = users.find(u => u.id === item.user_id);
    return user ? (user.name || `${user.first_name} ${user.last_name}`.trim()) : "Unknown User";
  };

  const getAircraftTail = (item) => {
    // Use the aircraft_tail field that's already provided by the server
    if (item.aircraft_tail) {
      return item.aircraft_tail;
    }
    // Fallback to looking up in aircraft array
    const ac = aircraft.find(a => a.id === item.aircraft_id);
    return ac ? ac.tail_number : "Unknown Aircraft";
  };

  const getItemMeta = (item) => {
    const isLesson = item.event_type === "lesson";
    const isAircraftFlight = item.event_type === "aircraft-flight";
    const isRentalBooking = item.event_type === "rental-booking";
    const isScheduleOverlay = isLesson || isAircraftFlight || isRentalBooking;
    const isPersonal = item.type === "user";
    const startSource = item.start_at || item.start_date;
    const endSource = item.end_at || item.end_date;

    return {
      isLesson,
      isScheduleOverlay,
      label: isRentalBooking
        ? (item.renter_name || item.renter_email || "Rental")
        : isAircraftFlight
        ? (item.pilot_name || item.pilot_email || "Solo Flight")
        : isLesson
        ? (item.student_name || "Lesson")
        : isPersonal
        ? getUserName(item)
        : getAircraftTail(item),
      note: isScheduleOverlay ? (item.title || item.lesson || item.purpose) : item.reason,
      badge: isRentalBooking
        ? "Rental"
        : isAircraftFlight
        ? "Solo flight"
        : isLesson
        ? "Lesson"
        : isPersonal
        ? "Personal"
        : "Aircraft",
      time: startSource && endSource
        ? `${format(toET(startSource), "h:mm a")} - ${format(toET(endSource), "h:mm a")}`
        : item.start_time && item.end_time
        ? `${item.start_time}-${item.end_time}`
        : null,
      className: cn(
        isPersonal && "bg-blue-100 text-blue-800 border border-blue-200",
        item.type === "aircraft" && "bg-purple-100 text-purple-800 border border-purple-200",
        isLesson && "bg-indigo-100 text-indigo-950 border border-indigo-300",
        isRentalBooking && "bg-emerald-100 text-emerald-950 border border-emerald-300",
        isAircraftFlight && "bg-sky-100 text-sky-950 border border-sky-300"
      ),
    };
  };

  return (
    <div
      className={cn(
        "min-h-[120px] p-2 border-r border-b cursor-pointer hover:bg-muted/50 transition-colors",
        !isCurrentMonth && "text-muted-foreground bg-muted/20",
        isSelected && "bg-primary/10 border-primary",
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
        {availability.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {availability.length}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        {availability.slice(0, 3).map((item) => {
          const meta = getItemMeta(item);

          return (
          <div
            key={`${item.event_type || item.type}-${item.id}`}
            className={cn(
              "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
              meta.className
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (!meta.isScheduleOverlay) onAvailabilityClick(item);
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              {item.type === "user" ? (
                <User className="h-3 w-3" />
              ) : meta.isLesson ? (
                <BookOpen className="h-3 w-3" />
              ) : (
                <Plane className="h-3 w-3" />
              )}
              <span className="font-medium truncate">
                {meta.label}
              </span>
            </div>
            {meta.note && (
              <div className="truncate opacity-75">
                {meta.note}
              </div>
            )}
            {meta.time && (
              <div className="flex items-center gap-1 opacity-75">
                <Clock className="h-2 w-2" />
                <span>{meta.time}</span>
              </div>
            )}
          </div>
        );
        })}
        
        {availability.length > 3 && (
          <Popover>
            <PopoverTrigger asChild>
              <div className="text-xs text-center p-1 rounded bg-muted hover:bg-muted/80 cursor-pointer">
                +{availability.length - 3} more
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  All Availability - {format(day, "MMM d, yyyy")}
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availability.map((item) => {
                    const meta = getItemMeta(item);

                    return (
                    <div
                      key={`${item.event_type || item.type}-${item.id}`}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === "user" ? (
                            <User className="h-4 w-4 text-blue-600" />
                          ) : meta.isLesson ? (
                            <BookOpen className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Plane className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="font-medium text-sm">
                            {meta.label}
                          </span>
                          <Badge variant={item.type === "user" ? "secondary" : "outline"} className="text-xs">
                            {meta.badge}
                          </Badge>
                        </div>
                        {meta.note && (
                          <p className="text-xs text-muted-foreground">{meta.note}</p>
                        )}
                        {meta.time && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{meta.time}</span>
                          </div>
                        )}
                      </div>
                      
                      {!meta.isScheduleOverlay && (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onAvailabilityClick(item)}>
                            <Eye className="mr-2 h-3 w-3" />
                            View
                          </DropdownMenuItem>
                          
                          {/* RBAC: Only ADMIN or owner can edit/delete */}
                          {(user?.role === 'ADMIN' || item.user_id === user?.id) && (
                            <>
                              <DropdownMenuItem onClick={() => onEditAvailability(item)}>
                                <Edit className="mr-2 h-3 w-3" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDeleteAvailability(item)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

export function AvailabilityCalendar({ 
  availability, 
  users, 
  aircraft,
  scheduleEvents = [],
  onRangeChange,
  onAvailabilityClick, 
  onEditAvailability, 
  onDeleteAvailability,
  onTimeSlotClick 
}) {
  const [currentDate, setCurrentDate] = useState(nowET());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('schedule'); // 'day', 'week', 'month', or 'schedule'
  const { user } = useAuth();

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(nowET());
    setSelectedDate(nowET());
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const combinedScheduleEvents = [...availability, ...scheduleEvents];

  useEffect(() => {
    if (!onRangeChange) return;
    onRangeChange({
      date: currentDate,
      view: view === "schedule" ? "day" : view,
    });
  }, [currentDate, onRangeChange, view]);

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
      
      const dayAvailability = combinedScheduleEvents.filter(item => {
        // Skip items with null dates
        const startSource = item.start_at || item.start_date;
        const endSource = item.end_at || item.end_date;
        if (!startSource || !endSource) return false;
        
        const startDate = toET(startSource);
        const endDate = toET(endSource);
        
        // Skip invalid dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
        
        const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        return dayOnly >= startOnly && dayOnly <= endOnly;
      });

      days.push(
        <CalendarDay
          key={day}
          day={day}
          formattedDate={formattedDate}
          isCurrentMonth={isSameMonth(day, monthStart)}
          isSelected={selectedDate && isSameDay(day, selectedDate)}
          isToday={isSameDay(day, nowET())}
          availability={dayAvailability}
          users={users}
          aircraft={aircraft}
          user={user}
          onClick={() => setSelectedDate(cloneDay)}
          onAvailabilityClick={onAvailabilityClick}
          onEditAvailability={onEditAvailability}
          onDeleteAvailability={onDeleteAvailability}
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

  // Handle time slot click for creating new availability
  const handleTimeSlotClickInternal = ({ date, hour, resourceId }) => {
    // Determine resource type
    let resourceType = null;
    if (aircraft.find(a => a.id === resourceId)) {
      resourceType = 'aircraft';
    } else if (users.find(u => u.id === resourceId)) {
      resourceType = 'user';
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

  // Custom availability event renderer for schedule view
  const renderAvailabilityEvent = (item) => {
    const getUserName = (item) => {
      if (item.user_name) return item.user_name;
      const user = users.find(u => u.id === item.user_id);
      return user ? (user.name || `${user.first_name} ${user.last_name}`.trim()) : "Unknown User";
    };

    const getAircraftTail = (item) => {
      if (item.aircraft_tail) return item.aircraft_tail;
      const ac = aircraft.find(a => a.id === item.aircraft_id);
      return ac ? ac.tail_number : "Unknown Aircraft";
    };

    const isLesson = item.event_type === "lesson";
    const isAircraftFlight = item.event_type === "aircraft-flight";
    const isRentalBooking = item.event_type === "rental-booking";
    const isScheduleOverlay = isLesson || isAircraftFlight || isRentalBooking;
    const isPersonal = item.type === "user";
    const isAircraftHold = item.type === "aircraft";

    const startSource = item.start_at || item.start_date;
    const endSource = item.end_at || item.end_date;
    const startTime = item.start_time || format(toET(startSource), "h:mm a");
    const endTime = item.end_time || format(toET(endSource), "h:mm a");
    const eventLabel = isRentalBooking
      ? (item.renter_name || item.renter_email || "Rental")
      : isAircraftFlight
      ? (item.pilot_name || item.pilot_email || "Solo Flight")
      : isLesson
      ? (item.student_name || "Lesson")
      : isPersonal
      ? getUserName(item)
      : getAircraftTail(item);
    const note = isScheduleOverlay ? (item.title || item.lesson || item.purpose) : item.reason;
    const badgeLabel = isRentalBooking
      ? "Rental"
      : isAircraftFlight
      ? "Solo flight"
      : isLesson
      ? "Lesson"
      : isPersonal
      ? "Personal"
      : "Aircraft";

    return (
      <div
        className={cn(
          "h-full p-2 rounded border text-xs overflow-hidden",
          "hover:shadow-md transition-shadow cursor-pointer group",
          isPersonal && "bg-blue-100 border-blue-300 text-blue-900",
          isAircraftHold && "bg-purple-100 border-purple-300 text-purple-900",
          isLesson && "bg-indigo-100 border-indigo-300 text-indigo-950",
          isRentalBooking && "bg-emerald-100 border-emerald-300 text-emerald-950",
          isAircraftFlight && "bg-sky-100 border-sky-300 text-sky-950"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            {isPersonal ? (
              <User className="h-3 w-3" />
            ) : isLesson ? (
              <BookOpen className="h-3 w-3" />
            ) : (
              <Plane className="h-3 w-3" />
            )}
            <span className="font-semibold truncate">
              {eventLabel}
            </span>
          </div>
          
          {!isScheduleOverlay && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAvailabilityClick(item); }}>
                  <Eye className="h-3 w-3 mr-2" />
                  View Details
                </DropdownMenuItem>
                
                {/* RBAC: Only ADMIN or owner can edit/delete */}
                {(user?.role === 'ADMIN' || item.user_id === user?.id) && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditAvailability(item); }}>
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDeleteAvailability(item); }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="text-[10px] opacity-75 truncate">
          {startTime} - {endTime}
        </div>
        
        {note && (
          <div className="text-[10px] opacity-75 truncate mt-1">
            {note}
          </div>
        )}
        
        <Badge variant="outline" className="text-[9px] h-4 mt-1">
          {badgeLabel}
        </Badge>
      </div>
    );
  };

  // Create mixed resources array (users + aircraft)
  const mixedResources = [
    ...users.filter(u => u.role === 'INSTRUCTOR' || u.role === 'STUDENT').map(u => ({
      id: u.id,
      name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      type: '👤 ' + (u.role || 'User'),
      resourceType: 'user'
    })),
    ...aircraft.map(a => ({
      id: a.id,
      name: a.tail_number,
      type: `✈️ ${a.model || 'Aircraft'}`,
      resourceType: 'aircraft'
    }))
  ];
  // Render different views
  if (view === 'schedule') {
    // Schedule view - Mixed resources (users + aircraft)
    return (
      <WeekScheduleView
        currentDate={currentDate}
        events={combinedScheduleEvents}
        onEventClick={(event) => {
          if (!event.event_type) onAvailabilityClick(event);
        }}
        onTimeSlotClick={handleTimeSlotClickInternal}
        onDateChange={setCurrentDate}
        view="day"
        onViewChange={setView}
        renderEvent={renderAvailabilityEvent}
        startHour={6}
        endHour={22}
        resources={mixedResources}
        showResourceColumns={true}
      />
    );
  } else if (view === 'day' || view === 'week') {
    return (
      <WeekScheduleView
        currentDate={currentDate}
        events={combinedScheduleEvents}
        onEventClick={(event) => {
          if (!event.event_type) onAvailabilityClick(event);
        }}
        onTimeSlotClick={handleTimeSlotClickInternal}
        onDateChange={setCurrentDate}
        view={view}
        onViewChange={setView}
        renderEvent={renderAvailabilityEvent}
        startHour={6}
        endHour={22}
      />
    );
  }

  // Month view (existing calendar)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-2xl w-48">
              {format(currentDate, "MMMM yyyy")}
            </CardTitle>
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
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="min-h-[600px]">
          {rows}
        </div>
        
        {/* Legend */}
        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>Personal Unavailability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
              <span>Aircraft Holds</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
              <span>Today</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
