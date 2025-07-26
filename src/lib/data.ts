// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, query, where, addDoc, doc, writeBatch, documentId, getCountFromServer } from 'firebase/firestore';

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
];

async function seedInitialData() {
    console.log("Seeding initial data...");
    const batch = writeBatch(db);

    const classesCol = collection(db, 'classes');
    const subjectsCol = collection(db, 'subjects');

    // Add Classes
    for (const c of defaultClasses) {
        const classRef = doc(classesCol);
        batch.set(classRef, c);
    }

    // Add Subjects
    for (const s of defaultSubjects) {
        const subjectRef = doc(subjectsCol);
        batch.set(subjectRef, s);
    }
    
    await batch.commit();
    console.log("Database seeded successfully with new class structure.");
}

async function checkAndSeedData() {
    const classesQuery = query(collection(db, 'classes'));
    const snapshot = await getCountFromServer(classesQuery);
    if (snapshot.data().count === 0) {
        console.log("No data found, seeding database...");
        await seedInitialData();
    }
}

checkAndSeedData();

export async function getClasses(): Promise<Class[]> {
    const classesCol = collection(db, 'classes');
    const classSnapshot = await getDocs(query(classesCol));
    const classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
    return classList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
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
    
    const marksQuery = query(
        collection(db, "marks"),
        where("classId", "==", classId),
        where("subjectId", "==", subjectId)
    );

    const querySnapshot = await getDocs(marksQuery);
    if (querySnapshot.empty) {
        return [];
    }
    
    const docData = querySnapshot.docs[0].data();
    return docData.marks || [];
}

export async function getAllMarks() {
    const marksCol = collection(db, 'marks');
    const marksSnapshot = await getDocs(marksCol);
    return marksSnapshot.docs.map(doc => doc.data());
}
