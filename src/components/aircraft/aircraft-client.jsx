"use client"

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoldenButton } from '@/components/ui/golden-button';
import { GoldenBadge } from '@/components/ui/golden-badge';
import { Input } from '@/components/ui/input';
import { useConfirmDialog, confirmPresets } from '@/components/ui/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plane, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { aircraftAPI } from '@/lib/api';
import { toast } from 'sonner';
import { AircraftForm } from '@/components/aircraft/aircraft-form';
import { AircraftDetails } from '@/components/aircraft/aircraft-details';
import { usePermission } from '@/components/rbac/role-gate';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatTile, Pill, EmptyRow } from '@/components/ui/panels';

export function AircraftClient() {
  const canCreateAircraft = usePermission('createAircraft');
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState(null);
  
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    fetchAircraft();
  }, []);

  const fetchAircraft = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await aircraftAPI.getAll();
      setAircraft(response.data);
    } catch (error) {
      console.error('Error fetching aircraft:', error);
      setError('Failed to fetch aircraft data');
      toast.error('Failed to fetch aircraft data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAircraft = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  };

  const handleEditAircraft = (aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };

  const handleViewDetails = (aircraft) => {
    setSelectedAircraft(aircraft);
    setIsDetailsOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingAircraft(null);
    fetchAircraft();
    toast.success(editingAircraft ? 'Aircraft updated successfully' : 'Aircraft added successfully');
  };

  const handleDeleteAircraft = async (aircraft) => {
    const confirmed = await showConfirm({
      ...confirmPresets.delete(aircraft.tail_number),
      onConfirm: async () => {
        try {
          await aircraftAPI.delete(aircraft.id);
          fetchAircraft();
          toast.success('Aircraft deleted successfully');
        } catch (error) {
          console.error('Error deleting aircraft:', error);
          toast.error('Failed to delete aircraft');
          throw error; // Re-throw to show error state in dialog
        }
      }
    });
  };

  // `indicator` is the maintenance-due signal computed by the API (GREEN/YELLOW/RED),
  // not the airworthiness status. Label it as such so it means something to a student.
  const matchesSearch = (item) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return item.tail_number?.toLowerCase().includes(term)
      || item.notes?.toLowerCase().includes(term);
  };

  const filteredAircraft = aircraft.filter((item) => {
    if (!matchesSearch(item)) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'MAINT_DUE') return item.indicator === 'RED' || item.indicator === 'YELLOW';
    return item.status === statusFilter;
  });

  const fleet = {
    total: aircraft.length,
    available: aircraft.filter((item) => item.status === 'OK').length,
    grounded: aircraft.filter((item) => item.status && item.status !== 'OK').length,
    maintenanceDue: aircraft.filter((item) => item.indicator === 'RED' || item.indicator === 'YELLOW').length,
    openSquawks: aircraft.reduce((total, item) => total + Number(item.open_squawks || 0), 0),
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OK':
        return <GoldenBadge variant="success">Airworthy</GoldenBadge>;
      case 'MAINTENANCE':
        return <GoldenBadge variant="warning">Maintenance</GoldenBadge>;
      case 'HOLD':
        return <GoldenBadge variant="error">On Hold</GoldenBadge>;
      default:
        return <GoldenBadge variant="secondary">Unknown</GoldenBadge>;
    }
  };

  const getMaintenanceBadge = (indicator) => {
    switch (indicator) {
      case 'RED':
        return <Pill tone="danger" icon={AlertTriangle}>Due now</Pill>;
      case 'YELLOW':
        return <Pill tone="warning" icon={Clock}>Due soon</Pill>;
      default:
        return <Pill tone="success" icon={CheckCircle2}>Clear</Pill>;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
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
              <AlertCircle className="size-6 text-red-600 dark:text-red-400" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Failed to load aircraft</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchAircraft} className="mt-2">Try again</Button>
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
            {canCreateAircraft ? 'Aircraft Management' : 'Fleet'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {canCreateAircraft
              ? 'Manage the fleet, meters, and airworthiness status.'
              : 'Aircraft status, meters, and maintenance across the fleet.'}
          </p>
        </div>
        {canCreateAircraft && (
          <GoldenButton onClick={handleAddAircraft}>
            <Plus className="mr-2 h-4 w-4" />
            Add Aircraft
          </GoldenButton>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Fleet Size"
          value={fleet.total}
          icon={Plane}
          tone="gold"
          hint={`${fleet.available} airworthy`}
        />
        <StatTile
          label="Not Airworthy"
          value={fleet.grounded}
          icon={Wrench}
          tone={fleet.grounded > 0 ? 'warning' : 'success'}
          hint={fleet.grounded > 0 ? 'In maintenance or on hold' : 'Whole fleet available'}
        />
        <StatTile
          label="Maintenance Due"
          value={fleet.maintenanceDue}
          icon={Clock}
          tone={fleet.maintenanceDue > 0 ? 'warning' : 'success'}
          hint={fleet.maintenanceDue > 0 ? 'Due now or within 14 days' : 'Nothing coming due'}
        />
        <StatTile
          label="Open Squawks"
          value={fleet.openSquawks}
          icon={AlertTriangle}
          tone={fleet.openSquawks > 0 ? 'danger' : 'success'}
          hint={fleet.openSquawks > 0 ? 'Across the fleet' : 'All clear'}
        />
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by tail number or notes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="All aircraft" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All aircraft</SelectItem>
              <SelectItem value="OK">Airworthy</SelectItem>
              <SelectItem value="MAINTENANCE">In maintenance</SelectItem>
              <SelectItem value="HOLD">On hold</SelectItem>
              <SelectItem value="MAINT_DUE">Maintenance due</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground tabular-nums">{filteredAircraft.length}</span>
            {' of '}<span className="tabular-nums">{aircraft.length}</span>
          </p>
        </div>
      </Card>

      <Card className="gap-0 py-0">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Fleet overview</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tail number, airworthiness, meters, and open issues.
          </p>
        </div>
        {filteredAircraft.length === 0 ? (
          <EmptyRow
            icon={Plane}
            title={aircraft.length === 0 ? 'No aircraft yet' : 'No aircraft match your filters'}
            description={aircraft.length === 0
              ? 'Aircraft added to the fleet will appear here.'
              : 'Try a different search term or clear the status filter.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Maintenance</TableHead>
                  <TableHead className="text-right">Hobbs</TableHead>
                  <TableHead className="text-right">Tach</TableHead>
                  <TableHead>Open Squawks</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAircraft.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(item)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-golden/12">
                          <Plane className="size-4 text-golden" />
                        </span>
                        <span className="font-bold text-golden">{item.tail_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{getMaintenanceBadge(item.indicator)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.hobbs_time != null ? Number(item.hobbs_time).toFixed(1) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.tach_time != null ? Number(item.tach_time).toFixed(1) : '—'}
                    </TableCell>
                    <TableCell>
                      {Number(item.open_squawks || 0) > 0 ? (
                        <Pill tone="danger" icon={AlertTriangle}>{item.open_squawks}</Pill>
                      ) : (
                        <span className="text-sm text-muted-foreground tabular-nums">0</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {item.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(item)} aria-label="View details">
                          <Eye className="size-4" />
                        </Button>
                        {canCreateAircraft && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEditAircraft(item)} aria-label="Edit aircraft">
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteAircraft(item)}
                              aria-label="Delete aircraft"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Aircraft Form Dialog - LARGER with SCROLL */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}
            </DialogTitle>
            <DialogDescription>
              {editingAircraft 
                ? 'Update the aircraft information below.'
                : 'Add a new aircraft to your fleet.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-1">
            <AircraftForm
              aircraft={editingAircraft}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Aircraft Details Sheet - GLOBAL WIDTH with SCROLL and PADDING */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="overflow-hidden">
          <SheetHeader>
            <SheetTitle>Aircraft Details</SheetTitle>
            <SheetDescription>
              Detailed information about {selectedAircraft?.tail_number}
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto max-h-[calc(100vh-200px)] flex-1">
            {selectedAircraft && (
              <AircraftDetails 
                aircraft={selectedAircraft}
                onEdit={() => {
                  setIsDetailsOpen(false);
                  handleEditAircraft(selectedAircraft);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
