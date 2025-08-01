// src/ai/flows/generate-report-card-summary.ts
'use server';

/**
 * @fileOverview Generates a personalized summary and comment for a student's report card.
 *
 * - generateReportCardSummary - A function that generates the summary.
 * - GenerateReportCardSummaryInput - The input type for the function.
 * - GenerateReportCardSummaryOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MarkDetailSchema = z.object({
    examName: z.string(),
    value: z.number(),
    totalMarks: z.number(),
});

const SubjectMarksSchema = z.record(z.array(MarkDetailSchema));

const GenerateReportCardSummaryInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  className: z.string().describe('The class of the student.'),
  marks: SubjectMarksSchema.describe("An object where keys are subject names and values are arrays of marks for different exams."),
  totalMarksScored: z.number().describe("The total marks scored by the student across all subjects and exams."),
});
export type GenerateReportCardSummaryInput = z.infer<typeof GenerateReportCardSummaryInputSchema>;


const GenerateReportCardSummaryOutputSchema = z.object({
  comment: z.string().describe("A personalized, constructive comment for the student in 2-3 sentences. Address the student by name. Mention areas of strength and areas for improvement. Maintain a positive and encouraging tone."),
  whatsappMessage: z.string().describe("A concise WhatsApp message for the parent, summarizing the student's performance and mentioning that the full report card is available."),
});
export type GenerateReportCardSummaryOutput = z.infer<typeof GenerateReportCardSummaryOutputSchema>;


export async function generateReportCardSummary(input: GenerateReportCardSummaryInput): Promise<GenerateReportCardSummaryOutput> {
  return generateReportCardSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportCardSummaryPrompt',
  input: {schema: GenerateReportCardSummaryInputSchema},
  output: {schema: GenerateReportCardSummaryOutputSchema},
  prompt: `You are an experienced and encouraging school principal writing a summary for a student's report card.
You will be provided with a student's marks in JSON format.

**Student Details:**
Name: {{{studentName}}}
Class: {{{className}}}
Marks Data: {{{json marks}}}
Total Scored: {{{totalMarksScored}}}

**Your Tasks:**

1.  **Write a personalized comment for the report card:**
    *   Analyze the student's marks across all subjects.
    *   The comment should be 2-3 sentences long.
    *   Start by addressing the student by their name (e.g., "Dear {{{studentName}}},").
    *   Identify their strongest subjects and praise their performance in them.
    *   Gently point out one or two subjects where there is room for improvement.
    *   End with an encouraging and motivational sentence.
    *   The tone must be positive, supportive, and constructive.

2.  **Write a concise WhatsApp message for the parent:**
    *   Keep it brief and to the point.
    *   Start with a greeting and the student's name.
    *   Briefly summarize the performance (e.g., "has shown good progress," "excellent performance," "areas to focus on").
    *   Inform them that the detailed report card has been generated.
    *   Example: "Dear Parent, {{{studentName}}}'s report card is ready. They have performed very well in Science and Math. Please review the full report for details."

Now, generate the comment and the WhatsApp message based on the provided data.`,
});


const generateReportCardSummaryFlow = ai.defineFlow(
  {
    name: 'generateReportCardSummaryFlow',
    inputSchema: GenerateReportCardSummaryInputSchema,
    outputSchema: GenerateReportCardSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
