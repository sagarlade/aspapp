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
  rankDisplay: z.string().describe('The formatted rank of the student (e.g., "1. ", "4.  ").'),
});

const TopRankerSchema = z.object({
    name: z.string(),
    marks: z.number(),
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
  rankedStudents: z.array(StudentWithRankSchema).describe('The list of students, ranked and formatted.'),
  topRankers: z.array(TopRankerSchema).describe('The list of the top 3 students.'),
  totalStudents: z.number().describe('The total number of students in the report.'),
});


const GenerateWhatsappSummaryOutputSchema = z.object({
  message: z.string().describe('The formatted message for WhatsApp.'),
});
export type GenerateWhatsappSummaryOutput = z.infer<typeof GenerateWhatsappSummaryOutputSchema>;

export async function generateWhatsappSummary(input: GenerateWhatsappSummaryInput): Promise<GenerateWhatsappSummaryOutput> {
  const sortedStudents = [...input.students].sort((a, b) => b.marks - a.marks);
  
  const rankedStudents = sortedStudents.map((student, index) => {
    const rank = index + 1;
    let rankDisplay = `${rank}.`.padEnd(4, ' ');
    if (rank <= 3) {
      rankDisplay = `${rank}.`.padEnd(5, ' ');
    }
    return {
      ...student,
      rankDisplay,
    };
  });
  
  const topRankers = sortedStudents.slice(0, 3).map(student => ({
      name: student.name,
      marks: student.marks
  }));
    
  const today = new Date();
  const dateString = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return generateWhatsappSummaryFlow({ 
      className: input.className,
      subjectName: input.subjectName,
      date: dateString, 
      rankedStudents,
      topRankers,
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
Top Rankers: {{{json topRankers}}}
Ranked Students: {{{json rankedStudents}}}
Total Students: {{{totalStudents}}}

**Instructions:**
1.  Start with the school name and date, each on a new line and formatted with asterisks for bolding.
2.  Use hyphens to create separator lines.
3.  Add a header for the class and subject.
4.  After the subject, list the "Top Rankers". For each top ranker, show their name and marks. Make the marks bold.
5.  Create a header row for all students: "*Rank | Student Name | Marks*".
6.  For each student in 'rankedStudents', create a row with their pre-formatted rank, name, and marks. Ensure the columns are properly aligned. Make the marks bold.
7.  At the end, add a line for the total number of students.
8.  The entire output should be a single string with newlines.

**Formatted Output:**
\`\`\`
*Abhinav Public School Ajanale*
*Date:* {{{date}}}
---------------------------------
*Marks Summary*
*Class:* {{{className}}}
*Subject:* {{{subjectName}}}

*Top Rankers:*
{{#each topRankers}}
- {{name}} (*{{marks}}*)
{{/each}}
---------------------------------
*Rank | Student Name | Marks*
---------------------------------
{{#each rankedStudents}}
{{{rankDisplay}}} | {{name}} | *{{marks}}*
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
