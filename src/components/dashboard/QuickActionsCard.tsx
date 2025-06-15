
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Video, BarChart3, Upload, Download, Send, Brain } from 'lucide-react';

export function QuickActionsCard() {
  const actions = [
    {
      label: 'View Webinars',
      description: 'Browse all webinars',
      icon: Video,
      href: '/webinars',
      color: 'text-blue-600'
    },
    {
      label: 'Advanced Analytics',
      description: 'Detailed insights',
      icon: BarChart3,
      href: '/advanced-analytics',
      color: 'text-green-600'
    },
    {
      label: 'Import Data',
      description: 'Upload CSV data',
      icon: Upload,
      href: '/csv-upload',
      color: 'text-purple-600'
    },
    {
      label: 'Export Reports',
      description: 'Download reports',
      icon: Download,
      href: '/reports',
      color: 'text-orange-600'
    },
    {
      label: 'Email Campaign',
      description: 'Send campaigns',
      icon: Send,
      href: '/campaigns',
      color: 'text-pink-600'
    },
    {
      label: 'AI Insights',
      description: 'Get AI analysis',
      icon: Brain,
      href: '/ai-insights',
      color: 'text-indigo-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                asChild
                variant="ghost"
                className="h-auto p-3 flex flex-col items-center text-center hover:bg-gray-50"
              >
                <Link to={action.href}>
                  <Icon className={`w-5 h-5 mb-1 ${action.color}`} />
                  <div className="text-xs font-medium">{action.label}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
