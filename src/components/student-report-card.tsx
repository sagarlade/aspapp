
// src/components/student-report-card.tsx
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportRow } from '@/app/dashboard/report/page';

interface StudentReportCardProps {
    student: ReportRow;
}

export function StudentReportCard({ student }: StudentReportCardProps) {
    const PASS_THRESHOLD = 40;
    const sortedMarks = Object.entries(student.marks).sort(([subjectA], [subjectB]) => subjectA.localeCompare(subjectB));

    return (
        <Card className="w-full max-w-md mx-auto border-2 border-primary/50 font-sans bg-white p-2">
            <CardHeader className="text-center bg-primary/10 rounded-t-lg p-4">
                <CardTitle className="font-headline text-2xl text-primary">Student Report Card</CardTitle>
                <CardDescription>Academic Year 2023-2024</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    <div><strong>Student:</strong> {student.studentName}</div>
                    <div><strong>Class:</strong> {student.className}</div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-center">Marks</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedMarks.map(([subject, mark]) => (
                            <TableRow key={subject}>
                                <TableCell className="font-medium">{subject}</TableCell>
                                <TableCell className="text-center font-mono">{String(mark.value)}</TableCell>
                                <TableCell className={`text-right font-semibold ${Number(mark.value) >= PASS_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
                                    {Number(mark.value) >= PASS_THRESHOLD ? 'Pass' : 'Fail'}
                                </TableCell>
                            </TableRow>
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
