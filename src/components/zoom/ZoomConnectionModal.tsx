
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useZoomValidation } from '@/hooks/useZoomValidation';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { useAuth } from '@/contexts/AuthContext';

interface ZoomConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ZoomConnectionModal: React.FC<ZoomConnectionModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { user } = useAuth();
  const { createCredentials } = useZoomCredentials();
  const [formData, setFormData] = useState({
    account_id: '',
    client_id: '',
    client_secret: ''
  });
  const [step, setStep] = useState<'form' | 'saving-credentials' | 'validating' | 'success' | 'error'>('form');
  const [currentError, setCurrentError] = useState<string>('');

  const { isValidating, startValidation, validationResult } = useZoomValidation({
    onConnectionSuccess: (connection) => {
      console.log('🎉 Modal: Connection success callback triggered', connection.id);
      setStep('success');
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 2000);
    },
    onConnectionError: (error) => {
      console.error('❌ Modal: Connection error callback triggered', error);
      setCurrentError(error);
      setStep('error');
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear any previous errors when user starts typing
    if (currentError) {
      setCurrentError('');
    }
  };

  const handleConnect = async () => {
    if (!user?.id) {
      setCurrentError('User not authenticated. Please refresh and try again.');
      setStep('error');
      return;
    }
    
    console.log('🔄 Modal: Starting connection process...');
    setStep('saving-credentials');
    setCurrentError('');
    
    try {
      // First, save credentials
      console.log('💾 Modal: Saving credentials...');
      await createCredentials({
        user_id: user.id,
        account_id: formData.account_id,
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        app_name: 'Zoom Server-to-Server OAuth App'
      });

      console.log('✅ Modal: Credentials saved, starting validation...');
      setStep('validating');

      // Then start validation with the form data
      startValidation({
        account_id: formData.account_id,
        client_id: formData.client_id,
        client_secret: formData.client_secret
      });

    } catch (error) {
      console.error('❌ Modal: Error in connection process:', error);
      setCurrentError(error instanceof Error ? error.message : 'Failed to save credentials');
      setStep('error');
    }
  };

  // Watch for validation result changes
  React.useEffect(() => {
    if (validationResult?.success) {
      console.log('✅ Modal: Validation result success detected');
      setStep('success');
    } else if (validationResult?.error) {
      console.error('❌ Modal: Validation result error detected', validationResult.error);
      setCurrentError(validationResult.error);
      setStep('error');
    }
  }, [validationResult]);

  const isFormValid = formData.account_id && formData.client_id && formData.client_secret;
  const isProcessing = step === 'saving-credentials' || step === 'validating' || isValidating;

  const handleClose = () => {
    if (!isProcessing) {
      setStep('form');
      setFormData({ account_id: '', client_id: '', client_secret: '' });
      setCurrentError('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isProcessing) {
      handleClose();
    }
  };

  const handleRetry = () => {
    setStep('form');
    setCurrentError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => isProcessing && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Connect Zoom Account</DialogTitle>
          <DialogDescription>
            Enter your Zoom Server-to-Server OAuth app credentials to connect your account.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            {currentError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{currentError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="account_id">Account ID</Label>
              <Input
                id="account_id"
                value={formData.account_id}
                onChange={(e) => handleInputChange('account_id', e.target.value)}
                placeholder="Enter your Zoom Account ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                value={formData.client_id}
                onChange={(e) => handleInputChange('client_id', e.target.value)}
                placeholder="Enter your Zoom Client ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                value={formData.client_secret}
                onChange={(e) => handleInputChange('client_secret', e.target.value)}
                placeholder="Enter your Zoom Client Secret"
              />
            </div>

            <Button 
              onClick={handleConnect}
              disabled={!isFormValid}
              className="w-full"
            >
              Connect
            </Button>
          </div>
        )}

        {step === 'saving-credentials' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-center">Saving credentials...</p>
          </div>
        )}

        {step === 'validating' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <div className="text-center space-y-2">
              <p className="font-medium">Validating connection...</p>
              <p className="text-sm text-gray-600">This may take a few seconds</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="text-center space-y-2">
              <p className="font-medium text-green-600">Successfully connected to Zoom!</p>
              <p className="text-sm text-gray-600">Your integration is ready to use</p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <XCircle className="w-8 h-8 text-red-600" />
            <div className="text-center space-y-2">
              <p className="font-medium text-red-600">Connection failed</p>
              <p className="text-sm text-gray-600">{currentError}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
