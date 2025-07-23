"use strict";
/**
 * Meta-Agent Coordination System
 *
 * Use context7: Shared knowledge base and coordination for meta-agents
 * Following All-Purpose Pattern: Configurable for ANY agent types and coordination patterns
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAgentCoordinator = void 0;
exports.createMetaAgentCoordinator = createMetaAgentCoordinator;
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
/**
 * Meta-Agent Coordination System
 * Manages agent registration, shared knowledge, and task coordination
 */
class MetaAgentCoordinator extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.registeredAgents = new Map();
        this.sharedKnowledge = new Map();
        this.coordinationTasks = new Map();
        this.activeHeartbeats = new Map();
        this.coordinatorRunning = false;
        this.config = {
            coordinatorId: `coordinator-${(0, uuid_1.v4)().substring(0, 8)}`,
            knowledgeBasePath: path_1.default.join(process.cwd(), '.rag-cache', 'meta-agent-knowledge.json'),
            agentRegistryPath: path_1.default.join(process.cwd(), '.rag-cache', 'agent-registry.json'),
            maxConcurrentTasks: 5,
            taskTimeoutMs: 300000, // 5 minutes
            heartbeatIntervalMs: 30000, // 30 seconds
            knowledgeRetentionDays: 30,
            enableAutoCoordination: true,
            ...config
        };
        logger_1.processingLogger.info('Meta-Agent Coordinator initialized', {
            coordinatorId: this.config.coordinatorId,
            maxConcurrentTasks: this.config.maxConcurrentTasks,
            autoCoordination: this.config.enableAutoCoordination
        });
    }
    /**
     * Start the coordination system
     */
    async start() {
        if (this.coordinatorRunning) {
            logger_1.processingLogger.warn('Meta-Agent Coordinator is already running');
            return;
        }
        try {
            // Load existing state
            await this.loadState();
            // Clean up stale agents and knowledge
            await this.performMaintenance();
            this.coordinatorRunning = true;
            logger_1.processingLogger.info('Meta-Agent Coordinator started successfully');
            this.emit('coordinatorStarted', { coordinatorId: this.config.coordinatorId });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to start Meta-Agent Coordinator', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Stop the coordination system
     */
    async stop() {
        if (!this.coordinatorRunning) {
            return;
        }
        try {
            // Clear heartbeat timers
            for (const timer of this.activeHeartbeats.values()) {
                clearTimeout(timer);
            }
            this.activeHeartbeats.clear();
            // Save current state
            await this.saveState();
            this.coordinatorRunning = false;
            logger_1.processingLogger.info('Meta-Agent Coordinator stopped');
            this.emit('coordinatorStopped', { coordinatorId: this.config.coordinatorId });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to stop Meta-Agent Coordinator', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Register a meta-agent in the coordination system
     */
    async registerAgent(registration) {
        const agentRegistration = {
            ...registration,
            lastSeen: new Date()
        };
        this.registeredAgents.set(registration.agentId, agentRegistration);
        // Set up heartbeat monitoring
        this.setupHeartbeatMonitoring(registration.agentId);
        logger_1.processingLogger.info('Meta-agent registered', {
            agentId: registration.agentId,
            agentName: registration.agentName,
            agentType: registration.agentType,
            capabilities: registration.capabilities.length
        });
        this.emit('agentRegistered', agentRegistration);
        // Auto-coordination: Check for available tasks
        if (this.config.enableAutoCoordination) {
            await this.assignAvailableTasks(registration.agentId);
        }
        await this.saveState();
        return registration.agentId;
    }
    /**
     * Unregister a meta-agent
     */
    async unregisterAgent(agentId) {
        const agent = this.registeredAgents.get(agentId);
        if (!agent) {
            logger_1.processingLogger.warn('Attempted to unregister unknown agent', { agentId });
            return;
        }
        // Clear heartbeat
        const heartbeat = this.activeHeartbeats.get(agentId);
        if (heartbeat) {
            clearTimeout(heartbeat);
            this.activeHeartbeats.delete(agentId);
        }
        // Cancel assigned tasks
        await this.cancelAgentTasks(agentId);
        this.registeredAgents.delete(agentId);
        logger_1.processingLogger.info('Meta-agent unregistered', {
            agentId,
            agentName: agent.agentName
        });
        this.emit('agentUnregistered', { agentId, agent });
        await this.saveState();
    }
    /**
     * Update agent status and heartbeat
     */
    async updateAgentStatus(agentId, status, metadata) {
        const agent = this.registeredAgents.get(agentId);
        if (!agent) {
            logger_1.processingLogger.warn('Attempted to update status for unknown agent', { agentId });
            return;
        }
        agent.status = status;
        agent.lastSeen = new Date();
        if (metadata) {
            agent.metadata = { ...agent.metadata, ...metadata };
        }
        logger_1.processingLogger.debug('Agent status updated', {
            agentId,
            status,
            lastSeen: agent.lastSeen
        });
        this.emit('agentStatusUpdated', { agentId, status, agent });
        // Auto-coordination: Assign tasks if agent becomes idle
        if (status === 'idle' && this.config.enableAutoCoordination) {
            await this.assignAvailableTasks(agentId);
        }
    }
    /**
     * Share knowledge in the coordination system
     */
    async shareKnowledge(knowledge) {
        const knowledgeEntry = {
            id: (0, uuid_1.v4)(),
            createdAt: new Date(),
            lastUpdated: new Date(),
            ...knowledge
        };
        this.sharedKnowledge.set(knowledgeEntry.id, knowledgeEntry);
        logger_1.processingLogger.info('Knowledge shared', {
            knowledgeId: knowledgeEntry.id,
            sourceAgent: knowledge.sourceAgentId,
            knowledgeType: knowledge.knowledgeType,
            title: knowledge.title,
            relevantAgents: knowledge.relevantAgents.length
        });
        this.emit('knowledgeShared', knowledgeEntry);
        // Notify relevant agents
        await this.notifyRelevantAgents(knowledgeEntry);
        await this.saveState();
        return knowledgeEntry.id;
    }
    /**
     * Query shared knowledge
     */
    queryKnowledge(filters = {}) {
        let results = Array.from(this.sharedKnowledge.values());
        // Apply filters
        if (filters.agentId) {
            const agentId = filters.agentId;
            results = results.filter(k => k.sourceAgentId === agentId || k.relevantAgents.includes(agentId));
        }
        if (filters.knowledgeType) {
            results = results.filter(k => k.knowledgeType === filters.knowledgeType);
        }
        if (filters.tags?.length) {
            results = results.filter(k => filters.tags.some(tag => k.tags.includes(tag)));
        }
        if (filters.minConfidence !== undefined) {
            results = results.filter(k => k.confidence >= filters.minConfidence);
        }
        // Sort by relevance (confidence * recency)
        results.sort((a, b) => {
            const aScore = a.confidence * (Date.now() - a.lastUpdated.getTime());
            const bScore = b.confidence * (Date.now() - b.lastUpdated.getTime());
            return bScore - aScore;
        });
        // Apply limit
        if (filters.limit) {
            results = results.slice(0, filters.limit);
        }
        return results;
    }
    /**
     * Create a coordination task
     */
    async createTask(task) {
        const coordinationTask = {
            taskId: (0, uuid_1.v4)(),
            status: 'pending',
            createdAt: new Date(),
            lastUpdated: new Date(),
            ...task
        };
        this.coordinationTasks.set(coordinationTask.taskId, coordinationTask);
        logger_1.processingLogger.info('Coordination task created', {
            taskId: coordinationTask.taskId,
            taskType: task.taskType,
            requestingAgent: task.requestingAgentId,
            priority: task.priority
        });
        this.emit('taskCreated', coordinationTask);
        // Auto-assign if enabled
        if (this.config.enableAutoCoordination) {
            await this.autoAssignTask(coordinationTask.taskId);
        }
        await this.saveState();
        return coordinationTask.taskId;
    }
    /**
     * Update task status and result
     */
    async updateTask(taskId, updates) {
        const task = this.coordinationTasks.get(taskId);
        if (!task) {
            logger_1.processingLogger.warn('Attempted to update unknown task', { taskId });
            return;
        }
        Object.assign(task, updates, { lastUpdated: new Date() });
        logger_1.processingLogger.info('Coordination task updated', {
            taskId,
            status: task.status,
            assignedAgent: task.assignedAgentId
        });
        this.emit('taskUpdated', task);
        // If task completed successfully, extract knowledge
        if (task.status === 'completed' && task.result) {
            await this.extractKnowledgeFromTask(task);
        }
        await this.saveState();
    }
    /**
     * Get available tasks for an agent
     */
    getAvailableTasks(agentId, limit = 10) {
        const agent = this.registeredAgents.get(agentId);
        if (!agent) {
            return [];
        }
        return Array.from(this.coordinationTasks.values())
            .filter(task => task.status === 'pending' &&
            this.canAgentHandleTask(agent, task))
            .sort((a, b) => {
            // Sort by priority and creation time
            const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
            const aPriority = priorityMap[a.priority];
            const bPriority = priorityMap[b.priority];
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            return a.createdAt.getTime() - b.createdAt.getTime();
        })
            .slice(0, limit);
    }
    /**
     * Get coordination statistics
     */
    getCoordinationStats() {
        const agents = Array.from(this.registeredAgents.values());
        const tasks = Array.from(this.coordinationTasks.values());
        const knowledge = Array.from(this.sharedKnowledge.values());
        return {
            agents: {
                total: agents.length,
                online: agents.filter(a => a.status !== 'offline').length,
                working: agents.filter(a => a.status === 'working').length,
                idle: agents.filter(a => a.status === 'idle').length,
                byType: this.groupBy(agents, 'agentType')
            },
            tasks: {
                total: tasks.length,
                pending: tasks.filter(t => t.status === 'pending').length,
                assigned: tasks.filter(t => t.status === 'assigned').length,
                inProgress: tasks.filter(t => t.status === 'in_progress').length,
                completed: tasks.filter(t => t.status === 'completed').length,
                failed: tasks.filter(t => t.status === 'failed').length,
                byType: this.groupBy(tasks, 'taskType'),
                byPriority: this.groupBy(tasks, 'priority')
            },
            knowledge: {
                total: knowledge.length,
                byType: this.groupBy(knowledge, 'knowledgeType'),
                byAgent: this.groupBy(knowledge, 'sourceAgentId'),
                avgConfidence: knowledge.length > 0 ?
                    knowledge.reduce((sum, k) => sum + k.confidence, 0) / knowledge.length : 0
            }
        };
    }
    /**
     * Setup heartbeat monitoring for an agent
     */
    setupHeartbeatMonitoring(agentId) {
        // Clear existing heartbeat
        const existingHeartbeat = this.activeHeartbeats.get(agentId);
        if (existingHeartbeat) {
            clearTimeout(existingHeartbeat);
        }
        // Set up new heartbeat timer
        const heartbeatTimer = setTimeout(() => {
            this.handleMissedHeartbeat(agentId);
        }, this.config.heartbeatIntervalMs * 2); // Allow 2x interval before considering offline
        this.activeHeartbeats.set(agentId, heartbeatTimer);
    }
    /**
     * Handle missed heartbeat (agent goes offline)
     */
    async handleMissedHeartbeat(agentId) {
        const agent = this.registeredAgents.get(agentId);
        if (!agent) {
            return;
        }
        logger_1.processingLogger.warn('Agent missed heartbeat, marking as offline', {
            agentId,
            agentName: agent.agentName,
            lastSeen: agent.lastSeen
        });
        // Update agent status
        agent.status = 'offline';
        // Cancel assigned tasks
        await this.cancelAgentTasks(agentId);
        this.emit('agentOffline', { agentId, agent });
    }
    /**
     * Cancel tasks assigned to an agent
     */
    async cancelAgentTasks(agentId) {
        const tasksToCancel = Array.from(this.coordinationTasks.values())
            .filter(task => task.assignedAgentId === agentId &&
            ['assigned', 'in_progress'].includes(task.status));
        for (const task of tasksToCancel) {
            await this.updateTask(task.taskId, {
                status: 'cancelled',
                error: 'Agent went offline'
            });
        }
        if (tasksToCancel.length > 0) {
            logger_1.processingLogger.info('Cancelled tasks for offline agent', {
                agentId,
                cancelledTasks: tasksToCancel.length
            });
        }
    }
    /**
     * Auto-assign available tasks to an agent
     */
    async assignAvailableTasks(agentId) {
        const availableTasks = this.getAvailableTasks(agentId, 1);
        for (const task of availableTasks) {
            await this.updateTask(task.taskId, {
                status: 'assigned',
                assignedAgentId: agentId
            });
            logger_1.processingLogger.info('Task auto-assigned', {
                taskId: task.taskId,
                agentId,
                taskType: task.taskType
            });
        }
    }
    /**
     * Auto-assign a specific task
     */
    async autoAssignTask(taskId) {
        const task = this.coordinationTasks.get(taskId);
        if (!task) {
            return;
        }
        // Find suitable agents
        const suitableAgents = Array.from(this.registeredAgents.values())
            .filter(agent => agent.status === 'idle' &&
            this.canAgentHandleTask(agent, task))
            .sort((a, b) => {
            // Prefer agents with relevant capabilities
            const aRelevance = this.calculateAgentTaskRelevance(a, task);
            const bRelevance = this.calculateAgentTaskRelevance(b, task);
            return bRelevance - aRelevance;
        });
        if (suitableAgents.length > 0) {
            const selectedAgent = suitableAgents[0];
            await this.updateTask(taskId, {
                status: 'assigned',
                assignedAgentId: selectedAgent.agentId
            });
            logger_1.processingLogger.info('Task auto-assigned', {
                taskId,
                agentId: selectedAgent.agentId,
                agentName: selectedAgent.agentName
            });
        }
    }
    /**
     * Check if an agent can handle a specific task
     */
    canAgentHandleTask(agent, task) {
        // Check agent type compatibility
        const taskTypeCompatibility = {
            'analysis': ['prd-parser', 'all-purpose-pattern', 'custom'],
            'generation': ['scaffold-generator', 'template-engine', 'custom'],
            'validation': ['parameter-flow', 'vercel-native', 'custom'],
            'research': ['taskmaster-workflow', 'custom'],
            'coordination': ['custom']
        };
        const compatibleTypes = taskTypeCompatibility[task.taskType] || [];
        if (!compatibleTypes.includes(agent.agentType) && !compatibleTypes.includes('custom')) {
            return false;
        }
        // Check capabilities
        const hasRequiredCapabilities = task.requirements.every(req => agent.capabilities.some(cap => cap.toLowerCase().includes(req.toLowerCase())));
        return hasRequiredCapabilities;
    }
    /**
     * Calculate how relevant an agent is for a specific task
     */
    calculateAgentTaskRelevance(agent, task) {
        let relevance = 0;
        // Base relevance for agent type
        const typeRelevance = {
            'prd-parser': task.taskType === 'analysis' ? 10 : 5,
            'scaffold-generator': task.taskType === 'generation' ? 10 : 5,
            'all-purpose-pattern': 8,
            'template-engine': task.taskType === 'generation' ? 9 : 6,
            'parameter-flow': task.taskType === 'validation' ? 10 : 6,
            'vercel-native': task.taskType === 'validation' ? 8 : 5,
            'taskmaster-workflow': task.taskType === 'research' ? 10 : 7,
            'custom': 6
        };
        relevance += typeRelevance[agent.agentType] || 5;
        // Capability match bonus
        const capabilityMatches = task.requirements.filter(req => agent.capabilities.some(cap => cap.toLowerCase().includes(req.toLowerCase()))).length;
        relevance += capabilityMatches * 3;
        // Priority bonus
        const priorityBonus = { critical: 5, high: 3, medium: 1, low: 0 };
        relevance += priorityBonus[task.priority];
        return relevance;
    }
    /**
     * Notify relevant agents about new knowledge
     */
    async notifyRelevantAgents(knowledge) {
        for (const agentId of knowledge.relevantAgents) {
            const agent = this.registeredAgents.get(agentId);
            if (agent && agent.status !== 'offline') {
                this.emit('knowledgeNotification', {
                    agentId,
                    knowledge,
                    timestamp: new Date()
                });
            }
        }
    }
    /**
     * Extract knowledge from completed task
     */
    async extractKnowledgeFromTask(task) {
        try {
            // Auto-extract patterns, solutions, and findings from task results
            if (task.result && typeof task.result === 'object') {
                const knowledge = {
                    sourceAgentId: task.assignedAgentId || 'system',
                    knowledgeType: this.inferKnowledgeType(task),
                    title: `Solution for ${task.description}`,
                    content: JSON.stringify(task.result, null, 2),
                    tags: [task.taskType, task.priority, 'auto-extracted'],
                    relevantAgents: this.inferRelevantAgents(task),
                    confidence: 0.8, // Auto-extracted knowledge has lower confidence
                    metadata: {
                        sourceTaskId: task.taskId,
                        taskType: task.taskType,
                        extractedAt: new Date().toISOString()
                    }
                };
                await this.shareKnowledge(knowledge);
                logger_1.processingLogger.debug('Knowledge extracted from completed task', {
                    taskId: task.taskId,
                    knowledgeType: knowledge.knowledgeType
                });
            }
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to extract knowledge from task', {
                taskId: task.taskId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Infer knowledge type from task
     */
    inferKnowledgeType(task) {
        const taskTypeMapping = {
            'analysis': 'finding',
            'generation': 'template',
            'validation': 'pattern',
            'research': 'resource',
            'coordination': 'solution'
        };
        return taskTypeMapping[task.taskType] || 'finding';
    }
    /**
     * Infer relevant agents from task
     */
    inferRelevantAgents(task) {
        // Include requesting agent and assigned agent
        const relevantAgents = [task.requestingAgentId];
        if (task.assignedAgentId && task.assignedAgentId !== task.requestingAgentId) {
            relevantAgents.push(task.assignedAgentId);
        }
        // Add agents with similar capabilities
        const taskCapabilities = task.requirements;
        for (const agent of this.registeredAgents.values()) {
            const hasRelevantCapabilities = taskCapabilities.some(req => agent.capabilities.some(cap => cap.toLowerCase().includes(req.toLowerCase())));
            if (hasRelevantCapabilities && !relevantAgents.includes(agent.agentId)) {
                relevantAgents.push(agent.agentId);
            }
        }
        return relevantAgents;
    }
    /**
     * Perform system maintenance
     */
    async performMaintenance() {
        const now = new Date();
        const retentionCutoff = new Date(now.getTime() - (this.config.knowledgeRetentionDays * 24 * 60 * 60 * 1000));
        // Clean up old knowledge
        let removedKnowledge = 0;
        for (const [id, knowledge] of this.sharedKnowledge) {
            if (knowledge.createdAt < retentionCutoff) {
                this.sharedKnowledge.delete(id);
                removedKnowledge++;
            }
        }
        // Clean up old completed tasks
        let removedTasks = 0;
        for (const [id, task] of this.coordinationTasks) {
            if (['completed', 'failed', 'cancelled'].includes(task.status) && task.lastUpdated < retentionCutoff) {
                this.coordinationTasks.delete(id);
                removedTasks++;
            }
        }
        if (removedKnowledge > 0 || removedTasks > 0) {
            logger_1.processingLogger.info('Maintenance completed', {
                removedKnowledge,
                removedTasks,
                retentionDays: this.config.knowledgeRetentionDays
            });
        }
    }
    /**
     * Load state from persistent storage
     */
    async loadState() {
        try {
            // Load agent registry
            if (await fs_extra_1.default.pathExists(this.config.agentRegistryPath)) {
                const agentData = await fs_extra_1.default.readJSON(this.config.agentRegistryPath);
                this.registeredAgents = new Map(Object.entries(agentData.agents || {}));
                logger_1.processingLogger.info('Agent registry loaded', {
                    agents: this.registeredAgents.size
                });
            }
            // Load knowledge base
            if (await fs_extra_1.default.pathExists(this.config.knowledgeBasePath)) {
                const knowledgeData = await fs_extra_1.default.readJSON(this.config.knowledgeBasePath);
                if (knowledgeData.knowledge) {
                    this.sharedKnowledge = new Map(Object.entries(knowledgeData.knowledge));
                }
                if (knowledgeData.tasks) {
                    this.coordinationTasks = new Map(Object.entries(knowledgeData.tasks));
                }
                logger_1.processingLogger.info('Knowledge base loaded', {
                    knowledge: this.sharedKnowledge.size,
                    tasks: this.coordinationTasks.size
                });
            }
        }
        catch (error) {
            logger_1.processingLogger.warn('Failed to load coordinator state', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Save state to persistent storage
     */
    async saveState() {
        try {
            // Ensure cache directory exists
            await fs_extra_1.default.ensureDir(path_1.default.dirname(this.config.knowledgeBasePath));
            // Save agent registry
            const agentData = {
                coordinatorId: this.config.coordinatorId,
                lastUpdated: new Date().toISOString(),
                agents: Object.fromEntries(this.registeredAgents)
            };
            await fs_extra_1.default.writeJSON(this.config.agentRegistryPath, agentData, { spaces: 2 });
            // Save knowledge base and tasks
            const knowledgeData = {
                coordinatorId: this.config.coordinatorId,
                lastUpdated: new Date().toISOString(),
                knowledge: Object.fromEntries(this.sharedKnowledge),
                tasks: Object.fromEntries(this.coordinationTasks)
            };
            await fs_extra_1.default.writeJSON(this.config.knowledgeBasePath, knowledgeData, { spaces: 2 });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to save coordinator state', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Utility function to group array by property
     */
    groupBy(array, property) {
        return array.reduce((groups, item) => {
            const key = String(item[property]);
            groups[key] = (groups[key] || 0) + 1;
            return groups;
        }, {});
    }
    /**
     * Get current running status
     */
    isRunning() {
        return this.coordinatorRunning;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.MetaAgentCoordinator = MetaAgentCoordinator;
/**
 * Create meta-agent coordinator with default configuration
 */
function createMetaAgentCoordinator(config) {
    return new MetaAgentCoordinator(config);
}
//# sourceMappingURL=metaAgentCoordinator.js.map