"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Plane, 
  BookOpen, 
  User, 
  Clock, 
  Calendar, 
  MapPin, 
  FileText, 
  Edit, 
  Trash2, 
  Check, 
  Plus,
  MessageSquare 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { lessonsAPI } from "@/lib/api";
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
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    if (lesson?.id) {
      fetchNotes();
    }
  }, [lesson?.id]);

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      const response = await lessonsAPI.getNotes(lesson.id);
      setNotes(response.data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to fetch lesson notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      await lessonsAPI.addNote(lesson.id, { content: newNote.trim() });
      setNewNote("");
      toast.success("Note added successfully");
      fetchNotes(); // Refresh notes
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
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

  const formatDateTime = (dateTime, timeString) => {
    // Extract date part to avoid timezone issues
    const datePart = dateTime.split('T')[0];
    const dateStr = format(new Date(datePart), "EEEE, MMMM d, yyyy");
    
    if (timeString) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${dateStr} at ${displayHour}:${minutes} ${ampm}`;
    }
    
    return `${dateStr} at ${format(new Date(dateTime), "h:mm a")}`;
  };

  const formatTime = (dateTime, timeString) => {
    // Use timeString if available (e.g., "09:00"), otherwise parse dateTime
    if (timeString) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return format(new Date(dateTime), "h:mm a");
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
          {formatDateTime(lesson.start_at, lesson.start_time)}
        </SheetDescription>
      </SheetHeader>

      {/* Status and Actions */}
      <div className="flex items-center justify-between">
        <Badge className={cn("px-3 py-1", getStatusColor(lesson.status))}>
          {lesson.status}
        </Badge>
        
        {/* RBAC: Only ADMIN or lesson's INSTRUCTOR can edit/delete/complete lessons */}
        {(user?.role === 'ADMIN' || (user?.role === 'INSTRUCTOR' && user?.id === lesson.instructor_id)) && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            {lesson.status === "SCHEDULED" && (
              <Button variant="outline" size="sm" onClick={onComplete}>
                <Check className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

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
                    {formatTime(lesson.start_at, lesson.start_time)} - {formatTime(lesson.end_at, lesson.end_time)}
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
              
              {aircraftDetails.hobbs_time && (
                <div>
                  <p className="text-sm font-medium">Hobbs Time</p>
                  <p className="text-sm text-muted-foreground">
                    {aircraftDetails.hobbs_time} hours
                  </p>
                </div>
              )}
            </div>
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

      {/* Instructor Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Instructor Notes
          </CardTitle>
          <CardDescription>
            Notes and feedback for this lesson
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* RBAC: Only ADMIN and INSTRUCTOR can add notes */}
          {(user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') && (
            <div className="space-y-3">
              <Textarea
                placeholder="Add a note about this lesson..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
              />
              <Button 
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
                size="sm"
                className="bg-golden-gradient hover:bg-golden-gradient/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addingNote ? "Adding..." : "Add Note"}
              </Button>
            </div>
          )}

          <Separator />

          {/* Notes List */}
          {loadingNotes ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium">{note.author_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
