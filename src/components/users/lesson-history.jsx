"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  MessageSquare,
  Plane,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lessonsAPI } from "@/lib/api";
import { formatET } from "@/lib/format-tz";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

function formatDateTime(value) {
  return value ? formatET(value, "MMM dd, yyyy 'at' h:mm a") : "Not recorded";
}

function formatHours(value) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)} hrs` : "Not recorded";
}

function differenceHours(start, end) {
  const startValue = Number(start);
  const endValue = Number(end);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || endValue < startValue) {
    return null;
  }
  return endValue - startValue;
}

function scheduledHours(lesson) {
  const start = new Date(lesson.start_at).getTime();
  const end = new Date(lesson.end_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return (end - start) / 3600000;
}

function statusClass(status) {
  return cn(
    "border text-xs",
    status === "SCHEDULED" && "border-blue-200 bg-blue-50 text-blue-700",
    status === "COMPLETED" && "border-green-200 bg-green-50 text-green-700",
    status === "CANCELED" && "border-gray-200 bg-gray-50 text-gray-700",
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0 border-b py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

export function LessonHistory({ lessons, subjectRole }) {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const filteredLessons = useMemo(() => {
    const sorted = [...lessons].sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
    return status === "ALL" ? sorted : sorted.filter((lesson) => lesson.status === status);
  }, [lessons, status]);

  const pageCount = Math.max(1, Math.ceil(filteredLessons.length / PAGE_SIZE));
  const pageLessons = filteredLessons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [status, lessons]);

  const openLesson = async (lesson) => {
    setSelectedLesson(lesson);
    setNotes([]);
    setLoadingNotes(true);
    try {
      const response = await lessonsAPI.getNotes(lesson.id);
      setNotes(response.data || []);
    } catch (error) {
      console.error("Error fetching lesson notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const personLabel = subjectRole === "INSTRUCTOR" ? "Student" : "Instructor";
  const personName = subjectRole === "INSTRUCTOR"
    ? selectedLesson?.student_name
    : selectedLesson?.instructor_name;

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-4 w-4" />
                Lesson History
              </CardTitle>
              <CardDescription>{filteredLessons.length} lessons</CardDescription>
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]" aria-label="Filter lesson status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {pageLessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No lessons found.</p>
          ) : (
            <div className="divide-y border-y">
              {pageLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openLesson(lesson)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {lesson.kind === "FLIGHT" ? (
                      <Calendar className="h-4 w-4 shrink-0 text-purple-600" />
                    ) : (
                      <BookOpen className="h-4 w-4 shrink-0 text-orange-600" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {lesson.lesson || `${lesson.kind === "GROUND" ? "Ground" : "Flight"} Lesson`}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(lesson.start_at)}
                        {lesson.note_count > 0 ? ` · ${lesson.note_count} ${lesson.note_count === 1 ? "note" : "notes"}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusClass(lesson.status)}>{lesson.status}</Badge>
                </button>
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {pageCount}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  aria-label="Previous lesson page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page === pageCount}
                  aria-label="Next lesson page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedLesson)}
        onOpenChange={(open) => {
          if (!open) setSelectedLesson(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selectedLesson && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <DialogTitle>
                    {selectedLesson.lesson || `${selectedLesson.kind === "GROUND" ? "Ground" : "Flight"} Lesson`}
                  </DialogTitle>
                  <Badge className={statusClass(selectedLesson.status)}>{selectedLesson.status}</Badge>
                </div>
                <DialogDescription>
                  {formatDateTime(selectedLesson.start_at)} to {formatET(selectedLesson.end_at, "h:mm a")}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <Metric
                  label={personLabel}
                  value={personName || "Not assigned"}
                  icon={User}
                />
                <Metric
                  label="Aircraft"
                  value={selectedLesson.aircraft_tail || (selectedLesson.kind === "GROUND" ? "Ground lesson" : "Not assigned")}
                  icon={Plane}
                />
                <Metric
                  label="Scheduled time"
                  value={formatHours(scheduledHours(selectedLesson))}
                  icon={Clock}
                />
                <Metric
                  label="Lesson type"
                  value={selectedLesson.flight_type === "RELOCATION" ? "Relocation flight" : selectedLesson.kind}
                  icon={BookOpen}
                />
                <Metric
                  label="Dual given"
                  value={formatHours(selectedLesson.dual_given_time)}
                  icon={Clock}
                />
                <Metric
                  label="Ground instruction"
                  value={formatHours(selectedLesson.ground_instruction_time)}
                  icon={Clock}
                />
                <Metric
                  label="Hobbs"
                  value={formatHours(differenceHours(selectedLesson.hobbs_start, selectedLesson.hobbs_end))}
                  icon={Gauge}
                />
                <Metric
                  label="Tach"
                  value={formatHours(differenceHours(selectedLesson.tach_start, selectedLesson.tach_end))}
                  icon={Gauge}
                />
              </div>

              {(selectedLesson.origin || selectedLesson.destination) && (
                <div className="border-b pb-4">
                  <p className="text-xs text-muted-foreground">Route</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedLesson.origin || "Not recorded"} to {selectedLesson.destination || "Not recorded"}
                  </p>
                </div>
              )}

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </h3>
                {loadingNotes ? (
                  <p className="py-4 text-sm text-muted-foreground">Loading notes...</p>
                ) : notes.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No notes recorded.</p>
                ) : (
                  <div className="mt-3 divide-y border-y">
                    {notes.map((note) => (
                      <div key={note.id} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{note.author_name || "Unknown author"}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
