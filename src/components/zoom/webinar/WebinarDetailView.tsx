
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useWebinarDetail } from '@/hooks/useWebinarDetail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Share, Printer } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WebinarHeader } from './components/WebinarHeader';
import { OverviewTab } from './tabs/OverviewTab';
import { ParticipantsTab } from './tabs/ParticipantsTab';
import { EngagementTab } from './tabs/EngagementTab';
import { InsightsTab } from './tabs/InsightsTab';

interface WebinarDetailViewProps {
  webinarId?: string;
  connectionId?: string;
}

const WebinarDetailView: React.FC<WebinarDetailViewProps> = ({
  webinarId: propWebinarId,
  connectionId: propConnectionId
}) => {
  const params = useParams();
  const navigate = useNavigate();
  const { connection } = useZoomConnection();
  const [activeTab, setActiveTab] = useState('overview');

  const webinarId = propWebinarId || params.webinarId;
  const connectionId = propConnectionId || connection?.id;

  const { data, isLoading, error, refetch } = useWebinarDetail(
    webinarId || '',
    connectionId || ''
  );

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/dashboard/webinars/${webinarId}`;
    if (navigator.share) {
      await navigator.share({
        title: data?.webinar?.topic || 'Webinar Details',
        url
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (!webinarId || !connectionId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Alert>
            <AlertDescription>
              Invalid webinar ID or connection. Please check the URL and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <LoadingSpinner size="lg" />
            <p className="text-center text-muted-foreground mt-4">
              Loading webinar details...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Webinar</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load webinar details: {error.message}
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data?.webinar) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Alert>
            <AlertDescription>
              Webinar not found. It may have been deleted or you don't have access to it.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with navigation and actions */}
      <div className="flex items-center justify-between print:hidden">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Webinar Header */}
      <WebinarHeader webinar={data.webinar} analytics={data.analytics} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab 
            webinar={data.webinar}
            participants={data.participants}
            registrants={data.registrants}
            analytics={data.analytics}
          />
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <ParticipantsTab 
            participants={data.participants}
            webinar={data.webinar}
          />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <EngagementTab 
            polls={data.polls}
            qna={data.qna}
            participants={data.participants}
            webinar={data.webinar}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <InsightsTab 
            analytics={data.analytics}
            participants={data.participants}
            webinar={data.webinar}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebinarDetailView;
