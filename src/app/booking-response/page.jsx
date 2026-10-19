"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Plane,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { bookingResponsesAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ACTIONS = [
  { id: "confirm", label: "Confirm", icon: CheckCircle2 },
  { id: "cancel", label: "Cancel", icon: XCircle },
  { id: "reschedule", label: "Request reschedule", icon: CalendarClock },
];

function formatDateTime(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
}

function BookingResponseContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const requestedAction = searchParams.get("action") || "";
  const [booking, setBooking] = useState(null);
  const [selectedAction, setSelectedAction] = useState(
    ACTIONS.some((item) => item.id === requestedAction) ? requestedAction : ""
  );
  const [note, setNote] = useState("");
  const [preferredStartAt, setPreferredStartAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!token) {
        setError("This response link is incomplete.");
        setLoading(false);
        return;
      }
      try {
        const response = await bookingResponsesAPI.get(token);
        if (active) setBooking(response.data);
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || "This response link is invalid or expired.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [token]);

  const isLateCancellation = useMemo(() => {
    if (!booking?.startAt) return false;
    const hours = (new Date(booking.startAt).getTime() - Date.now()) / 3_600_000;
    return hours < Number(booking.cancelCutoffHours || 12);
  }, [booking]);

  async function submitResponse(event) {
    event.preventDefault();
    if (!selectedAction) {
      setError("Choose how you would like to respond.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await bookingResponsesAPI.submit(token, {
        action: selectedAction,
        note,
        preferredStartAt: selectedAction === "reschedule" && preferredStartAt
          ? new Date(preferredStartAt).toISOString()
          : null,
      });
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Your response could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  const eventName = booking?.bookingType === "RENTAL"
    ? "Aircraft rental"
    : `${booking?.kind === "GROUND" ? "Ground" : "Flight"} lesson`;

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-black text-amber-400">
            <Plane className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-neutral-950">Wings CRM</p>
            <p className="text-sm text-neutral-600">Wings of an Angel Aviation</p>
          </div>
        </header>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-neutral-600">
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
              Loading appointment
            </div>
          ) : error && !booking ? (
            <div className="py-10 text-center">
              <XCircle className="mx-auto mb-4 size-10 text-red-600" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-neutral-950">Link unavailable</h1>
              <p className="mt-2 text-sm text-neutral-600">{error}</p>
              <p className="mt-5 text-sm text-neutral-600">Please contact the school for assistance.</p>
            </div>
          ) : result || booking?.used ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 size-11 text-green-600" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-neutral-950">Response received</h1>
              <p className="mt-2 text-neutral-600">
                {result?.message || "This appointment response has already been recorded."}
              </p>
              {(result?.responseAction === "CANCEL_REQUESTED" || result?.responseAction === "RESCHEDULE_REQUESTED") && (
                <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                  Your appointment remains scheduled until the school confirms the change.
                </p>
              )}
            </div>
          ) : booking?.expired || booking?.status !== "SCHEDULED" ? (
            <div className="py-10 text-center">
              <XCircle className="mx-auto mb-4 size-10 text-neutral-500" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-neutral-950">Response unavailable</h1>
              <p className="mt-2 text-sm text-neutral-600">
                This link has expired or the appointment is no longer scheduled. Please contact the school if you need assistance.
              </p>
            </div>
          ) : (
            <form onSubmit={submitResponse}>
              <div className="border-b border-neutral-200 pb-5">
                <p className="text-sm font-medium text-amber-700">Appointment response</p>
                <h1 className="mt-1 text-2xl font-semibold text-neutral-950">{eventName}</h1>
                <div className="mt-4 space-y-2 text-sm text-neutral-700">
                  <p className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {formatDateTime(booking.startAt)}
                  </p>
                  {booking.aircraftTail && <p>Aircraft: <strong>{booking.aircraftTail}</strong></p>}
                  {booking.instructorName && <p>Instructor: <strong>{booking.instructorName}</strong></p>}
                </div>
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-neutral-950">How would you like to respond?</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {ACTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setSelectedAction(id); setError(""); }}
                      aria-pressed={selectedAction === id}
                      className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                        selectedAction === id
                          ? "border-amber-600 bg-amber-50 text-neutral-950 ring-1 ring-amber-600"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {selectedAction === "cancel" && (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  {isLateCancellation
                    ? `This is within the ${booking.cancelCutoffHours}-hour cancellation window. Your request will be sent to the school for review, and the appointment will remain scheduled until approved.`
                    : "Submitting will cancel this appointment immediately."}
                </div>
              )}

              {selectedAction === "reschedule" && (
                <div className="mt-5 space-y-2">
                  <Label htmlFor="preferred-time">Preferred date and time (optional)</Label>
                  <Input
                    id="preferred-time"
                    type="datetime-local"
                    value={preferredStartAt}
                    onChange={(event) => setPreferredStartAt(event.target.value)}
                  />
                  <p className="text-xs text-neutral-500">The school will confirm availability before changing your appointment.</p>
                </div>
              )}

              {(selectedAction === "cancel" || selectedAction === "reschedule") && (
                <div className="mt-5 space-y-2">
                  <Label htmlFor="response-note">Note (optional)</Label>
                  <Textarea
                    id="response-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value.slice(0, 500))}
                    placeholder="Add any details the school should know"
                    rows={4}
                  />
                  <p className="text-right text-xs text-neutral-500">{note.length}/500</p>
                </div>
              )}

              {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

              <Button type="submit" className="mt-6 w-full" disabled={submitting || !selectedAction}>
                {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {submitting ? "Submitting" : selectedAction === "confirm" ? "Confirm appointment" : "Submit response"}
              </Button>

              <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-neutral-500">
                <ShieldCheck className="size-4" aria-hidden="true" />
                This secure link expires when the appointment begins.
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default function BookingResponsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
      <BookingResponseContent />
    </Suspense>
  );
}
