
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (!error) {
        navigate('/dashboard', { replace: true });
      } else {
        toast({
          title: 'Login Failed',
          description: error.message || 'Please check your credentials and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, {
        full_name: data.full_name,
      });
      if (!error) {
        toast({
          title: 'Registration Successful',
          description: 'Please check your email to verify your account.',
        });
        setActiveTab('login');
      } else {
        toast({
          title: 'Registration Failed',
          description: error.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Registration Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
            Welcome to Webinar Wise
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Transform your webinar data with powerful analytics
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl">Get Started</CardTitle>
            <CardDescription>
              Sign in or create an account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email" className="sr-only">Email address</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...loginForm.register('email')}
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        className={`pl-10 ${loginForm.formState.errors.email ? 'border-red-500' : ''}`}
                        placeholder="Email address"
                        disabled={isLoading}
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="login-password" className="sr-only">Password</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...loginForm.register('password')}
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`pl-10 pr-10 ${loginForm.formState.errors.password ? 'border-red-500' : ''}`}
                        placeholder="Password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        )}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-6">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div>
                    <Label htmlFor="register-name" className="sr-only">Full name</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...registerForm.register('full_name')}
                        id="register-name"
                        type="text"
                        autoComplete="name"
                        className={`pl-10 ${registerForm.formState.errors.full_name ? 'border-red-500' : ''}`}
                        placeholder="Full name"
                        disabled={isLoading}
                      />
                    </div>
                    {registerForm.formState.errors.full_name && (
                      <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.full_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="register-email" className="sr-only">Email address</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...registerForm.register('email')}
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        className={`pl-10 ${registerForm.formState.errors.email ? 'border-red-500' : ''}`}
                        placeholder="Email address"
                        disabled={isLoading}
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="register-password" className="sr-only">Password</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        {...registerForm.register('password')}
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className={`pl-10 pr-10 ${registerForm.formState.errors.password ? 'border-red-500' : ''}`}
                        placeholder="Password (min 6 characters)"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        )}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
