"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, User, Plane, Clock, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WeekScheduleView } from "@/components/ui/schedule-view";
import { useAuth } from "@/contexts/auth-context";

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
        {availability.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className={cn(
              "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
              item.type === "user" 
                ? "bg-blue-100 text-blue-800 border border-blue-200" 
                : "bg-purple-100 text-purple-800 border border-purple-200"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onAvailabilityClick(item);
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              {item.type === "user" ? (
                <User className="h-3 w-3" />
              ) : (
                <Plane className="h-3 w-3" />
              )}
              <span className="font-medium truncate">
                {item.type === "user" ? getUserName(item) : getAircraftTail(item)}
              </span>
            </div>
            {item.reason && (
              <div className="truncate opacity-75">
                {item.reason}
              </div>
            )}
            {item.start_time && item.end_time && (
              <div className="flex items-center gap-1 opacity-75">
                <Clock className="h-2 w-2" />
                <span>{item.start_time}-{item.end_time}</span>
              </div>
            )}
          </div>
        ))}
        
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
                  {availability.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === "user" ? (
                            <User className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Plane className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="font-medium text-sm">
                            {item.type === "user" ? getUserName(item) : getAircraftTail(item)}
                          </span>
                          <Badge variant={item.type === "user" ? "secondary" : "outline"} className="text-xs">
                            {item.type === "user" ? "Personal" : "Aircraft"}
                          </Badge>
                        </div>
                        {item.reason && (
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        )}
                        {item.start_time && item.end_time && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{item.start_time} - {item.end_time}</span>
                          </div>
                        )}
                      </div>
                      
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
                    </div>
                  ))}
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
  onAvailabilityClick, 
  onEditAvailability, 
  onDeleteAvailability,
  onTimeSlotClick 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('schedule'); // 'day', 'week', 'month', or 'schedule'
  const { user } = useAuth();

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
      
      // Find availability for this day
      const dayAvailability = availability.filter(item => {
        // Skip items with null dates
        if (!item.start_date || !item.end_date) return false;
        
        const startDate = new Date(item.start_date);
        const endDate = new Date(item.end_date);
        
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
          isToday={isSameDay(day, new Date())}
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

    // Use start_time/end_time if available, otherwise extract from date
    const startTime = item.start_time || format(new Date(item.start_date), "h:mm a");
    const endTime = item.end_time || format(new Date(item.end_date), "h:mm a");

    return (
      <div
        className={cn(
          "h-full p-2 rounded border text-xs overflow-hidden",
          "hover:shadow-md transition-shadow cursor-pointer group",
          item.type === "user" && "bg-blue-100 border-blue-300 text-blue-900",
          item.type === "aircraft" && "bg-purple-100 border-purple-300 text-purple-900"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            {item.type === "user" ? (
              <User className="h-3 w-3" />
            ) : (
              <Plane className="h-3 w-3" />
            )}
            <span className="font-semibold truncate">
              {item.type === "user" ? getUserName(item) : getAircraftTail(item)}
            </span>
          </div>
          
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
        </div>
        
        <div className="text-[10px] opacity-75 truncate">
          {startTime} - {endTime}
        </div>
        
        {item.reason && (
          <div className="text-[10px] opacity-75 truncate mt-1">
            {item.reason}
          </div>
        )}
        
        <Badge variant="outline" className="text-[9px] h-4 mt-1">
          {item.type === "user" ? "Personal" : "Aircraft"}
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
        events={availability}
        onEventClick={onAvailabilityClick}
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
        events={availability}
        onEventClick={onAvailabilityClick}
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