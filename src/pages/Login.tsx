import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { checkRateLimit, clearRateLimit, sanitizeAuthInput } from '@/lib/auth-security';
import { ZoomSignInButton } from '@/components/auth/ZoomSignInButton';
import { ZoomOAuthSetup } from '@/components/auth/ZoomOAuthSetup';
import { useZoomOAuth } from '@/hooks/useZoomOAuth';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showZoomSetup, setShowZoomSetup] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { initiateZoomOAuth, isLoading: isZoomLoading } = useZoomOAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Handle OAuth errors from URL params
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      switch (error) {
        case 'zoom_oauth_denied':
          errorMessage = 'Zoom authorization was denied. Please try again.';
          break;
        case 'invalid_state':
          errorMessage = 'Invalid authentication state. Please try again.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to complete Zoom authentication. Please try again.';
          break;
        case 'user_info_failed':
          errorMessage = 'Failed to retrieve user information from Zoom.';
          break;
        case 'user_creation_failed':
          errorMessage = 'Failed to create your account. Please try again.';
          break;
        case 'connection_storage_failed':
          errorMessage = 'Failed to save Zoom connection. Please try again.';
          break;
        case 'session_failed':
          errorMessage = 'Failed to establish session. Please try again.';
          break;
        case 'oauth_error':
          errorMessage = 'An error occurred during authentication. Please try again.';
          break;
      }
      
      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    // Check rate limiting
    if (!checkRateLimit(data.email, 5, 15 * 60 * 1000)) {
      setIsRateLimited(true);
      toast({
        title: 'Too Many Attempts',
        description: 'Please wait 15 minutes before trying again.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeAuthInput(data.email);
      
      const { error } = await signIn(sanitizedEmail, data.password);
      
      if (!error) {
        // Clear rate limit on success
        clearRateLimit(data.email);
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomSignIn = async () => {
    const result = await initiateZoomOAuth('/dashboard');
    
    if (!result.success && result.configRequired) {
      setShowZoomSetup(true);
    }
  };

  // Show loading spinner while checking authentication
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
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>

        {showZoomSetup ? (
          <ZoomOAuthSetup onConfigured={() => setShowZoomSetup(false)} />
        ) : (
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-xl">Sign in to your account</CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Zoom Sign In */}
              <div className="mb-6">
                <ZoomSignInButton
                  onClick={handleZoomSignIn}
                  isLoading={isZoomLoading}
                />
                <p className="mt-2 text-xs text-center text-gray-500">
                  Sign in with your Zoom account for seamless integration
                </p>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with email</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="sr-only">
                      Email address
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...register('email')}
                        id="email"
                        type="email"
                        autoComplete="email"
                        className={`pl-10 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="Email address"
                        disabled={isLoading || isSubmitting || isZoomLoading}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password" className="sr-only">
                      Password
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...register('password')}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="Password"
                        disabled={isLoading || isSubmitting || isZoomLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading || isSubmitting || isZoomLoading}
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
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <Link
                      to="/forgot-password"
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || isSubmitting || isZoomLoading}
                >
                  {isLoading || isSubmitting ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Sign in with email
                </Button>
              </form>

              <div className="mt-6">
                <Separator className="my-4" />
                <p className="text-center text-sm text-gray-600">
                  By signing in, you agree to our{' '}
                  <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Login;
