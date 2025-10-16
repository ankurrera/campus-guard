import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  title: string;
  code: string;
  description?: string;
}

interface TeachingAssistant {
  id: string;
  user_id: string;
  name: string;
  email: string;
  department: string;
}

interface CourseAssignment {
  id: string;
  ta_id: string;
  course_id: string;
  assigned_at: string;
  teaching_assistants: TeachingAssistant;
  courses: Course;
}

export function CourseAssignments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachingAssistants, setTeachingAssistants] = useState<TeachingAssistant[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<CourseAssignment | null>(null);
  
  // Form states
  const [selectedTA, setSelectedTA] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadDepartmentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment]);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const loadDepartmentData = async () => {
    if (!selectedDepartment) return;
    
    setLoading(true);
    try {
      // Get department name for filtering
      const dept = departments.find(d => d.id === selectedDepartment);
      const deptName = dept?.name || '';

      // Load courses for this department (courses don't have department field, load all)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code');

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Load TAs for this department
      const { data: tasData, error: tasError } = await supabase
        .from('teaching_assistants')
        .select('id, name, email, department')
        .eq('department', deptName)
        .order('name');

      if (tasError) throw tasError;
      console.log('Loaded TAs:', tasData?.length || 0, 'TAs for department:', deptName);
      setTeachingAssistants(tasData || []);

      // Load assignments for this department - filter by TAs from this department
      // Note: course_tas.ta_id references profiles.id, which is teaching_assistants.user_id
      const taUserIds = (tasData || []).map(ta => ta.user_id);
      
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('course_tas')
        .select(`
          id,
          ta_id,
          course_id,
          assigned_at
        `)
        .in('ta_id', taUserIds)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Enrich assignments with TA and course data
      const enrichedAssignments = (assignmentsData || []).map((assignment: any) => {
        const ta = tasData?.find(t => t.user_id === assignment.ta_id);
        const course = coursesData?.find(c => c.id === assignment.course_id);
        return {
          ...assignment,
          teaching_assistants: ta,
          courses: course,
        };
      });
      
      setAssignments(enrichedAssignments as CourseAssignment[]);
    } catch (error) {
      console.error('Error loading department data:', error);
      toast.error('Failed to load department data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (assignment?: CourseAssignment) => {
    if (assignment) {
      setIsEditing(true);
      setCurrentAssignment(assignment);
      setSelectedTA(assignment.ta_id);
      setSelectedCourse(assignment.course_id);
    } else {
      setIsEditing(false);
      setCurrentAssignment(null);
      setSelectedTA('');
      setSelectedCourse('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentAssignment(null);
    setSelectedTA('');
    setSelectedCourse('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTA || !selectedCourse) {
      toast.error('Please select both a TA and a course');
      return;
    }

    try {
      if (isEditing && currentAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('course_tas')
          .update({
            ta_id: selectedTA,
            course_id: selectedCourse,
          })
          .eq('id', currentAssignment.id);

        if (error) throw error;
        toast.success('Assignment updated successfully');
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('course_tas')
          .insert({
            ta_id: selectedTA,
            course_id: selectedCourse,
          });

        if (error) throw error;
        toast.success('Assignment created successfully');
      }

      handleCloseModal();
      loadDepartmentData();
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      if (error.code === '23505') {
        toast.error('This TA is already assigned to this course');
      } else {
        toast.error('Failed to save assignment');
      }
    }
  };

  const handleDelete = async (assignmentId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('course_tas')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Assignment deleted successfully');
      loadDepartmentData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const taName = assignment.teaching_assistants?.name || '';
    const courseTitle = assignment.courses?.title || '';
    const courseCode = assignment.courses?.code || '';
    const query = searchQuery.toLowerCase();
    
    return (
      taName.toLowerCase().includes(query) ||
      courseTitle.toLowerCase().includes(query) ||
      courseCode.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Department Filter */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Select Department</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Select a department to view assignments" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDepartment && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Course Assignments</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assignments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Course
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading assignments...
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No assignments found for this department
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Department</th>
                      <th className="text-left p-4 font-medium">Course Name</th>
                      <th className="text-left p-4 font-medium">Course Code</th>
                      <th className="text-left p-4 font-medium">TA Name</th>
                      <th className="text-left p-4 font-medium">TA Email</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((assignment) => (
                      <tr
                        key={assignment.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-4">{assignment.teaching_assistants?.department || 'N/A'}</td>
                        <td className="p-4 font-medium">{assignment.courses?.title || 'N/A'}</td>
                        <td className="p-4">{assignment.courses?.code || 'N/A'}</td>
                        <td className="p-4">{assignment.teaching_assistants?.name || 'N/A'}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {assignment.teaching_assistants?.email || 'N/A'}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(assignment)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(assignment.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Assignment' : 'Create New Assignment'}
            </DialogTitle>
            <DialogDescription>
              Assign a course to a teaching assistant within the selected department.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={departments.find(d => d.id === selectedDepartment)?.name || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ta">Teaching Assistant</Label>
                <Select value={selectedTA} onValueChange={setSelectedTA} required>
                  <SelectTrigger id="ta">
                    <SelectValue placeholder="Select a TA" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachingAssistants.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No TAs available in this department
                      </div>
                    ) : (
                      teachingAssistants.map((ta) => (
                        <SelectItem key={ta.id} value={ta.user_id}>
                          {ta.name} ({ta.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse} required>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No courses available in this department
                      </div>
                    ) : (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update Assignment' : 'Create Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
