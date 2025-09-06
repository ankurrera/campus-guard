// Mock data service to simulate database operations when Supabase is not available
import { Database } from '@/integrations/supabase/types';

type Student = Database['public']['Tables']['students']['Row'];
type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];
type Geofence = Database['public']['Tables']['geofences']['Row'];

// Mock data storage
const mockStudents: Student[] = [
  {
    id: '1',
    user_id: 'user1',
    name: 'John Doe',
    roll_number: '2024001',
    email: 'john.doe@student.edu',
    phone: '+91 98765 43210',
    class: 'CSE 2nd Year',
    section: 'A',
    face_data: 'base64_face_data_1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'user2',
    name: 'Jane Smith',
    roll_number: '2024002',
    email: 'jane.smith@student.edu',
    phone: '+91 98765 43211',
    class: 'CSE 2nd Year',
    section: 'A',
    face_data: 'base64_face_data_2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'user3',
    name: 'Mike Johnson',
    roll_number: '2024003',
    email: 'mike.johnson@student.edu',
    phone: '+91 98765 43212',
    class: 'CSE 2nd Year',
    section: 'B',
    face_data: 'base64_face_data_3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: '1',
    student_id: '1',
    date: new Date().toISOString().split('T')[0],
    check_in_time: new Date().toISOString(),
    check_out_time: null,
    status: 'present',
    verification_method: 'biometric',
    location: { lat: 28.6139, lng: 77.2090, accuracy: 10 },
    fraud_attempts: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    student_id: '2',
    date: new Date().toISOString().split('T')[0],
    check_in_time: new Date().toISOString(),
    check_out_time: null,
    status: 'present',
    verification_method: 'biometric',
    location: { lat: 28.6139, lng: 77.2090, accuracy: 15 },
    fraud_attempts: null,
    created_at: new Date().toISOString(),
  },
];

const mockGeofences: Geofence[] = [
  {
    id: '1',
    name: 'Main Campus',
    type: 'radius',
    center: { lat: 28.6139, lng: 77.2090 },
    coordinates: null,
    radius: 200,
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Library Building',
    type: 'radius',
    center: { lat: 28.6145, lng: 77.2095 },
    coordinates: null,
    radius: 50,
    active: true,
    created_at: new Date().toISOString(),
  },
];

// Mock user session
let currentUser: { id: string; email: string; role: string } | null = null;

// Mock authentication functions
export const mockAuth = {
  signUp: async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const userId = `user_${Date.now()}`;
    const user = { id: userId, email, role: 'student' };
    currentUser = user;
    
    return { user, session: { access_token: 'mock_token' }, error: null };
  },

  signInWithPassword: async (email: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check admin credentials
    if (email === 'admin@college.edu' && password === 'admin123') {
      const user = { id: 'admin_1', email, role: 'admin' };
      currentUser = user;
      return { user, session: { access_token: 'mock_admin_token' }, error: null };
    }
    
    // Check if student exists
    const student = mockStudents.find(s => s.email === email);
    if (student) {
      const user = { id: student.user_id, email, role: 'student' };
      currentUser = user;
      return { user, session: { access_token: 'mock_token' }, error: null };
    }
    
    return { user: null, session: null, error: { message: 'Invalid credentials' } };
  },

  signOut: async () => {
    currentUser = null;
    return { error: null };
  },

  getUser: async () => {
    return { user: currentUser, error: null };
  },
};

// Mock database functions
export const mockDB = {
  students: {
    insert: async (data: Partial<Student>) => {
      const newStudent: Student = {
        id: `student_${Date.now()}`,
        user_id: data.user_id || `user_${Date.now()}`,
        name: data.name || '',
        roll_number: data.roll_number || '',
        email: data.email || '',
        phone: data.phone || null,
        class: data.class || null,
        section: data.section || null,
        face_data: data.face_data || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockStudents.push(newStudent);
      return { data: newStudent, error: null };
    },

    select: async (userId?: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (userId) {
        const student = mockStudents.find(s => s.user_id === userId);
        return { data: student, error: student ? null : { message: 'Student not found' } };
      }
      return { data: mockStudents, error: null };
    },

    update: async (id: string, data: Partial<Student>) => {
      const index = mockStudents.findIndex(s => s.id === id);
      if (index !== -1) {
        mockStudents[index] = { ...mockStudents[index], ...data, updated_at: new Date().toISOString() };
        return { data: mockStudents[index], error: null };
      }
      return { data: null, error: { message: 'Student not found' } };
    },

    delete: async (id: string) => {
      const index = mockStudents.findIndex(s => s.id === id);
      if (index !== -1) {
        const deleted = mockStudents.splice(index, 1)[0];
        return { data: deleted, error: null };
      }
      return { data: null, error: { message: 'Student not found' } };
    },
  },

  attendanceRecords: {
    insert: async (data: Partial<AttendanceRecord>) => {
      const newRecord: AttendanceRecord = {
        id: `attendance_${Date.now()}`,
        student_id: data.student_id || '',
        date: data.date || new Date().toISOString().split('T')[0],
        check_in_time: data.check_in_time || new Date().toISOString(),
        check_out_time: data.check_out_time || null,
        status: data.status || 'present',
        verification_method: data.verification_method || 'biometric',
        location: data.location || { lat: 0, lng: 0, accuracy: 0 },
        fraud_attempts: data.fraud_attempts || null,
        created_at: new Date().toISOString(),
      };
      mockAttendanceRecords.push(newRecord);
      return { data: newRecord, error: null };
    },

    select: async (studentId?: string, date?: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      let records = mockAttendanceRecords;
      
      if (studentId) {
        records = records.filter(r => r.student_id === studentId);
      }
      if (date) {
        records = records.filter(r => r.date === date);
      }
      
      return { data: records, error: null };
    },

    selectWithStudents: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const recordsWithStudents = mockAttendanceRecords.map(record => {
        const student = mockStudents.find(s => s.id === record.student_id);
        return {
          ...record,
          student_name: student?.name || 'Unknown',
          student_roll: student?.roll_number || 'Unknown',
        };
      });
      return { data: recordsWithStudents, error: null };
    },
  },

  geofences: {
    select: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { data: mockGeofences, error: null };
    },

    insert: async (data: Partial<Geofence>) => {
      const newGeofence: Geofence = {
        id: `geofence_${Date.now()}`,
        name: data.name || '',
        type: data.type || 'radius',
        center: data.center || null,
        coordinates: data.coordinates || null,
        radius: data.radius || null,
        active: data.active ?? true,
        created_at: new Date().toISOString(),
      };
      mockGeofences.push(newGeofence);
      return { data: newGeofence, error: null };
    },

    update: async (id: string, data: Partial<Geofence>) => {
      const index = mockGeofences.findIndex(g => g.id === id);
      if (index !== -1) {
        mockGeofences[index] = { ...mockGeofences[index], ...data };
        return { data: mockGeofences[index], error: null };
      }
      return { data: null, error: { message: 'Geofence not found' } };
    },

    delete: async (id: string) => {
      const index = mockGeofences.findIndex(g => g.id === id);
      if (index !== -1) {
        const deleted = mockGeofences.splice(index, 1)[0];
        return { data: deleted, error: null };
      }
      return { data: null, error: { message: 'Geofence not found' } };
    },
  },
};

// Check if we should use mock data (when Supabase is not available)
export const shouldUseMockData = () => {
  // Check if we're in development and Supabase is not reachable
  return import.meta.env.DEV || !navigator.onLine;
};

// Export mock data for statistics
export const getMockStats = () => ({
  totalStudents: mockStudents.length,
  presentToday: mockAttendanceRecords.filter(r => 
    r.date === new Date().toISOString().split('T')[0] && r.status === 'present'
  ).length,
  fraudAttempts: mockAttendanceRecords.filter(r => r.fraud_attempts).length,
  attendanceRate: mockAttendanceRecords.length > 0 ? 
    (mockAttendanceRecords.filter(r => r.status === 'present').length / mockAttendanceRecords.length) * 100 : 0,
});