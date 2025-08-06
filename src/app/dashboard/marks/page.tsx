// src/app/dashboard/marks/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useRef } from "react";
import { Loader2, Save, Share2, ArrowLeft, Camera, RefreshCw } from "lucide-react";
import Link from "next/link";
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
  isDirty: boolean; // to track if marks have changed
};

export default function MarkSharePage() {
  const { toast } = useToast();
  const { user, userRole, loading: authLoading } = useAuth();
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

  const tableRef = useRef<HTMLDivElement>(null);
  const selectedExam = allExams.find(e => e.id === selectedIds.examId);
  const areMarksDirty = studentsWithMarks.some(s => s.isDirty);

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
      if (!subjectId) { 
         const studentData = await getStudentsByClass(classId);
         setStudentsWithMarks(studentData.map(s => ({...s, marks: null, status: 'Pending', isDirty: false})));
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
          const currentExam = allExams.find(e => e.id === examId);
          const totalMarks = currentExam?.totalMarks ?? 100;
          const passingMarks = totalMarks * 0.4;
          
          finalStudents = studentData.map((s) => {
            const savedMark = marksData.find((m) => m.studentId === s.id);
            const marks = savedMark ? savedMark.marks : null;
            let status: StudentWithMarks['status'] = 'Pending';
            if(marks !== null) {
                status = marks >= passingMarks ? 'Pass' : 'Fail';
            }
            return { ...s, marks, status, isDirty: false };
          });
        } else {
          finalStudents = studentData.map((s) => ({ ...s, marks: null, status: 'Pending', isDirty: false }));
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
    
    if(!authLoading && !loading.page) fetchStudentsAndMarks();
  }, [selectedIds, toast, user, authLoading, allExams, loading.page]);


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
    const passingMarks = totalMarks * 0.4;
    const clampedMarks = newMarks === null ? null : Math.max(0, Math.min(totalMarks, newMarks));

    let status: StudentWithMarks['status'] = 'Pending';
    if(clampedMarks !== null) {
        status = clampedMarks >= passingMarks ? 'Pass' : 'Fail';
    }

    setStudentsWithMarks((prevStudents) =>
      prevStudents.map((student) => {
        if (student.id === studentId) {
          return { ...student, marks: clampedMarks, status, isDirty: true };
        }
        return student;
      })
    );
  };
  
  const handleResetMarks = () => {
    setStudentsWithMarks(prev => prev.map(s => ({ ...s, marks: null, status: 'Pending', isDirty: true })));
     toast({ title: "Marks Cleared", description: "All entered marks have been reset." });
  }

  const handleSave = () => {
    startSaveTransition(async () => {
      const { classId, subjectId, examId } = selectedIds;
      if (!classId || !subjectId || !examId) {
        toast({ title: "Selection missing", description: "Please select a class, subject, and exam.", variant: "destructive" });
        return;
      }
      
      const marksToSave: Omit<Mark, 'studentName'>[] = studentsWithMarks
        .filter(s => s.isDirty) // Only save changed marks
        .map(s => ({
            studentId: s.id,
            marks: s.marks,
            status: s.status,
        }));

      if (marksToSave.length === 0) {
        toast({ title: "No changes to save", description: "You haven't made any changes to the marks."});
        return;
      }

       const studentDetails = studentsWithMarks
        .filter(s => s.isDirty)
        .map(s => ({
            studentId: s.id,
            studentName: s.name,
            marks: s.marks,
            status: s.status,
        }));


      const result = await saveMarks({ classId, subjectId, examId, marks: studentDetails});
      
      if(result.success) {
         toast({ title: "Success!", description: "Marks have been saved successfully!" });
         // Reset dirty state after saving
         setStudentsWithMarks(prev => prev.map(s => ({...s, isDirty: false})))
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
      if (!selectedIds.classId || !selectedIds.subjectId || !selectedIds.examId || !selectedExam) {
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

    const handleShareAsImage = () => {
      startImageTransition(async () => {
          if (studentsWithMarks.length === 0) {
              toast({ title: "No marks to share", variant: "destructive" });
              return;
          }

          const className = allClasses.find(c => c.id === selectedIds.classId)?.name || 'class';
          const subjectName = allSubjects.find(s => s.id === selectedIds.subjectId)?.name || 'subject';
          const examName = allExams.find(e => e.id === selectedIds.examId)?.name || 'exam';
          
          const processChunk = async (chunkIndex: number) => {
              const CHUNK_SIZE = 25;
              const chunk = studentsWithMarks.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
              
              if (chunk.length === 0) {
                  toast({ title: "Success!", description: "All mark sheets downloaded."});
                  return;
              }

              // Create a temporary container for rendering the table for this specific chunk
              const tempContainer = document.createElement('div');
              tempContainer.style.position = 'absolute';
              tempContainer.style.left = '-9999px';
              tempContainer.style.top = 'auto';
              tempContainer.style.background = 'white';
              tempContainer.style.padding = '1rem';
              document.body.appendChild(tempContainer);
              
              const ReactDOM = (await import('react-dom')).default;
              
              await new Promise<void>(resolve => {
                  ReactDOM.render(
                    <div className="p-4 bg-white">
                        <Table className="w-full border-collapse">
                            <caption className="text-lg font-bold p-2 text-center text-black">
                                Marks for {className} - {subjectName} ({examName})
                            </caption>
                            <TableHeader>
                                <TableRow className="border-b-2 border-black">
                                    <TableHead className="w-[50px] font-bold text-black">#</TableHead>
                                    <TableHead className="font-bold text-black">Student Name</TableHead>
                                    <TableHead className="w-[150px] text-right font-bold text-black">Marks Obtained</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chunk.map((student, index) => (
                                    <TableRow key={student.id} className="border-b border-gray-300">
                                        <TableCell className="text-black">{chunkIndex * CHUNK_SIZE + index + 1}</TableCell>
                                        <TableCell className="font-medium text-black">{student.name}</TableCell>
                                        <TableCell className="text-right text-black">{student.marks ?? '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>,
                    tempContainer,
                    () => resolve()
                  );
              });

              try {
                  const canvas = await html2canvas(tempContainer.firstChild as HTMLElement, {
                      scale: 3,
                      backgroundColor: '#ffffff',
                      useCORS: true,
                  });

                  const link = document.createElement('a');
                  link.href = canvas.toDataURL('image/png');
                  const pageNumber = studentsWithMarks.length > CHUNK_SIZE ? `-Page-${chunkIndex + 1}` : '';
                  link.download = `MarkSheet-${className.replace(' ', '-')}-${subjectName}-${examName}${pageNumber}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);

              } catch (error) {
                  console.error("Error generating image:", error);
                  toast({ title: "Error", description: "Could not generate image from marks list.", variant: "destructive" });
              } finally {
                  // Clean up the temporary container
                  ReactDOM.unmountComponentAtNode(tempContainer);
                  document.body.removeChild(tempContainer);
                  // Process the next chunk
                  await processChunk(chunkIndex + 1);
              }
          };

          // Start processing the first chunk
          await processChunk(0);
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
             {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
               {loading.students ? (
                  <div className="text-center h-48 flex justify-center items-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : selectedIds.classId && studentsWithMarks.length > 0 ? (
                    studentsWithMarks.map((student, index) => (
                      <div key={student.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-lg">{student.name}</p>
                            <Badge variant={student.status === 'Pass' ? 'default' : student.status === 'Fail' ? 'destructive' : 'secondary'}>{student.status}</Badge>
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
          
          <div ref={tableRef} className="absolute -left-[9999px] top-auto"></div>

          {/* Visible table for interaction */}
          <div className="hidden md:block border rounded-lg overflow-auto">
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-[180px]">Marks (0-{selectedExam?.totalMarks ?? '100'})</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
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
                       <TableCell>
                          <Badge variant={student.status === 'Pass' ? 'default' : student.status === 'Fail' ? 'destructive' : 'secondary'}>
                            {student.status}
                          </Badge>
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
          </div>

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 p-6 bg-muted/20 border-t">
          {areMarksDirty && (
            <Button size="lg" variant="ghost" onClick={handleResetMarks} disabled={isSaving}>
              <RefreshCw />
              <span>Reset</span>
            </Button>
          )}
          <Button size="lg" onClick={handleSave} disabled={!selectedIds.examId || isSaving || studentsWithMarks.length === 0 || !areMarksDirty}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            <span>Save Marks</span>
          </Button>
         <Button size="lg" variant="outline" onClick={handleShareAsImage} disabled={isGeneratingImage}>
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
