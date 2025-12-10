"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, List, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { lessonsAPI, syllabusAPI, usersAPI, aircraftAPI } from "@/lib/api";
import { LessonsCalendar } from "./lessons-calendar";
import { LessonsTable } from "./lessons-table";
import { LessonForm } from "./lesson-form";
import { LessonDetails } from "./lesson-details";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";

export function LessonsClient() {
  // State
  const [lessons, setLessons] = useState([]);
  const [syllabus, setSyllabus] = useState(null);
  const [users, setUsers] = useState([]);
  const [aircraft, setAircraft] = useState([]);
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
      setLoading(true);
      setError(null);
      
      // Wait for user to be loaded
      if (!user?.role) {
        return;
      }
      
      // Role-based API calls - only fetch what the user can access
      const apiCalls = [];
      
      // All roles can access lessons and syllabus
      apiCalls.push(lessonsAPI.getAll());
      apiCalls.push(syllabusAPI.getActive());
      
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
        setSyllabus(syllabusRes.value.data);
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

  // Filter lessons based on current filters
  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = !filters.search || 
      lesson.lesson?.toLowerCase().includes(filters.search.toLowerCase()) ||
      lesson.program?.toLowerCase().includes(filters.search.toLowerCase()) ||
      lesson.stage?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = filters.status === "all" || lesson.status === filters.status;
    const matchesKind = filters.kind === "all" || lesson.kind === filters.kind;
    const matchesStudent = !filters.studentId || lesson.student_id === filters.studentId;
    const matchesInstructor = !filters.instructorId || lesson.instructor_id === filters.instructorId;
    const matchesAircraft = !filters.aircraftId || lesson.aircraft_id === filters.aircraftId;
    
    // Date range filtering
    let matchesDateRange = true;
    if (filters.dateRange !== "all") {
      const lessonDate = new Date(lesson.start_at);
      const now = new Date();
      
      switch (filters.dateRange) {
        case "today":
          matchesDateRange = lessonDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          matchesDateRange = lessonDate >= weekStart && lessonDate <= weekEnd;
          break;
        case "month":
          matchesDateRange = lessonDate.getMonth() === now.getMonth() && lessonDate.getFullYear() === now.getFullYear();
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
      fetchAllData(); // Refresh data
      return response.data;
    } catch (error) {
      console.error("Error creating lesson:", error);
      if (error.response?.status === 409) {
        toast.error("Scheduling conflict detected");
      } else {
        toast.error("Failed to schedule lesson");
      }
      throw error;
    }
  };

  const handleUpdateLesson = async (id, lessonData) => {
    try {
      await lessonsAPI.update(id, lessonData);
      toast.success("Lesson updated successfully");
      setIsFormOpen(false);
      setEditingLesson(null);
      fetchAllData();
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
      toast.error("Failed to complete lesson");
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
    
    toast.info(`Creating lesson for ${new Date(date).toLocaleDateString()} at ${startTime}`);
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

  if (loading) {
    return (
      <div className="mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading lessons...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchAllData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lessons & Scheduling</h1>
          <p className="text-muted-foreground mt-1">
            Manage flight and ground lessons
          </p>
        </div>
        
        {/* RBAC: Only ADMIN and INSTRUCTOR can schedule lessons */}
        {(user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') && (
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
              <SheetTitle>
                {editingLesson ? "Edit Lesson" : "Schedule New Lesson"}
              </SheetTitle>
              <SheetDescription>
                {editingLesson 
                  ? "Update the lesson details below."
                  : "Fill in the details to schedule a new lesson."
                }
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 pb-6">
              <LessonForm
                lesson={editingLesson}
                initialValues={formInitialValues}
                syllabus={syllabus}
                students={students}
                instructors={instructors}
                aircraft={aircraft}
                onSubmit={editingLesson ? 
                  (data) => handleUpdateLesson(editingLesson.id, data) : 
                  handleCreateLesson
                }
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Lessons</p>
                <p className="text-2xl font-bold">{lessons.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {lessons.filter(l => l.status === "SCHEDULED").length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {lessons.filter(l => l.status === "COMPLETED").length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flight Lessons</p>
                <p className="text-2xl font-bold text-purple-600">
                  {lessons.filter(l => l.kind === "FLIGHT").length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search lessons..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.kind} onValueChange={(value) => setFilters(prev => ({ ...prev, kind: value }))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FLIGHT">Flight</SelectItem>
                <SelectItem value="GROUND">Ground</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={resetFilters} size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle & Content */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-6">
          <LessonsCalendar
            lessons={filteredLessons}
            users={users}
            aircraft={aircraft}
            onLessonClick={handleLessonClick}
            onEditLesson={handleEditLesson}
            onDeleteLesson={handleDeleteLesson}
            onCompleteLesson={handleCompleteLesson}
            onTimeSlotClick={handleTimeSlotClick}
          />
        </TabsContent>
        
        <TabsContent value="list" className="mt-6">
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
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      {ConfirmDialog}
    </div>
  );
}
