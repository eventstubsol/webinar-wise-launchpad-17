
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Target, TrendingUp } from 'lucide-react';
import { AdvancedSegmentationEngine, AdvancedSegment } from '@/services/segmentation/AdvancedSegmentationEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const BehavioralSegmentBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [segments, setSegments] = useState<AdvancedSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [segmentName, setSegmentName] = useState('');
  const [description, setDescription] = useState('');
  const [minEngagement, setMinEngagement] = useState(50);
  const [maxEngagement, setMaxEngagement] = useState(100);
  const [lifecycleStage, setLifecycleStage] = useState('');

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
        description: 'Failed to load behavioral segments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSegment = async () => {
    if (!segmentName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a segment name',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const filterCriteria: Record<string, any> = {
        engagement_score_min: minEngagement,
        engagement_score_max: maxEngagement,
      };

      if (lifecycleStage) {
        filterCriteria.lifecycle_stage = lifecycleStage;
      }

      await AdvancedSegmentationEngine.createAdvancedSegment(user.id, {
        segment_name: segmentName,
        description: description || undefined,
        filter_criteria: filterCriteria,
        is_dynamic: true,
        tags: ['custom'],
        is_active: true,
      });

      toast({
        title: 'Success',
        description: 'Behavioral segment created successfully',
      });

      // Reset form
      setSegmentName('');
      setDescription('');
      setMinEngagement(50);
      setMaxEngagement(100);
      setLifecycleStage('');

      // Reload segments
      loadSegments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create behavioral segment',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const createPrebuiltSegments = async (type: 'rfm' | 'lifecycle') => {
    setCreating(true);
    try {
      if (type === 'rfm') {
        await AdvancedSegmentationEngine.createRFMSegments(user.id);
        toast({
          title: 'Success',
          description: 'RFM segments created successfully',
        });
      } else {
        await AdvancedSegmentationEngine.createLifecycleSegments(user.id);
        toast({
          title: 'Success',
          description: 'Lifecycle segments created successfully',
        });
      }
      loadSegments();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to create ${type} segments`,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-gray-100 rounded animate-pulse" />
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
            Create dynamic audience segments based on engagement patterns and behavior.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => createPrebuiltSegments('rfm')}
            disabled={creating}
          >
            <Target className="h-4 w-4 mr-2" />
            Create RFM Segments
          </Button>
          <Button 
            variant="outline" 
            onClick={() => createPrebuiltSegments('lifecycle')}
            disabled={creating}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Create Lifecycle Segments
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Segments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.length}</div>
            <p className="text-xs text-muted-foreground">
              {segments.filter(s => s.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dynamic Segments</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {segments.filter(s => s.is_dynamic).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-updating segments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audience</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {segments.reduce((sum, s) => sum + s.estimated_size, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all segments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Segment Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {segments.length > 0 
                ? Math.round(segments.reduce((sum, s) => sum + s.estimated_size, 0) / segments.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average contacts per segment
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="segments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="segments">Existing Segments</TabsTrigger>
          <TabsTrigger value="builder">Create New Segment</TabsTrigger>
        </TabsList>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Behavioral Segments</CardTitle>
              <CardDescription>
                Your dynamic audience segments based on engagement and behavior patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {segments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No segments created</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first behavioral segment to start targeting specific audiences.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => createPrebuiltSegments('rfm')}>
                      Create RFM Segments
                    </Button>
                    <Button variant="outline" onClick={() => createPrebuiltSegments('lifecycle')}>
                      Create Lifecycle Segments
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {segments.map(segment => (
                    <div key={segment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{segment.segment_name}</h3>
                          <Badge variant={segment.is_active ? 'default' : 'secondary'}>
                            {segment.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {segment.is_dynamic && (
                            <Badge variant="outline">Dynamic</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {segment.estimated_size} contacts
                        </div>
                      </div>
                      
                      {segment.description && (
                        <p className="text-sm text-gray-600 mb-2">{segment.description}</p>
                      )}
                      
                      <div className="flex gap-2">
                        {segment.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder">
          <Card>
            <CardHeader>
              <CardTitle>Create New Behavioral Segment</CardTitle>
              <CardDescription>
                Build a custom segment based on engagement patterns and behavior criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="segmentName">Segment Name</Label>
                  <Input
                    id="segmentName"
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                    placeholder="e.g., High Engagement Users"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lifecycleStage">Lifecycle Stage (Optional)</Label>
                  <select
                    id="lifecycleStage"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={lifecycleStage}
                    onChange={(e) => setLifecycleStage(e.target.value)}
                  >
                    <option value="">All stages</option>
                    <option value="new">New</option>
                    <option value="active">Active</option>
                    <option value="dormant">Dormant</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this segment..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minEngagement">Min Engagement Score</Label>
                  <Input
                    id="minEngagement"
                    type="number"
                    value={minEngagement}
                    onChange={(e) => setMinEngagement(parseInt(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxEngagement">Max Engagement Score</Label>
                  <Input
                    id="maxEngagement"
                    type="number"
                    value={maxEngagement}
                    onChange={(e) => setMaxEngagement(parseInt(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <Button onClick={createSegment} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                {creating ? 'Creating...' : 'Create Segment'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
