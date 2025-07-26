
// src/app/dashboard/report/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useCallback } from "react";
import { Loader2, ArrowLeft, Share2, Camera, Pencil, Trash2, Save, FileDown } from "lucide-react";
import Link from "next/link";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
import { getAllMarks, getClasses, getSubjects, saveMarks, type Student, type Mark } from "@/lib/data";
import type { Class, Subject } from "@/lib/data";
import { useAuth } from "@/components/auth-provider";
import { generateConsolidatedReport } from "@/ai/flows/generate-consolidated-report";


interface ReportMark {
  value: number | string;
  subjectId: string;
}

interface ReportRow {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  marks: { [subjectName: string]: ReportMark };
}

interface EditingMark {
  studentId: string;
  studentName: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  currentValue: number | string;
  newValue: number | string;
}

interface DeletingMark {
    studentId: string;
    studentName: string;
    classId: string;
    subjectId: string;
    subjectName: string;
}

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, startShareTransition] = useTransition();
  const [isGeneratingImage, startImageTransition] = useTransition();
  const [isGeneratingPdf, startPdfTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const { toast } = useToast();
  const tableRef = React.useRef<HTMLTableElement>(null);
  const { user, loading: authLoading } = useAuth();

  const [editingMark, setEditingMark] = useState<EditingMark | null>(null);
  const [deletingMark, setDeletingMark] = useState<DeletingMark | null>(null);

  const getReportData = useCallback(async () => {
    if (authLoading || !user) {
      return;
    }
    setIsLoading(true);
    try {
      const [marksDocs, classes, subjects] = await Promise.all([
        getAllMarks(),
        getClasses(),
        getSubjects(),
      ]);

      const classMap = new Map(classes.map((c) => [c.id, c.name]));
      const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

      const studentDataMap = new Map<string, ReportRow>();

      for (const markDoc of marksDocs) {
          const className = classMap.get(markDoc.classId) || "Unknown Class";
          
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
                  });
              }

              const studentEntry = studentDataMap.get(studentId)!;
              
              if(studentEntry.classId !== markDoc.classId && !studentEntry.className.includes(className)) {
                studentEntry.className += `, ${className}`;
              }

              studentEntry.marks[subjectName] = {
                  value: studentMark.marks,
                  subjectId: markDoc.subjectId,
              };
          }
      }

      const formattedData: ReportRow[] = Array.from(studentDataMap.values());
      formattedData.sort((a, b) => a.studentName.localeCompare(b.studentName));
      setReportData(formattedData);
      setAllSubjects(subjects);
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
  
  const subjectHeaders = allSubjects.map(s => s.name).sort((a, b) => a.localeCompare(b));

  const handleShare = () => {
    startShareTransition(async () => {
      if (reportData.length === 0) {
        toast({ title: "No data to share", variant: "destructive" });
        return;
      }
      
      const simplifiedReportData = reportData.map(row => ({
          studentName: row.studentName,
          className: row.className,
          marks: Object.fromEntries(
              Object.entries(row.marks).map(([key, value]) => [key, value.value])
          )
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
      if (!tableElement || reportData.length === 0) {
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
      const tableElement = tableRef.current;
      if (!tableElement || reportData.length === 0) {
        toast({ title: "No data to download", variant: "destructive" });
        return;
      }

      try {
        temporarilyHideActions(tableElement, true);
        const canvas = await html2canvas(tableElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        temporarilyHideActions(tableElement, false);

        const imgData = canvas.toDataURL('image/png');
        
        // A4 size in points: 595.28 x 841.89
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });

        const imgProps= pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('MarkShare-Report.pdf');

      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Error", description: "Could not generate PDF from report.", variant: "destructive" });
      }
    });
  };

  const handleEditClick = (row: ReportRow) => {
    const subjectsWithMarks = Object.keys(row.marks);
    if (subjectsWithMarks.length === 0) {
      toast({ title: "No marks to edit", description: "This student has no marks entered yet.", variant: "destructive"});
      return;
    }
    const subjectName = subjectsWithMarks.sort((a,b) => a.localeCompare(b))[0];
    const mark = row.marks[subjectName];
    setEditingMark({
      studentId: row.studentId,
      studentName: row.studentName,
      classId: row.classId,
      subjectId: mark.subjectId,
      subjectName,
      currentValue: mark.value,
      newValue: mark.value,
    });
  };
  
  const handleDeleteClick = (row: ReportRow) => {
      const subjectsWithMarks = Object.keys(row.marks);
      if (subjectsWithMarks.length === 0) {
          toast({ title: "No marks to delete", description: "This student has no marks entered yet.", variant: "destructive"});
          return;
      }
      const subjectName = subjectsWithMarks.sort((a,b) => a.localeCompare(b))[0];
      const mark = row.marks[subjectName];
      setDeletingMark({
          studentId: row.studentId,
          studentName: row.studentName,
          classId: row.classId,
          subjectId: mark.subjectId,
          subjectName,
      });
  };

  const handleSaveEdit = () => {
    if (!editingMark) return;
    
    startSavingTransition(async () => {
        const { studentId, studentName, classId, subjectId, newValue } = editingMark;
        
        const markValue = newValue === '' ? null : parseInt(String(newValue), 10);
        if (newValue !== '' && (isNaN(markValue as number) || (markValue as number) < 0 || (markValue as number) > 100)) {
            toast({ title: "Invalid Mark", description: "Mark must be a number between 0 and 100.", variant: "destructive"});
            return;
        }

        const markData: Mark = {
            studentId,
            studentName,
            marks: markValue,
            status: markValue === null ? 'Pending' : (markValue >= 40 ? 'Pass' : 'Fail'),
        };

        const result = await saveMarks({ classId, subjectId, marks: [markData] });

        if(result.success) {
            toast({ title: "Success", description: `Mark for ${editingMark.studentName} in ${editingMark.subjectName} updated.`});
            setEditingMark(null);
            await getReportData();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive"});
        }
    });
  };
  
  const handleDeleteConfirm = () => {
      if(!deletingMark) return;

      startSavingTransition(async () => {
        const { studentId, studentName, classId, subjectId, subjectName: sn } = deletingMark;
        const markData: Mark = {
            studentId,
            studentName,
            marks: null,
            status: 'Pending',
        };
        const result = await saveMarks({ classId, subjectId, marks: [markData] });
        if(result.success) {
            toast({ title: "Success", description: `Mark for ${studentName} in ${sn} deleted.`});
            setDeletingMark(null);
            await getReportData();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive"});
        }
      });
  };
  
  const handleEditSubjectChange = (subjectName: string) => {
    if (!editingMark) return;
    const studentRow = reportData.find(r => r.studentId === editingMark.studentId);
    if (!studentRow) return;

    const newMark = studentRow.marks[subjectName];
    if (newMark) {
      setEditingMark(prev => prev ? ({
        ...prev,
        subjectId: newMark.subjectId,
        subjectName: subjectName,
        currentValue: newMark.value,
        newValue: newMark.value,
      }) : null);
    }
  };

  const handleDeleteSubjectChange = (subjectName: string) => {
    if (!deletingMark) return;
    const studentRow = reportData.find(r => r.studentId === deletingMark.studentId);
    if (!studentRow) return;

    const newMark = studentRow.marks[subjectName];
    if (newMark) {
      setDeletingMark(prev => prev ? ({
        ...prev,
        subjectId: newMark.subjectId,
        subjectName: subjectName,
      }) : null);
    }
  };
  
  if (isLoading || authLoading) {
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
                A consolidated report of all student marks. You can edit or delete marks directly.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                  <TableHead className="table-action-header text-right sticky right-0 bg-background z-10 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length > 0 ? (
                  reportData.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">{row.studentName}</TableCell>
                      <TableCell>{row.className}</TableCell>
                      {subjectHeaders.map(subjectName => {
                        const mark = row.marks[subjectName];
                        return (
                         <TableCell key={subjectName} className="text-center font-mono">
                            {mark?.value ?? '-'}
                        </TableCell>
                        )
                      })}
                      <TableCell className="table-action-cell text-right sticky right-0 bg-background z-10">
                         <div className="flex items-center justify-end gap-2 pr-2">
                           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(row)}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit Mark</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(row)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Mark</span>
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={subjectHeaders.length + 3} className="text-center h-48 text-muted-foreground">
                      No marks have been saved yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {reportData.length > 0 ? (
                reportData.map((row) => (
                    <Card key={row.studentId} className="p-4 bg-muted/20">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg">{row.studentName}</p>
                                <p className="text-sm text-muted-foreground">{row.className}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(row)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(row)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="border-t my-3"></div>
                        <div className="space-y-2">
                            {subjectHeaders.map(subjectName => {
                                const mark = row.marks[subjectName];
                                return mark ? (
                                    <div key={subjectName} className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">{subjectName}</span>
                                        <span className="font-mono font-medium">{mark.value}</span>
                                    </div>
                                ) : null;
                            })}
                            {Object.keys(row.marks).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-2">No marks entered for this student.</p>
                            )}
                        </div>
                    </Card>
                ))
            ) : (
                <div className="text-center h-48 flex items-center justify-center text-muted-foreground px-4">
                    No marks have been saved yet.
                </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row flex-wrap justify-end gap-4 p-6 bg-muted/20 border-t">
           <Button size="lg" onClick={handleDownloadPdf} disabled={isGeneratingPdf || reportData.length === 0}>
            {isGeneratingPdf ? <Loader2 className="animate-spin" /> : <FileDown />}
            <span>Download PDF</span>
          </Button>
           <Button size="lg" onClick={handleShareAsImage} disabled={isGeneratingImage || reportData.length === 0}>
            {isGeneratingImage ? <Loader2 className="animate-spin" /> : <Camera />}
            <span>Share as Image</span>
          </Button>
          <Button size="lg" onClick={handleShare} disabled={isSharing || reportData.length === 0}>
            {isSharing ? <Loader2 className="animate-spin" /> : <Share2 />}
            <span>Share on WhatsApp</span>
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingMark} onOpenChange={(isOpen) => !isOpen && setEditingMark(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mark for {editingMark?.studentName}</DialogTitle>
            <DialogDescription>Select a subject and update the mark.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject-select">Subject</Label>
                <Select value={editingMark?.subjectName} onValueChange={handleEditSubjectChange}>
                    <SelectTrigger id="subject-select">
                        <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {editingMark && reportData.find(r => r.studentId === editingMark.studentId) && Object.keys(reportData.find(r => r.studentId === editingMark.studentId)!.marks).sort((a,b) => a.localeCompare(b)).map(subjectName => (
                            <SelectItem key={subjectName} value={subjectName}>{subjectName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                 <Label htmlFor="mark-input">Mark (0-100)</Label>
                 <Input 
                    id="mark-input"
                    type="number"
                    value={editingMark?.newValue ?? ''}
                    onChange={(e) => setEditingMark(prev => prev ? {...prev, newValue: e.target.value} : null)}
                    placeholder="Enter mark"
                 />
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMark(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                <span>Save</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={!!deletingMark} onOpenChange={(isOpen) => !isOpen && setDeletingMark(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete a mark?</AlertDialogTitle>
            <AlertDialogDescription>
                Select the subject for which you want to delete the mark for <strong>{deletingMark?.studentName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="subject-delete-select">Subject</Label>
                <Select value={deletingMark?.subjectName} onValueChange={handleDeleteSubjectChange}>
                    <SelectTrigger id="subject-delete-select">
                        <SelectValue placeholder="Select a subject to delete" />
                    </SelectTrigger>
                    <SelectContent>
                         {deletingMark && reportData.find(r => r.studentId === deletingMark.studentId) && Object.keys(reportData.find(r => r.studentId === deletingMark.studentId)!.marks).sort((a,b) => a.localeCompare(b)).map(subjectName => (
                            <SelectItem key={subjectName} value={subjectName}>{subjectName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMark(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : "Delete Mark"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>
    </main>
  );
}
