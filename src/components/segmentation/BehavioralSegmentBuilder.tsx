import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Users, Target, TrendingUp } from 'lucide-react';
import { AdvancedSegmentationEngine, AdvancedSegment } from '@/services/segmentation/AdvancedSegmentationEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SegmentCondition {
  field: string;
  operator: string;
  value: string | number;
}

export const BehavioralSegmentBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [segments, setSegments] = useState<AdvancedSegment[]>([]);
  const [newSegment, setNewSegment] = useState({
    segment_name: '',
    description: '',
    tags: [] as string[],
  });
  const [conditions, setConditions] = useState<SegmentCondition[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSegments();
    }
  }, [user?.id]);

  const loadSegments = async () => {
    try {
      const data = await AdvancedSegmentationEngine.getAdvancedSegments(user.id);
      setSegments(data);
    } catch (error) {
      console.error('Error loading segments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load segments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'engagement_score', operator: 'gte', value: 0 },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<SegmentCondition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    setConditions(updated);
  };

  const addTag = () => {
    if (newTag.trim() && !newSegment.tags.includes(newTag.trim())) {
      setNewSegment({
        ...newSegment,
        tags: [...newSegment.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewSegment({
      ...newSegment,
      tags: newSegment.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const createSegment = async () => {
    if (!newSegment.segment_name.trim()) {
      toast({
        title: 'Error',
        description: 'Segment name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const filterCriteria: Record<string, any> = {};
      
      conditions.forEach(condition => {
        switch (condition.field) {
          case 'engagement_score':
            if (condition.operator === 'gte') {
              filterCriteria.engagement_score_min = Number(condition.value);
            } else if (condition.operator === 'lte') {
              filterCriteria.engagement_score_max = Number(condition.value);
            }
            break;
          case 'lifecycle_stage':
            filterCriteria.lifecycle_stage = condition.value;
            break;
          case 'churn_risk':
            if (condition.operator === 'lte') {
              filterCriteria.churn_risk_max = Number(condition.value);
            }
            break;
          case 'days_since_last_engagement':
            filterCriteria.days_since_last_engagement = Number(condition.value);
            break;
        }
      });

      await AdvancedSegmentationEngine.createAdvancedSegment(user.id, {
        ...newSegment,
        filter_criteria: filterCriteria,
        is_dynamic: true,
        is_active: true,
      });

      toast({
        title: 'Success',
        description: 'Segment created successfully',
      });

      // Reset form
      setNewSegment({ segment_name: '', description: '', tags: [] });
      setConditions([]);
      loadSegments();
    } catch (error) {
      console.error('Error creating segment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create segment',
        variant: 'destructive',
      });
    }
  };

  const createPrebuiltSegments = async () => {
    try {
      await Promise.all([
        AdvancedSegmentationEngine.createRFMSegments(user.id),
        AdvancedSegmentationEngine.createLifecycleSegments(user.id),
      ]);

      toast({
        title: 'Success',
        description: 'Prebuilt segments created successfully',
      });
      loadSegments();
    } catch (error) {
      console.error('Error creating prebuilt segments:', error);
      toast({
        title: 'Error',
        description: 'Failed to create prebuilt segments',
        variant: 'destructive',
      });
    }
  };

  const fieldOptions = [
    { value: 'engagement_score', label: 'Engagement Score' },
    { value: 'lifecycle_stage', label: 'Lifecycle Stage' },
    { value: 'churn_risk', label: 'Churn Risk Score' },
    { value: 'days_since_last_engagement', label: 'Days Since Last Engagement' },
  ];

  const operatorOptions = [
    { value: 'gte', label: 'Greater than or equal' },
    { value: 'lte', label: 'Less than or equal' },
    { value: 'eq', label: 'Equal to' },
  ];

  const lifecycleStages = ['new', 'active', 'dormant'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Behavioral Segmentation</h1>
          <p className="text-muted-foreground">
            Create intelligent audience segments based on user behavior and engagement patterns.
          </p>
        </div>
        <Button onClick={createPrebuiltSegments}>
          <Target className="h-4 w-4 mr-2" />
          Create Prebuilt Segments
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segment Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Build New Segment</CardTitle>
            <CardDescription>
              Define conditions to automatically group subscribers by behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="segment-name">Segment Name</Label>
              <Input
                id="segment-name"
                value={newSegment.segment_name}
                onChange={(e) => setNewSegment({ ...newSegment, segment_name: e.target.value })}
                placeholder="e.g., High Value Customers"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newSegment.description}
                onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })}
                placeholder="Describe this segment..."
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button size="sm" onClick={addTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {newSegment.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Conditions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Segment Conditions</Label>
                <Button size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
              </div>

              {conditions.map((condition, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      value={condition.field}
                      onValueChange={(value) => updateCondition(index, { field: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(index, { operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    {condition.field === 'lifecycle_stage' ? (
                      <Select
                        value={condition.value.toString()}
                        onValueChange={(value) => updateCondition(index, { value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {lifecycleStages.map(stage => (
                            <SelectItem key={stage} value={stage}>
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: Number(e.target.value) })}
                        placeholder="Value"
                      />
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeCondition(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={createSegment} className="w-full">
              Create Segment
            </Button>
          </CardContent>
        </Card>

        {/* Existing Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Segments</CardTitle>
            <CardDescription>
              Manage your behavioral audience segments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {segments.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No segments created</h3>
                <p className="text-gray-500">
                  Create your first behavioral segment to start targeting specific audience groups.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {segments.map(segment => (
                  <div key={segment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{segment.segment_name}</h3>
                      <Badge 
                        variant={segment.is_active ? 'default' : 'secondary'}
                        className={segment.is_active ? 'bg-green-500' : 'bg-gray-500'}
                      >
                        {segment.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    {segment.description && (
                      <p className="text-sm text-gray-600 mb-2">{segment.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{segment.estimated_size.toLocaleString()} members</span>
                      </div>
                      
                      <div className="flex gap-1">
                        {segment.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
