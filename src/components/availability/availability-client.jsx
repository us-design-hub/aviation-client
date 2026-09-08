"use client";

import { useCallback, useState, useEffect } from "react";
import { Plus, Calendar, List, Search, Filter, Plane, User, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { availabilityAPI, usersAPI, aircraftAPI, rentalsAPI } from "@/lib/api";
import { AvailabilityCalendar } from "./availability-calendar";
import { AvailabilityTable } from "./availability-table";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityDetails } from "./availability-details";
import { useConfirmDialog, confirmPresets } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/panels";
import { formatET, isDateInCurrentWeekET, isSameDateET, isSameMonthET, nowET, scheduleRangeParams } from "@/lib/format-tz";

function normalizeAvailabilityTimes(item) {
  if (!item?.start_date || !item?.end_date) return item;

  const startTime = formatET(item.start_date, "HH:mm");
  const endTime = formatET(item.end_date, "HH:mm");
  const isAllDay = startTime === "00:00" && endTime === "23:59";

  return {
    ...item,
    start_time: isAllDay ? null : startTime,
    end_time: isAllDay ? null : endTime,
  };
}

export function AvailabilityClient() {
  // State
  const [availability, setAvailability] = useState([]);
  const [users, setUsers] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [viewMode, setViewMode] = useState("calendar");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState(null);
  const [editingAvailability, setEditingAvailability] = useState(null);
  const [formKey, setFormKey] = useState(0); // Track form remount
  const [formInitialValues, setFormInitialValues] = useState(null); // For pre-filling form
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    dateRange: "all",
  });

  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const { user } = useAuth();

  // Fetch all data on mount and when user changes
  useEffect(() => {
    if (user?.role) {
      fetchAllData();
    }
  }, [user?.role]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Wait for user to be loaded
      if (!user?.role) {
        return;
      }
      
      // Role-based API calls - only fetch what the user can access
      const apiCalls = [];
      
      // All roles can access availability and aircraft
      apiCalls.push(availabilityAPI.getAll());
      
      // Only ADMIN can fetch users data - RBAC FIXED
      if (user?.role === 'ADMIN') {
        apiCalls.push(usersAPI.getAll());
      } else {
        // Add a placeholder to maintain array order
        apiCalls.push(Promise.resolve({ data: [] }));
      }
      
      apiCalls.push(aircraftAPI.getAll());
      
      const results = await Promise.allSettled(apiCalls);

      // Handle results - map to correct variables
      const availabilityRes = results[0];
      const usersRes = results[1];
      const aircraftRes = results[2];

      // Set data from successful responses
      if (availabilityRes.status === 'fulfilled') {
        const availabilityData = availabilityRes.value.data || availabilityRes.value || [];
        setAvailability(availabilityData.map(normalizeAvailabilityTimes));
      }

      if (usersRes.status === 'fulfilled') {
        const usersData = usersRes.value.data || usersRes.value || [];
        setUsers(usersData);
      } else {
        setUsers([]);
      }

      if (aircraftRes.status === 'fulfilled') {
        const aircraftData = aircraftRes.value.data || aircraftRes.value || [];
        setAircraft(aircraftData);
      }

    } catch (error) {
      console.error("Error fetching availability data:", error);
      setError("Failed to fetch availability data");
      toast.error("Failed to fetch availability data");
    } finally {
      setLoading(false);
    }
  };


  const fetchSchedule = useCallback(async ({ date, view }) => {
    try {
      const response = await rentalsAPI.getSchedule(
        scheduleRangeParams(date, view)
      );
      setScheduleEvents(
        (response.data || []).filter((event) => event.event_type !== "aircraft-hold")
      );
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast.error("Failed to fetch schedule data");
    }
  }, []);

  const matchesDateRange = (dateValue) => {
    if (filters.dateRange === "all") return true;

    const now = nowET();

    switch (filters.dateRange) {
      case "today":
        return isSameDateET(dateValue, now);
      case "week":
        return isDateInCurrentWeekET(dateValue, now);
      case "month":
        return isSameMonthET(dateValue, now);
      default:
        return true;
    }
  };

  // Filter availability
  const filteredAvailability = availability.filter(item => {
    const matchesSearch = !filters.search || 
      item.reason?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.user_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.aircraft_tail?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesType = filters.type === "all" || item.type === filters.type;
    
    return matchesSearch && matchesType && matchesDateRange(item.start_date);
  });

  const filteredScheduleEvents = scheduleEvents.filter((event) => {
    const query = filters.search.toLowerCase();
    const matchesSearch = !filters.search ||
      event.title?.toLowerCase().includes(query) ||
      event.kind?.toLowerCase().includes(query) ||
      event.aircraft_tail?.toLowerCase().includes(query);
    const matchesType = filters.type === "all" || filters.type === event.event_type;
    return matchesSearch && matchesType && matchesDateRange(event.start_at);
  });

  // Get availability counts
  const now = new Date();
  const currentOrUpcomingAvailability = availability.filter((a) => new Date(a.end_date) >= now);
  const availabilityCounts = {
    total: currentOrUpcomingAvailability.length,
    personal: currentOrUpcomingAvailability.filter(a => a.type === "user").length,
    aircraftHolds: currentOrUpcomingAvailability.filter(a => a.type === "aircraft").length,
    upcoming: currentOrUpcomingAvailability.filter(a => new Date(a.start_date) > now).length,
    active: availability.filter(a => {
      const start = new Date(a.start_date);
      const end = new Date(a.end_date);
      return start <= now && end >= now;
    }).length,
  };

  // Handlers
  const handleCreateAvailability = async (availabilityData) => {
    try {
      await availabilityAPI.create(availabilityData);
      toast.success("Availability created successfully");
      setIsFormOpen(false);
      fetchAllData();
    } catch (error) {
      console.error("Error creating availability:", error);
      if (error.response?.data?.error === "conflicts") {
        toast.error("Aircraft block overlaps an existing lesson, rental, or hold");
      } else {
        toast.error("Failed to create availability");
      }
      throw error;
    }
  };

  const handleUpdateAvailability = async (id, availabilityData) => {
    try {
      await availabilityAPI.update(id, availabilityData);
      toast.success("Availability updated successfully");
      setIsFormOpen(false);
      setEditingAvailability(null);
      fetchAllData();
    } catch (error) {
      console.error("Error updating availability:", error);
      if (error.response?.data?.error === "conflicts") {
        toast.error("Aircraft block overlaps an existing lesson, rental, or hold");
      } else {
        toast.error("Failed to update availability");
      }
      throw error;
    }
  };

  const handleDeleteAvailability = async (availabilityItem) => {
    const itemName = availabilityItem.type === "user" 
      ? `${availabilityItem.user_name || 'User'}'s unavailability` 
      : `${availabilityItem.aircraft_tail || 'Aircraft'} hold`;
    
    const confirmed = await showConfirm({
      ...confirmPresets.delete(itemName),
      onConfirm: async () => {
        try {
          await availabilityAPI.delete(availabilityItem.id);
          toast.success("Availability deleted successfully");
          fetchAllData();
        } catch (error) {
          console.error("Error deleting availability:", error);
          toast.error("Failed to delete availability");
          throw error; // Re-throw to show the confirmation dialog failed
        }
      }
    });
  };

  const handleAvailabilityClick = (availabilityItem) => {
    setSelectedAvailability(availabilityItem);
    setIsDetailsOpen(true);
  };

  const handleEditAvailability = (availabilityItem) => {
    setEditingAvailability(availabilityItem);
    setFormInitialValues(null); // Clear initial values when editing
    setFormKey(prev => prev + 1); // Force form remount
    setIsFormOpen(true);
  };

  // NEW: Handle time slot click from Schedule view
  const handleTimeSlotClick = ({ date, hour, resourceId, resourceType }) => {
    // Create initial values for pre-filling the form
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endHour = hour + 1; // Default 1-hour availability block
    const endTime = `${String(endHour).padStart(2, '0')}:00`;
    
    const initialValues = {
      startDate: date,
      endDate: date, // Same day by default
      startTime: startTime,
      endTime: endTime,
      allDay: false, // Explicitly false since we're clicking a specific hour
      type: resourceType || "user", // Default to user if not specified
      recurring: false, // Explicitly false
    };
    
    // If clicked on a specific resource, pre-select it
    if (resourceType === "aircraft" && resourceId) {
      initialValues.aircraftId = resourceId;
      initialValues.type = "aircraft";
    } else if (resourceType === "user" && resourceId) {
      initialValues.userId = resourceId;
      initialValues.type = "user";
    }
    
    setFormInitialValues(initialValues);
    setEditingAvailability(null); // Clear editing mode
    setFormKey(prev => prev + 1); // Force form remount
    setIsFormOpen(true);
    
    toast.info(`Creating availability for ${new Date(date).toLocaleDateString('en-US', { timeZone: 'America/New_York' })} at ${startTime}`);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "all",
      dateRange: "all",
    });
  };

  const activeFilterCount = [
    filters.search,
    filters.type !== 'all' ? filters.type : '',
    filters.dateRange !== 'all' ? filters.dateRange : '',
  ].filter(Boolean).length;

  const isAdmin = user?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <Card className="gap-0 py-0">
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-red-500/12">
              <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Could not load availability</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchAllData} className="mt-2">Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Availability Management' : 'My Availability'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin
              ? 'Personal availability and aircraft blocks across the school.'
              : 'Mark when you are unavailable so lessons are not booked over it.'}
          </p>
        </div>
        
        <Sheet open={isFormOpen} onOpenChange={(open) => {
          if (open && !editingAvailability && !formInitialValues) {
            // Opening fresh form via "Add Availability" button
            setFormKey(prev => prev + 1);
          }
          setIsFormOpen(open);
          if (!open) {
            setEditingAvailability(null);
            setFormInitialValues(null);
          }
        }}>
          <SheetTrigger asChild>
            <Button 
              className="bg-golden-gradient hover:bg-golden-gradient/90"
              onClick={() => {
                setEditingAvailability(null);
                setFormInitialValues(null);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Availability
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:w-[600px] lg:w-[700px] overflow-y-auto max-w-full">
            <SheetHeader className="sticky top-0 bg-background pb-4 border-b">
              <SheetTitle>
                {editingAvailability ? "Edit Availability" : "Add New Availability"}
              </SheetTitle>
              <SheetDescription>
                {editingAvailability 
                  ? "Update the availability details below."
                  : "Set personal availability or create aircraft blocks that prevent lessons and rentals from being booked."
                }
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 pb-6">
              <AvailabilityForm
                key={editingAvailability?.id || `new-${formKey}`}
                availability={editingAvailability}
                initialValues={formInitialValues}
                users={users}
                aircraft={aircraft}
                onSubmit={editingAvailability ? 
                  (data) => handleUpdateAvailability(editingAvailability.id, data) : 
                  handleCreateAvailability
                }
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingAvailability(null);
                  setFormInitialValues(null);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Active Now"
          value={availabilityCounts.active}
          icon={Clock}
          tone={availabilityCounts.active > 0 ? "warning" : "neutral"}
          hint={availabilityCounts.active > 0 ? "In effect right now" : "Nothing blocking now"}
        />
        <StatTile
          label="Upcoming"
          value={availabilityCounts.upcoming}
          icon={Calendar}
          tone={availabilityCounts.upcoming > 0 ? "info" : "neutral"}
          hint="Starts in the future"
        />
        <StatTile
          label="Personal"
          value={availabilityCounts.personal}
          icon={User}
          tone="gold"
          hint="People marked unavailable"
        />
        <StatTile
          label="Aircraft Holds"
          value={availabilityCounts.aircraftHolds}
          icon={Plane}
          tone={availabilityCounts.aircraftHolds > 0 ? "danger" : "neutral"}
          hint={availabilityCounts.aircraftHolds > 0 ? "Blocking bookings" : "No aircraft blocked"}
        />
        <StatTile
          label="Total Items"
          value={availabilityCounts.total}
          icon={Clock}
          hint="All availability records"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by reason..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="aircraft">Aircraft Holds</SelectItem>
                <SelectItem value="lesson">Lessons</SelectItem>
                <SelectItem value="rental">Rentals</SelectItem>
                <SelectItem value="aircraft-flight">Solo Flights</SelectItem>
                <SelectItem value="relocation-flight">Relocation Flights</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground tabular-nums">{filteredAvailability.length}</span>
              {' of '}<span className="tabular-nums">{availabilityCounts.total}</span> items
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`}
            </p>
            <Button variant="outline" onClick={resetFilters} size="sm" disabled={activeFilterCount === 0}>
              <Filter className="h-4 w-4 mr-2" />
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle & Content */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-auto">
          <TabsTrigger value="calendar" className="gap-1.5 px-3 py-1.5">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5 px-3 py-1.5">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-6">
          <AvailabilityCalendar
            availability={filteredAvailability}
            users={users}
            aircraft={aircraft}
            scheduleEvents={filteredScheduleEvents}
            onRangeChange={fetchSchedule}
            onAvailabilityClick={handleAvailabilityClick}
            onEditAvailability={handleEditAvailability}
            onDeleteAvailability={handleDeleteAvailability}
            onTimeSlotClick={handleTimeSlotClick}
          />
        </TabsContent>
        
        <TabsContent value="list" className="mt-6">
          <AvailabilityTable
            availability={filteredAvailability}
            onView={handleAvailabilityClick}
            onEdit={handleEditAvailability}
            onDelete={handleDeleteAvailability}
          />
        </TabsContent>
      </Tabs>

      {/* Availability Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[600px] lg:w-[800px] overflow-y-auto max-w-full">
          {selectedAvailability && (
            <AvailabilityDetails
              availability={selectedAvailability}
              onEdit={() => {
                setIsDetailsOpen(false);
                handleEditAvailability(selectedAvailability);
              }}
              onDelete={() => {
                setIsDetailsOpen(false);
                handleDeleteAvailability(selectedAvailability);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
