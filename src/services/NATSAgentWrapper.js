/**
 * NATS-Enabled Agent Wrapper
 *
 * Wraps existing meta-agents to enable NATS communication
 * for distributed coordination and task execution
 */
import { connect } from 'nats';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
export class NATSAgentWrapper extends EventEmitter {
    nc = null;
    logger;
    config;
    status = 'offline';
    subscriptions = [];
    heartbeatInterval = null;
    currentTask = null;
    wrappedAgent;
    constructor(config, wrappedAgent) {
        super();
        this.config = config;
        this.wrappedAgent = wrappedAgent;
        this.logger = new Logger(`NATSAgent-${config.id}`);
    }
    async connect() {
        try {
            this.logger.info(`Connecting to NATS at ${this.config.natsUrl || 'localhost:4222'}...`);
            this.nc = await connect({
                servers: this.config.natsUrl || 'nats://localhost:4222',
                user: this.config.natsUser || 'factory',
                pass: this.config.natsPass || 'factory-secret',
                name: this.config.id,
                reconnect: true,
                maxReconnectAttempts: -1,
                reconnectTimeWait: 1000
            });
            this.logger.info('Connected to NATS successfully');
            this.status = 'idle';
            // Set up connection event handlers
            this.setupConnectionHandlers();
            // Register agent
            await this.register();
            // Subscribe to agent-specific and broadcast topics
            await this.setupSubscriptions();
            // Start heartbeat
            this.startHeartbeat();
            this.emit('connected');
        }
        catch (error) {
            this.logger.error('Failed to connect to NATS:', error);
            throw error;
        }
    }
    setupConnectionHandlers() {
        if (!this.nc)
            return;
        // Handle connection events
        (async () => {
            for await (const status of this.nc.status()) {
                switch (status.type) {
                    case 'disconnect':
                        this.logger.warn('Disconnected from NATS');
                        this.status = 'offline';
                        this.emit('disconnected');
                        break;
                    case 'reconnect':
                        this.logger.info('Reconnected to NATS');
                        this.status = 'idle';
                        await this.register();
                        this.emit('reconnected');
                        break;
                    case 'error':
                        this.logger.error('NATS error:', status.data);
                        this.emit('error', status.data);
                        break;
                }
            }
        })();
    }
    async register() {
        if (!this.nc)
            return;
        const registration = {
            id: this.config.id,
            type: this.config.type,
            name: this.config.name,
            capabilities: this.config.capabilities,
            status: this.status,
            timestamp: new Date()
        };
        await this.nc.publish('agent.register', JSON.stringify(registration));
        this.logger.info(`Registered as ${this.config.type} agent`);
    }
    async setupSubscriptions() {
        if (!this.nc)
            return;
        // Subscribe to agent-specific tasks
        const taskSub = this.nc.subscribe(`agent.${this.config.id}.task`);
        this.subscriptions.push(taskSub);
        this.handleTaskSubscription(taskSub);
        // Subscribe to broadcast tasks for this agent type
        const typeSub = this.nc.subscribe(`agent.type.${this.config.type}.task`);
        this.subscriptions.push(typeSub);
        this.handleTaskSubscription(typeSub);
        // Subscribe to control messages
        const controlSub = this.nc.subscribe(`agent.${this.config.id}.control`);
        this.subscriptions.push(controlSub);
        this.handleControlSubscription(controlSub);
        // Subscribe to capability-based tasks
        for (const capability of this.config.capabilities) {
            const capSub = this.nc.subscribe(`agent.capability.${capability}.task`);
            this.subscriptions.push(capSub);
            this.handleTaskSubscription(capSub);
        }
        this.logger.info(`Subscribed to ${this.subscriptions.length} topics`);
    }
    async handleTaskSubscription(sub) {
        for await (const msg of sub) {
            try {
                const task = JSON.parse(msg.string());
                this.logger.info(`Received task: ${task.id} (${task.type})`);
                // Send acknowledgment if reply subject exists
                if (msg.reply) {
                    await msg.respond(JSON.stringify({
                        status: 'received',
                        agentId: this.config.id,
                        timestamp: new Date()
                    }));
                }
                // Execute task
                await this.executeTask(task);
            }
            catch (error) {
                this.logger.error('Error handling task:', error);
            }
        }
    }
    async handleControlSubscription(sub) {
        for await (const msg of sub) {
            try {
                const control = JSON.parse(msg.string());
                this.logger.info(`Received control message: ${control.command}`);
                switch (control.command) {
                    case 'status':
                        await msg.respond(JSON.stringify({
                            id: this.config.id,
                            status: this.status,
                            currentTask: this.currentTask?.id,
                            timestamp: new Date()
                        }));
                        break;
                    case 'stop':
                        if (this.currentTask) {
                            this.logger.warn('Stopping current task');
                            // Implement task cancellation if supported
                        }
                        break;
                    case 'shutdown':
                        await this.shutdown();
                        break;
                }
            }
            catch (error) {
                this.logger.error('Error handling control message:', error);
            }
        }
    }
    async executeTask(task) {
        if (this.status === 'busy') {
            this.logger.warn(`Agent busy, rejecting task ${task.id}`);
            await this.publishTaskResult({
                taskId: task.id,
                agentId: this.config.id,
                success: false,
                error: 'Agent is busy',
                executionTime: 0,
                timestamp: new Date()
            });
            return;
        }
        this.status = 'busy';
        this.currentTask = task;
        const startTime = Date.now();
        try {
            // Update status
            await this.publishStatus('task.started', {
                taskId: task.id,
                agentId: this.config.id,
                timestamp: new Date()
            });
            // Execute wrapped agent logic
            const result = await this.executeWrappedAgent(task);
            // Publish successful result
            await this.publishTaskResult({
                taskId: task.id,
                agentId: this.config.id,
                success: true,
                result,
                executionTime: Date.now() - startTime,
                timestamp: new Date()
            });
            this.logger.info(`Task ${task.id} completed successfully`);
        }
        catch (error) {
            this.logger.error(`Task ${task.id} failed:`, error);
            // Publish failure
            await this.publishTaskResult({
                taskId: task.id,
                agentId: this.config.id,
                success: false,
                error: error.message || 'Unknown error',
                executionTime: Date.now() - startTime,
                timestamp: new Date()
            });
        }
        finally {
            this.status = 'idle';
            this.currentTask = null;
        }
    }
    async executeWrappedAgent(task) {
        // This should be overridden by specific agent implementations
        // Default implementation tries common methods
        if (this.wrappedAgent.execute) {
            return await this.wrappedAgent.execute(task.payload);
        }
        else if (this.wrappedAgent.process) {
            return await this.wrappedAgent.process(task.payload);
        }
        else if (this.wrappedAgent.run) {
            return await this.wrappedAgent.run(task.payload);
        }
        else if (this.wrappedAgent.handle) {
            return await this.wrappedAgent.handle(task.payload);
        }
        else {
            throw new Error('Wrapped agent has no known execution method');
        }
    }
    async publishTaskResult(result) {
        if (!this.nc)
            return;
        const subject = result.success ? 'task.completed' : 'task.failed';
        await this.nc.publish(subject, JSON.stringify(result));
        // Also publish to workflow-specific topic if available
        if (this.currentTask?.workflowId) {
            await this.nc.publish(`workflow.${this.currentTask.workflowId}.result`, JSON.stringify(result));
        }
    }
    async publishStatus(event, data) {
        if (!this.nc)
            return;
        await this.nc.publish(event, JSON.stringify(data));
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(async () => {
            if (!this.nc || this.status === 'offline')
                return;
            await this.nc.publish('agent.heartbeat', JSON.stringify({
                id: this.config.id,
                type: this.config.type,
                status: this.status,
                currentTask: this.currentTask?.id,
                timestamp: new Date()
            }));
        }, 10000); // Every 10 seconds
    }
    async shutdown() {
        this.logger.info('Shutting down NATS agent...');
        // Stop heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        // Unsubscribe from all topics
        for (const sub of this.subscriptions) {
            sub.unsubscribe();
        }
        this.subscriptions = [];
        // Publish offline status
        if (this.nc) {
            await this.nc.publish('agent.offline', JSON.stringify({
                id: this.config.id,
                timestamp: new Date()
            }));
            // Drain connection
            await this.nc.drain();
            this.nc = null;
        }
        this.status = 'offline';
        this.emit('shutdown');
        this.logger.info('NATS agent shutdown complete');
    }
    getStatus() {
        return this.status;
    }
    getCurrentTask() {
        return this.currentTask;
    }
    isConnected() {
        return this.nc !== null && !this.nc.isClosed();
    }
}
//# sourceMappingURL=NATSAgentWrapper.js.map