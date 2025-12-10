"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Filter, Settings, Wrench, AlertTriangle, Clock, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { maintenanceAPI, aircraftAPI } from "@/lib/api";
import { MaintenanceTable } from "./maintenance-table";
import { MaintenanceForm } from "./maintenance-form";
import { MaintenanceDetails } from "./maintenance-details";
import { useConfirmDialog, confirmPresets } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import { usePermission } from "@/components/rbac/role-gate";

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
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "all", // all, POSTED, NEARING, DUE, COMPLETED
    aircraft: "all",
    dateRange: "all", // all, overdue, upcoming
  });

  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const { user } = useAuth();
  const canPostMaintenance = usePermission('postMaintenance');
  const canResolveMaint = usePermission('resolveMaint');

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
    const confirmed = await showConfirm({
      title: "Complete Maintenance",
      description: `Mark "${maintenanceItem.title}" as completed?`,
      confirmText: "Complete",
      onConfirm: async () => {
        try {
          await maintenanceAPI.complete(maintenanceItem.id);
          toast.success("Maintenance item completed successfully");
          fetchAllData();
        } catch (error) {
          console.error("Error completing maintenance item:", error);
          toast.error("Failed to complete maintenance item");
          throw error;
        }
      }
    });
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading maintenance items...</p>
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
          <h1 className="text-3xl font-bold">Maintenance Management</h1>
          <p className="text-muted-foreground">
            Track and manage aircraft maintenance items
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{maintenanceStats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Now</p>
                <p className="text-2xl font-bold text-red-600">{maintenanceStats.due}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nearing</p>
                <p className="text-2xl font-bold text-yellow-600">{maintenanceStats.nearing}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Posted</p>
                <p className="text-2xl font-bold text-blue-600">{maintenanceStats.posted}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{maintenanceStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
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
            
            <Button variant="outline" onClick={resetFilters} size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Reset
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

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
