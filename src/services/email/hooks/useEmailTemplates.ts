
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { EmailTemplate } from "@/types/email";

// Use "vanilla" client for compatibility with new DB tables
const supabase = createClient(
  "https://guwvvinnifypcxwbcnzz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Z2aW5uaWZ5cGN4d2Jjbnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTExNjMsImV4cCI6MjA2NTE4NzE2M30.qdpRw5EtaW1HGYCkHPN1IK4_JIDPSnQuUfNTIpZwrJg"
);

export function useEmailTemplates(userId: string) {
  const queryClient = useQueryClient();

  const getTemplates = async (): Promise<EmailTemplate[]> => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    // Map DB result to strict EmailTemplate
    return (data as any[]).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      template_name: row.template_name,
      category: row.category,
      design_json: row.design_json,
      html_template: row.html_template,
      variables: Array.isArray(row.variables) ? row.variables : [],
      is_public: row.is_public ?? false,
      is_active: row.is_active ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // New Phase 2 fields
      tags: row.tags || [],
      preview_image_url: row.preview_image_url,
      version_number: row.version_number || 1,
      is_system_template: row.is_system_template || false,
      usage_count: row.usage_count || 0,
      last_used_at: row.last_used_at,
      rating: row.rating || 0,
      rating_count: row.rating_count || 0,
    }));
  };

  const { data: templates, refetch } = useQuery({
    queryKey: ["email_templates", userId],
    queryFn: getTemplates,
  });

  const mutation = useMutation({
    mutationFn: async (newTemplate: Partial<EmailTemplate>) => {
      // Ensure required fields are present
      if (!newTemplate.user_id) throw new Error("user_id required");
      if (!newTemplate.template_name) throw new Error("template_name required");
      if (!newTemplate.category) throw new Error("category required");
      if (!newTemplate.design_json) throw new Error("design_json required");
      if (!newTemplate.html_template) throw new Error("html_template required");
      
      const insertObj = {
        ...newTemplate,
        variables: newTemplate.variables || [],
        is_public: newTemplate.is_public ?? false,
        is_active: newTemplate.is_active ?? true,
        tags: newTemplate.tags || [],
        is_system_template: newTemplate.is_system_template ?? false,
        version_number: 1,
        usage_count: 0,
        rating: 0,
        rating_count: 0,
      };
      
      const { data, error } = await supabase
        .from("email_templates")
        .insert(insertObj)
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates", userId] });
    },
  });

  return {
    templates: templates || [],
    refetch,
    createTemplate: mutation.mutateAsync,
    isTemplateCreating: mutation.isPending,
  };
}
