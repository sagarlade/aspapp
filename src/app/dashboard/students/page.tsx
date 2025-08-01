
// src/app/dashboard/students/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, UserCog, Trash2, Pencil, Save } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { getClasses, getAllStudents, updateStudent, deleteStudent } from "@/lib/data";
import type { Class, Student } from "@/lib/data";

interface StudentWithClass extends Student {
  className: string;
}

export default function ManageStudentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentWithClass[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSavingTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  const [editForm, setEditForm] = useState({ name: "", classId: "" });

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([
        getAllStudents(),
        getClasses(),
      ]);
      const classMap = new Map(classesData.map((c) => [c.id, c.name]));
      const studentsWithClassNames = studentsData.map((s) => ({
        ...s,
        className: classMap.get(s.classId) || "Unknown",
      }));
      setStudents(studentsWithClassNames);
      setFilteredStudents(studentsWithClassNames);
      setClasses(classesData);
    } catch (error) {
      console.error("Failed to load data", error);
      toast({
        title: "Error",
        description: "Failed to load students or classes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(lowercasedQuery);
        const matchesClass = selectedClassId === 'all' || student.classId === selectedClassId;
        return matchesSearch && matchesClass;
    });
    setFilteredStudents(filtered);
  }, [searchQuery, selectedClassId, students]);

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditForm({ name: student.name, classId: student.classId });
  };
  
  const handleSaveEdit = () => {
    if (!editingStudent) return;
    startSavingTransition(async () => {
        const result = await updateStudent(editingStudent.id, editForm.name, editForm.classId);
        if (result.success) {
            toast({ title: "Success", description: "Student updated successfully."});
            setEditingStudent(null);
            loadData(); // Refresh list
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    });
  }

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
  };
  
  const confirmDelete = () => {
    if (!studentToDelete) return;
    startSavingTransition(async () => {
        const result = await deleteStudent(studentToDelete.id);
        if (result.success) {
            toast({ title: "Success", description: `Student "${studentToDelete.name}" deleted.`});
            setStudentToDelete(null);
            loadData(); // Refresh list
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    });
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex justify-center items-start min-h-screen bg-background p-4 sm:p-6 md:p-10">
      <Card className="w-full max-w-4xl shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-4">
             <Link href="/">
                <Button variant="ghost" size="icon">
                    <ArrowLeft />
                </Button>
            </Link>
            <div>
              <CardTitle>Manage Students</CardTitle>
              <CardDescription>
                View, edit, and delete student records from the system.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 py-4">
                <Input
                    placeholder="Search by student name..."
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
                        {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="border rounded-lg overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>{student.className}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(student)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(student)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No students found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(isOpen) => !isOpen && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student: {editingStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <label htmlFor="student-name">Student Name</label>
                <Input
                    id="student-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="student-class">Class</label>
                <Select 
                    value={editForm.classId} 
                    onValueChange={(value) => setEditForm(prev => ({...prev, classId: value}))}
                >
                    <SelectTrigger id="student-class">
                        <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                        {classes.map((c) => (
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : "Delete Student"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>
    </main>
  );
}
