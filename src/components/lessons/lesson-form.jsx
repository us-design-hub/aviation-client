"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Clock, User, Plane, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { formatET, etToISO } from "@/lib/format-tz";
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
import { TimeSelect } from "@/components/ui/time-select";
import { Switch } from "@/components/ui/switch";
import { lessonsAPI, usersAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

const lessonSchema = z.object({
  studentId: z.string().optional(),
  instructorId: z.string().min(1, "Instructor is required"),
  aircraftId: z.string().optional(),
  kind: z.enum(["FLIGHT", "GROUND"], {
    required_error: "Lesson type is required",
  }),
  flightType: z.enum(["TRAINING", "RELOCATION"]).default("TRAINING"),
  origin: z.string().optional(),
  destination: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  program: z.string().optional(),
  stage: z.string().optional(),
  lesson: z.string().optional(),
  overrideInstructionDebt: z.boolean().default(false),
});

export function LessonForm({ 
  lesson, 
  initialValues, 
  syllabi = [],
  syllabus, 
  students, 
  instructors, 
  aircraft, 
  canOverrideDebt = false,
  onSubmit, 
  onCancel 
}) {
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [instructionBilling, setInstructionBilling] = useState(null);

  const form = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      studentId: lesson?.student_id || initialValues?.studentId || "",
      instructorId: lesson?.instructor_id || initialValues?.instructorId || "",
      aircraftId: lesson?.aircraft_id || initialValues?.aircraftId || "none",
      kind: lesson?.kind || initialValues?.kind || "FLIGHT",
      flightType: lesson?.flight_type || initialValues?.flightType || "TRAINING",
      origin: lesson?.origin || initialValues?.origin || "",
      destination: lesson?.destination || initialValues?.destination || "",
      startDate: lesson?.start_at ? new Date(lesson.start_at) : (initialValues?.startDate ? new Date(initialValues.startDate) : new Date()),
      startTime: lesson?.start_at ? formatET(lesson.start_at, "HH:mm") : (initialValues?.startTime || "09:00"),
      endTime: lesson?.end_at ? formatET(lesson.end_at, "HH:mm") : (initialValues?.endTime || "10:00"),
      program: lesson?.program || initialValues?.program || "",
      stage: lesson?.stage || initialValues?.stage || "",
      lesson: lesson?.lesson || initialValues?.lesson || "",
      overrideInstructionDebt: false,
    },
  });

  const watchedValues = form.watch();

  // Check for conflicts when key fields change
  useEffect(() => {
    const { studentId, instructorId, aircraftId, startDate, startTime, endTime } = watchedValues;
    
    const studentIsOptional = watchedValues.kind === "FLIGHT" && watchedValues.flightType === "RELOCATION";
    if ((studentId || studentIsOptional) && instructorId && startDate && startTime && endTime) {
      checkConflicts();
    } else {
      setConflicts([]);
    }
  }, [watchedValues.studentId, watchedValues.instructorId, watchedValues.aircraftId, 
      watchedValues.startDate, watchedValues.startTime, watchedValues.endTime,
      watchedValues.kind, watchedValues.flightType]);

  useEffect(() => {
    const studentId = watchedValues.studentId;
    if (!studentId || studentId === "none") {
      setInstructionBilling(null);
      return;
    }

    let cancelled = false;
    const loadInstructionBilling = async () => {
      try {
        const response = await usersAPI.getInstructionBilling(studentId);
        if (!cancelled) {
          setInstructionBilling(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setInstructionBilling(null);
        }
      }
    };

    loadInstructionBilling();
    return () => {
      cancelled = true;
    };
  }, [watchedValues.studentId]);

  const checkConflicts = async () => {
    try {
      setCheckingConflicts(true);
      const { studentId, instructorId, aircraftId, startDate, startTime, endTime } = watchedValues;

      const response = await lessonsAPI.checkConflicts({
        studentId: studentId && studentId !== "none" ? studentId : undefined,
        instructorId,
        aircraftId: aircraftId && aircraftId !== "none" ? aircraftId : undefined,
        startAt: etToISO(startDate, startTime),
        endAt: etToISO(startDate, endTime),
        excludeLessonId: lesson?.id || undefined,
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
    const isRelocation = data.kind === "FLIGHT" && data.flightType === "RELOCATION";
    if (!isRelocation && (!data.studentId || data.studentId === "none")) {
      form.setError("studentId", { message: "Student is required" });
      return;
    }
    if (isRelocation) {
      if (!data.aircraftId || data.aircraftId === "none") {
        form.setError("aircraftId", { message: "Aircraft is required for relocation" });
        return;
      }
      if (!data.origin?.trim() || !data.destination?.trim()) {
        if (!data.origin?.trim()) form.setError("origin", { message: "Origin is required" });
        if (!data.destination?.trim()) form.setError("destination", { message: "Destination is required" });
        return;
      }
    }
    try {
      setLoading(true);
      
      const lessonData = {
        studentId: data.studentId && data.studentId !== "none" ? data.studentId : null,
        instructorId: data.instructorId,
        aircraftId: data.aircraftId && data.aircraftId !== "none" ? data.aircraftId : null,
        kind: data.kind,
        flightType: data.kind === "FLIGHT" ? data.flightType : "TRAINING",
        origin: data.flightType === "RELOCATION" ? data.origin?.trim() : "",
        destination: data.flightType === "RELOCATION" ? data.destination?.trim() : "",
        startAt: etToISO(data.startDate, data.startTime),
        endAt: etToISO(data.startDate, data.endTime),
        program: data.program || "",
        stage: data.stage || "",
        lesson: data.lesson || "",
        overrideInstructionDebt: Boolean(data.overrideInstructionDebt),
      };

      await onSubmit(lessonData);
    } catch (error) {
      console.error("Error submitting lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get syllabus options based on selected program/stage
  const syllabusPrograms = syllabi.length
    ? syllabi
    : (syllabus ? [syllabus] : []);

  const getProgramOptions = () => {
    return syllabusPrograms.map((p) => ({
      value: p.name,
      label: p.name,
      id: p.id,
    }));
  };

  const getSelectedProgram = () => {
    if (!watchedValues.program) return null;
    return syllabusPrograms.find((p) => p.name === watchedValues.program) || null;
  };

  const getStageOptions = () => {
    const selectedProgram = getSelectedProgram();
    if (!selectedProgram?.stages) return [];
    return selectedProgram.stages.map(stage => ({
      value: stage.title,
      label: stage.title,
      id: stage.id
    }));
  };

  const getLessonOptions = () => {
    const selectedProgram = getSelectedProgram();
    if (!selectedProgram?.lessons || !watchedValues.stage) return [];

    const selectedStage = selectedProgram.stages?.find(s => s.title === watchedValues.stage);
    if (!selectedStage) return [];
    
    return selectedProgram.lessons
      .filter(l => l.stage_id === selectedStage.id)
      .map(lesson => ({
        value: lesson.title,
        label: lesson.title,
        kind: lesson.kind
      }));
  };


  useEffect(() => {
    if (watchedValues.kind === "GROUND" && watchedValues.aircraftId !== "none") {
      form.setValue("aircraftId", "none");
    }
  }, [watchedValues.kind]);

  // Keep dependent fields consistent when program/stage changes
  useEffect(() => {
    const validStage = getStageOptions().some((s) => s.value === watchedValues.stage);
    if (!validStage && watchedValues.stage) {
      form.setValue("stage", "");
      form.setValue("lesson", "");
    }
  }, [watchedValues.program]);

  useEffect(() => {
    const validLesson = getLessonOptions().some((l) => l.value === watchedValues.lesson);
    if (!validLesson && watchedValues.lesson) {
      form.setValue("lesson", "");
    }
  }, [watchedValues.stage]);

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
      case "aircraft-lesson":
        return "Aircraft already has another lesson scheduled";
      case "aircraft-hold":
        return "Aircraft is on hold";
      case "rental-booking":
        return "Aircraft already has a renter booking scheduled";
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
        {instructionBilling?.status === "WARNING" && (
          <Alert>
            <AlertDescription>
              This student has {instructionBilling.outstandingHours.toFixed(1)} unpaid instructor hours. The warning threshold has been reached.
            </AlertDescription>
          </Alert>
        )}
        {instructionBilling?.status === "BLOCKED" && (
          <Alert className="border-destructive">
            <AlertDescription>
              <div className="space-y-3">
                <p>
                  This student has {instructionBilling.outstandingHours.toFixed(1)} unpaid instructor hours. No further flight lessons can be scheduled until that debt is paid down.
                </p>
                {canOverrideDebt && !lesson && (
                  <FormField
                    control={form.control}
                    name="overrideInstructionDebt"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded border border-destructive/30 bg-background p-3">
                        <div>
                          <FormLabel>Authorize scheduling override</FormLabel>
                          <p className="text-xs text-muted-foreground">Admin authorization will be recorded with this booking.</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
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
                      Student {watchedValues.kind === "FLIGHT" && watchedValues.flightType === "RELOCATION" && "(Optional)"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {watchedValues.kind === "FLIGHT" && watchedValues.flightType === "RELOCATION" && (
                          <SelectItem value="none">No student</SelectItem>
                        )}
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

            {watchedValues.kind === "FLIGHT" && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="flightType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight Purpose</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="TRAINING">Training Flight</SelectItem>
                          <SelectItem value="RELOCATION">Relocation Flight</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedValues.flightType === "RELOCATION" && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="origin" render={({ field }) => (
                      <FormItem><FormLabel>Origin Airport</FormLabel><FormControl><Input placeholder="e.g., KINF - Inverness" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="destination" render={({ field }) => (
                      <FormItem><FormLabel>Destination Airport</FormLabel><FormControl><Input placeholder="Airport name or code" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                )}
              </div>
            )}
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
                      <TimeSelect value={field.value} onChange={field.onChange} placeholder="Select start time" />
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
                      <TimeSelect value={field.value} onChange={field.onChange} placeholder="Select end time" />
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
        {syllabusPrograms.length > 0 && (
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
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No program</SelectItem>
                        {getProgramOptions().map((program) => (
                          <SelectItem key={program.id} value={program.value}>
                            {program.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      value={field.value || "none"}
                      disabled={!watchedValues.program}
                    >
                        <FormControl>
                          <SelectTrigger>
                          <SelectValue placeholder={watchedValues.program ? "Select stage" : "Select program first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="none">No stage</SelectItem>
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
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      value={field.value || "none"}
                      disabled={!watchedValues.stage}
                    >
                        <FormControl>
                          <SelectTrigger>
                          <SelectValue placeholder={watchedValues.stage ? "Select lesson" : "Select stage first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="none">No lesson</SelectItem>
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
            disabled={loading || conflicts.length > 0 || (
              watchedValues.kind === "FLIGHT" &&
              instructionBilling?.status === "BLOCKED" &&
              !(canOverrideDebt && watchedValues.overrideInstructionDebt)
            )}
            className="bg-golden-gradient hover:bg-golden-gradient/90"
          >
            {loading ? "Scheduling..." : lesson ? "Update Lesson" : "Schedule Lesson"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
