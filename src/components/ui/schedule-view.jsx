"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, startOfDay, addHours, isToday, isPast, isFuture } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Maximize2, Minimize2, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * WeekScheduleView - A professional schedule view with hourly time slots
 * Similar to FlightCircle's interface
 * 
 * @param {Object} props
 * @param {Date} props.currentDate - The currently selected date
 * @param {Array} props.events - Array of events to display
 * @param {Function} props.onEventClick - Callback when event is clicked
 * @param {Function} props.onTimeSlotClick - Callback when empty time slot is clicked
 * @param {Function} props.onDateChange - Callback when date changes
 * @param {String} props.view - Current view mode: 'day' or 'week'
 * @param {Function} props.onViewChange - Callback when view mode changes
 * @param {Array} props.resources - Optional: Array of resources (aircraft, instructors) to show as columns
 * @param {Function} props.renderEvent - Optional: Custom event renderer
 * @param {Number} props.startHour - Start hour for schedule (default: 7)
 * @param {Number} props.endHour - End hour for schedule (default: 22)
 */
export function WeekScheduleView({
  currentDate,
  events = [],
  onEventClick,
  onTimeSlotClick,
  onDateChange,
  view = 'week',
  onViewChange,
  resources = [],
  renderEvent,
  startHour = 7,
  endHour = 22,
  showResourceColumns = false,
}) {
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const scheduleRef = useRef(null);
  
  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scheduleRef.current && isToday(currentDate)) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= startHour && currentHour <= endHour) {
        const hourIndex = currentHour - startHour;
        const scrollPosition = hourIndex * 120; // 120px per hour column (matches table cell width)
        scheduleRef.current.scrollLeft = Math.max(0, scrollPosition - 200);
      }
    }
  }, [currentDate, startHour, endHour]);
  
  // Update current time indicator position every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startHour * 60;
      const totalMinutes = (endHour - startHour) * 60;
      const position = ((minutes - startMinutes) / totalMinutes) * 100;
      setCurrentTimePosition(position);
    };
    
    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [startHour, endHour]);
  
  // Filter resources based on search
  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter(r => 
      (r.name || '').toLowerCase().includes(query) ||
      (r.tail_number || '').toLowerCase().includes(query) ||
      (r.type || '').toLowerCase().includes(query) ||
      (r.model || '').toLowerCase().includes(query)
    );
  }, [resources, searchQuery]);
  
  // Filter events based on search
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(e =>
      (e.student_name || '').toLowerCase().includes(query) ||
      (e.instructor_name || '').toLowerCase().includes(query) ||
      (e.aircraft_tail || '').toLowerCase().includes(query) ||
      (e.title || '').toLowerCase().includes(query) ||
      (e.kind || '').toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push({
        hour,
        label: format(new Date().setHours(hour, 0, 0, 0), 'h:mm a'),
      });
    }
    return slots;
  }, [startHour, endHour]);

  // Get dates to display based on view
  const displayDates = useMemo(() => {
    if (view === 'day') {
      return [currentDate];
    } else {
      // Week view
      const weekStart = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
  }, [currentDate, view]);

  // Navigation handlers
  const handlePrevious = () => {
    const newDate = view === 'day' 
      ? addDays(currentDate, -1)
      : addDays(currentDate, -7);
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = view === 'day'
      ? addDays(currentDate, 1)
      : addDays(currentDate, 7);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Get events for a specific time slot (using filtered events)
  const getEventsForSlot = (date, hour, resourceId = null) => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return filteredEvents.filter(event => {
      // Handle all-day events (no start_time/end_time)
      const isAllDay = !event.start_time && !event.end_time;
      
      if (isAllDay) {
        // All-day event - check if date is within range
        const eventStartDate = new Date(event.start_date);
        eventStartDate.setHours(0, 0, 0, 0);
        const eventEndDate = new Date(event.end_date);
        eventEndDate.setHours(23, 59, 59, 999);
        const currentDate = new Date(date);
        currentDate.setHours(0, 0, 0, 0);
        
        const isInDateRange = currentDate >= eventStartDate && currentDate <= eventEndDate;
        
        if (showResourceColumns && resourceId) {
          return isInDateRange && (event.user_id === resourceId || event.aircraft_id === resourceId);
        }
        return isInDateRange;
      }
      
      // Timed event - construct date+time correctly to avoid timezone issues
      const eventDateStr = (event.start_at || event.start_date).split('T')[0]; // Get date part
      const eventStartTimeStr = event.start_time || '00:00';
      const eventEndTimeStr = event.end_time || '23:59';
      
      // First check if event's date matches the slot's date (avoid timezone issues)
      const slotDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (eventDateStr !== slotDateStr) {
        return false; // Event is on a different day
      }
      
      // Now construct the full datetime for this event on this specific day
      const eventStart = new Date(`${eventDateStr}T${eventStartTimeStr}:00`);
      const eventEnd = new Date(`${eventDateStr}T${eventEndTimeStr}:00`);
      
      // Check if event overlaps with this slot
      const overlaps = eventStart < slotEnd && eventEnd > slotStart;
      
      // If resources are shown, filter by resource
      if (showResourceColumns && resourceId) {
        return overlaps && (event.user_id === resourceId || event.aircraft_id === resourceId || event.instructor_id === resourceId);
      }
      
      return overlaps;
    });
  };
  
  // Get event count summary
  const eventSummary = useMemo(() => {
    const total = filteredEvents.length;
    const completed = filteredEvents.filter(e => e.status === 'COMPLETED').length;
    const scheduled = filteredEvents.filter(e => e.status === 'SCHEDULED').length;
    const cancelled = filteredEvents.filter(e => e.status === 'CANCELED').length;
    return { total, completed, scheduled, cancelled };
  }, [filteredEvents]);

  // Calculate event positioning
  const getEventStyle = (event, slotHour) => {
    // For timed events, use start_time/end_time to avoid timezone issues
    const eventDateStr = (event.start_at || event.start_date).split('T')[0];
    const eventStartTimeStr = event.start_time || '00:00';
    const eventEndTimeStr = event.end_time || '23:59';
    
    const eventStart = new Date(`${eventDateStr}T${eventStartTimeStr}:00`);
    const eventEnd = new Date(`${eventDateStr}T${eventEndTimeStr}:00`);
    
    const slotStart = new Date(eventStart);
    slotStart.setHours(slotHour, 0, 0, 0);
    const slotEnd = new Date(eventStart);
    slotEnd.setHours(slotHour + 1, 0, 0, 0);
    
    // Clamp event to visible slot boundaries
    const visibleStart = eventStart < slotStart ? slotStart : eventStart;
    const visibleEnd = eventEnd > slotEnd ? slotEnd : eventEnd;
    
    // Calculate minutes offset from slot start
    const minuteOffset = (visibleStart.getTime() - slotStart.getTime()) / (1000 * 60);
    const top = (minuteOffset / 60) * 100; // Percentage of hour
    
    // Calculate visible duration in minutes
    const visibleDuration = (visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60);
    const height = (visibleDuration / 60) * 100; // Percentage of hour(s)
    
    return {
      top: `${Math.max(0, top)}%`,
      height: `${Math.max(height, 10)}%`, // Minimum 10% height
      minHeight: '20px',
    };
  };

  // Handle time slot click
  const handleSlotClick = (date, hour, resourceId = null, resourceType = null) => {
    if (onTimeSlotClick) {
      // Pass the original date without modification to avoid timezone issues
      onTimeSlotClick({ date, hour, resourceId, resourceType });
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", isFullscreen && "fixed inset-0 z-50 bg-background p-6 overflow-auto")}>
        {/* Enhanced Header with Navigation and Controls */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">
                {view === 'day' 
                  ? format(currentDate, "MMMM d, yyyy")
                  : `${format(displayDates[0], "MMM d")} - ${format(displayDates[6], "MMM d, yyyy")}`
                }
              </h2>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handlePrevious}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous {view === 'day' ? 'Day' : 'Week'}</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next {view === 'day' ? 'Day' : 'Week'}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleToday}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Today
              </Button>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</TooltipContent>
              </Tooltip>
              
              {onViewChange && (
                <Select value={view} onValueChange={onViewChange}>
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
              )}
            </div>
          </div>

          {/* Search and Stats Bar */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events, instructors, aircraft..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="gap-1">
                <span className="font-semibold">{eventSummary.total}</span> Total
              </Badge>
              {eventSummary.scheduled > 0 && (
                <Badge variant="default" className="gap-1 bg-blue-500">
                  <span className="font-semibold">{eventSummary.scheduled}</span> Scheduled
                </Badge>
              )}
              {eventSummary.completed > 0 && (
                <Badge variant="default" className="gap-1 bg-green-500">
                  <span className="font-semibold">{eventSummary.completed}</span> Completed
                </Badge>
              )}
              {eventSummary.cancelled > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <span className="font-semibold">{eventSummary.cancelled}</span> Cancelled
                </Badge>
              )}
            </div>
          </div>
        </div>

      {/* Schedule Grid - Table-based for perfect alignment */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto relative" ref={scheduleRef}>
            {/* Current Time Indicator */}
            {isToday(currentDate) && (
              (() => {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                
                if (currentHour < startHour || currentHour > endHour) return null;
                
                const hoursSinceStart = currentHour - startHour;
                const minutesFraction = currentMinute / 60;
                const totalHoursFraction = hoursSinceStart + minutesFraction;
                const leftPosition = 200 + (totalHoursFraction * 120);
                
                return (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
                    style={{ left: `${leftPosition}px` }}
                  >
                    <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                    <div className="absolute -top-8 -left-10 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                      {format(now, 'h:mm a')}
                    </div>
                  </div>
                );
              })()
            )}
            
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-muted">
                <tr>
                  <th className="sticky left-0 z-40 p-4 border-r border-b text-sm font-semibold bg-muted text-left shadow-[2px_2px_8px_rgba(0,0,0,0.15)] dark:shadow-[2px_2px_8px_rgba(0,0,0,0.4)]" style={{ width: '200px', minWidth: '200px' }}>
                    {showResourceColumns ? (resources[0]?.role ? 'Instructor' : 'Aircraft') : 'Date'}
                  </th>
                  {timeSlots.map(({ hour, label }) => (
                    <th key={hour} className="px-2 py-3 border-r border-b last:border-r-0 text-center bg-muted/50 text-sm font-medium text-foreground" style={{ width: '120px', minWidth: '120px' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {showResourceColumns ? (
                  filteredResources.length > 0 ? (
                    filteredResources.map(resource => (
                      <tr key={resource.id} className="border-b last:border-b-0" style={{ height: '120px' }}>
                        <td className="sticky left-0 z-20 p-4 border-r bg-background dark:bg-gray-950 align-middle shadow-[2px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)]" style={{ width: '200px' }}>
                          <div className="font-semibold text-base truncate">{resource.name || resource.tail_number}</div>
                          <div className="text-xs text-muted-foreground truncate uppercase">{resource.type || resource.model || resource.role}</div>
                        </td>
                        {timeSlots.map(({ hour }) => {
                          const slotEvents = getEventsForSlot(displayDates[0], hour, resource.id);
                          return (
                            <td key={`${resource.id}-${hour}`} className="border-r border-border last:border-r-0 p-0 relative" style={{ width: '120px' }}>
                              <TimeSlotCell
                                date={displayDates[0]}
                                hour={hour}
                                resourceId={resource.id}
                                resourceType={resource.resourceType}
                                events={slotEvents}
                                onSlotClick={handleSlotClick}
                                onEventClick={onEventClick}
                                renderEvent={renderEvent}
                                getEventStyle={getEventStyle}
                                hoveredSlot={hoveredSlot}
                                setHoveredSlot={setHoveredSlot}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={timeSlots.length + 1} className="p-8 text-center text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No resources match your search</p>
                      </td>
                    </tr>
                  )
                ) : (
                  displayDates.map(date => {
                    const isTodayDate = isSameDay(date, new Date());
                    return (
                      <tr key={date.toString()} className="border-b last:border-b-0" style={{ height: '120px' }}>
                        <td className={cn(
                          "sticky left-0 z-20 p-4 border-r bg-background dark:bg-gray-950 align-middle shadow-[2px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)]",
                          isTodayDate && "bg-blue-50 dark:bg-blue-950"
                        )} style={{ width: '200px' }}>
                          <div className={cn("font-semibold text-sm", isTodayDate && "text-blue-600")}>
                            {format(date, "EEEE")}
                          </div>
                          <div className={cn("text-lg font-bold", isTodayDate && "text-blue-600")}>
                            {format(date, "MMM d")}
                          </div>
                          {isTodayDate && <Badge variant="secondary" className="text-xs mt-1 w-fit">Today</Badge>}
                        </td>
                        {timeSlots.map(({ hour }) => {
                          const slotEvents = getEventsForSlot(date, hour);
                          return (
                            <td key={`${date.toString()}-${hour}`} className="border-r border-border last:border-r-0 p-0 relative" style={{ width: '120px' }}>
                              <TimeSlotCell
                                date={date}
                                hour={hour}
                                events={slotEvents}
                                onSlotClick={handleSlotClick}
                                onEventClick={onEventClick}
                                renderEvent={renderEvent}
                                getEventStyle={getEventStyle}
                                hoveredSlot={hoveredSlot}
                                setHoveredSlot={setHoveredSlot}
                                isToday={isTodayDate}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Legend - Integrated into Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-purple-100 border-l-4 border-purple-400 rounded-sm dark:bg-purple-950" />
              <span className="font-medium">Flight Lesson</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-orange-100 border-l-4 border-orange-400 rounded-sm dark:bg-orange-950" />
              <span className="font-medium">Ground Lesson</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-400 rounded-sm dark:bg-blue-950" />
              <span className="font-medium">User Availability</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-green-100 border-l-4 border-green-400 rounded-sm dark:bg-green-950" />
              <span className="font-medium">Aircraft Availability</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-5 bg-red-500 animate-pulse" />
              <span className="font-medium">Current Time</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}

// TimeSlotCell Component
function TimeSlotCell({
  date,
  hour,
  resourceId,
  resourceType,
  events,
  onSlotClick,
  onEventClick,
  renderEvent,
  getEventStyle,
  hoveredSlot,
  setHoveredSlot,
  isToday = false,
}) {
  const slotKey = `${date.toString()}-${hour}-${resourceId || ''}`;
  const isHovered = hoveredSlot === slotKey;

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-all duration-150 bg-background",
        "h-[120px] w-full",
        isHovered && "bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-200 dark:ring-blue-800 ring-inset",
        !events.length && isHovered && "after:content-['+'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-4xl after:text-blue-400 after:font-light after:pointer-events-none"
      )}
      onClick={() => onSlotClick(date, hour, resourceId, resourceType)}
      onMouseEnter={() => setHoveredSlot(slotKey)}
      onMouseLeave={() => setHoveredSlot(null)}
    >
      {/* Half-hour divider */}
      <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-muted-foreground/10" />
      
      {/* Events in this slot */}
      {events.map((event, idx) => {
        const style = getEventStyle(event, hour);
        
        return (
          <div
            key={event.id}
            className="absolute left-1 right-1 z-10"
            style={{
              ...style,
              // Stack overlapping events
              transform: events.length > 1 ? `translateX(${idx * 4}px)` : 'none',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick && onEventClick(event);
            }}
          >
            {renderEvent ? (
              renderEvent(event)
            ) : (
              <DefaultEventBlock event={event} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Default Event Block Component
function DefaultEventBlock({ event }) {
  // Use start_time/end_time fields if available to avoid timezone issues
  const startTime = event.start_time 
    ? (() => {
        const [hours, minutes] = event.start_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      })()
    : format(new Date(event.start_at || event.start_date), "h:mm a");
  
  const endTime = event.end_time
    ? (() => {
        const [hours, minutes] = event.end_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      })()
    : format(new Date(event.end_at || event.end_date), "h:mm a");
  
  // Determine event colors and styles
  const getEventStyle = () => {
    if (event.status === "CANCELED") {
      return "bg-gray-100 border-gray-400 text-gray-600 line-through opacity-60 dark:bg-gray-800 dark:border-gray-600";
    }
    if (event.status === "COMPLETED") {
      return "bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-300";
    }
    if (event.kind === "FLIGHT") {
      return "bg-purple-100 border-purple-400 text-purple-900 dark:bg-purple-950 dark:border-purple-600 dark:text-purple-200";
    }
    if (event.kind === "GROUND") {
      return "bg-orange-100 border-orange-400 text-orange-900 dark:bg-orange-950 dark:border-orange-600 dark:text-orange-200";
    }
    if (event.type === "user") {
      return "bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-200";
    }
    if (event.type === "aircraft") {
      return "bg-green-100 border-green-400 text-green-900 dark:bg-green-950 dark:border-green-600 dark:text-green-200";
    }
    return "bg-gray-100 border-gray-400 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200";
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "h-full p-2 rounded-md border-l-4 text-xs overflow-hidden shadow-sm",
          "hover:shadow-lg hover:scale-[1.02] transition-all duration-150 cursor-pointer group",
          getEventStyle()
        )}>
          <div className="font-semibold truncate mb-0.5">
            {event.title || event.student_name || event.user_name || 'Event'}
          </div>
          <div className="flex items-center gap-1 text-[10px] opacity-75">
            <Clock className="h-2.5 w-2.5" />
            <span className="truncate">{startTime}</span>
          </div>
          {event.aircraft_tail && (
            <div className="text-[10px] opacity-75 truncate mt-0.5 font-medium">
              ✈️ {event.aircraft_tail}
            </div>
          )}
          {event.instructor_name && (
            <div className="text-[10px] opacity-75 truncate">
              👤 {event.instructor_name}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{event.title || event.student_name || event.user_name}</p>
          <p className="text-xs">{startTime} - {endTime}</p>
          {event.aircraft_tail && <p className="text-xs">Aircraft: {event.aircraft_tail}</p>}
          {event.instructor_name && <p className="text-xs">Instructor: {event.instructor_name}</p>}
          {event.kind && <p className="text-xs">Type: {event.kind}</p>}
          {event.status && <p className="text-xs">Status: {event.status}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

