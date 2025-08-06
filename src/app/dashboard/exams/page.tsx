// src/app/dashboard/exams/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Loader2, ClipboardList, Trash2, PlusCircle, Calendar as CalendarIcon } from "lucide-react";

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { getExams, addExam, deleteExam } from "@/lib/data";
import type { Exam } from "@/lib/data";
import { cn } from "@/lib/utils";

const addExamSchema = z.object({
  name: z.string().min(2, "Exam name must be at least 2 characters."),
  totalMarks: z.coerce.number().min(1, "Total marks must be at least 1."),
});

export default function ManageExamsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userRole, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  const form = useForm<z.infer<typeof addExamSchema>>({
    resolver: zodResolver(addExamSchema),
    defaultValues: {
      name: "",
      totalMarks: 100,
    },
  });

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

  const loadExams = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const examsData = await getExams();
      setExams(examsData);
    } catch (error) {
      console.error("Failed to load exams", error);
      toast({
        title: "Error",
        description: "Failed to load exams.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if(userRole === 'admin') {
      loadExams();
    }
  }, [userRole, loadExams]);

  const onSubmit = async (values: z.infer<typeof addExamSchema>) => {
    const result = await addExam(values.name, values.totalMarks);
    if (result.success) {
      toast({
        title: "Success!",
        description: `Exam "${values.name}" has been added.`,
      });
      form.reset();
      loadExams(); // Refresh the list
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };
  
  const handleDelete = (exam: Exam) => {
    setExamToDelete(exam);
  };
  
  const confirmDelete = () => {
    if(!examToDelete) return;
    startDeleteTransition(async () => {
        const result = await deleteExam(examToDelete.id);
        if (result.success) {
            toast({
                title: "Success!",
                description: `Exam "${examToDelete.name}" has been deleted.`,
            });
            setExamToDelete(null);
            loadExams(); // Refresh
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            });
        }
    });
  }

  if (isLoading || authLoading || userRole !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex justify-center items-start min-h-screen bg-background p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-4xl space-y-8">
        {/* Add Exam Card */}
        <Card className="w-full shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft />
                </Button>
              </Link>
              <div>
                <CardTitle>Add New Exam</CardTitle>
                <CardDescription>
                  Define a new exam type and set its total marks. The date can be set by the teacher during mark entry.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Exam Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Unit Test 1" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="totalMarks"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Total Marks</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 100" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <PlusCircle className="mr-2" />}
                    Add Exam
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Existing Exams Card */}
        <Card className="w-full shadow-xl">
            <CardHeader>
                <CardTitle>Existing Exams</CardTitle>
                <CardDescription>List of all exams currently in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Exam Name</TableHead>
                                <TableHead className="text-center">Total Marks</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {exams.length > 0 ? (
                                exams.map((exam) => (
                                    <TableRow key={exam.id}>
                                        <TableCell className="font-medium">{exam.name}</TableCell>
                                        <TableCell className="text-center">{exam.totalMarks}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(exam)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No exams found. Add one using the form above.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>

       {/* Delete Confirmation Dialog */}
       <AlertDialog open={!!examToDelete} onOpenChange={(isOpen) => !isOpen && setExamToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the <strong>{examToDelete?.name}</strong> exam and all associated marks.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="animate-spin" /> : "Delete Exam"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>
    </main>
  );
}
