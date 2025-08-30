import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Demo admin login
    if (formData.email === 'admin@college.edu' && formData.password === 'admin123') {
      toast.success('Admin login successful!');
      navigate('/admin/dashboard');
    } else {
      toast.error('Invalid admin credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Admin Portal</h1>
          <p className="text-muted-foreground">Secure access for administrators</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card rounded-2xl p-8 fade-in space-y-6">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-sm">
            <p className="text-warning">Demo Credentials:</p>
            <p className="text-muted-foreground">Email: admin@college.edu</p>
            <p className="text-muted-foreground">Password: admin123</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="pl-10"
                placeholder="admin@college.edu"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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

          <Button
            type="submit"
            className={cn(buttonVariants({ variant: "royal", size: "lg" }), "w-full")}
          >
            <Shield className="w-4 h-4 mr-2" />
            Admin Sign In
          </Button>
        </form>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}