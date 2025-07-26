// src/app/actions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, serverTimestamp, runTransaction } from 'firebase/firestore';

interface StudentMarkData {
    studentId: string;
    studentName: string;
    marks: number | null;
    status: string;
}

export async function saveMarks(data: { classId: string; subjectId: string; marks: StudentMarkData[] }) {
    console.log("Saving marks to Firestore:", data);

    if (!data.classId || !data.subjectId) {
        return { success: false, message: "Class and subject must be selected." };
    }

    // Filter out students with no marks entered.
    const marksToSave = data.marks.filter(m => m.marks !== null && m.marks >= 0).map(m => ({
        ...m,
        marks: Number(m.marks) // Ensure marks are numbers
    }));

    // If there's nothing to save after filtering, we can consider it a success.
    if (marksToSave.length === 0) {
        return { success: true, message: "No new marks to save." };
    }

    try {
        const marksCollectionRef = collection(db, 'marks');
        
        // The document ID is a combination of classId and subjectId to ensure uniqueness.
        const docId = `${data.classId}_${data.subjectId}`;
        const docRef = doc(marksCollectionRef, docId);

        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);

            if (!docSnapshot.exists()) {
                // If the document doesn't exist, create it with the initial set of marks.
                transaction.set(docRef, {
                    classId: data.classId,
                    subjectId: data.subjectId,
                    marks: marksToSave,
                    lastUpdated: serverTimestamp(),
                });
                console.log("No existing document found. Creating a new one.");
            } else {
                // If the document exists, merge new marks with existing marks.
                const existingMarks = docSnapshot.data().marks || [];
                const marksMap = new Map(existingMarks.map((m: any) => [m.studentId, m]));

                // Update the map with the new marks.
                marksToSave.forEach(newMark => {
                    marksMap.set(newMark.studentId, newMark);
                });
                
                const updatedMarks = Array.from(marksMap.values());

                transaction.update(docRef, {
                    marks: updatedMarks,
                    lastUpdated: serverTimestamp(),
                });
                console.log(`Existing document found (${docId}). Updating.`);
            }
        });

        return { success: true, message: "Marks have been saved successfully!" };
    } catch (error) {
        console.error("Error saving marks:", error);
        // It's helpful to know if the error is a permission issue.
        if (error instanceof Error && 'code' in error && (error as any).code === 'permission-denied') {
             return { success: false, message: "Permission denied. Make sure you are logged in and your Firestore rules are set correctly." };
        }
        return { success: false, message: "An error occurred while saving marks." };
    }
}
