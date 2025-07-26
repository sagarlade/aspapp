// src/app/actions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, serverTimestamp, runTransaction, setDoc } from 'firebase/firestore';
import { seedInitialData as seedData } from '@/lib/data';

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

    const marksToSave = data.marks.filter(m => m.marks !== null && m.marks >= 0).map(m => ({
        ...m,
        marks: Number(m.marks)
    }));

    if (marksToSave.length === 0) {
        return { success: true, message: "No valid marks to save." };
    }

    try {
        const marksCollectionRef = collection(db, 'marks');
        const q = query(
            marksCollectionRef,
            where("classId", "==", data.classId),
            where("subjectId", "==", data.subjectId)
        );

        await runTransaction(db, async (transaction) => {
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                // Document doesn't exist, create it.
                const newDocRef = doc(marksCollectionRef);
                transaction.set(newDocRef, {
                    classId: data.classId,
                    subjectId: data.subjectId,
                    marks: marksToSave,
                    lastUpdated: serverTimestamp(),
                });
                console.log("No existing document found. Creating a new one.");
            } else {
                // Document exists, update it.
                const docId = querySnapshot.docs[0].id;
                const docRef = doc(db, 'marks', docId);
                const docSnapshot = await transaction.get(docRef);

                if (!docSnapshot.exists()) {
                    throw "Document does not exist!";
                }

                // Merge new marks with existing marks
                const existingMarks = docSnapshot.data().marks || [];
                const marksMap = new Map(existingMarks.map((m: any) => [m.studentId, m]));

                marksToSave.forEach(newMark => {
                    marksMap.set(newMark.studentId, newMark);
                });
                console.log("Marks to save:", marksToSave);
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
        return { success: false, message: "An error occurred while saving marks." };
    }
}


export async function seedInitialData() {
    return await seedData();
}
