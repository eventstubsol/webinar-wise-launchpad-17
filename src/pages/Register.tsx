import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Building, Briefcase, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { validatePasswordStrength, checkRateLimit, clearRateLimit, sanitizeAuthInput } from '@/lib/auth-security';
import { ZoomSignInButton } from '@/components/auth/ZoomSignInButton';
import { useToast } from '@/hooks/use-toast';
import { useZoomOAuth } from '@/hooks/useZoomOAuth';
import { ZoomOAuthSetup } from '@/components/auth/ZoomOAuthSetup';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [showZoomSetup, setShowZoomSetup] = useState(false);
  const { initiateZoomOAuth, isLoading: isZoomLoading } = useZoomOAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Handle OAuth errors from URL params
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      let errorMessage = 'Registration failed. Please try again.';
      
      switch (error) {
        case 'zoom_oauth_denied':
          errorMessage = 'Zoom authorization was denied. Please try again.';
          break;
        case 'user_creation_failed':
          errorMessage = 'Failed to create your account. Please try again.';
          break;
        case 'oauth_error':
          errorMessage = 'An error occurred during registration. Please try again.';
          break;
      }
      
      toast({
        title: 'Registration Error',
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

  // Real-time password validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    const validation = validatePasswordStrength(password);
    setPasswordErrors(validation.errors);
  };

  const onSubmit = async (data: RegisterFormData) => {
    // Check rate limiting
    if (!checkRateLimit(data.email, 3, 15 * 60 * 1000)) {
      setIsRateLimited(true);
      toast({
        title: 'Too Many Attempts',
        description: 'Please wait 15 minutes before trying again.',
        variant: 'destructive',
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      setPasswordErrors(passwordValidation.errors);
      return;
    }

    setIsLoading(true);
    try {
      // Sanitize inputs
      const sanitizedData = {
        email: sanitizeAuthInput(data.email),
        password: data.password,
        full_name: sanitizeAuthInput(data.full_name),
        company: data.company ? sanitizeAuthInput(data.company) : undefined,
        job_title: data.job_title ? sanitizeAuthInput(data.job_title) : undefined,
      };

      const { error } = await signUp(sanitizedData.email, sanitizedData.password, {
        full_name: sanitizedData.full_name,
        company: sanitizedData.company,
        job_title: sanitizedData.job_title,
      });
      
      if (!error) {
        // Clear rate limit on success
        clearRateLimit(data.email);
        // Show success message and redirect to login or verification page
        navigate('/verify-email', { replace: true });
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomSignUp = async () => {
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
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        {showZoomSetup ? (
          <ZoomOAuthSetup onConfigured={() => setShowZoomSetup(false)} />
        ) : (
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-xl">Join Webinar Wise</CardTitle>
              <CardDescription>
                Start transforming your webinar data today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Zoom Sign Up */}
              <div className="mb-6">
                <ZoomSignInButton
                  onClick={handleZoomSignUp}
                  isLoading={isZoomLoading}
                  text="Sign up with Zoom"
                />
                <p className="mt-2 text-xs text-center text-gray-500">
                  Create an account using your Zoom credentials
                </p>
              </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or register with email</span>
              </div>
            </div>

            {/* Email Registration Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name" className="sr-only">
                    Full name
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      {...register('full_name')}
                      id="full_name"
                      type="text"
                      autoComplete="name"
                      className={`pl-10 ${errors.full_name ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="Full name"
                      disabled={isLoading || isSubmitting || isZoomLoading}
                    />
                  </div>
                  {errors.full_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                  )}
                </div>

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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="company" className="sr-only">
                      Company
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...register('company')}
                        id="company"
                        type="text"
                        autoComplete="organization"
                        className="pl-10"
                        placeholder="Company (optional)"
                        disabled={isLoading || isSubmitting || isZoomLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="job_title" className="sr-only">
                      Job title
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...register('job_title')}
                        id="job_title"
                        type="text"
                        autoComplete="organization-title"
                        className="pl-10"
                        placeholder="Job title (optional)"
                        disabled={isLoading || isSubmitting || isZoomLoading}
                      />
                    </div>
                  </div>
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
                      {...register('password', {
                        onChange: handlePasswordChange
                      })}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`pl-10 pr-10 ${errors.password || passwordErrors.length > 0 ? 'border-red-500 focus:border-red-500' : ''}`}
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
                   {(errors.password || passwordErrors.length > 0) && (
                     <div className="mt-1 space-y-1">
                       {errors.password && (
                         <p className="text-sm text-red-600">{errors.password.message}</p>
                       )}
                       {passwordErrors.length > 0 && (
                         <div className="text-xs text-red-600">
                           <p className="font-medium">Password requirements:</p>
                           <ul className="list-disc list-inside space-y-1">
                             {passwordErrors.map((error, index) => (
                               <li key={index}>{error}</li>
                             ))}
                           </ul>
                         </div>
                       )}
                     </div>
                   )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="sr-only">
                    Confirm password
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
                      placeholder="Confirm password"
                      disabled={isLoading || isSubmitting || isZoomLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading || isSubmitting || isZoomLoading}
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
                Create account
              </Button>
            </form>

            <div className="mt-6">
              <Separator className="my-4" />
              <p className="text-center text-sm text-gray-600">
                By creating an account, you agree to our{' '}
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

export default Register;
