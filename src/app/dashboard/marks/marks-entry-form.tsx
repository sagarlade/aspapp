// src/app/dashboard/marks/marks-entry-form.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useMemo } from "react";
import { Loader2, Save, Share2, ArrowLeft, Eye, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

import { generateWhatsappSummary } from "@/ai/flows/generate-whatsapp-summary";
import type { Class, Subject, Student, Mark, Exam } from "@/lib/data";
import { getClasses, getSubjects, getStudentsByClass, getExams, saveMarks } from "@/lib/data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CardFooter } from "@/components/ui/card";

type StudentWithMarks = Student & {
  marks: number | null;
  status: 'Pass' | 'Fail' | 'Pending';
  isDirty: boolean; // to track if marks have changed
};

const SENIOR_CLASS_NAMES = [
    '6th Standard', '7th Standard', '8th Standard', '9th Standard', '10th Standard'
];

const SENIOR_SUBJECT_NAMES = [
    'Marathi', 'Maths', 'Maths-1', 'Hindi', 'English', 'G.Science', 'Science', 'SST'
];

const SCHOLARSHIP_SUBJECT_NAMES = ['Maths', 'English', 'Marathi', 'बुद्धिमत्ता चाचणी', 'Science'];


export default function MarksEntryForm() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaving, startSaveTransition] = useTransition();
  const [isSharing, startShareTransition] = useTransition();

  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [studentsWithMarks, setStudentsWithMarks] = useState<StudentWithMarks[]>([]);
  const [examDate, setExamDate] = useState<Date | undefined>(new Date());
  
  const [loading, setLoading] = useState({
    page: true,
    students: false,
  });

  const [selectedIds, setSelectedIds] = useState({
    classId: '',
    subjectId: '',
    examId: '',
  });

  const selectedClass = allClasses.find(c => c.id === selectedIds.classId);
  const selectedExam = allExams.find(e => e.id === selectedIds.examId);
  const areMarksDirty = studentsWithMarks.some(s => s.isDirty);
  
  const filteredSubjects = useMemo(() => {
    const isScholarshipExam = selectedExam?.name.toLowerCase().includes('scholarship');
    if (isScholarshipExam) {
        return allSubjects.filter(s => SCHOLARSHIP_SUBJECT_NAMES.includes(s.name));
    }
    
    const isSeniorClass = selectedClass && SENIOR_CLASS_NAMES.includes(selectedClass.name);
    if (isSeniorClass) {
        return allSubjects.filter(s => SENIOR_SUBJECT_NAMES.includes(s.name));
    }

    return allSubjects;
  }, [selectedClass, selectedExam, allSubjects]);

   // Effect to set class from URL search params
  useEffect(() => {
    const classIdFromUrl = searchParams.get('classId');
    if (classIdFromUrl) {
      setSelectedIds(prev => ({ ...prev, classId: classIdFromUrl }));
    }
  }, [searchParams]);

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
      const { classId } = selectedIds;
      if (!classId || !user) {
        setStudentsWithMarks([]);
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
        
        // Always reset to empty marks for new entry
        const finalStudents = studentData.map((s) => ({ ...s, marks: null, status: 'Pending', isDirty: false }));
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
  }, [selectedIds.classId, toast, user, authLoading, loading.page]);

  const groupedExams = useMemo(() => {
    const groups: Record<string, Exam[]> = {
        'Monthly Test': [],
        'Weekly Test': [],
        'Class Test': [],
        'Scholarship Test': [],
        'Semester': [],
        'Unit Test': [],
    };
    const other: Exam[] = [];

    const categoryKeys = Object.keys(groups);

    allExams.forEach(exam => {
        const category = categoryKeys.find(key => exam.name.startsWith(key));
        if (category) {
            groups[category].push(exam);
        } else {
            other.push(exam);
        }
    });

    const sortExams = (a: Exam, b: Exam) => {
        const aNum = parseInt(a.name.match(/\d+$/)?.[0] || '0', 10);
        const bNum = parseInt(b.name.match(/\d+$/)?.[0] || '0', 10);
        return aNum - bNum;
    };
    
    for (const key in groups) {
      if(key !== 'Semester') {
        groups[key].sort(sortExams);
      } else {
         groups[key].sort((a,b) => a.name.localeCompare(b.name));
      }
    }
    
    other.sort((a,b) => a.name.localeCompare(b.name));

    return { ...groups, Other: other };
  }, [allExams]);

  const handleClassChange = (classId: string) => {
    router.push(`/dashboard/marks?classId=${classId}`);
    setSelectedIds({ classId, subjectId: '', examId: '' });
  };
  
  const handleSubjectChange = (subjectId: string) => {
    setSelectedIds(prev => ({ ...prev, subjectId }));
  };

  const handleExamChange = (examId: string) => {
    // When exam changes, reset subject to ensure it's valid for the new exam type
    setSelectedIds(prev => ({ ...prev, examId, subjectId: '' }));
  };

  const handleMarksChange = (studentId: string, value: string) => {
    // If the input is empty, clear the marks
    if (value === '') {
        setStudentsWithMarks((prevStudents) =>
            prevStudents.map((student) =>
                student.id === studentId ? { ...student, marks: null, status: 'Pending', isDirty: true } : student
            )
        );
        return;
    }

    const newMarks = parseInt(value, 10);

    // If parsing fails (e.g., "12a"), do nothing to prevent crash
    if (isNaN(newMarks)) {
        return;
    }
    
    const totalMarks = selectedExam?.totalMarks ?? 100;
    const passingMarks = totalMarks * 0.4;
    const clampedMarks = Math.max(0, Math.min(totalMarks, newMarks));
    const status: StudentWithMarks['status'] = clampedMarks >= passingMarks ? 'Pass' : 'Fail';

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
        .filter(s => s.isDirty && s.marks !== null) // Only save changed marks with values
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
        .filter(s => s.isDirty && s.marks !== null)
        .map(s => ({
            studentId: s.id,
            studentName: s.name,
            marks: s.marks,
            status: s.status,
        }));

      const dateString = examDate ? format(examDate, 'yyyy-MM-dd') : undefined;
      const result = await saveMarks({ classId, subjectId, examId, marks: studentDetails, examDate: dateString});
      
      if(result.success) {
         toast({ title: "Success!", description: "Marks have been saved successfully!" });
         // Reset dirty state after saving
         setStudentsWithMarks(prev => prev.map(s => ({...s, marks: null, isDirty: false, status: 'Pending'})))
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

  const handleViewMarks = () => {
    const { classId, subjectId, examId } = selectedIds;
    if (classId && subjectId) {
      let url = `/dashboard/marks/view?classId=${classId}&subjectId=${subjectId}`;
      if(examId) {
        url += `&examId=${examId}`;
      }
      router.push(url);
    } else {
      toast({
        title: "Selection Required",
        description: "Please select a class and subject to view marks.",
        variant: "destructive",
      });
    }
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
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.5fr_auto_auto] gap-4 p-4 rounded-lg bg-muted/50 border items-center">
            <Select onValueChange={handleClassChange} value={selectedIds.classId}>
              <SelectTrigger><SelectValue placeholder="1. Select Class" /></SelectTrigger>
              <SelectContent>
                {allClasses.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleExamChange} value={selectedIds.examId} disabled={!selectedIds.classId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="2. Select Exam" /></SelectTrigger>
                <SelectContent>
                    {Object.entries(groupedExams).map(([groupName, exams]) => (
                        exams.length > 0 && (
                            <SelectGroup key={groupName}>
                                <SelectLabel>{groupName}</SelectLabel>
                                {exams.map(exam => (
                                    <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                                ))}
                            </SelectGroup>
                        )
                    ))}
                </SelectContent>
            </Select>
            <Select onValueChange={handleSubjectChange} value={selectedIds.subjectId} disabled={!selectedIds.examId}>
              <SelectTrigger><SelectValue placeholder="3. Select Subject" /></SelectTrigger>
              <SelectContent>
                {filteredSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !examDate && "text-muted-foreground"
                    )}
                     disabled={!selectedIds.examId}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {examDate ? format(examDate, "PPP") : <span>4. Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={examDate}
                    onSelect={setExamDate}
                    initialFocus
                    />
                </PopoverContent>
            </Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleViewMarks} variant="ghost" size="icon" disabled={!selectedIds.classId || !selectedIds.subjectId}>
                        <Eye />
                        <span className="sr-only">View/Edit Marks</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View/Edit Marks</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <Button size="lg" variant="outline" onClick={handleResetMarks} disabled={isSaving}>
              <RefreshCw />
              <span>Reset</span>
            </Button>
          )}
          <Button size="lg" onClick={handleSave} disabled={!selectedIds.examId || isSaving || studentsWithMarks.length === 0 || !areMarksDirty}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            <span>Save Marks</span>
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
