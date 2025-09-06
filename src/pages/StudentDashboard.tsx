import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, Camera, FileDown, TrendingUp, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FaceRecognition } from '@/components/FaceRecognition';
import { GeofenceStatus } from '@/components/GeofenceStatus';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authService, dbService } from '@/lib/dataService';
import { Database } from '@/integrations/supabase/types';

// Demo geofences - In production, fetch from database
const campusGeofences = [
  {
    type: 'radius' as const,
    center: { lat: 28.6139, lng: 77.2090 }, // Example: New Delhi coordinates
    radius: 200, // 200 meters
    active: true,
  },
];

type Student = Database['public']['Tables']['students']['Row'];
type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    percentage: 0,
  });

  const fetchStudentData = useCallback(async () => {
    try {
      // Demo mode: use demo student data if no authentication
      const demoStudent: Student = {
        id: 'demo_student',
        user_id: 'demo_user',
        name: 'Demo Student',
        roll_number: '2024DEMO',
        email: 'demo@student.edu',
        phone: '+91 98765 00000',
        class: 'CSE 2nd Year',
        section: 'A',
        face_data: 'demo_face_data',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try to get real user data, fallback to demo
      try {
        const response = await authService.getUser();
        
        if (response.user) {
          const { data: student, error } = await dbService.students.select(response.user.id);
          if (!error && student) {
            setStudentInfo(student);
            return;
          }
        }
      } catch (error) {
        console.log('Using demo mode for student dashboard');
      }

      // Use demo student data
      setStudentInfo(demoStudent);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load student information');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchAttendanceData = useCallback(async () => {
    try {
      // Demo mode: generate demo attendance data
      const demoRecords: AttendanceRecord[] = [
        {
          id: 'demo_1',
          student_id: 'demo_student',
          date: new Date().toISOString().split('T')[0],
          check_in_time: new Date().toISOString(),
          check_out_time: null,
          status: 'present',
          verification_method: 'biometric',
          location: { lat: 28.6139, lng: 77.2090, accuracy: 10 },
          fraud_attempts: null,
          created_at: new Date().toISOString(),
        }
      ];

      // Try to get real data first
      try {
        const response = await authService.getUser();
        if (response.user) {
          const { data: student } = await dbService.students.select(response.user.id);
          if (student) {
            const { data: records, error } = await dbService.attendanceRecords.select(student.id);
            if (!error && records) {
              setAttendanceRecords(records);
              const total = records.length;
              const present = records.filter(r => r.status === 'present').length;
              const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
              setAttendanceStats({ total, present, percentage });
              return;
            }
          }
        }
      } catch (error) {
        console.log('Using demo mode for attendance data');
      }

      // Use demo data
      setAttendanceRecords(demoRecords);
      setAttendanceStats({ total: 5, present: 4, percentage: 80 });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  }, []);

  const checkTodayAttendance = useCallback(async () => {
    try {
      // Demo mode: for testing, let's show attendance not marked
      setAttendanceMarked(false);
    } catch (error) {
      setAttendanceMarked(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentData();
    fetchAttendanceData();
    checkTodayAttendance();
  }, [fetchStudentData, fetchAttendanceData, checkTodayAttendance]);

  const handleLocationVerified = (verified: boolean) => {
    setLocationVerified(verified);
    if (!verified) {
      toast.error('You must be on campus to mark attendance');
      setIsMarkingAttendance(false);
    }
  };

  const handleFaceVerified = async (verified: boolean) => {
    if (verified && locationVerified && studentInfo) {
      try {
        // Save attendance record to database
        const { error } = await dbService.attendanceRecords.insert({
          student_id: studentInfo.id,
          date: new Date().toISOString().split('T')[0],
          check_in_time: new Date().toISOString(),
          status: 'present',
          verification_method: 'biometric',
          location: {
            lat: 28.6139,
            lng: 77.2090,
            accuracy: 10
          }
        });

        if (error) throw error;

        setAttendanceMarked(true);
        toast.success('Attendance marked successfully!');
        setIsMarkingAttendance(false);
        
        // Refresh attendance data
        fetchAttendanceData();
        checkTodayAttendance();
      } catch (error) {
        console.error('Error marking attendance:', error);
        toast.error('Failed to mark attendance');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate('/student/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-light text-foreground">Student Portal</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-foreground">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-foreground border-foreground/20">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info Card */}
          <Card className="glass-card border-foreground/10 fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="w-5 h-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold text-foreground">{studentInfo?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Roll Number</p>
                <p className="font-semibold text-foreground">{studentInfo?.roll_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class & Section</p>
                <p className="font-semibold text-foreground">
                  {studentInfo?.class || 'N/A'} - {studentInfo?.section || 'N/A'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-foreground/20 text-foreground hover:bg-foreground hover:text-background"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Download ID Card
              </Button>
            </CardContent>
          </Card>

          {/* Attendance Stats */}
          <Card className="glass-card border-foreground/10 fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5" />
                Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground mb-2">
                  {attendanceStats.percentage}%
                </div>
                <p className="text-sm text-muted-foreground">Overall Attendance</p>
              </div>
              <Progress value={attendanceStats.percentage} className="h-2" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Classes</p>
                  <p className="font-semibold text-foreground">{attendanceStats.total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Present</p>
                  <p className="font-semibold text-foreground">{attendanceStats.present}</p>
                </div>
              </div>
              {attendanceStats.percentage < 75 && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive">
                    Warning: Your attendance is below 75%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mark Attendance Card */}
          <Card className="glass-card border-foreground/10 fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Camera className="w-5 h-5" />
                Today's Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="font-semibold text-foreground">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={cn(
                    "font-semibold",
                    attendanceMarked ? "text-success" : "text-warning"
                  )}>
                    {attendanceMarked ? 'Marked' : 'Pending'}
                  </span>
                </div>
                
                {!attendanceMarked && (
                  <Button
                    onClick={() => setIsMarkingAttendance(true)}
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                    disabled={isMarkingAttendance}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Mark Attendance
                  </Button>
                )}
                
                {attendanceMarked && (
                  <div className="p-3 bg-success/10 rounded-lg">
                    <p className="text-sm text-success text-center">
                      ✓ Attendance marked successfully
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Marking Modal */}
        {isMarkingAttendance && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl glass-card border-foreground/20">
              <CardHeader>
                <CardTitle className="text-foreground">Mark Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Location Verification */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4" />
                    Step 1: Location Verification
                  </h3>
                  <GeofenceStatus
                    geofences={campusGeofences}
                    onLocationVerified={handleLocationVerified}
                  />
                </div>

                {/* Step 2: Face Verification */}
                {locationVerified && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                      <Camera className="w-4 h-4" />
                      Step 2: Face Verification
                    </h3>
                    <FaceRecognition
                      mode="capture"
                      onCapture={(imageData) => handleFaceVerified(true)}
                    />
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setIsMarkingAttendance(false)}
                  className="w-full border-foreground/20 text-foreground"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Attendance History */}
        <Card className="glass-card border-foreground/10 mt-6 fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="w-5 h-5" />
              Recent Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="text-left py-2 text-sm font-semibold text-foreground">Date</th>
                    <th className="text-left py-2 text-sm font-semibold text-foreground">Check-in</th>
                    <th className="text-left py-2 text-sm font-semibold text-foreground">Status</th>
                    <th className="text-left py-2 text-sm font-semibold text-foreground">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.slice(0, 10).map((record, index) => (
                    <tr key={index} className="border-b border-foreground/5">
                      <td className="py-2 text-sm text-foreground">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-sm text-muted-foreground">
                        {new Date(record.check_in_time).toLocaleTimeString()}
                      </td>
                      <td className="py-2">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          record.status === 'present' 
                            ? "bg-success/10 text-success" 
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-2 text-sm text-muted-foreground">
                        {record.verification_method}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendanceRecords.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}