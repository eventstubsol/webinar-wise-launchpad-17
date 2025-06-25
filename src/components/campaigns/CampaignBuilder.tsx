
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Send, Eye, Plus, X } from 'lucide-react';

interface Campaign {
  id?: string;
  name: string;
  subject: string;
  content: string;
  recipientGroups: string[];
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sent';
}

interface CampaignBuilderProps {
  campaignId?: string;
  onSave?: (campaign: Campaign) => void;
  onSend?: (campaign: Campaign) => void;
}

export function CampaignBuilder({ campaignId, onSave, onSend }: CampaignBuilderProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Campaign>({
    name: '',
    subject: '',
    content: '',
    recipientGroups: [],
    status: 'draft'
  });

  const [availableGroups] = useState([
    'All Participants',
    'Webinar Attendees',
    'High Engagement',
    'Recent Registrants',
    'VIP Members'
  ]);

  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (campaignId) {
      loadCampaign(campaignId);
    }
  }, [campaignId]);

  const loadCampaign = async (id: string) => {
    setLoading(true);
    try {
      // Simulate loading campaign data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock campaign data
      const mockCampaign: Campaign = {
        id,
        name: 'Sample Campaign',
        subject: 'Join our upcoming webinar!',
        content: 'Hello! We have an exciting webinar coming up...',
        recipientGroups: ['Webinar Attendees'],
        status: 'draft'
      };
      
      setNewCampaign(mockCampaign);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave?.(newCampaign);
      
      toast({
        title: "Campaign Saved",
        description: "Your campaign has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save campaign",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate send operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const sentCampaign = { ...newCampaign, status: 'sent' as const };
      setNewCampaign(sentCampaign);
      
      onSend?.(sentCampaign);
      
      toast({
        title: "Campaign Sent",
        description: "Your campaign has been sent successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addRecipientGroup = (groupName: string) => {
    if (groupName && !newCampaign.recipientGroups.includes(groupName)) {
      setNewCampaign(prev => ({
        ...prev,
        recipientGroups: [...prev.recipientGroups, groupName]
      }));
    }
  };

  const removeRecipientGroup = (groupName: string) => {
    setNewCampaign(prev => ({
      ...prev,
      recipientGroups: prev.recipientGroups.filter(g => g !== groupName)
    }));
  };

  const addCustomGroup = () => {
    if (newGroupName.trim()) {
      addRecipientGroup(newGroupName.trim());
      setNewGroupName('');
    }
  };

  if (loading && campaignId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading campaign...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {campaignId ? 'Edit Campaign' : 'Create New Campaign'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaignName">Campaign Name *</Label>
              <Input
                id="campaignName"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter campaign name"
              />
            </div>

            <div>
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={newCampaign.subject}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject"
              />
            </div>

            <div>
              <Label htmlFor="content">Email Content *</Label>
              <Textarea
                id="content"
                value={newCampaign.content}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter email content"
                rows={6}
              />
            </div>
          </div>

          {/* Recipient Groups */}
          <div className="space-y-4">
            <Label>Recipient Groups</Label>
            
            {/* Selected Groups */}
            <div className="flex flex-wrap gap-2">
              {newCampaign.recipientGroups.map((group) => (
                <Badge key={group} variant="secondary" className="flex items-center gap-1">
                  {group}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeRecipientGroup(group)}
                  />
                </Badge>
              ))}
            </div>

            {/* Available Groups */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Available Groups:</div>
              <div className="flex flex-wrap gap-2">
                {availableGroups
                  .filter(group => !newCampaign.recipientGroups.includes(group))
                  .map((group) => (
                    <Button
                      key={group}
                      variant="outline"
                      size="sm"
                      onClick={() => addRecipientGroup(group)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {group}
                    </Button>
                  ))}
              </div>
            </div>

            {/* Custom Group */}
            <div className="flex gap-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter custom group name"
                onKeyPress={(e) => e.key === 'Enter' && addCustomGroup()}
              />
              <Button onClick={addCustomGroup} disabled={!newGroupName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !newCampaign.name}
              variant="outline"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>

            <Button
              onClick={() => {
                // Preview functionality
                toast({
                  title: "Preview",
                  description: "Preview functionality would open here.",
                });
              }}
              variant="outline"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>

            <Button
              onClick={handleSend}
              disabled={loading || !newCampaign.name || !newCampaign.subject || !newCampaign.content}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Campaign
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Preview */}
      {newCampaign.subject && newCampaign.content && (
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="mb-2">
                <strong>Subject:</strong> {newCampaign.subject}
              </div>
              <div className="mb-2">
                <strong>To:</strong> {newCampaign.recipientGroups.join(', ') || 'No recipients selected'}
              </div>
              <hr className="my-3" />
              <div className="whitespace-pre-wrap">{newCampaign.content}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
