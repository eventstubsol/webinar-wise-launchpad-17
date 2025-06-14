
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CSVUploadSection() {
  const navigate = useNavigate();

  const uploadTypes = [
    {
      type: 'participants',
      title: 'Participants',
      description: 'Upload participant contact information and details',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      type: 'webinars',
      title: 'Webinars',
      description: 'Upload webinar schedules and basic information',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      type: 'participations',
      title: 'Participations',
      description: 'Upload webinar attendance and participation data',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            CSV Data Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Import Your Data</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Upload CSV files to import participants, webinars, or participation data when Zoom integration isn't available.
            </p>
            <Button 
              onClick={() => navigate('/csv-upload')}
              size="lg"
              className="px-8"
            >
              <Upload className="w-4 h-4 mr-2" />
              Start CSV Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {uploadTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card key={type.type} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className={`w-12 h-12 rounded-lg ${type.bgColor} flex items-center justify-center mx-auto mb-3`}>
                  <Icon className={`w-6 h-6 ${type.color}`} />
                </div>
                <h4 className="font-medium mb-2">{type.title}</h4>
                <p className="text-sm text-gray-600">{type.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
