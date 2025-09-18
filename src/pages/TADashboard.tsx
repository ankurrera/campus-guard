import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Starfield } from "@/components/Starfield";
import { TeachingAssistant, Course, AttendanceRecord } from "@/types/ta";
import { LogOut, Users, BookOpen, Calendar, Clock } from "lucide-react";

const TADashboard = () => {
  const [ta, setTa] = useState<TeachingAssistant | null>(null);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTAData();
  }, []);

  const fetchTAData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        navigate("/ta/login");
        return;
      }

      // Fetch TA profile
      const { data: taData, error: taError } = await supabase
        .from('teaching_assistants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (taError || !taData) throw taError || new Error('TA data not found');
      
      setTa({
        id: (taData as any).id,
        name: (taData as any).name,
        email: (taData as any).email,
        employeeId: (taData as any).employee_id,
        phone: (taData as any).phone,
        qualification: (taData as any).qualification,
        userId: (taData as any).user_id,
        createdAt: new Date((taData as any).created_at),
        updatedAt: new Date((taData as any).updated_at),
      });

      // Fetch assigned courses
      const { data: courseAssignments, error: assignmentError } = await supabase
        .from('course_assignments')
        .select(`
          course_id,
          courses (*)
        `)
        .eq('ta_id', (taData as any).id);

      if (assignmentError) throw assignmentError;

      const courses = courseAssignments?.map((assignment: any) => ({
        id: assignment.courses?.id,
        name: assignment.courses?.name,
        code: assignment.courses?.code,
        description: assignment.courses?.description,
        department: assignment.courses?.department,
        semester: assignment.courses?.semester,
        credits: assignment.courses?.credits,
        createdAt: new Date(assignment.courses?.created_at),
        updatedAt: new Date(assignment.courses?.updated_at),
      })) || [];

      setAssignedCourses(courses);

      // Fetch recent attendance records (last 10)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          *,
          students (name, roll_number)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (attendanceError) throw attendanceError;

      const attendance = attendanceData?.map((record: any) => ({
        id: record.id,
        studentId: record.student_id,
        date: new Date(record.date),
        checkInTime: new Date(record.check_in_time),
        checkOutTime: record.check_out_time ? new Date(record.check_out_time) : undefined,
        status: record.status as 'present' | 'absent' | 'late',
        location: record.location,
        verificationMethod: record.verification_method as 'face' | 'manual' | 'override',
        fraudAttempts: record.fraud_attempts,
        studentName: record.students?.name,
        studentRollNumber: record.students?.roll_number,
      })) || [];

      setRecentAttendance(attendance);

      // Get total students count
      const { count: totalStudents, error: countError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setStudentsCount(totalStudents || 0);

    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Starfield />
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (!ta) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Starfield />
        <div className="text-white text-xl">TA profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-black text-white">
      <Starfield />
      
      {/* Header */}
      <div className="relative z-10 border-b border-gray-700 bg-gray-900/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10 bg-blue-600">
                <AvatarFallback>
                  {ta.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold">TA Dashboard</h1>
                <p className="text-sm text-gray-300">{ta.name} • {ta.employeeId}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Assigned Courses
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{assignedCourses.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentsCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Recent Records
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{recentAttendance.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Courses */}
        <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Assigned Courses</CardTitle>
            <CardDescription className="text-gray-300">
              Courses you are assisting with this semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedCourses.map((course) => (
                  <Card key={course.id} className="bg-gray-800 border-gray-600">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white">
                          {course.code}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-blue-600 text-white">
                          {course.credits} Credits
                        </Badge>
                      </div>
                      <CardDescription className="text-gray-300">
                        {course.name}
                      </CardDescription>
                    </CardHeader>
                    {course.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-400">{course.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No courses assigned yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Attendance Records</CardTitle>
            <CardDescription className="text-gray-300">
              Latest attendance submissions across all courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentAttendance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-300">Student</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Check In</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttendance.map((record) => (
                    <TableRow key={record.id} className="border-gray-600">
                      <TableCell className="text-white">
                        <div>
                          <div className="font-medium">{(record as any).studentName}</div>
                          <div className="text-sm text-gray-400">{(record as any).studentRollNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {record.date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {record.checkInTime.toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'present' ? 'default' :
                            record.status === 'late' ? 'secondary' : 'destructive'
                          }
                          className={
                            record.status === 'present' ? 'bg-green-600 text-white' :
                            record.status === 'late' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300 capitalize">
                        {record.verificationMethod}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No attendance records found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TADashboard;