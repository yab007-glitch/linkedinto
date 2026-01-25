import { format } from 'date-fns';

export interface TemplateVariable {
  key: string;
  value: string;
  format?: string;
}

export class TemplateProcessor {
  /**
   * Process template with variable substitution
   * Supports: {{variableName}}, {{date:format}}, {{time:format}}
   */
  static process(template: string, variables: Record<string, string>): string {
    let processed = template;

    // Replace date/time variables with formatting
    processed = this.processDateVariables(processed);

    // Replace custom variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, value);
    }

    return processed;
  }

  /**
   * Extract variable names from template
   */
  static extractVariables(template: string): string[] {
    const regex = /{{\\s*([^:}]+?)\\s*}}/g;
    const matches = template.matchAll(regex);
    const variables = new Set<string>();

    for (const match of matches) {
      const varName = match[1].trim();
      // Exclude date/time special variables
      if (!['date', 'time', 'datetime'].includes(varName)) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  /**
   * Validate template syntax
   */
  static validate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for unmatched brackets
    const openBrackets = (template.match(/{{/g) || []).length;
    const closeBrackets = (template.match(/}}/g) || []).length;
    
    if (openBrackets !== closeBrackets) {
      errors.push('Unmatched template brackets');
    }

    // Check for empty variable names
    if (/{{\\s*}}/.test(template)) {
      errors.push('Empty variable names not allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Process date/time special variables
   */
  private static processDateVariables(template: string): string {
    const now = new Date();
    
    // Replace {{date}} with current date
    template = template.replace(/{{\\s*date\\s*}}/g, format(now, 'yyyy-MM-dd'));
    
    // Replace {{date:format}} with formatted date
    template = template.replace(/{{\\s*date:([^}]+)\\s*}}/g, (_, fmt) => {
      try {
        return format(now, fmt.trim());
      } catch {
        return `{{date:${fmt}}}`;
      }
    });

    // Replace {{time}} with current time
    template = template.replace(/{{\\s*time\\s*}}/g, format(now, 'HH:mm:ss'));
    
    // Replace {{time:format}} with formatted time
    template = template.replace(/{{\\s*time:([^}]+)\\s*}}/g, (_, fmt) => {
      try {
        return format(now, fmt.trim());
      } catch {
        return `{{time:${fmt}}}`;
      }
    });

    // Replace {{datetime}} with current datetime
    template = template.replace(/{{\\s*datetime\\s*}}/g, format(now, 'yyyy-MM-dd HH:mm:ss'));

    return template;
  }

  /**
   * Generate preview with sample data
   */
  static preview(template: string, sampleVariables?: Record<string, string>): string {
    const variables = this.extractVariables(template);
    const samples: Record<string, string> = {
      company: 'Acme Corp',
      product: 'Product X',
      name: 'John Doe',
      title: 'CEO',
      industry: 'Technology',
      metric: '100%',
      year: new Date().getFullYear().toString(),
      ...sampleVariables,
    };

    // Use sample data for missing variables
    const data: Record<string, string> = {};
    for (const varName of variables) {
      data[varName] = samples[varName] || `[${varName}]`;
    }

    return this.process(template, data);
  }
}

/**
 * Built-in template library
 */
export const BUILT_IN_TEMPLATES = [
  {
    name: 'Product Launch',
    category: 'Announcement',
    content: `🚀 Exciting news! We're launching {{product}} today!

{{product}} helps {{targetAudience}} achieve {{benefit}}.

Key features:
✅ {{feature1}}
✅ {{feature2}}
✅ {{feature3}}

Learn more: {{link}}

#ProductLaunch #Innovation #{{industry}}`,
    variables: ['product', 'targetAudience', 'benefit', 'feature1', 'feature2', 'feature3', 'link', 'industry'],
  },
  {
    name: 'Thought Leadership',
    category: 'Insights',
    content: `💡 {{topic}} - My thoughts:

After {{years}} years in {{industry}}, I've learned that {{insight}}.

Here's what I've observed:

1. {{point1}}
2. {{point2}}
3. {{point3}}

What's your experience with this? Share your thoughts below! 👇

#ThoughtLeadership #{{industry}} #Leadership`,
    variables: ['topic', 'years', 'industry', 'insight', 'point1', 'point2', 'point3'],
  },
  {
    name: 'Achievement Celebration',
    category: 'Milestone',
    content: `🎉 Thrilled to share that {{achievement}}!

This milestone wouldn't have been possible without:
• {{contributor1}}
• {{contributor2}}
• {{contributor3}}

{{reflection}}

Here's to the next chapter! 🚀

#Milestone #Achievement #{{industry}}`,
    variables: ['achievement', 'contributor1', 'contributor2', 'contributor3', 'reflection', 'industry'],
  },
  {
    name: 'Event Invitation',
    category: 'Event',
    content: `📅 Join us for {{eventName}}!

📍 {{location}}
🗓️ {{date}}
⏰ {{time}}

What to expect:
→ {{highlight1}}
→ {{highlight2}}
→ {{highlight3}}

Register here: {{link}}

Limited spots available!

#Event #{{industry}} #Networking`,
    variables: ['eventName', 'location', 'date', 'time', 'highlight1', 'highlight2', 'highlight3', 'link', 'industry'],
  },
];