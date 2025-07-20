
export interface TestModeConfig {
  enabled: boolean;
  maxWebinars: number;
  enhancedLogging: boolean;
  dryRun: boolean;
  confirmationRequired: boolean;
}

export class TestModeManager {
  private static readonly DEFAULT_CONFIG: TestModeConfig = {
    enabled: false,
    maxWebinars: 1,
    enhancedLogging: true,
    dryRun: false,
    confirmationRequired: true
  };

  static validateTestModeOptions(options: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.testMode) {
      // Enforce test mode constraints
      if (options.maxWebinars && options.maxWebinars > (options.maxWebinarsInTest || 1)) {
        errors.push(`Test mode allows maximum ${options.maxWebinarsInTest || 1} webinar(s)`);
      }

      if (options.webinarIds && options.webinarIds.length > (options.maxWebinarsInTest || 1)) {
        errors.push(`Test mode: Too many webinars selected (max: ${options.maxWebinarsInTest || 1})`);
      }

      // Warning for production operations in test mode
      if (!options.dryRun) {
        console.warn('TEST MODE: Enabled without dry run - this will make actual database changes');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static prepareTestModeConfig(options: any): TestModeConfig {
    if (!options?.testMode) {
      return { ...this.DEFAULT_CONFIG, enabled: false };
    }

    return {
      enabled: true,
      maxWebinars: options.maxWebinarsInTest || 1,
      enhancedLogging: options.verboseLogging !== false,
      dryRun: options.dryRun || false,
      confirmationRequired: true
    };
  }

  static limitWebinarsForTestMode(webinars: any[], config: TestModeConfig): any[] {
    if (!config.enabled) {
      return webinars;
    }

    const limited = webinars.slice(0, config.maxWebinars);
    
    if (config.enhancedLogging) {
      console.log(`TEST MODE: Limited webinars from ${webinars.length} to ${limited.length}`);
      console.log('TEST MODE: Selected webinars:', limited.map(w => ({ id: w.id, title: w.topic })));
    }

    return limited;
  }

  static logTestModeOperation(operation: string, data: any, config: TestModeConfig): void {
    if (!config.enabled || !config.enhancedLogging) {
      return;
    }

    console.log(`TEST MODE - ${operation}:`, JSON.stringify(data, null, 2));
  }

  static shouldSkipDatabaseWrite(config: TestModeConfig): boolean {
    return config.enabled && config.dryRun;
  }
}
