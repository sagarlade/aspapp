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
  rankDisplay: z.string().describe('The formatted rank of the student (e.g., "4.  ").'),
});

const TopScorerSchema = z.object({
    name: z.string().describe('The name of the top-scoring student.')
});

const GenerateWhatsappSummaryInputSchema = z.object({
  className: z.string().describe('The name of the class.'),
  subjectName: z.string().describe('The name of the subject.'),
  totalMarks: z.number().describe('The total possible marks for the exam.'),
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
  topScorers: z.array(TopScorerSchema).describe('A list of students who achieved the maximum score.'),
  topScore: z.number().describe('The maximum score achieved by any student.'),
  totalMarks: z.number().describe('The total possible marks for the exam.'),
  otherStudents: z.array(StudentWithRankSchema).describe('The list of remaining students, ranked.'),
  totalStudents: z.number().describe('The total number of students in the report.'),
});


const GenerateWhatsappSummaryOutputSchema = z.object({
  message: z.string().describe('The formatted message for WhatsApp.'),
});
export type GenerateWhatsappSummaryOutput = z.infer<typeof GenerateWhatsappSummaryOutputSchema>;

export async function generateWhatsappSummary(input: GenerateWhatsappSummaryInput): Promise<GenerateWhatsappSummaryOutput> {
  const sortedStudents = [...input.students].sort((a, b) => b.marks - a.marks);
  
  const topScore = sortedStudents.length > 0 ? sortedStudents[0].marks : 0;

  const topScorers = sortedStudents
    .filter(s => s.marks === topScore)
    .map(s => ({ name: s.name }));

  const otherStudents = sortedStudents
    .filter(s => s.marks < topScore)
    .map((student, index) => {
        // Rank starts after the top scorers
        const rank = topScorers.length + index + 1;
        let rankDisplay = `${rank}.`.padEnd(4, ' ');
        return {
            ...student,
            rankDisplay,
        };
    });
    
  const today = new Date();
  const dateString = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return generateWhatsappSummaryFlow({ 
      ...input, 
      date: dateString, 
      topScore,
      topScorers,
      otherStudents,
      totalStudents: sortedStudents.length 
  });
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
Top Scorers: {{{json topScorers}}}
Top Score: {{{topScore}}}
Total Marks: {{{totalMarks}}}
Other Students: {{{json otherStudents}}}
Total Students: {{{totalStudents}}}

**Instructions:**
1.  Start with the school name and date, each on a new line and formatted with asterisks for bolding.
2.  Use hyphens to create separator lines.
3.  Add a header for the class and subject.
4.  If there are top scorers, create a "Top Scorers" section. List their names under a heading like "Top Scorers (score/total):".
5.  Create a header row for the remaining students: "Rank | Student Name | Marks".
6.  For each student in 'otherStudents', create a row with their pre-formatted rank, name, and marks.
7.  Ensure the columns are properly aligned to form a neat table. Use spaces for padding.
8.  At the end, add a line for the total number of students.
9.  The entire output should be a single string with newlines.

**Formatted Output:**
\`\`\`
*Abhinav Public School Ajanale*
*Date:* {{{date}}}
---------------------------------
*Marks Summary*
*Class:* {{{className}}}
*Subject:* {{{subjectName}}}
---------------------------------
{{#if topScorers}}
*Top Scorers ({{{topScore}}}/{{{totalMarks}}}):*
{{#each topScorers}}
{{name}}
{{/each}}
---------------------------------
{{/if}}
*Rank | Student Name | Marks*
---------------------------------
{{#each otherStudents}}
{{rankDisplay}} | {{name}} | {{marks}}
{{/each}}
---------------------------------
*Total Students:* {{{totalStudents}}}
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
