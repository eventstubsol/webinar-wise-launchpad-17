
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ZoomService } from '@/services/zoomService';
import { ZoomConnection, ZoomWebinar } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';

export const useZoom = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ZoomConnection[]>([]);
  const [primaryConnection, setPrimaryConnection] = useState<ZoomConnection | null>(null);
  const [webinars, setWebinars] = useState<ZoomWebinar[]>([]);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalWebinars: 0,
    totalRegistrants: 0,
    totalAttendees: 0,
    avgAttendanceRate: 0,
    hasActiveConnection: false,
    lastSyncAt: null as string | null
  });

  const fetchConnections = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const connectionsData = await ZoomService.getConnections(user.id);
      setConnections(connectionsData);
      
      const primary = connectionsData.find(c => c.is_primary) || null;
      setPrimaryConnection(primary);
    } catch (error) {
      console.error('Error fetching Zoom connections:', error);
      toast({
        title: "Error",
        description: "Failed to load Zoom connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWebinars = async () => {
    if (!user?.id) return;
    
    try {
      const webinarsData = await ZoomService.getWebinarsByUser(user.id);
      setWebinars(webinarsData);
    } catch (error) {
      console.error('Error fetching webinars:', error);
      toast({
        title: "Error",
        description: "Failed to load webinars",
        variant: "destructive",
      });
    }
  };

  const fetchDashboardStats = async () => {
    if (!user?.id) return;
    
    try {
      const stats = await ZoomService.getDashboardStats(user.id);
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const initiateZoomOAuth = () => {
    const state = crypto.randomUUID();
    sessionStorage.setItem('zoom_oauth_state', state);
    
    const oauthUrl = ZoomService.generateOAuthURL(state);
    window.location.href = oauthUrl;
  };

  const disconnectZoom = async (connectionId: string) => {
    try {
      await ZoomService.deleteConnection(connectionId);
      await fetchConnections();
      await fetchDashboardStats();
      
      toast({
        title: "Success",
        description: "Zoom account disconnected successfully",
      });
    } catch (error) {
      console.error('Error disconnecting Zoom:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Zoom account",
        variant: "destructive",
      });
    }
  };

  const refreshData = async () => {
    await Promise.all([
      fetchConnections(),
      fetchWebinars(),
      fetchDashboardStats()
    ]);
  };

  useEffect(() => {
    if (user) {
      fetchConnections();
      fetchWebinars();
      fetchDashboardStats();
    }
  }, [user]);

  return {
    connections,
    primaryConnection,
    webinars,
    dashboardStats,
    loading,
    initiateZoomOAuth,
    disconnectZoom,
    refreshData,
    fetchConnections,
    fetchWebinars,
    fetchDashboardStats
  };
};
