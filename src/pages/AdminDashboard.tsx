import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MapPin, Shield, AlertTriangle, 
  TrendingUp, Download, Settings, Search, Filter,
  Eye, Edit, Trash2, CheckCircle, XCircle, LogOut, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { SecurityDashboard } from '@/components/SecurityDashboard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authService, dbService, statsService, getServiceStatus } from '@/lib/dataService';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    fraudAttempts: 0,
    attendanceRate: 0,
  });
  const [attendanceRecords, setAttendanceRecords] = useState<unknown[]>([]);
  const [students, setStudents] = useState<unknown[]>([]);
  const [geofences, setGeofences] = useState<unknown[]>([]);
  const [serviceStatus, setServiceStatus] = useState({ supabase: false, mockData: true });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get service status
      const status = await getServiceStatus();
      setServiceStatus(status);

      // Load stats
      const statsData = await statsService.getStats();
      setStats(statsData);

      // Load attendance records with student info
      const { data: attendanceData } = await dbService.attendanceRecords.selectWithStudents();
      setAttendanceRecords(attendanceData || []);

      // Load students
      const { data: studentsData } = await dbService.students.select();
      setStudents(studentsData || []);

      // Load geofences
      const { data: geofencesData } = await dbService.geofences.select();
      setGeofences(geofencesData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const handleExportAttendance = () => {
    // Create CSV content
    const csvContent = [
      ['Student Name', 'Roll Number', 'Date', 'Check-in Time', 'Status', 'Method'],
      ...attendanceRecords.map(record => [
        record.student_name || record.students?.name || 'Unknown',
        record.student_roll || record.students?.roll_number || 'Unknown',
        new Date(record.date).toLocaleDateString(),
        new Date(record.check_in_time).toLocaleTimeString(),
        record.status,
        record.verification_method
      ])
    ].map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Attendance report exported successfully!');
  };

  const handleAddGeofence = async () => {
    try {
      const { data, error } = await dbService.geofences.insert({
        name: `Campus Area ${geofences.length + 1}`,
        type: 'radius',
        center: { lat: 28.6139 + (Math.random() * 0.001), lng: 77.2090 + (Math.random() * 0.001) },
        radius: 100,
        active: true,
      });

      if (error) throw error;

      toast.success('New geofence added successfully!');
      loadDashboardData(); // Reload data
    } catch (error) {
      console.error('Error adding geofence:', error);
      toast.error('Failed to add geofence');
    }
  };

  // Demo data for fraud logs (this would come from database in real implementation)
  const fraudLogs = [
    { id: 1, studentName: 'Alex Turner', type: 'Photo Spoofing', time: '08:45 AM', confidence: 92 },
    { id: 2, studentName: 'Chris Lee', type: 'Screen Detection', time: '09:10 AM', confidence: 88 },
    { id: 3, studentName: 'Pat Morgan', type: 'Multiple Faces', time: '10:30 AM', confidence: 95 },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="glass-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Data Source: {serviceStatus.supabase ? '🟢 Supabase' : '🟡 Mock Data'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="w-10 h-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Present Today</p>
                  <p className="text-3xl font-bold text-success">{stats.presentToday}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fraud Attempts</p>
                  <p className="text-3xl font-bold text-destructive">{stats.fraudAttempts}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-3xl font-bold">{stats.attendanceRate}%</p>
                </div>
                <TrendingUp className="w-10 h-10 text-accent opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="glass-card p-1">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="security">Security Monitor</TabsTrigger>
            <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
            <TabsTrigger value="geofence">Geofence Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Today's Attendance</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportAttendance}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Student Name</th>
                        <th className="text-left p-4 font-medium">Roll No.</th>
                        <th className="text-left p-4 font-medium">Check-in Time</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Method</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords
                        .filter(record => {
                          const studentName = record.student_name || record.students?.name || '';
                          const rollNumber = record.student_roll || record.students?.roll_number || '';
                          return studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
                        })
                        .slice(0, 10)
                        .map((record) => (
                        <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4 font-medium">{record.student_name || record.students?.name || 'Unknown'}</td>
                          <td className="p-4">{record.student_roll || record.students?.roll_number || 'Unknown'}</td>
                          <td className="p-4">{new Date(record.check_in_time).toLocaleTimeString()}</td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-semibold",
                              record.status === 'present' && "bg-success/20 text-success",
                              record.status === 'late' && "bg-warning/20 text-warning",
                              record.status === 'absent' && "bg-destructive/20 text-destructive"
                            )}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground capitalize">{record.verification_method}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => toast.info(`Viewing details for ${record.student_name || 'student'}`)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => toast.info('Edit functionality coming soon')}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {attendanceRecords.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No attendance records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Monitor Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecurityDashboard />
          </TabsContent>

          {/* Fraud Detection Tab */}
          <TabsContent value="fraud" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-destructive" />
                  Fraud Detection Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fraudLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{log.studentName}</p>
                        <p className="text-sm text-muted-foreground">Type: {log.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{log.time}</p>
                        <p className="text-sm text-muted-foreground">Confidence: {log.confidence}%</p>
                      </div>
                      <Button variant="outline" size="sm" className="ml-4">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geofence Settings Tab */}
          <TabsContent value="geofence" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Campus Geofence Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {geofences.map((geofence) => (
                    <div key={geofence.id} className="space-y-2">
                      <label className="text-sm font-medium">{geofence.name}</label>
                      <div className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Center Point</span>
                          <span className="text-sm text-muted-foreground">
                            {geofence.center?.lat?.toFixed(4)}°N, {geofence.center?.lng?.toFixed(4)}°E
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Radius</span>
                          <span className="text-sm text-muted-foreground">{geofence.radius} meters</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status</span>
                          <span className={cn(
                            "text-sm",
                            geofence.active ? "text-success" : "text-destructive"
                          )}>
                            {geofence.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toast.info('Edit functionality coming soon')}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toast.info('Delete functionality coming soon')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  className={cn(buttonVariants({ variant: "royal" }))}
                  onClick={handleAddGeofence}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Geofence
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Weekly Attendance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, i) => (
                      <div key={day} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{day}</span>
                          <span className="text-muted-foreground">{85 + i * 2}%</span>
                        </div>
                        <Progress value={85 + i * 2} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Department-wise Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { dept: 'Computer Science', value: 92 },
                      { dept: 'Electronics', value: 88 },
                      { dept: 'Mechanical', value: 85 },
                      { dept: 'Civil', value: 90 },
                    ].map((dept) => (
                      <div key={dept.dept} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{dept.dept}</span>
                          <span className="text-muted-foreground">{dept.value}%</span>
                        </div>
                        <Progress value={dept.value} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      )}
    </div>
  );
}