
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, ExternalLink } from 'lucide-react';

const upcomingWebinars = [
  {
    id: 1,
    title: "Q4 Product Roadmap",
    date: "Dec 15, 2024",
    time: "2:00 PM",
    duration: "60 min",
    registrants: 156,
    status: "upcoming"
  },
  {
    id: 2,
    title: "Holiday Marketing Strategies",
    date: "Dec 18, 2024", 
    time: "11:00 AM",
    duration: "45 min",
    registrants: 89,
    status: "upcoming"
  },
  {
    id: 3,
    title: "Year-End Review",
    date: "Dec 20, 2024",
    time: "3:00 PM", 
    duration: "90 min",
    registrants: 234,
    status: "upcoming"
  }
];

const recentWebinars = [
  {
    id: 1,
    title: "Black Friday Campaign Results",
    date: "Nov 28, 2024",
    duration: "55 min",
    attendees: 89,
    registrants: 134,
    attendanceRate: "66%"
  },
  {
    id: 2,
    title: "Customer Success Stories",
    date: "Nov 25, 2024",
    duration: "40 min", 
    attendees: 156,
    registrants: 198,
    attendanceRate: "79%"
  },
  {
    id: 3,
    title: "Team Collaboration Tools",
    date: "Nov 22, 2024",
    duration: "48 min",
    attendees: 112,
    registrants: 167,
    attendanceRate: "67%"
  }
];

export function DataTables() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Upcoming Webinars
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View all <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingWebinars.map((webinar) => (
              <div key={webinar.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{webinar.title}</h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {webinar.date}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {webinar.time}
                    </span>
                    <span className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {webinar.registrants}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">{webinar.duration}</div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Recent Webinars
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View all <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentWebinars.map((webinar) => (
              <div key={webinar.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{webinar.title}</h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {webinar.date}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {webinar.duration}
                    </span>
                    <span className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {webinar.attendees}/{webinar.registrants}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">{webinar.attendanceRate}</div>
                  <div className="text-xs text-gray-500">Attendance</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
