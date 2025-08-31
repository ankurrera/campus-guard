import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Starfield } from "@/components/Starfield";
import { ArrowRight, Sparkles, Shield, Globe } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 3D Model Background */}
      <iframe 
        src='https://my.spline.design/thresholddarkambientui-gGVFgwyFF8YCFCzUAS48tnrF/' 
        frameBorder='0' 
        width='100%' 
        height='100%'
        className="absolute inset-0 w-full h-full z-0"
      ></iframe>

      {/* Existing Starfield component is still here, but the iframe will be its "sibling" in the DOM, so you can control their layering with z-index if needed. */}
      {/* <Starfield /> */}

      {/* Navigation */}
      <nav className="relative z-10 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-foreground rounded-full"></div>
            <span className="text-foreground font-light tracking-wider">BIOMETRIC</span>
          </div>
          <div className="flex gap-8">
            <button 
              onClick={() => navigate("/student/login")}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm tracking-wide"
            >
              Students
            </button>
            <button 
              onClick={() => navigate("/admin/login")}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm tracking-wide"
            >
              Admin
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-8 py-20 md:py-32">
        <div className="max-w-6xl">
          <div className="mb-8">
            <span className="text-muted-foreground text-sm tracking-[0.3em] uppercase">
              Next-Gen Attendance
            </span>
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-light text-foreground leading-[0.9] mb-12">
            Biometric
            <br />
            <span className="italic font-extralight">Attendance</span>
          </h1>
          
          <div className="flex items-start gap-16 mb-16">
            <div className="text-muted-foreground max-w-md">
              <p className="text-lg leading-relaxed">
                Revolutionary attendance management through advanced facial recognition, 
                real-time GPS verification, and intelligent anti-spoofing technology.
              </p>
            </div>
            
            <Button 
              variant="outline"
              size="lg"
              onClick={() => navigate("/student/signup")}
              className="bg-transparent border-foreground/20 text-foreground hover:bg-foreground hover:text-background transition-all duration-500 px-8 group"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-t border-foreground/10">
            <div>
              <div className="text-4xl font-light text-foreground mb-2">99.9%</div>
              <div className="text-xs text-muted-foreground tracking-wider uppercase">Accuracy</div>
            </div>
            <div>
              <div className="text-4xl font-light text-foreground mb-2">0.3s</div>
              <div className="text-xs text-muted-foreground tracking-wider uppercase">Recognition</div>
            </div>
            <div>
              <div className="text-4xl font-light text-foreground mb-2">24/7</div>
              <div className="text-xs text-muted-foreground tracking-wider uppercase">Monitoring</div>
            </div>
            <div>
              <div className="text-4xl font-light text-foreground mb-2">100%</div>
              <div className="text-xs text-muted-foreground tracking-wider uppercase">Secure</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 container mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="group">
            <div className="mb-6">
              <Sparkles className="w-8 h-8 text-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-xl font-light text-foreground mb-4">
              AI-Powered Recognition
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Advanced neural networks ensure accurate facial recognition with real-time 
              liveness detection to prevent spoofing attempts.
            </p>
          </div>
          
          <div className="group">
            <div className="mb-6">
              <Globe className="w-8 h-8 text-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-xl font-light text-foreground mb-4">
              GPS Geofencing
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Location-based verification ensures physical presence within designated 
              campus boundaries for authentic attendance.
            </p>
          </div>
          
          <div className="group">
            <div className="mb-6">
              <Shield className="w-8 h-8 text-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-xl font-light text-foreground mb-4">
              Enterprise Security
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              End-to-end encryption and secure cloud infrastructure protect sensitive 
              biometric data with compliance standards.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 container mx-auto px-8 py-20">
        <div className="border-t border-foreground/10 pt-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-light text-foreground mb-4">
                Ready to transform
                <br />
                <span className="italic">your institution?</span>
              </h2>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="default"
                size="lg"
                onClick={() => navigate("/admin/login")}
                className="bg-foreground text-background hover:bg-foreground/90 px-8"
              >
                Admin Portal
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-foreground/10">
        <div className="container mx-auto px-8 py-12">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              © 2024 Biometric System
            </div>
            <div className="flex gap-8">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Privacy
              </span>
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Terms
              </span>
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Contact
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;