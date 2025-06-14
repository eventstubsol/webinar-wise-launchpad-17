
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Share2, 
  Bookmark, 
  Download, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts';

interface InsightCardProps {
  insight: {
    id: string;
    title: string;
    summary: string;
    confidence_score: number;
    insight_type: string;
    status: 'processing' | 'completed' | 'failed';
    created_at: string;
    supporting_data?: any;
    trend_data?: Array<{time: string; value: number}>;
  };
  onSave?: (id: string) => void;
  onShare?: (id: string) => void;
  onExpand?: (id: string) => void;
  isLoading?: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onSave,
  onShare,
  onExpand,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'engagement': return <TrendingUp className="w-4 h-4" />;
      case 'predictive': return <Brain className="w-4 h-4" />;
      case 'content': return <AlertTriangle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const confidenceData = [
    { name: 'Confidence', value: insight.confidence_score * 100, color: '#3B82F6' },
    { name: 'Uncertainty', value: (1 - insight.confidence_score) * 100, color: '#E5E7EB' }
  ];

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave?.(insight.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {getTypeIcon(insight.insight_type)}
              <CardTitle className="text-lg font-semibold line-clamp-2">
                {insight.title}
              </CardTitle>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(insight.status)} text-white`}
              >
                {insight.status}
              </Badge>
              
              {/* Confidence Score Ring */}
              <div className="w-12 h-12 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={confidenceData}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      innerRadius={14}
                      outerRadius={20}
                      strokeWidth={0}
                    >
                      {confidenceData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {Math.round(insight.confidence_score * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 line-clamp-3">
                {insight.summary}
              </p>

              {/* Mini Trend Visualization */}
              {insight.trend_data && insight.trend_data.length > 0 && (
                <div className="h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insight.trend_data}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Confidence Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Confidence</span>
                  <span>{Math.round(insight.confidence_score * 100)}%</span>
                </div>
                <Progress value={insight.confidence_score * 100} className="h-2" />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleSave}
                    className={isSaved ? "text-blue-600" : ""}
                  >
                    <Bookmark className={`w-4 h-4 mr-1 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => onShare?.(insight.id)}>
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                  
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </CardContent>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t bg-gray-50"
            >
              <div className="p-4 space-y-4">
                <h4 className="font-medium text-sm">Supporting Data</h4>
                
                {insight.supporting_data ? (
                  <div className="text-xs text-gray-600 bg-white p-3 rounded border">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(insight.supporting_data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription className="text-sm">
                      No additional supporting data available for this insight.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end">
                  <Button size="sm" onClick={() => onExpand?.(insight.id)}>
                    View Full Analysis
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};
