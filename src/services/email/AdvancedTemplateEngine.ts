import { EmailTemplate } from "@/types/email";

interface ConditionalBlock {
  condition: string;
  trueContent: string;
  falseContent?: string;
}

interface LoopBlock {
  arrayKey: string;
  template: string;
  itemKey?: string;
  indexKey?: string;
}

export class AdvancedTemplateEngine {
  static render(template: EmailTemplate, data: Record<string, any>): { html: string; subject: string } {
    let html = template.html_template;
    let subject = template.template_name;

    // Process loops first
    html = this.processLoops(html, data);
    
    // Process conditionals
    html = this.processConditionals(html, data);
    
    // Process standard merge tags
    html = this.processMergeTags(html, data);
    subject = this.processMergeTags(subject, data);

    // Process dynamic content recommendations
    html = this.processDynamicContent(html, data);

    return { html, subject };
  }

  private static processLoops(content: string, data: Record<string, any>): string {
    const loopRegex = /{{#each\s+(\w+)(?:\s+as\s+(\w+)(?:\s+with\s+index\s+(\w+))?)?}}([\s\S]*?){{\/each}}/g;
    
    return content.replace(loopRegex, (match, arrayKey, itemKey = 'item', indexKey = 'index', template) => {
      const array = data[arrayKey];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemContent = template;
        const loopData = {
          ...data,
          [itemKey]: item,
          [indexKey]: index
        };
        
        // Process nested merge tags within loop
        itemContent = this.processMergeTags(itemContent, loopData);
        
        return itemContent;
      }).join('');
    });
  }

  private static processConditionals(content: string, data: Record<string, any>): string {
    // Handle if/else conditionals
    const ifElseRegex = /{{#if\s+([^}]+)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g;
    
    return content.replace(ifElseRegex, (match, condition, trueContent, falseContent = '') => {
      const isTrue = this.evaluateCondition(condition, data);
      return isTrue ? trueContent : falseContent;
    });
  }

  private static evaluateCondition(condition: string, data: Record<string, any>): boolean {
    // Handle different types of conditions
    condition = condition.trim();
    
    // Simple existence check: {{#if variable}}
    if (!condition.includes(' ')) {
      const value = this.getNestedValue(data, condition);
      return this.isTruthy(value);
    }
    
    // Comparison operators
    const comparisonRegex = /^(.+?)\s*(==|!=|>|<|>=|<=)\s*(.+?)$/;
    const match = condition.match(comparisonRegex);
    
    if (match) {
      const [, left, operator, right] = match;
      const leftValue = this.getNestedValue(data, left.trim());
      const rightValue = this.parseValue(right.trim(), data);
      
      switch (operator) {
        case '==': return leftValue == rightValue;
        case '!=': return leftValue != rightValue;
        case '>': return Number(leftValue) > Number(rightValue);
        case '<': return Number(leftValue) < Number(rightValue);
        case '>=': return Number(leftValue) >= Number(rightValue);
        case '<=': return Number(leftValue) <= Number(rightValue);
        default: return false;
      }
    }
    
    // Logical operators
    if (condition.includes('&&')) {
      return condition.split('&&').every(cond => this.evaluateCondition(cond.trim(), data));
    }
    
    if (condition.includes('||')) {
      return condition.split('||').some(cond => this.evaluateCondition(cond.trim(), data));
    }
    
    return false;
  }

  private static processMergeTags(content: string, data: Record<string, any>): string {
    // Enhanced merge tag processing with filters
    const mergeTagRegex = /{{([^}]+)}}/g;
    
    return content.replace(mergeTagRegex, (match, expression) => {
      expression = expression.trim();
      
      // Check for filters: {{variable|filter}}
      const [variable, filter] = expression.split('|').map(s => s.trim());
      const value = this.getNestedValue(data, variable);
      
      if (filter) {
        return this.applyFilter(value, filter);
      }
      
      return String(value || '');
    });
  }

  private static processDynamicContent(content: string, data: Record<string, any>): string {
    // Process dynamic content recommendations
    const dynamicRegex = /{{#dynamic\s+([^}]+)}}([\s\S]*?){{\/dynamic}}/g;
    
    return content.replace(dynamicRegex, (match, type, fallbackContent) => {
      switch (type.trim()) {
        case 'product_recommendations':
          return this.generateProductRecommendations(data) || fallbackContent;
        case 'content_suggestions':
          return this.generateContentSuggestions(data) || fallbackContent;
        case 'personalized_greeting':
          return this.generatePersonalizedGreeting(data) || fallbackContent;
        default:
          return fallbackContent;
      }
    });
  }

  private static applyFilter(value: any, filter: string): string {
    switch (filter) {
      case 'upper':
        return String(value).toUpperCase();
      case 'lower':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'truncate':
        return String(value).length > 50 ? String(value).substring(0, 47) + '...' : String(value);
      default:
        return String(value);
    }
  }

  private static getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static parseValue(value: string, data: Record<string, any>): any {
    // If it's a quoted string, return the string without quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // If it's a number, return as number
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    
    // If it's a boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Otherwise, treat as variable reference
    return this.getNestedValue(data, value);
  }

  private static isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }

  private static generateProductRecommendations(data: Record<string, any>): string {
    const products = data.recommended_products;
    if (!Array.isArray(products) || products.length === 0) return '';
    
    return products.slice(0, 3).map(product => `
      <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px;">
        <h4>${product.name}</h4>
        <p>${product.description}</p>
        <a href="${product.url}" style="background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 3px;">
          View Product
        </a>
      </div>
    `).join('');
  }

  private static generateContentSuggestions(data: Record<string, any>): string {
    const suggestions = data.content_suggestions;
    if (!Array.isArray(suggestions) || suggestions.length === 0) return '';
    
    return suggestions.slice(0, 3).map(content => `
      <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
        <h4 style="margin: 0 0 10px 0;">${content.title}</h4>
        <p style="margin: 0 0 10px 0;">${content.excerpt}</p>
        <a href="${content.url}" style="color: #007bff; text-decoration: none;">Read More →</a>
      </div>
    `).join('');
  }

  private static generatePersonalizedGreeting(data: Record<string, any>): string {
    const timeOfDay = new Date().getHours();
    const name = data.first_name || data.name || '';
    
    let greeting = '';
    if (timeOfDay < 12) greeting = 'Good morning';
    else if (timeOfDay < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    return name ? `${greeting}, ${name}!` : `${greeting}!`;
  }

  // Advanced personalization features
  static generateBehavioralContent(userBehavior: Record<string, any>, contentPool: any[]): string {
    const interests = userBehavior.interests || [];
    const recentActivity = userBehavior.recent_activity || [];
    
    // Filter content based on user interests and behavior
    const relevantContent = contentPool.filter(content => 
      interests.some((interest: string) => content.tags?.includes(interest)) ||
      recentActivity.some((activity: any) => activity.category === content.category)
    );
    
    return relevantContent.slice(0, 3).map(content => `
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">${content.title}</h3>
        <p style="margin: 0 0 15px 0; color: #6b7280;">${content.description}</p>
        <a href="${content.url}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          ${content.cta_text || 'Learn More'}
        </a>
      </div>
    `).join('');
  }
}
