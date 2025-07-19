import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Star, 
  Settings, 
  Activity, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Users,
  Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { RenderConnectionService } from '@/services/zoom/RenderConnectionService';
import { ZoomConnection } from '@/types/zoom';

export const MultiAccountManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Fetch all user connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['zoom-connections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await ZoomConnectionService.getUserConnections(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Set primary connection mutation - fixed to use only connectionId
  const setPrimaryMutation = useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      const success = await ZoomConnectionService.setPrimaryConnection(connectionId);
      if (!success) throw new Error('Failed to set primary connection');
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-connections'] });
      toast({
        title: "Primary Account Updated",
        description: "The primary Zoom account has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const success = await ZoomConnectionService.deleteConnection(connectionId);
      if (!success) throw new Error('Failed to delete connection');
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-connections'] });
      toast({
        title: "Account Disconnected",
        description: "The Zoom account has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSetPrimary = (connectionId: string) => {
    setPrimaryMutation.mutate({ connectionId });
  };

  const handleDeleteConnection = (connectionId: string) => {
    if (confirm('Are you sure you want to disconnect this Zoom account?')) {
      deleteConnectionMutation.mutate(connectionId);
    }
  };

  const getConnectionStatus = (connection: ZoomConnection) => {
    if (connection.connection_status === 'active') {
      return { icon: CheckCircle, label: 'Active', color: 'text-green-500' };
    }
    return { icon: AlertTriangle, label: 'Issues', color: 'text-red-500' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading Zoom accounts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Zoom Account Management
            <Badge variant="secondary">{connections.length} account{connections.length !== 1 ? 's' : ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No Zoom accounts connected</p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect First Account
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {connections.map((connection) => {
                    const status = getConnectionStatus(connection);
                    const StatusIcon = status.icon;
                    
                    return (
                      <div
                        key={connection.id}
                        className={`p-4 border rounded-lg transition-all ${
                          selectedAccount === connection.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedAccount(connection.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {connection.is_primary && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{connection.zoom_email}</span>
                                <StatusIcon className={`h-4 w-4 ${status.color}`} />
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {connection.zoom_account_type} • Connected {new Date(connection.created_at!).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!connection.is_primary && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetPrimary(connection.id);
                                }}
                                disabled={setPrimaryMutation.isPending}
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Set Primary
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open settings for this connection
                              }}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConnection(connection.id);
                              }}
                              disabled={deleteConnectionMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {connection.is_primary && (
                          <div className="mt-2 text-xs text-blue-600 font-medium">
                            Primary Account - Used for automatic syncing
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Additional Account
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
