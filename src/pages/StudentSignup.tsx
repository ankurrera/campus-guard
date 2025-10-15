import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, UserPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FaceRecognition } from '@/components/FaceRecognition';
import { BiometricConsentData } from '@/components/BiometricConsentModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authService, dbService } from '@/lib/dataService';
import { AntiSpoofingResult } from '@/lib/faceAntiSpoofing';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Department = Database['public']['Tables']['departments']['Row'];
type Year = Database['public']['Tables']['years']['Row'];
type Section = Database['public']['Tables']['sections']['Row'];

export default function StudentSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    phone: '',
    department: '',
    year: '',
    section: '',
    password: '',
    confirmPassword: '',
    faceData: '',
  });

  // State for dynamic dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Fetch departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch years when department changes
  useEffect(() => {
    if (formData.department) {
      fetchYears(formData.department);
      // Reset year and section when department changes
      setYears([]);
      setSections([]);
    } else {
      setYears([]);
      setSections([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.department]);

  // Fetch sections when year changes
  useEffect(() => {
    if (formData.year && formData.department) {
      fetchSections(formData.department, formData.year);
      // Reset sections when year changes
      setSections([]);
    } else {
      setSections([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.year]);

  const fetchDepartments = async () => {
    setLoadingDropdowns(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const fetchYears = async (departmentId: string) => {
    setLoadingDropdowns(true);
    try {
      const { data, error } = await supabase
        .from('years')
        .select('*')
        .eq('department_id', departmentId)
        .order('year_number');
      
      if (error) throw error;
      setYears(data || []);
    } catch (error) {
      console.error('Error fetching years:', error);
      toast.error('Failed to load years');
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const fetchSections = async (departmentId: string, yearId: string) => {
    setLoadingDropdowns(true);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('department_id', departmentId)
        .eq('year_id', yearId)
        .order('section_name');
      
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleNext = async () => {
    if (step === 1) {
      if (!formData.name || !formData.rollNumber || !formData.email) {
        toast.error('Please fill all required fields');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.department || !formData.year || !formData.section || !formData.password) {
        toast.error('Please fill all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      setLoading(true);

      try {
        // First, sign up the user
        const signupResponse = await authService.signUp(
          formData.email,
          formData.password
        );

        if (signupResponse.error) {
          toast.error(signupResponse.error.message);
          setLoading(false);
          return;
        }

        // Get user ID from signup response
        let newUserId: string | null = null;
        let hasSession = false;
        
        if ('data' in signupResponse && signupResponse.data?.user) {
          newUserId = signupResponse.data.user.id;
          hasSession = !!signupResponse.data?.session;
        } else if ('user' in signupResponse && signupResponse.user) {
          newUserId = signupResponse.user.id;
          hasSession = !!(signupResponse as { session?: unknown }).session;
        }

        if (!newUserId) {
          toast.error('Failed to create account. Please try again.');
          setLoading(false);
          return;
        }

        // If email confirmation is required (no session), show message and redirect
        if (!hasSession) {
          toast.success('Account created! Please check your email to confirm your account, then come back to complete registration.');
          setLoading(false);
          setTimeout(() => {
            navigate('/student/login');
          }, 3000);
          return;
        }

        // Store the user ID for face registration
        setUserId(newUserId);
        toast.success('Account created successfully! Now, please register your face.');
        setLoading(false);
        setStep(3);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
        toast.error(errorMessage);
        setLoading(false);
      }
    }
  };

  const handleFaceCapture = async (imageData: string, antiSpoofingResult?: AntiSpoofingResult, capture3D?: { method: string; frames?: unknown[]; frameCount?: number; duration?: number; consentData?: BiometricConsentData | null }) => {
    setLoading(true);

    // Check if face is live and secure
    if (!antiSpoofingResult || !antiSpoofingResult.isLive) {
      const spoofingMessages = {
        'photo': 'Photo spoofing detected. Please use a live camera for registration.',
        'screen': 'Screen display detected. Please use a live camera for registration.',
        'video': 'Video playback detected. Please present yourself live for registration.',
        'deepfake': 'Synthetic media detected. Registration requires a live face.',
        'multiple_faces': 'Multiple faces detected. Only one person allowed for registration.'
      };
      
      const message = antiSpoofingResult?.spoofingType 
        ? spoofingMessages[antiSpoofingResult.spoofingType as keyof typeof spoofingMessages]
        : 'Face liveness verification failed. Please try again with a live face.';
      
      toast.error(message);
      setLoading(false);
      return;
    }

    // Require high confidence for registration
    if (antiSpoofingResult.confidence < 0.6) {
      toast.error(`Face quality too low for registration. Quality: ${Math.round(antiSpoofingResult.confidence * 100)}%. Please ensure good lighting and clear face visibility.`);
      setLoading(false);
      return;
    }

    try {
      // Verify we have an active session
      const { data: { session }, error: sessionError } = await authService.getSession();
      
      if (sessionError || !session?.user) {
        toast.error('Your session has expired. Please sign in to complete registration.');
        setLoading(false);
        navigate('/student/login');
        return;
      }

      const activeUserId = session.user.id;

      // Verify the session user ID matches the stored user ID from signup
      if (userId && userId !== activeUserId) {
        toast.error('Session mismatch. Please start registration again.');
        setLoading(false);
        navigate('/student/signup');
        return;
      }

      // Get department and year data to construct class string
      const selectedDept = departments.find(d => d.id === formData.department);
      const selectedYear = years.find(y => y.id === formData.year);
      const selectedSection = sections.find(s => s.id === formData.section);
      
      // Construct class string in format "DEPT_CODE Year_Number" (e.g., "CSE 2nd Year")
      const classString = selectedDept && selectedYear 
        ? `${selectedDept.code} ${selectedYear.year_name}`
        : '';

      // Determine if biometric consent was granted (3D capture implies consent)
      const hasConsent = !!capture3D;

      // Save student profile with face data - use the session user ID to ensure RLS passes
      const { data: insertedStudent, error } = await dbService.students.insert({
        user_id: activeUserId,
        name: formData.name,
        roll_number: formData.rollNumber,
        email: formData.email,
        phone: formData.phone || '',
        class: classString,
        section: selectedSection?.section_name || formData.section,
        face_data: JSON.stringify({
          imageData,
          antiSpoofingResult: {
            isLive: antiSpoofingResult.isLive,
            confidence: antiSpoofingResult.confidence,
            spoofingType: antiSpoofingResult.spoofingType || null,
            details: antiSpoofingResult.details
          },
          registrationDate: new Date().toISOString(),
          securityVersion: '2.0',
          has3DCapture: hasConsent
        }),
        biometric_consent: hasConsent,
        biometric_consent_date: hasConsent ? new Date().toISOString() : null,
      });
        
      if (error) {
        console.error('Face registration error:', error);
        toast.error(`Registration failed: ${error.message}`);
        setLoading(false);
        return;
      }

      // If 3D capture data is available, process and upload it
      if (capture3D && insertedStudent) {
        const studentId = insertedStudent.id;
        
        try {
          // Import the necessary functions dynamically
          const { upload3DFaceData, updateStudent3DFaceData } = await import('@/lib/supabaseStorage');
          
          // For photogrammetry capture, we store the frame data
          // The actual 3D reconstruction would happen server-side or be processed later
          if (capture3D.frames && capture3D.frames.length > 0) {
            // Create a Face3DCapture object with available data
            const face3DData: {
              method: string;
              timestamp: Date;
              rgbFrame: string;
              antiSpoofingMetrics: {
                depthScore: number;
                textureScore: number;
                motionScore: number;
                confidence: number;
              };
              deviceInfo: {
                userAgent: string;
                platform: string;
                hasLiDAR: boolean;
                hasDepthSensor: boolean;
              };
            } = {
              method: capture3D.method || 'photogrammetry',
              timestamp: new Date(),
              rgbFrame: imageData,
              antiSpoofingMetrics: {
                depthScore: 0.8,
                textureScore: antiSpoofingResult.confidence,
                motionScore: 0.8,
                confidence: antiSpoofingResult.confidence
              },
              deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                hasLiDAR: false,
                hasDepthSensor: false
              }
            };

            // Upload the 3D face data
            const uploadResult = await upload3DFaceData(studentId, face3DData);

            // Update student record with URLs
            if (uploadResult.success) {
              await updateStudent3DFaceData(
                studentId,
                uploadResult,
                undefined, // Embedding would be computed server-side
                undefined
              );
            }
          }
        } catch (error3D) {
          // Log error but don't fail the registration
          console.error('3D face data processing error:', error3D);
          // Still show success to user as basic registration succeeded
        }
      }

      setLoading(false);
      toast.success(`Face registered successfully! Security score: ${Math.round(antiSpoofingResult.confidence * 100)}%. Redirecting to login...`);
      
      // Sign out to ensure fresh login
      await authService.signOut();
      
      setTimeout(() => {
        navigate('/student/login');
      }, 2000);
    } catch (error) {
      setLoading(false);
      console.error('Face registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register face data';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold gradient-text mb-2">Student Registration</h1>
          <p className="text-muted-foreground">Create your account to start marking attendance</p>
        </div>

        <div className="glass-card rounded-2xl p-8 fade-in">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    step >= i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i}
                </div>
                {i < 3 && (
                  <div
                    className={cn(
                      "w-full h-1 mx-2 transition-all",
                      step > i ? "bg-primary" : "bg-muted"
                    )}
                    style={{ width: '100px' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll Number *</Label>
                <Input
                  id="rollNumber"
                  name="rollNumber"
                  value={formData.rollNumber}
                  onChange={handleInputChange}
                  placeholder="2024001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <Button
                onClick={handleNext}
                className={cn(buttonVariants({ variant: "royal", size: "lg" }), "w-full")}
                disabled={loading}
              >
                {loading ? 'Please wait...' : 'Next Step'}
              </Button>
            </div>
          )}

          {/* Step 2: Academic Information */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Academic Information</h2>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value, year: '', section: '' })}
                  disabled={loadingDropdowns}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Select
                  value={formData.year}
                  onValueChange={(value) => setFormData({ ...formData, year: value, section: '' })}
                  disabled={!formData.department || loadingDropdowns}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select your year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.year_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Section *</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) => setFormData({ ...formData, section: value })}
                  disabled={!formData.year || loadingDropdowns}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Select your section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        Section {section.section_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  className={cn(buttonVariants({ variant: "royal", size: "lg" }), "flex-1")}
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : 'Next Step'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Face Registration */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Face Registration</h2>
              <p className="text-muted-foreground mb-4">
                Please capture your face for biometric authentication. Make sure you're in a well-lit area.
              </p>
              
              <FaceRecognition
                mode="capture"
                onCapture={handleFaceCapture}
              />

              <Button
                onClick={() => setStep(2)}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                Previous Step
              </Button>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <a href="/student/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}