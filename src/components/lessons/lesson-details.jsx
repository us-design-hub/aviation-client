"use client";

import { useState, useEffect, useRef } from "react";
import { formatET } from "@/lib/format-tz";
import { 
  Plane, 
  BookOpen, 
  User, 
  Clock, 
  Calendar, 
  Edit, 
  Trash2, 
  Check, 
  Gauge,
  LogIn,
  LogOut
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { aircraftAPI, lessonsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export function LessonDetails({ 
  lesson, 
  users, 
  aircraft, 
  syllabus,
  onEdit, 
  onDelete, 
  onComplete 
}) {
  const [latestMeterLog, setLatestMeterLog] = useState(null);
  /** Last post-flight / ground readings (CHECKIN or maintenance) — used to pre-fill checkout */
  const [checkoutPrefill, setCheckoutPrefill] = useState({ hobbs: "", tach: "" });
  /** From GET /aircraft/:id — list payload often omits hobbs/tach */
  const [aircraftMetersSnapshot, setAircraftMetersSnapshot] = useState(null);
  const [meterForm, setMeterForm] = useState({ hobbs: "", tach: "" });
  const [savingMeters, setSavingMeters] = useState(false);
  const meterSectionRef = useRef(null);
  
  const { user } = useAuth();

  useEffect(() => {
    if (lesson?.aircraft_id) {
      fetchMeterContext();
    }
  }, [lesson?.aircraft_id, lesson?.id]);

  const fetchMeterContext = async () => {
    try {
      const [logsRes, acRes] = await Promise.all([
        aircraftAPI.getLogs(lesson.aircraft_id),
        aircraftAPI.getById(lesson.aircraft_id),
      ]);
      const logs = logsRes.data || [];
      const ac = acRes.data;
      setLatestMeterLog(logs[0] || null);

      const lastGround = logs.find(
        (l) => l.action === "CHECKIN" || l.action === "MAINTENANCE_UPDATE"
      );
      const hobbs =
        lastGround?.hobbs ?? (ac?.hobbs_time != null ? ac.hobbs_time : null);
      const tach =
        lastGround?.tach ?? (ac?.tach_time != null ? ac.tach_time : null);

      setCheckoutPrefill({
        hobbs: hobbs != null && Number.isFinite(Number(hobbs)) ? String(hobbs) : "",
        tach: tach != null && Number.isFinite(Number(tach)) ? String(tach) : "",
      });
      setAircraftMetersSnapshot(
        ac
          ? { hobbs_time: ac.hobbs_time ?? null, tach_time: ac.tach_time ?? null }
          : null
      );
    } catch (error) {
      console.error("Error fetching aircraft meters:", error);
    }
  };

  const getUserName = (userId, serverProvidedName = null) => {
    // Use server-provided name first (from lesson.student_name or lesson.instructor_name)
    if (serverProvidedName) {
      return serverProvidedName;
    }
    // Fallback to looking up in users array
    const user = users.find(u => u.id === userId);
    return user ? (user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()) : "Unknown";
  };

  const getAircraftDetails = (aircraftId) => {
    if (!aircraftId) return null;
    return aircraft.find(a => a.id === aircraftId);
  };

  const formatDateTime = (dateTime) => {
    return `${formatET(dateTime, "EEEE, MMMM d, yyyy")} at ${formatET(dateTime, "h:mm a")}`;
  };

  const formatTime = (dateTime) => {
    return formatET(dateTime, "h:mm a");
  };

  const getDuration = () => {
    const start = new Date(lesson.start_at);
    const end = new Date(lesson.end_at);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: "text-blue-600 bg-blue-50 border-blue-200",
      COMPLETED: "text-green-600 bg-green-50 border-green-200",
      CANCELED: "text-gray-600 bg-gray-50 border-gray-200"
    };
    return colors[status] || colors.SCHEDULED;
  };

  const aircraftDetails = getAircraftDetails(lesson.aircraft_id);
  const hobbsDisplay =
    aircraftDetails?.hobbs_time ?? aircraftMetersSnapshot?.hobbs_time;
  const tachDisplay =
    aircraftDetails?.tach_time ?? aircraftMetersSnapshot?.tach_time;
  const canOperateAircraft = lesson.kind === "FLIGHT" && lesson.aircraft_id &&
    (user?.role === "ADMIN" || (user?.role === "INSTRUCTOR" && user?.id === lesson.instructor_id));
  const isCheckedOut = latestMeterLog?.action === "CHECKOUT";

  const canEditLesson =
    user?.role === "ADMIN" || (user?.role === "INSTRUCTOR" && user?.id === lesson.instructor_id);

  useEffect(() => {
    if (!canOperateAircraft || lesson.status !== "SCHEDULED") return;
    if (!isCheckedOut) {
      setMeterForm({
        hobbs: checkoutPrefill.hobbs,
        tach: checkoutPrefill.tach,
      });
    } else {
      setMeterForm({ hobbs: "", tach: "" });
    }
  }, [
    lesson.id,
    lesson.status,
    canOperateAircraft,
    isCheckedOut,
    checkoutPrefill.hobbs,
    checkoutPrefill.tach,
  ]);

  const scrollToMeters = () => {
    meterSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCheckout = async () => {
    try {
      setSavingMeters(true);
      await lessonsAPI.checkout(lesson.id, {
        hobbs: Number(meterForm.hobbs),
        tach: Number(meterForm.tach),
      });
      toast.success("Aircraft checked out for this lesson");
      await fetchMeterContext();
      if (typeof window !== "undefined") window.location.reload();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Checkout failed");
    } finally {
      setSavingMeters(false);
    }
  };

  const handleCheckin = async () => {
    try {
      setSavingMeters(true);
      await lessonsAPI.checkin(lesson.id, {
        hobbs: Number(meterForm.hobbs),
        tach: Number(meterForm.tach),
      });
      toast.success("Aircraft checked in and lesson completed");
      await fetchMeterContext();
      if (typeof window !== "undefined") window.location.reload();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Checkin failed");
    } finally {
      setSavingMeters(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <SheetHeader className="sticky top-0 bg-background pb-4 border-b z-10">
        <SheetTitle className="flex items-center gap-2">
          {lesson.kind === "FLIGHT" ? (
            <Plane className="h-5 w-5 text-purple-600" />
          ) : (
            <BookOpen className="h-5 w-5 text-orange-600" />
          )}
          {lesson.kind} Lesson
        </SheetTitle>
        <SheetDescription>
          {formatDateTime(lesson.start_at)}
        </SheetDescription>
      </SheetHeader>

      {/* Status and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("px-3 py-1", getStatusColor(lesson.status))}>
            {lesson.status}
          </Badge>
          {lesson.kind === "FLIGHT" &&
            lesson.aircraft_id &&
            lesson.status === "SCHEDULED" &&
            isCheckedOut && (
              <Badge className="border-amber-400 bg-amber-100 text-amber-950 px-3 py-1">
                Checked out
              </Badge>
            )}
        </div>

        {canEditLesson && (
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>

            {lesson.status === "SCHEDULED" && (
              <>
                {canOperateAircraft &&
                  (!isCheckedOut ? (
                    <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700" onClick={scrollToMeters}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Check out
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700" onClick={scrollToMeters}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Check in
                    </Button>
                  ))}
                {(!lesson.aircraft_id || lesson.kind !== "FLIGHT") && (
                  <Button variant="outline" size="sm" onClick={onComplete}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark complete
                  </Button>
                )}
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Flight checkout / check-in — meters confirmed on this page */}
      {canOperateAircraft && lesson.status === "SCHEDULED" && (
        <div ref={meterSectionRef} id="flight-meter-ops" className="scroll-mt-6">
          <Card
            className={cn(
              "border-2",
              isCheckedOut ? "border-amber-400 bg-amber-50/40" : "border-primary/25"
            )}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                {isCheckedOut ? "Check in (post-flight)" : "Check out (pre-flight)"}
              </CardTitle>
              <CardDescription>
                {isCheckedOut
                  ? "Enter post-flight Hobbs and tach to complete this lesson and update maintenance tracking."
                  : "Confirm pre-flight Hobbs and tach. Values below are from the last check-in — verify before departure."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCheckedOut && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <span className="font-medium text-foreground">Last check-in (pre-filled): </span>
                  Hobbs <span className="font-mono font-semibold">{checkoutPrefill.hobbs || "—"}</span>
                  {" / "}
                  Tach <span className="font-mono font-semibold">{checkoutPrefill.tach || "—"}</span>
                </div>
              )}
              {isCheckedOut && (lesson.hobbs_start != null || lesson.tach_start != null) && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <span className="font-medium">Departure (checkout): </span>
                  Hobbs <span className="font-mono font-semibold">{lesson.hobbs_start ?? "—"}</span>
                  {" / "}
                  Tach <span className="font-mono font-semibold">{lesson.tach_start ?? "—"}</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meter-hobbs">{isCheckedOut ? "Hobbs (landing)" : "Hobbs (verify)"}</Label>
                  <Input
                    id="meter-hobbs"
                    type="number"
                    step="0.1"
                    value={meterForm.hobbs}
                    onChange={(e) => setMeterForm((p) => ({ ...p, hobbs: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meter-tach">{isCheckedOut ? "Tach (landing)" : "Tach (verify)"}</Label>
                  <Input
                    id="meter-tach"
                    type="number"
                    step="0.1"
                    value={meterForm.tach}
                    onChange={(e) => setMeterForm((p) => ({ ...p, tach: e.target.value }))}
                  />
                </div>
              </div>
              {!isCheckedOut ? (
                <Button
                  className="w-full sm:w-auto bg-amber-600 text-white hover:bg-amber-700"
                  onClick={handleCheckout}
                  disabled={savingMeters}
                >
                  {savingMeters ? "Saving..." : "Confirm check out"}
                </Button>
              ) : (
                <Button className="w-full sm:w-auto" onClick={handleCheckin} disabled={savingMeters}>
                  {savingMeters ? "Saving..." : "Confirm check in"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lesson Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Student</p>
                  <p className="text-sm text-muted-foreground">{getUserName(lesson.student_id, lesson.student_name)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Instructor</p>
                  <p className="text-sm text-muted-foreground">{getUserName(lesson.instructor_id, lesson.instructor_name)}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">{getDuration()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(lesson.start_at)} - {formatTime(lesson.end_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aircraft Information */}
      {aircraftDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Aircraft Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Tail Number</p>
                <p className="text-lg font-bold">{aircraftDetails.tail_number}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant={aircraftDetails.status === "OK" ? "secondary" : "destructive"}>
                  {aircraftDetails.status}
                </Badge>
              </div>
              
              {aircraftDetails.make && (
                <div>
                  <p className="text-sm font-medium">Make/Model</p>
                  <p className="text-sm text-muted-foreground">
                    {aircraftDetails.make} {aircraftDetails.model}
                  </p>
                </div>
              )}
              
              {hobbsDisplay != null && hobbsDisplay !== "" && (
                <div>
                  <p className="text-sm font-medium">Hobbs Time</p>
                  <p className="text-sm text-muted-foreground">{hobbsDisplay} hours</p>
                </div>
              )}
              {tachDisplay != null && tachDisplay !== "" && (
                <div>
                  <p className="text-sm font-medium">Tach Time</p>
                  <p className="text-sm text-muted-foreground">{tachDisplay} hours</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tach / Hobbs Readings */}
      {(lesson.tach_start != null || lesson.tach_end != null || lesson.hobbs_start != null || lesson.hobbs_end != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Tach / Hobbs Readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {lesson.tach_start != null && (
                <div>
                  <p className="text-sm font-medium">Tach Start</p>
                  <p className="text-lg font-bold">{lesson.tach_start}</p>
                </div>
              )}
              {lesson.tach_end != null && (
                <div>
                  <p className="text-sm font-medium">Tach End</p>
                  <p className="text-lg font-bold">{lesson.tach_end}</p>
                </div>
              )}
              {lesson.hobbs_start != null && (
                <div>
                  <p className="text-sm font-medium">Hobbs Start</p>
                  <p className="text-lg font-bold">{lesson.hobbs_start}</p>
                </div>
              )}
              {lesson.hobbs_end != null && (
                <div>
                  <p className="text-sm font-medium">Hobbs End</p>
                  <p className="text-lg font-bold">{lesson.hobbs_end}</p>
                </div>
              )}
            </div>
            {lesson.tach_start != null && lesson.tach_end != null && (
              <div className="mt-3 pt-3 border-t flex gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Tach Time</p>
                  <p className="text-sm font-semibold">{(lesson.tach_end - lesson.tach_start).toFixed(1)}</p>
                </div>
                {lesson.hobbs_start != null && lesson.hobbs_end != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Hobbs Time</p>
                    <p className="text-sm font-semibold">{(lesson.hobbs_end - lesson.hobbs_start).toFixed(1)}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Syllabus Information */}
      {(lesson.program || lesson.stage || lesson.lesson) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Syllabus Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.program && (
              <div>
                <p className="text-sm font-medium">Program</p>
                <p className="text-sm text-muted-foreground">{lesson.program}</p>
              </div>
            )}
            
            {lesson.stage && (
              <div>
                <p className="text-sm font-medium">Stage</p>
                <p className="text-sm text-muted-foreground">{lesson.stage}</p>
              </div>
            )}
            
            {lesson.lesson && (
              <div>
                <p className="text-sm font-medium">Lesson</p>
                <p className="text-sm text-muted-foreground">{lesson.lesson}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Created By</p>
              <p className="text-muted-foreground">{getUserName(lesson.created_by)}</p>
            </div>
            
            <div>
              <p className="font-medium">Lesson ID</p>
              <p className="text-muted-foreground font-mono text-xs">{lesson.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
