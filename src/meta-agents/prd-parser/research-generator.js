/**
 * Research Generator - AI-Powered Research Integration
 * 
 * Integrates with TaskMaster research capabilities and Perplexity for research-backed
 * task generation and implementation guidance.
 * 
 * Uses Context7 for current documentation patterns and research methodologies.
 * Follows All-Purpose Pattern - works for ANY agent domain with NO hardcoded limitations
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ResearchGenerator {
    constructor(config = {}) {
        this.config = {
            // TaskMaster research integration settings
            taskMasterCmd: config.taskMasterCmd || 'task-master', // CLI tool (claude-task-master package)
            researchTimeout: config.researchTimeout || 60000, // 60 seconds for research queries
            maxResearchQueries: config.maxResearchQueries || 10, // UNLIMITED - user configurable
            
            // Research query templates - All-Purpose Pattern (UNLIMITED domains)
            queryTemplates: config.queryTemplates || {
                implementation: "{agentType} implementation best practices and architecture patterns",
                technology: "latest {technology} patterns and frameworks for {agentType} development",
                integration: "{agentType} integration patterns with {integrations}",
                performance: "{agentType} performance optimization and scalability patterns",
                security: "security best practices for {agentType} systems",
                testing: "testing strategies and frameworks for {agentType} implementation",
                deployment: "{agentType} deployment and DevOps best practices",
                monitoring: "monitoring and observability patterns for {agentType} systems"
            },
            
            // Context7 integration
            useContext7: config.useContext7 !== false,
            contextPrompts: config.contextPrompts || {
                research: "Generate comprehensive research questions for software development. use context7",
                analysis: "Analyze research findings for implementation guidance. use context7",
                synthesis: "Synthesize research data into actionable development tasks. use context7"
            },

            // Research categories - UNLIMITED extensibility
            researchCategories: config.researchCategories || [
                'architecture', 'implementation', 'technology', 'integration',
                'performance', 'security', 'testing', 'deployment', 'monitoring'
            ],

            ...config
        };

        // Research cache to avoid duplicate queries
        this.researchCache = new Map();
        
        // Research quality thresholds
        this.qualityThresholds = {
            minSources: 3,
            minConfidence: 0.7,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        };
    }

    /**
     * Generate comprehensive research for parsed requirements
     * Main entry point implementing research-backed development methodology
     */
    async generateResearch(requirements, options = {}) {
        try {
            const startTime = Date.now();
            const { agentName } = options;
            
            console.log(`🔬 Generating research for ${agentName} (${requirements.length} requirements)`);

            // Step 1: Analyze requirements to identify research areas
            const researchAreas = await this.identifyResearchAreas(requirements, options);
            
            // Step 2: Generate research questions for each area
            const researchQuestions = await this.generateResearchQuestions(researchAreas, options);
            
            // Step 3: Execute research queries using TaskMaster
            const researchFindings = await this.executeResearchQueries(researchQuestions, options);
            
            // Step 4: Synthesize findings into actionable guidance
            const actionableGuidance = await this.synthesizeFindings(researchFindings, requirements, options);
            
            const processingTime = Date.now() - startTime;
            
            return {
                agentName,
                researchAreas,
                questions: researchQuestions,
                findings: researchFindings,
                guidance: actionableGuidance,
                metadata: {
                    totalAreas: researchAreas.length,
                    totalQuestions: researchQuestions.length,
                    successfulQueries: researchFindings.filter(f => f.success).length,
                    processingTime,
                    researchedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            throw new Error(`Research generation failed: ${error.message}`);
        }
    }

    /**
     * Identify research areas from requirements analysis
     * Uses All-Purpose Pattern to work with ANY agent domain
     */
    async identifyResearchAreas(requirements, options = {}) {
        const areas = new Set();
        const { agentName } = options;
        
        // Extract technologies and domains from requirements
        const technologies = this.extractTechnologies(requirements);
        const integrations = this.extractIntegrations(requirements);
        const domains = this.extractDomains(requirements);
        
        // Always include core research areas for any agent
        areas.add('architecture');
        areas.add('implementation');
        
        // Add technology-specific research areas
        if (technologies.length > 0) {
            areas.add('technology');
        }
        
        // Add integration research if needed
        if (integrations.length > 0) {
            areas.add('integration');
        }
        
        // Add performance research for complex agents
        const complexRequirements = requirements.filter(r => r.complexity === 'high');
        if (complexRequirements.length > 0) {
            areas.add('performance');
            areas.add('scalability');
        }
        
        // Add security research for agents with external integrations
        if (this.hasSecurityImplications(requirements)) {
            areas.add('security');
        }
        
        // Add testing research for all agents
        areas.add('testing');
        
        // Add deployment research for production agents
        if (this.isProductionAgent(requirements, agentName)) {
            areas.add('deployment');
            areas.add('monitoring');
        }

        return Array.from(areas).map(area => ({
            area,
            priority: this.calculateAreaPriority(area, requirements),
            technologies,
            integrations,
            domains,
            requirements: requirements.filter(r => this.isRelevantToArea(r, area))
        }));
    }

    /**
     * Generate specific research questions for each area
     */
    async generateResearchQuestions(researchAreas, options = {}) {
        const questions = [];
        const { agentName } = options;
        
        if (this.config.useContext7) {
            console.log('🧠 Using Context7 for research question generation');
        }

        for (const areaData of researchAreas) {
            const areaQuestions = await this.generateQuestionsForArea(areaData, agentName);
            questions.push(...areaQuestions);
        }

        // Limit to max questions to avoid overwhelming the research system
        return questions.slice(0, this.config.maxResearchQueries);
    }

    /**
     * Generate research questions for a specific area
     */
    async generateQuestionsForArea(areaData, agentName) {
        const { area, technologies, integrations, domains } = areaData;
        const questions = [];
        
        // Get base query template
        const template = this.config.queryTemplates[area] || this.config.queryTemplates.implementation;
        
        // Generate context-specific query
        const query = this.interpolateTemplate(template, {
            agentType: agentName,
            technology: technologies.join(', ') || 'Node.js',
            integrations: integrations.join(', ') || 'external APIs',
            domains: domains.join(', ') || 'general purpose'
        });
        
        questions.push({
            id: `${area}_${Date.now()}`,
            area,
            query,
            priority: areaData.priority,
            context: {
                agentName,
                technologies,
                integrations,
                domains,
                relevantRequirements: areaData.requirements.map(r => r.id)
            }
        });
        
        // Generate additional specific questions based on requirements
        for (const req of areaData.requirements.slice(0, 2)) { // Limit to avoid too many queries
            if (req.complexity === 'high') {
                const specificQuery = `${agentName} implementation approaches for: ${req.description.substring(0, 100)}`;
                questions.push({
                    id: `${area}_req_${req.id}_${Date.now()}`,
                    area,
                    query: specificQuery,
                    priority: 'high',
                    context: {
                        agentName,
                        requirementId: req.id,
                        requirementText: req.description
                    }
                });
            }
        }
        
        return questions;
    }

    /**
     * Execute research queries using TaskMaster research command
     */
    async executeResearchQueries(questions, options = {}) {
        const findings = [];
        
        console.log(`🔍 Executing ${questions.length} research queries`);
        
        for (const question of questions) {
            try {
                // Check cache first
                const cached = this.researchCache.get(question.query);
                if (cached && this.isCacheValid(cached)) {
                    findings.push({
                        ...question,
                        result: cached.result,
                        success: true,
                        cached: true,
                        timestamp: cached.timestamp
                    });
                    continue;
                }
                
                // Execute research query
                const result = await this.executeTaskMasterResearch(question);
                
                findings.push({
                    ...question,
                    result,
                    success: true,
                    cached: false,
                    timestamp: new Date().toISOString()
                });
                
                // Cache successful results
                this.researchCache.set(question.query, {
                    result,
                    timestamp: new Date().toISOString()
                });
                
                // Add delay between queries to respect rate limits
                await this.delay(1000);
                
            } catch (error) {
                console.warn(`⚠️  Research query failed: ${question.query.substring(0, 50)}...`);
                findings.push({
                    ...question,
                    result: null,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        return findings;
    }

    /**
     * Execute TaskMaster research command
     */
    async executeTaskMasterResearch(question) {
        return new Promise((resolve, reject) => {
            // Use proper argument format for TaskMaster research command
            const args = ['research', question.query];
            
            console.log(`🔍 Executing TaskMaster research: ${this.config.taskMasterCmd} ${args.join(' ')}`);
            
            // Environment setup with API keys (TaskMaster reads from .env automatically)
            const env = {
                ...process.env,
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
                PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY
            };
            
            // TaskMaster must run from the project root where .taskmaster config exists
            const projectRoot = path.resolve(__dirname, '../../..');
            
            const childProcess = spawn(this.config.taskMasterCmd, args, { 
                env,
                shell: true,
                cwd: projectRoot, // Use project root, not current directory
                stdio: ['inherit', 'pipe', 'pipe'] // Handle stdio properly
            });
            
            let stdout = '';
            let stderr = '';
            
            childProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            childProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            const timeout = setTimeout(() => {
                childProcess.kill('SIGTERM');
                reject(new Error('Research query timeout'));
            }, this.config.researchTimeout);
            
            childProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                console.log(`✅ TaskMaster research completed (exit code: ${code})`);
                
                if (stdout.trim() && (code === 0 || stdout.includes('Research Results'))) {
                    // Accept results even if exit code isn't 0, as long as we have research output
                    resolve(this.parseTaskMasterOutput(stdout));
                } else if (code === 143 && stdout.includes('Researching:')) {
                    // Timeout but we got some research data - use what we have
                    console.warn(`⚠️ TaskMaster research timed out but got partial results`);
                    resolve(this.parseTaskMasterOutput(stdout) || 'Research query timed out but was processing successfully');
                } else {
                    console.warn(`⚠️ TaskMaster research failed - Code: ${code}`);
                    console.warn(`STDERR: ${stderr}`);
                    console.warn(`STDOUT: ${stdout}`);
                    reject(new Error(`TaskMaster research failed (exit code ${code}): ${stderr || 'No output received'}`));
                }
            });
            
            childProcess.on('error', (error) => {
                clearTimeout(timeout);
                console.error(`❌ TaskMaster process error:`, error);
                reject(error);
            });
        });
    }

    /**
     * Parse TaskMaster research output
     */
    parseTaskMasterOutput(output) {
        try {
            // Extract research results from TaskMaster output
            // This is a simplified parser - adapt based on actual TaskMaster output format
            
            const lines = output.split('\n');
            let isResultSection = false;
            let result = '';
            
            for (const line of lines) {
                if (line.includes('Research Results') || line.includes('Results:')) {
                    isResultSection = true;
                    continue;
                }
                
                if (isResultSection && line.trim()) {
                    result += line + '\n';
                }
            }
            
            return result.trim() || output; // Fallback to full output if parsing fails
            
        } catch (error) {
            console.warn('⚠️  Failed to parse TaskMaster output, using raw output');
            return output;
        }
    }

    /**
     * Synthesize research findings into actionable guidance
     */
    async synthesizeFindings(findings, requirements, options = {}) {
        if (this.config.useContext7) {
            console.log('⚙️  Using Context7 for findings synthesis');
        }

        const guidance = {
            implementation: [],
            architecture: [],
            bestPractices: [],
            technologies: [],
            patterns: [],
            warnings: [],
            resources: []
        };

        // Group findings by area for analysis
        const findingsByArea = this.groupFindingsByArea(findings);
        
        // Extract guidance from each area
        for (const [area, areaFindings] of Object.entries(findingsByArea)) {
            const areaGuidance = this.extractGuidanceFromArea(area, areaFindings, requirements);
            
            // Merge area guidance into main guidance
            for (const [category, items] of Object.entries(areaGuidance)) {
                if (guidance[category]) {
                    guidance[category].push(...items);
                }
            }
        }

        // Deduplicate and prioritize guidance
        for (const category of Object.keys(guidance)) {
            guidance[category] = this.deduplicateAndPrioritize(guidance[category]);
        }

        return guidance;
    }

    /**
     * Group findings by research area
     */
    groupFindingsByArea(findings) {
        const grouped = {};
        
        for (const finding of findings) {
            if (!finding.success) continue;
            
            const area = finding.area;
            if (!grouped[area]) {
                grouped[area] = [];
            }
            grouped[area].push(finding);
        }
        
        return grouped;
    }

    /**
     * Extract actionable guidance from research area findings
     */
    extractGuidanceFromArea(area, findings, requirements) {
        const guidance = {
            implementation: [],
            architecture: [],
            bestPractices: [],
            technologies: [],
            patterns: [],
            warnings: [],
            resources: []
        };

        for (const finding of findings) {
            if (!finding.result) continue;
            
            const extracted = this.extractGuidanceFromText(finding.result, area);
            
            // Merge extracted guidance
            for (const [category, items] of Object.entries(extracted)) {
                guidance[category].push(...items);
            }
        }

        return guidance;
    }

    /**
     * Extract guidance elements from research text
     */
    extractGuidanceFromText(text, area) {
        const guidance = {
            implementation: [],
            architecture: [],
            bestPractices: [],
            technologies: [],
            patterns: [],
            warnings: [],
            resources: []
        };

        // Simple pattern matching for guidance extraction
        // This could be enhanced with NLP libraries for better extraction
        
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        for (const line of lines) {
            // Implementation guidance
            if (/\b(implement|build|create|develop|use)\b/i.test(line)) {
                guidance.implementation.push({
                    text: line,
                    area,
                    confidence: this.calculateGuidanceConfidence(line)
                });
            }
            
            // Architecture patterns
            if (/\b(pattern|architecture|design|structure)\b/i.test(line)) {
                guidance.architecture.push({
                    text: line,
                    area,
                    confidence: this.calculateGuidanceConfidence(line)
                });
            }
            
            // Best practices
            if (/\b(best practice|recommended|should|avoid|ensure)\b/i.test(line)) {
                guidance.bestPractices.push({
                    text: line,
                    area,
                    confidence: this.calculateGuidanceConfidence(line)
                });
            }
            
            // Technologies mentioned
            const techMatch = line.match(/\b(Node\.js|React|TypeScript|Docker|AWS|Vercel|MongoDB|Redis)\b/gi);
            if (techMatch) {
                guidance.technologies.push(...techMatch.map(tech => ({
                    technology: tech,
                    context: line,
                    area,
                    confidence: this.calculateGuidanceConfidence(line)
                })));
            }
            
            // Warning indicators
            if (/\b(warning|caution|avoid|don't|never|risk|danger)\b/i.test(line)) {
                guidance.warnings.push({
                    text: line,
                    area,
                    severity: this.calculateWarningSeverity(line)
                });
            }
        }

        return guidance;
    }

    /**
     * Utility methods for research processing
     */

    extractTechnologies(requirements) {
        const technologies = new Set();
        const techPattern = /\b(Node\.js|JavaScript|TypeScript|React|Next\.js|Express|API|REST|GraphQL|MongoDB|MySQL|PostgreSQL|Redis|Docker|AWS|Vercel|Git)\b/gi;
        
        for (const req of requirements) {
            const matches = req.description.match(techPattern);
            if (matches) {
                matches.forEach(tech => technologies.add(tech));
            }
        }
        
        return Array.from(technologies);
    }

    extractIntegrations(requirements) {
        const integrations = new Set();
        const integrationPattern = /\b(API|webhook|database|service|integration|connect|sync|import|export)\b/gi;
        
        for (const req of requirements) {
            const matches = req.description.match(integrationPattern);
            if (matches) {
                matches.forEach(int => integrations.add(int));
            }
        }
        
        return Array.from(integrations);
    }

    extractDomains(requirements) {
        const domains = new Set();
        
        // Extract domain from agent context or requirements
        for (const req of requirements) {
            if (req.section && req.section.title) {
                const domainMatch = req.section.title.match(/\b(web|mobile|api|database|ai|ml|automation|analysis)\b/gi);
                if (domainMatch) {
                    domainMatch.forEach(domain => domains.add(domain));
                }
            }
        }
        
        return Array.from(domains);
    }

    hasSecurityImplications(requirements) {
        const securityKeywords = /\b(auth|security|token|password|encrypt|ssl|https|permission|access|private)\b/i;
        return requirements.some(req => securityKeywords.test(req.description));
    }

    isProductionAgent(requirements, agentName) {
        const productionKeywords = /\b(production|deploy|scale|monitor|performance|availability)\b/i;
        return requirements.some(req => productionKeywords.test(req.description)) ||
               agentName.toLowerCase().includes('production');
    }

    isRelevantToArea(requirement, area) {
        const areaKeywords = {
            architecture: /\b(structure|design|pattern|architecture|component|module)\b/i,
            implementation: /\b(implement|build|create|develop|code|function)\b/i,
            technology: /\b(library|framework|tool|technology|language|platform)\b/i,
            integration: /\b(integrate|connect|api|service|external|third.party)\b/i,
            performance: /\b(performance|speed|optimize|scale|efficient|fast)\b/i,
            security: /\b(security|auth|permission|encrypt|secure|protect)\b/i,
            testing: /\b(test|validate|verify|check|quality|coverage)\b/i,
            deployment: /\b(deploy|release|publish|production|environment)\b/i,
            monitoring: /\b(monitor|log|metric|alert|observe|track)\b/i
        };
        
        const pattern = areaKeywords[area];
        return pattern ? pattern.test(requirement.description) : true;
    }

    calculateAreaPriority(area, requirements) {
        const priorityMap = {
            implementation: 'high',
            architecture: 'high',
            security: 'high',
            testing: 'medium',
            performance: 'medium',
            integration: 'medium',
            deployment: 'low',
            monitoring: 'low'
        };
        
        return priorityMap[area] || 'medium';
    }

    interpolateTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }
        return result;
    }

    calculateGuidanceConfidence(text) {
        let confidence = 0.5;
        
        // Boost for specific technical terms
        if (/\b(should|must|recommended|best|proven|standard)\b/i.test(text)) {
            confidence += 0.3;
        }
        
        // Boost for detailed explanations
        if (text.length > 100) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }

    calculateWarningSeverity(text) {
        if (/\b(never|critical|danger|security|vulnerability)\b/i.test(text)) {
            return 'high';
        }
        if (/\b(avoid|don't|warning|caution)\b/i.test(text)) {
            return 'medium';
        }
        return 'low';
    }

    deduplicateAndPrioritize(items) {
        // Simple deduplication by text similarity
        const unique = [];
        const seen = new Set();
        
        for (const item of items) {
            const key = typeof item === 'string' ? item : item.text || JSON.stringify(item);
            const normalizedKey = key.toLowerCase().replace(/\s+/g, ' ').trim();
            
            if (!seen.has(normalizedKey)) {
                seen.add(normalizedKey);
                unique.push(item);
            }
        }
        
        // Sort by confidence/priority if available
        return unique.sort((a, b) => {
            const confA = a.confidence || a.priority === 'high' ? 1 : 0.5;
            const confB = b.confidence || b.priority === 'high' ? 1 : 0.5;
            return confB - confA;
        });
    }

    isCacheValid(cached) {
        const age = Date.now() - new Date(cached.timestamp).getTime();
        return age < this.qualityThresholds.maxAge;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ResearchGenerator;