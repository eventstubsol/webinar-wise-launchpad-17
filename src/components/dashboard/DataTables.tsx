
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, ExternalLink } from 'lucide-react';
import { useWebinarMetrics } from '@/hooks/useWebinarMetrics';
import { Skeleton } from '@/components/ui/skeleton';

const TableSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex space-x-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export function DataTables() {
  const { metrics, loading, error } = useWebinarMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading webinar data: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingWebinars = metrics?.upcomingWebinars || [];
  const recentWebinars = metrics?.recentWebinars || [];

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
          {upcomingWebinars.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No upcoming webinars scheduled. Schedule your next webinar in Zoom to see it here.
            </div>
          ) : (
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
                    <div className="text-sm font-medium text-blue-600">{webinar.duration}m</div>
                    <div className="text-xs text-gray-500">Duration</div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          {recentWebinars.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent webinars found. Host webinars in Zoom to see analytics here.
            </div>
          ) : (
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
                        {webinar.duration}m
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
