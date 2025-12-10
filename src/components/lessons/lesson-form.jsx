"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Clock, User, Plane, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription} from "@/components/ui/alert";
import { lessonsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

const lessonSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  instructorId: z.string().min(1, "Instructor is required"),
  aircraftId: z.string().optional(),
  kind: z.enum(["FLIGHT", "GROUND"], {
    required_error: "Lesson type is required",
  }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  program: z.string().optional(),
  stage: z.string().optional(),
  lesson: z.string().optional(),
});

export function LessonForm({ 
  lesson, 
  initialValues, 
  syllabus, 
  students, 
  instructors, 
  aircraft, 
  onSubmit, 
  onCancel 
}) {
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const form = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      studentId: lesson?.student_id || initialValues?.studentId || "",
      instructorId: lesson?.instructor_id || initialValues?.instructorId || "",
      aircraftId: lesson?.aircraft_id || initialValues?.aircraftId || "none",
      kind: lesson?.kind || initialValues?.kind || "FLIGHT",
      startDate: lesson?.start_at ? new Date(lesson.start_at) : (initialValues?.startDate ? new Date(initialValues.startDate) : new Date()),
      startTime: lesson?.start_at ? format(new Date(lesson.start_at), "HH:mm") : (initialValues?.startTime || "09:00"),
      endTime: lesson?.end_at ? format(new Date(lesson.end_at), "HH:mm") : (initialValues?.endTime || "10:00"),
      program: lesson?.program || initialValues?.program || "",
      stage: lesson?.stage || initialValues?.stage || "",
      lesson: lesson?.lesson || initialValues?.lesson || "",
    },
  });

  const watchedValues = form.watch();

  // Check for conflicts when key fields change
  useEffect(() => {
    const { studentId, instructorId, aircraftId, startDate, startTime, endTime } = watchedValues;
    
    if (studentId && instructorId && startDate && startTime && endTime) {
      checkConflicts();
    } else {
      setConflicts([]);
    }
  }, [watchedValues.studentId, watchedValues.instructorId, watchedValues.aircraftId, 
      watchedValues.startDate, watchedValues.startTime, watchedValues.endTime]);

  const checkConflicts = async () => {
    try {
      setCheckingConflicts(true);
      const { studentId, instructorId, aircraftId, startDate, startTime, endTime } = watchedValues;
      
      const startAt = new Date(startDate);
      startAt.setHours(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]));
      
      const endAt = new Date(startDate);
      endAt.setHours(parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]));

      const response = await lessonsAPI.checkConflicts({
        studentId,
        instructorId,
        aircraftId: aircraftId && aircraftId !== "none" ? aircraftId : undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

      setConflicts(response.data.conflicts || []);
    } catch (error) {
      console.error("Error checking conflicts:", error);
      setConflicts([]);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Combine date and time
      const startAt = new Date(data.startDate);
      startAt.setHours(parseInt(data.startTime.split(':')[0]), parseInt(data.startTime.split(':')[1]));
      
      const endAt = new Date(data.startDate);
      endAt.setHours(parseInt(data.endTime.split(':')[0]), parseInt(data.endTime.split(':')[1]));

      const lessonData = {
        studentId: data.studentId,
        instructorId: data.instructorId,
        aircraftId: data.aircraftId && data.aircraftId !== "none" ? data.aircraftId : null,
        kind: data.kind,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        program: data.program || "",
        stage: data.stage || "",
        lesson: data.lesson || "",
      };

      await onSubmit(lessonData);
    } catch (error) {
      console.error("Error submitting lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get syllabus options based on selected program/stage
  const getStageOptions = () => {
    if (!syllabus?.stages) return [];
    return syllabus.stages.map(stage => ({
      value: stage.title,
      label: stage.title,
      id: stage.id
    }));
  };

  const getLessonOptions = () => {
    if (!syllabus?.lessons || !watchedValues.stage) return [];
    
    const selectedStage = syllabus.stages?.find(s => s.title === watchedValues.stage);
    if (!selectedStage) return [];
    
    return syllabus.lessons
      .filter(l => l.stage_id === selectedStage.id)
      .map(lesson => ({
        value: lesson.title,
        label: lesson.title,
        kind: lesson.kind
      }));
  };

  // Auto-set lesson type based on selected syllabus lesson
  useEffect(() => {
    const selectedLesson = getLessonOptions().find(l => l.value === watchedValues.lesson);
    if (selectedLesson && selectedLesson.kind !== watchedValues.kind) {
      form.setValue("kind", selectedLesson.kind);
    }
  }, [watchedValues.lesson]);

  const getConflictDescription = (conflict) => {
    switch (conflict.type) {
      case "student-lesson":
        return "Student has another lesson scheduled";
      case "instructor-lesson":
        return "Instructor has another lesson scheduled";
      case "student-unavailable":
        return "Student is not available";
      case "instructor-unavailable":
        return "Instructor is not available";
      case "aircraft-hold":
        return "Aircraft is on hold";
      case "aircraft-status":
        return "Aircraft is in maintenance";
      default:
        return "Scheduling conflict detected";
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Conflict Warnings */}
        {conflicts.length > 0 && (
          <Alert className="border-destructive">
            <AlertDescription>
              <div className="font-medium mb-2">Scheduling conflicts detected:</div>
              <ul className="list-disc list-inside space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index} className="text-sm">
                    {getConflictDescription(conflict)}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>
              Select the student, instructor, and lesson type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Student
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Instructor
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instructors.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.name}
                            {instructor.is_lead_instructor && (
                              <Badge variant="secondary" className="ml-2">Lead</Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FLIGHT">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4" />
                            Flight
                          </div>
                        </SelectItem>
                        <SelectItem value="GROUND">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Ground
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aircraftId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Aircraft {watchedValues.kind === "GROUND" && "(Optional)"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select aircraft" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No aircraft</SelectItem>
                        {aircraft.filter(a => a.status === "OK").map((ac) => (
                          <SelectItem key={ac.id} value={ac.id}>
                            {ac.tail_number}
                            <Badge variant="outline" className="ml-2">
                              {ac.status}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Schedule</CardTitle>
            <CardDescription>
              Set the date and time for the lesson
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Start Time
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      End Time
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {checkingConflicts && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Checking for conflicts...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Syllabus Information */}
        {syllabus && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Syllabus Information</CardTitle>
              <CardDescription>
                Link this lesson to your training program (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Private Pilot License"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getStageOptions().map((stage) => (
                            <SelectItem key={stage.id} value={stage.value}>
                              {stage.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lesson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lesson" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getLessonOptions().map((lesson) => (
                            <SelectItem key={lesson.value} value={lesson.value}>
                              <div className="flex items-center gap-2">
                                {lesson.kind === "FLIGHT" ? (
                                  <Plane className="h-4 w-4" />
                                ) : (
                                  <BookOpen className="h-4 w-4" />
                                )}
                                {lesson.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || conflicts.length > 0}
            className="bg-golden-gradient hover:bg-golden-gradient/90"
          >
            {loading ? "Scheduling..." : lesson ? "Update Lesson" : "Schedule Lesson"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
