// src/app/dashboard/report/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useRef } from "react";
import { Loader2, ArrowLeft, Share2, Camera } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getAllMarks, getClasses, getSubjects, seedInitialData } from "@/lib/data";
import type { Class, Subject } from "@/lib/data";
import { generateConsolidatedReport } from "@/ai/flows/generate-consolidated-report";
import { useAuth } from "@/components/auth-provider";

interface ReportRow {
  studentId: string;
  studentName: string;
  className: string;
  marks: { [subjectName: string]: number | string };
}

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, startShareTransition] = useTransition();
  const [isGeneratingImage, startImageTransition] = useTransition();
  const { toast } = useToast();
  const tableRef = useRef<HTMLTableElement>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // This function will run once when the user is authenticated.
    const runSeed = async () => {
      if(user) {
        const result = await seedInitialData();
        console.log(result.message);
      }
    };
    runSeed();
  }, [user]);

  useEffect(() => {
    async function getReportData() {
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
            
            const studentDataMap = new Map<string, {name: string, className: string, marks: {[key: string]: number | string}}>();
            
            for (const markDoc of marksDocs) {
                const className = classMap.get(markDoc.classId) || "Unknown Class";
                
                for (const studentMark of markDoc.marks) {
                    if (studentMark.marks !== null) {
                        const studentId = studentMark.studentId;
                        const subjectName = subjectMap.get(markDoc.subjectId) || "Unknown Subject";

                        if (!studentDataMap.has(studentId)) {
                            studentDataMap.set(studentId, {
                                name: studentMark.studentName,
                                className: className,
                                marks: {}
                            });
                        }

                        const studentEntry = studentDataMap.get(studentId)!;
                        studentEntry.marks[subjectName] = studentMark.marks;
                    }
                }
            }
            
            const formattedData: ReportRow[] = Array.from(studentDataMap.entries()).map(([studentId, data]) => ({
                studentId: studentId,
                studentName: data.name,
                className: data.className,
                marks: data.marks
            }));
            
            formattedData.sort((a,b) => a.studentName.localeCompare(b.studentName));
            
            setReportData(formattedData);
            setAllSubjects(subjects);
        } catch(error) {
            console.error("Error fetching report data", error);
            toast({
                title: "Error",
                description: "Failed to load report data. Please check your connection and permissions.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }
    getReportData();
  }, [toast, user, authLoading]);
  

  const subjectHeaders = allSubjects.map(s => s.name);

  const handleShare = () => {
    startShareTransition(async () => {
      if (reportData.length === 0) {
        toast({
          title: "No data to share",
          description: "There is no report data to share.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const result = await generateConsolidatedReport({ reportData, subjectHeaders });
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
      if (!tableRef.current || reportData.length === 0) {
        toast({
          title: "No data to share",
          description: "The report table is empty.",
          variant: "destructive",
        });
        return;
      }

      try {
        const canvas = await html2canvas(tableRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
        });
        
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
                A consolidated report of all student marks across all classes and subjects.
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
                    <TableHead key={subjectName} className="text-right">{subjectName}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length > 0 ? (
                  reportData.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">{row.studentName}</TableCell>
                      <TableCell>{row.className}</TableCell>
                      {subjectHeaders.map(subjectName => (
                         <TableCell key={subjectName} className="text-right font-mono">
                            {row.marks[subjectName] ?? '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={subjectHeaders.length + 2} className="text-center h-48 text-muted-foreground">
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
    </main>
  );
}
