
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { isValidEmail, isValidPassword } from "@/lib/utils";
import { LightSignUp } from "@/components/ui/sign-up";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!fullName.trim()) {
      setError("Full name is required");
      return false;
    }
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
    if (!isValidPassword(password)) {
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
      const { error } = await signUp(
        email, 
        password,
        { full_name: fullName }
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
    setFullName(e.target.value);
    if (error) setError("");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const handleSignInClick = () => {
    navigate("/login");
  };

  return (
    <LightSignUp
      fullName={fullName}
      email={email}
      password={password}
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
