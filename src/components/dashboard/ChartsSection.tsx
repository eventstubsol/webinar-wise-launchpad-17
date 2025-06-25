
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWebinarMetrics } from '@/hooks/useWebinarMetrics';
import { Skeleton } from '@/components/ui/skeleton';

const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent>
      <Skeleton className="w-full h-[300px]" />
    </CardContent>
  </Card>
);

export function ChartsSection() {
  const { metrics, loading, error } = useWebinarMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading chart data: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render charts section if no data (handled by EmptyDashboardState)
  if (!metrics || metrics.isEmpty) {
    return null;
  }

  const monthlyData = metrics.monthlyTrends || [];
  const registrationData = metrics.monthlyTrends || [];

  // If we have a connection but no webinar data yet
  if (monthlyData.length === 0) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Monthly Webinar Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">No webinar data available yet</div>
                <div className="text-sm">Start a sync to import your webinar history and see analytics here.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Registration vs Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">No registration data available yet</div>
                <div className="text-sm">Start a sync to import your webinar history and see analytics here.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Monthly Webinar Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="webinars" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Registration vs Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={registrationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="registrants" 
                stroke="#14b8a6" 
                strokeWidth={3}
                dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
                name="Registrants"
              />
              <Line 
                type="monotone" 
                dataKey="attendees" 
                stroke="#1e40af" 
                strokeWidth={3}
                dot={{ fill: '#1e40af', strokeWidth: 2, r: 4 }}
                name="Attendees"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
