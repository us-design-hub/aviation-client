"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Filter, AlertTriangle, CheckCircle, Clock, Plane, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { squawksAPI, aircraftAPI } from "@/lib/api";
import { SquawksTable } from "./squawks-table";
import { SquawksForm } from "./squawks-form";
import { SquawksDetails } from "./squawks-details";
import { useConfirmDialog, confirmPresets } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/panels";

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
  const canReportSquawk = user?.role === 'STUDENT' || user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN' || user?.role === 'RENTER';
  const canResolveSquawk = user?.role === 'MAINT' || user?.role === 'ADMIN';

  const activeFilterCount = [
    filters.search,
    filters.status !== 'all' ? filters.status : '',
    filters.aircraft !== 'all' ? filters.aircraft : '',
    filters.dateRange !== 'all' ? filters.dateRange : '',
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
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
              <h2 className="text-lg font-semibold">Could not load squawks</h2>
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {canResolveSquawk ? 'Squawks Management' : 'Aircraft Squawks'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {canResolveSquawk
              ? 'Review and resolve reported aircraft issues and defects.'
              : 'Known issues across the fleet, and anything you have reported.'}
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
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open Issues"
          value={squawkStats.open}
          icon={AlertTriangle}
          tone={squawkStats.open > 0 ? "danger" : "success"}
          hint={squawkStats.open > 0 ? "Awaiting resolution" : "Fleet is clear"}
        />
        <StatTile
          label="Reported Today"
          value={squawkStats.today}
          icon={Calendar}
          tone={squawkStats.today > 0 ? "warning" : "neutral"}
          hint={squawkStats.today > 0 ? "New since midnight" : "Nothing new today"}
        />
        <StatTile
          label="Resolved"
          value={squawkStats.resolved}
          icon={CheckCircle}
          tone="success"
          hint="Signed off to date"
        />
        <StatTile
          label="Total Squawks"
          value={squawkStats.total}
          icon={Clock}
          tone="gold"
          hint="All reports on record"
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
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground tabular-nums">{filteredSquawks.length}</span>
              {' of '}<span className="tabular-nums">{squawks.length}</span> squawks
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`}
            </p>
            <Button variant="outline" onClick={resetFilters} size="sm" disabled={activeFilterCount === 0}>
              <Filter className="h-4 w-4 mr-2" />
              Reset filters
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
