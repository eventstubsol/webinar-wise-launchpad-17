
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { auth } from "@/lib/supabase";
import { isValidEmail, isValidPassword } from "@/lib/utils";
import { LightSignUp } from "@/components/ui/sign-up";
import type { RegisterCredentials } from "@/types";

const Register = () => {
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    email: "",
    password: "",
    full_name: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const validateForm = () => {
    if (!credentials.full_name.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!credentials.email) {
      setError("Email is required");
      return false;
    }
    if (!isValidEmail(credentials.email)) {
      setError("Please enter a valid email");
      return false;
    }
    if (!credentials.password) {
      setError("Password is required");
      return false;
    }
    if (!isValidPassword(credentials.password)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, and number");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
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
      setError(error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({ ...prev, full_name: e.target.value }));
    if (error) setError("");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({ ...prev, email: e.target.value }));
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({ ...prev, password: e.target.value }));
    if (error) setError("");
  };

  const handleSignInClick = () => {
    navigate("/login");
  };

  return (
    <LightSignUp
      fullName={credentials.full_name}
      email={credentials.email}
      password={credentials.password}
      loading={loading}
      error={error}
      onFullNameChange={handleFullNameChange}
      onEmailChange={handleEmailChange}
      onPasswordChange={handlePasswordChange}
      onSubmit={handleSubmit}
      onSignInClick={handleSignInClick}
    />
  );
};

export default Register;
