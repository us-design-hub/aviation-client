"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, List, Search, Filter, Plane, User, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { availabilityAPI, usersAPI, aircraftAPI } from "@/lib/api";
import { AvailabilityCalendar } from "./availability-calendar";
import { AvailabilityTable } from "./availability-table";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityDetails } from "./availability-details";
import { useConfirmDialog, confirmPresets } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";

export function AvailabilityClient() {
  // State
  const [availability, setAvailability] = useState([]);
  const [users, setUsers] = useState([]);
  const [aircraft, setAircraft] = useState([]);
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
        setAvailability(availabilityData);
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

  // Filter availability
  const filteredAvailability = availability.filter(item => {
    const matchesSearch = !filters.search || 
      item.reason?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesType = filters.type === "all" || item.type === filters.type;
    
    // Date range filtering
    let matchesDateRange = true;
    if (filters.dateRange !== "all") {
      const itemDate = new Date(item.start_date);
      const now = new Date();
      
      switch (filters.dateRange) {
        case "today":
          matchesDateRange = itemDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          matchesDateRange = itemDate >= weekStart && itemDate <= weekEnd;
          break;
        case "month":
          matchesDateRange = itemDate.getMonth() === now.getMonth() && 
                            itemDate.getFullYear() === now.getFullYear();
          break;
      }
    }

    return matchesSearch && matchesType && matchesDateRange;
  });

  // Get availability counts
  const availabilityCounts = {
    total: availability.length,
    personal: availability.filter(a => a.type === "user").length,
    aircraftHolds: availability.filter(a => a.type === "aircraft").length,
    upcoming: availability.filter(a => new Date(a.start_date) > new Date()).length,
    active: availability.filter(a => {
      const now = new Date();
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
      toast.error("Failed to create availability");
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
      toast.error("Failed to update availability");
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
    
    toast.info(`Creating availability for ${new Date(date).toLocaleDateString()} at ${startTime}`);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "all",
      dateRange: "all",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading availability...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAllData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Availability Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal availability and aircraft holds
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
                  : "Set your personal availability or create aircraft holds."
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{availabilityCounts.total}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Personal</p>
                <p className="text-2xl font-bold text-blue-600">{availabilityCounts.personal}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aircraft Holds</p>
                <p className="text-2xl font-bold text-purple-600">{availabilityCounts.aircraftHolds}</p>
              </div>
              <Plane className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-green-600">{availabilityCounts.upcoming}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold text-orange-600">{availabilityCounts.active}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
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
                <SelectItem value="user">Personal</SelectItem>
                <SelectItem value="aircraft">Aircraft Holds</SelectItem>
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
            
            <Button variant="outline" onClick={resetFilters} size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle & Content */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-6">
          <AvailabilityCalendar
            availability={filteredAvailability}
            users={users}
            aircraft={aircraft}
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