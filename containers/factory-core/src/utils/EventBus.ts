/**
 * EventBus Adapter for NATS Integration
 * 
 * Provides backward compatibility with existing EventBus interface
 * while using NATS for actual messaging
 */

import { NATSEventBus, createNATSEventBus } from '../services/NATSEventBus.js';

export class EventBus {
  private natsEventBus: NATSEventBus;
  private subscriptions = new Map<string, any>();

  constructor(url: string) {
    // Parse URL to extract NATS configuration
    const servers = this.parseNATSUrl(url);
    
    this.natsEventBus = createNATSEventBus({
      servers,
      user: process.env.NATS_USER || 'factory',
      pass: process.env.NATS_PASS || 'factory-secret',
      namespace: 'meta-agent',
      jetstream: {
        domain: process.env.NATS_DOMAIN,
        timeout: 5000
      }
    });

    // Forward events
    this.natsEventBus.on('connected', () => console.log('EventBus connected to NATS'));
    this.natsEventBus.on('disconnected', () => console.log('EventBus disconnected from NATS'));
    this.natsEventBus.on('error', (error) => console.error('EventBus error:', error));
  }

  async connect(): Promise<void> {
    try {
      await this.natsEventBus.connect();
      console.log('EventBus successfully connected to NATS');
    } catch (error) {
      console.error('Failed to connect EventBus to NATS:', error);
      // Fallback to stub mode for local development
      console.warn('Running EventBus in stub mode');
    }
  }

  async subscribe(topic: string, handler: (message: any) => Promise<void>): Promise<void> {
    if (this.natsEventBus.isConnected()) {
      const subscription = await this.natsEventBus.subscribe(topic, handler);
      this.subscriptions.set(topic, subscription);
    } else {
      console.log(`[STUB] Subscribed to topic: ${topic}`);
    }
  }

  async publish(topic: string, data: any): Promise<void> {
    if (this.natsEventBus.isConnected()) {
      await this.natsEventBus.publish(topic, data);
    } else {
      console.log(`[STUB] Publishing to ${topic}:`, data);
    }
  }

  isConnected(): boolean {
    return this.natsEventBus.isConnected();
  }

  async disconnect(): Promise<void> {
    // Unsubscribe all
    for (const [topic, subscription] of this.subscriptions) {
      try {
        await subscription.unsubscribe();
      } catch (error) {
        console.error(`Failed to unsubscribe from ${topic}:`, error);
      }
    }
    this.subscriptions.clear();

    // Disconnect NATS
    await this.natsEventBus.disconnect();
  }

  private parseNATSUrl(url: string): string[] {
    // Handle various URL formats
    if (url.startsWith('nats://')) {
      return [url];
    } else if (url.includes(':')) {
      return [`nats://${url}`];
    } else {
      // Default to localhost
      return ['nats://localhost:4222'];
    }
  }
}