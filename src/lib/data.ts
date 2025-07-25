// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, query, where, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';

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

// In a real app, you might want to fetch these from a 'teachers' collection
// and associate them with classes, subjects, etc.
// For now, we'll keep them as static lists but fetch students dynamically.

export const classes: Class[] = [
  { id: 'c1', name: '6th Grade' },
  { id: 'c2', name: '7th Grade' },
  { id: 'c3', name: '8th Grade' },
];

export const subjects: Subject[] = [
  { id: 's1', name: 'Math' },
  { id: 's2', name: 'Science' },
  { id: 's3', name: 'History' },
  { id: 's4', name: 'English' },
];


export async function getClasses(): Promise<Class[]> {
    const classesCol = collection(db, 'classes');
    const classSnapshot = await getDocs(classesCol);
    const classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
    // If no classes, populate with default
    if (classList.length === 0) {
        for (const c of classes) {
            await setDoc(doc(db, 'classes', c.id), { name: c.name });
        }
        return classes;
    }
    return classList;
}

export async function getSubjects(): Promise<Subject[]> {
    const subjectsCol = collection(db, 'subjects');
    const subjectSnapshot = await getDocs(subjectsCol);
    const subjectList = subjectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
     // If no subjects, populate with default
    if (subjectList.length === 0) {
        for (const s of subjects) {
            await setDoc(doc(db, 'subjects', s.id), { name: s.name });
        }
        return subjects;
    }
    return subjectList;
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  if (!classId) return [];
  const studentsCol = collection(db, 'students');
  const q = query(studentsCol, where('classId', '==', classId));
  const studentSnapshot = await getDocs(q);
  return studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
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
    const marks: any[] = [];
    querySnapshot.forEach((doc) => {
        marks.push({ id: doc.id, ...doc.data() });
    });

    if (marks.length > 0) {
        // Assuming one document per class-subject combo
        return marks[0].marks;
    }

    return [];
}
