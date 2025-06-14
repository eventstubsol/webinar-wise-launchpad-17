
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface CronExpressionBuilderProps {
  value: string;
  onChange: (cronExpression: string) => void;
  timezone: string;
}

export function CronExpressionBuilder({ value, onChange, timezone }: CronExpressionBuilderProps) {
  const [activeTab, setActiveTab] = useState('simple');
  const [simpleConfig, setSimpleConfig] = useState({
    frequency: 'daily',
    hour: '9',
    minute: '0',
    dayOfWeek: '1',
    dayOfMonth: '1'
  });
  const [customExpression, setCustomExpression] = useState(value || '0 9 * * *');

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' }
  ];

  const dayOptions = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '0', label: 'Sunday' }
  ];

  const generateCronExpression = () => {
    const { frequency, hour, minute, dayOfWeek, dayOfMonth } = simpleConfig;
    
    switch (frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * ${dayOfWeek}`;
      case 'monthly':
        return `${minute} ${hour} ${dayOfMonth} * *`;
      default:
        return customExpression;
    }
  };

  const parseNextRuns = (cron: string) => {
    // Simplified next run calculation - in real implementation use a cron parser library
    const now = new Date();
    const nextRuns = [];
    
    for (let i = 1; i <= 3; i++) {
      const nextRun = new Date(now);
      nextRun.setDate(now.getDate() + i);
      nextRuns.push(nextRun.toLocaleString('en-US', { 
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
    
    return nextRuns;
  };

  useEffect(() => {
    const cronExpr = generateCronExpression();
    onChange(cronExpr);
  }, [simpleConfig, customExpression]);

  const currentCron = generateCronExpression();
  const nextRuns = parseNextRuns(currentCron);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Schedule Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">Simple</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={simpleConfig.frequency} onValueChange={(value) => 
                  setSimpleConfig(prev => ({ ...prev, frequency: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <div className="flex gap-2">
                  <Select value={simpleConfig.hour} onValueChange={(value) => 
                    setSimpleConfig(prev => ({ ...prev, hour: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="self-center">:</span>
                  <Select value={simpleConfig.minute} onValueChange={(value) => 
                    setSimpleConfig(prev => ({ ...prev, minute: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {simpleConfig.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={simpleConfig.dayOfWeek} onValueChange={(value) => 
                  setSimpleConfig(prev => ({ ...prev, dayOfWeek: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {simpleConfig.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select value={simpleConfig.dayOfMonth} onValueChange={(value) => 
                  setSimpleConfig(prev => ({ ...prev, dayOfMonth: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {(i + 1).toString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <Label>Cron Expression</Label>
              <Input
                value={customExpression}
                onChange={(e) => setCustomExpression(e.target.value)}
                placeholder="0 9 * * *"
                className="font-mono"
              />
              <div className="text-xs text-gray-500">
                Format: minute hour day month day-of-week
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Current Expression:</span>
            <Badge variant="secondary" className="font-mono">{currentCron}</Badge>
          </div>
          <div className="text-sm text-gray-600">
            <div className="font-medium mb-1">Next 3 runs ({timezone}):</div>
            <ul className="list-disc list-inside text-xs space-y-1">
              {nextRuns.map((run, index) => (
                <li key={index}>{run}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
