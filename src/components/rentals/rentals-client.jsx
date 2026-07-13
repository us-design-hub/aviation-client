"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock3, Plane, Plus, Wallet } from "lucide-react";
import { rentalsAPI, usersAPI, aircraftAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { WeekScheduleView } from "@/components/ui/schedule-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckoutModal } from "@/components/aircraft/checkout-modal";
import { etToISO, scheduleRangeParams } from "@/lib/format-tz";
import { TimeSelect } from "@/components/ui/time-select";

const documentLabels = {
  PILOT_LICENSE: "Pilot License",
  MEDICAL_CERTIFICATE: "Medical Certificate",
  RENTERS_INSURANCE: "Renters Insurance",
};

function dateAndTimeToETISO(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  return etToISO(new Date(`${dateValue}T12:00:00Z`), timeValue);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getSlotDefaultTimes(date, hour) {
  const start = new Date(date);
  start.setHours(hour, 0, 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    startDate: toDateInputValue(start),
    startTime: toTimeInputValue(start),
    endDate: toDateInputValue(end),
    endTime: toTimeInputValue(end),
  };
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
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  purpose: "",
  notes: "",
};

const emptyAircraftFlightForm = {
  flightType: "SOLO",
  pilotId: "",
  aircraftId: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  purpose: "",
  origin: "",
  destination: "",
  notes: "",
};

const emptyHoursForm = {
  hours: "",
  note: "",
  transactionType: "ALLOCATION",
};

const ADMIN_WORKFLOW_OPTIONS = [
  { value: "RENTER", label: "Renters" },
  { value: "STUDENT", label: "Students" },
];

export function RentalsClient() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [selectedWorkflow, setSelectedWorkflow] = useState("RENTER");
  const [renters, setRenters] = useState([]);
  const [students, setStudents] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [selectedRenterId, setSelectedRenterId] = useState(user?.id || "");
  const [aircraft, setAircraft] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [aircraftFlights, setAircraftFlights] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [scheduleView, setScheduleView] = useState("week");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [aircraftFlightDialogOpen, setAircraftFlightDialogOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [aircraftFlightForm, setAircraftFlightForm] = useState(emptyAircraftFlightForm);
  const [hoursForm, setHoursForm] = useState(emptyHoursForm);
  const [meterDialog, setMeterDialog] = useState({ open: false, action: "checkout", booking: null, lastLog: null });
  const [aircraftFlightMeterDialog, setAircraftFlightMeterDialog] = useState({ open: false, action: "checkout", flight: null, lastLog: null });

  useEffect(() => {
    if (user?.id) {
      setSelectedRenterId((current) => current || user.id);
    }
  }, [user?.id]);

  const isStudentWorkflow = isAdmin && selectedWorkflow === "STUDENT";
  const selectedPeople = isStudentWorkflow ? students : renters;
  const selectedPersonLabel = isStudentWorkflow ? "student" : "renter";
  const scheduleHeading = isStudentWorkflow ? "Student Flight Hours" : "Flight Operations";
  const scheduleDescription = isStudentWorkflow
    ? "Track student flight hours and manage hour balances."
    : "";

  const filteredBookings = useMemo(() => {
    const activeBookings = bookings.filter((booking) =>
      ['SCHEDULED', 'CHECKED_OUT'].includes(booking.status)
    );
    if (!isAdmin || !selectedRenterId) return activeBookings;
    return activeBookings.filter((booking) => booking.renter_id === selectedRenterId);
  }, [bookings, isAdmin, selectedRenterId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const requests = [rentalsAPI.getAll(), aircraftAPI.getAll()];
      if (isAdmin) {
        requests.push(aircraftAPI.getFlights());
        requests.push(usersAPI.getRenters());
        requests.push(usersAPI.getStudents());
        requests.push(usersAPI.getAll());
      }
      const [bookingsRes, aircraftRes, flightsRes, rentersRes, studentsRes, usersRes] = await Promise.all(requests);
      setBookings(asArray(bookingsRes.data));
      setAircraft(asArray(aircraftRes.data).filter((item) => item?.status === "OK"));
      if (isAdmin) {
        setAircraftFlights(asArray(flightsRes?.data));
        const renterRows = asArray(rentersRes?.data);
        const studentRows = asArray(studentsRes?.data);
        setPilots(asArray(usersRes?.data).filter((person) => ["ADMIN", "INSTRUCTOR"].includes(person?.role)));
        setRenters(renterRows);
        setStudents(studentRows);
        const activeRows = selectedWorkflow === "STUDENT" ? studentRows : renterRows;
        if (!selectedRenterId && activeRows[0]?.id) {
          setSelectedRenterId(activeRows[0].id);
          return;
        }
        if (!selectedRenterId && !activeRows[0]?.id) {
          setDashboard({
            hours: { totalPurchased: 0, hoursFlown: 0, hoursRemaining: 0, transactions: [] },
            compliance: { missingTypes: [], expired: [], expiringSoon: [] },
            upcomingBookings: [],
          });
          return;
        }
        if (selectedRenterId && !activeRows.some((person) => person.id === selectedRenterId)) {
          setSelectedRenterId(activeRows[0]?.id || "");
          return;
        }
      } else {
        setStudents([]);
        setPilots([]);
        setAircraftFlights([]);
      }

      if (isStudentWorkflow) {
        const hoursRes = await rentalsAPI.getHours(selectedRenterId);
        setDashboard({
          hours: hoursRes?.data && typeof hoursRes.data === "object"
            ? hoursRes.data
            : { totalPurchased: 0, hoursFlown: 0, hoursRemaining: 0, transactions: [] },
          compliance: { missingTypes: [], expired: [], expiringSoon: [] },
          upcomingBookings: [],
        });
      } else {
        const dashboardRes = await rentalsAPI.getDashboard(isAdmin ? selectedRenterId : undefined);
        setDashboard(dashboardRes?.data && typeof dashboardRes.data === "object" ? dashboardRes.data : null);
      }
    } catch (error) {
      console.error("Failed to load rentals data:", error);
      toast.error("Failed to load rental data");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isStudentWorkflow, selectedRenterId, selectedWorkflow]);

  const loadSchedule = useCallback(async () => {
    if (isStudentWorkflow) {
      setScheduleEvents([]);
      return;
    }

    try {
      const response = await rentalsAPI.getSchedule(
        scheduleRangeParams(scheduleDate, scheduleView)
      );
      setScheduleEvents(asArray(response.data));
    } catch (error) {
      console.error("Failed to load aircraft schedule:", error);
      toast.error("Failed to load aircraft schedule");
    }
  }, [isStudentWorkflow, scheduleDate, scheduleView]);

  useEffect(() => {
    if (!user?.role) return;
    loadData();
  }, [loadData, user?.role, selectedRenterId]);

  useEffect(() => {
    if (!user?.role) return;
    loadSchedule();
  }, [loadSchedule, user?.role]);

  useEffect(() => {
    if (!isAdmin) return;
    const activeRows = selectedWorkflow === "STUDENT" ? students : renters;
    if (!activeRows.length) {
      setSelectedRenterId("");
      return;
    }
    if (!selectedRenterId || !activeRows.some((person) => person.id === selectedRenterId)) {
      setSelectedRenterId(activeRows[0].id);
    }
  }, [isAdmin, renters, selectedRenterId, selectedWorkflow, students]);

  async function handleBookingSubmit(event) {
    event.preventDefault();
    const renterId = isAdmin ? bookingForm.renterId : user.id;
    if (!renterId) {
      toast.error("Please select a renter");
      return;
    }
    if (!bookingForm.aircraftId) {
      toast.error("Please select a plane");
      return;
    }
    if (!bookingForm.startDate || !bookingForm.startTime || !bookingForm.endDate || !bookingForm.endTime) {
      toast.error("Please select start and end times");
      return;
    }
    const startAt = dateAndTimeToETISO(bookingForm.startDate, bookingForm.startTime);
    const endAt = dateAndTimeToETISO(bookingForm.endDate, bookingForm.endTime);
    if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setSaving(true);
      await rentalsAPI.create({
        renterId,
        aircraftId: bookingForm.aircraftId,
        startAt,
        endAt,
        purpose: bookingForm.purpose,
        notes: event.currentTarget.elements.notes?.value || "",
      });
      toast.success("Rental scheduled");
      setBookingDialogOpen(false);
      setBookingForm(emptyBookingForm);
      await Promise.all([loadData(), loadSchedule()]);
    } catch (error) {
      const payload = error.response?.data;
      if (payload?.error === "RENTER_NOT_COMPLIANT") {
        toast.error("Rental blocked until required documents are valid");
      } else if (payload?.error === "INSUFFICIENT_HOURS") {
        toast.error(payload?.message || "Not enough hours remaining for this booking");
      } else if (payload?.error === "conflicts") {
        toast.error("That aircraft is already booked or blocked for that time");
      } else {
        toast.error(payload?.error || "Could not schedule rental");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAircraftFlightSubmit(event) {
    event.preventDefault();
    if (!isAdmin) return;
    if (!aircraftFlightForm.pilotId) {
      toast.error("Please select a pilot");
      return;
    }
    if (!aircraftFlightForm.aircraftId) {
      toast.error("Please select a plane");
      return;
    }
    if (!aircraftFlightForm.startDate || !aircraftFlightForm.startTime || !aircraftFlightForm.endDate || !aircraftFlightForm.endTime) {
      toast.error("Please select start and end times");
      return;
    }
    const startAt = dateAndTimeToETISO(aircraftFlightForm.startDate, aircraftFlightForm.startTime);
    const endAt = dateAndTimeToETISO(aircraftFlightForm.endDate, aircraftFlightForm.endTime);
    if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setSaving(true);
      await aircraftAPI.createFlight({
        pilotId: aircraftFlightForm.pilotId,
        aircraftId: aircraftFlightForm.aircraftId,
        startAt,
        endAt,
        purpose: aircraftFlightForm.purpose,
        flightType: aircraftFlightForm.flightType,
        origin: aircraftFlightForm.origin,
        destination: aircraftFlightForm.destination,
        notes: event.currentTarget.elements.soloNotes?.value || "",
      });
      toast.success("Aircraft flight scheduled");
      setAircraftFlightDialogOpen(false);
      setAircraftFlightForm(emptyAircraftFlightForm);
      await Promise.all([loadData(), loadSchedule()]);
    } catch (error) {
      if (error.response?.data?.error === "conflicts") {
        toast.error("That aircraft is already booked or blocked for that time");
      } else {
        toast.error(error.response?.data?.error || "Could not schedule aircraft flight");
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
      await Promise.all([loadData(), loadSchedule()]);
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

  async function openAircraftFlightMeterDialog(action, flight) {
    try {
      const logsRes = await aircraftAPI.getLogs(flight.aircraft_id);
      setAircraftFlightMeterDialog({
        open: true,
        action,
        flight,
        lastLog: asArray(logsRes.data)[0] || null,
      });
    } catch (error) {
      toast.error("Could not load aircraft meter context");
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
      await Promise.all([loadData(), loadSchedule()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "Meter update failed");
      throw error;
    }
  }

  async function handleAircraftFlightMeterSubmit(values) {
    const { flight, action } = aircraftFlightMeterDialog;
    if (!flight) return;
    try {
      if (action === "checkout") {
        await aircraftAPI.checkoutFlight(flight.id, values);
        toast.success("Aircraft flight checked out");
      } else {
        await aircraftAPI.checkinFlight(flight.id, values);
        toast.success("Aircraft flight checked in");
      }
      setAircraftFlightMeterDialog({ open: false, action: "checkout", flight: null, lastLog: null });
      await Promise.all([loadData(), loadSchedule()]);
    } catch (error) {
      if (error.response?.data?.error === "conflicts") {
        toast.error("That aircraft is already booked or blocked for that time");
      } else {
        toast.error(error.response?.data?.message || error.response?.data?.error || "Could not update aircraft flight");
      }
      throw error;
    }
  }

  async function handleCancelBooking(bookingId) {
    try {
      await rentalsAPI.remove(bookingId);
      toast.success("Rental removed");
      await Promise.all([loadData(), loadSchedule()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not remove rental");
    }
  }

  async function handleCancelAircraftFlight(flightId) {
    try {
      await aircraftAPI.removeFlight(flightId);
      toast.success("Aircraft flight removed");
      await Promise.all([loadData(), loadSchedule()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not remove aircraft flight");
    }
  }

  function handleScheduleSlotClick({ date, hour, resourceId, resourceType }) {
    if (isStudentWorkflow || resourceType !== "aircraft" || !resourceId) return;

    const renterId = isAdmin ? selectedRenterId : user?.id;
    if (!renterId) {
      toast.error("Please select a renter");
      return;
    }

    setBookingForm({
      ...emptyBookingForm,
      renterId,
      aircraftId: resourceId,
      ...getSlotDefaultTimes(date, hour),
    });
    setBookingDialogOpen(true);
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
    manualAdjustments: asNumber(dashboard?.hours?.manualAdjustments),
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
  const scheduleResources = safeAircraft.map((item) => ({
    ...item,
    resourceType: "aircraft",
    name: item.tail_number,
  }));
  const safeScheduleEvents = asArray(scheduleEvents);
  const safePilots = asArray(pilots);
  const safeAircraftFlights = asArray(aircraftFlights).filter((flight) =>
    ['SCHEDULED', 'CHECKED_OUT'].includes(flight.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{scheduleHeading}</h1>
          {scheduleDescription && (
            <p className="text-muted-foreground">{scheduleDescription}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {isAdmin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="schedule-role-filter">Role</Label>
                <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                  <SelectTrigger id="schedule-role-filter" className="w-[180px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_WORKFLOW_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-user-filter">Users</Label>
                <Select value={selectedRenterId} onValueChange={setSelectedRenterId}>
                  <SelectTrigger id="schedule-user-filter" className="w-[280px]">
                    <SelectValue placeholder={`Select ${selectedPersonLabel}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPeople.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name || person.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {!isStudentWorkflow && (
            <Button
              onClick={() => {
                setBookingForm({ ...emptyBookingForm, renterId: selectedRenterId || "" });
                setBookingDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Schedule Rental
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => {
                setAircraftFlightForm({ ...emptyAircraftFlightForm, pilotId: user?.id || "" });
                setAircraftFlightDialogOpen(true);
              }}
            >
              <Plane className="mr-2 h-4 w-4" />
              Schedule Solo Flight
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-base">Manual Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.manualAdjustments > 0 ? "+" : ""}
              {summary.manualAdjustments.toFixed(1)}
            </div>
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
            <CardTitle>{isStudentWorkflow ? "Student Hours Activity" : "Scheduled Rentals"}</CardTitle>
            <CardDescription>
              {isStudentWorkflow
                ? "Hours are tracked automatically when flight lessons are completed."
                : "Aircraft bookings for the selected renter workflow."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isStudentWorkflow ? (
              summary.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No student hour entries yet.</p>
              ) : (
                summary.transactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-semibold">
                          {transaction.transaction_type === "ALLOCATION" && "Purchased Hours"}
                          {transaction.transaction_type === "ADJUSTMENT" && "Hours Adjustment"}
                          {transaction.transaction_type === "LESSON_DEBIT" && "Lesson Flight Time"}
                          {transaction.transaction_type === "RENTAL_DEBIT" && "Rental Flight Time"}
                        </div>
                        <div className="text-sm text-muted-foreground">{formatDateTime(transaction.created_at)}</div>
                        {transaction.note && <div className="text-sm">{transaction.note}</div>}
                      </div>
                      <Badge variant="outline">
                        {asNumber(transaction.delta_hours) > 0 ? "+" : ""}
                        {asNumber(transaction.delta_hours).toFixed(1)} hrs
                      </Badge>
                    </div>
                  </div>
                ))
              )
            ) : safeBookings.length === 0 ? (
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
            {isAdmin && !isStudentWorkflow && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <h3 className="font-semibold">Solo / Internal Flights</h3>
                  <p className="text-sm text-muted-foreground">Aircraft usage logged without a student or renter booking.</p>
                </div>
                {safeAircraftFlights.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No solo flights scheduled.</p>
                ) : (
                  safeAircraftFlights.map((flight) => (
                    <div key={flight.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4" />
                            <span className="font-semibold">{flight.tail_number}</span>
                            <Badge variant="outline">{flight.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Pilot: {flight.pilot_name || flight.pilot_email}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDateTime(flight.start_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock3 className="h-4 w-4" />
                              {formatDateTime(flight.end_at)}
                            </span>
                          </div>
                          {flight.purpose && <p className="text-sm">{flight.purpose}</p>}
                          {flight.flight_hours != null && (
                            <p className="text-sm text-muted-foreground">Flight hours: {Number(flight.flight_hours).toFixed(1)}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {flight.status === "SCHEDULED" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openAircraftFlightMeterDialog("checkout", flight)}>
                                Check Out
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleCancelAircraftFlight(flight.id)}>
                                Remove
                              </Button>
                            </>
                          )}
                          {flight.status === "CHECKED_OUT" && (
                            <Button size="sm" onClick={() => openAircraftFlightMeterDialog("checkin", flight)}>
                              Check In
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                <CardDescription>Add or adjust hour balances for the selected {selectedPersonLabel}.</CardDescription>
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
                    <p className="text-xs text-muted-foreground">
                      Enter decimal hours. Example: 1.5 = 1 hour 30 minutes, 0.5 = 30 minutes.
                    </p>
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

          {!isStudentWorkflow && (
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
          )}
        </div>
      </div>

      {!isStudentWorkflow && (
        <Card>
          <CardHeader>
            <CardTitle>Aircraft Schedule</CardTitle>
            <CardDescription>Current aircraft reservations and blocked time.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeekScheduleView
              currentDate={scheduleDate}
              events={safeScheduleEvents}
              onTimeSlotClick={handleScheduleSlotClick}
              onDateChange={setScheduleDate}
              view={scheduleView}
              onViewChange={(value) => setScheduleView(value === "month" || value === "schedule" ? "week" : value)}
              resources={scheduleResources}
              showResourceColumns
              startHour={6}
              endHour={23}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={bookingDialogOpen && !isStudentWorkflow} onOpenChange={setBookingDialogOpen}>
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
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={bookingForm.startDate}
                  onChange={(event) => setBookingForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                    endDate: current.endDate || event.target.value,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <TimeSelect
                  id="startTime"
                  value={bookingForm.startTime}
                  onChange={(value) => setBookingForm((current) => ({ ...current, startTime: value }))}
                  placeholder="Select start time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={bookingForm.endDate}
                  onChange={(event) => setBookingForm((current) => ({ ...current, endDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <TimeSelect
                  id="endTime"
                  value={bookingForm.endTime}
                  onChange={(value) => setBookingForm((current) => ({ ...current, endTime: value }))}
                  placeholder="Select end time"
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
                defaultValue={bookingForm.notes}
              />
            </div>
            <Button type="submit" disabled={saving}>
              Save Rental
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={aircraftFlightDialogOpen} onOpenChange={setAircraftFlightDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Schedule Aircraft Flight</DialogTitle>
            <DialogDescription>Schedule a solo or relocation flight without a student booking.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAircraftFlightSubmit}>
            <div className="space-y-2">
              <Label htmlFor="flightType">Flight Type</Label>
              <Select value={aircraftFlightForm.flightType} onValueChange={(value) => setAircraftFlightForm((current) => ({ ...current, flightType: value }))}>
                <SelectTrigger id="flightType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOLO">Solo / Proficiency</SelectItem>
                  <SelectItem value="RELOCATION">Relocation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pilotId">Pilot</Label>
              <Select value={aircraftFlightForm.pilotId} onValueChange={(value) => setAircraftFlightForm((current) => ({ ...current, pilotId: value }))}>
                <SelectTrigger id="pilotId">
                  <SelectValue placeholder="Select pilot" />
                </SelectTrigger>
                <SelectContent>
                  {safePilots.map((pilot) => (
                    <SelectItem key={pilot.id} value={pilot.id}>
                      {pilot.name || pilot.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="soloAircraftId">Aircraft</Label>
              <Select value={aircraftFlightForm.aircraftId} onValueChange={(value) => setAircraftFlightForm((current) => ({ ...current, aircraftId: value }))}>
                <SelectTrigger id="soloAircraftId">
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
                <Label htmlFor="soloStartDate">Start Date</Label>
                <Input
                  id="soloStartDate"
                  type="date"
                  value={aircraftFlightForm.startDate}
                  onChange={(event) => setAircraftFlightForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                    endDate: current.endDate || event.target.value,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soloStartTime">Start Time</Label>
                <TimeSelect
                  id="soloStartTime"
                  value={aircraftFlightForm.startTime}
                  onChange={(value) => setAircraftFlightForm((current) => ({ ...current, startTime: value }))}
                  placeholder="Select start time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soloEndDate">End Date</Label>
                <Input
                  id="soloEndDate"
                  type="date"
                  value={aircraftFlightForm.endDate}
                  onChange={(event) => setAircraftFlightForm((current) => ({ ...current, endDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soloEndTime">End Time</Label>
                <TimeSelect
                  id="soloEndTime"
                  value={aircraftFlightForm.endTime}
                  onChange={(value) => setAircraftFlightForm((current) => ({ ...current, endTime: value }))}
                  placeholder="Select end time"
                />
              </div>
            </div>
            {aircraftFlightForm.flightType === "RELOCATION" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="flightOrigin">Origin Airport</Label>
                  <Input id="flightOrigin" value={aircraftFlightForm.origin} onChange={(event) => setAircraftFlightForm((current) => ({ ...current, origin: event.target.value }))} placeholder="e.g., KINF - Inverness" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flightDestination">Destination Airport</Label>
                  <Input id="flightDestination" value={aircraftFlightForm.destination} onChange={(event) => setAircraftFlightForm((current) => ({ ...current, destination: event.target.value }))} placeholder="Airport name or code" required />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="soloPurpose">Purpose</Label>
              <Input
                id="soloPurpose"
                value={aircraftFlightForm.purpose}
                onChange={(event) => setAircraftFlightForm((current) => ({ ...current, purpose: event.target.value }))}
                placeholder="Proficiency flight, ferry, maintenance test flight, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="soloNotes">Notes</Label>
              <Textarea
                id="soloNotes"
                defaultValue={aircraftFlightForm.notes}
              />
            </div>
            <Button type="submit" disabled={saving}>
              Save Aircraft Flight
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
      <CheckoutModal
        isOpen={aircraftFlightMeterDialog.open}
        onClose={() => setAircraftFlightMeterDialog({ open: false, action: "checkout", flight: null, lastLog: null })}
        onSubmit={handleAircraftFlightMeterSubmit}
        aircraft={aircraftFlightMeterDialog.flight}
        action={aircraftFlightMeterDialog.action}
        lastLog={aircraftFlightMeterDialog.lastLog}
      />
    </div>
  );
}
