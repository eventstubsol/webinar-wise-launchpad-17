
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmailCampaign } from "@/types/email";

export function useEmailCampaigns(userId: string) {
  const queryClient = useQueryClient();

  const getCampaigns = async (): Promise<EmailCampaign[]> => {
    const { data, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as EmailCampaign[];
  };

  const { data: campaigns, refetch } = useQuery({
    queryKey: ["email_campaigns", userId],
    queryFn: getCampaigns,
  });

  const mutation = useMutation({
    mutationFn: async (newCampaign: Partial<EmailCampaign>) => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .insert(newCampaign)
        .single();
      if (error) throw error;
      return data as EmailCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_campaigns", userId] });
    },
  });

  return {
    campaigns: campaigns || [],
    refetch,
    createCampaign: mutation.mutateAsync,
    isCampaignCreating: mutation.isPending,
  };
}
