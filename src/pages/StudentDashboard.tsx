import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, Camera, FileDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FaceRecognition } from '@/components/FaceRecognition';
import { GeofenceStatus } from '@/components/GeofenceStatus';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Demo geofences
const campusGeofences = [
  {
    type: 'radius' as const,
    center: { lat: 28.6139, lng: 77.2090 }, // Example: New Delhi coordinates
    radius: 200, // 200 meters
    active: true,
  },
];

export default function StudentDashboard() {
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const handleLocationVerified = (verified: boolean) => {
    setLocationVerified(verified);
    if (!verified) {
      toast.error('You must be on campus to mark attendance');
      setIsMarkingAttendance(false);
    }
  };

  const handleFaceVerified = (verified: boolean) => {
    if (verified && locationVerified) {
      setAttendanceMarked(true);
      toast.success('Attendance marked successfully!');
      setIsMarkingAttendance(false);
    }
  };

  // Demo data
  const studentInfo = {
    name: 'John Doe',
    rollNumber: '2024001',
    class: 'CSE 3rd Year',
    section: 'A',
  };

  const attendanceStats = {
    total: 120,
    present: 108,
    percentage: 90,
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="glass-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold gradient-text">Student Portal</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info Card */}
          <Card className="glass-card fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{studentInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Roll Number</p>
                <p className="font-semibold">{studentInfo.rollNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class & Section</p>
                <p className="font-semibold">{studentInfo.class} - {studentInfo.section}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
              >
                <Camera className="w-4 h-4 mr-2" />
                Update Face Data
              </Button>
            </CardContent>
          </Card>

          {/* Attendance Stats */}
          <Card className="glass-card fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Overall Attendance</span>
                  <span className="text-sm font-semibold">{attendanceStats.percentage}%</span>
                </div>
                <Progress value={attendanceStats.percentage} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="text-2xl font-bold text-success">{attendanceStats.present}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
                <div className="text-center p-3 bg-destructive/10 rounded-lg">
                  <p className="text-2xl font-bold text-destructive">{attendanceStats.total - attendanceStats.present}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </CardContent>
          </Card>

          {/* Today's Status */}
          <Card className="glass-card fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Today's Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-semibold",
                    attendanceMarked
                      ? "bg-success/20 text-success"
                      : "bg-warning/20 text-warning"
                  )}>
                    {attendanceMarked ? 'Present' : 'Not Marked'}
                  </span>
                </div>
                {attendanceMarked && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Check-in Time</span>
                    <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
              
              {!attendanceMarked && (
                <Button
                  onClick={() => setIsMarkingAttendance(true)}
                  className={cn(buttonVariants({ variant: "royal" }), "w-full mt-6")}
                  disabled={isMarkingAttendance}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Mark Attendance
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Attendance Marking Section */}
        {isMarkingAttendance && !attendanceMarked && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold">Mark Your Attendance</h2>
            
            {/* Step 1: Location Verification */}
            <div className="glass-card rounded-xl p-6 fade-in">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Step 1: Location Verification
              </h3>
              <GeofenceStatus
                geofences={campusGeofences}
                onLocationVerified={handleLocationVerified}
              />
            </div>

            {/* Step 2: Face Recognition */}
            {locationVerified && (
              <div className="glass-card rounded-xl p-6 fade-in">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Step 2: Face Recognition
                </h3>
                <FaceRecognition
                  mode="verify"
                  onCapture={() => {}}
                  onVerify={handleFaceVerified}
                />
              </div>
            )}

            <Button
              onClick={() => setIsMarkingAttendance(false)}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Recent Attendance */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Recent Attendance</h2>
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Check In</th>
                      <th className="text-left p-4 font-medium">Check Out</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4">{new Date(Date.now() - i * 86400000).toLocaleDateString()}</td>
                        <td className="p-4">09:00 AM</td>
                        <td className="p-4">05:00 PM</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-success/20 text-success">
                            Present
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs text-muted-foreground">On Campus</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}