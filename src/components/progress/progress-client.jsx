'use client'

import { useState, useEffect } from 'react';
import { syllabusAPI, usersAPI } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { MiniStat } from '@/components/ui/panels';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  GraduationCap, CheckCircle2, Circle, Award, 
  Clock, TrendingUp, BookOpen, User, RotateCcw, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { formatET } from '@/lib/format-tz';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StageCheckModal } from '@/components/progress/stage-check-modal';
import { cn } from '@/lib/utils';

export function ProgressClient() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [isStageCheckModalOpen, setIsStageCheckModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [processingLessonId, setProcessingLessonId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchProgress(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'STUDENT') {
        // Students see their own progress
        setSelectedStudentId(user.id);
      } else if (user?.role === 'INSTRUCTOR') {
        const studentsRes = await usersAPI.getMyStudents();
        const studentList = studentsRes.data || [];
        setStudents(studentList);
        if (studentList.length > 0) {
          setSelectedStudentId(studentList[0].id);
        }
      } else if (user?.role === 'ADMIN') {
        const studentsRes = await usersAPI.getStudents();
        const studentList = studentsRes.data || [];
        setStudents(studentList);
        
        if (studentList.length > 0) {
          setSelectedStudentId(studentList[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to load data');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async (studentId) => {
    try {
      setLoading(true);
      const response = await syllabusAPI.getProgress(studentId);
      setProgressData(response.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleStageCheck = (stage) => {
    setSelectedStage(stage);
    setIsStageCheckModalOpen(true);
  };

  const handleStageCheckSubmit = async (data) => {
    try {
      await syllabusAPI.createStageCheck({
        ...data,
        student_id: selectedStudentId,
        stage_id: selectedStage.id
      });
      toast.success('Stage check recorded successfully');
      setIsStageCheckModalOpen(false);
      fetchProgress(selectedStudentId);
    } catch (error) {
      console.error('Error creating stage check:', error);
      toast.error('Failed to record stage check');
    }
  };

  const handleMarkLessonComplete = async (lesson) => {
    if (!selectedStudentId) return;

    try {
      setProcessingLessonId(lesson.id);
      await syllabusAPI.markLessonComplete(
        selectedStudentId,
        lesson.id,
        'Prior experience credit'
      );
      toast.success('Lesson marked complete');
      await fetchProgress(selectedStudentId);
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Failed to mark lesson complete');
    } finally {
      setProcessingLessonId(null);
    }
  };

  const handleRemoveLessonCredit = async (lesson) => {
    if (!selectedStudentId) return;

    try {
      setProcessingLessonId(lesson.id);
      await syllabusAPI.unmarkLessonComplete(selectedStudentId, lesson.id);
      toast.success('Prior experience credit removed');
      await fetchProgress(selectedStudentId);
    } catch (error) {
      console.error('Error removing lesson credit:', error);
      toast.error('Failed to remove lesson credit');
    } finally {
      setProcessingLessonId(null);
    }
  };

  const getSelectedStudent = () => {
    if (user?.role === 'STUDENT') return user;
    return students.find(s => s.id === selectedStudentId);
  };

  const selectedStudent = getSelectedStudent();
  const canCreditLessons = user?.role === 'ADMIN' || user?.isLeadInstructor;

  const isStaff = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const viewingSelf = user?.role === 'STUDENT';

  if (loading && !progressData) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Card className="gap-0 py-0">
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-red-500/12">
              <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Could not load progress</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchInitialData} className="mt-2">Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  // A staff member with no students is a different situation from a missing syllabus.
  if (isStaff && students.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyState
          icon={User}
          title="No students to show"
          description={user?.role === 'INSTRUCTOR'
            ? "No students are assigned to you yet. An administrator can assign students to your roster."
            : "No student accounts exist yet. Create one from the Users page to track training progress."}
        />
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyState
          icon={GraduationCap}
          title="No active syllabus"
          description="No active training program is set. An administrator can activate one from the Syllabus page."
        />
      </div>
    );
  }
  const { syllabus, stages, overallProgress, totalLessons, totalCompleted } = progressData;

  const stagesComplete = stages.filter((s) => s.progress === 100).length;
  const stageChecksPassed = stages.filter((s) => s.stageCheck?.status === 'APPROVED').length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {viewingSelf ? 'My Training Progress' : 'Student Progress'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {viewingSelf
            ? 'Your syllabus completion, stage checks, and lesson history.'
            : 'Track syllabus completion and record stage checks for your students.'}
        </p>
      </header>

      {isStaff && (
        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <User className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-56 flex-1">
              <Label htmlFor="progress-student" className="text-xs text-muted-foreground">
                Viewing progress for
              </Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger id="progress-student" className="mt-1 w-full max-w-sm">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {students.length} student{students.length === 1 ? '' : 's'}
            </p>
          </div>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="size-4 text-muted-foreground" />
            Overall progress
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {selectedStudent?.name} · {syllabus.name} {syllabus.version}
          </p>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <div className="mb-2 flex items-end justify-between gap-3">
              <span className="text-sm font-medium">Training completion</span>
              <span className="text-3xl font-bold tabular-nums">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Lessons completed" value={totalCompleted} tone="success" />
            <MiniStat label="Lessons remaining" value={totalLessons - totalCompleted} />
            <MiniStat label="Stages complete" value={`${stagesComplete} of ${stages.length}`} />
            <MiniStat label="Stage checks passed" value={`${stageChecksPassed} of ${stages.length}`} tone={stageChecksPassed > 0 ? 'gold' : 'neutral'} />
          </div>
        </div>
      </Card>
      {/* Stages */}
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const stageDone = stage.progress === 100;
          const approved = stage.stageCheck?.status === 'APPROVED';
          return (
          <Card key={stage.id} className={cn(approved && "border-emerald-500/40")}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
                    stageDone
                      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <CardTitle>{stage.title}</CardTitle>
                    <CardDescription className="mt-1">{stage.description}</CardDescription>
                  </div>
                </div>
                {stage.stageCheck && (
                  <span className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                    approved
                      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/12 text-amber-700 dark:text-amber-400",
                  )}>
                    <Award className="size-3.5" />
                    {stage.stageCheck.status}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stage Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Stage Progress</span>
                  <span className="text-sm font-semibold">{stage.progress}%</span>
                </div>
                <Progress value={stage.progress} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {stage.completedCount} of {stage.totalCount} lessons completed
                </div>
              </div>

              {/* Lessons */}
              <div className="space-y-2">
                {stage.lessons.map(lesson => (
                  <div 
                    key={lesson.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                      lesson.completed ? "border-emerald-500/30 bg-emerald-500/5" : "bg-card",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {lesson.completed ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium">{lesson.title}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                          <BookOpen className="h-3 w-3" />
                          {lesson.kind}
                          {lesson.scheduledCompletedCount > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              • Completed {lesson.completedCount}x
                            </span>
                          )}
                          {lesson.completionSource === 'CREDIT' && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Prior experience credit
                            </span>
                          )}
                          {lesson.completionSource === 'MIXED' && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Includes prior experience credit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canCreditLessons && (
                      <div className="flex shrink-0 items-center gap-2">
                        {!lesson.completed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkLessonComplete(lesson)}
                            disabled={processingLessonId === lesson.id}
                          >
                            Mark complete
                          </Button>
                        )}
                        {lesson.completionSource === 'CREDIT' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveLessonCredit(lesson)}
                            disabled={processingLessonId === lesson.id}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Remove credit
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Stage Check Info/Button */}
              {stage.stageCheck ? (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <Award className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold">
                        Stage Check {stage.stageCheck.status}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        By {stage.stageCheck.checker_name} on{' '}
                        {formatET(stage.stageCheck.checked_at, 'MMM d, yyyy')}
                      </div>
                      {stage.stageCheck.notes && (
                        <div className="text-sm mt-2 p-2 bg-background rounded">
                          {stage.stageCheck.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {stageDone && (user?.role === 'ADMIN' || user?.isLeadInstructor) && (
                    <Button 
                      onClick={() => handleStageCheck(stage)}
                      className="w-full"
                      variant="default"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Perform Stage Check
                    </Button>
                  )}
                  {stageDone && user?.role === 'STUDENT' && (
                    <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                      <Clock className="h-5 w-5 mx-auto mb-2" />
                      Stage complete! Awaiting lead instructor stage check.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Stage Check Modal */}
      {selectedStage && (
        <StageCheckModal
          isOpen={isStageCheckModalOpen}
          onClose={() => setIsStageCheckModalOpen(false)}
          onSubmit={handleStageCheckSubmit}
          stage={selectedStage}
          studentName={selectedStudent?.name}
        />
      )}
    </div>
  );
}
