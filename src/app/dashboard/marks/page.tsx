// src/app/dashboard/marks/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, Save, Share2, ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import html2canvas from 'html2canvas';

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
import { useAuth } from "@/components/auth-provider";

import { generateWhatsappSummary } from "@/ai/flows/generate-whatsapp-summary";
import type { Class, Subject, Student, Mark, Exam } from "@/lib/data";
import { getClasses, getSubjects, getStudentsByClass, getStudentMarks, getExams, saveMarks } from "@/lib/data";

type StudentWithMarks = Student & {
  marks: number | null;
  status: 'Pass' | 'Fail' | 'Pending';
};

export default function MarkSharePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isSaving, startSaveTransition] = useTransition();
  const [isSharing, startShareTransition] = useTransition();
  const [isGeneratingImage, startImageTransition] = useTransition();

  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [studentsWithMarks, setStudentsWithMarks] = useState<StudentWithMarks[]>([]);

  const [loading, setLoading] = useState({
    page: true,
    students: false,
  });

  const [selectedIds, setSelectedIds] = useState({
    classId: '',
    subjectId: '',
    examId: '',
  });

  const tableRef = useRef<HTMLTableElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  const selectedExam = allExams.find(e => e.id === selectedIds.examId);
  const PASS_THRESHOLD = selectedExam ? selectedExam.totalMarks * 0.4 : 40;

  // Effect for initial page load (classes, subjects, exams)
  useEffect(() => {
    async function loadInitialData() {
      if (!user) return;
      setLoading(prev => ({ ...prev, page: true }));
      try {
        const [classesData, subjectsData, examsData] = await Promise.all([getClasses(), getSubjects(), getExams()]);
        setAllClasses(classesData);
        setAllSubjects(subjectsData);
        setAllExams(examsData);
      } catch (error) {
        console.error("Failed to load initial data", error);
        toast({ title: "Error", description: "Failed to load class, subject, or exam data.", variant: "destructive" });
      } finally {
        setLoading(prev => ({ ...prev, page: false }));
      }
    }
    if(!authLoading) loadInitialData();
  }, [toast, user, authLoading]);

  // Effect for fetching students and marks when selections change
  useEffect(() => {
    const fetchStudentsAndMarks = async () => {
      const { classId, subjectId, examId } = selectedIds;
      if (!classId || !user) {
        setStudentsWithMarks([]);
        return;
      }
      if (!subjectId) { // only clear students if subject changes, not exam
         setStudentsWithMarks(await getStudentsByClass(classId).then(data => data.map(s => ({...s, marks: null, status: 'Pending'}))));
         return;
      }


      setLoading(prev => ({ ...prev, students: true }));
      try {
        const studentData = await getStudentsByClass(classId);
        if (studentData.length === 0) {
          setStudentsWithMarks([]);
          setLoading(prev => ({...prev, students: false}));
          return;
        }

        let finalStudents: StudentWithMarks[];
        if (subjectId && examId) {
          const marksData = await getStudentMarks(classId, subjectId, examId);
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
        console.error("Failed to load students and marks", error);
        toast({
          title: "Error",
          description: "Failed to load student or mark data.",
          variant: "destructive",
        });
        setStudentsWithMarks([]);
      } finally {
        setLoading(prev => ({ ...prev, students: false }));
      }
    };
    
    if(!authLoading) fetchStudentsAndMarks();
  }, [selectedIds, toast, user, authLoading, PASS_THRESHOLD]);


  const handleClassChange = (classId: string) => {
    setSelectedIds({ classId, subjectId: '', examId: '' });
  };
  
  const handleSubjectChange = (subjectId: string) => {
    setSelectedIds(prev => ({ ...prev, subjectId, examId: '' }));
  };

  const handleExamChange = (examId: string) => {
    setSelectedIds(prev => ({ ...prev, examId }));
  };

  const handleMarksChange = (studentId: string, value: string) => {
    const newMarks = value === '' ? null : parseInt(value, 10);
    const totalMarks = selectedExam?.totalMarks ?? 100;
    const clampedMarks = newMarks === null ? null : Math.max(0, Math.min(totalMarks, newMarks));

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
      const { classId, subjectId, examId } = selectedIds;
      if (!classId || !subjectId || !examId) {
        toast({ title: "Selection missing", description: "Please select a class, subject, and exam.", variant: "destructive" });
        return;
      }
      
      const marksToSave: Mark[] = studentsWithMarks
        .map(s => ({
            studentId: s.id,
            studentName: s.name,
            marks: s.marks,
            status: s.status,
        }));

      if (marksToSave.length === 0) {
        toast({ title: "No students to save", description: "There are no students in this class to save."});
        return;
      }

      const result = await saveMarks({ classId, subjectId, examId, marks: marksToSave});
      
      if(result.success) {
         toast({ title: "Success!", description: "Marks have been saved successfully!" });
      } else {
         toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleShare = () => {
    startShareTransition(async () => {
      if (!selectedIds.classId || !selectedIds.subjectId || !selectedIds.examId) {
        toast({ title: "Selection missing", description: "Please select a class, subject, and exam.", variant: "destructive" });
        return;
      }
      const className = allClasses.find(c => c.id === selectedIds.classId)?.name || '';
      const subjectName = allSubjects.find(s => s.id === selectedIds.subjectId)?.name || '';
      const examName = allExams.find(e => e.id === selectedIds.examId)?.name || '';
      const studentsForApi = studentsWithMarks
        .filter(s => s.marks !== null && s.marks !== undefined)
        .map(s => ({ name: s.name, marks: s.marks ?? 0 }));
        
      if (studentsForApi.length === 0) {
        toast({ title: "No marks entered", description: "Please enter marks for at least one student to share.", variant: "destructive" });
        return;
      }

      try {
        const result = await generateWhatsappSummary({
          className,
          subjectName: `${subjectName} (${examName})`,
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

  const handleShareAsImage = () => {
    startImageTransition(async () => {
      const isMobile = window.innerWidth < 768;
      const elementToCapture = isMobile ? mobileContainerRef.current : tableRef.current;

      if (!elementToCapture) {
        toast({ title: "Error", description: "Could not find content to capture.", variant: "destructive" });
        return;
      }

      try {
        const canvas = await html2canvas(elementToCapture, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            onclone: (document) => {
              // On mobile, we need to make sure the container is temporarily sized to fit all children
              if (isMobile && mobileContainerRef.current) {
                const container = document.getElementById(mobileContainerRef.current.id);
                if(container) container.style.height = 'auto';
              }
            }
        });
        const link = document.createElement('a');
        const className = allClasses.find(c => c.id === selectedIds.classId)?.name || 'class';
        const subjectName = allSubjects.find(s => s.id === selectedIds.subjectId)?.name || 'subject';
        const examName = allExams.find(e => e.id === selectedIds.examId)?.name || 'exam';
        link.href = canvas.toDataURL('image/png');
        link.download = `MarkSheet-${className.replace(' ','-')}-${subjectName}-${examName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error generating image:", error);
        toast({ title: "Error", description: "Could not generate image from marks list.", variant: "destructive" });
      }
    });
  };

  if (loading.page || authLoading) {
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
          <Link href="/" className="absolute left-4 top-4 md:left-6 md:top-6">
            <Button variant="ghost" size="icon"><ArrowLeft /></Button>
          </Link>
          <div className="text-center md:pl-16">
            <CardTitle className="font-headline text-3xl md:text-5xl text-primary tracking-tight">MarkShare</CardTitle>
            <CardDescription className="text-base md:text-lg pt-1">
              Select a class, subject, and exam to enter marks and share with parents.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border">
            <Select onValueChange={handleClassChange} value={selectedIds.classId}>
              <SelectTrigger><SelectValue placeholder="1. Select a Class" /></SelectTrigger>
              <SelectContent>
                {allClasses.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleSubjectChange} value={selectedIds.subjectId} disabled={!selectedIds.classId}>
              <SelectTrigger><SelectValue placeholder="2. Select a Subject" /></SelectTrigger>
              <SelectContent>
                {allSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
             <Select onValueChange={handleExamChange} value={selectedIds.examId} disabled={!selectedIds.subjectId}>
              <SelectTrigger><SelectValue placeholder="3. Select an Exam" /></SelectTrigger>
              <SelectContent>
                {allExams.map((e) => (<SelectItem key={e.id} value={e.id}>{e.name} ({e.totalMarks} Marks)</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:border md:rounded-lg md:overflow-hidden">
            {/* Desktop Table View */}
            <Table ref={tableRef} className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-[180px]">Marks (0-{selectedExam?.totalMarks ?? '100'})</TableHead>
                  <TableHead className="w-[150px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.students ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-48">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : selectedIds.classId && studentsWithMarks.length > 0 ? (
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
                          className="max-w-[120px]"
                          disabled={!selectedIds.examId}
                          max={selectedExam?.totalMarks}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {student.status === 'Pass' && <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle2 className="mr-1.5 h-4 w-4" />Pass</Badge>}
                        {student.status === 'Fail' && <Badge variant="destructive"><XCircle className="mr-1.5 h-4 w-4" />Fail</Badge>}
                        {student.status === 'Pending' && <Badge variant="secondary">Pending</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-48 text-muted-foreground">
                      {selectedIds.classId ? 'No students found for this class. You can add them from the dashboard.' : 'Please select a class to view students.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Mobile Card View */}
            <div ref={mobileContainerRef} id="mobile-marks-container" className="md:hidden space-y-4">
               {loading.students ? (
                  <div className="text-center h-48 flex justify-center items-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : selectedIds.classId && studentsWithMarks.length > 0 ? (
                    studentsWithMarks.map((student, index) => (
                      <div key={student.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-lg">{student.name}</p>
                            <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 items-center">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Marks (0-{selectedExam?.totalMarks ?? '100'})</label>
                                <Input
                                  type="number"
                                  value={student.marks ?? ''}
                                  onChange={(e) => handleMarksChange(student.id, e.target.value)}
                                  placeholder="-"
                                  className="mt-1"
                                  disabled={!selectedIds.examId}
                                  max={selectedExam?.totalMarks}
                                />
                              </div>
                              <div className="text-right">
                                <label className="text-sm font-medium text-muted-foreground block mb-2">Status</label>
                                {student.status === 'Pass' && <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle2 className="mr-1.5 h-4 w-4" />Pass</Badge>}
                                {student.status === 'Fail' && <Badge variant="destructive"><XCircle className="mr-1.5 h-4 w-4" />Fail</Badge>}
                                {student.status === 'Pending' && <Badge variant="secondary">Pending</Badge>}
                              </div>
                          </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center h-48 flex items-center justify-center text-muted-foreground px-4">
                     {selectedIds.classId ? 'No students found. Add them from the dashboard.' : 'Please select a class to view students.'}
                  </div>
                )
              }
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 p-6 bg-muted/20 border-t">
          <Button size="lg" onClick={handleSave} disabled={!selectedIds.examId || isSaving || studentsWithMarks.length === 0}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            <span>Save Marks</span>
          </Button>
          <Button size="lg" variant="outline" onClick={handleShareAsImage} disabled={!selectedIds.examId || isGeneratingImage || studentsWithMarks.length === 0}>
            {isGeneratingImage ? <Loader2 className="animate-spin" /> : <Camera />}
            <span>Share as Image</span>
          </Button>
          <Button size="lg" variant="outline" onClick={handleShare} disabled={!selectedIds.examId || isSharing || studentsWithMarks.length === 0}>
            {isSharing ? <Loader2 className="animate-spin" /> : <Share2 />}
            <span>Share on WhatsApp</span>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

    