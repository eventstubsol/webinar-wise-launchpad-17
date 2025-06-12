
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionSet, setSessionSet] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Check for reset token in URL and set session
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    // Set the session with the tokens from the URL
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(({ error }) => {
      if (error) {
        console.error('Error setting session:', error);
        setError('Invalid or expired reset link. Please request a new password reset link.');
      } else {
        setSessionSet(true);
      }
    });
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!sessionSet) {
      setError('Session not ready. Please wait for the session to be established.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await updatePassword(data.password);
      
      if (error) {
        setError(error.message);
      } else {
        setIsSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Password updated successfully</CardTitle>
              <CardDescription>
                Your password has been updated. Redirecting to login...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <LoadingSpinner size="sm" />
                <p className="mt-2 text-sm text-gray-600">
                  Redirecting in 3 seconds...
                </p>
                <Button 
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="mt-4"
                >
                  Go to login now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl">Create new password</CardTitle>
            <CardDescription>
              Choose a strong password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="password" className="sr-only">
                  New password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="New password"
                    disabled={isLoading || isSubmitting || !!error}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isSubmitting || !!error}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="sr-only">
                  Confirm new password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="Confirm new password"
                    disabled={isLoading || isSubmitting || !!error}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading || isSubmitting || !!error}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isSubmitting || !!error || !sessionSet}
              >
                {isLoading || isSubmitting ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
