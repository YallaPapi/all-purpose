/**
 * Task Formatter - TaskMaster Task Generation and Formatting
 * 
 * Converts parsed requirements and research findings into TaskMaster-compatible tasks
 * with proper dependencies, priorities, and implementation guidance.
 * 
 * Uses Context7 for current TaskMaster patterns and task structuring.
 * Follows All-Purpose Pattern - generates tasks for ANY agent type with NO limitations
 */

const fs = require('fs').promises;
const path = require('path');

class TaskFormatter {
    constructor(config = {}) {
        this.config = {
            // TaskMaster format settings
            taskIdStart: config.taskIdStart || 1000, // Start high to avoid conflicts
            maxTasksPerRequirement: config.maxTasksPerRequirement || 5, // UNLIMITED - user configurable
            
            // Task templates - All-Purpose Pattern (works for ANY agent type)
            taskTemplates: config.taskTemplates || {
                implementation: {
                    title: "Implement {feature}",
                    description: "Build and implement {feature} according to specifications",
                    priority: "high",
                    estimatedHours: 8
                },
                research: {
                    title: "Research {topic}",
                    description: "Research and analyze {topic} for implementation guidance",
                    priority: "medium",
                    estimatedHours: 4
                },
                testing: {
                    title: "Test {component}",
                    description: "Develop and execute comprehensive tests for {component}",
                    priority: "medium", 
                    estimatedHours: 6
                },
                documentation: {
                    title: "Document {feature}",
                    description: "Create comprehensive documentation for {feature}",
                    priority: "low",
                    estimatedHours: 3
                },
                integration: {
                    title: "Integrate {system}",
                    description: "Integrate {system} with existing architecture",
                    priority: "high",
                    estimatedHours: 12
                }
            },

            // Context7 integration
            useContext7: config.useContext7 !== false,
            contextPrompts: config.contextPrompts || {
                taskGeneration: "Generate TaskMaster tasks using latest project management patterns. use context7",
                dependencies: "Analyze task dependencies for optimal development workflow. use context7",
                formatting: "Format tasks according to TaskMaster JSON schema specifications. use context7"
            },

            // Priority mapping - UNLIMITED priority levels
            priorityMapping: config.priorityMapping || {
                mustHave: 'high',
                shouldHave: 'medium',
                couldHave: 'low',
                wontHave: 'excluded',
                implicit: 'medium'
            },

            // Complexity to effort mapping (hours)
            effortMapping: config.effortMapping || {
                low: { min: 2, max: 8, default: 4 },
                medium: { min: 8, max: 24, default: 16 },
                high: { min: 24, max: 80, default: 40 }
            },

            ...config
        };

        // Task generation strategies
        this.generationStrategies = {
            simple: this.generateSimpleTask.bind(this),
            complex: this.generateComplexTaskBreakdown.bind(this),
            research: this.generateResearchTask.bind(this),
            integration: this.generateIntegrationTask.bind(this)
        };
    }

    /**
     * Format requirements and research into TaskMaster tasks
     * Main entry point implementing systematic task generation
     */
    async formatTasks(requirements, researchData, options = {}) {
        try {
            const startTime = Date.now();
            const { agentName } = options;

            console.log(`📋 Formatting ${requirements.length} requirements into TaskMaster tasks`);

            if (this.config.useContext7) {
                console.log('🔧 Using Context7 for task formatting');
            }

            // Step 1: Analyze requirements for task generation strategy
            const analysisResults = await this.analyzeForTaskGeneration(requirements, researchData, options);

            // Step 2: Generate base tasks from requirements
            const baseTasks = await this.generateBaseTasks(analysisResults, options);

            // Step 3: Add research-backed tasks
            const researchTasks = await this.generateResearchTasks(researchData, baseTasks, options);

            // Step 4: Generate supporting tasks (testing, documentation)
            const supportingTasks = await this.generateSupportingTasks(baseTasks, researchData, options);

            // Step 5: Combine and optimize task list
            const allTasks = [...baseTasks, ...researchTasks, ...supportingTasks];
            const optimizedTasks = await this.optimizeTaskList(allTasks, options);

            // Step 6: Calculate dependencies and ordering
            const tasksWithDependencies = await this.calculateDependencies(optimizedTasks, options);

            // Step 7: Format for TaskMaster compatibility
            const formattedTasks = await this.formatForTaskMaster(tasksWithDependencies, options);

            const processingTime = Date.now() - startTime;

            console.log(`✅ Generated ${formattedTasks.length} TaskMaster tasks (${processingTime}ms)`);

            return formattedTasks;

        } catch (error) {
            throw new Error(`Task formatting failed: ${error.message}`);
        }
    }

    /**
     * Analyze requirements to determine task generation strategy
     */
    async analyzeForTaskGeneration(requirements, researchData, options = {}) {
        const analysis = {
            simple: [],
            complex: [],
            research: [],
            integration: [],
            totalComplexity: 0,
            estimatedEffort: 0
        };

        for (const req of requirements) {
            const strategy = this.determineTaskStrategy(req, researchData);
            analysis[strategy].push({
                requirement: req,
                strategy,
                researchSupport: this.findRelevantResearch(req, researchData)
            });

            // Accumulate complexity metrics
            analysis.totalComplexity += this.mapComplexityToNumber(req.complexity);
            analysis.estimatedEffort += req.estimatedEffort || 0;
        }

        return analysis;
    }

    /**
     * Determine the best task generation strategy for a requirement
     */
    determineTaskStrategy(requirement, researchData) {
        // Integration strategy for API/external service requirements
        if (/\b(api|integration|external|service|webhook)\b/i.test(requirement.description)) {
            return 'integration';
        }

        // Research strategy for complex or unclear requirements
        if (requirement.complexity === 'high' && requirement.metadata.confidence < 0.8) {
            return 'research';
        }

        // Complex strategy for high-complexity requirements
        if (requirement.complexity === 'high' || requirement.estimatedEffort > 16) {
            return 'complex';
        }

        // Simple strategy for straightforward requirements
        return 'simple';
    }

    /**
     * Generate base implementation tasks from requirements
     */
    async generateBaseTasks(analysis, options = {}) {
        const tasks = [];
        let taskId = this.config.taskIdStart;

        for (const [strategy, requirements] of Object.entries(analysis)) {
            if (strategy === 'totalComplexity' || strategy === 'estimatedEffort') continue;

            for (const reqData of requirements) {
                const generatedTasks = await this.generationStrategies[strategy](
                    reqData.requirement,
                    reqData.researchSupport,
                    taskId,
                    options
                );

                tasks.push(...generatedTasks);
                taskId += generatedTasks.length;
            }
        }

        return tasks;
    }

    /**
     * Generate simple task for straightforward requirements
     */
    async generateSimpleTask(requirement, research, baseId, options = {}) {
        const template = this.config.taskTemplates.implementation;
        
        return [{
            id: baseId,
            title: this.interpolateTemplate(template.title, {
                feature: this.extractFeatureName(requirement.description),
                agentName: options.agentName
            }),
            description: requirement.description,
            details: this.generateTaskDetails(requirement, research),
            testStrategy: this.generateTestStrategy(requirement, research),
            priority: this.config.priorityMapping[requirement.type] || requirement.priority,
            complexity: requirement.complexity,
            estimatedEffort: requirement.estimatedEffort || this.config.effortMapping[requirement.complexity].default,
            dependencies: [], // Will be calculated later
            status: "pending",
            subtasks: [],
            metadata: {
                requirementId: requirement.id,
                strategy: 'simple',
                generatedAt: new Date().toISOString(),
                researchSupport: !!research
            }
        }];
    }

    /**
     * Generate complex task breakdown for high-complexity requirements
     */
    async generateComplexTaskBreakdown(requirement, research, baseId, options = {}) {
        const tasks = [];
        const breakdown = requirement.suggestedBreakdown || this.generateDefaultBreakdown(requirement);

        // Main implementation task
        const mainTask = {
            id: baseId,
            title: `Implement ${this.extractFeatureName(requirement.description)}`,
            description: requirement.description,
            details: this.generateTaskDetails(requirement, research),
            testStrategy: this.generateTestStrategy(requirement, research),
            priority: this.config.priorityMapping[requirement.type] || requirement.priority,
            complexity: requirement.complexity,
            estimatedEffort: Math.floor((requirement.estimatedEffort || 40) * 0.6), // 60% for main implementation
            dependencies: [], // Will be calculated later
            status: "pending",
            subtasks: [],
            metadata: {
                requirementId: requirement.id,
                strategy: 'complex',
                isMainTask: true,
                generatedAt: new Date().toISOString(),
                researchSupport: !!research
            }
        };

        tasks.push(mainTask);

        // Generate subtasks for complex breakdown
        for (let i = 0; i < breakdown.length; i++) {
            const subtaskId = baseId + i + 1;
            const subtask = {
                id: subtaskId,
                title: `${breakdown[i]} - ${this.extractFeatureName(requirement.description)}`,
                description: `${breakdown[i]}: ${requirement.description}`,
                details: this.generateSubtaskDetails(breakdown[i], requirement, research),
                testStrategy: this.generateSubtaskTestStrategy(breakdown[i], requirement),
                priority: i === 0 ? 'high' : 'medium', // First subtask is high priority
                complexity: i === breakdown.length - 1 ? 'low' : 'medium', // Last subtask (testing) is usually easier
                estimatedEffort: Math.floor((requirement.estimatedEffort || 40) * 0.4 / breakdown.length), // Remaining 40% split across subtasks
                dependencies: i === 0 ? [] : [baseId + i], // Each subtask depends on previous
                status: "pending",
                subtasks: [],
                metadata: {
                    requirementId: requirement.id,
                    parentTaskId: baseId,
                    strategy: 'complex_subtask',
                    subtaskType: breakdown[i].toLowerCase().replace(/\s+/g, '_'),
                    generatedAt: new Date().toISOString()
                }
            };

            tasks.push(subtask);
        }

        return tasks;
    }

    /**
     * Generate research task for unclear or complex requirements
     */
    async generateResearchTask(requirement, research, baseId, options = {}) {
        const template = this.config.taskTemplates.research;
        const feature = this.extractFeatureName(requirement.description);

        const researchTask = {
            id: baseId,
            title: this.interpolateTemplate(template.title, {
                topic: feature,
                agentName: options.agentName
            }),
            description: `Research implementation approaches and best practices for: ${requirement.description}`,
            details: this.generateResearchTaskDetails(requirement, research),
            testStrategy: "Validate research findings through proof-of-concept implementation and peer review",
            priority: 'high', // Research is critical for complex requirements
            complexity: 'medium',
            estimatedEffort: this.config.taskTemplates.research.estimatedHours,
            dependencies: [],
            status: "pending",
            subtasks: [],
            metadata: {
                requirementId: requirement.id,
                strategy: 'research',
                researchQuestions: this.generateResearchQuestions(requirement),
                generatedAt: new Date().toISOString()
            }
        };

        // Implementation task that depends on research
        const implementationTask = {
            id: baseId + 1,
            title: `Implement ${feature}`,
            description: requirement.description,
            details: `Implement based on research findings from task ${baseId}:\n\n${this.generateTaskDetails(requirement, research)}`,
            testStrategy: this.generateTestStrategy(requirement, research),
            priority: this.config.priorityMapping[requirement.type] || requirement.priority,
            complexity: requirement.complexity,
            estimatedEffort: requirement.estimatedEffort || this.config.effortMapping[requirement.complexity].default,
            dependencies: [baseId], // Depends on research task
            status: "pending",
            subtasks: [],
            metadata: {
                requirementId: requirement.id,
                strategy: 'research_implementation',
                researchTaskId: baseId,
                generatedAt: new Date().toISOString()
            }
        };

        return [researchTask, implementationTask];
    }

    /**
     * Generate integration task for API/external service requirements
     */
    async generateIntegrationTask(requirement, research, baseId, options = {}) {
        const template = this.config.taskTemplates.integration;
        const system = this.extractSystemName(requirement.description);

        return [{
            id: baseId,
            title: this.interpolateTemplate(template.title, {
                system,
                agentName: options.agentName
            }),
            description: requirement.description,
            details: this.generateIntegrationTaskDetails(requirement, research),
            testStrategy: this.generateIntegrationTestStrategy(requirement, system),
            priority: 'high', // Integrations are critical path
            complexity: requirement.complexity,
            estimatedEffort: requirement.estimatedEffort || this.config.effortMapping.medium.default,
            dependencies: [], // Will be calculated later
            status: "pending",
            subtasks: [],
            metadata: {
                requirementId: requirement.id,
                strategy: 'integration',
                integrationType: this.classifyIntegrationType(requirement.description),
                systemName: system,
                generatedAt: new Date().toISOString(),
                researchSupport: !!research
            }
        }];
    }

    /**
     * Generate research-backed tasks from research data
     */
    async generateResearchTasks(researchData, baseTasks, options = {}) {
        if (!researchData || !researchData.guidance) return [];

        const researchTasks = [];
        let taskId = this.config.taskIdStart + 5000; // High ID to avoid conflicts

        // Generate tasks from research guidance
        const { guidance } = researchData;

        // Architecture review task
        if (guidance.architecture && guidance.architecture.length > 0) {
            researchTasks.push({
                id: taskId++,
                title: `Architecture Review - ${options.agentName}`,
                description: "Review and validate system architecture based on research findings",
                details: this.generateArchitectureTaskDetails(guidance.architecture),
                testStrategy: "Validate architecture through design review and technical feasibility analysis",
                priority: 'high',
                complexity: 'medium',
                estimatedEffort: 8,
                dependencies: [],
                status: "pending",
                subtasks: [],
                metadata: {
                    strategy: 'research_derived',
                    taskType: 'architecture_review',
                    generatedAt: new Date().toISOString()
                }
            });
        }

        // Technology selection task
        if (guidance.technologies && guidance.technologies.length > 0) {
            researchTasks.push({
                id: taskId++,
                title: `Technology Stack Validation - ${options.agentName}`,
                description: "Validate and configure technology stack based on research recommendations",
                details: this.generateTechnologyTaskDetails(guidance.technologies),
                testStrategy: "Validate technology choices through proof-of-concept implementation",
                priority: 'medium',
                complexity: 'medium',
                estimatedEffort: 6,
                dependencies: [],
                status: "pending",
                subtasks: [],
                metadata: {
                    strategy: 'research_derived',
                    taskType: 'technology_validation',
                    generatedAt: new Date().toISOString()
                }
            });
        }

        return researchTasks;
    }

    /**
     * Generate supporting tasks (testing, documentation, etc.)
     */
    async generateSupportingTasks(baseTasks, researchData, options = {}) {
        const supportingTasks = [];
        let taskId = this.config.taskIdStart + 10000; // Very high ID to avoid conflicts

        // Generate testing tasks for implementation tasks
        const implementationTasks = baseTasks.filter(task => 
            task.metadata.strategy === 'simple' || 
            task.metadata.strategy === 'complex' || 
            task.metadata.strategy === 'integration'
        );

        for (const implTask of implementationTasks) {
            // Skip if task already has testing in description
            if (!/\b(test|testing|spec|unit test)\b/i.test(implTask.description)) {
                supportingTasks.push({
                    id: taskId++,
                    title: `Test ${this.extractFeatureName(implTask.description)}`,
                    description: `Develop comprehensive tests for ${implTask.description}`,
                    details: this.generateTestTaskDetails(implTask),
                    testStrategy: "Test the tests through mutation testing and coverage analysis",
                    priority: 'medium',
                    complexity: 'medium',
                    estimatedEffort: Math.max(4, Math.floor(implTask.estimatedEffort * 0.5)), // 50% of implementation effort
                    dependencies: [implTask.id],
                    status: "pending",
                    subtasks: [],
                    metadata: {
                        strategy: 'supporting_task',
                        taskType: 'testing',
                        parentTaskId: implTask.id,
                        generatedAt: new Date().toISOString()
                    }
                });
            }
        }

        // Generate documentation task for the overall agent
        supportingTasks.push({
            id: taskId++,
            title: `Document ${options.agentName} Agent`,
            description: `Create comprehensive documentation for the ${options.agentName} agent implementation`,
            details: this.generateDocumentationTaskDetails(baseTasks, options.agentName),
            testStrategy: "Validate documentation through user testing and peer review",
            priority: 'low',
            complexity: 'low',
            estimatedEffort: 4,
            dependencies: implementationTasks.map(t => t.id), // Depends on all implementation tasks
            status: "pending",
            subtasks: [],
            metadata: {
                strategy: 'supporting_task',
                taskType: 'documentation',
                generatedAt: new Date().toISOString()
            }
        });

        return supportingTasks;
    }

    /**
     * Optimize task list by removing duplicates and improving efficiency
     */
    async optimizeTaskList(tasks, options = {}) {
        // Remove duplicate tasks based on similarity
        const optimized = [];
        const seen = new Map();

        for (const task of tasks) {
            const similarity = this.calculateTaskSimilarity(task, optimized);
            const key = this.generateTaskKey(task);

            if (!seen.has(key) && similarity < 0.8) { // Less than 80% similar
                seen.set(key, task);
                optimized.push(task);
            }
        }

        // Sort by priority and complexity for better organization
        return optimized.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
            
            if (priorityDiff !== 0) return -priorityDiff; // Higher priority first
            
            // Secondary sort by complexity (complex tasks first to start early)
            const complexityOrder = { high: 3, medium: 2, low: 1 };
            return -(complexityOrder[a.complexity] || 2) + (complexityOrder[b.complexity] || 2);
        });
    }

    /**
     * Calculate task dependencies based on task relationships
     */
    async calculateDependencies(tasks, options = {}) {
        if (this.config.useContext7) {
            console.log('🔗 Using Context7 for dependency analysis');
        }

        // Tasks already have some dependencies, enhance with intelligent analysis
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            
            // Add dependencies based on task content analysis
            for (let j = 0; j < tasks.length; j++) {
                if (i === j) continue;
                
                const otherTask = tasks[j];
                
                // Check if task depends on other task based on content
                if (this.shouldDependOn(task, otherTask)) {
                    if (!task.dependencies.includes(otherTask.id)) {
                        task.dependencies.push(otherTask.id);
                    }
                }
            }
        }

        return tasks;
    }

    /**
     * Format tasks for TaskMaster compatibility
     */
    async formatForTaskMaster(tasks, options = {}) {
        if (this.config.useContext7) {
            console.log('📄 Using Context7 for TaskMaster formatting');
        }

        return tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            details: task.details,
            testStrategy: task.testStrategy,
            priority: task.priority,
            complexity: task.complexity,
            estimatedEffort: task.estimatedEffort,
            dependencies: task.dependencies || [],
            status: task.status,
            subtasks: task.subtasks || [],
            metadata: {
                ...task.metadata,
                agentName: options.agentName,
                generatedBy: 'PRD-Parser-Agent',
                formattedAt: new Date().toISOString()
            }
        }));
    }

    /**
     * Utility methods for task generation
     */

    extractFeatureName(description) {
        // Extract the main feature/component name from description
        const words = description.split(/\s+/);
        
        // Look for key nouns that represent features
        const featureWords = words.filter(word => 
            /^[A-Z][a-z]+/.test(word) || // Capitalized words
            /\b(agent|system|component|module|service|api|interface)\b/i.test(word) // Key terms
        );
        
        if (featureWords.length > 0) {
            return featureWords.slice(0, 3).join(' '); // Take first 3 feature words
        }
        
        // Fallback: use first few words
        return words.slice(0, 4).join(' ');
    }

    extractSystemName(description) {
        // Extract system/service name for integration tasks
        const systemPatterns = [
            /\b(API|api)\s+([A-Z][a-z]+)/,
            /\b([A-Z][a-z]+)\s+(API|api|service|system)/i,
            /\bwith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
        ];
        
        for (const pattern of systemPatterns) {
            const match = description.match(pattern);
            if (match) {
                return match[1] || match[2];
            }
        }
        
        return 'External System';
    }

    generateTaskDetails(requirement, research) {
        let details = `Implementation details for: ${requirement.description}\n\n`;
        
        // Add complexity information
        details += `**Complexity**: ${requirement.complexity}\n`;
        details += `**Estimated Effort**: ${requirement.estimatedEffort || 'TBD'} hours\n\n`;
        
        // Add research insights if available
        if (research && research.implementation && research.implementation.length > 0) {
            details += `**Research Insights**:\n`;
            research.implementation.slice(0, 3).forEach(insight => {
                details += `- ${insight.text}\n`;
            });
            details += '\n';
        }
        
        // Add technical considerations
        if (requirement.metadata.technicalTerms.length > 0) {
            details += `**Technical Components**: ${requirement.metadata.technicalTerms.join(', ')}\n\n`;
        }
        
        // Add implementation steps if available
        if (requirement.breakdown) {
            details += `**Suggested Implementation Steps**:\n`;
            requirement.breakdown.forEach((step, index) => {
                details += `${index + 1}. ${step}\n`;
            });
        }
        
        return details;
    }

    generateTestStrategy(requirement, research) {
        let strategy = `Testing strategy for: ${this.extractFeatureName(requirement.description)}\n\n`;
        
        // Add test types based on complexity
        const testTypes = [];
        if (requirement.complexity === 'low') {
            testTypes.push('Unit tests for core functionality');
        } else if (requirement.complexity === 'medium') {
            testTypes.push('Unit tests for all components');
            testTypes.push('Integration tests for component interactions');
        } else {
            testTypes.push('Comprehensive unit test suite');
            testTypes.push('Integration tests for all interactions');
            testTypes.push('End-to-end testing scenarios');
            testTypes.push('Performance and load testing');
        }
        
        strategy += testTypes.map(type => `- ${type}`).join('\n') + '\n\n';
        
        // Add research-based testing insights
        if (research && research.guidance && research.guidance.bestPractices) {
            const testingPractices = research.guidance.bestPractices.filter(practice => 
                /\b(test|testing|validation|verification)\b/i.test(practice.text)
            );
            
            if (testingPractices.length > 0) {
                strategy += `**Research-backed Testing Practices**:\n`;
                testingPractices.slice(0, 2).forEach(practice => {
                    strategy += `- ${practice.text}\n`;
                });
            }
        }
        
        return strategy;
    }

    generateDefaultBreakdown(requirement) {
        // Default breakdown for complex requirements
        const breakdown = ['Research and Planning', 'Core Implementation'];
        
        if (requirement.metadata.technicalTerms.some(term => /\b(api|integration|external)\b/i.test(term))) {
            breakdown.push('External Integration');
        }
        
        breakdown.push('Testing and Validation');
        
        if (requirement.priority === 'high') {
            breakdown.push('Documentation and Deployment');
        }
        
        return breakdown;
    }

    interpolateTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }
        return result;
    }

    mapComplexityToNumber(complexity) {
        const map = { low: 1, medium: 2, high: 3 };
        return map[complexity] || 2;
    }

    findRelevantResearch(requirement, researchData) {
        if (!researchData || !researchData.findings) return null;
        
        return researchData.findings.find(finding => 
            finding.context && finding.context.relevantRequirements &&
            finding.context.relevantRequirements.includes(requirement.id)
        );
    }

    calculateTaskSimilarity(task, existingTasks) {
        let maxSimilarity = 0;
        
        for (const existing of existingTasks) {
            const titleSimilarity = this.stringSimilarity(task.title, existing.title);
            const descSimilarity = this.stringSimilarity(task.description, existing.description);
            const similarity = (titleSimilarity + descSimilarity) / 2;
            
            maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        
        return maxSimilarity;
    }

    stringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    generateTaskKey(task) {
        return `${task.title.toLowerCase().replace(/\s+/g, '_')}_${task.priority}_${task.complexity}`;
    }

    shouldDependOn(task, otherTask) {
        // Simple dependency logic - enhance as needed
        const taskWords = task.description.toLowerCase().split(/\s+/);
        const otherWords = otherTask.title.toLowerCase().split(/\s+/);
        
        // If task mentions other task's feature, it might depend on it
        const commonWords = taskWords.filter(word => otherWords.includes(word) && word.length > 3);
        
        return commonWords.length > 1 && 
               task.metadata.strategy !== 'supporting_task' &&
               otherTask.priority === 'high' &&
               task.id !== otherTask.id;
    }

    classifyIntegrationType(description) {
        if (/\b(rest|api|http)\b/i.test(description)) return 'REST_API';
        if (/\b(webhook|callback)\b/i.test(description)) return 'WEBHOOK';
        if (/\b(database|db|sql)\b/i.test(description)) return 'DATABASE';
        if (/\b(file|import|export)\b/i.test(description)) return 'FILE_SYSTEM';
        return 'GENERAL';
    }

    generateResearchQuestions(requirement) {
        const feature = this.extractFeatureName(requirement.description);
        return [
            `What are the best implementation patterns for ${feature}?`,
            `What are the common pitfalls when building ${feature}?`,
            `What libraries and frameworks are recommended for ${feature}?`
        ];
    }

    generateArchitectureTaskDetails(architectureGuidance) {
        let details = "Review system architecture based on research findings:\n\n";
        
        architectureGuidance.slice(0, 5).forEach((guidance, index) => {
            details += `${index + 1}. ${guidance.text}\n`;
        });
        
        details += "\nValidate architecture decisions and update design documentation.";
        return details;
    }

    generateTechnologyTaskDetails(technologies) {
        let details = "Validate and configure technology stack:\n\n";
        
        const uniqueTechs = [...new Set(technologies.map(tech => tech.technology))];
        uniqueTechs.slice(0, 5).forEach(tech => {
            details += `- Evaluate and configure ${tech}\n`;
        });
        
        details += "\nEnsure all technologies are compatible and properly configured.";
        return details;
    }

    generateTestTaskDetails(implementationTask) {
        return `Develop comprehensive test suite for: ${implementationTask.title}

**Test Coverage Requirements**:
- Unit tests for all functions and methods
- Integration tests for external dependencies
- Error handling and edge case testing
- Performance testing for critical paths

**Implementation Task Reference**: Task #${implementationTask.id}

**Expected Test Types**:
- Functional tests to verify requirements
- Regression tests to prevent future breaks
- Load tests if performance-critical
- Security tests if applicable`;
    }

    generateDocumentationTaskDetails(implementationTasks, agentName) {
        return `Create comprehensive documentation for ${agentName} agent:

**Documentation Requirements**:
- API documentation with examples
- Installation and setup guide
- Configuration reference
- Troubleshooting guide
- Contributing guidelines

**Implementation Tasks to Document**:
${implementationTasks.slice(0, 5).map(task => `- Task #${task.id}: ${task.title}`).join('\n')}

**Documentation Standards**:
- Clear, concise language
- Code examples for all APIs
- Visual diagrams where helpful
- Searchable and well-structured`;
    }

    generateResearchTaskDetails(requirement, research) {
        let details = `Research implementation approaches for: ${requirement.description}\n\n`;
        
        details += `**Research Focus Areas**:\n`;
        details += `- Best practices and proven patterns\n`;
        details += `- Technology recommendations\n`;
        details += `- Common pitfalls and how to avoid them\n`;
        details += `- Performance and scalability considerations\n\n`;
        
        if (research && research.questions) {
            details += `**Specific Research Questions**:\n`;
            research.questions.slice(0, 3).forEach((question, index) => {
                details += `${index + 1}. ${question.query}\n`;
            });
        }
        
        return details;
    }

    generateIntegrationTaskDetails(requirement, research) {
        const system = this.extractSystemName(requirement.description);
        let details = `Integration implementation for: ${system}\n\n`;
        
        details += `**Integration Requirements**:\n`;
        details += `- API authentication and authorization\n`;
        details += `- Error handling and retry logic\n`;
        details += `- Rate limiting and throttling\n`;
        details += `- Data validation and transformation\n`;
        details += `- Monitoring and logging\n\n`;
        
        details += `**Specific Requirement**: ${requirement.description}\n`;
        
        return details;
    }

    generateIntegrationTestStrategy(requirement, system) {
        return `Integration testing strategy for ${system}:

**Test Scenarios**:
- Successful integration with valid data
- Error handling for invalid responses
- Network failure and timeout scenarios
- Rate limit handling
- Authentication failure scenarios

**Test Environment**:
- Mock ${system} service for unit tests
- Sandbox/staging ${system} environment for integration tests
- Production-like load testing

**Validation Criteria**:
- All integration points work correctly
- Error scenarios are handled gracefully
- Performance meets requirements
- Security measures are effective`;
    }

    generateSubtaskDetails(subtaskType, requirement, research) {
        const baseDetails = `${subtaskType} phase for: ${requirement.description}\n\n`;
        
        const typeDetails = {
            'Research and planning': 'Analyze requirements, research best practices, and create implementation plan',
            'Core implementation': 'Build the main functionality according to specifications',
            'Integration and testing': 'Integrate with other components and perform comprehensive testing',
            'Documentation and validation': 'Document the implementation and validate against requirements'
        };
        
        return baseDetails + (typeDetails[subtaskType] || `Complete ${subtaskType} for the requirement`);
    }

    generateSubtaskTestStrategy(subtaskType, requirement) {
        const strategies = {
            'Research and planning': 'Validate research findings and implementation plan through peer review',
            'Core implementation': 'Unit test all implemented functionality with comprehensive test coverage',
            'Integration and testing': 'Run integration tests and validate end-to-end functionality',
            'Documentation and validation': 'Review documentation for completeness and validate against requirements'
        };
        
        return strategies[subtaskType] || `Test ${subtaskType} phase thoroughly`;
    }
}

module.exports = TaskFormatter;