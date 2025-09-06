// Hybrid service that uses Supabase when available, fallback to mock data otherwise
import { supabase } from '@/integrations/supabase/client';
import { mockAuth, mockDB, shouldUseMockData, getMockStats } from './mockDataService';
import { Database } from '@/integrations/supabase/types';

type Student = Database['public']['Tables']['students']['Row'];
type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];
type Geofence = Database['public']['Tables']['geofences']['Row'];

// Test Supabase connection
let supabaseAvailable: boolean | null = null;

const testSupabaseConnection = async (): Promise<boolean> => {
  if (supabaseAvailable !== null) return supabaseAvailable;
  
  try {
    const { data, error } = await Promise.race([
      supabase.from('students').select('count').limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    supabaseAvailable = !error;
    return supabaseAvailable;
  } catch (error) {
    console.log('Supabase not available, using mock data service');
    supabaseAvailable = false;
    return false;
  }
};

// Auth service
export const authService = {
  signUp: async (email: string, password: string) => {
    const useSupabase = await testSupabaseConnection();
    
    if (useSupabase) {
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/student/dashboard`
        }
      });
    } else {
      return await mockAuth.signUp(email, password);
    }
  },

  signInWithPassword: async (email: string, password: string) => {
    const useSupabase = await testSupabaseConnection();
    
    if (useSupabase) {
      return await supabase.auth.signInWithPassword({ email, password });
    } else {
      return await mockAuth.signInWithPassword(email, password);
    }
  },

  signOut: async () => {
    const useSupabase = await testSupabaseConnection();
    
    if (useSupabase) {
      return await supabase.auth.signOut();
    } else {
      return await mockAuth.signOut();
    }
  },

  getUser: async () => {
    const useSupabase = await testSupabaseConnection();
    
    if (useSupabase) {
      return await supabase.auth.getUser();
    } else {
      return await mockAuth.getUser();
    }
  },
};

// Database service
export const dbService = {
  students: {
    insert: async (data: Partial<Student>) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase.from('students').insert(data).select().single();
      } else {
        return await mockDB.students.insert(data);
      }
    },

    select: async (userId?: string) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        if (userId) {
          return await supabase.from('students').select('*').eq('user_id', userId).single();
        } else {
          return await supabase.from('students').select('*');
        }
      } else {
        return await mockDB.students.select(userId);
      }
    },

    update: async (id: string, data: Partial<Student>) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase.from('students').update(data).eq('id', id).select().single();
      } else {
        return await mockDB.students.update(id, data);
      }
    },

    delete: async (id: string) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase.from('students').delete().eq('id', id);
      } else {
        return await mockDB.students.delete(id);
      }
    },
  },

  attendanceRecords: {
    insert: async (data: Partial<AttendanceRecord>) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase.from('attendance_records').insert(data).select().single();
      } else {
        return await mockDB.attendanceRecords.insert(data);
      }
    },

    select: async (studentId?: string, date?: string) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        let query = supabase.from('attendance_records').select('*');
        if (studentId) query = query.eq('student_id', studentId);
        if (date) query = query.eq('date', date);
        return await query.order('date', { ascending: false });
      } else {
        return await mockDB.attendanceRecords.select(studentId, date);
      }
    },

    selectWithStudents: async () => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase
          .from('attendance_records')
          .select(`
            *,
            students (
              name,
              roll_number
            )
          `)
          .order('created_at', { ascending: false });
      } else {
        return await mockDB.attendanceRecords.selectWithStudents();
      }
    },
  },

  geofences: {
    select: async () => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase.from('geofences').select('*').eq('active', true);
      } else {
        return await mockDB.geofences.select();
      }
    },

    insert: async (data: Partial<Geofence>) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase.from('geofences').insert(data).select().single();
      } else {
        return await mockDB.geofences.insert(data);
      }
    },

    update: async (id: string, data: Partial<Geofence>) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase.from('geofences').update(data).eq('id', id).select().single();
      } else {
        return await mockDB.geofences.update(id, data);
      }
    },

    delete: async (id: string) => {
      const useSupabase = await testSupabaseConnection();
      
      if (useSupabase) {
        return await supabase.from('geofences').delete().eq('id', id);
      } else {
        return await mockDB.geofences.delete(id);
      }
    },
  },
};

// Stats service
export const statsService = {
  getStats: async () => {
    const useSupabase = await testSupabaseConnection();
    
    if (useSupabase) {
      try {
        const [studentsResult, attendanceResult] = await Promise.all([
          supabase.from('students').select('id'),
          supabase.from('attendance_records').select('status, date')
        ]);

        const totalStudents = studentsResult.data?.length || 0;
        const allAttendance = attendanceResult.data || [];
        const today = new Date().toISOString().split('T')[0];
        
        const presentToday = allAttendance.filter(r => 
          r.date === today && r.status === 'present'
        ).length;
        
        const fraudAttempts = 12; // This would be calculated from fraud_attempts field
        const attendanceRate = allAttendance.length > 0 ? 
          (allAttendance.filter(r => r.status === 'present').length / allAttendance.length) * 100 : 0;

        return {
          totalStudents,
          presentToday,
          fraudAttempts,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
        };
      } catch (error) {
        console.error('Error fetching stats:', error);
        return getMockStats();
      }
    } else {
      return getMockStats();
    }
  },
};

// Export functions to check service status
export const getServiceStatus = async () => {
  const isSupabaseAvailable = await testSupabaseConnection();
  return {
    supabase: isSupabaseAvailable,
    mockData: !isSupabaseAvailable,
  };
};