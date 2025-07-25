// src/ai/flows/generate-whatsapp-summary.ts
'use server';

/**
 * @fileOverview Generates a WhatsApp-formatted summary of student marks for a given class and subject.
 *
 * - generateWhatsappSummary - A function that generates the WhatsApp summary.
 * - GenerateWhatsappSummaryInput - The input type for the generateWhatsappSummary function.
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
      status: z.string().describe('The pass/fail status of the student.'),
    })
  ).describe('An array of student objects with their names, marks, and pass/fail status.'),
});
export type GenerateWhatsappSummaryInput = z.infer<typeof GenerateWhatsappSummaryInputSchema>;

const GenerateWhatsappSummaryOutputSchema = z.object({
  message: z.string().describe('The formatted message for WhatsApp.'),
});
export type GenerateWhatsappSummaryOutput = z.infer<typeof GenerateWhatsappSummaryOutputSchema>;

export async function generateWhatsappSummary(input: GenerateWhatsappSummaryInput): Promise<GenerateWhatsappSummaryOutput> {
  return generateWhatsappSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWhatsappSummaryPrompt',
  input: {schema: GenerateWhatsappSummaryInputSchema},
  output: {schema: GenerateWhatsappSummaryOutputSchema},
  prompt: `🏫 Class: {{{className}}}  📘 Subject: {{{subjectName}}}\n---------------------------------\n👨‍🏫 Marks Summary:\n\nNo.  Student Name       Marks  Status\n-------------------------------------\n{{#each students}}
{{@index}}.   {{name}}         {{marks}}     {{status}}\n{{/each}}
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
