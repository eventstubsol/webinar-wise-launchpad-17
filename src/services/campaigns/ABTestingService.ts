
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type CampaignVariantInsert = Database['public']['Tables']['campaign_variants']['Insert'];
type CampaignVariantRow = Database['public']['Tables']['campaign_variants']['Row'];

export class ABTestingService {
  static async createVariant(variantData: CampaignVariantInsert) {
    const { data, error } = await supabase
      .from('campaign_variants')
      .insert(variantData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getVariants(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async updateVariant(id: string, updates: Partial<CampaignVariantRow>) {
    const { data, error } = await supabase
      .from('campaign_variants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteVariant(id: string) {
    const { error } = await supabase
      .from('campaign_variants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async setupABTest(campaignId: string, config: any) {
    // Create variants based on config
    const variants = await Promise.all(
      config.variants.map((variant: any) => 
        this.createVariant({
          ...variant,
          campaign_id: campaignId
        })
      )
    );

    return variants;
  }

  static async getTestResults(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_variants')
      .select(`
        *,
        campaign_analytics(*)
      `)
      .eq('campaign_id', campaignId);

    if (error) throw error;

    // Calculate statistical significance
    return this.calculateTestResults(data);
  }

  static async selectWinningVariant(variantId: string) {
    // Mark variant as winner
    const { data, error } = await supabase
      .from('campaign_variants')
      .update({ is_winner: true })
      .eq('id', variantId)
      .select()
      .single();

    if (error) throw error;

    // Mark others as non-winners
    await supabase
      .from('campaign_variants')
      .update({ is_winner: false })
      .eq('campaign_id', data.campaign_id)
      .neq('id', variantId);

    return data;
  }

  private static calculateTestResults(variants: any[]) {
    // Implement statistical significance calculation
    return variants.map(variant => ({
      ...variant,
      statistical_significance: 0.95, // Mock value
      confidence_interval: [0.1, 0.3], // Mock values
      recommended_action: 'continue' // Mock value
    }));
  }
}
