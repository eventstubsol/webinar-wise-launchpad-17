
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { auth } from "@/lib/supabase";
import { isValidEmail } from "@/lib/utils";
import { LightLogin } from "@/components/ui/sign-in";
import type { LoginCredentials } from "@/types";

const Login = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const validateForm = () => {
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
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await auth.signIn(credentials.email, credentials.password);
      
      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have been successfully signed in.",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      setError(error.message || "Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({ ...prev, email: e.target.value }));
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({ ...prev, password: e.target.value }));
    if (error) setError("");
  };

  const handleSignUpClick = () => {
    navigate("/register");
  };

  return (
    <LightLogin
      email={credentials.email}
      password={credentials.password}
      loading={loading}
      error={error}
      onEmailChange={handleEmailChange}
      onPasswordChange={handlePasswordChange}
      onSubmit={handleSubmit}
      onSignUpClick={handleSignUpClick}
    />
  );
};

export default Login;
