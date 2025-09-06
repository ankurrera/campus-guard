import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FaceRecognition } from '@/components/FaceRecognition';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authService, dbService } from '@/lib/dataService';

export default function StudentSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    phone: '',
    class: '',
    section: '',
    password: '',
    confirmPassword: '',
    faceData: '',
  });

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
      if (!formData.class || !formData.section || !formData.password) {
        toast.error('Please fill all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      setLoading(true);

      const { data, error } = await authService.signUp(
        formData.email,
        formData.password
      );

      setLoading(false);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success('Successfully created an account! Now, please register your face.');
        setStep(3);
      }
    }
  };

  const handleFaceCapture = async (imageData: string) => {
    setLoading(true);

    // Fetch the current authenticated user's session
    const { data: { user }, error: authError } = await authService.getUser();

    if (authError || !user) {
      toast.error('Authentication error. Please log in again.');
      setLoading(false);
      return;
    }

    const { error } = await dbService.students.insert({
      user_id: user.id, // Use the real-time user ID from the session
      name: formData.name,
      roll_number: formData.rollNumber,
      email: formData.email,
      phone: formData.phone,
      class: formData.class,
      section: formData.section,
      face_data: imageData,
    });
      
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Face captured and registration complete! Redirecting to login...');
    setTimeout(() => {
      navigate('/student/login');
    }, 2000);
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
                <Label htmlFor="class">Class *</Label>
                <Select
                  value={formData.class}
                  onValueChange={(value) => setFormData({ ...formData, class: value })}
                >
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cse-1">CSE 1st Year</SelectItem>
                    <SelectItem value="cse-2">CSE 2nd Year</SelectItem>
                    <SelectItem value="cse-3">CSE 3rd Year</SelectItem>
                    <SelectItem value="cse-4">CSE 4th Year</SelectItem>
                    <SelectItem value="ece-1">ECE 1st Year</SelectItem>
                    <SelectItem value="ece-2">ECE 2nd Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Section *</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Select your section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="C">Section C</SelectItem>
                    <SelectItem value="D">Section D</SelectItem>
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