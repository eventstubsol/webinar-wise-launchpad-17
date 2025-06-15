
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Eye, Calendar, Users, Clock, TrendingUp } from 'lucide-react';

// Mock data - replace with real data from hooks
const recentWebinars = [
  {
    id: '1',
    title: 'Q4 Product Launch Webinar',
    date: '2024-12-15',
    time: '14:00',
    registrants: 156,
    attendees: 89,
    duration: 45,
    status: 'completed',
    attendanceRate: 57
  },
  {
    id: '2', 
    title: 'Customer Success Best Practices',
    date: '2024-12-10',
    time: '16:00',
    registrants: 234,
    attendees: 167,
    duration: 60,
    status: 'completed',
    attendanceRate: 71
  },
  {
    id: '3',
    title: 'Holiday Marketing Strategies',
    date: '2024-12-05',
    time: '13:00',
    registrants: 189,
    attendees: 134,
    duration: 50,
    status: 'completed',
    attendanceRate: 71
  }
];

const upcomingWebinars = [
  {
    id: '4',
    title: 'New Year Planning Workshop',
    date: '2024-12-28',
    time: '15:00',
    registrants: 98,
    status: 'scheduled'
  },
  {
    id: '5',
    title: 'AI in Business: 2025 Trends',
    date: '2025-01-05',
    time: '14:00',
    registrants: 145,
    status: 'scheduled'
  }
];

export function WebinarDataTables() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Recent Activity</h2>
        <p className="text-gray-600">Your latest webinar performance and upcoming events</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Webinars */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Webinars</span>
              <Button asChild variant="outline" size="sm">
                <Link to="/webinars">
                  View All
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentWebinars.map((webinar) => (
                <div key={webinar.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 flex-1">{webinar.title}</h4>
                    {getStatusBadge(webinar.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(webinar.date).toLocaleDateString()} at {webinar.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {webinar.duration}m duration
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {webinar.attendees}/{webinar.registrants} attended
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className={getAttendanceColor(webinar.attendanceRate)}>
                        {webinar.attendanceRate}% rate
                      </span>
                    </div>
                  </div>

                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link to={`/webinars/${webinar.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Webinars */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upcoming Webinars</span>
              <Button asChild variant="outline" size="sm">
                <Link to="/webinars?filter=upcoming">
                  View All
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingWebinars.map((webinar) => (
                <div key={webinar.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 flex-1">{webinar.title}</h4>
                    {getStatusBadge(webinar.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(webinar.date).toLocaleDateString()} at {webinar.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {webinar.registrants} registered
                    </div>
                  </div>

                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link to={`/webinars/${webinar.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                </div>
              ))}

              {upcomingWebinars.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No upcoming webinars scheduled</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
