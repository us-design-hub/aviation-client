"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Filter, Wrench, AlertTriangle, Clock, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { maintenanceAPI, aircraftAPI } from "@/lib/api";
import { MaintenanceTable } from "./maintenance-table";
import { MaintenanceForm } from "./maintenance-form";
import { MaintenanceDetails } from "./maintenance-details";
import { usePermission } from "@/components/rbac/role-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/panels";

export function MaintenanceClient() {
  // State
  const [maintenance, setMaintenance] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completingMaintenance, setCompletingMaintenance] = useState(null);
  const [nextDueTach, setNextDueTach] = useState("");
  const [completing, setCompleting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "all", // all, POSTED, NEARING, DUE, COMPLETED
    aircraft: "all",
    dateRange: "all", // all, overdue, upcoming
  });

  const canPostMaintenance = usePermission('postMaintenance');

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [maintenanceRes, aircraftRes] = await Promise.all([
        maintenanceAPI.getAll(),
        aircraftAPI.getAll(),
      ]);
      
      setMaintenance(maintenanceRes.data || []);
      setAircraft(aircraftRes.data || []);
      
    } catch (error) {
      console.error("Error fetching maintenance data:", error);
      setError("Failed to fetch maintenance data");
      toast.error("Failed to fetch maintenance data");
    } finally {
      setLoading(false);
    }
  };

  // Create maintenance item
  const handleCreateMaintenance = async (aircraftId, maintenanceData) => {
    try {
      await maintenanceAPI.create(aircraftId, maintenanceData);
      toast.success("Maintenance item created successfully");
      setIsFormOpen(false);
      fetchAllData();
    } catch (error) {
      console.error("Error creating maintenance item:", error);
      toast.error("Failed to create maintenance item");
      throw error;
    }
  };

  // Update maintenance item
  const handleUpdateMaintenance = async (id, maintenanceData) => {
    try {
      await maintenanceAPI.update(id, maintenanceData);
      toast.success("Maintenance item updated successfully");
      setIsFormOpen(false);
      setEditingMaintenance(null);
      fetchAllData();
    } catch (error) {
      console.error("Error updating maintenance item:", error);
      toast.error("Failed to update maintenance item");
      throw error;
    }
  };

  // Delete maintenance item
  const handleDeleteMaintenance = async (maintenanceItem) => {
    const itemName = `${maintenanceItem.tail_number || 'Aircraft'} - ${maintenanceItem.title}`;
    
    const confirmed = await showConfirm({
      ...confirmPresets.delete(itemName),
      onConfirm: async () => {
        try {
          await maintenanceAPI.delete(maintenanceItem.id);
          toast.success("Maintenance item deleted successfully");
          fetchAllData();
        } catch (error) {
          console.error("Error deleting maintenance item:", error);
          toast.error("Failed to delete maintenance item");
          throw error; // Re-throw to show the confirmation dialog failed
        }
      }
    });
  };

  // Complete maintenance item
  const handleCompleteMaintenance = async (maintenanceItem) => {
    setCompletingMaintenance(maintenanceItem);
    setNextDueTach("");
    setCompletionDialogOpen(true);
  };

  const submitCompleteMaintenance = async () => {
    if (!completingMaintenance) return;

    try {
      setCompleting(true);
      const payload = {};
      if (nextDueTach !== "") {
        payload.nextDueTach = Number(nextDueTach);
      }

      const response = await maintenanceAPI.complete(completingMaintenance.id, payload);
      const nextItem = response?.data?.data?.nextItem;
      toast.success(
        nextItem
          ? `Maintenance completed and next due Tach saved for ${Number(nextItem.due_tach ?? nextItem.due_hobbs).toFixed(1)}`
          : "Maintenance item completed successfully"
      );
      setCompletionDialogOpen(false);
      setCompletingMaintenance(null);
      setNextDueTach("");
      fetchAllData();
    } catch (error) {
      console.error("Error completing maintenance item:", error);
      const message =
        error?.response?.data?.details ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to complete maintenance item";
      toast.error(message);
    } finally {
      setCompleting(false);
    }
  };

  // Handle maintenance item click
  const handleMaintenanceClick = (maintenanceItem) => {
    setSelectedMaintenance(maintenanceItem);
    setIsDetailsOpen(true);
  };

  // Handle edit
  const handleEditMaintenance = (maintenanceItem) => {
    setEditingMaintenance(maintenanceItem);
    setIsFormOpen(true);
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

  // Filter maintenance items
  const filteredMaintenance = maintenance.filter((item) => {
    // Search filter
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !item.tail_number?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    // Aircraft filter
    if (filters.aircraft !== "all" && item.aircraft_id !== filters.aircraft) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      const dueDate = item.due_date ? new Date(item.due_date) : null;
      
      if (filters.dateRange === "overdue" && (!dueDate || dueDate >= now)) {
        return false;
      }
      
      if (filters.dateRange === "upcoming") {
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (!dueDate || dueDate <= now || dueDate > thirtyDaysFromNow) {
          return false;
        }
      }
    }

    return true;
  });

  // Calculate stats
  const maintenanceStats = {
    total: maintenance.length,
    due: maintenance.filter(item => item.status === 'DUE').length,
    nearing: maintenance.filter(item => item.status === 'NEARING').length,
    posted: maintenance.filter(item => item.status === 'POSTED').length,
    completed: maintenance.filter(item => item.status === 'COMPLETED').length,
  };

  const activeFilterCount = [
    filters.search,
    filters.status !== 'all' ? filters.status : '',
    filters.aircraft !== 'all' ? filters.aircraft : '',
    filters.dateRange !== 'all' ? filters.dateRange : '',
  ].filter(Boolean).length;

  const setFilter = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

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
              <h2 className="text-lg font-semibold">Could not load maintenance</h2>
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
            {canPostMaintenance ? 'Maintenance Management' : 'Aircraft Maintenance'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {canPostMaintenance
              ? 'Track, schedule, and sign off aircraft maintenance items.'
              : 'Inspections and maintenance items affecting the fleet you fly.'}
          </p>
        </div>
        {canPostMaintenance && (
          <Sheet open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingMaintenance(null);
          }}>
            <Button 
              className="bg-golden-gradient hover:bg-golden-gradient/90"
              onClick={() => {
                setEditingMaintenance(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Maintenance Item
            </Button>
          <SheetContent className="w-full sm:w-[600px] lg:w-[700px] overflow-y-auto max-w-full">
            <SheetHeader className="sticky top-0 bg-background pb-4 border-b">
              <SheetTitle>
                {editingMaintenance ? "Edit Maintenance Item" : "Add New Maintenance Item"}
              </SheetTitle>
              <SheetDescription>
                {editingMaintenance 
                  ? "Update the maintenance item details below."
                  : "Fill in the details to create a new maintenance item."
                }
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 pb-6">
              <MaintenanceForm
                maintenance={editingMaintenance}
                aircraft={aircraft}
                onSubmit={editingMaintenance ? 
                  (data) => handleUpdateMaintenance(editingMaintenance.id, data) : 
                  (aircraftId, data) => handleCreateMaintenance(aircraftId, data)
                }
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingMaintenance(null);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Total Items"
          value={maintenanceStats.total}
          icon={Wrench}
          tone="gold"
          hint="All maintenance records"
        />
        <StatTile
          label="Due Now"
          value={maintenanceStats.due}
          icon={AlertTriangle}
          tone={maintenanceStats.due > 0 ? "danger" : "success"}
          hint={maintenanceStats.due > 0 ? "Grounding risk" : "Nothing overdue"}
        />
        <StatTile
          label="Nearing"
          value={maintenanceStats.nearing}
          icon={Clock}
          tone={maintenanceStats.nearing > 0 ? "warning" : "neutral"}
          hint={maintenanceStats.nearing > 0 ? "Approaching limits" : "Nothing approaching"}
        />
        <StatTile
          label="Posted"
          value={maintenanceStats.posted}
          icon={Calendar}
          tone="info"
          hint="Scheduled, not yet due"
        />
        <StatTile
          label="Completed"
          value={maintenanceStats.completed}
          icon={CheckCircle}
          tone="success"
          hint="Signed off to date"
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
                  placeholder="Search maintenance items..."
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
                <SelectItem value="DUE">Due</SelectItem>
                <SelectItem value="NEARING">Nearing</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
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
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="upcoming">Upcoming (30 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground tabular-nums">{filteredMaintenance.length}</span>
              {' of '}<span className="tabular-nums">{maintenance.length}</span> items
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`}
            </p>
            <Button variant="outline" onClick={resetFilters} size="sm" disabled={activeFilterCount === 0}>
              <Filter className="h-4 w-4 mr-2" />
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Table */}
      <MaintenanceTable
        maintenance={filteredMaintenance}
        aircraft={aircraft}
        onMaintenanceClick={handleMaintenanceClick}
        onEditMaintenance={handleEditMaintenance}
        onDeleteMaintenance={handleDeleteMaintenance}
        onCompleteMaintenance={handleCompleteMaintenance}
      />

      {/* Maintenance Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[600px] lg:w-[800px] overflow-y-auto max-w-full">
          {selectedMaintenance && (
            <MaintenanceDetails
              maintenance={selectedMaintenance}
              aircraft={aircraft.find(ac => ac.id === selectedMaintenance.aircraft_id)}
              onEdit={() => {
                setIsDetailsOpen(false);
                handleEditMaintenance(selectedMaintenance);
              }}
              onDelete={() => {
                setIsDetailsOpen(false);
                handleDeleteMaintenance(selectedMaintenance);
              }}
              onComplete={() => {
                handleCompleteMaintenance(selectedMaintenance);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={completionDialogOpen}
        onOpenChange={(open) => {
          if (!completing) {
            setCompletionDialogOpen(open);
            if (!open) {
              setCompletingMaintenance(null);
              setNextDueTach("");
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Maintenance</DialogTitle>
            <DialogDescription>
              Mark this maintenance item as complete and optionally save the next Tach threshold.
            </DialogDescription>
          </DialogHeader>

          {completingMaintenance && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="font-medium">{completingMaintenance.title}</div>
                <div className="text-sm text-muted-foreground">
                  {(aircraft.find((ac) => ac.id === completingMaintenance.aircraft_id)?.tail_number) || "Unknown aircraft"}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="next-due-hours">
                  New due Tach
                </label>
                <Input
                  id="next-due-hours"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Leave blank to just mark complete"
                  value={nextDueTach}
                  onChange={(e) => setNextDueTach(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the next Tach threshold for this maintenance item. Leave blank if you only want to close the current item.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCompletionDialogOpen(false);
                setCompletingMaintenance(null);
                setNextDueTach("");
              }}
              disabled={completing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-golden-gradient hover:bg-golden-gradient/90"
              onClick={submitCompleteMaintenance}
              disabled={completing}
            >
              {completing ? "Saving..." : "Save Completion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
