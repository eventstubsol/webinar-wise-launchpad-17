
import React from 'react';
import { Campaign } from '@/types/campaign';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, FileText, Palette } from 'lucide-react';

interface TemplateSelectorProps {
  campaignData: Partial<Campaign>;
  setCampaignData: (data: Partial<Campaign>) => void;
  onNext?: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  campaignData,
  setCampaignData,
  onNext
}) => {
  const templates = [
    {
      id: 'blank',
      name: 'Blank Template',
      description: 'Start with a clean slate',
      icon: FileText,
      category: 'basic'
    },
    {
      id: 'newsletter',
      name: 'Newsletter',
      description: 'Perfect for regular updates',
      icon: Mail,
      category: 'newsletter'
    },
    {
      id: 'promotional',
      name: 'Promotional',
      description: 'Drive sales and conversions',
      icon: Palette,
      category: 'promotional'
    }
  ];

  const handleTemplateSelect = (templateId: string) => {
    setCampaignData({
      ...campaignData,
      template_id: templateId
    });
    
    if (onNext) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Choose Email Template</h3>
        <p className="text-sm text-gray-500">
          Select a template to get started with your campaign
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              campaignData.template_id === template.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : ''
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <template.icon className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant={campaignData.template_id === template.id ? "default" : "outline"}
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTemplateSelect(template.id);
                }}
              >
                {campaignData.template_id === template.id ? 'Selected' : 'Select'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
