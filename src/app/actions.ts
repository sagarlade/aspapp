'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';

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
        
        // Check if a document for this class and subject already exists
        const q = query(
            marksCollection,
            where("classId", "==", data.classId),
            where("subjectId", "==", data.subjectId)
        );

        const querySnapshot = await getDocs(q);
        
        const docData = {
            classId: data.classId,
            subjectId: data.subjectId,
            marks: data.marks,
            lastUpdated: serverTimestamp(),
        };

        if (querySnapshot.empty) {
            // Create a new document
            await addDoc(marksCollection, docData);
        } else {
            // Update the existing document
            const docId = querySnapshot.docs[0].id;
            await setDoc(doc(db, 'marks', docId), docData, { merge: true });
        }
        
        return { success: true, message: "Marks have been saved successfully!" };
    } catch (error) {
        console.error("Error saving marks:", error);
        return { success: false, message: "An error occurred while saving marks." };
    }
}
