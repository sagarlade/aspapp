// src/ai/flows/generate-whatsapp-summary.ts
'use server';

/**
 * @fileOverview Generates a WhatsApp-formatted summary of student marks for a given class and subject.
 *
 * - generateWhatsappSummary - A function that generates the WhatsApp summary.
 * - GenerateWhatsappSummaryInput - The input type for the generateWhatsappsummary function.
 * - GenerateWhatsappSummaryOutput - The return type for the generateWhatsappSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StudentWithRankSchema = z.object({
  name: z.string().describe('The name of the student.'),
  marks: z.number().describe('The marks obtained by the student.'),
  rankDisplay: z.string().describe('The formatted rank of the student (e.g., "🏆1.", "4.  ").'),
});

const GenerateWhatsappSummaryInputSchema = z.object({
  className: z.string().describe('The name of the class.'),
  subjectName: z.string().describe('The name of the subject.'),
  students: z.array(
    z.object({
      name: z.string().describe('The name of the student.'),
      marks: z.number().describe('The marks obtained by the student.'),
    })
  ).describe('An array of student objects with their names and marks.'),
});
export type GenerateWhatsappSummaryInput = z.infer<typeof GenerateWhatsappSummaryInputSchema>;


const GenerateWhatsappSummaryInternalInputSchema = z.object({
  className: z.string(),
  subjectName: z.string(),
  date: z.string().describe('The date the report was generated.'),
  students: z.array(StudentWithRankSchema),
});


const GenerateWhatsappSummaryOutputSchema = z.object({
  message: z.string().describe('The formatted message for WhatsApp.'),
});
export type GenerateWhatsappSummaryOutput = z.infer<typeof GenerateWhatsappSummaryOutputSchema>;

export async function generateWhatsappSummary(input: GenerateWhatsappSummaryInput): Promise<GenerateWhatsappSummaryOutput> {
  // Sort students by marks in descending order and add a rank
  const sortedStudents = [...input.students]
    .sort((a, b) => b.marks - a.marks)
    .map((student, index) => {
        const rank = index + 1;
        let rankDisplay;
        if (rank <= 3) {
            rankDisplay = `🏆${rank}.`;
        } else {
            // Pad with spaces to align with the double-digit ranks
            rankDisplay = `${rank}.`.padEnd(4, ' ');
        }
        return {
            ...student,
            rankDisplay,
        };
    });
    
  const today = new Date();
  const dateString = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return generateWhatsappSummaryFlow({ ...input, students: sortedStudents, date: dateString });
}

const prompt = ai.definePrompt({
  name: 'generateWhatsappSummaryPrompt',
  input: {schema: GenerateWhatsappSummaryInternalInputSchema},
  output: {schema: GenerateWhatsappSummaryOutputSchema},
  prompt: `You are an expert at formatting data for plain text messaging apps like WhatsApp.
Your task is to convert the following JSON data into a clean, readable, monospaced format.

**Data:**
School Name: Abhinav Public School Ajanale
Date: {{{date}}}
Class Name: {{{className}}}
Subject Name: {{{subjectName}}}
Students: {{{json students}}}

**Instructions:**
1.  Start with the school name and date, each on a new line and formatted with asterisks for bolding.
2.  Use hyphens to create separator lines.
3.  Create a header row: "Rank | Student Name | Marks".
4.  For each student, create a row with their pre-formatted rank, name, and marks.
5.  Ensure the columns are properly aligned to form a neat table. Use spaces for padding.
6.  The entire output should be a single string with newlines.

**Formatted Output:**
\`\`\`
*Abhinav Public School Ajanale*
*Date:* {{{date}}}
---------------------------------
*Marks Summary*
*Class:* {{{className}}}
*Subject:* {{{subjectName}}}
---------------------------------
*Rank | Student Name | Marks*
---------------------------------
{{#each students}}
{{rankDisplay}} | {{name}} | {{marks}}
{{/each}}
---------------------------------
\`\`\`
`,
});

const generateWhatsappSummaryFlow = ai.defineFlow(
  {
    name: 'generateWhatsappSummaryFlow',
    inputSchema: GenerateWhatsappSummaryInternalInputSchema,
    outputSchema: GenerateWhatsappSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
