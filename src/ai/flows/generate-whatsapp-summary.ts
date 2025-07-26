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

const GenerateWhatsappSummaryOutputSchema = z.object({
  message: z.string().describe('The formatted message for WhatsApp.'),
});
export type GenerateWhatsappSummaryOutput = z.infer<typeof GenerateWhatsappSummaryOutputSchema>;

export async function generateWhatsappSummary(input: GenerateWhatsappSummaryInput): Promise<GenerateWhatsappSummaryOutput> {
  // Sort students by marks in descending order
  const sortedStudents = [...input.students].sort((a, b) => b.marks - a.marks);
  return generateWhatsappSummaryFlow({ ...input, students: sortedStudents });
}

const prompt = ai.definePrompt({
  name: 'generateWhatsappSummaryPrompt',
  input: {schema: GenerateWhatsappSummaryInputSchema},
  output: {schema: GenerateWhatsappSummaryOutputSchema},
  prompt: `🏫 Class: {{{className}}}  📘 Subject: {{{subjectName}}}\n---------------------------------\n🏆 Marks Summary (Top to Bottom):\n\nNo.  Student Name       Marks\n-------------------------------------\n{{#each students}}
{{add @index 1}}.   {{name}}         {{marks}}\n{{/each}}
-------------------------------------\n✅ Total: {{students.length}} students`,
});

const generateWhatsappSummaryFlow = ai.defineFlow(
  {
    name: 'generateWhatsappSummaryFlow',
    inputSchema: GenerateWhatsappSummaryInputSchema,
    outputSchema: GenerateWhatsappSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
