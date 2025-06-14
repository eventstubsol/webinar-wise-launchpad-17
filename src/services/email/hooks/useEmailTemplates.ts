
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { EmailTemplate } from "@/types/email";

// Use "vanilla" client for compatibility with new DB tables
const supabase = createClient(
  (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL : "",
  (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_ANON_KEY : ""
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
      };
      const { data, error } = await supabase
        .from("email_templates")
        .insert(insertObj)
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
