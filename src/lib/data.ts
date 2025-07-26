// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, query, where, addDoc, doc, writeBatch, documentId, getCountFromServer, runTransaction, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';

export interface Class {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
}

export interface Mark {
    studentId: string;
    studentName: string;
    marks: number | null;
    status: string;
}

const defaultClasses: Omit<Class, 'id'>[] = [
    { name: 'Jr. KG' },
    { name: 'Sr. KG' },
    { name: '1st Standard' },
    { name: '2nd Standard' },
    { name: '3rd Standard' },
    { name: '4th Standard' },
    { name: '5th Standard' },
    { name: '6th Standard' },
    { name: '7th Standard' },
    { name: '8th Standard' },
    { name: '9th Standard' },
    { name: '10th Standard' },
];

const defaultSubjects: Omit<Subject, 'id'>[] = [
  { name: 'Math' },
  { name: 'Science' },
  { name: 'History' },
  { name: 'English' },
  { name: 'Marathi' },
  { name: 'Hindi' },
  { name: 'EVS' },
];

export async function seedInitialData() {
    console.log("Checking if seeding is needed...");

    const classesCol = collection(db, 'classes');
    const classesSnapshot = await getDocs(query(classesCol));
    if (classesSnapshot.docs.length > 0) {
        console.log("Data already exists. Seeding not required.");
        return { success: true, message: "Database already contains data." };
    }
    
    console.log("Seeding initial data...");

    try {
        await runTransaction(db, async (transaction) => {
            const classRefsByName = new Map<string, string>();

            // Seed classes and store their generated IDs
            for (const c of defaultClasses) {
                const classRef = doc(collection(db, 'classes'));
                transaction.set(classRef, c);
                classRefsByName.set(c.name, classRef.id);
            }

            // Seed subjects
            for (const s of defaultSubjects) {
                const subjectRef = doc(collection(db, 'subjects'));
                transaction.set(subjectRef, s);
            }
            
            const studentsFor6th = [
                { name: 'Aryan Patil' }, { name: 'Sneha Deshmukh' },
                { name: 'Rahul Sharma' }, { name: 'Priya Joshi' },
                { name: 'Aditya Kulkarni' }, { name: 'Neha Rane' },
                { name: 'Rohit Shinde' }, { name: 'Kavya More' },
                { name: 'Omkar Pawar' }, { name: 'Aditi Bhosale' },
            ];

            const sixthClassId = classRefsByName.get('6th Standard');
            if(sixthClassId) {
                for (const student of studentsFor6th) {
                    const studentRef = doc(collection(db, 'students'));
                    transaction.set(studentRef, { ...student, classId: sixthClassId });
                }
            }
        });
        console.log("Database seeded successfully with classes, subjects, and students for 6th standard.");
        return { success: true, message: "Database seeded successfully!" };
    } catch (e: any) {
        console.error("Error during initial data seeding transaction: ", e);
        return { success: false, message: `Failed to seed database: ${e.message}`};
    }
}


export async function getClasses(): Promise<Class[]> {
    const classesCol = collection(db, 'classes');
    const classSnapshot = await getDocs(query(classesCol));
    const classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
    return classList.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName.startsWith('jr')) return -1;
        if (bName.startsWith('jr')) return 1;
        if (aName.startsWith('sr')) return -1;
        if (bName.startsWith('sr')) return 1;

        const aNum = parseInt(a.name.split(' ')[0], 10);
        const bNum = parseInt(b.name.split(' ')[0], 10);
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        return a.name.localeCompare(b.name);
    });
}

export async function getSubjects(): Promise<Subject[]> {
    const subjectsCol = collection(db, 'subjects');
    const subjectSnapshot = await getDocs(subjectsCol);
    const subjectList = subjectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
    return subjectList.sort((a,b) => a.name.localeCompare(b.name));
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  if (!classId) return [];
  const studentsCol = collection(db, 'students');
  const q = query(studentsCol, where('classId', '==', classId));
  const studentSnapshot = await getDocs(q);
  const studentList = studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  return studentList.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addStudent(name: string, classId: string): Promise<{ success: boolean; message: string; student?: Student }> {
    if (!name.trim() || !classId) {
        return { success: false, message: "Student name and class are required." };
    }
    try {
        const studentRef = await addDoc(collection(db, 'students'), {
            name,
            classId,
        });
        return { success: true, message: "Student added successfully!", student: { id: studentRef.id, name, classId } };
    } catch (error) {
        console.error("Error adding student: ", error);
        return { success: false, message: "Failed to add student." };
    }
}

export async function getStudentMarks(classId: string, subjectId: string): Promise<any[]> {
    if (!classId || !subjectId) return [];
    
    const docId = `${classId}_${subjectId}`;
    const docRef = doc(db, "marks", docId);
    
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
        return [];
    }
    
    const docData = docSnapshot.data();
    return docData.marks || [];
}

export async function getAllMarks() {
    const marksCol = collection(db, 'marks');
    const marksSnapshot = await getDocs(marksCol);
    return marksSnapshot.docs.map(doc => doc.data());
}

export async function saveMarks(data: { classId: string; subjectId: string; marks: Mark[] }) {
    console.log("Saving marks to Firestore:", data);

    if (!data.classId || !data.subjectId) {
        return { success: false, message: "Class and subject must be selected." };
    }

    const marksToSave = data.marks.filter(m => m.marks !== null && m.marks >= 0).map(m => ({
        ...m,
        marks: Number(m.marks) 
    }));

    if (marksToSave.length === 0) {
        return { success: true, message: "No new marks to save." };
    }

    try {
        const marksCollectionRef = collection(db, 'marks');
        const docId = `${data.classId}_${data.subjectId}`;
        const docRef = doc(marksCollectionRef, docId);

        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);

            if (!docSnapshot.exists()) {
                transaction.set(docRef, {
                    classId: data.classId,
                    subjectId: data.subjectId,
                    marks: marksToSave,
                    lastUpdated: serverTimestamp(),
                });
            } else {
                const existingMarks = docSnapshot.data().marks || [];
                const marksMap = new Map(existingMarks.map((m: any) => [m.studentId, m]));

                marksToSave.forEach(newMark => {
                    marksMap.set(newMark.studentId, newMark);
                });
                
                const updatedMarks = Array.from(marksMap.values());

                transaction.update(docRef, {
                    marks: updatedMarks,
                    lastUpdated: serverTimestamp(),
                });
            }
        });

        return { success: true, message: "Marks have been saved successfully!" };
    } catch (error: any) {
        console.error("Error saving marks:", error);
        if (error.code === 'permission-denied') {
             return { success: false, message: "Permission denied. Make sure you are logged in and your Firestore rules are set correctly." };
        }
        return { success: false, message: "An error occurred while saving marks." };
    }
}
