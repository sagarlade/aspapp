// src/app/dashboard/report/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { Loader2, ArrowLeft, Share2, Camera, Pencil, Trash2, Save } from "lucide-react";
import Link from "next/link";
import html2canvas from 'html2canvas';

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAllMarks, getClasses, getSubjects, saveMarks, type Student, type Mark } from "@/lib/data";
import type { Class, Subject } from "@/lib/data";
import { generateConsolidatedReport } from "@/ai/flows/generate-consolidated-report";
import { useAuth } from "@/components/auth-provider";

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
  const [isSaving, startSavingTransition] = useTransition();
  const { toast } = useToast();
  const tableRef = React.useRef<HTMLTableElement>(null);
  const { user, loading: authLoading } = useAuth();

  const [editingMark, setEditingMark] = useState<EditingMark | null>(null);
  const [deletingMark, setDeletingMark] = useState<DeletingMark | null>(null);

  const getReportData = React.useCallback(async () => {
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
              if (studentEntry.classId !== markDoc.classId) {
                  studentEntry.className += `, ${className}`;
                  studentEntry.classId = markDoc.classId; // Update classId if different, might need better logic for multiple classes
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
  
  const handleShareAsImage = () => {
    startImageTransition(async () => {
        const tableElement = tableRef.current;
      if (!tableElement || reportData.length === 0) {
        toast({ title: "No data to share", variant: "destructive" });
        return;
      }

      try {
         // Temporarily remove action columns for capture
        const actionHeaders = tableElement.querySelectorAll('.table-action-header');
        const actionCells = tableElement.querySelectorAll('.table-action-cell');
        actionHeaders.forEach(el => (el as HTMLElement).style.display = 'none');
        actionCells.forEach(el => (el as HTMLElement).style.display = 'none');

        const canvas = await html2canvas(tableElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        
        // Restore action columns
        actionHeaders.forEach(el => (el as HTMLElement).style.display = '');
        actionCells.forEach(el => (el as HTMLElement).style.display = '');

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

  const handleEditClick = (row: ReportRow, subjectName: string) => {
    const mark = row.marks[subjectName];
    if (mark) {
      setEditingMark({
        studentId: row.studentId,
        studentName: row.studentName,
        classId: row.classId,
        subjectId: mark.subjectId,
        subjectName,
        currentValue: mark.value,
        newValue: mark.value,
      });
    }
  };
  
  const handleDeleteClick = (row: ReportRow, subjectName: string) => {
      const mark = row.marks[subjectName];
      if (mark) {
          setDeletingMark({
              studentId: row.studentId,
              studentName: row.studentName,
              classId: row.classId,
              subjectId: mark.subjectId,
              subjectName,
          });
      }
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
            await getReportData(); // Refresh data
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
          <div className="border rounded-lg overflow-auto">
            <Table ref={tableRef}>
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
                      <TableCell className="font-medium sticky left-0 bg-background z-10 whitespace-nowrap">{row.studentName}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.className}</TableCell>
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
                            {subjectHeaders.map(subjectName => {
                                const mark = row.marks[subjectName];
                                if (mark) {
                                    return (
                                        <React.Fragment key={subjectName}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(row, subjectName)}>
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">Edit {subjectName}</span>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(row, subjectName)}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete {subjectName}</span>
                                            </Button>
                                        </React.Fragment>
                                    );
                                }
                                return null;
                            })}
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
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-4 p-6 bg-muted/20 border-t">
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
            <DialogDescription>Update the mark for the subject: <strong>{editingMark?.subjectName}</strong></DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <Label htmlFor="mark-input">Mark (0-100)</Label>
              <Input 
                id="mark-input"
                type="number"
                value={editingMark?.newValue ?? ''}
                onChange={(e) => setEditingMark(prev => prev ? {...prev, newValue: e.target.value} : null)}
                className="mt-2"
                placeholder="Enter mark"
              />
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This will permanently delete the mark for <strong>{deletingMark?.studentName}</strong> in <strong>{deletingMark?.subjectName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMark(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : "Delete"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>
    </main>
  );
}

    