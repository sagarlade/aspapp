// src/ai/flows/generate-consolidated-report.ts
'use server';

/**
 * @fileOverview Generates a WhatsApp-formatted consolidated report of student marks.
 *
 * - generateConsolidatedReport - A function that generates the WhatsApp report.
 * - GenerateConsolidatedReportInput - The input type for the function.
 * - GenerateConsolidatedReportOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReportRowSchema = z.object({
  studentName: z.string(),
  className: z.string(),
  marks: z.record(z.union([z.number(), z.string()])),
  totalMarks: z.number().describe("The student's total marks across all subjects."),
});

const GenerateConsolidatedReportInputSchema = z.object({
  reportData: z.array(ReportRowSchema).describe("An array of student report data, sorted by totalMarks descending."),
  subjectHeaders: z.array(z.string()).describe("An array of subject names for the table header."),
  schoolName: z.string().describe("The name of the school to be included at the top of the report."),
  reportTitle: z.string().describe("The title of the report, e.g., 'Consolidated Marks Report'."),
});
export type GenerateConsolidatedReportInput = z.infer<typeof GenerateConsolidatedReportInputSchema>;

const GenerateConsolidatedReportOutputSchema = z.object({
  message: z.string().describe('The formatted report message for WhatsApp.'),
});
export type GenerateConsolidatedReportOutput = z.infer<typeof GenerateConsolidatedReportOutputSchema>;


export async function generateConsolidatedReport(input: GenerateConsolidatedReportInput): Promise<GenerateConsolidatedReportOutput> {
  // The data is already sorted by the client, so we can just call the flow.
  return generateConsolidatedReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateConsolidatedReportPrompt',
  input: {schema: GenerateConsolidatedReportInputSchema},
  output: {schema: GenerateConsolidatedReportOutputSchema},
  prompt: `You are an expert at formatting data for plain text messaging apps like WhatsApp using a monospaced font.
Your task is to convert the following JSON data into a clean, readable, fixed-width table format with text-based borders. The data is already sorted by total marks, descending.

**Data:**
School Name: {{{schoolName}}}
Report Title: {{{reportTitle}}}
Report Data: {{{json reportData}}}
Subject Headers: {{{json subjectHeaders}}}

**Instructions:**
1.  Start with the school name and report title, centered if possible or left-aligned.
2.  Create a header row with "Student Name", "Class", each subject from the subjectHeaders array, and finally "Total".
3.  Create a separator line using '+', '-', and '|' characters.
4.  For each student in the reportData array, create a row with their name, class, marks for each subject, and their total marks, enclosed in '|'.
5.  If a student's mark for a subject is missing, display it as '-'.
6.  Ensure the columns are properly aligned to form a neat table. Use spaces to pad the columns to achieve a fixed-width layout.
7.  The entire output should be a single string, with newlines separating the rows. Wrap the entire table in backticks to ensure monospaced formatting.

Example Output Format:
\`\`\`
Abhinav Public School Ajanale
Consolidated Marks Report
+----------------+-------+------+---------+-------+
| Student Name   | Class | Math | English | Total |
+----------------+-------+------+---------+-------+
| Priya Joshi    | 6th   | 95   | 88      | 183   |
| Rahul Sharma   | 6th   | 85   | 92      | 177   |
+----------------+-------+------+---------+-------+
\`\`\`

Now, format the provided data.`,
});


const generateConsolidatedReportFlow = ai.defineFlow(
  {
    name: 'generateConsolidatedReportFlow',
    inputSchema: GenerateConsolidatedReportInputSchema,
    outputSchema: GenerateConsolidatedReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
