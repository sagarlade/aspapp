// src/app/dashboard/report/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getAllMarks, getClasses, getSubjects } from "@/lib/data";

interface ReportData {
  studentName: string;
  className: string;
  subjectName: string;
  marks: number;
}

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [allMarks, classes, subjects] = await Promise.all([
          getAllMarks(),
          getClasses(),
          getSubjects(),
        ]);

        const classMap = new Map(classes.map((c) => [c.id, c.name]));
        const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

        const formattedData: ReportData[] = [];
        allMarks.forEach((markEntry: any) => {
          const className = classMap.get(markEntry.classId) || "Unknown Class";
          const subjectName = subjectMap.get(markEntry.subjectId) || "Unknown Subject";
          if (markEntry.marks) {
            markEntry.marks.forEach((studentMark: any) => {
              if (studentMark.marks !== null) {
                formattedData.push({
                  studentName: studentMark.studentName,
                  className,
                  subjectName,
                  marks: studentMark.marks,
                });
              }
            });
          }
        });
        
        // Sort by student name, then class, then subject
        formattedData.sort((a, b) => {
            if (a.studentName < b.studentName) return -1;
            if (a.studentName > b.studentName) return 1;
            if (a.className < b.className) return -1;
            if (a.className > b.className) return 1;
            if (a.subjectName < b.subjectName) return -1;
            if (a.subjectName > b.subjectName) return 1;
            return 0;
        });

        setReportData(formattedData);
      } catch (error) {
        console.error("Failed to load report data", error);
        toast({
          title: "Error",
          description: "Failed to load report data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex justify-center items-start min-h-screen bg-background p-4 sm:p-6 md:p-10">
      <Card className="w-full max-w-6xl shadow-xl">
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
                A complete report of all student marks across all classes and subjects.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length > 0 ? (
                  reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.studentName}</TableCell>
                      <TableCell>{row.className}</TableCell>
                      <TableCell>{row.subjectName}</TableCell>
                      <TableCell className="text-right font-mono">{row.marks}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-48 text-muted-foreground">
                      No marks have been saved yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
