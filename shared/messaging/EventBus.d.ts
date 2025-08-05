import { EventEmitter } from 'events';
export interface EventMessage {
    id: string;
    type: string;
    source: string;
    timestamp: string;
    data: any;
    correlationId?: string;
    replyTo?: string;
}
export interface EventHandler {
    (message: EventMessage): Promise<void> | void;
}
export declare class EventBus extends EventEmitter {
    private natsUrl;
    private credentials?;
    private nc;
    private js;
    private jsm;
    private jc;
    private subscriptions;
    private isConnected;
    constructor(natsUrl?: string, credentials?: {
        user: string;
        pass: string;
    });
    connect(): Promise<void>;
    /**
     * Ensure all required JetStream streams exist before creating consumers
     */
    private ensureStreamsExist;
    disconnect(): Promise<void>;
    publish(subject: string, data: any, options?: {
        correlationId?: string;
        replyTo?: string;
        source?: string;
    }): Promise<void>;
    subscribe(subject: string, handler: EventHandler, options?: {
        queue?: string;
        durable?: string;
        deliverPolicy?: 'all' | 'last' | 'new' | 'by_start_time' | 'by_start_sequence';
    }): Promise<void>;
    unsubscribe(subject: string): Promise<void>;
    request(subject: string, data: any, timeout?: number, options?: {
        correlationId?: string;
        source?: string;
    }): Promise<EventMessage>;
    isConnected_(): boolean;
    getConnectionStatus(): {
        connected: boolean;
        subscriptions: string[];
        natsUrl: string;
    };
}
//# sourceMappingURL=EventBus.d.ts.map