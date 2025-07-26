// src/app/actions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';

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

    // Filter out students with null marks before saving.
    const validMarks = data.marks.filter(m => m.marks !== null);

    if (validMarks.length === 0) {
        return { success: true, message: "No marks to save." };
    }

    try {
        const marksCollection = collection(db, 'marks');
        
        const q = query(
            marksCollection,
            where("classId", "==", data.classId),
            where("subjectId", "==", data.subjectId)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // No existing document, so create a new one.
            console.log("No existing document found. Creating a new one.");
            await addDoc(marksCollection, {
                classId: data.classId,
                subjectId: data.subjectId,
                marks: validMarks,
                lastUpdated: serverTimestamp(),
            });
        } else {
            // Existing document found, so update it.
            const docId = querySnapshot.docs[0].id;
            console.log(`Existing document found (${docId}). Updating.`);
            await updateDoc(doc(db, 'marks', docId), {
                marks: validMarks,
                lastUpdated: serverTimestamp(),
            });
        }
        
        return { success: true, message: "Marks have been saved successfully!" };
    } catch (error) {
        console.error("Error saving marks:", error);
        return { success: false, message: "An error occurred while saving marks." };
    }
}
