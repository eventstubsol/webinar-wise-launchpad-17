
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/common/FormField";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Header } from "@/components/layout/Header";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { auth } from "@/lib/supabase";
import { isValidEmail, isValidPassword } from "@/lib/utils";
import type { RegisterCredentials } from "@/types";

const Register = () => {
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    email: "",
    password: "",
    full_name: ""
  });
  const [errors, setErrors] = useState<Partial<RegisterCredentials>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: Partial<RegisterCredentials> = {};

    if (!credentials.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }

    if (!credentials.email) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(credentials.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!credentials.password) {
      newErrors.password = "Password is required";
    } else if (!isValidPassword(credentials.password)) {
      newErrors.password = "Password must be at least 8 characters with uppercase, lowercase, and number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await auth.signUp(
        credentials.email, 
        credentials.password,
        { full_name: credentials.full_name }
      );
      
      if (error) throw error;

      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account.",
      });
      
      navigate("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterCredentials]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Create Your Account
            </CardTitle>
            <CardDescription className="text-center">
              Start hosting professional webinars today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Full Name"
                name="full_name"
                placeholder="Enter your full name"
                value={credentials.full_name}
                onChange={handleInputChange}
                error={errors.full_name}
                required
              />

              <FormField
                label="Email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={handleInputChange}
                error={errors.email}
                required
              />
              
              <FormField
                label="Password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                value={credentials.password}
                onChange={handleInputChange}
                error={errors.password}
                required
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
                ← Back to Home
              </Link>
            </div>

            <div className="mt-6 text-xs text-gray-500 text-center">
              By creating an account, you agree to our{" "}
              <Link to="/" className="hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="/" className="hover:underline">Privacy Policy</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
