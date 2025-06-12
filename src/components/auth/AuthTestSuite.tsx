
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthValidator, SecurityMonitor } from '@/lib/auth-validation';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
}

export const AuthTestSuite = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { signUp, signIn, signOut, resetPassword } = useAuth();

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Email validation
    try {
      const emailTest = AuthValidator.validateEmail('test@example.com');
      results.push({
        name: 'Email Validation',
        status: emailTest.isValid ? 'pass' : 'fail',
        message: emailTest.message
      });
    } catch (error) {
      results.push({
        name: 'Email Validation',
        status: 'fail',
        message: 'Email validation failed'
      });
    }

    // Test 2: Password strength validation
    try {
      const passwordTest = AuthValidator.validatePasswordStrength('TestPassword123!');
      results.push({
        name: 'Password Strength',
        status: passwordTest.isValid ? 'pass' : 'fail',
        message: passwordTest.message
      });
    } catch (error) {
      results.push({
        name: 'Password Strength',
        status: 'fail',
        message: 'Password validation failed'
      });
    }

    // Test 3: Common password patterns
    try {
      const patternTest = AuthValidator.checkPasswordPatterns('TestPassword123!', 'test@example.com');
      results.push({
        name: 'Password Pattern Check',
        status: patternTest.isValid ? 'pass' : 'fail',
        message: patternTest.message
      });
    } catch (error) {
      results.push({
        name: 'Password Pattern Check',
        status: 'fail',
        message: 'Pattern check failed'
      });
    }

    // Test 4: Rate limiting
    try {
      const rateLimitTest = AuthValidator.checkRateLimit('login');
      results.push({
        name: 'Rate Limiting',
        status: rateLimitTest.isValid ? 'pass' : 'fail',
        message: rateLimitTest.message
      });
    } catch (error) {
      results.push({
        name: 'Rate Limiting',
        status: 'fail',
        message: 'Rate limit check failed'
      });
    }

    // Test 5: Session validation
    try {
      const sessionTest = await AuthValidator.validateSession();
      results.push({
        name: 'Session Validation',
        status: sessionTest.isValid ? 'pass' : 'warning',
        message: sessionTest.message
      });
    } catch (error) {
      results.push({
        name: 'Session Validation',
        status: 'fail',
        message: 'Session validation failed'
      });
    }

    // Test 6: Auth context methods
    try {
      const hasAuthMethods = !!(signUp && signIn && signOut && resetPassword);
      results.push({
        name: 'Auth Context Methods',
        status: hasAuthMethods ? 'pass' : 'fail',
        message: hasAuthMethods ? 'All auth methods available' : 'Missing auth methods'
      });
    } catch (error) {
      results.push({
        name: 'Auth Context Methods',
        status: 'fail',
        message: 'Auth context check failed'
      });
    }

    // Test 7: Security monitoring
    try {
      SecurityMonitor.logSecurityEvent('test_event', { timestamp: new Date().toISOString() });
      results.push({
        name: 'Security Monitoring',
        status: 'pass',
        message: 'Security monitoring is functional'
      });
    } catch (error) {
      results.push({
        name: 'Security Monitoring',
        status: 'fail',
        message: 'Security monitoring failed'
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  const passedTests = testResults.filter(t => t.status === 'pass').length;
  const totalTests = testResults.length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Authentication Test Suite
          <Button
            onClick={runTests}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>Running...</>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {testResults.length > 0 && (
          <Alert>
            <AlertDescription>
              Test Results: {passedTests}/{totalTests} tests passed
              {passedTests === totalTests ? ' ✅' : ' ⚠️'}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {testResults.map((result, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(result.status)}
                <div>
                  <p className="font-medium">{result.name}</p>
                  <p className="text-sm text-gray-600">{result.message}</p>
                </div>
              </div>
              {getStatusBadge(result.status)}
            </div>
          ))}
        </div>

        {testResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Click "Run Tests" to validate the authentication system
          </div>
        )}
      </CardContent>
    </Card>
  );
};
