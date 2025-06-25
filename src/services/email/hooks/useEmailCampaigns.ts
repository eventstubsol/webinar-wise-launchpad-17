
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmailCampaign } from "@/types/email";

export function useEmailCampaigns(userId: string) {
  const queryClient = useQueryClient();

  const getCampaigns = async (): Promise<EmailCampaign[]> => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    console.warn('useEmailCampaigns: email_campaigns table not implemented yet');
    
    // Return mock campaigns data since email_campaigns table doesn't exist
    const mockCampaigns: EmailCampaign[] = [
      {
        id: 'mock-campaign-1',
        user_id: userId,
        workflow_id: undefined,
        template_id: 'mock-template-1',
        campaign_type: 'registration',
        subject_template: 'Welcome to our platform!',
        audience_segment: { all_users: true },
        send_schedule: { immediate: true },
        status: 'draft',
        last_run_at: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    return mockCampaigns;
  };

  const { data: campaigns, refetch, isLoading, error } = useQuery({
    queryKey: ["email_campaigns", userId],
    queryFn: getCampaigns,
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (newCampaign: Partial<EmailCampaign>) => {
      if (!newCampaign.user_id) throw new Error("user_id required");
      if (!newCampaign.campaign_type) throw new Error("campaign_type required");
      if (!newCampaign.subject_template) throw new Error("subject_template required");
      if (!newCampaign.audience_segment) throw new Error("audience_segment required");
      if (!newCampaign.status) newCampaign.status = "draft";
      
      console.warn('useEmailCampaigns: email_campaigns table not implemented yet');
      
      // Return mock created campaign
      const mockCampaign: EmailCampaign = {
        id: `mock-campaign-${Date.now()}`,
        user_id: newCampaign.user_id,
        workflow_id: newCampaign.workflow_id,
        template_id: newCampaign.template_id || 'mock-template-1',
        campaign_type: newCampaign.campaign_type,
        subject_template: newCampaign.subject_template,
        audience_segment: newCampaign.audience_segment || {},
        send_schedule: newCampaign.send_schedule,
        status: newCampaign.status || "draft",
        last_run_at: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return mockCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_campaigns", userId] });
    },
    onError: (error) => {
      console.error("Campaign creation failed:", error);
    },
  });

  return {
    campaigns: campaigns || [],
    refetch,
    createCampaign: mutation.mutateAsync,
    isCampaignCreating: mutation.isPending,
    isLoading,
    error,
  };
}
