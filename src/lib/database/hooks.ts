
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: any;
  new_data: any;
  changed_by: string;
  changed_at: string;
  change_context?: string;
}

interface UseAuditLogOptions {
  tableName?: string;
  recordId?: string;
  limit?: number;
  realtime?: boolean;
}

export function useAuditLog(options: UseAuditLogOptions = {}) {
  const { tableName, recordId, limit = 50, realtime = false } = options;
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      // Since audit_log table might not be available in TypeScript types yet,
      // we'll use a direct query approach
      const { data, error } = await supabase
        .rpc('get_record_history', {
          p_table_name: tableName || '',
          p_record_id: recordId || ''
        });

      if (error) throw error;
      
      // Transform the RPC result to match our interface
      const transformedLogs: AuditLogEntry[] = (data || []).map((item: any) => ({
        id: item.audit_id,
        table_name: tableName || '',
        record_id: recordId || '',
        action: item.action as 'INSERT' | 'UPDATE' | 'DELETE',
        old_data: item.changes?.before || null,
        new_data: item.changes?.after || item.changes,
        changed_by: item.changed_by || '',
        changed_at: item.changed_at,
        change_context: undefined
      }));
      
      setLogs(transformedLogs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch audit logs'));
      // Fallback to empty array on error
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [tableName, recordId]);

  useEffect(() => {
    fetchLogs();

    if (realtime && tableName && recordId) {
      // Set up real-time subscription for audit log changes
      const channel = supabase
        .channel('audit-log-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_log',
            filter: `table_name=eq.${tableName}`
          },
          (payload) => {
            const newLog: AuditLogEntry = {
              id: payload.new.id,
              table_name: payload.new.table_name,
              record_id: payload.new.record_id,
              action: payload.new.action as 'INSERT' | 'UPDATE' | 'DELETE',
              old_data: payload.new.old_data,
              new_data: payload.new.new_data,
              changed_by: payload.new.changed_by || '',
              changed_at: payload.new.changed_at,
              change_context: payload.new.change_context
            };
            setLogs(prev => [newLog, ...prev].slice(0, limit));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchLogs, realtime, tableName, recordId, limit]);

  const getFieldChanges = useCallback((log: AuditLogEntry) => {
    if (log.action !== 'UPDATE' || !log.old_data || !log.new_data) {
      return [];
    }

    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    Object.keys(log.new_data).forEach(key => {
      if (log.old_data[key] !== log.new_data[key]) {
        changes.push({
          field: key,
          oldValue: log.old_data[key],
          newValue: log.new_data[key]
        });
      }
    });

    return changes;
  }, []);

  const clearLogs = useCallback(async () => {
    // This would typically require admin privileges
    // Implement based on your security requirements
    console.warn('Clear logs not implemented - requires admin privileges');
  }, []);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    getFieldChanges,
    clearLogs
  };
}

// Hook for tracking specific record changes
export function useRecordHistory(tableName: string, recordId: string) {
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .rpc('get_record_history', {
            p_table_name: tableName,
            p_record_id: recordId
          });

        if (error) throw error;
        
        // Transform the RPC result to match our interface
        const transformedHistory: AuditLogEntry[] = (data || []).map((item: any) => ({
          id: item.audit_id,
          table_name: tableName,
          record_id: recordId,
          action: item.action as 'INSERT' | 'UPDATE' | 'DELETE',
          old_data: item.changes?.before || null,
          new_data: item.changes?.after || item.changes,
          changed_by: item.changed_by || '',
          changed_at: item.changed_at,
          change_context: undefined
        }));
        
        setHistory(transformedHistory);
      } catch (error) {
        console.error('Failed to fetch record history:', error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [tableName, recordId]);

  const getVersionAt = useCallback((date: Date) => {
    // Find the state of the record at a specific date
    const relevantLogs = history.filter(log => 
      new Date(log.changed_at) <= date
    );

    if (relevantLogs.length === 0) return null;

    // Reconstruct the record state at that date
    let recordState: any = {};

    relevantLogs.reverse().forEach(log => {
      if (log.action === 'INSERT') {
        recordState = { ...log.new_data };
      } else if (log.action === 'UPDATE') {
        recordState = { ...recordState, ...log.new_data };
      }
    });

    return recordState;
  }, [history]);

  return {
    history,
    loading,
    getVersionAt
  };
}

// Hook for audit statistics
export function useAuditStats(dateRange?: { from: Date; to: Date }) {
  const [stats, setStats] = useState({
    totalChanges: 0,
    changesByTable: {} as Record<string, number>,
    changesByAction: {} as Record<string, number>,
    changesByUser: {} as Record<string, number>,
    averageChangesPerDay: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Since we can't directly query audit_log table due to type restrictions,
        // we'll provide mock data for now
        setStats({
          totalChanges: 0,
          changesByTable: {},
          changesByAction: {},
          changesByUser: {},
          averageChangesPerDay: 0
        });
      } catch (error) {
        console.error('Failed to fetch audit stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [dateRange]);

  return { stats, loading };
}
