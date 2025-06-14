
import React from 'react';
import { Campaign, AudienceSegment } from '@/types/campaign';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Target } from 'lucide-react';

interface AudienceBuilderProps {
  campaignData: Partial<Campaign>;
  setCampaignData: (data: Partial<Campaign>) => void;
  segments: AudienceSegment[];
  onNext?: () => void;
}

export const AudienceBuilder: React.FC<AudienceBuilderProps> = ({
  campaignData,
  setCampaignData,
  segments,
  onNext
}) => {
  const handleSegmentSelect = (segment: AudienceSegment) => {
    setCampaignData({
      ...campaignData,
      audience_segment: {
        segment_id: segment.id,
        segment_name: segment.segment_name,
        estimated_size: segment.estimated_size
      }
    });
  };

  const selectedSegmentId = campaignData.audience_segment?.segment_id;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Select Target Audience</h3>
        <p className="text-sm text-gray-500">
          Choose who will receive your campaign
        </p>
      </div>
      
      <div className="space-y-4">
        {segments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audience segments</h3>
              <p className="text-gray-500 mb-4">Create your first audience segment to get started</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Segment
              </Button>
            </CardContent>
          </Card>
        ) : (
          segments.map((segment) => (
            <Card 
              key={segment.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedSegmentId === segment.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : ''
              }`}
              onClick={() => handleSegmentSelect(segment)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{segment.segment_name}</CardTitle>
                    {segment.description && (
                      <CardDescription>{segment.description}</CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {segment.estimated_size.toLocaleString()} contacts
                    </div>
                    <Badge variant={segment.is_dynamic ? "default" : "secondary"}>
                      {segment.is_dynamic ? "Dynamic" : "Static"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {segment.tags && segment.tags.length > 0 && (
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {segment.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {selectedSegmentId && (
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Audience selected
            </span>
          </div>
          {onNext && (
            <Button onClick={onNext} size="sm">
              Continue
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
