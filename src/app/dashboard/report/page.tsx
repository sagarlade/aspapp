
// src/app/dashboard/report/page.tsx

import * as React from "react";
import { getAllMarks, getClasses, getSubjects } from "@/lib/data";
import ReportClientPage from "./report-client-page";
import type { Class, Subject } from "@/lib/data";

interface ReportRow {
  studentId: string;
  studentName: string;
  className: string;
  marks: { [subjectName: string]: number | string };
}

async function getReportData() {
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
  
  return {
      reportData: formattedData,
      allSubjects: subjects,
  };
}

export default async function ReportPage() {
  const { reportData, allSubjects } = await getReportData();

  return <ReportClientPage reportData={reportData} allSubjects={allSubjects} />;
}
