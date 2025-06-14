
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CRMConnectionManager } from '@/services/crm/CRMConnectionManager';

interface CRMConnectionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CRMConnectionForm({ onClose, onSuccess }: CRMConnectionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedCRM, setSelectedCRM] = useState<'salesforce' | 'hubspot' | 'pipedrive' | 'custom'>('salesforce');
  const [formData, setFormData] = useState({
    connectionName: '',
    clientId: '',
    clientSecret: '',
    apiUrl: '',
    apiKey: '',
    syncDirection: 'bidirectional' as 'incoming' | 'outgoing' | 'bidirectional',
    syncFrequency: 24
  });

  const crmOptions = [
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Connect to Salesforce CRM for seamless contact management',
      icon: '🔷'
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Integrate with HubSpot for marketing automation',
      icon: '🟠'
    },
    {
      id: 'pipedrive',
      name: 'Pipedrive',
      description: 'Sync with Pipedrive for sales pipeline management',
      icon: '🟢'
    },
    {
      id: 'custom',
      name: 'Custom API',
      description: 'Connect to any REST API endpoint',
      icon: '⚙️'
    }
  ];

  const handleNext = () => {
    if (!formData.connectionName) {
      toast({
        title: "Error",
        description: "Please enter a connection name",
        variant: "destructive",
      });
      return;
    }
    setStep('configure');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const connection = {
        user_id: user!.id,
        crm_type: selectedCRM,
        connection_name: formData.connectionName,
        config: {
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          apiUrl: formData.apiUrl
        },
        api_key: selectedCRM === 'custom' ? formData.apiKey : undefined,
        is_active: true,
        is_primary: false,
        sync_enabled: true,
        sync_direction: formData.syncDirection,
        sync_frequency_hours: formData.syncFrequency,
        status: 'active' as const,
        error_count: 0
      };

      await CRMConnectionManager.createConnection(connection);

      toast({
        title: "Success",
        description: "CRM connection created successfully",
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create CRM connection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startOAuthFlow = () => {
    // In a real implementation, this would redirect to the OAuth provider
    const redirectUri = `${window.location.origin}/auth/crm/callback`;
    const state = Math.random().toString(36).substring(7);
    
    toast({
      title: "OAuth Flow",
      description: `Would redirect to ${selectedCRM} OAuth (not implemented in demo)`,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add CRM Connection</DialogTitle>
          <DialogDescription>
            Connect your webinar data with a CRM system for seamless contact management
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder="My CRM Connection"
                value={formData.connectionName}
                onChange={(e) => setFormData(prev => ({ ...prev, connectionName: e.target.value }))}
              />
            </div>

            <div>
              <Label>Select CRM Type</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {crmOptions.map((crm) => (
                  <Card
                    key={crm.id}
                    className={`cursor-pointer transition-colors ${
                      selectedCRM === crm.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCRM(crm.id as any)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{crm.icon}</span>
                        <div>
                          <h3 className="font-semibold">{crm.name}</h3>
                          <p className="text-sm text-muted-foreground">{crm.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <Tabs defaultValue="auth" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="sync">Sync Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="auth" className="space-y-4">
              {selectedCRM === 'custom' ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiUrl">API URL</Label>
                    <Input
                      id="apiUrl"
                      placeholder="https://api.yourcrm.com"
                      value={formData.apiUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Your API key"
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      placeholder="Your OAuth client ID"
                      value={formData.clientId}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      placeholder="Your OAuth client secret"
                      value={formData.clientSecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                    />
                  </div>
                  <Button onClick={startOAuthFlow} className="w-full">
                    Connect with {selectedCRM}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
              <div>
                <Label htmlFor="syncDirection">Sync Direction</Label>
                <Select value={formData.syncDirection} onValueChange={(value: any) => setFormData(prev => ({ ...prev, syncDirection: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidirectional">Bidirectional</SelectItem>
                    <SelectItem value="outgoing">To CRM Only</SelectItem>
                    <SelectItem value="incoming">From CRM Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="syncFrequency">Sync Frequency (hours)</Label>
                <Input
                  id="syncFrequency"
                  type="number"
                  min="1"
                  max="168"
                  value={formData.syncFrequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, syncFrequency: parseInt(e.target.value) }))}
                />
              </div>
            </TabsContent>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating...' : 'Create Connection'}
              </Button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
