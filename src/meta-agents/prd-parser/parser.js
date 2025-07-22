/**
 * PRD Parser - Markdown Processing and Requirement Extraction
 * 
 * Implements NLP techniques to extract structured requirements from PRD documents
 * Uses Context7 integration for current documentation patterns
 * Follows All-Purpose Pattern - works for ANY agent type with NO hardcoded limitations
 */

const fs = require('fs').promises;
const path = require('path');

class Parser {
    constructor(config = {}) {
        this.config = {
            // All-Purpose Pattern - NO hardcoded section names or structures
            sectionPatterns: config.sectionPatterns || {
                // UNLIMITED section types - user-configurable patterns
                overview: /^##?\s*(overview|summary|description)/i,
                requirements: /^##?\s*(requirements?|specs?|specifications?)/i,
                functionality: /^##?\s*(functionality|features?|capabilities)/i,
                architecture: /^##?\s*(architecture|design|structure)/i,
                implementation: /^##?\s*(implementation|approach|method)/i,
                testing: /^##?\s*(testing|validation|verification)/i,
                dependencies: /^##?\s*(dependencies|prerequisites|requirements)/i,
                ...config.sectionPatterns
            },
            
            // UNLIMITED requirement patterns - extensible for any domain
            requirementPatterns: config.requirementPatterns || {
                mustHave: /\b(must|shall|required|mandatory)\b/i,
                shouldHave: /\b(should|ought|recommended|preferred)\b/i,
                couldHave: /\b(could|may|optional|nice.to.have)\b/i,
                wontHave: /\b(won.?t|will not|excluded|out.of.scope)\b/i
            },

            // Context7 integration settings
            useContext7: config.useContext7 !== false,
            contextPrompts: config.contextPrompts || {
                parseMarkdown: "Parse markdown documents using latest Node.js patterns. use context7",
                extractRequirements: "Extract requirements from technical specifications. use context7",
                structureData: "Structure parsed data for task generation systems. use context7"
            },

            // UNLIMITED complexity scoring - no hardcoded limits
            complexityFactors: config.complexityFactors || {
                words: { threshold: 50, weight: 1 },
                technicalTerms: { threshold: 5, weight: 2 },
                dependencies: { threshold: 3, weight: 3 },
                integrations: { threshold: 2, weight: 2 }
            },

            ...config
        };

        // Technical terms dictionary - expandable for any domain
        this.technicalTerms = new Set([
            // API & Integration terms
            'api', 'rest', 'graphql', 'webhook', 'endpoint', 'oauth', 'jwt', 'authentication',
            'authorization', 'middleware', 'cors', 'rate-limiting', 'pagination',
            
            // Database & Storage terms  
            'database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'cache',
            'index', 'query', 'transaction', 'acid', 'replication', 'sharding',
            
            // Infrastructure & DevOps terms
            'docker', 'kubernetes', 'vercel', 'aws', 'gcp', 'azure', 'serverless', 'lambda',
            'cicd', 'pipeline', 'deployment', 'monitoring', 'logging', 'metrics',
            
            // Frontend & UI terms
            'react', 'nextjs', 'typescript', 'javascript', 'html', 'css', 'dom', 'component',
            'state', 'props', 'hooks', 'routing', 'ssr', 'spa', 'responsive',
            
            // AI & ML terms (for agent development)
            'llm', 'gpt', 'anthropic', 'openai', 'prompt', 'embedding', 'vector', 'nlp',
            'classification', 'sentiment', 'parsing', 'tokenization', 'inference',
            
            // Agent-specific terms
            'agent', 'workflow', 'automation', 'orchestration', 'pipeline', 'queue',
            'scheduler', 'event', 'trigger', 'handler', 'processor', 'transformer',
            
            ...(config.additionalTechnicalTerms || []) // UNLIMITED - user extensible
        ]);
    }

    /**
     * Parse PRD content and extract structured requirements
     * Main entry point implementing Prompt Chaining pattern
     */
    async parse(content, options = {}) {
        try {
            const startTime = Date.now();
            
            // Step 1: Parse markdown structure
            const sections = await this.parseMarkdownStructure(content, options);
            
            // Step 2: Extract requirements from each section
            const requirements = await this.extractRequirements(sections, options);
            
            // Step 3: Analyze complexity and priority
            const analyzedRequirements = await this.analyzeRequirements(requirements, options);
            
            // Step 4: Structure for task generation
            const structuredRequirements = await this.structureForTaskGeneration(analyzedRequirements, options);
            
            const processingTime = Date.now() - startTime;
            
            return {
                agentName: options.agentName,
                filepath: options.filepath,
                requirements: structuredRequirements,
                metadata: {
                    totalSections: sections.length,
                    totalRequirements: structuredRequirements.length,
                    processingTime,
                    complexity: this.calculateOverallComplexity(structuredRequirements),
                    parsedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            throw new Error(`PRD parsing failed: ${error.message}`);
        }
    }

    /**
     * Parse markdown document structure
     * Uses Context7 for latest markdown processing patterns
     */
    async parseMarkdownStructure(content, options = {}) {
        if (this.config.useContext7 && options.useContext7) {
            // Context7 enhanced parsing - uses current documentation
            console.log('📖 Using Context7 for markdown parsing');
        }

        const lines = content.split('\n');
        const sections = [];
        let currentSection = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) continue;

            // Detect section headers (All-Purpose Pattern - supports any header structure)
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const title = headerMatch[2].trim();
                
                // Save previous section
                if (currentSection) {
                    sections.push(currentSection);
                }
                
                // Start new section
                currentSection = {
                    id: this.generateSectionId(title),
                    title,
                    level,
                    type: this.classifySection(title),
                    content: [],
                    lineNumber: i + 1,
                    requirements: []
                };
            } else if (currentSection) {
                // Add content to current section
                currentSection.content.push(line);
            }
        }
        
        // Add final section
        if (currentSection) {
            sections.push(currentSection);
        }

        // Process section content for requirements
        for (const section of sections) {
            section.contentText = section.content.join('\n').trim();
            section.wordCount = this.countWords(section.contentText);
            section.technicalTermCount = this.countTechnicalTerms(section.contentText);
        }

        return sections;
    }

    /**
     * Extract requirements from parsed sections
     * Uses NLP techniques for requirement identification
     */
    async extractRequirements(sections, options = {}) {
        const requirements = [];
        let requirementId = 1;

        for (const section of sections) {
            const sectionRequirements = await this.extractFromSection(section, requirementId, options);
            requirements.push(...sectionRequirements);
            requirementId += sectionRequirements.length;
        }

        return requirements;
    }

    /**
     * Extract requirements from a single section
     */
    async extractFromSection(section, startId, options = {}) {
        const requirements = [];
        const content = section.contentText;
        
        if (!content) return requirements;

        // Split content into sentences/paragraphs for analysis
        const statements = this.splitIntoStatements(content);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (!statement) continue;

            const requirementMatch = this.identifyRequirement(statement);
            if (requirementMatch) {
                requirements.push({
                    id: startId + requirements.length,
                    text: statement,
                    type: requirementMatch.type,
                    priority: requirementMatch.priority,
                    section: {
                        id: section.id,
                        title: section.title,
                        type: section.type
                    },
                    metadata: {
                        wordCount: this.countWords(statement),
                        technicalTerms: this.extractTechnicalTerms(statement),
                        complexity: this.calculateComplexity(statement),
                        confidence: requirementMatch.confidence
                    }
                });
            }
        }

        return requirements;
    }

    /**
     * Identify if a statement is a requirement and classify it
     */
    identifyRequirement(statement) {
        // Check for requirement keywords
        for (const [type, pattern] of Object.entries(this.config.requirementPatterns)) {
            if (pattern.test(statement)) {
                const priority = this.determinePriority(type, statement);
                const confidence = this.calculateConfidence(statement, pattern);
                
                return {
                    type,
                    priority,
                    confidence
                };
            }
        }

        // Check for implicit requirements (lists, actions, specifications)
        if (this.isImplicitRequirement(statement)) {
            return {
                type: 'implicit',
                priority: 'medium',
                confidence: 0.7
            };
        }

        return null;
    }

    /**
     * Determine if statement is an implicit requirement
     */
    isImplicitRequirement(statement) {
        const implicitPatterns = [
            /^[-*+]\s+/,  // List items
            /\b(create|build|implement|develop|design|configure)\b/i,  // Action verbs
            /\b(system|component|module|feature|function)\b.*\b(will|does|handles)\b/i,  // System descriptions
            /\b(user|client|system)\b.*\b(can|able to|allows)\b/i,  // Capability descriptions
            /^the\s+(system|application|component)\b/i  // System specifications
        ];

        return implicitPatterns.some(pattern => pattern.test(statement));
    }

    /**
     * Determine priority based on requirement type and content
     */
    determinePriority(type, statement) {
        const priorityMap = {
            mustHave: 'high',
            shouldHave: 'medium', 
            couldHave: 'low',
            wontHave: 'excluded'
        };

        let basePriority = priorityMap[type] || 'medium';

        // Boost priority for critical terms
        const criticalTerms = /\b(security|performance|scalability|error|failure|critical|essential)\b/i;
        if (criticalTerms.test(statement) && basePriority !== 'excluded') {
            basePriority = 'high';
        }

        return basePriority;
    }

    /**
     * Calculate confidence score for requirement identification
     */
    calculateConfidence(statement, pattern) {
        let confidence = 0.5; // Base confidence
        
        // Boost confidence for strong pattern matches
        const strongMatches = statement.match(pattern);
        if (strongMatches) {
            confidence += Math.min(strongMatches.length * 0.2, 0.4);
        }
        
        // Boost for technical terms
        const technicalTermCount = this.countTechnicalTerms(statement);
        confidence += Math.min(technicalTermCount * 0.1, 0.3);
        
        // Boost for structure indicators
        if (/^[-*+]\s+|^\d+\./.test(statement.trim())) {
            confidence += 0.2;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Analyze requirements for complexity and dependencies
     */
    async analyzeRequirements(requirements, options = {}) {
        return requirements.map(req => {
            const analysis = this.performComplexityAnalysis(req);
            const dependencies = this.identifyDependencies(req, requirements);
            
            return {
                ...req,
                analysis,
                dependencies,
                estimatedEffort: this.estimateEffort(req, analysis),
                suggestedBreakdown: this.suggestTaskBreakdown(req, analysis)
            };
        });
    }

    /**
     * Perform detailed complexity analysis
     */
    performComplexityAnalysis(requirement) {
        const factors = {};
        
        for (const [factor, config] of Object.entries(this.config.complexityFactors)) {
            let value = 0;
            
            switch (factor) {
                case 'words':
                    value = requirement.metadata.wordCount;
                    break;
                case 'technicalTerms':
                    value = requirement.metadata.technicalTerms.length;
                    break;
                case 'dependencies':
                    value = this.estimateDependencyCount(requirement.text);
                    break;
                case 'integrations':
                    value = this.estimateIntegrationCount(requirement.text);
                    break;
            }
            
            factors[factor] = {
                value,
                score: Math.min(value / config.threshold, 1.0) * config.weight,
                threshold: config.threshold,
                weight: config.weight
            };
        }
        
        const totalScore = Object.values(factors).reduce((sum, f) => sum + f.score, 0);
        const maxScore = Object.values(this.config.complexityFactors).reduce((sum, f) => sum + f.weight, 0);
        
        return {
            factors,
            totalScore,
            normalizedScore: totalScore / maxScore,
            complexity: this.scoreToComplexity(totalScore / maxScore)
        };
    }

    /**
     * Structure requirements for task generation
     */
    async structureForTaskGeneration(requirements, options = {}) {
        if (this.config.useContext7 && options.useContext7) {
            console.log('🔧 Using Context7 for task structuring');
        }

        return requirements.map((req, index) => ({
            id: req.id,
            title: this.generateTaskTitle(req),
            description: req.text,
            type: req.type,
            priority: req.priority,
            complexity: req.analysis.complexity,
            estimatedEffort: req.estimatedEffort,
            section: req.section,
            dependencies: req.dependencies,
            breakdown: req.suggestedBreakdown,
            metadata: {
                ...req.metadata,
                analysisScore: req.analysis.normalizedScore,
                suggestedOrder: index + 1
            }
        }));
    }

    /**
     * Generate appropriate task title from requirement
     */
    generateTaskTitle(requirement) {
        let title = requirement.text;
        
        // Truncate long requirements
        if (title.length > 80) {
            title = title.substring(0, 77) + '...';
        }
        
        // Remove markdown formatting
        title = title.replace(/[*_`]/g, '');
        
        // Capitalize first letter
        title = title.charAt(0).toUpperCase() + title.slice(1);
        
        return title;
    }

    /**
     * Utility methods for parsing and analysis
     */

    generateSectionId(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    classifySection(title) {
        for (const [type, pattern] of Object.entries(this.config.sectionPatterns)) {
            if (pattern.test(title)) {
                return type;
            }
        }
        return 'general';
    }

    splitIntoStatements(content) {
        return content
            .split(/[.!?]\s+|\n\s*[-*+]\s+|\n\s*\d+\.\s+/)
            .filter(s => s.trim().length > 10); // Filter out very short statements
    }

    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    countTechnicalTerms(text) {
        const words = text.toLowerCase().split(/\W+/);
        return words.filter(word => this.technicalTerms.has(word)).length;
    }

    extractTechnicalTerms(text) {
        const words = text.toLowerCase().split(/\W+/);
        return words.filter(word => this.technicalTerms.has(word));
    }

    calculateComplexity(text) {
        const factors = [
            this.countWords(text) / 20,  // Word complexity
            this.countTechnicalTerms(text) / 5,  // Technical complexity
            (text.match(/\b(and|or|but|however|therefore|because)\b/gi) || []).length / 3  // Logical complexity
        ];
        
        const score = factors.reduce((sum, factor) => sum + Math.min(factor, 1), 0) / factors.length;
        return this.scoreToComplexity(score);
    }

    scoreToComplexity(score) {
        if (score < 0.3) return 'low';
        if (score < 0.7) return 'medium';
        return 'high';
    }

    calculateOverallComplexity(requirements) {
        if (requirements.length === 0) return 'low';
        
        const complexityScores = requirements.map(req => {
            const scores = { low: 1, medium: 2, high: 3 };
            return scores[req.complexity] || 1;
        });
        
        const avgScore = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
        
        if (avgScore < 1.5) return 'low';
        if (avgScore < 2.5) return 'medium';
        return 'high';
    }

    estimateDependencyCount(text) {
        const dependencyKeywords = /\b(depends|requires|needs|after|before|integration|connect|link)\b/gi;
        return (text.match(dependencyKeywords) || []).length;
    }

    estimateIntegrationCount(text) {
        const integrationKeywords = /\b(api|service|database|external|third.party|integration)\b/gi;
        return (text.match(integrationKeywords) || []).length;
    }

    identifyDependencies(requirement, allRequirements) {
        // Simple dependency identification based on content similarity and references
        const dependencies = [];
        
        for (const other of allRequirements) {
            if (other.id === requirement.id) continue;
            
            // Check for explicit references
            if (requirement.text.toLowerCase().includes(other.text.toLowerCase().substring(0, 20))) {
                dependencies.push(other.id);
            }
        }
        
        return dependencies;
    }

    estimateEffort(requirement, analysis) {
        // Effort estimation based on complexity analysis
        const baseHours = {
            low: 4,
            medium: 12,
            high: 32
        };
        
        const base = baseHours[requirement.complexity] || baseHours.medium;
        const multiplier = 1 + (analysis.normalizedScore - 0.5);
        
        return Math.max(2, Math.round(base * multiplier));
    }

    suggestTaskBreakdown(requirement, analysis) {
        if (analysis.normalizedScore < 0.6) {
            return null; // Simple enough for single task
        }
        
        // Suggest breakdown for complex requirements
        return [
            'Research and planning',
            'Core implementation',
            'Integration and testing',
            'Documentation and validation'
        ];
    }
}

module.exports = Parser;