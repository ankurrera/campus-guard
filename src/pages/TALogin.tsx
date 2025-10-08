import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Starfield } from "@/components/Starfield";

const TALogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is a TA
        const { data: roleData, error: roleError } = await supabase
          // @ts-ignore - RPC parameter typing issue
          .rpc('get_user_role', { user_uuid: data.user.id });

        if (roleError) throw roleError;

        if (roleData === 'ta') {
          toast({
            title: "Login successful",
            description: "Welcome back, Teaching Assistant!",
          });
          navigate("/ta/dashboard");
        } else {
          setError("Access denied. This portal is for Teaching Assistants only.");
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-black">
      <Starfield />
      <div className="relative z-10 w-full max-w-md p-6">
        <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-700">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-white">
              TA Login
            </CardTitle>
            <CardDescription className="text-center text-gray-300">
              Sign in to your Teaching Assistant account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ta@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="flex justify-between text-sm">
                <Button
                  variant="link"
                  onClick={() => navigate("/ta/signup")}
                  className="text-blue-400 hover:text-blue-300 p-0"
                >
                  New TA? Sign up
                </Button>
                <Button
                  variant="link"
                  onClick={() => navigate("/")}
                  className="text-gray-400 hover:text-gray-300 p-0"
                >
                  Back to Home
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default TALogin;