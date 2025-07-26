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
});

const GenerateConsolidatedReportInputSchema = z.object({
  reportData: z.array(ReportRowSchema).describe("An array of student report data."),
  subjectHeaders: z.array(z.string()).describe("An array of subject names for the table header."),
});
export type GenerateConsolidatedReportInput = z.infer<typeof GenerateConsolidatedReportInputSchema>;

const GenerateConsolidatedReportOutputSchema = z.object({
  message: z.string().describe('The formatted report message for WhatsApp.'),
});
export type GenerateConsolidatedReportOutput = z.infer<typeof GenerateConsolidatedReportOutputSchema>;


export async function generateConsolidatedReport(input: GenerateConsolidatedReportInput): Promise<GenerateConsolidatedReportOutput> {
  // Sort reportData by studentName in ascending order
  const sortedReportData = [...input.reportData].sort((a, b) => a.studentName.localeCompare(b.studentName));
  return generateConsolidatedReportFlow({ ...input, reportData: sortedReportData });
}

const prompt = ai.definePrompt({
  name: 'generateConsolidatedReportPrompt',
  input: {schema: GenerateConsolidatedReportInputSchema},
  output: {schema: GenerateConsolidatedReportOutputSchema},
  prompt: `You are an expert at formatting data for plain text messaging apps like WhatsApp.
Your task is to convert the following JSON data into a clean, readable, fixed-width table format.

**Data:**
Report Data: {{{json reportData}}}
Subject Headers: {{{json subjectHeaders}}}

**Instructions:**
1. Create a header row with "Student Name", "Class", and then each subject from the subjectHeaders array.
2. For each student in the reportData array, create a row with their name, class, and marks for each subject.
3. If a student's mark for a subject is missing, display it as '-'.
4. Ensure the columns are properly aligned to form a neat table. Use spaces to pad the columns.
5. The entire output should be a single string, with newlines separating the rows. Do not include any other text, just the formatted table.

Example Output Format:

Student Name   | Class | Math | English | Science
-------------------------------------------------
Rahul Sharma   | 6th   | 85   | 92      | 78
Priya Joshi    | 6th   | 95   | 88      | 91
... and so on.

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
