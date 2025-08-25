
// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, query, where, addDoc, doc, writeBatch, documentId, getCountFromServer, runTransaction, serverTimestamp, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

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
  date?: string; // Optional date field
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

export interface MarkWithExam extends Mark {
    examId: string;
    examName: string;
    examDate?: string;
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
  { name: 'G.Science' },
  { name: 'SST' },
  { name: 'Maths-1' },
  { name: 'बुद्धिमत्ता चाचणी' },
];

const defaultExams: Omit<Exam, 'id' | 'date'>[] = [
    ...Array.from({ length: 12 }, (_, i) => ({ name: `Monthly Test - ${i + 1}`, totalMarks: 25 })),
    ...Array.from({ length: 40 }, (_, i) => ({ name: `Weekly Test - ${i + 1}`, totalMarks: 10 })),
    ...Array.from({ length: 20 }, (_, i) => ({ name: `Class Test - ${i + 1}`, totalMarks: 15 })),
    ...Array.from({ length: 10 }, (_, i) => ({ name: `Scholarship Test - ${i + 1}`, totalMarks: 100 })),
    { name: 'Unit Test (20 Marks)', totalMarks: 20 },
    { name: 'Unit Test (25 Marks)', totalMarks: 25 },
    { name: 'Unit Test (40 Marks)', totalMarks: 40 },
    { name: 'Unit Test (50 Marks)', totalMarks: 50 },
    { name: 'Semester 1', totalMarks: 100 },
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
            
            const studentsFor2nd = [
                { name: 'Bhandage Arush Santosh' }, { name: 'Chaugule Rudra Sagar' },
                { name: 'Chavan Shoam Babaso' }, { name: 'Jagdale Rajveer Anil' },
                { name: 'Kadam Siddhant Sachin' }, { name: 'Kahrat Om' },
                { name: 'Karmude Riyansh Jayram' }, { name: 'Khalage Atharv Atul' },
                { name: 'Khalge Shlok Jitendra' }, { name: 'Kolawale Sumit Ankush' },
                { name: 'Kolawale Tanmay Rahul' }, { name: 'Patil Samarth Vikas' },
                { name: 'Pawar Viraj Vijay' }, { name: 'Rakshe Prathamesh' },
                { name: 'Reddi Swaraj Siddheshwar' }, { name: 'Shaikh Ajan Naushad' },
                { name: 'Shembade Priyansh Sitaram' }, { name: 'Thangal Shaurya Navanath' },
                { name: 'Vibhute Ayush Vaibhav' }, { name: 'Vibhute Krishna Atul' },
                { name: 'Vibhute Samarth Charan' }, { name: 'Vibhute Vishwajeet Rahul' },
                { name: 'Yelpale Arav Ganesh' }, { name: 'Yelpale Arav Bharat' },
                { name: 'Yelpale Kartik Ganesh' }, { name: 'Yelpale Samarth Vishal' },
                { name: 'Yelpale Shardul Shankar' }, { name: 'Yelpale Swaraj Pramod' },
                { name: 'Anuse Samiksha Anil' }, { name: 'Babar Mahi Sachin' },
                { name: 'Chaugule Arushi Vaibhav' }, { name: 'Choramale Vaishnavi' },
                { name: 'Chormale Arohi Subhash' }, { name: 'Chougule Ishani Nandkumar' },
                { name: 'Kadam Sanvi Suraj' }, { name: 'Karande Shrushti Samadhan' },
                { name: 'Khot Pradnya Shrishailya' }, { name: 'Kolawale Shravani Satish' },
                { name: 'Kolwale Anchal Sadhu' }, { name: 'More Shraddha' },
                { name: 'Shaikh Joya Amir' }, { name: 'Shembade Shreya Ankush' },
                { name: 'Solase Ruhi Satish' }, { name: 'Lokare Jui Ravi' },
                { name: 'Vibhute Pari Amol' }, { name: 'Vibhute Shreya Sagar' },
                { name: 'Yelpale Arya Vishal' }, { name: 'Yelpale Namrata Datta' },
                { name: 'Chavan Yash Dilip' },
            ];

            const sixthClassId = classRefsByName.get('6th Standard');
            if(sixthClassId) {
                for (const student of studentsFor6th) {
                    const studentRef = doc(collection(db, 'students'));
                    transaction.set(studentRef, { ...student, classId: sixthClassId });
                }
            }
            
            const secondClassId = classRefsByName.get('2nd Standard');
            if(secondClassId) {
                for (const student of studentsFor2nd) {
                    const studentRef = doc(collection(db, 'students'));
                    transaction.set(studentRef, { ...student, classId: secondClassId });
                }
            }
        });
        console.log("Database seeded successfully with classes, subjects, exams, and students for 2nd and 6th standard.");
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
            if (!a.name && !b.name) return 0;
            return a.name ? -1 : 1;
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
        const examData: Omit<Exam, 'id' | 'date'> = {
            name,
            totalMarks,
        };
        const examRef = await addDoc(collection(db, 'exams'), examData);
        return { success: true, message: "Exam added successfully!", exam: { id: examRef.id, ...examData } };
    } catch (error) {
        console.error("Error adding exam: ", error);
        return { success: false, message: "Failed to add exam." };
    }
}

export async function deleteExam(examId: string): Promise<{ success: boolean; message: string }> {
    if (!examId) {
        return { success: false, message: "Exam ID is required." };
    }
    const batch = writeBatch(db);
    try {
        // 1. Delete the exam document itself
        const examRef = doc(db, 'exams', examId);
        batch.delete(examRef);

        // 2. Query for all marks documents associated with this examId
        const marksQuery = query(collection(db, "marks"), where("examId", "==", examId));
        const marksSnapshot = await getDocs(marksQuery);
        
        // 3. Delete each of those documents
        marksSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // 4. Commit the batch
        await batch.commit();

        return { success: true, message: "Exam and all associated marks have been deleted." };
    } catch (error) {
        console.error("Error deleting exam and associated marks: ", error);
        return { success: false, message: "Failed to delete exam and its marks." };
    }
}


export async function getAllStudents(): Promise<Student[]> {
  const studentsCol = collection(db, 'students');
  const studentSnapshot = await getDocs(studentsCol);
  const studentList = studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  return studentList.sort((a, b) => a.name.localeCompare(b.name));
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

export async function addMultipleStudents(names: string[], classId: string): Promise<{ success: boolean; message: string; }> {
    if (names.length === 0 || !classId) {
        return { success: false, message: "Student names and class are required." };
    }
    try {
        const batch = writeBatch(db);
        const studentsCol = collection(db, 'students');
        
        names.forEach(name => {
            const studentRef = doc(studentsCol);
            batch.set(studentRef, { name, classId });
        });

        await batch.commit();

        return { success: true, message: `${names.length} students added successfully!` };
    } catch (error) {
        console.error("Error adding multiple students: ", error);
        return { success: false, message: "Failed to add students." };
    }
}

export async function updateStudent(studentId: string, name: string, classId: string): Promise<{ success: boolean, message: string }> {
    if (!studentId || !name.trim() || !classId) {
        return { success: false, message: "Student ID, name, and class are required." };
    }
    try {
        const studentRef = doc(db, 'students', studentId);
        await updateDoc(studentRef, { name, classId });
        
        // You might want to update the student's name in existing marks documents as well.
        // This is a complex operation and depends on your data structure.
        // For now, we'll just update the student record.

        return { success: true, message: "Student updated successfully." };
    } catch (error) {
        console.error("Error updating student:", error);
        return { success: false, message: "Failed to update student." };
    }
}


export async function deleteStudent(studentId: string): Promise<{ success: boolean, message: string }> {
    if (!studentId) {
        return { success: false, message: "Student ID is required." };
    }
    try {
        const batch = writeBatch(db);

        // Delete the student document
        const studentRef = doc(db, 'students', studentId);
        batch.delete(studentRef);

        // Find all marks documents and remove the student from them
        const marksQuery = query(collection(db, 'marks'));
        const marksSnapshot = await getDocs(marksQuery);
        
        for (const markDoc of marksSnapshot.docs) {
            const data = markDoc.data();
            if (data.marks && Array.isArray(data.marks)) {
                const updatedMarks = data.marks.filter((mark: any) => mark.studentId !== studentId);
                // If marks changed, update the doc. If no marks left, delete it.
                if (updatedMarks.length < data.marks.length) {
                    if (updatedMarks.length === 0) {
                        batch.delete(markDoc.ref);
                    } else {
                        batch.update(markDoc.ref, { marks: updatedMarks });
                    }
                }
            }
        }
        
        await batch.commit();

        return { success: true, message: "Student and all associated marks deleted successfully." };
    } catch (error) {
        console.error("Error deleting student:", error);
        return { success: false, message: "Failed to delete student and their marks." };
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

export async function getMarksForSubject(classId: string, subjectId: string): Promise<MarkWithExam[]> {
  if (!classId || !subjectId) return [];
  const q = query(
    collection(db, "marks"),
    where("classId", "==", classId),
    where("subjectId", "==", subjectId)
  );
  
  const querySnapshot = await getDocs(q);
  const allMarks: MarkWithExam[] = [];

  querySnapshot.forEach(doc => {
    const data = doc.data();
    const examId = data.examId;
    const examName = data.examName;
    const examDate = data.examDate; // Get the date
    if (data.marks && Array.isArray(data.marks)) {
      data.marks.forEach((mark: Mark) => {
        allMarks.push({ ...mark, examId, examName, examDate });
      });
    }
  });

  return allMarks;
}


export async function deleteMark(classId: string, subjectId: string, examId: string, studentId: string): Promise<{success: boolean, message: string}> {
    const docId = `${classId}_${subjectId}_${examId}`;
    const docRef = doc(db, 'marks', docId);

    try {
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (!docSnapshot.exists()) {
                throw new Error("Marks document not found.");
            }
            
            const existingMarks: Mark[] = docSnapshot.data().marks || [];
            const updatedMarks = existingMarks.filter(m => m.studentId !== studentId);

            if(updatedMarks.length === existingMarks.length) {
                // No change, student not found in this doc
                return;
            }
            
            if (updatedMarks.length === 0) {
                // If no marks are left, delete the entire document
                transaction.delete(docRef);
            } else {
                transaction.update(docRef, { marks: updatedMarks });
            }
        });
        return { success: true, message: "Mark deleted successfully." };
    } catch(e: any) {
        console.error("Error deleting mark:", e);
        return { success: false, message: `Failed to delete mark: ${e.message}` };
    }
}


export async function getAllMarks() {
    const marksCol = collection(db, 'marks');
    const marksSnapshot = await getDocs(marksCol);
    return marksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function saveMarks(data: { classId: string; subjectId: string; examId: string, marks: Mark[], examDate?: string }) {
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
            const examData = examDoc.data() as Exam;

            if (!docSnapshot.exists()) {
                // If the document doesn't exist, create it with the new marks.
                transaction.set(docRef, {
                    classId: data.classId,
                    subjectId: data.subjectId,
                    examId: data.examId,
                    examName: examData.name,
                    examDate: data.examDate || null, // Add exam date
                    totalMarks: examData.totalMarks,
                    marks: data.marks,
                    lastUpdated: serverTimestamp(),
                });
            } else {
                // If the document exists, update the marks for the specified students.
                const existingMarks: Mark[] = docSnapshot.data().marks || [];
                const marksMap = new Map(existingMarks.map(m => [m.studentId, m]));

                // Update the map with the new/changed marks.
                data.marks.forEach(newMark => {
                    marksMap.set(newMark.studentId, newMark);
                });
                
                const updatedMarks = Array.from(marksMap.values());

                transaction.update(docRef, {
                    marks: updatedMarks,
                    examDate: data.examDate || null, // Also update the date on existing docs
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

    

    