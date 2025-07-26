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

    try {
        const marksCollection = collection(db, 'marks');
        
        const q = query(
            marksCollection,
            where("classId", "==", data.classId),
            where("subjectId", "==", data.subjectId)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // Create a new document if it doesn't exist
            const docData = {
                classId: data.classId,
                subjectId: data.subjectId,
                marks: data.marks,
                lastUpdated: serverTimestamp(),
            };
            await addDoc(marksCollection, docData);
        } else {
            // Update the existing document
            const docId = querySnapshot.docs[0].id;
            const updateData = {
                marks: data.marks,
                lastUpdated: serverTimestamp(),
            };
            await updateDoc(doc(db, 'marks', docId), updateData);
        }
        
        return { success: true, message: "Marks have been saved successfully!" };
    } catch (error) {
        console.error("Error saving marks:", error);
        return { success: false, message: "An error occurred while saving marks." };
    }
}
