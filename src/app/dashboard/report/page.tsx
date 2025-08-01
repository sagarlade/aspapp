
// src/app/dashboard/report/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { Loader2, ArrowLeft, Share2, Camera, Pencil, Trash2, Save, FileDown, Eye, UserCog } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAllMarks, getClasses, getSubjects, saveMarks, type Mark, getExams, updateStudent, deleteStudent } from "@/lib/data";
import type { Class, Subject, Exam } from "@/lib/data";
import { useAuth } from "@/components/auth-provider";
import { generateConsolidatedReport } from "@/ai/flows/generate-consolidated-report";
import { StudentReportCard } from "@/components/student-report-card";


interface ReportMark {
  value: number | string;
  subjectId: string;
  examId: string;
  examName: string;
  totalMarks: number;
}

export interface ReportRow {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  marks: { [subjectName: string]: ReportMark[] }; // Now an array to hold marks from multiple exams
  totalMarks: number;
}

interface EditingMark {
  studentId: string;
  studentName: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  examId: string;
  examName: string;
  currentValue: number | string;
  newValue: number | string;
}

interface DeletingMark {
    studentId: string;
    studentName: string;
    classId: string;
    subjectId: string;
    subjectName: string;
    examId: string;
}

export default function ReportPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [filteredReportData, setFilteredReportData] = useState<ReportRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, startShareTransition] = useTransition();
  const [isGeneratingImage, startImageTransition] = useTransition();
  const [isGeneratingPdf, startPdfTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const { toast } = useToast();
  const tableRef = React.useRef<HTMLTableElement>(null);
  const { user, userRole, loading: authLoading } = useAuth();

  const [editingMark, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ name: "", classId: "" });


  const [deletingMark, setDeletingMark] = useState<DeletingMark | null>(null);
  const [viewingStudent, setViewingStudent] = useState<ReportRow | null>(null);
  const reportCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(!authLoading && userRole !== 'admin') {
        toast({
            title: "Access Denied",
            description: "You do not have permission to view this page.",
            variant: "destructive"
        });
        router.push('/');
    }
  }, [authLoading, userRole, router, toast]);

  const getReportData = useCallback(async () => {
    if (authLoading || !user) {
      return;
    }
    setIsLoading(true);
    try {
      const [marksDocs, classes, subjects, exams] = await Promise.all([
        getAllMarks(),
        getClasses(),
        getSubjects(),
        getExams(),
      ]);

      const classMap = new Map(classes.map((c) => [c.id, c.name]));
      const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
      const examMap = new Map(exams.map((e) => [e.id, e]));
      
      setAllClasses(classes);
      setAllSubjects(subjects);
      setAllExams(exams);

      const studentDataMap = new Map<string, ReportRow>();

      for (const markDoc of marksDocs) {
          const className = classMap.get(markDoc.classId) || "Unknown Class";
          const exam = examMap.get(markDoc.examId);

          for (const studentMark of markDoc.marks) {
              if (studentMark.marks === null || studentMark.marks === undefined) continue;

              const subjectName = subjectMap.get(markDoc.subjectId) || "Unknown Subject";
              const studentId = studentMark.studentId;
              if (!studentDataMap.has(studentId)) {
                  studentDataMap.set(studentId, {
                      studentId: studentId,
                      studentName: studentMark.studentName,
                      classId: markDoc.classId,
                      className: className,
                      marks: {},
                      totalMarks: 0,
                  });
              }

              const studentEntry = studentDataMap.get(studentId)!;
              
              if(studentEntry.classId !== markDoc.classId && !studentEntry.className.includes(className)) {
                studentEntry.className += `, ${className}`;
              }

              if (!studentEntry.marks[subjectName]) {
                  studentEntry.marks[subjectName] = [];
              }
              
              studentEntry.marks[subjectName].push({
                  value: studentMark.marks,
                  subjectId: markDoc.subjectId,
                  examId: markDoc.examId,
                  examName: exam?.name || "Unknown Exam",
                  totalMarks: exam?.totalMarks || 0,
              });
          }
      }
      
      const formattedData: ReportRow[] = Array.from(studentDataMap.values()).map(student => {
          const totalMarks = Object.values(student.marks).flat().reduce((acc, mark) => {
              const markValue = typeof mark.value === 'string' ? parseFloat(mark.value) : mark.value;
              return acc + (isNaN(markValue) ? 0 : markValue);
          }, 0);
          return { ...student, totalMarks };
      });

      formattedData.sort((a, b) => b.totalMarks - a.totalMarks);
      
      setReportData(formattedData);
    } catch (error) {
      console.error("Error fetching report data", error);
      toast({
        title: "Error",
        description: "Failed to load report data. Please check your connection and permissions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, authLoading]);

  useEffect(() => {
    getReportData();
  }, [getReportData]);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = reportData.filter(row => {
      const matchesSearch =
        row.studentName.toLowerCase().includes(lowercasedQuery) ||
        row.className.toLowerCase().includes(lowercasedQuery);
      const matchesClass = selectedClassId === 'all' || row.classId === selectedClassId;
      return matchesSearch && matchesClass;
    });
    setFilteredReportData(filtered);
  }, [searchQuery, selectedClassId, reportData]);
  
  const subjectHeaders = allSubjects.map(s => s.name).sort((a, b) => a.localeCompare(b));

  const handleShare = () => {
    startShareTransition(async () => {
      const dataToShare = filteredReportData.length > 0 ? filteredReportData : reportData;
      if (dataToShare.length === 0) {
        toast({ title: "No data to share", variant: "destructive" });
        return;
      }
      
      const simplifiedReportData = dataToShare.map(row => ({
          studentName: row.studentName,
          className: row.className,
          marks: Object.fromEntries(
            subjectHeaders.map(header => [
              header,
              row.marks[header]?.[0]?.value ?? '-' // Take first exam's marks for simplicity
            ])
          ),
          totalMarks: row.totalMarks,
      }));

      try {
        const result = await generateConsolidatedReport({ reportData: simplifiedReportData, subjectHeaders });
        const encodedMessage = encodeURIComponent(result.message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
      } catch (error) {
        console.error("Error generating report:", error);
        toast({ title: "Error", description: "Could not generate WhatsApp report.", variant: "destructive" });
      }
    });
  };

  const temporarilyHideActions = (tableElement: HTMLElement, hide: boolean) => {
      const display = hide ? 'none' : '';
      tableElement.querySelectorAll('.table-action-header').forEach(el => (el as HTMLElement).style.display = display);
      tableElement.querySelectorAll('.table-action-cell').forEach(el => (el as HTMLElement).style.display = display);
  };
  
  const handleShareAsImage = () => {
    startImageTransition(async () => {
        const tableElement = tableRef.current;
      if (!tableElement || filteredReportData.length === 0) {
        toast({ title: "No data to share", variant: "destructive" });
        return;
      }

      try {
        temporarilyHideActions(tableElement, true);
        const canvas = await html2canvas(tableElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        temporarilyHideActions(tableElement, false);

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'MarkShare-Report.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
       
      } catch (error) {
        console.error("Error generating image:", error);
        toast({ title: "Error", description: "Could not generate image from report.", variant: "destructive" });
      }
    });
  };
  
  const handleDownloadPdf = () => {
    startPdfTransition(async () => {
      if (filteredReportData.length === 0) {
        toast({ title: "No data to download", variant: "destructive" });
        return;
      }
      
      const doc = new jsPDF();

      const tableHead = [["#", "Student Name", "Class", ...subjectHeaders, "Total Marks"]];
      const tableBody = filteredReportData.map((row, index) => {
        const subjectMarks = subjectHeaders.map(header => {
            const marks = row.marks[header];
            // For simplicity, we'll show the mark of the first exam found for that subject.
            return marks && marks.length > 0 ? String(marks[0].value) : '-';
        });
        return [
          String(index + 1),
          row.studentName,
          row.className,
          ...subjectMarks,
          String(row.totalMarks)
        ];
      });

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 20,
        didDrawPage: (data) => {
            // Header
            doc.setFontSize(20);
            doc.text("Consolidated Marks Report", data.settings.margin.left, 15);
        },
      });

      doc.save('MarkShare-Report.pdf');

    });
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditForm({ name: student.name, classId: student.classId });
  };
  
  const handleDeleteClick = (student: Student) => {
      setStudentToDelete(student);
  };

  const handleSaveEdit = () => {
    if (!editingStudent) return;
    
    startSavingTransition(async () => {
        const result = await updateStudent(editingStudent.id, editForm.name, editForm.classId);
        if (result.success) {
            toast({ title: "Success", description: "Student updated successfully."});
            setEditingStudent(null);
            await getReportData(); // Refresh list
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    });
  };
  
  const handleDeleteConfirm = () => {
      if(!studentToDelete) return;

      startSavingTransition(async () => {
        const result = await deleteStudent(studentToDelete.id);
        if (result.success) {
            toast({ title: "Success", description: `Student "${studentToDelete.name}" deleted.`});
            setStudentToDelete(null);
            await getReportData(); // Refresh list
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
      });
  };

  const handleDownloadReportCard = () => {
    startImageTransition(async () => {
        const reportCardElement = reportCardRef.current;
        if (!reportCardElement || !viewingStudent) {
            toast({ title: "Error", description: "Cannot generate report card.", variant: "destructive" });
            return;
        }
        try {
            const canvas = await html2canvas(reportCardElement, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `ReportCard-${viewingStudent.studentName.replace(/ /g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Success!", description: "Report card downloaded as an image." });
        } catch (error) {
            console.error("Error generating report card image:", error);
            toast({ title: "Error", description: "Could not generate image from report card.", variant: "destructive" });
        }
    });
};
  
  if (isLoading || authLoading || userRole !== 'admin') {
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
             <Link href="/">
                <Button variant="ghost" size="icon">
                    <ArrowLeft />
                </Button>
            </Link>
            <div>
              <CardTitle>Consolidated Marks Report</CardTitle>
              <CardDescription>
                A consolidated report of all student marks, sorted by highest total marks first.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 py-4">
            <Input
              placeholder="Search by student name or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {allClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => router.push('/dashboard/students')} className="ml-auto">
                <UserCog className="mr-2 h-4 w-4" />
                Manage Students
            </Button>
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg overflow-auto">
            <Table ref={tableRef} className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  {subjectHeaders.map(subjectName => (
                    <TableHead key={subjectName} className="text-center">{subjectName}</TableHead>
                  ))}
                  <TableHead className="font-bold text-center">Total Marks</TableHead>
                  <TableHead className="table-action-header text-right sticky right-0 bg-background z-10 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReportData.length > 0 ? (
                  filteredReportData.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">{row.studentName}</TableCell>
                      <TableCell>{row.className}</TableCell>
                      {subjectHeaders.map(subjectName => {
                        const marks = row.marks[subjectName] ?? [];
                        return (
                         <TableCell key={subjectName} className="text-center font-mono">
                            {marks.length > 0 ? (
                                marks.map((mark, index) => (
                                    <div key={index} className="flex items-center justify-center gap-2 group">
                                        <span>{mark.value ?? '-'}</span>
                                        <span className="text-xs text-muted-foreground">({mark.examName})</span>
                                    </div>
                                ))
                            ) : '-'}
                        </TableCell>
                        )
                      })}
                      <TableCell className="text-center font-bold font-mono">{row.totalMarks}</TableCell>
                      <TableCell className="table-action-cell text-right sticky right-0 bg-background z-10">
                         <div className="flex items-center justify-end gap-2 pr-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingStudent(row)}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View Report Card</span>
                            </Button>
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick({id: row.studentId, name: row.studentName, classId: row.classId})}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick({id: row.studentId, name: row.studentName, classId: row.classId})}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={subjectHeaders.length + 4} className="text-center h-48 text-muted-foreground">
                      No results found. Try adjusting your search or filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredReportData.length > 0 ? (
                filteredReportData.map((row) => (
                    <Card key={row.studentId} className="p-4 bg-muted/20">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg">{row.studentName}</p>
                                <p className="text-sm text-muted-foreground">{row.className}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingStudent(row)}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick({id: row.studentId, name: row.studentName, classId: row.classId})}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick({id: row.studentId, name: row.studentName, classId: row.classId})}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                        <div className="border-t my-3"></div>
                        <div className="space-y-2">
                            {subjectHeaders.map(subjectName => {
                                const marks = row.marks[subjectName];
                                return marks && marks.length > 0 ? (
                                    <div key={subjectName}>
                                        <p className="font-medium text-sm">{subjectName}</p>
                                        {marks.map((mark, index) => (
                                            <div key={index} className="flex justify-between items-center text-sm pl-2 group">
                                                <span className="text-muted-foreground">{mark.examName}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-medium">{mark.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null;
                            })}
                            {Object.keys(row.marks).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-2">No marks entered for this student.</p>
                            )}
                        </div>
                        <div className="border-t my-3"></div>
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-muted-foreground">Total Marks</span>
                            <span className="font-mono font-medium">{row.totalMarks}</span>
                        </div>
                    </Card>
                ))
            ) : (
                <div className="text-center h-48 flex items-center justify-center text-muted-foreground px-4">
                    No results found. Try adjusting your search or filter.
                </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row flex-wrap justify-end gap-4 p-6 bg-muted/20 border-t">
           <Button size="lg" onClick={handleDownloadPdf} disabled={isGeneratingPdf || filteredReportData.length === 0}>
            {isGeneratingPdf ? <Loader2 className="animate-spin" /> : <FileDown />}
            <span>Download PDF</span>
          </Button>
           <Button size="lg" onClick={handleShareAsImage} disabled={isGeneratingImage || filteredReportData.length === 0}>
            {isGeneratingImage ? <Loader2 className="animate-spin" /> : <Camera />}
            <span>Share as Image</span>
          </Button>
          <Button size="lg" onClick={handleShare} disabled={isSharing || filteredReportData.length === 0}>
            {isSharing ? <Loader2 className="animate-spin" /> : <Share2 />}
            <span>Share on WhatsApp</span>
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(isOpen) => !isOpen && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student: {editingStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="student-name">Student Name</Label>
                <Input
                    id="student-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="student-class">Class</Label>
                <Select 
                    value={editForm.classId} 
                    onValueChange={(value) => setEditForm(prev => ({...prev, classId: value}))}
                >
                    <SelectTrigger id="student-class">
                        <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                        {allClasses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={!!studentToDelete} onOpenChange={(isOpen) => !isOpen && setStudentToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete <strong>{studentToDelete?.name}</strong> and all their associated marks.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : "Delete Student"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>

        {/* View Student Report Card Dialog */}
        <Dialog open={!!viewingStudent} onOpenChange={(isOpen) => !isOpen && setViewingStudent(null)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Student Report Card</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {viewingStudent && (
                        <div ref={reportCardRef}>
                           <StudentReportCard student={viewingStudent} subjects={allSubjects} />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setViewingStudent(null)}>Close</Button>
                    <Button onClick={handleDownloadReportCard} disabled={isGeneratingImage}>
                        {isGeneratingImage ? <Loader2 className="animate-spin" /> : <Camera />}
                        <span>Download as Image</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>
  );
}

    