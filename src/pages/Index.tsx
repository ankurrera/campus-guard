// Update this page (the content is just a fallback if you fail to update the page)

import { useNavigate } from 'react-router-dom';
import { Fingerprint, Shield, Users, MapPin, Camera, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: 'Face Recognition',
      description: 'Advanced biometric authentication with live face detection',
    },
    {
      icon: MapPin,
      title: 'GPS Geofencing',
      description: 'Ensure attendance is marked only from campus premises',
    },
    {
      icon: Shield,
      title: 'Anti-Spoofing AI',
      description: 'Detect and prevent fake attendance attempts',
    },
    {
      icon: BarChart,
      title: 'Real-time Analytics',
      description: 'Comprehensive attendance reports and insights',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6 pulse-glow">
            <Fingerprint className="w-12 h-12 text-primary" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">Biometric Attendance</span>
            <br />
            <span className="text-foreground">System</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Advanced face recognition with GPS geofencing for secure, automated attendance tracking
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/student/signup')}
              className={cn(buttonVariants({ variant: "royal", size: "lg" }))}
            >
              <Users className="w-5 h-5 mr-2" />
              Student Portal
            </Button>
            <Button
              onClick={() => navigate('/admin/login')}
              variant="outline"
              size="lg"
              className="glass-card"
            >
              <Shield className="w-5 h-5 mr-2" />
              Admin Access
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="glass-card hover:scale-105 transition-transform duration-300 fade-in">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 Biometric Attendance System. Built with cutting-edge technology.</p>
            <p className="mt-2">Ensuring secure and accurate attendance tracking for educational institutions.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
