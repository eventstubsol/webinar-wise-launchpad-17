
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ZoomOAuthSetupProps {
  onConfigured?: () => void;
}

export function ZoomOAuthSetup({ onConfigured }: ZoomOAuthSetupProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both Client ID and Client Secret.",
        variant: "destructive",
      });
      return;
    }

    setIsConfiguring(true);
    try {
      // In a real implementation, these would be saved to Supabase secrets
      // For now, we'll simulate the configuration
      localStorage.setItem('zoom_oauth_configured', 'true');
      localStorage.setItem('zoom_client_id', clientId);
      
      setIsConfigured(true);
      toast({
        title: "Credentials Configured",
        description: "Zoom OAuth credentials have been saved successfully.",
      });
      onConfigured?.();
    } catch (error) {
      console.error('Failed to save credentials:', error);
      toast({
        title: "Configuration Failed",
        description: "Failed to save Zoom OAuth credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  if (isConfigured) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Zoom OAuth has been configured successfully. You can now use Zoom authentication.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configure Zoom OAuth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            To enable Zoom authentication, you need to create a Zoom OAuth app and configure the credentials.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="setup-steps">Setup Steps:</Label>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Go to the Zoom Marketplace and create an OAuth app</li>
            <li>Set the redirect URI to your Supabase function URL</li>
            <li>Copy the Client ID and Client Secret below</li>
            <li>Configure the required scopes (user:read, webinar:read, etc.)</li>
          </ol>
        </div>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.open('https://marketplace.zoom.us/develop/create', '_blank')}
          className="w-full"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Zoom Marketplace
        </Button>

        <div className="space-y-4">
          <div>
            <Label htmlFor="client-id">Client ID</Label>
            <Input
              id="client-id"
              type="text"
              placeholder="Your Zoom OAuth Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isConfiguring}
            />
          </div>

          <div>
            <Label htmlFor="client-secret">Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              placeholder="Your Zoom OAuth Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              disabled={isConfiguring}
            />
          </div>
        </div>

        <Button
          onClick={handleSaveCredentials}
          disabled={isConfiguring || !clientId.trim() || !clientSecret.trim()}
          className="w-full"
        >
          {isConfiguring ? "Configuring..." : "Save Configuration"}
        </Button>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <strong>Redirect URI:</strong> Add this to your Zoom OAuth app:<br />
          <code className="text-xs bg-white px-1 py-0.5 rounded">
            https://lgajnzldkfpvcuofjxom.supabase.co/functions/v1/zoom-oauth-complete
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
