
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmailTemplate } from "@/types/email";

export function useEmailTemplates(userId: string) {
  const queryClient = useQueryClient();

  const getTemplates = async (): Promise<EmailTemplate[]> => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as EmailTemplate[];
  };

  const { data: templates, refetch } = useQuery({
    queryKey: ["email_templates", userId],
    queryFn: getTemplates,
  });

  const mutation = useMutation({
    mutationFn: async (newTemplate: Partial<EmailTemplate>) => {
      const { data, error } = await supabase
        .from("email_templates")
        .insert(newTemplate)
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
