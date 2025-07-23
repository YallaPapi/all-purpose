"use strict";
/**
 * Project Context Tracker
 *
 * Use context7: TaskMaster integration with file change tracking
 * Following All-Purpose Pattern: Configurable for ANY project structure and task types
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectContextTracker = void 0;
exports.createProjectContextTracker = createProjectContextTracker;
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger_1 = require("../utils/logger");
const documentProcessor_1 = require("../processing/documentProcessor");
/**
 * Project Context Tracker
 * Links TaskMaster tasks with file changes and maintains project context awareness
 */
class ProjectContextTracker extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.taskFileMappings = new Map();
        this.fileToTasks = new Map();
        this.isTracking = false;
        this.config = {
            projectDir: process.cwd(),
            taskMasterConfigPath: path_1.default.join(process.cwd(), '.taskmaster'),
            trackingCacheFile: path_1.default.join(process.cwd(), '.rag-cache', 'project-context.json'),
            enableRealTimeTracking: true,
            autoUpdateOnTaskChange: true,
            fileAssociationPatterns: {
                'docs': ['**/*.md', '**/*.txt'],
                'code': ['src/**/*.ts', 'src/**/*.js', 'lib/**/*.ts'],
                'config': ['*.json', '*.yaml', '*.yml', '.env*'],
                'meta-agents': ['src/meta-agents/**/*']
            },
            ...config
        };
        logger_1.processingLogger.info('Project Context Tracker initialized', {
            projectDir: this.config.projectDir,
            realTimeTracking: this.config.enableRealTimeTracking
        });
    }
    /**
     * Start project context tracking
     */
    async startTracking() {
        if (this.isTracking) {
            logger_1.processingLogger.warn('Project context tracking is already active');
            return;
        }
        try {
            // Load existing mappings from cache
            await this.loadMappingsFromCache();
            // Initialize TaskMaster integration
            await this.initializeTaskMasterIntegration();
            // Setup file watching if enabled
            if (this.config.enableRealTimeTracking) {
                await this.setupFileWatching();
            }
            // Perform initial context sync
            await this.syncProjectContext();
            this.isTracking = true;
            logger_1.processingLogger.info('Project context tracking started successfully');
            this.emit('trackingStarted', { timestamp: new Date() });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to start project context tracking', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Stop project context tracking
     */
    async stopTracking() {
        if (!this.isTracking) {
            return;
        }
        try {
            // Stop file watching
            if (this.fileWatcher) {
                await this.fileWatcher.stopWatching();
            }
            // Save current mappings to cache
            await this.saveMappingsToCache();
            this.isTracking = false;
            logger_1.processingLogger.info('Project context tracking stopped');
            this.emit('trackingStopped', { timestamp: new Date() });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to stop project context tracking', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Associate files with a TaskMaster task
     */
    async associateFilesWithTask(taskId, files, metadata) {
        const absoluteFiles = files.map(f => path_1.default.resolve(this.config.projectDir, f));
        // Update task mapping
        const existingMapping = this.taskFileMappings.get(taskId);
        const taskMapping = {
            taskId,
            files: absoluteFiles,
            lastModified: new Date(),
            status: existingMapping?.status || 'pending',
            description: metadata?.description || existingMapping?.description,
            metadata: { ...existingMapping?.metadata, ...metadata }
        };
        this.taskFileMappings.set(taskId, taskMapping);
        // Update file-to-task reverse mapping
        for (const file of absoluteFiles) {
            if (!this.fileToTasks.has(file)) {
                this.fileToTasks.set(file, new Set());
            }
            this.fileToTasks.get(file).add(taskId);
        }
        logger_1.processingLogger.info('Files associated with task', {
            taskId,
            files: files.length,
            fileList: files
        });
        this.emit('contextUpdated', {
            type: 'task_file_associated',
            taskId,
            timestamp: new Date(),
            metadata: { files }
        });
        // Save to cache
        await this.saveMappingsToCache();
    }
    /**
     * Update task status
     */
    async updateTaskStatus(taskId, newStatus, metadata) {
        const mapping = this.taskFileMappings.get(taskId);
        if (!mapping) {
            logger_1.processingLogger.warn('Attempted to update status for unknown task', { taskId });
            return;
        }
        const oldStatus = mapping.status;
        mapping.status = newStatus;
        mapping.lastModified = new Date();
        if (metadata) {
            mapping.metadata = { ...mapping.metadata, ...metadata };
        }
        logger_1.processingLogger.info('Task status updated', {
            taskId,
            oldStatus,
            newStatus,
            files: mapping.files.length
        });
        this.emit('contextUpdated', {
            type: 'task_status_changed',
            taskId,
            oldStatus,
            newStatus,
            timestamp: new Date(),
            metadata
        });
        // Auto-update RAG context if enabled
        if (this.config.autoUpdateOnTaskChange) {
            await this.updateTaskContext(taskId);
        }
        // Save to cache
        await this.saveMappingsToCache();
    }
    /**
     * Get files associated with a task
     */
    getTaskFiles(taskId) {
        const mapping = this.taskFileMappings.get(taskId);
        return mapping ? [...mapping.files] : [];
    }
    /**
     * Get tasks associated with a file
     */
    getFileTasks(filePath) {
        const absolutePath = path_1.default.resolve(this.config.projectDir, filePath);
        const tasks = this.fileToTasks.get(absolutePath);
        return tasks ? Array.from(tasks) : [];
    }
    /**
     * Get current project context summary
     */
    getProjectContext() {
        const tasks = Array.from(this.taskFileMappings.values());
        const totalTasks = tasks.length;
        const activeTasks = tasks.filter(t => t.status === 'in_progress').length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const trackedFiles = this.fileToTasks.size;
        return {
            totalTasks,
            activeTasks,
            completedTasks,
            trackedFiles,
            recentActivity: [] // Could be enhanced with activity history
        };
    }
    /**
     * Initialize TaskMaster integration
     */
    async initializeTaskMasterIntegration() {
        try {
            // Check if TaskMaster config exists
            const configExists = await fs_extra_1.default.pathExists(this.config.taskMasterConfigPath);
            if (!configExists) {
                logger_1.processingLogger.warn('TaskMaster config not found', {
                    path: this.config.taskMasterConfigPath
                });
                return;
            }
            // Read TaskMaster tasks and create initial associations
            await this.syncTaskMasterTasks();
            logger_1.processingLogger.info('TaskMaster integration initialized');
        }
        catch (error) {
            logger_1.processingLogger.error('TaskMaster integration failed', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Sync with TaskMaster tasks
     */
    async syncTaskMasterTasks() {
        try {
            // This would typically read TaskMaster's task list
            // For now, we'll create intelligent associations based on file patterns
            await this.createIntelligentAssociations();
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to sync TaskMaster tasks', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Create intelligent file-task associations based on patterns
     */
    async createIntelligentAssociations() {
        // RAG system tasks
        const ragFiles = [
            'rag-system/**/*.ts',
            'rag-system/**/*.js',
            'rag-system/test-*.js'
        ];
        await this.associateFilesWithTask('task-5-project-context', ragFiles, {
            description: 'Project Context Awareness - Task tracking and file change detection',
            category: 'rag-system'
        });
        // Meta-agent factory tasks
        const metaAgentFiles = [
            'src/meta-agents/**/*.ts',
            'src/meta-agents/**/*.js',
            'docs-consolidated/prd_*.md',
            'docs-consolidated/meta_agent_factory.md'
        ];
        await this.associateFilesWithTask('task-meta-agents', metaAgentFiles, {
            description: 'Meta-Agent Factory development',
            category: 'meta-agents'
        });
        // Documentation tasks
        const docFiles = [
            'docs-consolidated/*.md',
            'README.md',
            'COMPREHENSIVE_PROJECT_STATUS.md'
        ];
        await this.associateFilesWithTask('task-documentation', docFiles, {
            description: 'Project documentation and consolidation',
            category: 'documentation'
        });
        logger_1.processingLogger.info('Intelligent task-file associations created');
    }
    /**
     * Setup file watching for context tracking
     */
    async setupFileWatching() {
        if (!this.fileWatcher) {
            const processor = new documentProcessor_1.DocumentProcessor({
                sourceDir: this.config.projectDir
            });
            // Create file watcher with project-specific patterns
            const { createFileWatcher } = await Promise.resolve().then(() => __importStar(require('../processing/fileWatcher')));
            this.fileWatcher = createFileWatcher(processor, {
                watchDir: this.config.projectDir,
                filePatterns: Object.values(this.config.fileAssociationPatterns).flat()
            });
            // Handle file change events
            this.fileWatcher.on('fileChanged', (event) => {
                this.handleFileChange(event);
            });
            await this.fileWatcher.startWatching();
            logger_1.processingLogger.info('File watching setup for context tracking');
        }
    }
    /**
     * Handle file change events
     */
    async handleFileChange(event) {
        const associatedTasks = this.getFileTasks(event.filePath);
        if (associatedTasks.length === 0) {
            return; // File not associated with any tasks
        }
        logger_1.processingLogger.debug('File change affects tasks', {
            file: event.fileName,
            type: event.type,
            tasks: associatedTasks
        });
        // Update last modified time for affected tasks
        for (const taskId of associatedTasks) {
            const mapping = this.taskFileMappings.get(taskId);
            if (mapping) {
                mapping.lastModified = new Date();
            }
        }
        this.emit('contextUpdated', {
            type: 'file_changed',
            filePath: event.filePath,
            timestamp: new Date(),
            metadata: {
                changeType: event.type,
                affectedTasks: associatedTasks
            }
        });
        // Auto-update context for affected tasks if enabled
        if (this.config.autoUpdateOnTaskChange) {
            for (const taskId of associatedTasks) {
                await this.updateTaskContext(taskId);
            }
        }
    }
    /**
     * Update RAG context for a specific task
     */
    async updateTaskContext(taskId) {
        const mapping = this.taskFileMappings.get(taskId);
        if (!mapping) {
            return;
        }
        try {
            // This would trigger re-embedding of task-related files
            // For now, emit an event that the RAG pipeline can listen to
            this.emit('taskContextUpdateNeeded', {
                taskId,
                files: mapping.files,
                status: mapping.status,
                timestamp: new Date()
            });
            logger_1.processingLogger.debug('Task context update triggered', {
                taskId,
                files: mapping.files.length
            });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to update task context', {
                taskId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Sync complete project context
     */
    async syncProjectContext() {
        try {
            // Refresh all task-file associations
            await this.createIntelligentAssociations();
            // Emit context refresh event
            this.emit('contextUpdated', {
                type: 'context_refreshed',
                timestamp: new Date(),
                metadata: {
                    totalTasks: this.taskFileMappings.size,
                    trackedFiles: this.fileToTasks.size
                }
            });
            logger_1.processingLogger.info('Project context synced', {
                tasks: this.taskFileMappings.size,
                files: this.fileToTasks.size
            });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to sync project context', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Load mappings from cache file
     */
    async loadMappingsFromCache() {
        try {
            if (await fs_extra_1.default.pathExists(this.config.trackingCacheFile)) {
                const cacheData = await fs_extra_1.default.readJSON(this.config.trackingCacheFile);
                // Restore task mappings
                if (cacheData.taskFileMappings) {
                    this.taskFileMappings = new Map(Object.entries(cacheData.taskFileMappings));
                }
                // Rebuild file-to-task mapping
                this.fileToTasks.clear();
                for (const [taskId, mapping] of this.taskFileMappings) {
                    for (const file of mapping.files) {
                        if (!this.fileToTasks.has(file)) {
                            this.fileToTasks.set(file, new Set());
                        }
                        this.fileToTasks.get(file).add(taskId);
                    }
                }
                logger_1.processingLogger.info('Project context cache loaded', {
                    tasks: this.taskFileMappings.size,
                    files: this.fileToTasks.size
                });
            }
        }
        catch (error) {
            logger_1.processingLogger.warn('Failed to load context cache', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Save mappings to cache file
     */
    async saveMappingsToCache() {
        try {
            // Ensure cache directory exists
            await fs_extra_1.default.ensureDir(path_1.default.dirname(this.config.trackingCacheFile));
            // Convert Map to object for JSON serialization
            const cacheData = {
                taskFileMappings: Object.fromEntries(this.taskFileMappings),
                lastUpdated: new Date().toISOString()
            };
            await fs_extra_1.default.writeJSON(this.config.trackingCacheFile, cacheData, { spaces: 2 });
            logger_1.processingLogger.debug('Project context cache saved');
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to save context cache', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Get current tracking status
     */
    isActive() {
        return this.isTracking;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.ProjectContextTracker = ProjectContextTracker;
/**
 * Create project context tracker with default configuration
 */
function createProjectContextTracker(config) {
    return new ProjectContextTracker(config);
}
//# sourceMappingURL=projectContextTracker.js.map