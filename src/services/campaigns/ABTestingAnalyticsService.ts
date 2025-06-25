
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
    console.warn('ABTestingAnalyticsService: campaign_variants and campaign_analytics tables not implemented yet');
    
    // Return mock data structure for now
    return {
      variants: [
        {
          id: 'variant-a',
          variant_name: 'Variant A',
          metrics: {
            opened: 100,
            clicked: 50,
            converted: 10
          },
          recipient_count: 500
        },
        {
          id: 'variant-b', 
          variant_name: 'Variant B',
          metrics: {
            opened: 120,
            clicked: 60,
            converted: 15
          },
          recipient_count: 500
        }
      ],
      comparisons: [
        {
          variantA: 'Variant A',
          variantB: 'Variant B',
          openRateTest: {
            isSignificant: true,
            pValue: 0.03,
            confidenceLevel: 97,
            winner: 'B',
            improvement: 20
          },
          clickRateTest: {
            isSignificant: true,
            pValue: 0.02,
            confidenceLevel: 98,
            winner: 'B',
            improvement: 20
          },
          recommendation: 'Variant B shows significantly better performance across all metrics.'
        }
      ],
      overall_winner: {
        id: 'variant-b',
        variant_name: 'Variant B'
      }
    };
  }

  static async selectWinningVariant(campaignId: string, variantId: string) {
    console.warn('ABTestingAnalyticsService: campaign_variants and ab_test_results tables not implemented yet');
    
    // Return mock test result
    const testResult = {
      campaign_id: campaignId,
      variant_a_id: 'variant-a',
      variant_b_id: 'variant-b',
      winner_variant_id: variantId,
      test_start_date: new Date().toISOString(),
      test_end_date: new Date().toISOString(),
      test_status: 'completed',
      sample_size: 1000,
      confidence_level: 95,
      statistical_significance: 0.95
    };

    return testResult;
  }

  private static aggregateMetrics(analytics: any[]) {
    return analytics.reduce((acc, event) => {
      acc[event.metric_type] = (acc[event.metric_type] || 0) + event.metric_value;
      return acc;
    }, {});
  }

  private static async getVariantRecipientCount(campaignId: string, variantId: string) {
    console.warn('ABTestingAnalyticsService: email_send_queue table not implemented yet');
    // Return mock count
    return 500;
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
