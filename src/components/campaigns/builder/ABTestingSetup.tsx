
import React, { useState } from 'react';
import { Campaign } from '@/types/campaign';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestTube, Plus, Trash2 } from 'lucide-react';

interface ABTestingSetupProps {
  campaignData: Partial<Campaign>;
  setCampaignData: (data: Partial<Campaign>) => void;
  onNext?: () => void;
}

export const ABTestingSetup: React.FC<ABTestingSetupProps> = ({
  campaignData,
  setCampaignData,
  onNext
}) => {
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [variants, setVariants] = useState([
    { id: 'control', name: 'Control', subject: campaignData.subject_template || '', percentage: 50 },
    { id: 'variant_1', name: 'Variant A', subject: '', percentage: 50 }
  ]);

  const handleToggleABTest = (enabled: boolean) => {
    setAbTestEnabled(enabled);
    
    if (enabled) {
      setCampaignData({
        ...campaignData,
        ab_test_config: {
          enabled: true,
          variants: variants,
          test_duration_hours: 24,
          success_metric: 'open_rate'
        }
      });
    } else {
      setCampaignData({
        ...campaignData,
        ab_test_config: undefined
      });
    }
  };

  const addVariant = () => {
    const newVariant = {
      id: `variant_${variants.length}`,
      name: `Variant ${String.fromCharCode(65 + variants.length - 1)}`,
      subject: '',
      percentage: Math.floor(100 / (variants.length + 1))
    };
    
    const updatedVariants = [
      ...variants.map(v => ({
        ...v,
        percentage: Math.floor(100 / (variants.length + 1))
      })),
      newVariant
    ];
    
    setVariants(updatedVariants);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 2) return;
    
    const updatedVariants = variants.filter((_, i) => i !== index);
    const equalPercentage = Math.floor(100 / updatedVariants.length);
    
    setVariants(updatedVariants.map(v => ({ ...v, percentage: equalPercentage })));
  };

  const updateVariant = (index: number, field: string, value: string | number) => {
    const updatedVariants = variants.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    );
    setVariants(updatedVariants);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">A/B Testing Setup</h3>
        <p className="text-sm text-gray-500">
          Test different versions of your campaign to optimize performance
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Enable A/B Testing</CardTitle>
              <CardDescription>
                Compare different versions to find what works best
              </CardDescription>
            </div>
            <Switch 
              checked={abTestEnabled} 
              onCheckedChange={handleToggleABTest}
            />
          </div>
        </CardHeader>

        {abTestEnabled && (
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Test Variants</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addVariant}
                  disabled={variants.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variant
                </Button>
              </div>

              {variants.map((variant, index) => (
                <Card key={variant.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{variant.name}</h4>
                    {variants.length > 2 && index > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeVariant(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-500">Subject Line</Label>
                      <Input 
                        value={variant.subject}
                        onChange={(e) => updateVariant(index, 'subject', e.target.value)}
                        placeholder="Enter subject line"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Split %</Label>
                      <Input 
                        type="number"
                        value={variant.percentage}
                        onChange={(e) => updateVariant(index, 'percentage', parseInt(e.target.value))}
                        min="1"
                        max="100"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Success Metric</Label>
                <Select defaultValue="open_rate">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_rate">Open Rate</SelectItem>
                    <SelectItem value="click_rate">Click Rate</SelectItem>
                    <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Test Duration</Label>
                <Select defaultValue="24">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {!abTestEnabled && (
        <div className="text-center py-8">
          <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">A/B Testing Disabled</h3>
          <p className="text-gray-500">
            Your campaign will be sent with a single version
          </p>
        </div>
      )}
    </div>
  );
};
