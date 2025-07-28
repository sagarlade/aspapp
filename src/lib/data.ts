// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, query, where, addDoc, doc, writeBatch, documentId, getCountFromServer, runTransaction, serverTimestamp, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export interface Class {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Exam {
  id: string;
  name: string;
  totalMarks: number;
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

const defaultExams: Omit<Exam, 'id'>[] = [
    { name: 'Unit Test 1', totalMarks: 25 },
    { name: 'Semester 1', totalMarks: 100 },
    { name: 'Unit Test 2', totalMarks: 25 },
    { name: 'Semester 2', totalMarks: 100 },
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

             // Seed exams
            for (const e of defaultExams) {
                const examRef = doc(collection(db, 'exams'));
                transaction.set(examRef, e);
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
        console.log("Database seeded successfully with classes, subjects, exams, and students for 6th standard.");
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
        if (!a.name || !b.name) {
            // Handle cases where name is missing to prevent crash
            if (a.name) return -1;
            if (b.name) return 1;
            return 0;
        }
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

export async function getExams(): Promise<Exam[]> {
    const examsCol = collection(db, 'exams');
    const examSnapshot = await getDocs(query(examsCol));
    const examList = examSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
    return examList.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addExam(name: string, totalMarks: number): Promise<{ success: boolean; message: string; exam?: Exam }> {
    if (!name.trim() || !totalMarks) {
        return { success: false, message: "Exam name and total marks are required." };
    }
    try {
        const examRef = await addDoc(collection(db, 'exams'), {
            name,
            totalMarks,
        });
        return { success: true, message: "Exam added successfully!", exam: { id: examRef.id, name, totalMarks } };
    } catch (error) {
        console.error("Error adding exam: ", error);
        return { success: false, message: "Failed to add exam." };
    }
}

export async function deleteExam(examId: string): Promise<{ success: boolean; message: string }> {
    if (!examId) {
        return { success: false, message: "Exam ID is required." };
    }
    try {
        await deleteDoc(doc(db, 'exams', examId));
        return { success: true, message: "Exam deleted successfully!" };
    } catch (error) {
        console.error("Error deleting exam: ", error);
        return { success: false, message: "Failed to delete exam." };
    }
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

export async function getStudentMarks(classId: string, subjectId: string, examId: string): Promise<any[]> {
    if (!classId || !subjectId || !examId) return [];
    
    const docId = `${classId}_${subjectId}_${examId}`;
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
    return marksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function saveMarks(data: { classId: string; subjectId: string; examId: string, marks: Mark[] }) {
    if (!data.classId || !data.subjectId || !data.examId) {
        return { success: false, message: "Class, subject, and exam must be selected." };
    }

    if (data.marks.length === 0) {
        return { success: true, message: "No marks data provided." };
    }

    const docId = `${data.classId}_${data.subjectId}_${data.examId}`;
    const docRef = doc(db, 'marks', docId);

    try {
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            const examDoc = await getDoc(doc(db, 'exams', data.examId));
            if(!examDoc.exists()) {
                throw new Error("Selected exam does not exist.");
            }
            const examData = examDoc.data();

            if (!docSnapshot.exists()) {
                transaction.set(docRef, {
                    classId: data.classId,
                    subjectId: data.subjectId,
                    examId: data.examId,
                    examName: examData.name,
                    totalMarks: examData.totalMarks,
                    marks: data.marks,
                    lastUpdated: serverTimestamp(),
                });
            } else {
                const existingMarks: Mark[] = docSnapshot.data().marks || [];
                const marksMap = new Map(existingMarks.map(m => [m.studentId, m]));

                data.marks.forEach(newMark => {
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
        return { success: false, message: `An error occurred while saving marks: ${error.message}` };
    }
}
