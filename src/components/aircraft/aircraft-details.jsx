"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoldenButton } from '@/components/ui/golden-button';
import { GoldenBadge } from '@/components/ui/golden-badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useConfirmDialog, confirmPresets } from '@/components/ui/confirm-dialog';
import { 
  Plane, 
  Edit, 
  Trash2, 
  Settings, 
  Clock, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Scale,
  Activity,
  Plus,
  LogIn,
  LogOut,
  FileText,
  Users
} from 'lucide-react';
import { aircraftAPI, squawksAPI } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

export function AircraftDetails({ aircraft, onEdit, onDelete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [weightBalance, setWeightBalance] = useState(null);
  const [hobbsTachLogs, setHobbsTachLogs] = useState([]);
  const [squawks, setSquawks] = useState([]);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [showSquawkDialog, setShowSquawkDialog] = useState(false);
  const [showWBDialog, setShowWBDialog] = useState(false);
  const [hobbsTachForm, setHobbsTachForm] = useState({ hobbs: '', tach: '' });
  const [squawkForm, setSquawkForm] = useState({ description: '' });
  const [wbForm, setWBForm] = useState({ basicEmptyWeight: '', moment: '' });
  
  const { user } = useAuth();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    if (aircraft?.id) {
      fetchAircraftDetails();
    }
  }, [aircraft?.id]);

  const fetchAircraftDetails = async () => {
    if (!aircraft?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch all aircraft details in parallel
      const [wbResponse, logsResponse, squawksResponse] = await Promise.all([
        aircraftAPI.getLatestWeightBalance(aircraft.id).catch(() => ({ data: null })),
        aircraftAPI.getLogs(aircraft.id).catch(() => ({ data: [] })),
        squawksAPI.getByAircraft(aircraft.id).catch(() => ({ data: [] }))
      ]);

      setWeightBalance(wbResponse.data);
      setHobbsTachLogs(logsResponse.data || []);
      setSquawks(squawksResponse.data || []);
    } catch (error) {
      console.error('Error fetching aircraft details:', error);
      toast.error('Failed to load aircraft details');
    } finally {
      setIsLoading(false);
    }
  };

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Role-based permissions
  const canPerformInstructorActions = () => {
    return user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN' || user?.isLeadInstructor;
  };

  const canPerformMaintenanceActions = () => {
    return user?.role === 'MAINT' || user?.role === 'ADMIN';
  };

  const canEditAircraft = () => {
    return user?.role === 'ADMIN' || user?.role === 'MAINT';
  };

  const handleCheckout = async () => {
    try {
      await aircraftAPI.checkout(aircraft.id, {
        hobbs: parseFloat(hobbsTachForm.hobbs),
        tach: parseFloat(hobbsTachForm.tach)
      });
      toast.success('Aircraft checked out successfully');
      setShowCheckoutDialog(false);
      setHobbsTachForm({ hobbs: '', tach: '' });
      // Refresh aircraft details to update checkout state
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(error.response?.data?.message || 'Checkout failed');
    }
  };

  const handleCheckin = async () => {
    try {
      await aircraftAPI.checkin(aircraft.id, {
        hobbs: parseFloat(hobbsTachForm.hobbs),
        tach: parseFloat(hobbsTachForm.tach)
      });
      toast.success('Aircraft checked in successfully');
      setShowCheckinDialog(false);
      setHobbsTachForm({ hobbs: '', tach: '' });
      // Refresh aircraft details to update checkout state
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Checkin failed:', error);
      toast.error(error.response?.data?.message || 'Checkin failed');
    }
  };

  const handleSubmitSquawk = async () => {
    try {
      await squawksAPI.create(aircraft.id, squawkForm);
      toast.success('Squawk submitted successfully');
      setShowSquawkDialog(false);
      setSquawkForm({ description: '' });
      fetchAircraftDetails();
    } catch (error) {
      console.error('Squawk submission failed:', error);
      toast.error('Failed to submit squawk');
    }
  };

  const handleUpdateWeightBalance = async () => {
    try {
      await aircraftAPI.updateWeightBalance(aircraft.id, {
        basicEmptyWeight: parseFloat(wbForm.basicEmptyWeight),
        moment: parseFloat(wbForm.moment)
      });
      toast.success('Weight & Balance updated successfully');
      setShowWBDialog(false);
      setWBForm({ basicEmptyWeight: '', moment: '' });
      fetchAircraftDetails();
    } catch (error) {
      console.error('Weight & Balance update failed:', error);
      toast.error('Failed to update Weight & Balance');
    }
  };

  const handleResolveSquawk = async (squawkId) => {
    try {
      await squawksAPI.resolve(squawkId);
      toast.success('Squawk resolved successfully');
      fetchAircraftDetails();
    } catch (error) {
      console.error('Failed to resolve squawk:', error);
      toast.error('Failed to resolve squawk');
    }
  };

  const handleDeleteAircraft = async () => {
    const confirmed = await showConfirm({
      ...confirmPresets.delete(aircraft.tail_number),
      onConfirm: async () => {
        try {
          if (onDelete) {
            await onDelete();
          }
        } catch (error) {
          console.error('Error deleting aircraft:', error);
          toast.error('Failed to delete aircraft');
          throw error;
        }
      }
    });
  };

  if (!aircraft) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No aircraft selected</p>
      </div>
    );
  }

  const latestLog = hobbsTachLogs[0];
  const openSquawks = squawks.filter(s => s.status === 'OPEN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="icon-container dark:icon-container-dark">
            <Plane className="icon-xl icon-black dark:icon-black-dark" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-golden dark:text-golden-dark">
              {aircraft.tail_number}
            </h2>
            <p className="text-sm text-gray-500">Aircraft Details</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusBadge(aircraft.status)}
          {canEditAircraft() && (
            <GoldenButton variant="outline" size="sm" onClick={onEdit}>
              <Edit className="icon-lg mr-2 icon-black dark:icon-black-dark" />
              Edit
            </GoldenButton>
          )}
          {user?.role === 'ADMIN' && onDelete && (
            <Button variant="outline" size="sm" onClick={handleDeleteAircraft}>
              <Trash2 className="icon-lg mr-2 icon-black dark:icon-black-dark" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Aircraft Status & Maintenance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="icon-lg icon-black dark:icon-black-dark" />
            <span>Aircraft Status & Maintenance Alerts</span>
          </CardTitle>
          <CardDescription>
            Current status and upcoming maintenance requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Maintenance Indicator</label>
              <div className="mt-1">
                <GoldenBadge variant={
                  aircraft.indicator === 'RED' ? "error" : 
                  aircraft.indicator === 'YELLOW' ? "warning" : 
                  "success"
                }>
                  {aircraft.indicator === 'RED' ? 'Due' : 
                   aircraft.indicator === 'YELLOW' ? 'Nearing' : 'OK'}
                </GoldenBadge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Open Squawks</label>
              <div className="mt-1">
                <GoldenBadge variant={aircraft.open_squawks > 0 ? "error" : "success"}>
                  {aircraft.open_squawks || 0} open
                </GoldenBadge>
              </div>
            </div>
          </div>
          
          {aircraft.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500">Notes</label>
              <p className="mt-1 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                {aircraft.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weight & Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scale className="icon-lg icon-black dark:icon-black-dark" />
              <span>Weight & Balance</span>
            </div>
            {canPerformMaintenanceActions() && (
              <Dialog open={showWBDialog} onOpenChange={setShowWBDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="icon-lg mr-2 icon-black dark:icon-black-dark" />
                    Update
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Weight & Balance</DialogTitle>
                    <DialogDescription>
                      Update the basic empty weight and moment for {aircraft.tail_number}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="basicEmptyWeight">Basic Empty Weight (lbs)</Label>
                      <Input
                        id="basicEmptyWeight"
                        type="number"
                        step="0.1"
                        value={wbForm.basicEmptyWeight}
                        onChange={(e) => setWBForm(prev => ({ ...prev, basicEmptyWeight: e.target.value }))}
                        placeholder="1650.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="moment">Moment (lb-in)</Label>
                      <Input
                        id="moment"
                        type="number"
                        step="0.1"
                        value={wbForm.moment}
                        onChange={(e) => setWBForm(prev => ({ ...prev, moment: e.target.value }))}
                        placeholder="62500.0"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowWBDialog(false)}>
                        Cancel
                      </Button>
                      <GoldenButton onClick={handleUpdateWeightBalance}>
                        Update Weight & Balance
                      </GoldenButton>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
          <CardDescription>
            Master aircraft weight & balance data (updated by Maintenance)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weightBalance ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Basic Empty Weight</label>
                <p className="text-lg font-mono">{weightBalance.basic_empty_weight} lbs</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Moment</label>
                <p className="text-lg font-mono">{weightBalance.moment} lb-in</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">As-of Timestamp</label>
                <p className="text-sm text-gray-600">{formatDateTime(weightBalance.as_of_ts)}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Scale className="icon-xl mx-auto mb-2 icon-black dark:icon-black-dark" />
              <p>No weight & balance data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hobbs & Tach Operations (Instructors Only) */}
      {canPerformInstructorActions() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="icon-lg icon-black dark:icon-black-dark" />
              <span>Aircraft Operations</span>
            </CardTitle>
            <CardDescription>
              Check-out/in aircraft with Hobbs & Tach entries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Checkout State Indicator */}
            {aircraft.isCheckedOut && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <LogOut className="icon-lg text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Aircraft is currently checked out
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              {/* Check Out Button - Show only if NOT checked out OR user is Admin */}
              {(!aircraft.isCheckedOut || user?.role === 'ADMIN') && (
                <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
                  <DialogTrigger asChild>
                    <GoldenButton variant="outline">
                      <LogOut className="icon-lg mr-2 icon-black dark:icon-black-dark" />
                      Check Out
                    </GoldenButton>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Check Out Aircraft</DialogTitle>
                      <DialogDescription>
                        Record Hobbs and Tach readings for {aircraft.tail_number}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {aircraft.isCheckedOut && user?.role === 'ADMIN' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ Admin Override: Aircraft is already checked out
                          </p>
                        </div>
                      )}
                      <div>
                        <Label htmlFor="hobbsOut">Hobbs Reading</Label>
                        <Input
                          id="hobbsOut"
                          type="number"
                          step="0.1"
                          value={hobbsTachForm.hobbs}
                          onChange={(e) => setHobbsTachForm(prev => ({ ...prev, hobbs: e.target.value }))}
                          placeholder="1234.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tachOut">Tach Reading</Label>
                        <Input
                          id="tachOut"
                          type="number"
                          step="0.1"
                          value={hobbsTachForm.tach}
                          onChange={(e) => setHobbsTachForm(prev => ({ ...prev, tach: e.target.value }))}
                          placeholder="1200.2"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowCheckoutDialog(false)}>
                          Cancel
                        </Button>
                        <GoldenButton onClick={handleCheckout}>
                          Check Out
                        </GoldenButton>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Check In Button - Show only if checked out OR user is Admin */}
              {(aircraft.isCheckedOut || user?.role === 'ADMIN') && (
                <Dialog open={showCheckinDialog} onOpenChange={setShowCheckinDialog}>
                  <DialogTrigger asChild>
                    <GoldenButton variant="outline">
                      <LogIn className="icon-lg mr-2 icon-black dark:icon-black-dark" />
                      Check In
                    </GoldenButton>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Check In Aircraft</DialogTitle>
                      <DialogDescription>
                        Record final Hobbs and Tach readings for {aircraft.tail_number}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!aircraft.isCheckedOut && user?.role === 'ADMIN' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ Admin Override: Aircraft is not checked out
                          </p>
                        </div>
                      )}
                      <div>
                        <Label htmlFor="hobbsIn">Hobbs Reading</Label>
                        <Input
                          id="hobbsIn"
                          type="number"
                          step="0.1"
                          value={hobbsTachForm.hobbs}
                          onChange={(e) => setHobbsTachForm(prev => ({ ...prev, hobbs: e.target.value }))}
                          placeholder="1236.8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tachIn">Tach Reading</Label>
                        <Input
                          id="tachIn"
                          type="number"
                          step="0.1"
                          value={hobbsTachForm.tach}
                          onChange={(e) => setHobbsTachForm(prev => ({ ...prev, tach: e.target.value }))}
                          placeholder="1202.5"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowCheckinDialog(false)}>
                          Cancel
                        </Button>
                        <GoldenButton onClick={handleCheckin}>
                          Check In
                        </GoldenButton>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {latestLog && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <label className="text-sm font-medium text-gray-500">Latest Reading</label>
                <div className="mt-1 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Action:</span> {latestLog.action}
                  </div>
                  <div>
                    <span className="font-medium">Hobbs:</span> {latestLog.hobbs}
                  </div>
                  <div>
                    <span className="font-medium">Tach:</span> {latestLog.tach}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDateTime(latestLog.ts)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Squawks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="icon-lg icon-black dark:icon-black-dark" />
              <span>Current Squawks/Issues</span>
            </div>
            {canPerformInstructorActions() && (
              <Dialog open={showSquawkDialog} onOpenChange={setShowSquawkDialog}>
                <DialogTrigger asChild>
                  <GoldenButton variant="outline" size="sm">
                    <Plus className="icon-lg mr-2 icon-black dark:icon-black-dark" />
                    Submit Squawk
                  </GoldenButton>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit New Squawk</DialogTitle>
                    <DialogDescription>
                      Report an issue with {aircraft.tail_number}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="squawkDescription">Description</Label>
                      <textarea
                        id="squawkDescription"
                        className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={squawkForm.description}
                        onChange={(e) => setSquawkForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the issue or squawk..."
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowSquawkDialog(false)}>
                        Cancel
                      </Button>
                      <GoldenButton onClick={handleSubmitSquawk}>
                        Submit Squawk
                      </GoldenButton>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
          <CardDescription>
            Current issues and squawks logged for this aircraft
          </CardDescription>
        </CardHeader>
        <CardContent>
          {openSquawks.length > 0 ? (
            <div className="space-y-3">
              {openSquawks.map((squawk) => (
                <div key={squawk.id} className="flex items-start justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="icon-lg text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        {squawk.description}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Reported: {formatDateTime(squawk.reported_at)}
                      </p>
                    </div>
                  </div>
                  {canPerformMaintenanceActions() && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        showConfirm({
                          title: 'Resolve Squawk',
                          description: `Are you sure you want to resolve this squawk? This action will mark it as completed.`,
                          confirmText: 'Resolve',
                          cancelText: 'Cancel',
                          type: 'success',
                          onConfirm: async () => {
                            await handleResolveSquawk(squawk.id);
                          }
                        });
                      }}
                    >
                      <CheckCircle className="icon-lg mr-2 icon-black dark:icon-black-dark" />
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <CheckCircle className="icon-xl mx-auto mb-2 text-green-500" />
              <p>No open squawks - Aircraft is clear</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {hobbsTachLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="icon-lg icon-black dark:icon-black-dark" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Latest check-in/out activity for this aircraft
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hobbsTachLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="icon-container dark:icon-container-dark">
                      {log.action === 'CHECKOUT' ? (
                        <LogOut className="icon-lg icon-black dark:icon-black-dark" />
                      ) : (
                        <LogIn className="icon-lg icon-black dark:icon-black-dark" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {log.action === 'CHECKOUT' ? 'Checked Out' : 'Checked In'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Hobbs: {log.hobbs} • Tach: {log.tach}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{formatDateTime(log.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}