
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, Mail, Eye, MousePointer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ABTestingAnalyticsService } from '@/services/campaigns/ABTestingAnalyticsService';
import { useToast } from '@/hooks/use-toast';

interface ABTestingAnalyticsProps {
  campaignId: string;
}

export const ABTestingAnalytics: React.FC<ABTestingAnalyticsProps> = ({
  campaignId
}) => {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);

  useEffect(() => {
    loadTestResults();
  }, [campaignId]);

  const loadTestResults = async () => {
    try {
      setLoading(true);
      const results = await ABTestingAnalyticsService.analyzeABTestResults(campaignId);
      setTestResults(results);
    } catch (error) {
      console.error('Error loading A/B test results:', error);
      toast({
        title: "Error",
        description: "Failed to load A/B test results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWinner = async (variantId: string) => {
    try {
      await ABTestingAnalyticsService.selectWinningVariant(campaignId, variantId);
      setSelectedWinner(variantId);
      toast({
        title: "Success",
        description: "Winning variant selected successfully"
      });
      await loadTestResults();
    } catch (error) {
      console.error('Error selecting winner:', error);
      toast({
        title: "Error",
        description: "Failed to select winning variant",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!testResults?.variants || testResults.variants.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Testing Analytics</CardTitle>
          <CardDescription>No A/B test data available for this campaign</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getSignificanceColor = (isSignificant: boolean, pValue: number) => {
    if (isSignificant && pValue < 0.01) return 'text-green-600';
    if (isSignificant && pValue < 0.05) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getSignificanceBadge = (isSignificant: boolean, pValue: number) => {
    if (isSignificant && pValue < 0.01) return <Badge className="bg-green-100 text-green-800">Highly Significant</Badge>;
    if (isSignificant && pValue < 0.05) return <Badge className="bg-yellow-100 text-yellow-800">Significant</Badge>;
    return <Badge variant="secondary">Not Significant</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing Analytics</h2>
          <p className="text-muted-foreground">Statistical analysis of campaign variants</p>
        </div>
      </div>

      {/* Variant Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testResults.variants.map((variant: any, index: number) => (
          <Card key={variant.id} className={selectedWinner === variant.id ? 'ring-2 ring-green-500' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Variant {String.fromCharCode(65 + index)} 
                  {selectedWinner === variant.id && <Badge className="bg-green-100 text-green-800">Winner</Badge>}
                </CardTitle>
                {!selectedWinner && (
                  <Button 
                    size="sm" 
                    onClick={() => handleSelectWinner(variant.id)}
                    disabled={!testResults.comparisons.some((c: any) => 
                      (c.openRateTest.isSignificant || c.clickRateTest.isSignificant) &&
                      (c.openRateTest.winner === String.fromCharCode(65 + index) || 
                       c.clickRateTest.winner === String.fromCharCode(65 + index))
                    )}
                  >
                    Select Winner
                  </Button>
                )}
              </div>
              <CardDescription>{variant.variant_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Recipients</span>
                  </div>
                  <div className="text-2xl font-bold">{variant.recipient_count || 0}</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Open Rate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {variant.recipient_count > 0 ? 
                      ((variant.metrics.opened / variant.recipient_count) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Click Rate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {variant.recipient_count > 0 ? 
                      ((variant.metrics.clicked / variant.recipient_count) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-muted-foreground">Conversions</span>
                  </div>
                  <div className="text-2xl font-bold">{variant.metrics.converted || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistical Significance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Statistical Significance Analysis</CardTitle>
          <CardDescription>Confidence intervals and p-values for variant comparisons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {testResults.comparisons.map((comparison: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    Variant {comparison.variantA} vs Variant {comparison.variantB}
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Open Rate Test</span>
                      {getSignificanceBadge(comparison.openRateTest.isSignificant, comparison.openRateTest.pValue)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>P-value:</span>
                        <span className={getSignificanceColor(comparison.openRateTest.isSignificant, comparison.openRateTest.pValue)}>
                          {comparison.openRateTest.pValue.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Confidence:</span>
                        <span>{comparison.openRateTest.confidenceLevel?.toFixed(1)}%</span>
                      </div>
                      {comparison.openRateTest.isSignificant && (
                        <div className="flex justify-between text-sm">
                          <span>Improvement:</span>
                          <span className="text-green-600 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {comparison.openRateTest.improvement?.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Click Rate Test</span>
                      {getSignificanceBadge(comparison.clickRateTest.isSignificant, comparison.clickRateTest.pValue)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>P-value:</span>
                        <span className={getSignificanceColor(comparison.clickRateTest.isSignificant, comparison.clickRateTest.pValue)}>
                          {comparison.clickRateTest.pValue.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Confidence:</span>
                        <span>{comparison.clickRateTest.confidenceLevel?.toFixed(1)}%</span>
                      </div>
                      {comparison.clickRateTest.isSignificant && (
                        <div className="flex justify-between text-sm">
                          <span>Improvement:</span>
                          <span className="text-green-600 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {comparison.clickRateTest.improvement?.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">{comparison.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overall Winner Recommendation */}
      {testResults.overall_winner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Recommended Winner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{testResults.overall_winner.variant_name}</h4>
                <p className="text-muted-foreground">
                  This variant shows the best overall performance across metrics
                </p>
              </div>
              {!selectedWinner && (
                <Button onClick={() => handleSelectWinner(testResults.overall_winner.id)}>
                  Select as Winner
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
