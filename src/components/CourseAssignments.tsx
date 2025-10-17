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

interface Year {
  id: string;
  department_id: string;
  year_number: number;
  year_name: string;
}

interface Semester {
  id: string;
  year_id: string;
  semester_number: number;
  semester_name: string;
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
  
  // Form states - now includes Year and Semester
  const [formDepartment, setFormDepartment] = useState<string>('');
  const [years, setYears] = useState<Year[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedTA, setSelectedTA] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  useEffect(() => {
    loadDepartments();
    loadAllTeachingAssistants(); // Load TAs once on mount
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadDepartmentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment]);

  // Load years when form department is selected
  useEffect(() => {
    if (formDepartment) {
      loadYears(formDepartment);
    } else {
      setYears([]);
      setSelectedYear('');
    }
  }, [formDepartment]);

  // Load semesters when year is selected
  useEffect(() => {
    if (selectedYear) {
      loadSemesters(selectedYear);
    } else {
      setSemesters([]);
      setSelectedSemester('');
    }
  }, [selectedYear]);

  // Load courses when semester is selected
  useEffect(() => {
    if (selectedSemester && formDepartment) {
      loadCourses(selectedSemester);
    } else {
      setCourses([]);
      setSelectedCourse('');
    }
  }, [selectedSemester, formDepartment]);

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

  const loadAllTeachingAssistants = async () => {
    try {
      // Load all TAs from the system (independent dropdown)
      const { data: tasData, error: tasError } = await supabase
        .from('teaching_assistants')
        .select('id, user_id, name, email, department')
        .order('name');

      if (tasError) {
        console.error('Error loading TAs:', tasError);
        throw tasError;
      }
      console.log('Loaded TAs:', tasData?.length || 0, 'TAs');
      setTeachingAssistants(tasData || []);
    } catch (error) {
      console.error('Error loading teaching assistants:', error);
      toast.error('Failed to load teaching assistants');
    }
  };

  const loadYears = async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('years')
        .select('*')
        .eq('department_id', departmentId)
        .order('year_number');

      if (error) throw error;
      setYears(data || []);
    } catch (error) {
      console.error('Error loading years:', error);
      toast.error('Failed to load years');
    }
  };

  const loadSemesters = async (yearId: string) => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('year_id', yearId)
        .order('semester_number');

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error('Error loading semesters:', error);
      toast.error('Failed to load semesters');
    }
  };

  const loadCourses = async (semesterId: string) => {
    try {
      // Get courses linked to this semester via department_course_map
      const { data, error } = await supabase
        .from('department_course_map')
        .select(`
          course_id,
          courses (
            id,
            code,
            title,
            description
          )
        `)
        .eq('semester_id', semesterId);

      if (error) throw error;
      
      // Extract courses from the mapping
      const coursesData = (data || [])
        .map((item: any) => item.courses)
        .filter((course: any) => course !== null);
      
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const loadDepartmentData = async () => {
    if (!selectedDepartment) return;
    
    setLoading(true);
    try {
      // Load all TAs (already loaded on mount, but we need to reload assignments)
      const { data: tasData, error: tasError } = await supabase
        .from('teaching_assistants')
        .select('id, user_id, name, email, department')
        .order('name');

      if (tasError) {
        console.error('Error loading TAs:', tasError);
        throw tasError;
      }

      // Load courses for display in the table (all courses)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code');

      if (coursesError) throw coursesError;

      // Load assignments for all TAs
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

      if (assignmentsError) {
        console.error('Error loading assignments:', assignmentsError);
        throw assignmentsError;
      }
      console.log('Loaded assignments:', assignmentsData?.length || 0);

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
      // For editing, we don't set department/year/semester as they are derived from course
      setFormDepartment('');
      setSelectedYear('');
      setSelectedSemester('');
    } else {
      setIsEditing(false);
      setCurrentAssignment(null);
      setFormDepartment('');
      setSelectedYear('');
      setSelectedSemester('');
      setSelectedTA('');
      setSelectedCourse('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentAssignment(null);
    setFormDepartment('');
    setSelectedYear('');
    setSelectedSemester('');
    setSelectedTA('');
    setSelectedCourse('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!formDepartment) {
      toast.error('Please select a department');
      return;
    }
    if (!selectedYear) {
      toast.error('Please select a year');
      return;
    }
    if (!selectedSemester) {
      toast.error('Please select a semester');
      return;
    }
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }
    if (!selectedTA) {
      toast.error('Please select a teaching assistant');
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
        toast.success('Assignment Created Successfully');
      }

      handleCloseModal();
      loadDepartmentData();
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      console.error('Assignment details - TA ID:', selectedTA, 'Course ID:', selectedCourse);
      if (error.code === '23505') {
        toast.error('This TA is already assigned to this course');
      } else {
        toast.error(`Failed to save assignment: ${error.message || 'Unknown error'}`);
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
              Assign a course to any teaching assistant in the system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formDepartment} 
                  onValueChange={(value) => {
                    setFormDepartment(value);
                    setSelectedYear('');
                    setSelectedSemester('');
                    setSelectedCourse('');
                  }}
                  disabled={isEditing}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No departments available
                      </div>
                    ) : (
                      departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select 
                  value={selectedYear} 
                  onValueChange={(value) => {
                    setSelectedYear(value);
                    setSelectedSemester('');
                    setSelectedCourse('');
                  }}
                  disabled={!formDepartment || isEditing}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {formDepartment ? 'No years available' : 'Select a department first'}
                      </div>
                    ) : (
                      years.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.year_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Select 
                  value={selectedSemester} 
                  onValueChange={(value) => {
                    setSelectedSemester(value);
                    setSelectedCourse('');
                  }}
                  disabled={!selectedYear || isEditing}
                >
                  <SelectTrigger id="semester">
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {selectedYear ? 'No semesters available' : 'Select a year first'}
                      </div>
                    ) : (
                      semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id}>
                          {semester.semester_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select 
                  value={selectedCourse} 
                  onValueChange={setSelectedCourse}
                  disabled={!selectedSemester || isEditing}
                >
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {selectedSemester ? 'No courses available for this semester' : 'Select a semester first'}
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

              <div className="space-y-2">
                <Label htmlFor="ta">Teaching Assistant</Label>
                <Select value={selectedTA} onValueChange={setSelectedTA}>
                  <SelectTrigger id="ta">
                    <SelectValue placeholder="Select Teaching Assistant" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachingAssistants.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No TAs available in the system
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
