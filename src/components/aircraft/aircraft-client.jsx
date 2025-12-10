"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Filter,
  AlertCircle
} from 'lucide-react';
import { aircraftAPI } from '@/lib/api';
import { toast } from 'sonner';
import { AircraftForm } from '@/components/aircraft/aircraft-form';
import { AircraftDetails } from '@/components/aircraft/aircraft-details';
import { usePermission } from '@/components/rbac/role-gate';

export function AircraftClient() {
  const canCreateAircraft = usePermission('createAircraft');
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredAircraft = aircraft.filter(aircraft =>
    aircraft.tail_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aircraft.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OK':
        return <GoldenBadge variant="success">Active</GoldenBadge>;
      case 'MAINTENANCE':
        return <GoldenBadge variant="warning">Maintenance</GoldenBadge>;
      case 'HOLD':
        return <GoldenBadge variant="error">On Hold</GoldenBadge>;
      default:
        return <GoldenBadge variant="secondary">Unknown</GoldenBadge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="icon-xl mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Aircraft</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchAircraft}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Aircraft Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your flight school fleet
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canCreateAircraft && (
            <GoldenButton onClick={handleAddAircraft}>
              <Plus className="icon-lg mr-2" />
              Add Aircraft
            </GoldenButton>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 icon-lg icon-black dark:icon-black-dark" />
              <Input
                placeholder="Search aircraft by tail number or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="icon-lg mr-2 icon-black dark:icon-black-dark" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aircraft Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
          <CardDescription>
            {filteredAircraft.length} aircraft in your fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                                  <TableRow>
                    <TableHead>Tail Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Open Squawks</TableHead>
                    <TableHead>Indicator</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAircraft.map((aircraft) => (
                  <TableRow key={aircraft.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="icon-container dark:icon-container-dark">
                          <Plane className="icon-lg icon-black dark:icon-black-dark" />
                        </div>
                        <span 
                          className="font-bold text-golden dark:text-golden-dark hover:underline cursor-pointer"
                          onClick={() => handleViewDetails(aircraft)}
                        >
                          {aircraft.tail_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(aircraft.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">{aircraft.notes || 'N/A'}</TableCell>
                    <TableCell>
                      <GoldenBadge variant={aircraft.open_squawks > 0 ? "error" : "success"}>
                        {aircraft.open_squawks || 0}
                      </GoldenBadge>
                    </TableCell>
                    <TableCell>
                      <GoldenBadge variant={
                        aircraft.indicator === 'RED' ? "error" : 
                        aircraft.indicator === 'YELLOW' ? "warning" : 
                        "success"
                      }>
                        {aircraft.indicator || 'GREEN'}
                      </GoldenBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(aircraft)}
                        >
                          <Eye className="icon-lg icon-black dark:icon-black-dark" />
                        </Button>
                        {canCreateAircraft && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAircraft(aircraft)}
                            >
                              <Edit className="icon-lg icon-black dark:icon-black-dark" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAircraft(aircraft)}
                            >
                              <Trash2 className="icon-lg icon-black dark:icon-black-dark" />
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
        </CardContent>
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
