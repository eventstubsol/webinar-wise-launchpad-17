
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { isValidEmail } from "@/lib/utils";
import { LightLogin } from "@/components/ui/sign-in";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!email) {
      setError("Email is required");
      return false;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email");
      return false;
    }
    if (!password) {
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
      const { error } = await signIn(email, password);
      
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
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const handleSignUpClick = () => {
    navigate("/register");
  };

  const handleForgotPasswordClick = () => {
    navigate("/forgot-password");
  };

  const handleBackToHomepage = () => {
    navigate("/");
  };

  return (
    <LightLogin
      email={email}
      password={password}
      loading={loading}
      error={error}
      onEmailChange={handleEmailChange}
      onPasswordChange={handlePasswordChange}
      onSubmit={handleSubmit}
      onSignUpClick={handleSignUpClick}
      onForgotPasswordClick={handleForgotPasswordClick}
      onBackToHomepage={handleBackToHomepage}
    />
  );
};

export default Login;
