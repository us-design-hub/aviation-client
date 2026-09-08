"use client";

import { useCallback, useState, useEffect } from "react";
import { Plus, Calendar as CalendarIcon, CalendarClock, CheckCircle2, Plane, List, Filter, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/panels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { lessonsAPI, syllabusAPI, usersAPI, aircraftAPI, rentalsAPI } from "@/lib/api";
import { LessonsCalendar } from "./lessons-calendar";
import { LessonsTable } from "./lessons-table";
import { LessonForm } from "./lesson-form";
import { LessonDetails } from "./lesson-details";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import { isDateInCurrentWeekET, isSameDateET, isSameMonthET, nowET, scheduleRangeParams } from "@/lib/format-tz";

export function LessonsClient() {
  // State
  const [lessons, setLessons] = useState([]);
  const [syllabi, setSyllabi] = useState([]);
  const [syllabus, setSyllabus] = useState(null);
  const [users, setUsers] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedStudents, setAssignedStudents] = useState([]); // For instructors: list of assigned student IDs
  
  // UI State
  const [viewMode, setViewMode] = useState("calendar"); // calendar | list
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formInitialValues, setFormInitialValues] = useState(null); // For pre-filling form
  const [groundCompleteDialog, setGroundCompleteDialog] = useState({ open: false, lesson: null });
  const [groundCompleteForm, setGroundCompleteForm] = useState({ groundInstructionTime: "", instructorNote: "" });
  const [groundCompleteSaving, setGroundCompleteSaving] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    kind: "all",
    studentId: "",
    instructorId: "",
    aircraftId: "",
    dateRange: "all", // today | week | month | all
  });

  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const { user } = useAuth();

  // Fetch all data on mount and when user changes
  useEffect(() => {
    if (user?.role) {
      fetchAllData();
    }
  }, [user?.role]);

  const fetchAllData = async () => {
    try {
      // Keep the mounted calendar stable during background refreshes.
      setError(null);
      
      // Wait for user to be loaded
      if (!user?.role) {
        return;
      }
      
      // Role-based API calls - only fetch what the user can access
      const apiCalls = [];
      
      // All roles can access lessons and syllabus
      apiCalls.push(lessonsAPI.getAll());
      apiCalls.push(syllabusAPI.list());
      
      // ADMIN and INSTRUCTOR can fetch students and instructors (needed for scheduling)
      if (user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') {
        // Fetch students and instructors separately
        const [studentsRes, instructorsRes] = await Promise.all([
          usersAPI.getStudents(),
          usersAPI.getInstructors()
        ]);
        // Combine into single users array
        const combinedUsers = [...(studentsRes.data || []), ...(instructorsRes.data || [])];
        apiCalls.push(Promise.resolve({ data: combinedUsers }));
        
        // For instructors, also fetch their assigned students
        if (user?.role === 'INSTRUCTOR') {
          try {
            const myStudentsRes = await usersAPI.getMyStudents();
            const myStudents = myStudentsRes.data || [];
            setAssignedStudents(myStudents.map(s => s.id));
          } catch (error) {
            console.error('Error fetching assigned students:', error);
          }
        }
      } else {
        // Students get empty array
        apiCalls.push(Promise.resolve({ data: [] }));
      }
      
      // All roles can access aircraft
      apiCalls.push(aircraftAPI.getAll());
      
      const results = await Promise.allSettled(apiCalls);

      // Handle results - map to correct variables
      const lessonsRes = results[0];
      const syllabusRes = results[1];
      const usersRes = results[2];
      const aircraftRes = results[3];

      // Set data from successful responses
      if (lessonsRes.status === 'fulfilled') {
        setLessons(lessonsRes.value.data || []);
      }
      
      if (syllabusRes.status === 'fulfilled') {
        const list = syllabusRes.value.data || [];
        if (list.length) {
          try {
            const details = await Promise.all(list.map((s) => syllabusAPI.get(s.id)));
            const detailedSyllabi = details.map((r) => r.data).filter(Boolean);
            setSyllabi(detailedSyllabi);
            const active = detailedSyllabi.find((s) => s.active === 1) || detailedSyllabi[0] || null;
            setSyllabus(active);
          } catch (e) {
            console.error("Error fetching syllabus details:", e);
            setSyllabi([]);
            setSyllabus(null);
          }
        } else {
          setSyllabi([]);
          setSyllabus(null);
        }
      }
      
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data || []);
      } else {
        setUsers([]);
      }
      
      if (aircraftRes.status === 'fulfilled') {
        setAircraft(aircraftRes.value.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch lessons data");
      toast.error("Failed to fetch lessons data");
    } finally {
      setLoading(false);
    }
  };


  const fetchSchedule = useCallback(async ({ date, view }) => {
    try {
      const response = await rentalsAPI.getSchedule(
        scheduleRangeParams(date, view)
      );
      setScheduleEvents(response.data || []);
    } catch (error) {
      console.error("Error fetching lesson schedule:", error);
      toast.error("Failed to fetch lesson schedule");
    }
  }, []);

  // Filter lessons based on current filters
  const filteredLessons = lessons.filter(lesson => {
    // Search across everything visible in a row, so looking up a person by name works.
    const haystack = [
      lesson.lesson, lesson.program, lesson.stage, lesson.guest_name,
      lesson.student_name, lesson.instructor_name, lesson.aircraft_tail,
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = !filters.search || haystack.includes(filters.search.trim().toLowerCase());
    
    const matchesStatus = filters.status === "all" || lesson.status === filters.status;
    const matchesKind = filters.kind === "all" || lesson.kind === filters.kind;
    const matchesStudent = !filters.studentId || lesson.student_id === filters.studentId;
    const matchesInstructor = !filters.instructorId || lesson.instructor_id === filters.instructorId;
    const matchesAircraft = !filters.aircraftId || lesson.aircraft_id === filters.aircraftId;
    
    // Date range filtering
    let matchesDateRange = true;
    if (filters.dateRange !== "all") {
      const now = nowET();
      
      switch (filters.dateRange) {
        case "today":
          matchesDateRange = isSameDateET(lesson.start_at, now);
          break;
        case "week":
          matchesDateRange = isDateInCurrentWeekET(lesson.start_at, now);
          break;
        case "month":
          matchesDateRange = isSameMonthET(lesson.start_at, now);
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesKind && matchesStudent && 
           matchesInstructor && matchesAircraft && matchesDateRange;
  });

  // Get user options for dropdowns
  const allStudents = users.filter(u => u.role === "STUDENT");
  const instructors = users.filter(u => u.role === "INSTRUCTOR");
  
  // Filter students for lesson form based on instructor assignments
  // ADMIN sees all students, INSTRUCTOR sees only assigned students
  const students = user?.role === 'ADMIN' 
    ? allStudents 
    : (user?.role === 'INSTRUCTOR' && assignedStudents.length > 0)
      ? allStudents.filter(s => assignedStudents.includes(s.id))
      : allStudents;

  // Handlers
  const handleCreateLesson = async (lessonData) => {
    try {
      const response = await lessonsAPI.create(lessonData);
      toast.success("Lesson scheduled successfully");
      setIsFormOpen(false);
      setLessons((current) => [...current, response.data]);
      return response.data;
    } catch (error) {
      console.error("Error creating lesson:", error);
      if (error.response?.data?.error === "INSTRUCTION_BILLING_BLOCKED") {
        toast.error("Student has too much unpaid instructor time to schedule another flight lesson");
      } else if (error.response?.status === 409) {
        toast.error("Scheduling conflict detected");
      } else {
        toast.error("Failed to schedule lesson");
      }
      throw error;
    }
  };

  const handleUpdateLesson = async (id, lessonData) => {
    try {
      const response = await lessonsAPI.update(id, lessonData);
      toast.success("Lesson updated successfully");
      setIsFormOpen(false);
      setEditingLesson(null);
      setLessons((current) => current.map((item) => item.id === id ? response.data : item));
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast.error("Failed to update lesson");
      throw error;
    }
  };

  const handleDeleteLesson = async (lesson) => {
    const confirmed = await showConfirm({
      title: "Delete Lesson",
      description: `Are you sure you want to delete this ${lesson.kind.toLowerCase()} lesson? This action cannot be undone.`,
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await lessonsAPI.delete(lesson.id);
      toast.success("Lesson deleted successfully");
      fetchAllData();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    }
  };

  const handleCompleteLesson = async (lesson) => {
    if (lesson.kind === "GROUND") {
      setGroundCompleteDialog({ open: true, lesson });
      setGroundCompleteForm({
        groundInstructionTime: lesson.ground_instruction_time ? String(lesson.ground_instruction_time) : "",
        instructorNote: "",
      });
      return;
    }

    const confirmed = await showConfirm({
      title: "Complete Lesson",
      description: `Mark this ${lesson.kind.toLowerCase()} lesson as completed?`,
    });

    if (!confirmed) return;

    try {
      await lessonsAPI.complete(lesson.id);
      toast.success("Lesson marked as completed");
      fetchAllData();
    } catch (error) {
      console.error("Error completing lesson:", error);
      toast.error(error.response?.data?.message || "Failed to complete lesson");
    }
  };

  const submitGroundComplete = async () => {
    const lesson = groundCompleteDialog.lesson;
    if (!lesson) return;

    const groundInstructionTime = Number(groundCompleteForm.groundInstructionTime);
    if (!Number.isFinite(groundInstructionTime) || groundInstructionTime < 0) {
      toast.error("Ground instruction time must be a valid non-negative number");
      return;
    }

    try {
      setGroundCompleteSaving(true);
      await lessonsAPI.complete(lesson.id, {
        instructionGiven: false,
        dualGivenTime: 0,
        groundInstructionTime,
        instructorNote: groundCompleteForm.instructorNote,
      });
      toast.success("Ground lesson marked as completed");
      setGroundCompleteDialog({ open: false, lesson: null });
      setGroundCompleteForm({ groundInstructionTime: "", instructorNote: "" });
      fetchAllData();
    } catch (error) {
      console.error("Error completing ground lesson:", error);
      toast.error(error.response?.data?.message || "Failed to complete ground lesson");
    } finally {
      setGroundCompleteSaving(false);
    }
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setIsDetailsOpen(true);
  };

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setFormInitialValues(null); // Clear initial values when editing
    setIsFormOpen(true);
  };

  // NEW: Handle time slot click from Schedule view
  const handleTimeSlotClick = ({ date, hour, resourceId, resourceType }) => {
    // RBAC: Only ADMIN and INSTRUCTOR can create lessons via time slot click
    if (user?.role !== 'ADMIN' && user?.role !== 'INSTRUCTOR') {
      toast.error("You don't have permission to schedule lessons");
      return;
    }
    
    // Create initial values for pre-filling the form
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endHour = hour + 2; // Default 2-hour lesson duration
    const endTime = `${String(endHour).padStart(2, '0')}:00`;
    
    const initialValues = {
      startDate: date,
      startTime: startTime,
      endTime: endTime,
      kind: "FLIGHT", // Default to flight lesson
    };
    
    // Pre-fill based on resource type
    if (resourceType === "aircraft" && resourceId) {
      initialValues.aircraftId = resourceId;
    } else if (resourceType === "instructor" && resourceId) {
      initialValues.instructorId = resourceId;
    }
    
    setFormInitialValues(initialValues);
    setEditingLesson(null); // Clear editing mode
    setIsFormOpen(true);
    
    toast.info(`Creating lesson for ${new Date(date).toLocaleDateString('en-US', { timeZone: 'America/New_York' })} at ${startTime}`);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      kind: "all",
      studentId: "",
      instructorId: "",
      aircraftId: "",
      dateRange: "all",
    });
  };

  const canSchedule = user?.role === "ADMIN" || user?.role === "INSTRUCTOR";
  const canFilterPeople = canSchedule && users.length > 0;

  const counts = {
    total: lessons.length,
    scheduled: lessons.filter((l) => l.status === "SCHEDULED").length,
    completed: lessons.filter((l) => l.status === "COMPLETED").length,
    flight: lessons.filter((l) => l.kind === "FLIGHT").length,
    ground: lessons.filter((l) => l.kind === "GROUND").length,
    today: lessons.filter((l) => isSameDateET(l.start_at, nowET())).length,
  };

  const activeFilterCount = [
    filters.search,
    filters.status !== "all" ? filters.status : "",
    filters.kind !== "all" ? filters.kind : "",
    filters.dateRange !== "all" ? filters.dateRange : "",
    filters.studentId,
    filters.instructorId,
    filters.aircraftId,
  ].filter(Boolean).length;

  const setFilter = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  /** Stat tiles double as filters: clicking one narrows the list below. */
  const statTiles = [
    {
      key: "today", label: "Today", value: counts.today, icon: CalendarClock,
      tone: counts.today > 0 ? "gold" : "neutral",
      hint: counts.today > 0 ? "Scheduled for today" : "Nothing today",
      onClick: () => setFilter({ dateRange: "today", status: "all", kind: "all" }),
    },
    {
      key: "scheduled", label: "Scheduled", value: counts.scheduled, icon: CalendarIcon,
      tone: "info", hint: "Upcoming and unflown",
      onClick: () => setFilter({ status: "SCHEDULED", dateRange: "all" }),
    },
    {
      key: "completed", label: "Completed", value: counts.completed, icon: CheckCircle2,
      tone: "success", hint: "Logged to date",
      onClick: () => setFilter({ status: "COMPLETED", dateRange: "all" }),
    },
    {
      key: "flight", label: "Flight / Ground", value: `${counts.flight} / ${counts.ground}`,
      icon: Plane, tone: "neutral", hint: `${counts.total} lessons in total`,
      onClick: () => setFilter({ kind: "FLIGHT", status: "all", dateRange: "all" }),
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <Card className="gap-0 py-0">
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-red-500/12">
              <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Could not load lessons</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchAllData} className="mt-2">
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lessons &amp; Scheduling</h1>
          <p className="mt-1 text-muted-foreground">
            {user?.role === "STUDENT"
              ? "Your scheduled and completed flight training."
              : user?.role === "INSTRUCTOR"
                ? "Lessons you teach, and the students assigned to you."
                : "Flight and ground lessons across the school."}
          </p>
        </div>

        {canSchedule && (
          <Sheet open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingLesson(null);
              setFormInitialValues(null);
            }
          }}>
            <SheetTrigger asChild>
              <Button
                className="bg-golden-gradient hover:bg-golden-gradient/90"
                onClick={() => {
                  setEditingLesson(null);
                  setFormInitialValues(null);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Lesson
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[600px] lg:w-[700px] overflow-y-auto max-w-full">
              <SheetHeader className="sticky top-0 bg-background pb-4 border-b">
                <SheetTitle>{editingLesson ? "Edit Lesson" : "Schedule New Lesson"}</SheetTitle>
                <SheetDescription>
                  {editingLesson
                    ? "Update the lesson details below."
                    : "Fill in the details to schedule a new lesson."}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 pb-6">
                <LessonForm
                  lesson={editingLesson}
                  initialValues={formInitialValues}
                  syllabi={syllabi}
                  syllabus={syllabus}
                  students={students}
                  instructors={instructors}
                  aircraft={aircraft}
                  canOverrideDebt={user?.role === 'ADMIN'}
                  onSubmit={editingLesson
                    ? (data) => handleUpdateLesson(editingLesson.id, data)
                    : handleCreateLesson}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingLesson(null);
                    setFormInitialValues(null);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((tile) => (
          <StatTile
            key={tile.key}
            label={tile.label}
            value={tile.value}
            icon={tile.icon}
            tone={tile.tone}
            hint={tile.hint}
            onClick={tile.onClick}
          />
        ))}
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by lesson, student, instructor, or tail number"
                value={filters.search}
                onChange={(e) => setFilter({ search: e.target.value })}
                className="pl-9"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => setFilter({ status: value })}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.kind} onValueChange={(value) => setFilter({ kind: value })}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="FLIGHT">Flight</SelectItem>
                <SelectItem value="GROUND">Ground</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.dateRange} onValueChange={(value) => setFilter({ dateRange: value })}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Date range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canFilterPeople && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <Select
                value={filters.studentId || "all"}
                onValueChange={(value) => setFilter({ studentId: value === "all" ? "" : value })}
              >
                <SelectTrigger className="w-[190px]"><SelectValue placeholder="Student" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {allStudents.map((person) => (
                    <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.instructorId || "all"}
                onValueChange={(value) => setFilter({ instructorId: value === "all" ? "" : value })}
              >
                <SelectTrigger className="w-[190px]"><SelectValue placeholder="Instructor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All instructors</SelectItem>
                  {instructors.map((person) => (
                    <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.aircraftId || "all"}
                onValueChange={(value) => setFilter({ aircraftId: value === "all" ? "" : value })}
              >
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Aircraft" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All aircraft</SelectItem>
                  {aircraft.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.tail_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground tabular-nums">{filteredLessons.length}</span>
              {" of "}
              <span className="tabular-nums">{lessons.length}</span> lessons
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`}
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters} disabled={activeFilterCount === 0}>
              <Filter className="h-4 w-4 mr-2" />
              Reset filters
            </Button>
          </div>
        </div>
      </Card>

      <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-5">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-auto">
          <TabsTrigger value="calendar" className="gap-1.5 px-3 py-1.5">
            <CalendarIcon className="size-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5 px-3 py-1.5">
            <List className="size-4" />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <LessonsCalendar
            lessons={filteredLessons}
            users={users}
            aircraft={aircraft}
            externalScheduleEvents={scheduleEvents}
            onRangeChange={fetchSchedule}
            onLessonClick={handleLessonClick}
            onEditLesson={handleEditLesson}
            onDeleteLesson={handleDeleteLesson}
            onCompleteLesson={handleCompleteLesson}
            onTimeSlotClick={handleTimeSlotClick}
          />
        </TabsContent>

        <TabsContent value="list">
          <LessonsTable
            lessons={filteredLessons}
            users={users}
            aircraft={aircraft}
            onLessonClick={handleLessonClick}
            onEditLesson={handleEditLesson}
            onDeleteLesson={handleDeleteLesson}
            onCompleteLesson={handleCompleteLesson}
          />
        </TabsContent>
      </Tabs>
      {/* Lesson Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[600px] lg:w-[800px] overflow-y-auto max-w-full">
          {selectedLesson && (
            <LessonDetails
              lesson={selectedLesson}
              users={users}
              aircraft={aircraft}
              syllabus={syllabus}
              onEdit={() => {
                setIsDetailsOpen(false);
                handleEditLesson(selectedLesson);
              }}
              onDelete={() => {
                setIsDetailsOpen(false);
                handleDeleteLesson(selectedLesson);
              }}
              onComplete={() => {
                handleCompleteLesson(selectedLesson);
              }}
              onNotesChanged={(note) => {
                setLessons((current) => current.map((item) =>
                  item.id === selectedLesson.id
                    ? {
                        ...item,
                        note_count: Number(item.note_count || 0) + 1,
                        latest_note: note.content,
                      }
                    : item
                ));
                setSelectedLesson((current) => current
                  ? {
                      ...current,
                      note_count: Number(current.note_count || 0) + 1,
                      latest_note: note.content,
                    }
                  : current
                );
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={groundCompleteDialog.open}
        onOpenChange={(open) => {
          if (!groundCompleteSaving) {
            setGroundCompleteDialog({ open, lesson: open ? groundCompleteDialog.lesson : null });
            if (!open) setGroundCompleteForm({ groundInstructionTime: "", instructorNote: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Ground Lesson</DialogTitle>
            <DialogDescription>
              Record the ground instruction time and instructor feedback for this lesson.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groundInstructionTime">Ground instruction time</Label>
              <Input
                id="groundInstructionTime"
                type="number"
                step="0.1"
                min="0"
                placeholder="2.4"
                value={groundCompleteForm.groundInstructionTime}
                onChange={(event) =>
                  setGroundCompleteForm((current) => ({
                    ...current,
                    groundInstructionTime: event.target.value,
                  }))
                }
              />
              <p className="text-sm text-muted-foreground">
                Enter decimal hours. Example: 2.4 means 2 hours and 24 minutes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groundInstructorNote">Instructor feedback</Label>
              <Textarea
                id="groundInstructorNote"
                rows={4}
                value={groundCompleteForm.instructorNote}
                onChange={(event) =>
                  setGroundCompleteForm((current) => ({
                    ...current,
                    instructorNote: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGroundCompleteDialog({ open: false, lesson: null });
                setGroundCompleteForm({ groundInstructionTime: "", instructorNote: "" });
              }}
              disabled={groundCompleteSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitGroundComplete} disabled={groundCompleteSaving}>
              {groundCompleteSaving ? "Saving..." : "Mark Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
