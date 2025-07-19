
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, AlertCircle, Globe, Zap } from 'lucide-react';
import { WebhookService } from '@/services/zoom/webhook/WebhookService';
import { useToast } from '@/hooks/use-toast';

export const WebhookConfiguration: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setWebhookUrl(WebhookService.getWebhookUrl());
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy webhook URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await WebhookService.testWebhook();
      setTestResult(result);

      toast({
        title: result.success ? "Test Successful" : "Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResult({
        success: false,
        message: errorMessage
      });

      toast({
        title: "Test Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const webhookEvents = WebhookService.getWebhookEvents();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Webhook Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            Configure this webhook URL in your Zoom App to receive real-time updates when webinar data changes.
            This enables automatic synchronization without manual sync operations.
          </AlertDescription>
        </Alert>

        {/* Webhook URL Section */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Webhook Endpoint URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                {webhookUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="flex items-center gap-1"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleTestWebhook}
            disabled={testing}
            className="w-full"
          >
            {testing ? 'Testing...' : 'Test Webhook Connection'}
          </Button>

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Supported Events */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Supported Webhook Events</h4>
            <div className="flex flex-wrap gap-2">
              {webhookEvents.map((event) => (
                <Badge key={event} variant="secondary" className="text-xs">
                  {event}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Instructions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Setup Instructions</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>1. Go to your Zoom App configuration in the Zoom Marketplace</p>
            <p>2. Navigate to the "Event Subscriptions" section</p>
            <p>3. Add the webhook URL above as your endpoint</p>
            <p>4. Subscribe to the events listed above</p>
            <p>5. Save your configuration and test the connection</p>
          </div>
        </div>

        {/* Benefits */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Benefits of webhook integration:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Automatic real-time updates when webinars start/end</li>
              <li>• Instant notification of new registrations</li>
              <li>• Reduced need for manual sync operations</li>
              <li>• Always up-to-date dashboard data</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
