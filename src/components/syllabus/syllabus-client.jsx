'use client'

import { useState, useEffect, useCallback } from 'react';
import { syllabusAPI } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  BookOpen, Plus, Trash2, Edit, ChevronDown, ChevronRight,
  GraduationCap, Plane, FileText, ArrowUp, ArrowDown, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SyllabusClient() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programDetail, setProgramDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [programDialog, setProgramDialog] = useState({ open: false, editing: null });
  const [stageDialog, setStageDialog] = useState({ open: false, editing: null });
  const [lessonDialog, setLessonDialog] = useState({ open: false, stageId: null, editing: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, id: null, name: '' });

  const [expandedStages, setExpandedStages] = useState({});

  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR';

  const loadPrograms = useCallback(async () => {
    try {
      const res = await syllabusAPI.list();
      setPrograms(res.data);
    } catch {
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProgramDetail = useCallback(async (id) => {
    try {
      setDetailLoading(true);
      const res = await syllabusAPI.get(id);
      setProgramDetail(res.data);
      const expanded = {};
      (res.data.stages || []).forEach(s => { expanded[s.id] = true; });
      setExpandedStages(expanded);
    } catch {
      toast.error('Failed to load program details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  useEffect(() => {
    if (selectedProgram) loadProgramDetail(selectedProgram);
    else setProgramDetail(null);
  }, [selectedProgram, loadProgramDetail]);

  const toggleStage = (stageId) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  // ---- Program CRUD ----
  const handleSaveProgram = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const name = form.get('name')?.toString().trim();
    const version = form.get('version')?.toString().trim() || 'v1';
    if (!name) return;

    try {
      if (programDialog.editing) {
        await syllabusAPI.update(programDialog.editing.id, { name, version });
        toast.success('Program updated');
      } else {
        const res = await syllabusAPI.create({ name, version });
        setSelectedProgram(res.data.id);
        toast.success('Program created');
      }
      setProgramDialog({ open: false, editing: null });
      loadPrograms();
      if (selectedProgram) loadProgramDetail(selectedProgram);
    } catch {
      toast.error('Failed to save program');
    }
  };

  // ---- Stage CRUD ----
  const handleSaveStage = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const title = form.get('title')?.toString().trim();
    const description = form.get('description')?.toString().trim() || '';
    if (!title) return;

    try {
      if (stageDialog.editing) {
        await syllabusAPI.updateStage(stageDialog.editing.id, { title, description });
        toast.success('Phase updated');
      } else {
        const maxOrd = (programDetail?.stages || []).reduce((m, s) => Math.max(m, s.ord), 0);
        await syllabusAPI.addStage(selectedProgram, { title, description, ord: maxOrd + 1 });
        toast.success('Phase added');
      }
      setStageDialog({ open: false, editing: null });
      loadProgramDetail(selectedProgram);
    } catch {
      toast.error('Failed to save phase');
    }
  };

  // ---- Lesson CRUD ----
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const title = form.get('title')?.toString().trim();
    const kind = form.get('kind')?.toString() || 'FLIGHT';
    if (!title) return;

    try {
      if (lessonDialog.editing) {
        await syllabusAPI.updateLesson(lessonDialog.editing.id, { title, kind });
        toast.success('Lesson updated');
      } else {
        const stage = (programDetail?.stages || []).find(s => s.id === lessonDialog.stageId);
        const stageLessons = (programDetail?.lessons || []).filter(l => l.stage_id === lessonDialog.stageId);
        const maxOrd = stageLessons.reduce((m, l) => Math.max(m, l.ord), 0);
        await syllabusAPI.addLesson(lessonDialog.stageId, { title, kind, ord: maxOrd + 1 });
        toast.success('Lesson added');
      }
      setLessonDialog({ open: false, stageId: null, editing: null });
      loadProgramDetail(selectedProgram);
    } catch {
      toast.error('Failed to save lesson');
    }
  };

  // ---- Delete ----
  const handleDelete = async () => {
    const { type, id } = deleteDialog;
    try {
      if (type === 'program') {
        await syllabusAPI.remove(id);
        setSelectedProgram(null);
        loadPrograms();
        toast.success('Program deleted');
      } else if (type === 'stage') {
        await syllabusAPI.deleteStage(id);
        loadProgramDetail(selectedProgram);
        toast.success('Phase deleted');
      } else if (type === 'lesson') {
        await syllabusAPI.deleteLesson(id);
        loadProgramDetail(selectedProgram);
        toast.success('Lesson deleted');
      }
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteDialog({ open: false, type: null, id: null, name: '' });
    }
  };

  // ---- Reorder ----
  const moveStage = async (stageId, direction) => {
    const stages = [...(programDetail?.stages || [])].sort((a, b) => a.ord - b.ord);
    const idx = stages.findIndex(s => s.id === stageId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stages.length) return;
    try {
      await syllabusAPI.updateStage(stages[idx].id, { ord: stages[swapIdx].ord });
      await syllabusAPI.updateStage(stages[swapIdx].id, { ord: stages[idx].ord });
      loadProgramDetail(selectedProgram);
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const moveLesson = async (lessonId, stageId, direction) => {
    const stageLessons = (programDetail?.lessons || [])
      .filter(l => l.stage_id === stageId)
      .sort((a, b) => a.ord - b.ord);
    const idx = stageLessons.findIndex(l => l.id === lessonId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stageLessons.length) return;
    try {
      await syllabusAPI.updateLesson(stageLessons[idx].id, { ord: stageLessons[swapIdx].ord });
      await syllabusAPI.updateLesson(stageLessons[swapIdx].id, { ord: stageLessons[idx].ord });
      loadProgramDetail(selectedProgram);
    } catch {
      toast.error('Failed to reorder');
    }
  };

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Syllabus Management</h1>
          <p className="text-muted-foreground">Manage training programs, phases, and lessons</p>
        </div>
        {canManage && (
          <Button onClick={() => setProgramDialog({ open: true, editing: null })}>
            <Plus className="mr-2 h-4 w-4" /> New Program
          </Button>
        )}
      </div>

      {/* Program list */}
      {programs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No programs yet"
          description="Create your first training program to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(p => {
            const isSelected = selectedProgram === p.id;
            return (
              <Card
                key={p.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-blue-500"
                )}
                onClick={() => setSelectedProgram(isSelected ? null : p.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{p.version}</Badge>
                  </div>
                </CardHeader>
                {canManage && (
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setProgramDialog({ open: true, editing: p }); }}
                      >
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, type: 'program', id: p.id, name: p.name }); }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Program detail */}
      {selectedProgram && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {programDetail?.name || 'Loading...'} — Phases & Lessons
                </CardTitle>
                <CardDescription>
                  {programDetail ? `${programDetail.stages?.length || 0} phases` : ''}
                </CardDescription>
              </div>
              {canManage && (
                <Button
                  variant="outline"
                  onClick={() => setStageDialog({ open: true, editing: null })}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Phase
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (programDetail?.stages || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No phases yet. Add a phase to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(programDetail?.stages || [])
                  .sort((a, b) => a.ord - b.ord)
                  .map((stage, stageIdx, stagesArr) => {
                    const stageLessons = (programDetail?.lessons || [])
                      .filter(l => l.stage_id === stage.id)
                      .sort((a, b) => a.ord - b.ord);
                    const isExpanded = expandedStages[stage.id];

                    return (
                      <div key={stage.id} className="border rounded-lg overflow-hidden">
                        {/* Stage header */}
                        <div
                          className="flex items-center gap-3 p-4 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => toggleStage(stage.id)}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 shrink-0" />
                            : <ChevronRight className="h-4 w-4 shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Phase {stage.ord}</span>
                              <span className="text-muted-foreground">—</span>
                              <span className="font-medium truncate">{stage.title}</span>
                            </div>
                            {stage.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 truncate">{stage.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {stageLessons.length} lesson{stageLessons.length !== 1 ? 's' : ''}
                          </Badge>
                          {canManage && (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                disabled={stageIdx === 0}
                                onClick={() => moveStage(stage.id, 'up')}>
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                disabled={stageIdx === stagesArr.length - 1}
                                onClick={() => moveStage(stage.id, 'down')}>
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => setStageDialog({ open: true, editing: stage })}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, type: 'stage', id: stage.id, name: stage.title })}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Lessons list */}
                        {isExpanded && (
                          <div className="border-t">
                            {stageLessons.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No lessons in this phase yet.
                              </div>
                            ) : (
                              <div className="divide-y">
                                {stageLessons.map((lesson, lessonIdx) => (
                                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                      {lesson.kind === 'FLIGHT'
                                        ? <Plane className="h-4 w-4 text-purple-600" />
                                        : <FileText className="h-4 w-4 text-orange-600" />
                                      }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{lesson.title}</p>
                                    </div>
                                    <Badge variant={lesson.kind === 'FLIGHT' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                                      {lesson.kind}
                                    </Badge>
                                    {canManage && (
                                      <div className="flex items-center gap-1">
                                        <Button size="icon" variant="ghost" className="h-7 w-7"
                                          disabled={lessonIdx === 0}
                                          onClick={() => moveLesson(lesson.id, stage.id, 'up')}>
                                          <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7"
                                          disabled={lessonIdx === stageLessons.length - 1}
                                          onClick={() => moveLesson(lesson.id, stage.id, 'down')}>
                                          <ArrowDown className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7"
                                          onClick={() => setLessonDialog({ open: true, stageId: stage.id, editing: lesson })}>
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                                          onClick={() => setDeleteDialog({ open: true, type: 'lesson', id: lesson.id, name: lesson.title })}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {canManage && (
                              <div className="p-3 border-t bg-muted/20">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => setLessonDialog({ open: true, stageId: stage.id, editing: null })}
                                >
                                  <Plus className="mr-2 h-3 w-3" /> Add Lesson
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Dialogs ---- */}

      {/* Program Dialog */}
      <Dialog open={programDialog.open} onOpenChange={(open) => !open && setProgramDialog({ open: false, editing: null })}>
        <DialogContent>
          <form onSubmit={handleSaveProgram}>
            <DialogHeader>
              <DialogTitle>{programDialog.editing ? 'Edit Program' : 'New Program'}</DialogTitle>
              <DialogDescription>
                {programDialog.editing ? 'Update the training program details.' : 'Create a new training program (e.g., Private Pilot, Instrument, Commercial).'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="prog-name">Program Name</Label>
                <Input
                  id="prog-name"
                  name="name"
                  placeholder="e.g., Private Pilot"
                  defaultValue={programDialog.editing?.name || ''}
                  required
                />
              </div>
              <div>
                <Label htmlFor="prog-version">Version</Label>
                <Input
                  id="prog-version"
                  name="version"
                  placeholder="v1"
                  defaultValue={programDialog.editing?.version || 'v1'}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProgramDialog({ open: false, editing: null })}>Cancel</Button>
              <Button type="submit">{programDialog.editing ? 'Save Changes' : 'Create Program'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stage Dialog */}
      <Dialog open={stageDialog.open} onOpenChange={(open) => !open && setStageDialog({ open: false, editing: null })}>
        <DialogContent>
          <form onSubmit={handleSaveStage}>
            <DialogHeader>
              <DialogTitle>{stageDialog.editing ? 'Edit Phase' : 'Add Phase'}</DialogTitle>
              <DialogDescription>
                {stageDialog.editing ? 'Update phase details.' : 'Add a new training phase to this program.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="stage-title">Phase Title</Label>
                <Input
                  id="stage-title"
                  name="title"
                  placeholder="e.g., PRE-SOLO (Aircraft Control & Fundamentals)"
                  defaultValue={stageDialog.editing?.title || ''}
                  required
                />
              </div>
              <div>
                <Label htmlFor="stage-desc">Description / Objective</Label>
                <Textarea
                  id="stage-desc"
                  name="description"
                  placeholder="e.g., Develop safe aircraft control, basic maneuvers, pattern work, and solo readiness."
                  defaultValue={stageDialog.editing?.description || ''}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStageDialog({ open: false, editing: null })}>Cancel</Button>
              <Button type="submit">{stageDialog.editing ? 'Save Changes' : 'Add Phase'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialog.open} onOpenChange={(open) => !open && setLessonDialog({ open: false, stageId: null, editing: null })}>
        <DialogContent>
          <form onSubmit={handleSaveLesson}>
            <DialogHeader>
              <DialogTitle>{lessonDialog.editing ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
              <DialogDescription>
                {lessonDialog.editing ? 'Update lesson details.' : 'Add a new lesson to this phase.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="lesson-title">Lesson Title</Label>
                <Input
                  id="lesson-title"
                  name="title"
                  placeholder="e.g., Intro Flight / Cockpit Familiarization"
                  defaultValue={lessonDialog.editing?.title || ''}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lesson-kind">Type</Label>
                <select
                  id="lesson-kind"
                  name="kind"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  defaultValue={lessonDialog.editing?.kind || 'FLIGHT'}
                >
                  <option value="FLIGHT">Flight</option>
                  <option value="GROUND">Ground</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLessonDialog({ open: false, stageId: null, editing: null })}>Cancel</Button>
              <Button type="submit">{lessonDialog.editing ? 'Save Changes' : 'Add Lesson'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, id: null, name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.name}</strong>?
              {deleteDialog.type === 'program' && ' This will delete all phases and lessons within it.'}
              {deleteDialog.type === 'stage' && ' This will also delete all lessons within this phase.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
