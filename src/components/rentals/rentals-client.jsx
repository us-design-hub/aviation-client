"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock3, Plane, Plus, Wallet } from "lucide-react";
import { rentalsAPI, usersAPI, aircraftAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckoutModal } from "@/components/aircraft/checkout-modal";

const documentLabels = {
  PILOT_LICENSE: "Pilot License",
  MEDICAL_CERTIFICATE: "Medical Certificate",
  RENTERS_INSURANCE: "Renters Insurance",
};

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDocumentLabel(type) {
  return documentLabels[type] || type;
}

function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/New_York",
      })
    : "N/A";
}

const emptyBookingForm = {
  renterId: "",
  aircraftId: "",
  startAt: "",
  endAt: "",
  purpose: "",
  notes: "",
};

const emptyHoursForm = {
  hours: "",
  note: "",
  transactionType: "ALLOCATION",
};

export function RentalsClient() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [renters, setRenters] = useState([]);
  const [selectedRenterId, setSelectedRenterId] = useState(user?.id || "");
  const [aircraft, setAircraft] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [hoursForm, setHoursForm] = useState(emptyHoursForm);
  const [meterDialog, setMeterDialog] = useState({ open: false, action: "checkout", booking: null, lastLog: null });

  useEffect(() => {
    if (user?.id) {
      setSelectedRenterId((current) => current || user.id);
    }
  }, [user?.id]);

  const filteredBookings = useMemo(() => {
    if (!isAdmin || !selectedRenterId) return bookings;
    return bookings.filter((booking) => booking.renter_id === selectedRenterId);
  }, [bookings, isAdmin, selectedRenterId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const requests = [rentalsAPI.getAll(), aircraftAPI.getAll()];
      if (isAdmin) {
        requests.push(usersAPI.getRenters());
      }
      const [bookingsRes, aircraftRes, rentersRes] = await Promise.all(requests);
      setBookings(asArray(bookingsRes.data));
      setAircraft(asArray(aircraftRes.data).filter((item) => item?.status === "OK"));
      if (isAdmin) {
        const renterRows = asArray(rentersRes?.data);
        setRenters(renterRows);
        if (!selectedRenterId && renterRows[0]?.id) {
          setSelectedRenterId(renterRows[0].id);
          return;
        }
        if (!selectedRenterId && !renterRows[0]?.id) {
          setDashboard({
            hours: { totalPurchased: 0, hoursFlown: 0, hoursRemaining: 0, transactions: [] },
            compliance: { missingTypes: [], expired: [], expiringSoon: [] },
            upcomingBookings: [],
          });
          return;
        }
      }

      const dashboardRes = await rentalsAPI.getDashboard(isAdmin ? selectedRenterId : undefined);
      setDashboard(dashboardRes?.data && typeof dashboardRes.data === "object" ? dashboardRes.data : null);
    } catch (error) {
      console.error("Failed to load rentals data:", error);
      toast.error("Failed to load rental data");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedRenterId]);

  useEffect(() => {
    if (!user?.role) return;
    loadData();
  }, [loadData, user?.role, selectedRenterId]);

  async function handleBookingSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      await rentalsAPI.create({
        renterId: isAdmin ? bookingForm.renterId : user.id,
        aircraftId: bookingForm.aircraftId,
        startAt: toIso(bookingForm.startAt),
        endAt: toIso(bookingForm.endAt),
        purpose: bookingForm.purpose,
        notes: bookingForm.notes,
      });
      toast.success("Rental scheduled");
      setBookingDialogOpen(false);
      setBookingForm(emptyBookingForm);
      await loadData();
    } catch (error) {
      const payload = error.response?.data;
      if (payload?.error === "RENTER_NOT_COMPLIANT") {
        toast.error("Rental blocked until required documents are valid");
      } else if (payload?.error === "INSUFFICIENT_HOURS") {
        toast.error("Not enough hours remaining for this booking");
      } else if (payload?.error === "conflicts") {
        toast.error("Scheduling conflict detected for that aircraft");
      } else {
        toast.error(payload?.error || "Could not schedule rental");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAllocateHours(event) {
    event.preventDefault();
    if (!selectedRenterId) return;
    try {
      setSaving(true);
      await rentalsAPI.allocateHours(selectedRenterId, {
        hours: Number(hoursForm.hours),
        note: hoursForm.note,
        transactionType: hoursForm.transactionType,
      });
      toast.success("Hours updated");
      setHoursForm(emptyHoursForm);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not update hours");
    } finally {
      setSaving(false);
    }
  }

  async function openMeterDialog(action, booking) {
    try {
      const logsRes = await aircraftAPI.getLogs(booking.aircraft_id);
      setMeterDialog({
        open: true,
        action,
        booking,
        lastLog: logsRes.data?.[0] || null,
      });
    } catch (error) {
      toast.error("Could not load aircraft meter history");
    }
  }

  async function handleMeterSubmit(values) {
    const booking = meterDialog.booking;
    if (!booking) return;
    try {
      if (meterDialog.action === "checkout") {
        await rentalsAPI.checkout(booking.id, values);
        toast.success("Rental checked out");
      } else {
        await rentalsAPI.checkin(booking.id, values);
        toast.success("Rental checked in");
      }
      setMeterDialog({ open: false, action: "checkout", booking: null, lastLog: null });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Meter update failed");
      throw error;
    }
  }

  async function handleCancelBooking(bookingId) {
    try {
      await rentalsAPI.remove(bookingId);
      toast.success("Rental removed");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not remove rental");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const summary = {
    totalPurchased: asNumber(dashboard?.hours?.totalPurchased),
    hoursFlown: asNumber(dashboard?.hours?.hoursFlown),
    hoursRemaining: asNumber(dashboard?.hours?.hoursRemaining),
    transactions: asArray(dashboard?.hours?.transactions),
  };
  const compliance = {
    missingTypes: asArray(dashboard?.compliance?.missingTypes),
    expired: asArray(dashboard?.compliance?.expired),
    expiringSoon: asArray(dashboard?.compliance?.expiringSoon),
  };
  const safeRenters = asArray(renters);
  const safeBookings = asArray(filteredBookings);
  const safeAircraft = asArray(aircraft);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rental Operations</h1>
          <p className="text-muted-foreground">
            Track renter hours, schedule aircraft, and close out flights.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {isAdmin && (
            <Select value={selectedRenterId} onValueChange={setSelectedRenterId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select renter" />
              </SelectTrigger>
              <SelectContent>
                {safeRenters.map((renter) => (
                  <SelectItem key={renter.id} value={renter.id}>
                    {renter.name || renter.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
            <Button
              onClick={() => {
                setBookingForm({ ...emptyBookingForm, renterId: selectedRenterId || "" });
                setBookingDialogOpen(true);
              }}
            >
            <Plus className="mr-2 h-4 w-4" />
            Schedule Rental
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Hours Purchased</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalPurchased.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hours Flown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.hoursFlown.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hours Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.hoursRemaining.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Rentals</CardTitle>
            <CardDescription>Aircraft bookings for the selected renter workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {safeBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rental bookings yet.</p>
            ) : (
              safeBookings.map((booking) => (
                <div key={booking.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        <span className="font-semibold">{booking.tail_number}</span>
                        <Badge variant="outline">{booking.status}</Badge>
                      </div>
                      {isAdmin && (
                        <p className="text-sm text-muted-foreground">Renter: {booking.renter_name || booking.renter_email}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(booking.start_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-4 w-4" />
                          {formatDateTime(booking.end_at)}
                        </span>
                      </div>
                      {booking.purpose && <p className="text-sm">{booking.purpose}</p>}
                      {booking.billed_hours != null && (
                        <p className="text-sm text-muted-foreground">Billed hours: {Number(booking.billed_hours).toFixed(1)}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {booking.status === "SCHEDULED" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openMeterDialog("checkout", booking)}>
                            Check Out
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleCancelBooking(booking.id)}>
                            Remove
                          </Button>
                        </>
                      )}
                      {booking.status === "CHECKED_OUT" && (
                        <Button size="sm" onClick={() => openMeterDialog("checkin", booking)}>
                          Check In
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Hours Ledger
                </CardTitle>
                <CardDescription>Add or adjust hour balances for the selected renter.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleAllocateHours}>
                  <div className="space-y-2">
                    <Label htmlFor="hours">Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.1"
                      value={hoursForm.hours}
                      onChange={(event) => setHoursForm((current) => ({ ...current, hours: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transactionType">Entry type</Label>
                    <Select
                      value={hoursForm.transactionType}
                      onValueChange={(value) => setHoursForm((current) => ({ ...current, transactionType: value }))}
                    >
                      <SelectTrigger id="transactionType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALLOCATION">Allocation</SelectItem>
                        <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hoursNote">Note</Label>
                    <Textarea
                      id="hoursNote"
                      value={hoursForm.note}
                      onChange={(event) => setHoursForm((current) => ({ ...current, note: event.target.value }))}
                    />
                  </div>
                  <Button type="submit" disabled={saving || !selectedRenterId}>
                    Save Hours Entry
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Compliance Snapshot</CardTitle>
              <CardDescription>Document issues that can block rentals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Missing:</span>{" "}
                {compliance.missingTypes?.length
                  ? compliance.missingTypes.map(getDocumentLabel).join(", ")
                  : "None"}
              </div>
              <div>
                <span className="font-medium">Expired:</span>{" "}
                {compliance.expired?.length
                  ? compliance.expired.map((doc) => getDocumentLabel(doc.document_type)).join(", ")
                  : "None"}
              </div>
              <div>
                <span className="font-medium">Expiring Soon:</span>{" "}
                {compliance.expiringSoon?.length
                  ? compliance.expiringSoon.map((doc) => getDocumentLabel(doc.document_type)).join(", ")
                  : "None"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Schedule Rental</DialogTitle>
            <DialogDescription>Create a renter booking tied to aircraft usage and hours.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleBookingSubmit}>
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="renterId">Renter</Label>
                <Select value={bookingForm.renterId} onValueChange={(value) => setBookingForm((current) => ({ ...current, renterId: value }))}>
                  <SelectTrigger id="renterId">
                    <SelectValue placeholder="Select renter" />
                  </SelectTrigger>
                  <SelectContent>
                    {safeRenters.map((renter) => (
                      <SelectItem key={renter.id} value={renter.id}>
                        {renter.name || renter.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="aircraftId">Aircraft</Label>
              <Select value={bookingForm.aircraftId} onValueChange={(value) => setBookingForm((current) => ({ ...current, aircraftId: value }))}>
                <SelectTrigger id="aircraftId">
                  <SelectValue placeholder="Select aircraft" />
                </SelectTrigger>
                <SelectContent>
                  {safeAircraft.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.tail_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startAt">Start</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={bookingForm.startAt}
                  onChange={(event) => setBookingForm((current) => ({ ...current, startAt: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">End</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={bookingForm.endAt}
                  onChange={(event) => setBookingForm((current) => ({ ...current, endAt: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                value={bookingForm.purpose}
                onChange={(event) => setBookingForm((current) => ({ ...current, purpose: event.target.value }))}
                placeholder="Cross-country rental, currency flight, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes}
                onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <Button type="submit" disabled={saving}>
              Save Rental
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <CheckoutModal
        isOpen={meterDialog.open}
        onClose={() => setMeterDialog({ open: false, action: "checkout", booking: null, lastLog: null })}
        onSubmit={handleMeterSubmit}
        aircraft={meterDialog.booking}
        action={meterDialog.action}
        lastLog={meterDialog.lastLog}
      />
    </div>
  );
}
