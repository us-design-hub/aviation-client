"use client"

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoldenButton } from '@/components/ui/golden-button';
import { GoldenBadge } from '@/components/ui/golden-badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirmDialog, confirmPresets } from '@/components/ui/confirm-dialog';
import { 
  Plane, 
  Edit, 
  Trash2, 
  Settings, 
  Clock, 
  Gauge,
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
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { aircraftAPI, squawksAPI, maintenanceAPI } from '@/lib/api';
import { formatET } from '@/lib/format-tz';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

const PORTAL_TIME_ZONE = 'America/New_York';

function currentEasternMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PORTAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}

function shiftMonth(month, amount) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function AircraftDetails({ aircraft, onEdit, onDelete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [weightBalance, setWeightBalance] = useState(null);
  const [hobbsTachLogs, setHobbsTachLogs] = useState([]);
  const [squawks, setSquawks] = useState([]);
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [showSquawkDialog, setShowSquawkDialog] = useState(false);
  const [showWBDialog, setShowWBDialog] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [activityAction, setActivityAction] = useState('ALL');
  const [activityDate, setActivityDate] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [usageMonth, setUsageMonth] = useState(currentEasternMonth);
  const [monthlyUsage, setMonthlyUsage] = useState(null);
  const [monthlyUsageLoading, setMonthlyUsageLoading] = useState(false);
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

  useEffect(() => {
    setUsageMonth(currentEasternMonth());
  }, [aircraft?.id]);

  useEffect(() => {
    if (!aircraft?.id || !usageMonth) return;
    let active = true;
    setMonthlyUsageLoading(true);
    aircraftAPI.getMonthlyUsage(aircraft.id, usageMonth)
      .then((response) => {
        if (active) setMonthlyUsage(response.data);
      })
      .catch((error) => {
        console.error('Error fetching monthly aircraft usage:', error);
        if (active) setMonthlyUsage(null);
      })
      .finally(() => {
        if (active) setMonthlyUsageLoading(false);
      });
    return () => {
      active = false;
    };
  }, [aircraft?.id, usageMonth]);

  const fetchAircraftDetails = async () => {
    if (!aircraft?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch all aircraft details in parallel
      const [wbResponse, logsResponse, squawksResponse, maintResponse] = await Promise.all([
        aircraftAPI.getLatestWeightBalance(aircraft.id).catch(() => ({ data: null })),
        aircraftAPI.getLogs(aircraft.id).catch(() => ({ data: [] })),
        squawksAPI.getByAircraft(aircraft.id).catch(() => ({ data: [] })),
        maintenanceAPI.getByAircraft(aircraft.id).catch(() => ({ data: [] })),
      ]);

      setWeightBalance(wbResponse.data);
      setHobbsTachLogs(logsResponse.data || []);
      setSquawks(squawksResponse.data || []);
      setMaintenanceItems(maintResponse.data || []);
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
    return new Date(dateString).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { timeZone: 'America/New_York' });
  };

  const activityDateKey = (dateString) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(dateString));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const filteredActivity = useMemo(() => hobbsTachLogs.filter((log) => {
    const matchesAction = activityAction === 'ALL' || log.action === activityAction;
    const matchesDate = !activityDate || activityDateKey(log.ts) === activityDate;
    return matchesAction && matchesDate;
  }), [hobbsTachLogs, activityAction, activityDate]);
  const activityPageSize = 20;
  const activityPageCount = Math.max(Math.ceil(filteredActivity.length / activityPageSize), 1);
  const pagedActivity = filteredActivity.slice(
    (activityPage - 1) * activityPageSize,
    activityPage * activityPageSize,
  );

  const activityLabel = (action) => {
    if (action === 'CHECKOUT') return 'Checked Out';
    if (action === 'CHECKIN') return 'Checked In';
    if (action === 'MAINTENANCE_UPDATE') return 'Maintenance Update';
    return action?.replaceAll('_', ' ') || 'Activity';
  };

  const activityIcon = (action) => {
    if (action === 'CHECKOUT') return <LogOut className="icon-lg icon-black dark:icon-black-dark" />;
    if (action === 'MAINTENANCE_UPDATE') return <Wrench className="icon-lg icon-black dark:icon-black-dark" />;
    return <LogIn className="icon-lg icon-black dark:icon-black-dark" />;
  };

  const activityRow = (log) => (
    <div key={log.id} className="flex items-start justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="icon-container dark:icon-container-dark shrink-0">{activityIcon(log.action)}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{activityLabel(log.action)}</p>
          <p className="text-xs text-gray-500">Hobbs: {log.hobbs} · Tach: {log.tach}</p>
          {log.reason && <p className="mt-1 break-words text-xs text-muted-foreground">{log.reason}</p>}
        </div>
      </div>
      <p className="max-w-28 shrink-0 text-right text-xs text-gray-600 sm:max-w-none sm:text-sm">{formatDateTime(log.ts)}</p>
    </div>
  );

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

  const maintPriority = { DUE: 0, NEARING: 1, POSTED: 2 };
  const activeMaintenance = maintenanceItems
    .filter((item) => item.status !== 'COMPLETED')
    .sort((a, b) => {
      const statusOrder = (maintPriority[a.status] ?? 9) - (maintPriority[b.status] ?? 9);
      if (statusOrder !== 0) return statusOrder;
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return Number(a.due_tach ?? a.due_hobbs ?? Infinity) - Number(b.due_tach ?? b.due_hobbs ?? Infinity);
    });

  const formatMaintDue = (item) => {
    const parts = [];
    if (item.due_date) {
      try {
        parts.push(`Due date: ${formatET(item.due_date, 'MMM d, yyyy')}`);
      } catch {
        parts.push(`Due date: ${item.due_date}`);
      }
    }
    const dueTach = item.due_tach ?? item.due_hobbs;
    if (dueTach != null && dueTach !== '') {
      parts.push(`Tach due: ${Number(dueTach).toFixed(1)} hrs`);
      if (item.hours_remaining != null) {
        const remaining = Number(item.hours_remaining);
        parts.push(remaining <= 0
          ? `${Math.abs(remaining).toFixed(1)} Tach hrs overdue`
          : `${remaining.toFixed(1)} Tach hrs remaining`);
      }
    }
    return parts.length ? parts.join(' · ') : 'See maintenance record for details';
  };

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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="icon-lg icon-black dark:icon-black-dark" />
                <span>Monthly Flight Time</span>
              </CardTitle>
              <CardDescription>Completed aircraft operations in Eastern Time</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Previous month"
                aria-label="Previous month"
                onClick={() => setUsageMonth((month) => shiftMonth(month, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-32 text-center text-sm font-semibold">{monthLabel(usageMonth)}</p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Next month"
                aria-label="Next month"
                disabled={usageMonth >= currentEasternMonth()}
                onClick={() => setUsageMonth((month) => shiftMonth(month, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 border-y sm:grid-cols-3 sm:divide-x">
            <div className="py-4 sm:px-4 sm:first:pl-0">
              <p className="text-sm text-muted-foreground">Hobbs flown</p>
              <p className="mt-1 text-2xl font-bold">
                {monthlyUsageLoading ? '...' : `${Number(monthlyUsage?.hobbsHours || 0).toFixed(1)} hrs`}
              </p>
            </div>
            <div className="border-t py-4 sm:border-t-0 sm:px-4">
              <p className="text-sm text-muted-foreground">Tach flown</p>
              <p className="mt-1 text-2xl font-bold">
                {monthlyUsageLoading ? '...' : `${Number(monthlyUsage?.tachHours || 0).toFixed(1)} hrs`}
              </p>
            </div>
            <div className="border-t py-4 sm:border-t-0 sm:px-4 sm:last:pr-0">
              <p className="text-sm text-muted-foreground">Completed flights</p>
              <p className="mt-1 text-2xl font-bold">
                {monthlyUsageLoading ? '...' : Number(monthlyUsage?.completedFlights || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

          <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-semibold">
                Upcoming maintenance and inspections
              </p>
              {activeMaintenance.length > 0 ? (
              <ul className="space-y-2">
                {activeMaintenance.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 rounded-md border bg-background p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
                      <GoldenBadge variant={item.status === 'DUE' ? 'error' : item.status === 'NEARING' ? 'warning' : 'default'}>
                        {item.status === 'DUE' ? 'Due' : item.status === 'NEARING' ? 'Nearing' : 'Scheduled'}
                      </GoldenBadge>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{formatMaintDue(item)}</span>
                  </li>
                ))}
              </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No maintenance or inspections scheduled.</p>
              )}
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
            <CardDescription>Latest meter activity for this aircraft</CardDescription>
          </CardHeader>
          <CardContent>
            <div>{hobbsTachLogs.slice(0, 5).map(activityRow)}</div>
            {hobbsTachLogs.length > 5 && <Button variant="outline" className="mt-4 w-full" onClick={() => setShowActivityHistory(true)}>View All Activity ({hobbsTachLogs.length})</Button>}
          </CardContent>
        </Card>
      )}

      <Dialog open={showActivityHistory} onOpenChange={setShowActivityHistory}>
        <DialogContent className="max-h-[90vh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aircraft Activity</DialogTitle>
            <DialogDescription>Complete meter history for {aircraft?.tail_number}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={activityAction} onValueChange={(value) => { setActivityAction(value); setActivityPage(1); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All activity</SelectItem>
                <SelectItem value="CHECKOUT">Check-outs</SelectItem>
                <SelectItem value="CHECKIN">Check-ins</SelectItem>
                <SelectItem value="MAINTENANCE_UPDATE">Maintenance updates</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" aria-label="Filter activity by date" value={activityDate} onChange={(event) => { setActivityDate(event.target.value); setActivityPage(1); }} />
          </div>
          <div className="max-h-[56vh] overflow-y-auto pr-1">
            {pagedActivity.length > 0 ? pagedActivity.map(activityRow) : <p className="py-10 text-center text-sm text-muted-foreground">No activity matches these filters.</p>}
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-sm text-muted-foreground">{filteredActivity.length} {filteredActivity.length === 1 ? 'entry' : 'entries'}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" title="Previous page" disabled={activityPage <= 1} onClick={() => setActivityPage((page) => Math.max(page - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-20 text-center text-sm">{activityPage} of {activityPageCount}</span>
              <Button variant="outline" size="icon" title="Next page" disabled={activityPage >= activityPageCount} onClick={() => setActivityPage((page) => Math.min(page + 1, activityPageCount))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
