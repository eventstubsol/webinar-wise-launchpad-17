
import React from 'react';
import { Campaign, AudienceSegment } from '@/types/campaign';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Users, Calendar, TestTube, Mail, Clock } from 'lucide-react';

interface CampaignPreviewProps {
  campaignData: Partial<Campaign>;
  setCampaignData: (data: Partial<Campaign>) => void;
  segments: AudienceSegment[];
  onNext?: () => void;
}

export const CampaignPreview: React.FC<CampaignPreviewProps> = ({
  campaignData,
  segments
}) => {
  const selectedSegment = segments.find(s => s.id === campaignData.audience_segment?.segment_id);
  const scheduleType = campaignData.send_schedule?.type || 'immediate';

  const getScheduleDescription = () => {
    switch (scheduleType) {
      case 'immediate':
        return 'Send immediately after launch';
      case 'scheduled':
        return `Scheduled for ${new Date(campaignData.send_schedule?.scheduled_time || '').toLocaleString()}`;
      case 'recurring':
        return `Recurring ${campaignData.send_schedule?.recurring_pattern?.frequency || 'weekly'}`;
      default:
        return 'Not scheduled';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Campaign Preview</h3>
        <p className="text-sm text-gray-500">
          Review your campaign settings before launching
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Campaign Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Campaign Name</Label>
              <p className="text-base">{campaignData.campaign_type || 'Untitled Campaign'}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-500">Subject Line</Label>
              <p className="text-base">{campaignData.subject_template || 'No subject set'}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-500">Template</Label>
              <p className="text-base">{campaignData.template_id || 'No template selected'}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-500">Status</Label>
              <Badge variant="secondary">{campaignData.status || 'Draft'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Audience Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Target Audience</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSegment ? (
              <>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Segment</Label>
                  <p className="text-base">{selectedSegment.segment_name}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Estimated Recipients</Label>
                  <p className="text-base font-medium text-blue-600">
                    {selectedSegment.estimated_size.toLocaleString()} contacts
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Segment Type</Label>
                  <Badge variant={selectedSegment.is_dynamic ? "default" : "secondary"}>
                    {selectedSegment.is_dynamic ? "Dynamic" : "Static"}
                  </Badge>
                </div>
                
                {selectedSegment.tags && selectedSegment.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSegment.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">No audience segment selected</p>
            )}
          </CardContent>
        </Card>

        {/* A/B Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="h-5 w-5" />
              <span>A/B Testing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaignData.ab_test_config?.enabled ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Test Status</Label>
                  <Badge variant="default">Enabled</Badge>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Variants</Label>
                  <p className="text-base">{campaignData.ab_test_config.variants?.length || 0} variants</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Success Metric</Label>
                  <p className="text-base capitalize">
                    {campaignData.ab_test_config.success_metric?.replace('_', ' ') || 'Open rate'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <TestTube className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">A/B testing disabled</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Schedule</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Delivery</Label>
              <p className="text-base">{getScheduleDescription()}</p>
            </div>
            
            {campaignData.send_schedule?.timezone && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Timezone</Label>
                <p className="text-base">{campaignData.send_schedule.timezone}</p>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>
                {scheduleType === 'immediate' 
                  ? 'Campaign will send within minutes of launch'
                  : 'Campaign will send at the scheduled time'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <Eye className="h-5 w-5" />
            <span>Ready to Launch</span>
          </CardTitle>
          <CardDescription className="text-green-700">
            Your campaign is configured and ready to send
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-800">
                {selectedSegment?.estimated_size.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-green-600">Recipients</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-800">
                {campaignData.ab_test_config?.enabled ? campaignData.ab_test_config.variants?.length || 0 : 1}
              </p>
              <p className="text-sm text-green-600">Variants</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-800">1</p>
              <p className="text-sm text-green-600">Template</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-800">
                {scheduleType === 'immediate' ? '0' : '1'}
              </p>
              <p className="text-sm text-green-600">Scheduled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Add missing Label component
const Label = ({ className = '', children, ...props }: any) => (
  <label className={`text-sm font-medium ${className}`} {...props}>
    {children}
  </label>
);
