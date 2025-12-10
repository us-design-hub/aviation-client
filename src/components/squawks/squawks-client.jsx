"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Filter, AlertTriangle, CheckCircle, Clock, Plane, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { squawksAPI, aircraftAPI } from "@/lib/api";
import { SquawksTable } from "./squawks-table";
import { SquawksForm } from "./squawks-form";
import { SquawksDetails } from "./squawks-details";
import { useConfirmDialog, confirmPresets } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";

export function SquawksClient() {
  // State
  const [squawks, setSquawks] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [selectedSquawk, setSelectedSquawk] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "all", // all, OPEN, RESOLVED
    aircraft: "all",
    dateRange: "all", // all, today, week, month
  });

  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const { user } = useAuth();

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [squawksRes, aircraftRes] = await Promise.all([
        squawksAPI.getAll(),
        aircraftAPI.getAll(),
      ]);
      
      setSquawks(squawksRes.data || []);
      setAircraft(aircraftRes.data || []);
      
    } catch (error) {
      console.error("Error fetching squawks data:", error);
      setError("Failed to fetch squawks data");
      toast.error("Failed to fetch squawks data");
    } finally {
      setLoading(false);
    }
  };

  // Create squawk
  const handleCreateSquawk = async (aircraftId, squawkData) => {
    try {
      await squawksAPI.create(aircraftId, squawkData);
      toast.success("Squawk reported successfully");
      setIsFormOpen(false);
      fetchAllData();
    } catch (error) {
      console.error("Error creating squawk:", error);
      toast.error("Failed to report squawk");
      throw error;
    }
  };

  // Resolve squawk
  const handleResolveSquawk = async (squawk) => {
    const confirmed = await showConfirm({
      title: "Resolve Squawk",
      description: `Mark "${squawk.description}" as resolved?`,
      confirmText: "Resolve",
      onConfirm: async () => {
        try {
          await squawksAPI.resolve(squawk.id);
          toast.success("Squawk resolved successfully");
          fetchAllData();
        } catch (error) {
          console.error("Error resolving squawk:", error);
          toast.error("Failed to resolve squawk");
          throw error;
        }
      }
    });
  };

  // Handle squawk click
  const handleSquawkClick = (squawk) => {
    setSelectedSquawk(squawk);
    setIsDetailsOpen(true);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      aircraft: "all", 
      dateRange: "all",
    });
  };

  // Filter squawks
  const filteredSquawks = squawks.filter((squawk) => {
    // Search filter
    if (filters.search && !squawk.description.toLowerCase().includes(filters.search.toLowerCase()) &&
        !squawk.tail_number?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status !== "all" && squawk.status !== filters.status) {
      return false;
    }

    // Aircraft filter
    if (filters.aircraft !== "all" && squawk.aircraft_id !== filters.aircraft) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const createdDate = new Date(squawk.created_at);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (filters.dateRange === "today" && createdDate < today) {
        return false;
      }
      
      if (filters.dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (createdDate < weekAgo) {
          return false;
        }
      }
      
      if (filters.dateRange === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (createdDate < monthAgo) {
          return false;
        }
      }
    }

    return true;
  });

  // Calculate stats
  const squawkStats = {
    total: squawks.length,
    open: squawks.filter(s => s.status === 'OPEN').length,
    resolved: squawks.filter(s => s.status === 'RESOLVED').length,
    today: squawks.filter(s => {
      const createdDate = new Date(s.created_at);
      const today = new Date();
      return createdDate.toDateString() === today.toDateString();
    }).length,
  };

  // Check permissions
  const canReportSquawk = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const canResolveSquawk = user?.role === 'MAINT' || user?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading squawks...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchAllData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Squawks Management</h1>
          <p className="text-muted-foreground">
            Track and manage aircraft issues and defects
          </p>
        </div>
        
        {canReportSquawk && (
          <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Button 
              className="bg-golden-gradient hover:bg-golden-gradient/90"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Report Squawk
            </Button>
            <SheetContent className="w-full sm:w-[600px] lg:w-[700px] overflow-y-auto max-w-full">
              <SheetHeader className="sticky top-0 bg-background pb-4 border-b">
                <SheetTitle>Report New Squawk</SheetTitle>
                <SheetDescription>
                  Report an aircraft issue or defect that needs attention.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 pb-6">
                <SquawksForm
                  aircraft={aircraft}
                  onSubmit={handleCreateSquawk}
                  onCancel={() => setIsFormOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Squawks</p>
                <p className="text-2xl font-bold">{squawkStats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Issues</p>
                <p className="text-2xl font-bold text-red-600">{squawkStats.open}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{squawkStats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-blue-600">{squawkStats.today}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
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
                  placeholder="Search squawks..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.aircraft} onValueChange={(value) => setFilters(prev => ({ ...prev, aircraft: value }))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Aircraft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aircraft</SelectItem>
                {aircraft.map((ac) => (
                  <SelectItem key={ac.id} value={ac.id}>
                    {ac.tail_number}
                  </SelectItem>
                ))}
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

      {/* Squawks Table */}
      <SquawksTable
        squawks={filteredSquawks}
        aircraft={aircraft}
        onSquawkClick={handleSquawkClick}
        onResolveSquawk={canResolveSquawk ? handleResolveSquawk : null}
      />

      {/* Squawk Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[600px] lg:w-[800px] overflow-y-auto max-w-full">
          {selectedSquawk && (
            <SquawksDetails
              squawk={selectedSquawk}
              aircraft={aircraft.find(ac => ac.id === selectedSquawk.aircraft_id)}
              onResolve={canResolveSquawk ? () => handleResolveSquawk(selectedSquawk) : null}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
