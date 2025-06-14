
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  TrendingUp, 
  Clock, 
  User, 
  Hash,
  Heart,
  ThumbsDown,
  Meh
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ScatterChart,
  Scatter
} from 'recharts';

interface ContentAnalysisProps {
  webinarId?: string;
  analysisType?: 'transcript' | 'qa' | 'chat' | 'all';
}

export const ContentAnalysis: React.FC<ContentAnalysisProps> = ({
  webinarId,
  analysisType = 'all'
}) => {
  const [activeTab, setActiveTab] = useState('topics');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - in real implementation, fetch from AI analysis API
  useEffect(() => {
    const mockAnalysis = {
      topics: {
        word_cloud: [
          { text: 'Analytics', value: 95, category: 'feature' },
          { text: 'Dashboard', value: 87, category: 'interface' },
          { text: 'Data', value: 82, category: 'core' },
          { text: 'Insights', value: 76, category: 'feature' },
          { text: 'Machine Learning', value: 71, category: 'technology' },
          { text: 'Visualization', value: 68, category: 'interface' },
          { text: 'Real-time', value: 64, category: 'feature' },
          { text: 'Integration', value: 58, category: 'technical' },
          { text: 'API', value: 52, category: 'technical' },
          { text: 'Performance', value: 47, category: 'quality' }
        ],
        themes: [
          { theme: 'Product Features', mentions: 156, sentiment: 0.82 },
          { theme: 'Technical Implementation', mentions: 89, sentiment: 0.71 },
          { theme: 'User Experience', mentions: 134, sentiment: 0.88 },
          { theme: 'Pricing & Plans', mentions: 67, sentiment: 0.59 },
          { theme: 'Competition', mentions: 43, sentiment: 0.65 }
        ]
      },
      sentiment: {
        timeline: [
          { time: '0:00', sentiment: 0.7, participants: 245 },
          { time: '0:05', sentiment: 0.75, participants: 243 },
          { time: '0:10', sentiment: 0.82, participants: 241 },
          { time: '0:15', sentiment: 0.78, participants: 238 },
          { time: '0:20', sentiment: 0.85, participants: 235 },
          { time: '0:25', sentiment: 0.68, participants: 232 },
          { time: '0:30', sentiment: 0.72, participants: 228 },
          { time: '0:35', sentiment: 0.79, participants: 225 },
          { time: '0:40', sentiment: 0.74, participants: 220 }
        ],
        distribution: [
          { sentiment: 'Positive', count: 487, percentage: 68.2, color: '#10B981' },
          { sentiment: 'Neutral', count: 167, percentage: 23.4, color: '#6B7280' },
          { sentiment: 'Negative', count: 60, percentage: 8.4, color: '#EF4444' }
        ],
        top_positive: [
          "Amazing dashboard design!",
          "The AI insights are incredibly accurate",
          "This will save us hours of analysis time"
        ],
        top_negative: [
          "Integration process seems complex",
          "Pricing might be too high for small teams",
          "Need better documentation"
        ]
      },
      key_moments: [
        { 
          time: '0:08', 
          type: 'demo_start', 
          engagement_spike: 0.34, 
          description: 'Live dashboard demonstration begins',
          sentiment_change: 0.12
        },
        { 
          time: '0:15', 
          type: 'qa_peak', 
          engagement_spike: 0.28, 
          description: 'Q&A session peak activity',
          sentiment_change: -0.04
        },
        { 
          time: '0:23', 
          type: 'feature_reveal', 
          engagement_spike: 0.41, 
          description: 'AI prediction feature revealed',
          sentiment_change: 0.18
        },
        { 
          time: '0:31', 
          type: 'pricing_discussion', 
          engagement_spike: -0.15, 
          description: 'Pricing plans discussed',
          sentiment_change: -0.14
        }
      ],
      speakers: {
        talk_time: [
          { speaker: 'John (Host)', duration: 1680, percentage: 67.2, segments: 23 },
          { speaker: 'Sarah (Co-host)', duration: 420, percentage: 16.8, segments: 12 },
          { speaker: 'Q&A Participants', duration: 400, percentage: 16.0, segments: 45 }
        ],
        interaction_quality: [
          { speaker: 'John (Host)', clarity: 0.92, engagement: 0.88, pace: 0.85 },
          { speaker: 'Sarah (Co-host)', clarity: 0.89, engagement: 0.91, pace: 0.78 }
        ]
      }
    };

    setTimeout(() => {
      setAnalysisData(mockAnalysis);
      setLoading(false);
    }, 1000);
  }, [webinarId, analysisType]);

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 0.7) return <Heart className="w-4 h-4 text-green-500" />;
    if (sentiment >= 0.4) return <Meh className="w-4 h-4 text-yellow-500" />;
    return <ThumbsDown className="w-4 h-4 text-red-500" />;
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.7) return 'text-green-600';
    if (sentiment >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overall Sentiment</p>
                  <p className={`text-2xl font-bold ${getSentimentColor(0.76)}`}>
                    {Math.round(0.76 * 100)}%
                  </p>
                </div>
                {getSentimentIcon(0.76)}
              </div>
              <p className="text-xs text-gray-500">Positive sentiment</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Key Topics</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {analysisData.topics.themes.length}
                  </p>
                </div>
                <Hash className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500">Major themes identified</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Key Moments</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analysisData.key_moments.length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500">Engagement spikes detected</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Speaker Balance</p>
                  <p className="text-2xl font-bold text-orange-600">
                    67%
                  </p>
                </div>
                <User className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500">Host talk time</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Content Analysis Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment Tracking</TabsTrigger>
              <TabsTrigger value="moments">Key Moments</TabsTrigger>
              <TabsTrigger value="speakers">Speaker Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="topics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Topic Word Cloud</h4>
                  <div className="border rounded-lg p-4 h-64 flex flex-wrap items-center justify-center gap-2">
                    {analysisData.topics.word_cloud.map((word: any, index: number) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded"
                        style={{ 
                          fontSize: `${Math.max(12, word.value / 5)}px`,
                          fontWeight: word.value > 70 ? 'bold' : 'normal'
                        }}
                      >
                        {word.text}
                      </motion.span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Theme Analysis</h4>
                  <div className="space-y-3">
                    {analysisData.topics.themes.map((theme: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{theme.theme}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{theme.mentions} mentions</Badge>
                            {getSentimentIcon(theme.sentiment)}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(theme.mentions / 156) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sentiment" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Sentiment Over Time</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysisData.sentiment.timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 1]} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="sentiment" 
                          stroke="#10B981" 
                          strokeWidth={3}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Sentiment Distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analysisData.sentiment.distribution}
                          dataKey="count"
                          nameKey="sentiment"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ percentage }) => `${percentage.toFixed(1)}%`}
                        >
                          {analysisData.sentiment.distribution.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4 text-green-600">Top Positive Comments</h4>
                  <div className="space-y-2">
                    {analysisData.sentiment.top_positive.map((comment: string, index: number) => (
                      <div key={index} className="border-l-4 border-green-500 pl-3 py-2 bg-green-50">
                        <p className="text-sm italic">"{comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4 text-red-600">Areas for Improvement</h4>
                  <div className="space-y-2">
                    {analysisData.sentiment.top_negative.map((comment: string, index: number) => (
                      <div key={index} className="border-l-4 border-red-500 pl-3 py-2 bg-red-50">
                        <p className="text-sm italic">"{comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="moments" className="space-y-4">
              <h4 className="font-medium mb-4">Key Engagement Moments</h4>
              <div className="space-y-4">
                {analysisData.key_moments.map((moment: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline">{moment.time}</Badge>
                          <Badge 
                            variant={moment.engagement_spike > 0 ? "default" : "destructive"}
                          >
                            {moment.engagement_spike > 0 ? '+' : ''}{Math.round(moment.engagement_spike * 100)}% engagement
                          </Badge>
                          <Badge 
                            variant={moment.sentiment_change > 0 ? "default" : "secondary"}
                          >
                            {moment.sentiment_change > 0 ? '+' : ''}{Math.round(moment.sentiment_change * 100)}% sentiment
                          </Badge>
                        </div>
                        <p className="font-medium">{moment.description}</p>
                        <p className="text-sm text-gray-600 capitalize">Type: {moment.type.replace('_', ' ')}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="speakers" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Talk Time Distribution</h4>
                  <div className="space-y-3">
                    {analysisData.speakers.talk_time.map((speaker: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{speaker.speaker}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {Math.floor(speaker.duration / 60)}m {speaker.duration % 60}s
                            </Badge>
                            <Badge variant="secondary">
                              {speaker.percentage}%
                            </Badge>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${speaker.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {speaker.segments} speaking segments
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Speaker Quality Metrics</h4>
                  <div className="space-y-4">
                    {analysisData.speakers.interaction_quality.map((speaker: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3">{speaker.speaker}</h5>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Clarity</span>
                            <span className="text-sm font-medium">{Math.round(speaker.clarity * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-green-600 h-1 rounded-full" 
                              style={{ width: `${speaker.clarity * 100}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Engagement</span>
                            <span className="text-sm font-medium">{Math.round(speaker.engagement * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-blue-600 h-1 rounded-full" 
                              style={{ width: `${speaker.engagement * 100}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Pace</span>
                            <span className="text-sm font-medium">{Math.round(speaker.pace * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-orange-600 h-1 rounded-full" 
                              style={{ width: `${speaker.pace * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
