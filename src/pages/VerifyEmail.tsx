
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Mail } from "lucide-react";

const VerifyEmail = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      if (!tokenHash || type !== 'email') {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email'
        });

        if (error) throw error;

        setStatus('success');
        setMessage('Email verified successfully!');
        
        toast({
          title: "Email verified!",
          description: "Your email has been successfully verified.",
        });

        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Failed to verify email');
        
        toast({
          title: "Verification failed",
          description: error.message || "Failed to verify email. Please try again.",
          variant: "destructive",
        });
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const resendVerification = async () => {
    try {
      // This would need the user's email - in a real app you might store this in localStorage
      // or require them to enter it again
      toast({
        title: "Feature not implemented",
        description: "Please contact support to resend verification email.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to resend verification email.",
        variant: "destructive",
      });
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Mail className="w-8 h-8 text-blue-600 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-600" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying your email...';
      case 'success':
        return 'Email verified!';
      case 'error':
        return 'Verification failed';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-100';
      case 'success':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 text-center">
          <div className={`mx-auto mb-6 w-16 h-16 ${getBackgroundColor()} rounded-full flex items-center justify-center`}>
            {getIcon()}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {getTitle()}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {message}
          </p>

          <div className="space-y-4">
            {status === 'success' && (
              <>
                <p className="text-sm text-gray-500">
                  Redirecting to dashboard in 3 seconds...
                </p>
                <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Go to Dashboard
                </Button>
              </>
            )}
            
            {status === 'error' && (
              <>
                <Button onClick={resendVerification} variant="outline" className="w-full">
                  Resend Verification Email
                </Button>
                <Button onClick={() => navigate("/login")} className="w-full">
                  Back to Login
                </Button>
              </>
            )}
            
            {status === 'loading' && (
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
