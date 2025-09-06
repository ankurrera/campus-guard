export interface TeachingAssistant {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  phone?: string;
  qualification?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  department?: string;
  semester?: string;
  credits?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseAssignment {
  id: string;
  taId: string;
  courseId: string;
  assignedAt: Date;
}

export interface TADashboardData {
  ta: TeachingAssistant;
  assignedCourses: Course[];
  recentAttendance: AttendanceRecord[];
  studentsCount: number;
}

// Re-export needed types from attendance.ts
export type { AttendanceRecord, Student } from './attendance';