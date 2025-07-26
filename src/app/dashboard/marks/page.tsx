
// src/app/dashboard/marks/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useCallback } from "react";
import { CheckCircle2, XCircle, Loader2, Save, Share2, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { generateWhatsappSummary } from "@/ai/flows/generate-whatsapp-summary";
import type { Class, Subject, Student } from "@/lib/data";
import { getClasses, getSubjects, getStudentsByClass, getStudentMarks } from "@/lib/data";
import { saveMarks } from "@/app/actions";

type StudentWithMarks = Student & {
  marks: number | null;
  status: 'Pass' | 'Fail' | 'Pending';
};

const PASS_THRESHOLD = 40;

export default function MarkSharePage() {
  const { toast } = useToast();
  const [isSaving, startSaveTransition] = useTransition();
  const [isSharing, startShareTransition] = useTransition();

  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [studentsWithMarks, setStudentsWithMarks] = useState<StudentWithMarks[]>([]);
  
  const [isLoading, setIsLoading] = useState({
    page: true,
    students: false,
  });

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  
  useEffect(() => {
    async function loadInitialData() {
        setIsLoading(prev => ({ ...prev, page: true }));
        try {
            const [classesData, subjectsData] = await Promise.all([getClasses(), getSubjects()]);
            setAllClasses(classesData);
            setAllSubjects(subjectsData);
        } catch (error) {
            toast({ title: "Error", description: "Failed to load class and subject data.", variant: "destructive" });
        } finally {
            setIsLoading(prev => ({ ...prev, page: false }));
        }
    }
    loadInitialData();
  }, [toast]);

  const loadStudentsAndMarks = useCallback(async (classId: string, subjectId: string) => {
    if (!classId) {
        setStudentsWithMarks([]);
        return;
    }

    setIsLoading(prev => ({ ...prev, students: true }));
    try {
        const studentData = await getStudentsByClass(classId);
        if (studentData.length === 0) {
            setStudentsWithMarks([]);
            setIsLoading(prev => ({ ...prev, students: false }));
            return;
        }

        let finalStudents: StudentWithMarks[];

        if (subjectId) {
            const marksData = await getStudentMarks(classId, subjectId);
            finalStudents = studentData.map((s) => {
                const savedMark = marksData.find((m) => m.studentId === s.id);
                const marks = savedMark ? savedMark.marks : null;
                let status: StudentWithMarks['status'] = 'Pending';
                if (marks !== null && marks !== undefined) {
                    status = marks >= PASS_THRESHOLD ? 'Pass' : 'Fail';
                }
                return { ...s, marks, status };
            });
        } else {
            finalStudents = studentData.map((s) => ({ ...s, marks: null, status: 'Pending' }));
        }
        setStudentsWithMarks(finalStudents);
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to load student or mark data.",
            variant: "destructive",
        });
        setStudentsWithMarks([]);
    } finally {
        setIsLoading(prev => ({ ...prev, students: false }));
    }
  }, [toast]);

  useEffect(() => {
    if (selectedClassId) {
      loadStudentsAndMarks(selectedClassId, selectedSubjectId);
    }
  }, [selectedClassId, selectedSubjectId, loadStudentsAndMarks]);


  const handleMarksChange = (studentId: string, value: string) => {
    const newMarks = value === '' ? null : parseInt(value, 10);
    const clampedMarks = newMarks === null ? null : Math.max(0, Math.min(100, newMarks));

    setStudentsWithMarks((prevStudents) =>
      prevStudents.map((student) => {
        if (student.id === studentId) {
          let status: StudentWithMarks['status'] = 'Pending';
          if (clampedMarks !== null) {
            status = clampedMarks >= PASS_THRESHOLD ? 'Pass' : 'Fail';
          }
          return { ...student, marks: clampedMarks, status };
        }
        return student;
      })
    );
  };

  const handleSave = () => {
    startSaveTransition(async () => {
        if (!selectedClassId || !selectedSubjectId) {
            toast({ title: "Selection missing", description: "Please select a class and subject.", variant: "destructive" });
            return;
        }

        const marksData = studentsWithMarks.map(s => ({
            studentId: s.id,
            studentName: s.name,
            marks: s.marks,
            status: s.status,
        }));

        const result = await saveMarks({ classId: selectedClassId, subjectId: selectedSubjectId, marks: marksData });

        if (result.success) {
            toast({ title: "Success!", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    });
  };

  const handleShare = () => {
    startShareTransition(async () => {
        if (!selectedClassId || !selectedSubjectId) {
            toast({ title: "Selection missing", description: "Please select a class and subject.", variant: "destructive" });
            return;
        }

        const className = allClasses.find(c => c.id === selectedClassId)?.name || '';
        const subjectName = allSubjects.find(s => s.id === selectedSubjectId)?.name || '';
        
        const studentsForApi = studentsWithMarks
            .filter(s => s.marks !== null && s.marks !== undefined) // Only share students with marks
            .map(s => ({
                name: s.name,
                marks: s.marks ?? 0,
                status: s.status,
            }));

        if (studentsForApi.length === 0) {
            toast({ title: "No marks entered", description: "Please enter marks for at least one student to share.", variant: "destructive" });
            return;
        }

        try {
            const result = await generateWhatsappSummary({
                className,
                subjectName,
                students: studentsForApi,
            });
            const encodedMessage = encodeURIComponent(result.message);
            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        } catch (error) {
            console.error("Error generating summary:", error);
            toast({ title: "Error", description: "Could not generate WhatsApp summary.", variant: "destructive" });
        }
    });
  };

  const isDataSelected = Boolean(selectedClassId && selectedSubjectId);
  const showLoadingSpinner = isLoading.students;

  if (isLoading.page) {
    return (
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <main className="flex justify-center items-start min-h-screen bg-background p-4 sm:p-6 md:p-10 font-body">
      <Card className="w-full max-w-4xl shadow-xl border-2 border-border/50">
        <CardHeader className="relative">
          <Link href="/" className="absolute left-6 top-6">
            <Button variant="ghost" size="icon">
                <ArrowLeft />
            </Button>
          </Link>
          <div className="text-center md:text-left md:pl-20">
            <CardTitle className="font-headline text-5xl text-primary tracking-tight">MarkShare</CardTitle>
            <CardDescription className="text-lg pt-1">
              Select a class and subject to enter marks and share with parents.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50 border">
            <Select onValueChange={(value) => { setSelectedClassId(value); setSelectedSubjectId(''); setStudentsWithMarks([]); }} value={selectedClassId} disabled={isLoading.page}>
              <SelectTrigger><SelectValue placeholder="Select a Class" /></SelectTrigger>
              <SelectContent>
                {allClasses.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={isLoading.page || !selectedClassId}>
              <SelectTrigger><SelectValue placeholder="Select a Subject" /></SelectTrigger>
              <SelectContent>
                {allSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-[120px]">Marks (0-100)</TableHead>
                  <TableHead className="w-[150px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showLoadingSpinner ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-48 text-muted-foreground">
                           <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                    </TableRow>
                ) : selectedClassId && studentsWithMarks.length > 0 ? (
                  studentsWithMarks.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={student.marks ?? ''}
                          onChange={(e) => handleMarksChange(student.id, e.target.value)}
                          placeholder="-"
                          className="max-w-[100px]"
                          disabled={!isDataSelected}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {student.status === 'Pass' && <Badge className="bg-accent text-accent-foreground hover:bg-accent/90"><CheckCircle2 className="mr-1.5 h-4 w-4" />Pass</Badge>}
                        {student.status === 'Fail' && <Badge variant="destructive"><XCircle className="mr-1.5 h-4 w-4" />Fail</Badge>}
                        {student.status === 'Pending' && <Badge variant="secondary">Pending</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-48 text-muted-foreground">
                      {selectedClassId ? 'No students found for this class. You can add them from the dashboard.' : 'Please select a class and subject to view students.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 p-6 bg-muted/20 border-t">
          <Button size="lg" onClick={handleSave} disabled={!isDataSelected || isSaving || studentsWithMarks.length === 0}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            <span>Save Marks</span>
          </Button>
          <Button size="lg" variant="outline" onClick={handleShare} disabled={!isDataSelected || isSharing || studentsWithMarks.length === 0}>
            {isSharing ? <Loader2 className="animate-spin" /> : <Share2 />}
            <span>Share on WhatsApp</span>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
