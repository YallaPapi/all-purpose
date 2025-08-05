"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const nats_1 = require("nats");
const events_1 = require("events");
class EventBus extends events_1.EventEmitter {
    constructor(natsUrl = 'nats://nats-broker:4222', credentials) {
        super();
        this.natsUrl = natsUrl;
        this.credentials = credentials;
        this.nc = null;
        this.js = null;
        this.jsm = null;
        this.jc = (0, nats_1.JSONCodec)();
        this.subscriptions = new Map();
        this.isConnected = false;
    }
    async connect() {
        try {
            this.nc = await (0, nats_1.connect)({
                servers: [this.natsUrl],
                user: this.credentials?.user || 'factory',
                pass: this.credentials?.pass || 'factory-secret',
                reconnect: true,
                maxReconnectAttempts: 10,
                reconnectTimeWait: 2000
            });
            this.js = this.nc.jetstream();
            this.jsm = await this.nc.jetstreamManager();
            // Create required JetStream streams before any consumers
            await this.ensureStreamsExist();
            this.isConnected = true;
            this.nc.closed().then(() => {
                this.isConnected = false;
                this.emit('disconnected');
            });
            this.emit('connected');
            console.log('✅ EventBus connected to NATS with streams initialized');
        }
        catch (error) {
            console.error('❌ EventBus connection failed:', error);
            throw error;
        }
    }
    /**
     * Ensure all required JetStream streams exist before creating consumers
     */
    async ensureStreamsExist() {
        if (!this.jsm) {
            throw new Error('JetStreamManager not initialized');
        }
        const streams = [
            {
                name: 'META_AGENT_EVENTS',
                config: {
                    name: 'META_AGENT_EVENTS',
                    subjects: ['meta.agent.>'],
                    storage: nats_1.StorageType.File,
                    retention: nats_1.RetentionPolicy.Limits,
                    max_consumers: 100,
                    max_msgs: 10000,
                    max_bytes: 100 * 1024 * 1024, // 100MB
                    max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
                    discard: nats_1.DiscardPolicy.Old,
                    duplicate_window: 120000000000 // 2 minutes in nanoseconds
                }
            },
            {
                name: 'DOMAIN_AGENT_EVENTS',
                config: {
                    name: 'DOMAIN_AGENT_EVENTS',
                    subjects: ['domain.>'],
                    storage: nats_1.StorageType.File,
                    retention: nats_1.RetentionPolicy.Limits,
                    max_consumers: 100,
                    max_msgs: 10000,
                    max_bytes: 100 * 1024 * 1024, // 100MB
                    max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
                    discard: nats_1.DiscardPolicy.Old,
                    duplicate_window: 120000000000 // 2 minutes in nanoseconds
                }
            },
            {
                name: 'FACTORY_COORDINATION',
                config: {
                    name: 'FACTORY_COORDINATION',
                    subjects: ['factory.>'],
                    storage: nats_1.StorageType.File,
                    retention: nats_1.RetentionPolicy.Limits,
                    max_consumers: 50,
                    max_msgs: 5000,
                    max_bytes: 50 * 1024 * 1024, // 50MB
                    max_age: 12 * 60 * 60 * 1000000000, // 12 hours in nanoseconds
                    discard: nats_1.DiscardPolicy.Old,
                    duplicate_window: 120000000000 // 2 minutes in nanoseconds
                }
            },
            {
                name: 'SYSTEM_METRICS',
                config: {
                    name: 'SYSTEM_METRICS',
                    subjects: ['metrics.>'],
                    storage: nats_1.StorageType.File,
                    retention: nats_1.RetentionPolicy.Limits,
                    max_consumers: 20,
                    max_msgs: 20000,
                    max_bytes: 200 * 1024 * 1024, // 200MB
                    max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
                    discard: nats_1.DiscardPolicy.Old,
                    duplicate_window: 300000000000 // 5 minutes in nanoseconds
                }
            }
        ];
        for (const stream of streams) {
            try {
                // Check if stream already exists
                await this.jsm.streams.info(stream.name);
                console.log(`✅ Stream ${stream.name} already exists`);
            }
            catch (error) {
                // Stream doesn't exist, create it
                try {
                    await this.jsm.streams.add(stream.config);
                    console.log(`✅ Created stream ${stream.name}`);
                }
                catch (createError) {
                    console.error(`❌ Failed to create stream ${stream.name}:`, createError);
                    throw createError;
                }
            }
        }
    }
    async disconnect() {
        if (this.nc) {
            // Close all subscriptions
            for (const [topic, messages] of this.subscriptions) {
                try {
                    messages.stop();
                }
                catch (error) {
                    console.warn(`Warning: Failed to stop consumer for ${topic}:`, error);
                }
            }
            this.subscriptions.clear();
            await this.nc.close();
            this.nc = null;
            this.js = null;
            this.jsm = null;
            this.isConnected = false;
            this.emit('disconnected');
            console.log('✅ EventBus disconnected from NATS');
        }
    }
    async publish(subject, data, options) {
        if (!this.js || !this.isConnected) {
            throw new Error('EventBus not connected');
        }
        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: subject,
            source: options?.source || 'unknown',
            timestamp: new Date().toISOString(),
            data,
            correlationId: options?.correlationId,
            replyTo: options?.replyTo
        };
        try {
            await this.js.publish(subject, this.jc.encode(message));
            this.emit('published', { subject, message });
        }
        catch (error) {
            console.error(`❌ Failed to publish to ${subject}:`, error);
            throw error;
        }
    }
    async subscribe(subject, handler, options) {
        if (!this.js || !this.jsm || !this.isConnected) {
            throw new Error('EventBus not connected');
        }
        try {
            // Determine stream based on subject
            let streamName = 'META_AGENT_EVENTS';
            if (subject.startsWith('meta.agent')) {
                streamName = 'META_AGENT_EVENTS';
            }
            else if (subject.startsWith('domain.')) {
                streamName = 'DOMAIN_AGENT_EVENTS';
            }
            else if (subject.startsWith('factory.')) {
                streamName = 'FACTORY_COORDINATION';
            }
            else if (subject.startsWith('metrics.')) {
                streamName = 'SYSTEM_METRICS';
            }
            // Create consumer configuration using proper NATS format
            const consumerName = options?.durable || `consumer-${subject.replace(/\./g, '-')}-${Date.now()}`;
            const consumerConfig = {
                durable_name: consumerName,
                deliver_policy: options?.deliverPolicy || nats_1.DeliverPolicy.All,
                ack_policy: nats_1.AckPolicy.Explicit,
                replay_policy: nats_1.ReplayPolicy.Instant,
                ack_wait: 30_000_000_000, // 30 seconds in nanoseconds
                max_deliver: 3,
                filter_subject: subject
            };
            
            // Ensure the stream exists before creating consumer
            try {
                await this.jsm.streams.info(streamName);
            }
            catch (streamError) {
                throw new Error(`Stream ${streamName} does not exist. Stream creation may have failed during initialization.`);
            }
            
            // Create the consumer first using JetStreamManager with proper nesting
            let consumerInfo;
            try {
                consumerInfo = await this.jsm.consumers.add(streamName, {
                    config: consumerConfig  // Nest config under 'config' property (NATS 2.29.3 requirement)
                });
                console.log(`✅ Created consumer ${consumerName} for stream ${streamName}`);
            } catch (consumerError) {
                if (consumerError.message?.includes('10014') || consumerError.message?.includes('consumer not found')) {
                    // Consumer might already exist, try to get info
                    try {
                        consumerInfo = await this.jsm.consumers.info(streamName, consumerName);
                        console.log(`ℹ️ Using existing consumer ${consumerName} for stream ${streamName}`);
                    } catch (infoError) {
                        throw new Error(`Failed to create or retrieve consumer ${consumerName}: ${consumerError.message}`);
                    }
                } else {
                    throw consumerError;
                }
            }
            
            // Now get the consumer for message processing
            // CRITICAL FIX: Use consumer name, not configuration object
            const consumer = await this.js.consumers.get(streamName, consumerName);
            // Start consuming messages with async iterator pattern (NATS 2.29.3 fix)
            const messages = await consumer.consume({
                max_messages: 100,
                expires: 30000
                // Remove callback parameter - use async iterator instead
            });
            
            // Process messages using async iterator pattern
            this.processMessagesAsync(messages, handler, subject);
            this.subscriptions.set(subject, messages);
            this.emit('subscribed', { subject, options });
            console.log(`✅ Subscribed to ${subject} on stream ${streamName}`);
        }
        catch (error) {
            console.error(`❌ Failed to subscribe to ${subject}:`, error);
            throw error;
        }
    }
    
    /**
     * Process messages using async iterator pattern (NATS 2.29.3 compatible)
     */
    async processMessagesAsync(messages, handler, subject) {
        (async () => {
            try {
                for await (const msg of messages) {
                    try {
                        const message = this.jc.decode(msg.data);
                        await handler(message);
                        msg.ack();
                        this.emit('messageProcessed', { subject, message });
                    } catch (error) {
                        console.error(`❌ Error processing message from ${subject}:`, error);
                        msg.nak();
                        this.emit('messageError', { subject, error });
                    }
                }
            } catch (iteratorError) {
                console.error(`❌ Message iterator error for ${subject}:`, iteratorError);
                this.emit('messageIteratorError', { subject, error: iteratorError });
            }
        })();
    }
    
    async unsubscribe(subject) {
        const messages = this.subscriptions.get(subject);
        if (messages) {
            messages.stop();
            this.subscriptions.delete(subject);
            this.emit('unsubscribed', { subject });
            console.log(`✅ Unsubscribed from ${subject}`);
        }
    }
    async request(subject, data, timeout = 30000, options) {
        if (!this.nc || !this.isConnected) {
            throw new Error('EventBus not connected');
        }
        const message = {
            id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: subject,
            source: options?.source || 'unknown',
            timestamp: new Date().toISOString(),
            data,
            correlationId: options?.correlationId
        };
        try {
            const response = await this.nc.request(subject, this.jc.encode(message), { timeout });
            const responseMessage = this.jc.decode(response.data);
            this.emit('responseReceived', { subject, request: message, response: responseMessage });
            return responseMessage;
        }
        catch (error) {
            console.error(`❌ Request to ${subject} failed:`, error);
            throw error;
        }
    }
    isConnected_() {
        return this.isConnected;
    }
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            subscriptions: Array.from(this.subscriptions.keys()),
            natsUrl: this.natsUrl
        };
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=EventBus.js.map