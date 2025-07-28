import { EventMessage } from './EventBus.js';

export interface StoredMessage extends EventMessage {
  streamPosition: number;
  redeliveryCount: number;
  storedAt: string;
  expiresAt?: string;
}

export interface MessageFilter {
  subject?: string;
  source?: string;
  correlationId?: string;
  fromTime?: string;
  toTime?: string;
  limit?: number;
  offset?: number;
}

export interface MessageStats {
  totalMessages: number;
  messagesPerStream: Record<string, number>;
  oldestMessage?: string;
  newestMessage?: string;
  storageSize: number;
}

export class MessagePersistence {
  private messages: Map<string, StoredMessage> = new Map();
  private messagesByStream: Map<string, Set<string>> = new Map();
  private messagesByCorrelationId: Map<string, Set<string>> = new Map();
  private maxMessages: number;
  private maxAge: number; // in milliseconds

  constructor(
    maxMessages: number = 100000,
    maxAge: number = 30 * 24 * 60 * 60 * 1000 // 30 days
  ) {
    this.maxMessages = maxMessages;
    this.maxAge = maxAge;

    // Cleanup expired messages every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  store(message: EventMessage, streamName: string): StoredMessage {
    const storedMessage: StoredMessage = {
      ...message,
      streamPosition: this.getNextPosition(streamName),
      redeliveryCount: 0,
      storedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.maxAge).toISOString()
    };

    // Store message
    this.messages.set(message.id, storedMessage);

    // Index by stream
    if (!this.messagesByStream.has(streamName)) {
      this.messagesByStream.set(streamName, new Set());
    }
    this.messagesByStream.get(streamName)!.add(message.id);

    // Index by correlation ID if present
    if (message.correlationId) {
      if (!this.messagesByCorrelationId.has(message.correlationId)) {
        this.messagesByCorrelationId.set(message.correlationId, new Set());
      }
      this.messagesByCorrelationId.get(message.correlationId)!.add(message.id);
    }

    // Cleanup if we exceed max messages
    if (this.messages.size > this.maxMessages) {
      this.cleanup();
    }

    return storedMessage;
  }

  retrieve(messageId: string): StoredMessage | null {
    return this.messages.get(messageId) || null;
  }

  query(filter: MessageFilter): StoredMessage[] {
    let results: StoredMessage[] = Array.from(this.messages.values());

    // Apply filters
    if (filter.subject) {
      results = results.filter(msg => msg.type === filter.subject);
    }

    if (filter.source) {
      results = results.filter(msg => msg.source === filter.source);
    }

    if (filter.correlationId) {
      const messageIds = this.messagesByCorrelationId.get(filter.correlationId);
      if (!messageIds) return [];
      results = results.filter(msg => messageIds.has(msg.id));
    }

    if (filter.fromTime) {
      const fromDate = new Date(filter.fromTime);
      results = results.filter(msg => new Date(msg.timestamp) >= fromDate);
    }

    if (filter.toTime) {
      const toDate = new Date(filter.toTime);
      results = results.filter(msg => new Date(msg.timestamp) <= toDate);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    
    return results.slice(offset, offset + limit);
  }

  getMessagesByStream(streamName: string, limit: number = 100): StoredMessage[] {
    const messageIds = this.messagesByStream.get(streamName);
    if (!messageIds) return [];

    const messages = Array.from(messageIds)
      .map(id => this.messages.get(id)!)
      .filter(msg => msg) // Remove any null/undefined
      .sort((a, b) => b.streamPosition - a.streamPosition)
      .slice(0, limit);

    return messages;
  }

  getMessagesByCorrelationId(correlationId: string): StoredMessage[] {
    const messageIds = this.messagesByCorrelationId.get(correlationId);
    if (!messageIds) return [];

    return Array.from(messageIds)
      .map(id => this.messages.get(id)!)
      .filter(msg => msg)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  replay(
    streamName: string,
    fromPosition?: number,
    toPosition?: number
  ): StoredMessage[] {
    const messages = this.getMessagesByStream(streamName, Number.MAX_SAFE_INTEGER);
    
    let filtered = messages;
    
    if (fromPosition !== undefined) {
      filtered = filtered.filter(msg => msg.streamPosition >= fromPosition);
    }
    
    if (toPosition !== undefined) {
      filtered = filtered.filter(msg => msg.streamPosition <= toPosition);
    }

    return filtered.sort((a, b) => a.streamPosition - b.streamPosition);
  }

  incrementRedeliveryCount(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.redeliveryCount++;
    }
  }

  getStats(): MessageStats {
    const messages = Array.from(this.messages.values());
    const streamCounts: Record<string, number> = {};

    // Count messages per stream
    for (const [streamName, messageIds] of this.messagesByStream) {
      streamCounts[streamName] = messageIds.size;
    }

    // Find oldest and newest messages
    const sortedByTime = messages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      totalMessages: this.messages.size,
      messagesPerStream: streamCounts,
      oldestMessage: sortedByTime[0]?.timestamp,
      newestMessage: sortedByTime[sortedByTime.length - 1]?.timestamp,
      storageSize: this.estimateStorageSize()
    };
  }

  private getNextPosition(streamName: string): number {
    const messageIds = this.messagesByStream.get(streamName);
    if (!messageIds || messageIds.size === 0) return 1;

    const messages = Array.from(messageIds)
      .map(id => this.messages.get(id)!)
      .filter(msg => msg);

    const maxPosition = Math.max(...messages.map(msg => msg.streamPosition));
    return maxPosition + 1;
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    // Find expired messages
    for (const [messageId, message] of this.messages) {
      if (message.expiresAt && new Date(message.expiresAt).getTime() < now) {
        toDelete.push(messageId);
      }
    }

    // If still too many messages, delete oldest ones
    if (this.messages.size - toDelete.length > this.maxMessages) {
      const allMessages = Array.from(this.messages.values())
        .filter(msg => !toDelete.includes(msg.id))
        .sort((a, b) => new Date(a.storedAt).getTime() - new Date(b.storedAt).getTime());
      
      const excessCount = this.messages.size - toDelete.length - this.maxMessages;
      const oldestMessages = allMessages.slice(0, excessCount);
      
      toDelete.push(...oldestMessages.map(msg => msg.id));
    }

    // Delete messages and update indexes
    for (const messageId of toDelete) {
      const message = this.messages.get(messageId);
      if (message) {
        this.messages.delete(messageId);

        // Remove from stream index
        for (const [streamName, messageIds] of this.messagesByStream) {
          messageIds.delete(messageId);
          if (messageIds.size === 0) {
            this.messagesByStream.delete(streamName);
          }
        }

        // Remove from correlation index
        if (message.correlationId) {
          const correlationSet = this.messagesByCorrelationId.get(message.correlationId);
          if (correlationSet) {
            correlationSet.delete(messageId);
            if (correlationSet.size === 0) {
              this.messagesByCorrelationId.delete(message.correlationId);
            }
          }
        }
      }
    }

    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} expired/excess messages`);
    }
  }

  private estimateStorageSize(): number {
    // Rough estimate of memory usage in bytes
    let size = 0;
    for (const message of this.messages.values()) {
      size += JSON.stringify(message).length * 2; // Rough Unicode character size
    }
    return size;
  }

  // Export methods for backup/restore
  export(): { messages: StoredMessage[], metadata: any } {
    return {
      messages: Array.from(this.messages.values()),
      metadata: {
        exportedAt: new Date().toISOString(),
        totalMessages: this.messages.size,
        streams: Array.from(this.messagesByStream.keys())
      }
    };
  }

  import(data: { messages: StoredMessage[], metadata: any }): void {
    // Clear existing data
    this.messages.clear();
    this.messagesByStream.clear();
    this.messagesByCorrelationId.clear();

    // Import messages
    for (const message of data.messages) {
      this.messages.set(message.id, message);

      // Rebuild indexes - determine stream from message type
      let streamName = 'META_AGENT_EVENTS';
      if (message.type.startsWith('domain.')) {
        streamName = 'DOMAIN_AGENT_EVENTS';
      } else if (message.type.startsWith('factory.')) {
        streamName = 'FACTORY_COORDINATION';
      } else if (message.type.startsWith('metrics.')) {
        streamName = 'SYSTEM_METRICS';
      }

      if (!this.messagesByStream.has(streamName)) {
        this.messagesByStream.set(streamName, new Set());
      }
      this.messagesByStream.get(streamName)!.add(message.id);

      if (message.correlationId) {
        if (!this.messagesByCorrelationId.has(message.correlationId)) {
          this.messagesByCorrelationId.set(message.correlationId, new Set());
        }
        this.messagesByCorrelationId.get(message.correlationId)!.add(message.id);
      }
    }

    console.log(`📥 Imported ${data.messages.length} messages from backup`);
  }
}