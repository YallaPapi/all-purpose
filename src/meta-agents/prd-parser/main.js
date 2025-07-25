#!/usr/bin/env node

/**
 * PRD-Parser & Research Agent - Main Entry Point
 * 
 * This agent implements the Agent-Driven Development (ADD) methodology by:
 * 1. Watching for PRD files and parsing requirements
 * 2. Generating research-backed TaskMaster task lists
 * 3. Applying All-Purpose Pattern (NO hardcoded limitations)
 * 4. Using Context7 for current documentation
 * 
 * Architecture Pattern: Prompt Chaining (extract → validate → generate)
 * Integration: TaskMaster API, Git automation, Context7
 */

// Load environment variables from .env file in project root
require('dotenv').config({ path: '../../../.env' });

const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const { EventEmitter } = require('events');
const { spawn } = require('child_process');

const Parser = require('./parser');
const ResearchGenerator = require('./research-generator');
const TaskFormatter = require('./task-formatter');
const GitIntegration = require('./git-integration');

// Working Memory Integration following ADD methodology
const { createMemoryEnhancedAgent, runAgentTaskWithMemory } = require('../../memory/agentMemoryIntegration');

class PRDParserAgent extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // All-Purpose Pattern: NO hardcoded paths, all configurable
        this.config = {
            watchDir: options.watchDir || 'docs',
            prdPattern: options.prdPattern || /^prd_(.+)\.md$/,  // UNLIMITED agent types
            outputDir: options.outputDir || '.taskmaster/tasks',
            gitEnabled: options.gitEnabled !== false,
            researchEnabled: options.researchEnabled !== false,
            contextEnabled: options.contextEnabled !== false, // Context7 integration
            memoryEnabled: options.memoryEnabled !== false, // Working memory integration
            agentId: options.agentId || 'prd-parser-001', // Agent identifier for memory
            ...options
        };

        // Initialize components using dependency injection pattern
        this.parser = new Parser(this.config);
        this.researchGenerator = new ResearchGenerator(this.config);
        this.taskFormatter = new TaskFormatter(this.config);
        this.gitIntegration = new GitIntegration(this.config);
        
        // Working Memory Integration - following ADD methodology
        this.memoryAgent = this.config.memoryEnabled ? 
            createMemoryEnhancedAgent(this.config.agentId, this) : null;
        
        // File watcher for real-time PRD processing
        this.watcher = null;
        this.isProcessing = new Map(); // Prevent concurrent processing of same file
    }

    /**
     * Start the agent - implements file watching and event handling
     * Uses Tool-Using Agent Pattern for external integrations
     */
    async start() {
        try {
            this.emit('agent:starting', { 
                agent: 'PRD-Parser',
                config: this.config,
                timestamp: new Date().toISOString()
            });

            // Ensure directories exist (All-Purpose Pattern - works for any directory structure)
            await this.ensureDirectories();

            // Initialize file watcher
            this.watcher = chokidar.watch(
                path.join(this.config.watchDir, '**/*.md'),
                {
                    persistent: true,
                    ignoreInitial: false,
                    depth: 10  // UNLIMITED depth - no hardcoded restrictions
                }
            );

            // Set up event handlers
            this.watcher
                .on('add', filepath => this.handleFileEvent('add', filepath))
                .on('change', filepath => this.handleFileEvent('change', filepath))
                .on('unlink', filepath => this.handleFileEvent('unlink', filepath))
                .on('error', error => this.handleError('watcher', error));

            this.emit('agent:started', { 
                agent: 'PRD-Parser',
                watchDir: this.config.watchDir,
                pattern: this.config.prdPattern.source
            });

            console.log(`🔍 PRD-Parser Agent started watching: ${this.config.watchDir}`);
            console.log(`📋 Pattern: ${this.config.prdPattern.source}`);
            
            // Process existing PRD files on startup
            await this.processExistingFiles();

        } catch (error) {
            this.handleError('startup', error);
            throw error;
        }
    }

    /**
     * Stop the agent gracefully
     */
    async stop() {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        
        this.emit('agent:stopped', { 
            agent: 'PRD-Parser',
            timestamp: new Date().toISOString()
        });
        
        console.log('🛑 PRD-Parser Agent stopped');
    }

    /**
     * Handle file system events - implements Router Pattern
     */
    async handleFileEvent(eventType, filepath) {
        try {
            const filename = path.basename(filepath);
            const prdMatch = filename.match(this.config.prdPattern);
            
            if (!prdMatch) {
                // Not a PRD file, ignore (All-Purpose Pattern - works with any file types)
                return;
            }

            const agentName = prdMatch[1]; // Extract agent name (UNLIMITED agent types)
            
            this.emit('file:detected', {
                eventType,
                filepath,
                agentName,
                filename
            });

            // Prevent concurrent processing of same file
            const processingKey = `${eventType}:${filepath}`;
            if (this.isProcessing.get(processingKey)) {
                console.log(`⏳ Already processing: ${filename}`);
                return;
            }

            this.isProcessing.set(processingKey, true);

            try {
                if (eventType === 'add' || eventType === 'change') {
                    await this.processPRDFile(filepath, agentName);
                } else if (eventType === 'unlink') {
                    await this.handlePRDRemoval(filepath, agentName);
                }
            } finally {
                this.isProcessing.delete(processingKey);
            }

        } catch (error) {
            this.handleError('file_event', error, { eventType, filepath });
        }
    }

    /**
     * Process PRD file using TaskMaster CLI with working memory integration:
     * Step 1: Parse PRD → Step 2: Research (separate) → Step 3: Save output
     * Enhanced with ADD methodology and memory context
     */
    async processPRDFile(filepath, agentName) {
        const taskDescription = `Process PRD file: ${path.basename(filepath)} for agent: ${agentName}`;
        
        // Use memory-enhanced execution following ADD methodology
        if (this.memoryAgent) {
            return await this.memoryAgent.executeWithMemory(
                taskDescription,
                async (contextualPrompt, memory) => {
                    return await this._processPRDFileCore(filepath, agentName, memory);
                }
            );
        } else {
            return await this._processPRDFileCore(filepath, agentName);
        }
    }

    /**
     * Core PRD processing logic (enhanced with memory context)
     */
    async _processPRDFileCore(filepath, agentName, memory = '') {
        const startTime = Date.now();
        try {
            console.log(`📄 Processing PRD: ${path.basename(filepath)} (${agentName})`);
            if (memory && this.config.memoryEnabled) {
                console.log(`🧠 Using memory context: ${memory.split('\n\n').length} previous entries`);
            }
            
            this.emit('prd:processing_start', {
                filepath,
                agentName,
                timestamp: new Date().toISOString(),
                memoryContext: memory ? true : false
            });

            // Ensure output directory exists
            const outputDir = path.resolve('.taskmaster/tasks');
            await fs.mkdir(outputDir, { recursive: true });
            const outputPath = path.join(outputDir, `tasks_${agentName}.json`);

            // Step 1: Parse PRD using TaskMaster CLI (no --research)
            console.log(`🔧 Running: task-master parse-prd ${filepath} --output=${outputPath}`);
            const parseResult = await this.runTaskMasterCommand([
                'parse-prd', filepath, `--output=${outputPath}`
            ]);
            console.log(parseResult);

            // Step 2: Research for each task (separate command)
            let tasksData;
            try {
                const raw = await fs.readFile(outputPath, 'utf8');
                tasksData = JSON.parse(raw);
            } catch (err) {
                throw new Error(`Failed to read generated tasks file: ${outputPath}`);
            }
            
            let successfulResearchCount = 0;
            if (Array.isArray(tasksData.tasks)) {
                for (const task of tasksData.tasks) {
                    if (task.title && task.id) {
                        const prompt = `${agentName} ${task.title}`;
                        console.log(`🔬 Running research for task ${task.id}: ${prompt}`);
                        try {
                            const researchResult = await this.runTaskMasterCommand([
                                'research', prompt, `--id=${task.id}`
                            ]);
                            console.log(researchResult);
                            successfulResearchCount++;
                        } catch (err) {
                            console.error(`❌ Research failed for task ${task.id}: ${task.title}`, err.message);
                        }
                    }
                }
            }

            // Step 3: Log completion with comprehensive result
            const processingTime = Date.now() - startTime;
            const result = `Successfully processed PRD for ${agentName}. Generated ${tasksData.tasks?.length || 0} tasks, completed research for ${successfulResearchCount} tasks. Output: ${outputPath}`;
            
            this.emit('prd:completed', {
                agentName,
                filepath,
                outputPath,
                processingTime,
                tasksGenerated: tasksData.tasks?.length || 0,
                researchCompleted: successfulResearchCount,
                success: true,
                memoryContext: memory ? true : false
            });
            
            console.log(`✅ Completed ${agentName} PRD processing (${processingTime}ms)`);
            console.log(`📋 Tasks: ${tasksData.tasks?.length || 0}, Research: ${successfulResearchCount}`);
            
            return result;
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.emit('prd:error', {
                agentName,
                filepath,
                error: error.message,
                processingTime,
                success: false
            });
            throw error;
        }
    }

    /**
     * Handle PRD file removal
     */
    async handlePRDRemoval(filepath, agentName) {
        console.log(`🗑️  PRD removed: ${agentName}`);
        
        this.emit('prd:removed', {
            agentName,
            filepath,
            timestamp: new Date().toISOString()
        });

        // Optional: Clean up generated task files
        // Implementation depends on requirements
    }

    /**
     * Save task list in TaskMaster format
     */
    async saveTaskList(taskList, agentName) {
        const filename = `tasks_${agentName}.json`;
        const outputPath = path.join(this.config.outputDir, filename);
        
        const taskData = {
            agent: agentName,
            generated: new Date().toISOString(),
            generatedBy: 'PRD-Parser-Agent',
            version: '1.0.0',
            tasks: taskList,
            metadata: {
                totalTasks: taskList.length,
                highPriority: taskList.filter(t => t.priority === 'high').length,
                dependencies: this.calculateTaskDependencies(taskList)
            }
        };

        await fs.writeFile(outputPath, JSON.stringify(taskData, null, 2));
        return outputPath;
    }

    /**
     * Calculate task dependencies for metadata
     */
    calculateTaskDependencies(taskList) {
        const dependencyCounts = taskList.reduce((counts, task) => {
            const depCount = (task.dependencies || []).length;
            counts[depCount] = (counts[depCount] || 0) + 1;
            return counts;
        }, {});

        return {
            totalDependencies: taskList.reduce((total, task) => total + (task.dependencies || []).length, 0),
            averageDependencies: taskList.length > 0 ? 
                taskList.reduce((total, task) => total + (task.dependencies || []).length, 0) / taskList.length : 0,
            dependencyDistribution: dependencyCounts
        };
    }

    /**
     * Process existing PRD files on startup
     */
    async processExistingFiles() {
        try {
            const files = await fs.readdir(this.config.watchDir);
            const prdFiles = files.filter(file => this.config.prdPattern.test(file));
            
            console.log(`📁 Found ${prdFiles.length} existing PRD files`);
            
            for (const file of prdFiles) {
                const filepath = path.join(this.config.watchDir, file);
                const agentName = file.match(this.config.prdPattern)[1];
                
                // Process with delay to avoid overwhelming the system
                setTimeout(() => {
                    this.handleFileEvent('add', filepath);
                }, 100);
            }
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.handleError('existing_files', error);
            }
        }
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const dirs = [
            this.config.watchDir,
            this.config.outputDir,
            path.dirname(this.config.outputDir) // TaskMaster base directory
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    /**
     * Centralized error handling with observability
     */
    handleError(context, error, additionalData = {}) {
        const errorData = {
            context,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            timestamp: new Date().toISOString(),
            ...additionalData
        };

        this.emit('error', errorData);
        console.error(`❌ Error in ${context}:`, error.message);
        
        // Log full error details for debugging
        if (process.env.NODE_ENV === 'development') {
            console.error('Full error:', error);
        }
    }

    /**
     * Run a TaskMaster CLI command and return stdout
     */
    runTaskMasterCommand(args) {
        return new Promise((resolve, reject) => {
            const proc = spawn('task-master', args, { shell: true });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', data => { stdout += data.toString(); });
            proc.stderr.on('data', data => { stderr += data.toString(); });
            proc.on('close', code => {
                if (code === 0) resolve(stdout);
                else reject(new Error(stderr || stdout || `TaskMaster exited with code ${code}`));
            });
            proc.on('error', err => reject(err));
        });
    }
}

// CLI interface for standalone usage
if (require.main === module) {
    const agent = new PRDParserAgent({
        watchDir: process.env.PRD_WATCH_DIR || 'docs',
        outputDir: process.env.TASKMASTER_OUTPUT_DIR || '.taskmaster/tasks',
        gitEnabled: process.env.GIT_ENABLED !== 'false',
        researchEnabled: process.env.RESEARCH_ENABLED !== 'false',
        contextEnabled: process.env.CONTEXT7_ENABLED !== 'false'
    });

    // Event logging for observability
    agent.on('agent:started', data => console.log('🚀 Agent started:', data));
    agent.on('prd:completed', data => console.log('✅ PRD processed:', data));
    agent.on('error', data => console.error('❌ Agent error:', data));

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down gracefully...');
        await agent.stop();
        process.exit(0);
    });

    // Start the agent
    agent.start().catch(error => {
        console.error('❌ Failed to start PRD-Parser Agent:', error);
        process.exit(1);
    });
}

module.exports = PRDParserAgent;