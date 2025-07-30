
// src/app/dashboard/add-students/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

import { getClasses, addMultipleStudents } from "@/lib/data";
import type { Class } from "@/lib/data";

const addStudentsSchema = z.object({
  studentNames: z.string().min(2, "Please enter at least one student name."),
  classId: z.string({ required_error: "Please select a class." }),
});

export default function AddStudentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof addStudentsSchema>>({
    resolver: zodResolver(addStudentsSchema),
    defaultValues: {
      studentNames: "",
    },
  });

  useEffect(() => {
    async function loadClasses() {
      setIsLoading(true);
      try {
        const classesData = await getClasses();
        setClasses(classesData);
      } catch (error) {
        console.error("Failed to load classes", error);
        toast({
          title: "Error",
          description: "Failed to load classes.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadClasses();
  }, [toast]);

  const onSubmit = async (values: z.infer<typeof addStudentsSchema>) => {
    // Split names by newline and filter out any empty lines or just whitespace
    const studentNames = values.studentNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (studentNames.length === 0) {
      toast({
        title: "No names entered",
        description: "Please enter at least one student name.",
        variant: "destructive",
      });
      return;
    }

    const result = await addMultipleStudents(studentNames, values.classId);
    if (result.success) {
      toast({
        title: "Success!",
        description: `${studentNames.length} students have been added.`,
      });
      form.reset();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <main className="flex justify-center items-start min-h-screen bg-background p-4 sm:p-6 md:p-10">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-4">
             <Link href="/">
                <Button variant="ghost" size="icon">
                    <ArrowLeft />
                </Button>
            </Link>
            <div>
              <CardTitle>Add Multiple Students</CardTitle>
              <CardDescription>
                Select a class and paste a list of student names (one per line).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoading ? "Loading classes..." : "Select a class"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studentNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Names</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g.&#10;John Doe&#10;Jane Smith&#10;Peter Jones"
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Users className="mr-2" />}
                  Add Students
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
