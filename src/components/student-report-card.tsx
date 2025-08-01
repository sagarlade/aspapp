// src/components/student-report-card.tsx
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportRow } from '@/app/dashboard/report/page';
import type { Subject } from '@/lib/data';
import { Separator } from '@/components/ui/separator';


interface StudentReportCardProps {
    student: ReportRow;
    subjects: Subject[];
}

export function StudentReportCard({ student, subjects }: StudentReportCardProps) {
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]));

    const allMarks = Object.values(student.marks).flat();

    const marksBySubject = allMarks.reduce((acc, mark) => {
        const subjectName = subjectMap.get(mark.subjectId) || "Unknown Subject";
        if (!acc[subjectName]) {
            acc[subjectName] = [];
        }
        acc[subjectName].push(mark);
        return acc;
    }, {} as Record<string, typeof allMarks>);

    const sortedSubjects = Object.keys(marksBySubject).sort((a,b) => a.localeCompare(b));

    return (
        <Card className="w-full max-w-md mx-auto border-2 border-primary/50 font-sans bg-white p-2">
            <CardHeader className="text-center bg-primary/10 rounded-t-lg p-4">
                <CardTitle className="font-headline text-2xl text-primary">Student Report Card</CardTitle>
                <CardDescription>Academic Year 2025-2026</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    <div><strong>Student:</strong> {student.studentName}</div>
                    <div><strong>Class:</strong> {student.className}</div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Subject / Exam</TableHead>
                            <TableHead className="text-center">Marks</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedSubjects.map((subjectName) => (
                           <React.Fragment key={subjectName}>
                             <TableRow>
                                <TableCell colSpan={3} className="font-bold bg-muted/50 p-2">{subjectName}</TableCell>
                             </TableRow>
                             {marksBySubject[subjectName].map((mark, index) => {
                                const passThreshold = mark.totalMarks * 0.4;
                                const isPass = Number(mark.value) >= passThreshold;
                                return (
                                    <TableRow key={`${subjectName}-${index}`}>
                                        <TableCell className="pl-6 text-muted-foreground">{mark.examName}</TableCell>
                                        <TableCell className="text-center font-mono">{`${mark.value} / ${mark.totalMarks}`}</TableCell>
                                        <TableCell className={`text-right font-semibold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                                            {isPass ? 'Pass' : 'Fail'}
                                        </TableCell>
                                    </TableRow>
                                );
                             })}
                           </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-primary/10 rounded-b-lg p-4 font-bold">
                <div>Total Marks</div>
                <div className="font-mono text-lg">{student.totalMarks}</div>
            </CardFooter>
        </Card>
    );
}
