// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, query, where, addDoc, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';

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
  { id: 'c4', name: '4th Grade' },
  { id: 'c5', name: '5th Grade' },
];

export const subjects: Subject[] = [
  { id: 's1', name: 'Math' },
  { id: 's2', name: 'Science' },
  { id: 's3', name: 'History' },
  { id: 's4', name: 'English' },
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


export async function getClasses(): Promise<Class[]> {
    const classesCol = collection(db, 'classes');
    const classSnapshot = await getDocs(classesCol);
    const classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
    
    // If no classes, populate with default and add students
    if (classList.length === 0) {
        const batch = writeBatch(db);

        // Add classes
        for (const c of classes) {
            const classRef = doc(db, 'classes', c.id);
            batch.set(classRef, { name: c.name });
        }

        // Add 4th Grade students
        for (const name of students4th) {
            const studentRef = doc(collection(db, 'students'));
            batch.set(studentRef, { name: name.trim(), classId: 'c4' });
        }
        
        // Add 5th Grade students
        for (const name of students5th) {
            const studentRef = doc(collection(db, 'students'));
            batch.set(studentRef, { name: name.trim(), classId: 'c5' });
        }

        await batch.commit();
        console.log("Database seeded with classes and students.");
        return classes;
    }
    return classList.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSubjects(): Promise<Subject[]> {
    const subjectsCol = collection(db, 'subjects');
    const subjectSnapshot = await getDocs(subjectsCol);
    const subjectList = subjectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
     // If no subjects, populate with default
    if (subjectList.length === 0) {
        const batch = writeBatch(db);
        for (const s of subjects) {
            const subjectRef = doc(db, 'subjects', s.id);
            batch.set(subjectRef, { name: s.name });
        }
        await batch.commit();
        console.log("Database seeded with subjects.");
        return subjects;
    }
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
