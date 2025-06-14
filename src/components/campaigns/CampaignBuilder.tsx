
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CampaignService } from '@/services/campaigns/CampaignService';
import { AudienceSegmentService } from '@/services/campaigns/AudienceSegmentService';
import { Campaign, CampaignBuilderStep, AudienceSegment, CampaignCreateData, transformDatabaseAudienceSegment } from '@/types/campaign';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Save, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TemplateSelector } from './builder/TemplateSelector';
import { AudienceBuilder } from './builder/AudienceBuilder';
import { ABTestingSetup } from './builder/ABTestingSetup';
import { SchedulingSetup } from './builder/SchedulingSetup';
import { CampaignPreview } from './builder/CampaignPreview';

interface CampaignBuilderProps {
  onClose: () => void;
  onComplete: () => void;
  editingCampaign?: Campaign;
}

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  onClose,
  onComplete,
  editingCampaign
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState<Partial<Campaign>>({
    campaign_type: '',
    subject_template: '',
    status: 'draft',
    audience_segment: {},
    user_id: user?.id
  });
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const steps: CampaignBuilderStep[] = [
    {
      id: 'basics',
      title: 'Campaign Basics',
      description: 'Set up campaign name and type',
      component: CampaignBasics,
      isComplete: !!(campaignData.campaign_type && campaignData.subject_template)
    },
    {
      id: 'template',
      title: 'Email Template',
      description: 'Choose your email template',
      component: TemplateSelector,
      isComplete: !!campaignData.template_id
    },
    {
      id: 'audience',
      title: 'Audience',
      description: 'Select your target audience',
      component: AudienceBuilder,
      isComplete: !!(campaignData.audience_segment && Object.keys(campaignData.audience_segment).length > 0)
    },
    {
      id: 'abtesting',
      title: 'A/B Testing',
      description: 'Set up A/B tests (optional)',
      component: ABTestingSetup,
      isComplete: true,
      isOptional: true
    },
    {
      id: 'scheduling',
      title: 'Scheduling',
      description: 'Schedule your campaign',
      component: SchedulingSetup,
      isComplete: !!campaignData.send_schedule
    },
    {
      id: 'preview',
      title: 'Review & Launch',
      description: 'Review and launch your campaign',
      component: CampaignPreview,
      isComplete: true
    }
  ];

  useEffect(() => {
    if (editingCampaign) {
      setCampaignData(editingCampaign);
    }
    loadSegments();
  }, [editingCampaign]);

  const loadSegments = async () => {
    try {
      const data = await AudienceSegmentService.getSegments(user!.id);
      setSegments(data.map(transformDatabaseAudienceSegment));
    } catch (error) {
      console.error('Error loading segments:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      
      // Ensure required fields are present
      if (!campaignData.campaign_type || !campaignData.subject_template || !user?.id) {
        toast({
          title: "Error",
          description: "Please fill in required fields: Campaign Name and Subject Line",
          variant: "destructive"
        });
        return;
      }

      const createData: CampaignCreateData = {
        campaign_type: campaignData.campaign_type,
        subject_template: campaignData.subject_template,
        status: 'draft',
        user_id: user.id,
        audience_segment: campaignData.audience_segment,
        template_id: campaignData.template_id,
        workflow_id: campaignData.workflow_id,
        send_schedule: campaignData.send_schedule
      };
      
      if (editingCampaign) {
        await CampaignService.updateCampaign(editingCampaign.id, createData);
      } else {
        await CampaignService.createCampaign(createData);
      }
      
      toast({
        title: "Success",
        description: "Campaign saved as draft"
      });
      
      onComplete();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: "Failed to save campaign",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    try {
      setLoading(true);
      
      // Ensure required fields are present
      if (!campaignData.campaign_type || !campaignData.subject_template || !user?.id) {
        toast({
          title: "Error",
          description: "Please fill in required fields before launching",
          variant: "destructive"
        });
        return;
      }
      
      let campaignId = editingCampaign?.id;
      
      if (!campaignId) {
        const createData: CampaignCreateData = {
          campaign_type: campaignData.campaign_type,
          subject_template: campaignData.subject_template,
          status: 'active',
          user_id: user.id,
          audience_segment: campaignData.audience_segment,
          template_id: campaignData.template_id,
          workflow_id: campaignData.workflow_id,
          send_schedule: campaignData.send_schedule
        };

        const newCampaign = await CampaignService.createCampaign(createData);
        campaignId = newCampaign.id;
      }
      
      if (campaignId) {
        await CampaignService.launchCampaign(campaignId);
      }
      
      toast({
        title: "Success",
        description: "Campaign launched successfully"
      });
      
      onComplete();
    } catch (error) {
      console.error('Error launching campaign:', error);
      toast({
        title: "Error",
        description: "Failed to launch campaign",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = steps.filter(step => step.isComplete).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                </h1>
                <p className="text-sm text-gray-500">
                  Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
            </div>
          </div>
          
          <div className="pb-4">
            <Progress value={progressPercentage} className="w-full" />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{completedSteps} of {steps.length} completed</span>
              <span>{Math.round(progressPercentage)}% complete</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Step Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Builder</CardTitle>
                <CardDescription>Follow these steps to create your campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  {steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(index)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        index === currentStep
                          ? 'bg-blue-50 border border-blue-200'
                          : step.isComplete
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          step.isComplete
                            ? 'bg-green-500 text-white'
                            : index === currentStep
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {step.isComplete ? <Check className="h-3 w-3" /> : index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{step.title}</div>
                          <div className="text-xs text-gray-500">{step.description}</div>
                          {step.isOptional && (
                            <div className="text-xs text-blue-500">Optional</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Step Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{steps[currentStep].title}</CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
              </CardHeader>
              <CardContent>
                <CurrentStepComponent
                  campaignData={campaignData}
                  setCampaignData={setCampaignData}
                  segments={segments}
                  onNext={handleNext}
                />
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex space-x-3">
                {currentStep === steps.length - 1 ? (
                  <Button onClick={handleLaunch} disabled={loading}>
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? 'Launching...' : 'Launch Campaign'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!steps[currentStep].isComplete && !steps[currentStep].isOptional}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Campaign Basics Component
const CampaignBasics: React.FC<{
  campaignData: Partial<Campaign>;
  setCampaignData: (data: Partial<Campaign>) => void;
}> = ({ campaignData, setCampaignData }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="campaign-name">Campaign Name</Label>
          <Input
            id="campaign-name"
            value={campaignData.campaign_type || ''}
            onChange={(e) => setCampaignData({ ...campaignData, campaign_type: e.target.value })}
            placeholder="Enter campaign name"
          />
        </div>

        <div>
          <Label htmlFor="subject-line">Subject Line</Label>
          <Input
            id="subject-line"
            value={campaignData.subject_template || ''}
            onChange={(e) => setCampaignData({ ...campaignData, subject_template: e.target.value })}
            placeholder="Enter email subject line"
          />
        </div>

        <div>
          <Label htmlFor="campaign-type">Campaign Type</Label>
          <Select value={campaignData.campaign_type} onValueChange={(value) => setCampaignData({ ...campaignData, campaign_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select campaign type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="promotional">Promotional</SelectItem>
              <SelectItem value="product_launch">Product Launch</SelectItem>
              <SelectItem value="welcome_series">Welcome Series</SelectItem>
              <SelectItem value="re_engagement">Re-engagement</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
