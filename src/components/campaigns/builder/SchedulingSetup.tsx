
import React, { useState } from 'react';
import { Campaign } from '@/types/campaign';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Clock, Send, Repeat } from 'lucide-react';

interface SchedulingSetupProps {
  campaignData: Partial<Campaign>;
  setCampaignData: (data: Partial<Campaign>) => void;
  onNext?: () => void;
}

export const SchedulingSetup: React.FC<SchedulingSetupProps> = ({
  campaignData,
  setCampaignData,
  onNext
}) => {
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled' | 'recurring'>('immediate');
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  const handleScheduleChange = (type: 'immediate' | 'scheduled' | 'recurring') => {
    setScheduleType(type);
    
    const scheduleConfig = {
      type,
      send_immediately: type === 'immediate',
      scheduled_time: type === 'scheduled' ? `${sendDate}T${sendTime}:00Z` : null,
      timezone,
      recurring_pattern: type === 'recurring' ? {
        frequency: 'weekly',
        day_of_week: 1
      } : null
    };

    setCampaignData({
      ...campaignData,
      send_schedule: scheduleConfig
    });
  };

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' }
  ];

  // Get current date and time for min values
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Schedule Campaign</h3>
        <p className="text-sm text-gray-500">
          Choose when to send your campaign
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sending Options</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={scheduleType} 
            onValueChange={(value: 'immediate' | 'scheduled' | 'recurring') => handleScheduleChange(value)}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="immediate" id="immediate" />
              <Label htmlFor="immediate" className="flex items-center space-x-2 cursor-pointer">
                <Send className="h-4 w-4" />
                <span>Send immediately</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scheduled" id="scheduled" />
              <Label htmlFor="scheduled" className="flex items-center space-x-2 cursor-pointer">
                <Calendar className="h-4 w-4" />
                <span>Schedule for later</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recurring" id="recurring" />
              <Label htmlFor="recurring" className="flex items-center space-x-2 cursor-pointer">
                <Repeat className="h-4 w-4" />
                <span>Recurring campaign</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {scheduleType === 'scheduled' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule Details</CardTitle>
            <CardDescription>Choose when to send your campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="send-date">Send Date</Label>
                <Input
                  id="send-date"
                  type="date"
                  value={sendDate}
                  onChange={(e) => setSendDate(e.target.value)}
                  min={today}
                />
              </div>
              <div>
                <Label htmlFor="send-time">Send Time</Label>
                <Input
                  id="send-time"
                  type="time"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  min={sendDate === today ? currentTime : '00:00'}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {scheduleType === 'recurring' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recurring Schedule</CardTitle>
            <CardDescription>Set up recurring campaign delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select defaultValue="weekly">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="day-of-week">Day of Week</Label>
                <Select defaultValue="1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recurring-time">Send Time</Label>
                <Input
                  id="recurring-time"
                  type="time"
                  defaultValue="09:00"
                />
              </div>
              <div>
                <Label htmlFor="recurring-timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {scheduleType === 'immediate' && (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Send</h3>
          <p className="text-gray-500">
            Your campaign will be sent immediately after launch
          </p>
        </div>
      )}
    </div>
  );
};
