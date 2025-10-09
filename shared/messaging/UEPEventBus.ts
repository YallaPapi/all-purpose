import { EventBus, EventMessage, EventHandler } from './EventBus';
import axios from 'axios';

export interface UEPValidationConfig {
  enabled: boolean;
  uepServiceUrl: string;
  strictMode: boolean;
  bypassPatterns?: string[];
  timeout?: number;
}

export interface UEPEventValidationResult {
  isValid: boolean;
  normalizedData?: any;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  metadata?: {
    [key: string]: any;
  };
}

export interface UEPEnhancedEventMessage extends EventMessage {
  uepValidation?: {
    validated: boolean;
    complianceScore?: number;
    violationCount?: number;
    enforcementActions?: string[];
    validationResult?: UEPEventValidationResult;
  };
}

export class UEPEventBus extends EventBus {
  private uepConfig: UEPValidationConfig;

  constructor(
    natsUrl?: string,
    credentials?: { user: string; pass: string },
    uepConfig: UEPValidationConfig = {
      enabled: true,
      uepServiceUrl: 'http://uep-service:3003',
      strictMode: false,
      timeout: 5000
    }
  ) {
    super(natsUrl, credentials);
    this.uepConfig = uepConfig;
  }

  async publish(
    subject: string,
    data: any,
    options?: {
      correlationId?: string;
      replyTo?: string;
      source?: string;
      bypassUEP?: boolean;
    }
  ): Promise<void> {
    if (!this.uepConfig.enabled || options?.bypassUEP || this.shouldBypass(subject)) {
      return super.publish(subject, data, options);
    }

    try {
      // Validate with UEP before publishing
      const validationResult = await this.validateEvent(subject, data, options?.source || 'unknown');
      
      if (!validationResult.isValid && this.uepConfig.strictMode) {
        const error = new Error(`UEP validation failed for event ${subject}: ${validationResult.errors.map(e => e.message).join(', ')}`);
        this.emit('uepValidationFailed', { subject, data, validationResult, error });
        throw error;
      }

      // Use normalized data if available
      const publishData = validationResult.normalizedData || data;

      // Enhance the message with UEP validation metadata
      const enhancedMessage: UEPEnhancedEventMessage = {
        id: `uep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: subject,
        source: options?.source || 'unknown',
        timestamp: new Date().toISOString(),
        data: publishData,
        correlationId: options?.correlationId,
        replyTo: options?.replyTo,
        uepValidation: {
          validated: true,
          validationResult
        }
      };

      // Publish through the parent with enhanced message
      await this.publishDirect(subject, enhancedMessage, options);

      // Emit UEP-specific events
      if (!validationResult.isValid) {
        this.emit('uepValidationWarning', { subject, data, validationResult });
      } else {
        this.emit('uepValidationSuccess', { subject, data, validationResult });
      }

    } catch (error) {
      if (this.uepConfig.strictMode) {
        throw error;
      } else {
        console.warn(`UEP validation failed for ${subject}, publishing anyway:`, error);
        this.emit('uepValidationError', { subject, data, error });
        return super.publish(subject, data, options);
      }
    }
  }

  private async publishDirect(
    subject: string,
    message: UEPEnhancedEventMessage,
    options?: any
  ): Promise<void> {
    if (!this.js || !this.isConnected_()) {
      throw new Error('EventBus not connected');
    }

    try {
      await this.js.publish(subject, this.jc.encode(message));
      this.emit('published', { subject, message });
    } catch (error) {
      console.error(`❌ Failed to publish to ${subject}:`, error);
      throw error;
    }
  }

  async subscribe(
    subject: string,
    handler: EventHandler,
    options?: {
      queue?: string;
      durable?: string;
      deliverPolicy?: 'all' | 'last' | 'new' | 'by_start_time' | 'by_start_sequence';
      validateWithUEP?: boolean;
      bypassUEP?: boolean;
    }
  ): Promise<void> {
    const enhancedHandler: EventHandler = async (message: EventMessage) => {
      if (this.uepConfig.enabled && 
          options?.validateWithUEP !== false && 
          !options?.bypassUEP && 
          !this.shouldBypass(subject)) {
        
        try {
          // Validate incoming event with UEP
          const validationResult = await this.validateEvent(subject, message.data, message.source);
          
          // Enhance message with UEP validation info
          const enhancedMessage: UEPEnhancedEventMessage = {
            ...message,
            uepValidation: {
              validated: true,
              validationResult
            }
          };

          if (!validationResult.isValid && this.uepConfig.strictMode) {
            this.emit('uepSubscriptionValidationFailed', { subject, message, validationResult });
            return; // Skip processing invalid message in strict mode
          }

          await handler(enhancedMessage);

          if (!validationResult.isValid) {
            this.emit('uepSubscriptionValidationWarning', { subject, message, validationResult });
          }

        } catch (error) {
          if (this.uepConfig.strictMode) {
            this.emit('uepSubscriptionValidationError', { subject, message, error });
            return;
          } else {
            console.warn(`UEP validation failed for subscription ${subject}, processing anyway:`, error);
            await handler(message);
          }
        }
      } else {
        await handler(message);
      }
    };

    return super.subscribe(subject, enhancedHandler, options);
  }

  private async validateEvent(
    eventType: string,
    eventData: any,
    source: string
  ): Promise<UEPEventValidationResult> {
    try {
      const response = await axios.post(
        `${this.uepConfig.uepServiceUrl}/api/events/validate`,
        {
          eventType,
          eventData,
          source,
          timestamp: new Date().toISOString()
        },
        {
          timeout: this.uepConfig.timeout || 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-UEP-Client': 'EventBus'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.warn('UEP service unavailable, allowing event through');
          return {
            isValid: true,
            errors: [],
            warnings: [{ code: 'UEP_SERVICE_UNAVAILABLE', message: 'UEP service is unavailable' }],
            metadata: { serviceUnavailable: true }
          };
        }
      }
      
      throw new Error(`UEP validation failed: ${error.message}`);
    }
  }

  private shouldBypass(subject: string): boolean {
    if (!this.uepConfig.bypassPatterns) {
      return false;
    }

    return this.uepConfig.bypassPatterns.some(pattern => {
      // Simple glob-like pattern matching
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(subject);
      }
      return subject === pattern;
    });
  }

  // UEP-specific methods
  async enforceCompliance(
    request: any,
    context: any
  ): Promise<{
    allowed: boolean;
    violations: any[];
    actions: any[];
    metadata?: any;
  }> {
    try {
      const response = await axios.post(
        `${this.uepConfig.uepServiceUrl}/api/enforce`,
        { request, context },
        {
          timeout: this.uepConfig.timeout || 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-UEP-Client': 'EventBus'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`UEP enforcement failed: ${error.message}`);
    }
  }

  async wrapAgent(agentId: string, config?: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.uepConfig.uepServiceUrl}/api/agents/wrap`,
        { agentId, config },
        {
          timeout: this.uepConfig.timeout || 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-UEP-Client': 'EventBus'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`UEP agent wrapping failed: ${error.message}`);
    }
  }

  async getUEPMetrics(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.uepConfig.uepServiceUrl}/api/metrics`,
        {
          timeout: this.uepConfig.timeout || 5000,
          headers: {
            'X-UEP-Client': 'EventBus'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get UEP metrics: ${error.message}`);
    }
  }

  getUEPConfig(): UEPValidationConfig {
    return { ...this.uepConfig };
  }

  updateUEPConfig(config: Partial<UEPValidationConfig>): void {
    this.uepConfig = { ...this.uepConfig, ...config };
    this.emit('uepConfigUpdated', this.uepConfig);
  }

  // Override the parent's private property access
  private get js() {
    return (this as any).js;
  }

  private get jc() {
    return (this as any).jc;
  }
}