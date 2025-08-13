// src/components/student-report-card.tsx
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportRow, ReportCardSummary } from '@/app/dashboard/report/page';
import type { Subject } from '@/lib/data';
import { format } from "date-fns";

interface StudentReportCardProps {
    student: ReportRow;
    allSubjects: Subject[];
    summary: ReportCardSummary | null;
    isSummaryLoading: boolean;
}

const GradeScale = [
    { grade: 'A1', range: '91-100' },
    { grade: 'A2', range: '81-90' },
    { grade: 'B1', range: '71-80' },
    { grade: 'B2', range: '61-70' },
    { grade: 'C1', range: '51-60' },
    { grade: 'C2', range: '41-50' },
    { grade: 'D', range: '33-40' },
    { grade: 'E', range: 'Below 33' },
];

export function StudentReportCard({ student, allSubjects, summary, isSummaryLoading }: StudentReportCardProps) {

    const allMarks = Object.values(student.marks).flat();
    const subjectMap = new Map(allSubjects.map(s => [s.id, s.name]));

    const marksBySubject = allMarks.reduce((acc, mark) => {
        const subjectName = subjectMap.get(mark.subjectId) || "Unknown Subject";
        if (!acc[subjectName]) {
            acc[subjectName] = [];
        }
        acc[subjectName].push(mark);
        return acc;
    }, {} as Record<string, typeof allMarks>);


    const sortedSubjects = Object.keys(marksBySubject).sort((a,b) => a.localeCompare(b));
    const totalPossibleMarks = allMarks.reduce((acc, mark) => acc + mark.totalMarks, 0);
    const isPass = totalPossibleMarks > 0 && student.totalMarks / totalPossibleMarks >= 0.4;

    return (
        <Card className="w-full max-w-2xl mx-auto border-2 border-primary/50 font-sans bg-white p-2 text-black">
            <CardHeader className="text-center p-4">
                <div className="text-lg font-bold">Radhakrushna Gramvikas Krushi va Sanshodhan Sanstha, Ajanale</div>
                <div className="text-2xl font-bold text-primary">Abhinav Public School, Ajanale</div>
                <CardDescription className="text-black">ACADEMIC SESSION: 2025-2026</CardDescription>
                <CardTitle className="font-headline text-3xl text-primary pt-2">REPORT BOOK</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4 border p-2 rounded-md">
                    <div><strong>Student's Name:</strong> {student.studentName}</div>
                    <div><strong>Class:</strong> {student.className}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-bold mb-2 text-center">PART-1: SCHOLASTIC AREAS</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-black">Subject / Exam</TableHead>
                                    <TableHead className="text-center text-black">Marks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedSubjects.map((subjectName) => (
                                <React.Fragment key={subjectName}>
                                    <TableRow>
                                        <TableCell colSpan={2} className="font-bold bg-muted/50 p-2 text-black">{subjectName}</TableCell>
                                    </TableRow>
                                    {marksBySubject[subjectName].map((mark, index) => {
                                        const examDisplayName = mark.examDate 
                                            ? `${mark.examName} (${format(new Date(mark.examDate), 'dd MMM yy')})`
                                            : mark.examName;
                                        return (
                                            <TableRow key={`${subjectName}-${index}`}>
                                                <TableCell className="pl-6 text-slate-600">{examDisplayName}</TableCell>
                                                <TableCell className="text-center font-mono text-black">{`${mark.value} / ${mark.totalMarks}`}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <div>
                        <h3 className="font-bold mb-2 text-center">Grading Scale</h3>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead className="text-black">Marks Range</TableHead>
                                    <TableHead className="text-right text-black">Grade</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {GradeScale.map(g => (
                                    <TableRow key={g.grade}>
                                        <TableCell className="text-black">{g.range}</TableCell>
                                        <TableCell className="text-right font-mono text-black">{g.grade}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <div className="mt-4 border rounded-lg p-3 space-y-2">
                             <h3 className="font-bold">Principal's Comment:</h3>
                             {isSummaryLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[90%]" />
                                    <Skeleton className="h-4 w-[80%]" />
                                    <Skeleton className="h-4 w-[85%]" />
                                </div>
                             ) : (
                                <p className="text-sm italic text-slate-700">
                                    {summary?.comment ?? "No comment available."}
                                 </p>
                             )}
                         </div>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-between items-center bg-primary/10 rounded-b-lg p-4 font-bold text-black">
                <div>Result: <span className={isPass ? 'text-green-600' : 'text-red-600'}>
                     {isPass ? "PASS" : "FAIL"}
                </span>
                </div>
                <div>Total: <span className="font-mono text-lg">{student.totalMarks} / {totalPossibleMarks > 0 ? totalPossibleMarks : 'N/A'}</span></div>
            </CardFooter>
        </Card>
    );
}
