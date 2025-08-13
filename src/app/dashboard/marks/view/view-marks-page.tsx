// src/app/dashboard/marks/view/view-marks-page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Trash2, Save, Share2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getStudentsByClass, getMarksForSubject, getExams, getClasses, getSubjects, saveMarks, deleteMark } from "@/lib/data";
import { generateWhatsappSummary } from "@/ai/flows/generate-whatsapp-summary";
import type { Student, Exam, Class, Subject, Mark, MarkWithExam } from "@/lib/data";
import { Label } from "@/components/ui/label";

interface StudentMarksRow {
  studentId: string;
  studentName: string;
  marks: { [examId: string]: { value: number | null, isDirty: boolean, examDate?: string } };
}

interface MarkToDelete {
    studentId: string;
    studentName: string;
    examId: string;
    examName: string;
}

export default function ViewMarksPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const examIdFromUrl = searchParams.get('examId');
    
    const [students, setStudents] = useState<Student[]>([]);
    const [allExams, setAllExams] = useState<Exam[]>([]);
    const [currentClass, setCurrentClass] = useState<Class | null>(null);
    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(examIdFromUrl);

    const [marksData, setMarksData] = useState<StudentMarksRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSavingTransition] = useTransition();
    const [isSharing, startShareTransition] = useTransition();
    const [markToDelete, setMarkToDelete] = useState<MarkToDelete | null>(null);

    const loadData = useCallback(async () => {
        if (!classId || !subjectId) {
            toast({ title: "Error", description: "Class ID and Subject ID are required.", variant: "destructive" });
            router.push('/dashboard/marks');
            return;
        }
        setIsLoading(true);
        try {
            const [studentsData, marksData, examsData, classesData, subjectsData] = await Promise.all([
                getStudentsByClass(classId),
                getMarksForSubject(classId, subjectId),
                getExams(),
                getClasses(),
                getSubjects(),
            ]);
            
            setStudents(studentsData);
            setAllExams(examsData.sort((a,b) => a.name.localeCompare(b.name)));
            setCurrentClass(classesData.find(c => c.id === classId) || null);
            setCurrentSubject(subjectsData.find(s => s.id === subjectId) || null);
            
            if(examIdFromUrl) setSelectedExamId(examIdFromUrl);

            const formattedMarks = studentsData.map(student => {
                const studentMarks: { [examId: string]: { value: number | null, isDirty: boolean, examDate?: string } } = {};
                examsData.forEach(exam => {
                    const mark = marksData.find(m => m.studentId === student.id && m.examId === exam.id);
                    studentMarks[exam.id] = { value: mark?.marks ?? null, isDirty: false, examDate: mark?.examDate };
                });
                return {
                    studentId: student.id,
                    studentName: student.name,
                    marks: studentMarks,
                };
            });
            setMarksData(formattedMarks);

        } catch (error) {
            console.error("Error loading marks data:", error);
            toast({ title: "Error", description: "Failed to load marks data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [classId, subjectId, toast, examIdFromUrl, router]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const examsInView = useMemo(() => {
      if (selectedExamId) {
        return allExams.filter(e => e.id === selectedExamId);
      }
      return allExams;
    }, [allExams, selectedExamId]);

    const handleMarksChange = (studentId: string, examId: string, value: string) => {
        const newMarksValue = value === '' ? null : parseInt(value, 10);
        const exam = allExams.find(e => e.id === examId);
        if (!exam) return;

        const clampedMarks = newMarksValue === null ? null : Math.max(0, Math.min(exam.totalMarks, newMarksValue));

        setMarksData(prevData =>
            prevData.map(row =>
                row.studentId === studentId
                    ? {
                        ...row,
                        marks: {
                            ...row.marks,
                            [examId]: { ...row.marks[examId], value: clampedMarks, isDirty: true },
                        },
                      }
                    : row
            )
        );
    };
    
    const handleSave = () => {
        startSavingTransition(async () => {
            if (!classId || !subjectId) return;

            const savePromises = examsInView.map(async (exam) => {
                const dirtyMarksForExam: Mark[] = marksData
                    .filter(row => row.marks[exam.id]?.isDirty && row.marks[exam.id].value !== null)
                    .map(row => {
                        const marksValue = row.marks[exam.id].value!;
                        const passingMarks = exam.totalMarks * 0.4;
                        return {
                            studentId: row.studentId,
                            studentName: row.studentName,
                            marks: marksValue,
                            status: marksValue >= passingMarks ? 'Pass' : 'Fail',
                        };
                    });
                
                if (dirtyMarksForExam.length > 0) {
                    const examDate = marksData
                        .map(row => row.marks[exam.id]?.examDate)
                        .find(d => d);

                    return saveMarks({
                        classId,
                        subjectId,
                        examId: exam.id,
                        marks: dirtyMarksForExam,
                        examDate: examDate
                    });
                }
                return Promise.resolve({ success: true, message: "No changes to save for this exam." });
            });
            
            try {
                const results = await Promise.all(savePromises);
                const failedSaves = results.filter(r => !r.success);
                if (failedSaves.length > 0) {
                    throw new Error("Some marks failed to save.");
                }
                toast({ title: "Success!", description: "All changes have been saved." });
                // Reset dirty state
                setMarksData(prev => prev.map(row => ({
                    ...row,
                    marks: Object.fromEntries(Object.entries(row.marks).map(([examId, mark]) => [examId, { ...mark, isDirty: false}]))
                })));
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "Could not save all marks.", variant: "destructive" });
            }
        });
    }
    
    const handleDeleteClick = (studentId: string, studentName: string, examId: string, examName: string) => {
        setMarkToDelete({ studentId, studentName, examId, examName });
    }

    const confirmDelete = async () => {
        if (!markToDelete || !classId || !subjectId) return;

        startSavingTransition(async () => {
            const { studentId, examId } = markToDelete;
            const result = await deleteMark(classId, subjectId, examId, studentId);
            if (result.success) {
                toast({ title: "Success!", description: `Mark for ${markToDelete.studentName} in ${markToDelete.examName} deleted.` });
                setMarkToDelete(null);
                // Just update the local state to reflect deletion
                 setMarksData(prevData =>
                    prevData.map(row =>
                        row.studentId === studentId
                            ? { ...row, marks: { ...row.marks, [examId]: { ...row.marks[examId], value: null, isDirty: false } } }
                            : row
                    )
                );
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const handleShare = () => {
    startShareTransition(async () => {
      if (!classId || !subjectId || !selectedExamId) {
        toast({ title: "Selection missing", description: "Please select a class, subject, and exam.", variant: "destructive" });
        return;
      }
      const selectedExam = allExams.find(e => e.id === selectedExamId);
      if(!selectedExam) return;

      const className = currentClass?.name || '';
      const subjectName = currentSubject?.name || '';
      
      const studentsForApi = marksData
        .map(s => ({ 
            name: s.studentName, 
            marks: s.marks[selectedExamId]?.value
        }))
        .filter(s => s.marks !== null && s.marks !== undefined) as { name: string, marks: number }[];
        
      if (studentsForApi.length === 0) {
        toast({ title: "No marks entered", description: "Please enter marks for at least one student to share.", variant: "destructive" });
        return;
      }

      try {
        const result = await generateWhatsappSummary({
          className,
          subjectName: `${subjectName} (${selectedExam.name})`,
          students: studentsForApi,
          totalMarks: selectedExam.totalMarks,
        });
        const encodedMessage = encodeURIComponent(result.message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
      } catch (error) {
        console.error("Error generating summary:", error);
        toast({ title: "Error", description: "Could not generate WhatsApp summary.", variant: "destructive" });
      }
    });
  };
    
    const areMarksDirty = useMemo(() => marksData.some(row => Object.values(row.marks).some(mark => mark.isDirty)), [marksData]);

    if (isLoading) {
        return (
          <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        );
    }
    
    return (
        <main className="flex justify-center items-start min-h-screen bg-background p-4 sm:p-6 md:p-10">
             <Card className="w-full max-w-7xl shadow-xl">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/marks">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft />
                            </Button>
                        </Link>
                        <div>
                        <CardTitle>View Marks: {currentSubject?.name}</CardTitle>
                        <CardDescription>
                            Viewing marks for Class: {currentClass?.name}. You can edit, delete, or share entries here.
                        </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 py-4 border-b mb-6">
                        <div className="flex-grow">
                            <Label>Filter by Exam</Label>
                            <Select value={selectedExamId ?? "all"} onValueChange={(val) => setSelectedExamId(val === 'all' ? null : val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Exam" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Exams</SelectItem>
                                    {allExams.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block border rounded-lg overflow-auto">
                        <Table className="whitespace-nowrap">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background z-10">Student Name</TableHead>
                                    {examsInView.map(exam => (
                                        <TableHead key={exam.id} className="text-center">
                                          {exam.name} ({exam.totalMarks})
                                          {marksData[0]?.marks[exam.id]?.examDate && <div className="text-xs font-normal text-muted-foreground">{format(new Date(marksData[0]?.marks[exam.id]?.examDate!), "dd MMM yyyy")}</div>}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {marksData.length > 0 ? marksData.map(row => (
                                    <TableRow key={row.studentId}>
                                        <TableCell className="font-medium sticky left-0 bg-background z-10">{row.studentName}</TableCell>
                                        {examsInView.map(exam => (
                                            <TableCell key={exam.id} className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Input
                                                        type="number"
                                                        className="max-w-[100px]"
                                                        placeholder="-"
                                                        value={row.marks[exam.id]?.value ?? ''}
                                                        onChange={(e) => handleMarksChange(row.studentId, exam.id, e.target.value)}
                                                        max={exam.totalMarks}
                                                    />
                                                    {row.marks[exam.id]?.value !== null && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-destructive" 
                                                            onClick={() => handleDeleteClick(row.studentId, row.studentName, exam.id, exam.name)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={examsInView.length + 1} className="h-24 text-center">
                                            No marks found for this subject.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                         {marksData.length > 0 ? marksData.map(row => (
                            <Card key={row.studentId} className="p-4">
                                <CardTitle className="text-lg mb-4">{row.studentName}</CardTitle>
                                <CardContent className="p-0 space-y-4">
                                    {examsInView.map(exam => (
                                        <div key={exam.id} className="flex items-end justify-between gap-4">
                                            <div className="flex-grow">
                                                <Label htmlFor={`${row.studentId}-${exam.id}`}>
                                                    {exam.name}
                                                    <span className="text-xs text-muted-foreground"> ({exam.totalMarks} marks)</span>
                                                     {row.marks[exam.id]?.examDate && <span className="text-xs text-muted-foreground ml-2">({format(new Date(row.marks[exam.id]?.examDate!), "dd MMM")})</span>}
                                                </Label>
                                                <Input
                                                    id={`${row.studentId}-${exam.id}`}
                                                    type="number"
                                                    placeholder="-"
                                                    className="mt-1"
                                                    value={row.marks[exam.id]?.value ?? ''}
                                                    onChange={(e) => handleMarksChange(row.studentId, exam.id, e.target.value)}
                                                    max={exam.totalMarks}
                                                />
                                            </div>
                                            {row.marks[exam.id]?.value !== null && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-destructive shrink-0"
                                                    onClick={() => handleDeleteClick(row.studentId, row.studentName, exam.id, exam.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete</span>
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )) : (
                           <div className="text-center h-48 flex items-center justify-center text-muted-foreground px-4">
                                No marks found for this subject.
                           </div>
                        )}
                    </div>

                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 p-6 bg-muted/20 border-t">
                    <Button size="lg" onClick={handleSave} disabled={isSaving || !areMarksDirty}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                        Save Changes
                    </Button>
                     <Button size="lg" variant="outline" onClick={handleShare} disabled={isSharing || !selectedExamId}>
                        {isSharing ? <Loader2 className="animate-spin" /> : <Share2 />}
                        <span>Share on WhatsApp</span>
                    </Button>
                </CardFooter>
             </Card>

            <AlertDialog open={!!markToDelete} onOpenChange={(isOpen) => !isOpen && setMarkToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the mark for <strong>{markToDelete?.studentName}</strong> in the <strong>{markToDelete?.examName}</strong> exam. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : "Delete Mark"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </main>
    );
}
