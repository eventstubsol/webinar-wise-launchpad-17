
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, TrendingUp, Users, Target } from 'lucide-react';
import { DynamicPersonalizationEngine, PersonalizationRule } from '@/services/personalization/DynamicPersonalizationEngine';
import { EngagementOptimizationEngine } from '@/services/optimization/EngagementOptimizationEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const PersonalizationDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<PersonalizationRule[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    try {
      const [rulesData, experimentsData] = await Promise.all([
        DynamicPersonalizationEngine.getPersonalizationRules(user.id),
        EngagementOptimizationEngine.getOptimizationExperiments(user.id),
      ]);

      setRules(rulesData);
      setExperiments(experimentsData);
    } catch (error) {
      console.error('Error loading personalization data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load personalization data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSampleRule = async () => {
    try {
      const sampleRule = {
        rule_name: 'High Engagement Subject Lines',
        rule_type: 'subject_line' as const,
        conditions: {
          engagement_score_min: 70,
        },
        content_variations: [
          'Exclusive: Your personalized insights are ready!',
          'VIP Access: Advanced analytics inside',
          'Premium Content: Just for our most engaged subscribers',
        ],
        performance_metrics: {},
        is_active: true,
      };

      await DynamicPersonalizationEngine.createPersonalizationRule(user.id, sampleRule);
      toast({
        title: 'Success',
        description: 'Sample personalization rule created',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create personalization rule',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500' : 'bg-gray-500';
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'subject_line': return <Target className="h-4 w-4" />;
      case 'content_block': return <Settings className="h-4 w-4" />;
      case 'send_time': return <TrendingUp className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
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
          <h1 className="text-3xl font-bold">Dynamic Personalization</h1>
          <p className="text-muted-foreground">
            Optimize your email campaigns with intelligent personalization and behavioral targeting.
          </p>
        </div>
        <Button onClick={createSampleRule}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {rules.length} total rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Experiments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {experiments.filter(e => e.status === 'running').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Optimization tests active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance Lift</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+23%</div>
            <p className="text-xs text-muted-foreground">
              Across personalized campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segments Targeted</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Behavioral segments active
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Personalization Rules</TabsTrigger>
          <TabsTrigger value="experiments">A/B Experiments</TabsTrigger>
          <TabsTrigger value="insights">Performance Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Personalization Rules</CardTitle>
              <CardDescription>
                Manage dynamic content rules that automatically personalize your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No personalization rules</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first rule to start personalizing your email campaigns.
                  </p>
                  <Button onClick={createSampleRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Sample Rule
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map(rule => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getRuleTypeIcon(rule.rule_type)}
                          <h3 className="font-medium">{rule.rule_name}</h3>
                          <Badge 
                            variant={rule.is_active ? 'default' : 'secondary'}
                            className={rule.is_active ? 'bg-green-500' : 'bg-gray-500'}
                          >
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <Badge variant="outline">{rule.rule_type.replace('_', ' ')}</Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Conditions:</strong> {JSON.stringify(rule.conditions)}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <strong>Variations:</strong> {rule.content_variations.length} configured
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments">
          <Card>
            <CardHeader>
              <CardTitle>A/B Experiments</CardTitle>
              <CardDescription>
                Active optimization experiments and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {experiments.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No experiments running</h3>
                  <p className="text-gray-500 mb-4">
                    Start A/B testing to optimize your campaign performance.
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Experiment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {experiments.map(experiment => (
                    <div key={experiment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{experiment.experiment_name}</h3>
                        <Badge 
                          variant={experiment.status === 'running' ? 'default' : 'secondary'}
                        >
                          {experiment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{experiment.hypothesis}</p>
                      <div className="flex gap-4 text-sm">
                        <span>Type: {experiment.experiment_type}</span>
                        <span>Control Group: {experiment.control_group_size}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>
                Key metrics and trends from your personalization efforts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Top Performing Rules</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">High Engagement Subject Lines</span>
                      <span className="text-sm font-medium text-green-600">+34% CTR</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">Send Time Optimization</span>
                      <span className="text-sm font-medium text-green-600">+28% Open Rate</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Segment Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">High Value Customers</span>
                      <span className="text-sm font-medium">87% engagement</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">At-Risk Subscribers</span>
                      <span className="text-sm font-medium">23% recovery rate</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
