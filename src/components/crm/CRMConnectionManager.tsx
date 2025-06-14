
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { CRMConnection } from '@/types/crm';
import { CRMConnectionManager as Manager } from '@/services/crm/CRMConnectionManager';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CRMConnectionForm } from './CRMConnectionForm';
import { CRMFieldMappingInterface } from './CRMFieldMappingInterface';
import { CRMSyncConfiguration } from './CRMSyncConfiguration';
import { CRMActivityLogs } from './CRMActivityLogs';

export function CRMConnectionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<CRMConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<CRMConnection | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'mappings' | 'sync' | 'logs'>('overview');

  useEffect(() => {
    if (user?.id) {
      loadConnections();
    }
  }, [user?.id]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await Manager.getConnections(user!.id);
      setConnections(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load CRM connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await Manager.deleteConnection(connectionId);
      toast({
        title: "Success",
        description: "CRM connection deleted successfully",
      });
      loadConnections();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete CRM connection",
        variant: "destructive",
      });
    }
  };

  const handleValidateConnection = async (connectionId: string) => {
    try {
      const isValid = await Manager.validateConnection(connectionId);
      toast({
        title: isValid ? "Success" : "Error",
        description: isValid ? "Connection is valid" : "Connection validation failed",
        variant: isValid ? "default" : "destructive",
      });
      loadConnections();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate connection",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedConnection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => setSelectedConnection(null)}>
              ← Back to Connections
            </Button>
            <h2 className="text-2xl font-bold mt-2">{selectedConnection.connection_name}</h2>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(selectedConnection.status)}
            <Badge className={getStatusColor(selectedConnection.status)}>
              {selectedConnection.status}
            </Badge>
          </div>
        </div>

        <div className="flex space-x-4 border-b">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'mappings', label: 'Field Mappings' },
            { key: 'sync', label: 'Sync Configuration' },
            { key: 'logs', label: 'Activity Logs' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'overview' && (
            <Card>
              <CardHeader>
                <CardTitle>Connection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">CRM Type</label>
                    <p className="capitalize">{selectedConnection.crm_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Sync Direction</label>
                    <p className="capitalize">{selectedConnection.sync_direction}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Sync Frequency</label>
                    <p>{selectedConnection.sync_frequency_hours} hours</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Sync</label>
                    <p>{selectedConnection.last_sync_at ? new Date(selectedConnection.last_sync_at).toLocaleString() : 'Never'}</p>
                  </div>
                </div>
                {selectedConnection.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-600">{selectedConnection.error_message}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => handleValidateConnection(selectedConnection.id)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'mappings' && (
            <CRMFieldMappingInterface connection={selectedConnection} />
          )}

          {activeTab === 'sync' && (
            <CRMSyncConfiguration connection={selectedConnection} onUpdate={loadConnections} />
          )}

          {activeTab === 'logs' && (
            <CRMActivityLogs connectionId={selectedConnection.id} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM Connections</h2>
          <p className="text-muted-foreground">
            Connect your webinar data with popular CRM systems
          </p>
        </div>
        <Button onClick={() => setShowConnectionForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </Button>
      </div>

      {showConnectionForm && (
        <CRMConnectionForm
          onClose={() => setShowConnectionForm(false)}
          onSuccess={() => {
            setShowConnectionForm(false);
            loadConnections();
          }}
        />
      )}

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No CRM connections</h3>
              <p className="text-muted-foreground mb-4">
                Connect your first CRM to start syncing webinar data
              </p>
              <Button onClick={() => setShowConnectionForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold">{connection.connection_name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {connection.crm_type} • {connection.sync_direction} sync
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(connection.status)}
                    <Badge className={getStatusColor(connection.status)}>
                      {connection.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnection(connection);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConnection(connection.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {connection.last_sync_at && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
