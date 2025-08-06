// src/app/dashboard/marks/view/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Trash2, Save } from "lucide-react";
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
import type { Student, Exam, Class, Subject, Mark } from "@/lib/data";

interface StudentMarksRow {
  studentId: string;
  studentName: string;
  marks: { [examId: string]: { value: number | null, isDirty: boolean } };
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
    
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [currentClass, setCurrentClass] = useState<Class | null>(null);
    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

    const [marksData, setMarksData] = useState<StudentMarksRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSavingTransition] = useTransition();
    const [markToDelete, setMarkToDelete] = useState<MarkToDelete | null>(null);

    const loadData = useCallback(async () => {
        if (!classId || !subjectId) {
            toast({ title: "Error", description: "Class ID and Subject ID are required.", variant: "destructive" });
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
            setExams(examsData.sort((a,b) => a.name.localeCompare(b.name)));
            setCurrentClass(classesData.find(c => c.id === classId) || null);
            setCurrentSubject(subjectsData.find(s => s.id === subjectId) || null);

            const formattedMarks = studentsData.map(student => {
                const studentMarks: { [examId: string]: { value: number | null, isDirty: boolean } } = {};
                examsData.forEach(exam => {
                    const mark = marksData.find(m => m.studentId === student.id && m.examId === exam.id);
                    studentMarks[exam.id] = { value: mark?.marks ?? null, isDirty: false };
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
    }, [classId, subjectId, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleMarksChange = (studentId: string, examId: string, value: string) => {
        const newMarksValue = value === '' ? null : parseInt(value, 10);
        const exam = exams.find(e => e.id === examId);
        if (!exam) return;

        const clampedMarks = newMarksValue === null ? null : Math.max(0, Math.min(exam.totalMarks, newMarksValue));

        setMarksData(prevData =>
            prevData.map(row =>
                row.studentId === studentId
                    ? {
                        ...row,
                        marks: {
                            ...row.marks,
                            [examId]: { value: clampedMarks, isDirty: true },
                        },
                      }
                    : row
            )
        );
    };
    
    const handleSave = () => {
        startSavingTransition(async () => {
            if (!classId || !subjectId) return;

            const savePromises = exams.map(async (exam) => {
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
                    return saveMarks({
                        classId,
                        subjectId,
                        examId: exam.id,
                        marks: dirtyMarksForExam,
                    });
                }
                return Promise.resolve({ success: true });
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
                            ? { ...row, marks: { ...row.marks, [examId]: { value: null, isDirty: false } } }
                            : row
                    )
                );
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    }

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
                            Viewing all marks for Class: {currentClass?.name}. You can edit or delete entries here.
                        </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-auto">
                        <Table className="whitespace-nowrap">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background z-10">Student Name</TableHead>
                                    {exams.map(exam => (
                                        <TableHead key={exam.id} className="text-center">
                                          {exam.name} ({exam.totalMarks})
                                          {exam.date && <div className="text-xs font-normal text-muted-foreground">{format(new Date(exam.date), "dd MMM yyyy")}</div>}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {marksData.map(row => (
                                    <TableRow key={row.studentId}>
                                        <TableCell className="font-medium sticky left-0 bg-background z-10">{row.studentName}</TableCell>
                                        {exams.map(exam => (
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
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/20 border-t">
                    <Button size="lg" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                        Save All Changes
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
