
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/common/FormField';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Key, Shield, Info, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ZoomCredentialsService } from '@/services/zoom/ZoomCredentialsService';
import { ZoomCredentials } from '@/types/zoomCredentials';

interface ZoomCredentialsSetupFormProps {
  onCredentialsSaved?: (credentials: ZoomCredentials) => void;
  onCancel?: () => void;
}

export const ZoomCredentialsSetupForm: React.FC<ZoomCredentialsSetupFormProps> = ({
  onCredentialsSaved,
  onCancel,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    account_id: '',
    client_id: '',
    client_secret: '',
    app_name: '',
    description: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
    if (isSuccess) {
      setIsSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(false);
    
    if (!user) {
      setErrors(['User not authenticated']);
      return;
    }

    // Validate form
    const validationErrors = ZoomCredentialsService.validateCredentials(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const credentials = await ZoomCredentialsService.createCredentials({
        ...formData,
        user_id: user.id,
      });

      if (credentials) {
        setIsSuccess(true);
        setTimeout(() => {
          onCredentialsSaved?.(credentials);
        }, 1500);
      }
    } catch (error) {
      setErrors(['Failed to save credentials. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Set Up Zoom OAuth App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            To connect your Zoom account, you need to create a Server-to-Server OAuth app in your Zoom Marketplace account.
            <div className="mt-2">
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto"
                onClick={() => window.open('https://marketplace.zoom.us/develop/create', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Create Zoom OAuth App
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Success display */}
        {isSuccess && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Credentials saved successfully! You can now validate the connection.
            </AlertDescription>
          </Alert>
        )}

        {/* Error display */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Account ID"
            name="account_id"
            value={formData.account_id}
            onChange={handleInputChange}
            placeholder="Enter your Zoom Account ID"
            required
            disabled={isLoading}
          />

          <FormField
            label="Client ID"
            name="client_id"
            value={formData.client_id}
            onChange={handleInputChange}
            placeholder="Enter your OAuth App Client ID"
            required
            disabled={isLoading}
          />

          <FormField
            label="Client Secret"
            name="client_secret"
            type="password"
            value={formData.client_secret}
            onChange={handleInputChange}
            placeholder="Enter your OAuth App Client Secret"
            required
            disabled={isLoading}
          />

          <FormField
            label="App Name (Optional)"
            name="app_name"
            value={formData.app_name}
            onChange={handleInputChange}
            placeholder="Give your app configuration a name"
            disabled={isLoading}
          />

          <FormField
            label="Description (Optional)"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add a description for this configuration"
            disabled={isLoading}
          />

          {/* Security notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your credentials are stored securely and encrypted. They will only be used to authenticate with Zoom's API.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button 
              type="submit" 
              disabled={isLoading || isSuccess}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Saving...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : (
                'Save Credentials'
              )}
            </Button>
            
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
