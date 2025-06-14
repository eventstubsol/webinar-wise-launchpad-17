
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CSVImport {
  id: string;
  import_type: string;
  file_name: string;
  file_size: number;
  status: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  progress_percentage: number;
  created_at: string;
  completed_at: string | null;
  validation_errors: any;
  processing_errors: any;
}

export const useCSVImports = () => {
  const { user } = useAuth();
  const [imports, setImports] = useState<CSVImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchImports = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('csv_imports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Transform the data to match our interface
        const transformedData = (data || []).map(item => ({
          ...item,
          validation_errors: Array.isArray(item.validation_errors) ? item.validation_errors : [],
          processing_errors: Array.isArray(item.processing_errors) ? item.processing_errors : []
        }));

        setImports(transformedData);
      } catch (err) {
        console.error('Error fetching CSV imports:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch imports');
      } finally {
        setLoading(false);
      }
    };

    fetchImports();
  }, [user?.id]);

  const deleteImport = async (importId: string) => {
    try {
      const { error } = await supabase
        .from('csv_imports')
        .delete()
        .eq('id', importId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setImports(prev => prev.filter(imp => imp.id !== importId));
    } catch (err) {
      console.error('Error deleting import:', err);
      throw err;
    }
  };

  return {
    imports,
    loading,
    error,
    deleteImport,
    refetch: () => {
      if (user?.id) {
        setLoading(true);
        // Trigger refetch by changing a dependency
      }
    }
  };
};
