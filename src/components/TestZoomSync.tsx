import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function TestZoomSync() {
  const [isTestingSuggesting, setIsTestingSuggesting] = useState(false);
  const { toast } = useToast();

  const testEdgeFunction = useCallback(async () => {
    setIsTestingSuggesting(true);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get user's Zoom connection
      const { data: connections, error: connError } = await supabase
        .from('zoom_connections')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (connError || !connections?.length) {
        throw new Error("No Zoom connection found");
      }

      const connectionId = connections[0].id;
      console.log("Testing edge function with connection:", connectionId);

      // Create a sync log
      const { data: syncLog, error: syncError } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: connectionId,
          sync_type: 'test',
          sync_status: 'started',
          status: 'started',
          started_at: new Date().toISOString(),
          total_items: 0,
          processed_items: 0
        })
        .select()
        .single();

      if (syncError || !syncLog) {
        throw new Error("Failed to create sync log");
      }

      console.log("Created sync log:", syncLog.id);

      // Call the edge function directly
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars-v2', {
        body: {
          connectionId: connectionId,
          syncLogId: syncLog.id,
          syncMode: 'full',
          dateRange: {
            pastDays: 30,
            futureDays: 30
          },
          requestId: `test-${Date.now()}`
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("Edge function response:", data);

      toast({
        title: "Test Successful",
        description: `Edge function executed successfully. Sync ID: ${data?.syncId || syncLog.id}`,
      });

      // Check sync progress
      setTimeout(async () => {
        const { data: updatedLog } = await supabase
          .from('zoom_sync_logs')
          .select('*')
          .eq('id', syncLog.id)
          .single();

        console.log("Updated sync log:", updatedLog);
      }, 5000);

    } catch (error) {
      console.error("Test failed:", error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test edge function",
        variant: "destructive",
      });
    } finally {
      setIsTestingSuggesting(false);
    }
  }, [toast]);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-4">Test Zoom Sync Edge Function</h3>
      <Button
        onClick={testEdgeFunction}
        disabled={isTestingSuggesting}
      >
        {isTestingSuggesting ? "Testing..." : "Test Edge Function"}
      </Button>
    </div>
  );
}
