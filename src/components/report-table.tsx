// src/components/report-table.tsx
"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportRow } from '@/app/dashboard/report/page';

interface ReportTableProps {
    schoolName: string;
    reportTitle: string;
    subjectHeaders: string[];
    reportData: ReportRow[];
}

export function ReportTable({ schoolName, reportTitle, subjectHeaders, reportData }: ReportTableProps) {
    return (
        <div className="w-full bg-white text-black p-4 font-sans">
            <h1 className="text-2xl font-bold text-center">{schoolName}</h1>
            <h2 className="text-xl text-center mb-4">{reportTitle}</h2>
            <Table className="border border-black border-collapse">
                <TableHeader>
                    <TableRow>
                        <TableHead className="border border-black text-black font-bold text-center">Student Name</TableHead>
                        <TableHead className="border border-black text-black font-bold text-center">Class</TableHead>
                        {subjectHeaders.map(subjectName => (
                            <TableHead key={subjectName} className="border border-black text-black font-bold text-center">{subjectName}</TableHead>
                        ))}
                        <TableHead className="border border-black text-black font-bold text-center">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.map(row => (
                        <TableRow key={row.studentId}>
                            <TableCell className="border border-black text-black text-left">{row.studentName}</TableCell>
                            <TableCell className="border border-black text-black text-center">{row.className}</TableCell>
                            {subjectHeaders.map(subjectName => {
                                const marks = row.marks[subjectName]?.[0]?.value ?? '-'; // Using first exam mark for simplicity
                                return (
                                    <TableCell key={subjectName} className="border border-black text-black text-center">{marks}</TableCell>
                                );
                            })}
                            <TableCell className="border border-black text-black text-center font-bold">{row.totalMarks}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
