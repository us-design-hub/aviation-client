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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  GraduationCap, CheckCircle2, Circle, Award, 
  Clock, TrendingUp, BookOpen, User
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StageCheckModal } from '@/components/progress/stage-check-modal';

export function ProgressClient() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [isStageCheckModalOpen, setIsStageCheckModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);

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
      } else if (user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') {
        // Instructors and admins can select students
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

  const getSelectedStudent = () => {
    if (user?.role === 'STUDENT') return user;
    return students.find(s => s.id === selectedStudentId);
  };

  const selectedStudent = getSelectedStudent();

  if (loading && !progressData) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchInitialData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="p-6">
        <EmptyState
          icon={GraduationCap}
          title="No Progress Data"
          description="No active syllabus found. Please contact your administrator."
        />
      </div>
    );
  }

  const { syllabus, stages, overallProgress, totalLessons, totalCompleted } = progressData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Student Progress
          </h1>
          <p className="text-muted-foreground mt-1">
            Track training progress and stage completions
          </p>
        </div>
      </div>

      {/* Student Selector (for instructors/admins) */}
      {(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && students.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-[300px]">
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
          </CardContent>
        </Card>
      )}

      {/* Overall Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Progress
          </CardTitle>
          <CardDescription>
            {selectedStudent?.name} • {syllabus.name} {syllabus.version}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Training Completion</span>
              <span className="text-2xl font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalLessons - totalCompleted}</div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stages.length}</div>
              <div className="text-xs text-muted-foreground">Stages</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stages */}
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <Card key={stage.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline">Stage {index + 1}</Badge>
                    {stage.title}
                  </CardTitle>
                  <CardDescription className="mt-2">{stage.description}</CardDescription>
                </div>
                {stage.stageCheck && (
                  <Badge 
                    variant={stage.stageCheck.status === 'APPROVED' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    <Award className="h-3 w-3" />
                    {stage.stageCheck.status}
                  </Badge>
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
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {lesson.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{lesson.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <BookOpen className="h-3 w-3" />
                          {lesson.kind}
                          {lesson.completed && lesson.completedCount > 0 && (
                            <span className="text-green-600">
                              • Completed {lesson.completedCount}x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
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
                        {format(new Date(stage.stageCheck.checked_at), 'MMM d, yyyy')}
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
                  {stage.progress === 100 && (user?.role === 'ADMIN' || user?.isLeadInstructor) && (
                    <Button 
                      onClick={() => handleStageCheck(stage)}
                      className="w-full"
                      variant="default"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Perform Stage Check
                    </Button>
                  )}
                  {stage.progress === 100 && user?.role === 'STUDENT' && (
                    <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                      <Clock className="h-5 w-5 mx-auto mb-2" />
                      Stage complete! Awaiting lead instructor stage check.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
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

