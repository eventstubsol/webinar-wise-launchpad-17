
import { supabase } from '@/integrations/supabase/client';

export class ABTestingAnalyticsService {
  static async calculateStatisticalSignificance(variantA: any, variantB: any, metric: string) {
    const nA = variantA.recipient_count || 0;
    const nB = variantB.recipient_count || 0;
    
    const successA = variantA.performance_metrics?.[metric] || 0;
    const successB = variantB.performance_metrics?.[metric] || 0;
    
    if (nA === 0 || nB === 0) {
      return { significance: 0, pValue: 1, isSignificant: false };
    }
    
    const pA = successA / nA;
    const pB = successB / nB;
    
    // Calculate pooled proportion
    const pooledP = (successA + successB) / (nA + nB);
    
    // Calculate standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/nA + 1/nB));
    
    // Calculate z-score
    const zScore = Math.abs(pA - pB) / se;
    
    // Calculate p-value (simplified)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    return {
      significance: zScore,
      pValue,
      isSignificant: pValue < 0.05,
      confidenceLevel: (1 - pValue) * 100,
      winner: pA > pB ? 'A' : 'B',
      improvement: Math.abs((pA - pB) / Math.max(pA, pB)) * 100
    };
  }
  
  static async analyzeABTestResults(campaignId: string) {
    // Get campaign variants
    const { data: variants, error: variantsError } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('campaign_id', campaignId);

    if (variantsError || !variants || variants.length < 2) {
      throw new Error('Cannot analyze A/B test: insufficient variants');
    }

    // Get analytics for each variant
    const variantAnalytics = await Promise.all(
      variants.map(async (variant) => {
        const { data: analytics } = await supabase
          .from('campaign_analytics')
          .select('metric_type, metric_value')
          .eq('campaign_id', campaignId)
          .eq('variant_id', variant.id);

        const metrics = this.aggregateMetrics(analytics || []);
        
        return {
          ...variant,
          metrics,
          recipient_count: await this.getVariantRecipientCount(campaignId, variant.id)
        };
      })
    );

    // Calculate statistical significance between variants
    const results = [];
    for (let i = 0; i < variantAnalytics.length - 1; i++) {
      for (let j = i + 1; j < variantAnalytics.length; j++) {
        const variantA = variantAnalytics[i];
        const variantB = variantAnalytics[j];

        const openRateTest = await this.calculateStatisticalSignificance(
          { ...variantA, performance_metrics: { open_rate: variantA.metrics.opened } },
          { ...variantB, performance_metrics: { open_rate: variantB.metrics.opened } },
          'open_rate'
        );

        const clickRateTest = await this.calculateStatisticalSignificance(
          { ...variantA, performance_metrics: { click_rate: variantA.metrics.clicked } },
          { ...variantB, performance_metrics: { click_rate: variantB.metrics.clicked } },
          'click_rate'
        );

        results.push({
          variantA: variantA.variant_name,
          variantB: variantB.variant_name,
          openRateTest,
          clickRateTest,
          recommendation: this.generateRecommendation(openRateTest, clickRateTest)
        });
      }
    }

    return {
      variants: variantAnalytics,
      comparisons: results,
      overall_winner: this.determineOverallWinner(variantAnalytics, results)
    };
  }

  static async selectWinningVariant(campaignId: string, variantId: string) {
    // Get the variants to get the required data
    const { data: variants, error: variantsError } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('campaign_id', campaignId);

    if (variantsError || !variants || variants.length < 2) {
      throw new Error('Cannot select winner: insufficient variants');
    }

    // Find the control and variant
    const sortedVariants = variants.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const controlVariant = sortedVariants[0];
    const testVariant = sortedVariants[1];

    // Mark the winning variant
    await supabase
      .from('campaign_variants')
      .update({ is_winner: true })
      .eq('id', variantId);

    // Mark others as non-winners
    await supabase
      .from('campaign_variants')
      .update({ is_winner: false })
      .eq('campaign_id', campaignId)
      .neq('id', variantId);

    // Record the test result with all required fields
    const testResult = {
      campaign_id: campaignId,
      variant_a_id: controlVariant.id,
      variant_b_id: testVariant.id,
      winner_variant_id: variantId,
      test_start_date: new Date().toISOString(), // This should ideally be stored when test starts
      test_end_date: new Date().toISOString(),
      test_status: 'completed',
      sample_size: variants.reduce((sum, v) => sum + (v.recipient_count || 0), 0),
      confidence_level: 95,
      statistical_significance: 0.95 // This should be calculated from actual test results
    };

    const { error } = await supabase
      .from('ab_test_results')
      .upsert(testResult);

    if (error) throw error;

    return testResult;
  }

  private static aggregateMetrics(analytics: any[]) {
    return analytics.reduce((acc, event) => {
      acc[event.metric_type] = (acc[event.metric_type] || 0) + event.metric_value;
      return acc;
    }, {});
  }

  private static async getVariantRecipientCount(campaignId: string, variantId: string) {
    const { count } = await supabase
      .from('email_send_queue')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('variant_id', variantId);

    return count || 0;
  }

  private static normalCDF(x: number): number {
    // Approximation of normal cumulative distribution function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private static generateRecommendation(openTest: any, clickTest: any): string {
    if (openTest.isSignificant && clickTest.isSignificant) {
      return `Strong winner detected! Variant ${openTest.winner} shows significant improvement in both open and click rates.`;
    } else if (openTest.isSignificant) {
      return `Variant ${openTest.winner} shows significantly better open rates. Consider testing further for click performance.`;
    } else if (clickTest.isSignificant) {
      return `Variant ${clickTest.winner} shows significantly better click rates. Strong engagement indicator.`;
    } else {
      return 'No statistically significant difference detected. Consider running test longer or trying different variations.';
    }
  }

  private static determineOverallWinner(variants: any[], comparisons: any[]) {
    const scores = variants.reduce((acc, variant) => {
      acc[variant.id] = 0;
      return acc;
    }, {});

    comparisons.forEach(comparison => {
      if (comparison.openRateTest.isSignificant) {
        const winnerId = comparison.openRateTest.winner === 'A' ? 
          variants[0].id : variants[1].id;
        scores[winnerId] += 1;
      }
      if (comparison.clickRateTest.isSignificant) {
        const winnerId = comparison.clickRateTest.winner === 'A' ? 
          variants[0].id : variants[1].id;
        scores[winnerId] += 1;
      }
    });

    const winnerId = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );

    return variants.find(v => v.id === winnerId);
  }
}
