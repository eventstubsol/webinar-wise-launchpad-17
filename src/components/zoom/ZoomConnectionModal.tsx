
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
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
  const { isValidating, startValidation, validationResult } = useZoomValidation({
    onConnectionSuccess: () => {
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 2000);
    }
  });

  const [formData, setFormData] = useState({
    account_id: '',
    client_id: '',
    client_secret: ''
  });
  const [step, setStep] = useState<'form' | 'connecting' | 'success' | 'error'>('form');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    if (!user?.id) return;
    
    setStep('connecting');
    
    // Save credentials first
    await createCredentials({
      user_id: user.id,
      account_id: formData.account_id,
      client_id: formData.client_id,
      client_secret: formData.client_secret,
      app_name: 'Zoom Server-to-Server OAuth App'
    });

    // Start validation
    startValidation();
  };

  React.useEffect(() => {
    if (validationResult?.success) {
      setStep('success');
    } else if (validationResult?.error) {
      setStep('error');
    }
  }, [validationResult]);

  const isFormValid = formData.account_id && formData.client_id && formData.client_secret;

  const handleClose = () => {
    setStep('form');
    setFormData({ account_id: '', client_id: '', client_secret: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Zoom Account</DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
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

        {step === 'connecting' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-center">Connecting to Zoom...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <p className="text-center font-medium">Successfully connected to Zoom!</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <XCircle className="w-8 h-8 text-red-600" />
            <p className="text-center text-red-600">
              Connection failed: {validationResult?.error}
            </p>
            <Button onClick={() => setStep('form')} variant="outline">
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
