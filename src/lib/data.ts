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

const allStudents: Student[] = [
  // 6th Grade
  { id: 'st1', name: 'Aman Pawar', classId: 'c1' },
  { id: 'st2', name: 'Sheetal Rane', classId: 'c1' },
  { id: 'st3', name: 'Rajesh Kumar', classId: 'c1' },
  { id: 'st4', name: 'Priya Sharma', classId: 'c1' },
  { id: 'st10', name: 'Sunita Patil', classId: 'c1' },
  { id: 'st11', name: 'Manoj Tiwari', classId: 'c1' },

  // 7th Grade
  { id: 'st5', name: 'Vikram Singh', classId: 'c2' },
  { id: 'st6', name: 'Anjali Verma', classId: 'c2' },
  { id: 'st12', name: 'Rohan Mehra', classId: 'c2' },

  // 8th Grade
  { id: 'st7', name: 'Suresh Reddy', classId: 'c3' },
  { id: 'st8', name: 'Meena Desai', classId: 'c3' },
  { id: 'st9', name: 'Karan Malhotra', classId: 'c3' },
  { id: 'st13', name: 'Zoya Khan', classId: 'c3' },
  { id: 'st14', name: 'Amitabh Ghosh', classId: 'c3' },
];

export function getStudentsByClass(classId: string): Student[] {
  return allStudents.filter(student => student.classId === classId);
}
