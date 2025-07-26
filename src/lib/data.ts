// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, query, where, addDoc, doc, writeBatch, documentId } from 'firebase/firestore';

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
  { name: '4th Grade' },
  { name: '5th Grade' },
  { name: '6th Grade' },
  { name: '7th Grade' },
  { name: '8th Grade' },
];

const defaultSubjects: Omit<Subject, 'id'>[] = [
  { name: 'Math' },
  { name: 'Science' },
  { name: 'History' },
  { name: 'English' },
];

const students4th = [
    "Solase Shlok Akash", "Adsul Adarsh Ajit", "Babar Vinayak Hanmant", "Babar Viraj Vinayak",
    "Baddur Prajwal Ravi", "Chavan Shambhuraje Vinayak", "Choramale Suyash Ramesh", "Gangadhare Shivraj Anil",
    "Gurav Ravikiran Navanath", "Hande Arav Manoj", "Kadam Sarthak Samadhan", "Kadam Vikrant Sachin",
    "Khalage Ayush Ramchandra", "Khalage Manthan Rajendra", "Khandekar Samarath suresh",
    "Kolawale Sanchit Dattatray", "Pawar Ranjeet Vitthal", "Pujari Pratham Madhukar", "Raddi Shivam Sanjay",
    "Shaikh Aarshad Sayad", "Shaikh Faizan Navshad", "Shinde Samarth Vitthal", "Swaraj Vasant Erande",
    "Vibhute Atharv Rahul", "Vibhute Parth Sanjaykumar", "Vibhute Pranav Prakash", "Vibhute Rudra Vishal",
    "Yelmar Arush Mahadev", "Yelpale Aryan Sagar", "Yelplae Shreyash Kiran", "Yelplale Rudra Pravin",
    "Yelplale Rudra Bharat", "Yelplale Yash Mayur", "Bankar Swarali Rohit", "Babar Palak Vijay",
    "Karade Gauri Hanmant", "Kolawale Vedika Vilas", "Lade Shravani Chandrakant", "Lavate Arushi Chandrakant",
    "Lavate Shreya Santosh", "Mane Anvita Bapu", "Patil Anvi Akash", "Sargar Harshada Dattatray",
    "Shaikh Asiya Amir", "Vibhute Arohi Atul", "Vibhute Swara Appaji", "Waghmode Vaishnavi Laxman",
    "Yelpale Arpita Shamrao", "Yelpale Shraddha Ullas", "Yelpale Swara Atul", "Yelplale Shrutika Dattatray"
];

const students5th = [
    "Babar Jayesh Samadhan", "Bandagar Shivraj Appa", "Burungale Aniket", "Erande Dattatray Dharmaraj",
    "Erande Roshan Bapu", "Gurav Harshwardhan Rajaram", "Gurav Rajveer", "Karande Tejas Sandip",
    "Khandekar Sairaj Bhagesh", "Khandekar Sangram Bapu", "Khot Vedant Shrishailya", "Lawate Rushikesh Chandrakant",
    "Lingade Anuj Tanaji", "Lingade Nikhil Nitin", "Shinde Vaibhav Bajirao", "Shinde Viraj Shailendra",
    "Vibhute Rajveer Umesh", "Yadav Chetan bapurao", "Yelmar Aryan Atul", "Yelpale Pratik Manoj",
    "Yelpale Rushi Bandupant", "Bhandage sanika Sanjay", "Bandgar Swagati Balaso", "Chavan Vedika",
    "Kolawale Anvi Sadhu", "Lingade Harshada Hanmant", "Nasale Swaranjali Sitaram", "Reddi Amulya Prashant",
    "Shaikh Aliya Naushad", "Shejal Anushka Dhula", "Vibhute Pragati Vishal", "Vibhute Suhani Sunil",
    "Yelmar Shivanya Arvind", "Yelpale Anshuka Kiran", "Yelpale Anushka Ganesh", "Yelpale Anvita Arun",
    "Yelpale Pranjali Bharat", "Yelpale Rajnandini Vishal", "Yelpale Sherya Dilip", "Yelpale Shravani Dattatray",
    "Yelpale Swarali Hanmant"
];

async function seedInitialData() {
    console.log("Seeding initial data...");
    const batch = writeBatch(db);

    const classesCol = collection(db, 'classes');
    const subjectsCol = collection(db, 'subjects');
    const studentsCol = collection(db, 'students');

    const classRefs: { [key: string]: string } = {};

    // Add Classes
    for (const c of defaultClasses) {
        const classRef = doc(classesCol);
        batch.set(classRef, c);
        classRefs[c.name] = classRef.id;
    }

    // Add Subjects
    for (const s of defaultSubjects) {
        const subjectRef = doc(subjectsCol);
        batch.set(subjectRef, s);
    }
    
    // Add Students for 4th Grade
    if (classRefs['4th Grade']) {
        for (const name of students4th) {
            const studentRef = doc(studentsCol);
            batch.set(studentRef, { name: name.trim(), classId: classRefs['4th Grade'] });
        }
    }
    
    // Add Students for 5th Grade
    if (classRefs['5th Grade']) {
        for (const name of students5th) {
            const studentRef = doc(studentsCol);
            batch.set(studentRef, { name: name.trim(), classId: classRefs['5th Grade'] });
        }
    }

    await batch.commit();
    console.log("Database seeded successfully.");
}

export async function getClasses(): Promise<Class[]> {
    const classesCol = collection(db, 'classes');
    let classSnapshot = await getDocs(query(classesCol));
    
    if (classSnapshot.empty) {
        console.log("No classes found, seeding database...");
        await seedInitialData();
        // Re-fetch after seeding
        classSnapshot = await getDocs(query(classesCol));
    }

    const classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
    return classList.sort((a, b) => a.name.localeCompare(b.name));
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

    // Assuming one document per class-subject combo
    const docData = querySnapshot.docs[0].data();
    return docData.marks || [];
}
