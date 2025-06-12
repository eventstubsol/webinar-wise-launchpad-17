
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

const VerifyEmail = () => {
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [isResending, setIsResending] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if user is already verified and authenticated
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Check for verification token in URL
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (token && type === 'signup') {
      // Handle email verification
      setVerificationStatus('success');
    }
  }, [searchParams]);

  const handleResendEmail = async () => {
    setIsResending(true);
    // In a real implementation, you would call your resend verification email function
    // For now, we'll simulate the action
    setTimeout(() => {
      setIsResending(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full mb-4">
              {verificationStatus === 'success' ? (
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              ) : verificationStatus === 'error' ? (
                <div className="bg-red-100 rounded-full p-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              ) : (
                <div className="bg-blue-100 rounded-full p-3">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl">
              {verificationStatus === 'success' ? 'Email verified!' : 
               verificationStatus === 'error' ? 'Verification failed' : 
               'Check your email'}
            </CardTitle>
            <CardDescription>
              {verificationStatus === 'success' ? 
                'Your email has been successfully verified. You can now sign in to your account.' :
               verificationStatus === 'error' ? 
                'The verification link is invalid or has expired.' :
                'We sent a verification link to your email address.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {verificationStatus === 'pending' && (
              <>
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Please check your email and click the verification link to activate your account. 
                    If you don't see the email, check your spam folder.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button
                    onClick={handleResendEmail}
                    variant="outline"
                    className="w-full"
                    disabled={isResending}
                  >
                    {isResending ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Resend verification email
                  </Button>

                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/login">
                      Back to login
                    </Link>
                  </Button>
                </div>
              </>
            )}

            {verificationStatus === 'success' && (
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/login">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Sign in to your account
                  </Link>
                </Button>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="space-y-3">
                <Button
                  onClick={handleResendEmail}
                  className="w-full"
                  disabled={isResending}
                >
                  {isResending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Send new verification email
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link to="/register">
                    Back to registration
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
