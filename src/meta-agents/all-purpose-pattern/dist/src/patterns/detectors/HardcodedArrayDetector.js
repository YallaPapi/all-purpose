"use strict";
/**
 * Hardcoded Array Detector
 *
 * Detects hardcoded arrays that represent business limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded list constraints
 * Context7-enhanced with intelligent business logic detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardcodedArrayDetector = void 0;
const types_1 = require("../types");
/**
 * Detects hardcoded arrays that impose business limitations
 * Examples: ['automotive', 'dental', 'legal'], ['US', 'UK', 'CA'], ['max', 'premium']
 */
class HardcodedArrayDetector extends types_1.BasePatternDetector {
    constructor() {
        super(...arguments);
        this.name = 'HardcodedArrayDetector';
        this.description = 'Detects hardcoded arrays that represent business limitations or constraints';
        this.version = '1.0.0';
        this.supportedNodeTypes = ['VariableDeclarator', 'AssignmentExpression', 'Property'];
        this.config = {
            enabled: true,
            severity: 'high',
            confidence: 0.9,
            minArraySize: 2, // Arrays with 1 item might be valid constants
            maxArraySize: 1000, // UNLIMITED but reasonable for performance
            businessTermPatterns: [
                // Industry patterns
                /industry|industries|sector|sectors|business|company|companies/i,
                /automotive|dental|legal|healthcare|finance|retail|manufacturing/i,
                // Location patterns  
                /country|countries|region|regions|location|locations|state|states/i,
                /city|cities|zip|postal|address|geographic|geo/i,
                // Business type patterns
                /type|types|category|categories|kind|kinds|classification/i,
                /plan|plans|tier|tiers|level|levels|package|packages/i,
                // Limitation patterns
                /allowed|permitted|supported|available|valid|accepted/i,
                /max|min|limit|limits|constraint|constraints|restriction/i
            ],
            excludeVariableNames: [
                // Common non-business arrays to ignore
                'colors', 'themes', 'fonts', 'sizes', 'dimensions',
                'test', 'tests', 'mock', 'mocks', 'example', 'examples',
                'debug', 'development', 'dev', 'prod', 'production'
            ],
            includeOnlyExports: false,
            checkStringArraysOnly: true,
            customRules: {},
            excludePatterns: [],
            includePatterns: []
        };
    }
    detect(node, path, context) {
        if (!this.validateNode(node))
            return [];
        const results = [];
        try {
            // Handle VariableDeclarator nodes
            if (node.type === 'VariableDeclarator') {
                const arrayResult = this.detectVariableArray(node, path, context);
                if (arrayResult)
                    results.push(arrayResult);
            }
            // Handle Property nodes (object properties)
            if (node.type === 'Property') {
                const propertyResult = this.detectPropertyArray(node, path, context);
                if (propertyResult)
                    results.push(propertyResult);
            }
            // Handle AssignmentExpression nodes
            if (node.type === 'AssignmentExpression') {
                const assignmentResult = this.detectAssignmentArray(node, path, context);
                if (assignmentResult)
                    results.push(assignmentResult);
            }
        }
        catch (error) {
            // Graceful degradation - log but don't crash
            console.warn(`HardcodedArrayDetector error in ${context.file}:`, error);
        }
        return results;
    }
    /**
     * Detect hardcoded arrays in variable declarations
     * Example: const industries = ['automotive', 'dental', 'legal'];
     */
    detectVariableArray(node, path, context) {
        const { id, init } = node;
        if (!id || !init || init.type !== 'ArrayExpression') {
            return null;
        }
        const variableName = id.name || '';
        const arrayElements = init.elements || [];
        // Apply configuration filters
        if (!this.shouldAnalyzeArray(variableName, arrayElements, context)) {
            return null;
        }
        // Check if this looks like a business limitation array
        const businessScore = this.calculateBusinessScore(variableName, arrayElements, context);
        if (businessScore < 0.5) {
            return null; // Likely not a business limitation
        }
        const severity = this.calculateSeverity(node, path, context, 'high');
        const confidence = Math.min(businessScore, this.config.confidence || 0.9);
        return this.createResult('hardcoded_array', node, path, context, {
            severity,
            description: `Hardcoded array '${variableName}' with ${arrayElements.length} elements represents business limitations`,
            recommendation: `Replace with dynamic configuration: const ${variableName} = userInput.${this.camelToConfigKey(variableName)};`,
            context: {
                ...this.createResult('hardcoded_array', node, path, context).context,
                variableName,
                arraySize: arrayElements.length,
                elementTypes: this.getElementTypes(arrayElements),
                businessTermsFound: this.getMatchingBusinessTerms(variableName)
            },
            metadata: {
                confidence,
                impact: arrayElements.length > 10 ? 'breaking' : 'major',
                fixComplexity: this.isExported(path) ? 'moderate' : 'simple',
                tags: ['hardcoded-array', 'business-limitation', 'variable-declaration'],
                businessScore,
                arraySize: arrayElements.length
            }
        });
    }
    /**
     * Detect hardcoded arrays in object properties
     * Example: { supportedCountries: ['US', 'UK', 'CA'] }
     */
    detectPropertyArray(node, path, context) {
        const { key, value } = node;
        if (!key || !value || value.type !== 'ArrayExpression') {
            return null;
        }
        const propertyName = key.name || key.value || '';
        const arrayElements = value.elements || [];
        if (!this.shouldAnalyzeArray(propertyName, arrayElements, context)) {
            return null;
        }
        const businessScore = this.calculateBusinessScore(propertyName, arrayElements, context);
        if (businessScore < 0.5) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(businessScore, this.config.confidence || 0.9);
        return this.createResult('hardcoded_array', node, path, context, {
            severity,
            description: `Hardcoded array property '${propertyName}' imposes business limitations`,
            recommendation: `Replace with dynamic property: ${propertyName}: userInput.${this.camelToConfigKey(propertyName)}`,
            context: {
                ...this.createResult('hardcoded_array', node, path, context).context,
                propertyName,
                arraySize: arrayElements.length,
                elementTypes: this.getElementTypes(arrayElements)
            },
            metadata: {
                confidence,
                impact: 'major',
                fixComplexity: 'simple',
                tags: ['hardcoded-array', 'object-property', 'business-limitation'],
                businessScore,
                arraySize: arrayElements.length
            }
        });
    }
    /**
     * Detect hardcoded arrays in assignments
     * Example: this.allowedIndustries = ['tech', 'finance'];
     */
    detectAssignmentArray(node, path, context) {
        const { left, right } = node;
        if (!right || right.type !== 'ArrayExpression') {
            return null;
        }
        const arrayElements = right.elements || [];
        let assignmentName = '';
        // Extract assignment target name
        if (left.type === 'Identifier') {
            assignmentName = left.name;
        }
        else if (left.type === 'MemberExpression' && left.property) {
            assignmentName = left.property.name || '';
        }
        if (!this.shouldAnalyzeArray(assignmentName, arrayElements, context)) {
            return null;
        }
        const businessScore = this.calculateBusinessScore(assignmentName, arrayElements, context);
        if (businessScore < 0.5) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(businessScore, this.config.confidence || 0.9);
        return this.createResult('hardcoded_array', node, path, context, {
            severity,
            description: `Hardcoded array assignment '${assignmentName}' creates business limitations`,
            recommendation: `Replace with dynamic assignment: ${assignmentName} = userInput.${this.camelToConfigKey(assignmentName)}`,
            metadata: {
                confidence,
                impact: 'major',
                fixComplexity: 'simple',
                tags: ['hardcoded-array', 'assignment', 'business-limitation'],
                businessScore,
                arraySize: arrayElements.length
            }
        });
    }
    /**
     * Determine if an array should be analyzed based on configuration
     */
    shouldAnalyzeArray(name, elements, context) {
        const config = this.config;
        // Check array size limits
        if (elements.length < (config.minArraySize || 2))
            return false;
        if (elements.length > (config.maxArraySize || 1000))
            return false;
        // Check excluded variable names
        const excludeNames = config.excludeVariableNames || [];
        if (excludeNames.some(excluded => name.toLowerCase().includes(excluded.toLowerCase()))) {
            return false;
        }
        // Check if only string arrays should be analyzed
        if (config.checkStringArraysOnly) {
            const hasNonStringElements = elements.some(el => el && el.type !== 'StringLiteral' && el.type !== 'TemplateLiteral');
            if (hasNonStringElements)
                return false;
        }
        return true;
    }
    /**
     * Calculate business logic score (0-1) based on naming and content patterns
     */
    calculateBusinessScore(name, elements, context) {
        let score = 0;
        const config = this.config;
        // Check variable name against business term patterns
        const businessTerms = config.businessTermPatterns || [];
        const nameMatches = businessTerms.filter(pattern => pattern.test(name)).length;
        score += Math.min(nameMatches * 0.3, 0.6); // Up to 0.6 for name matches
        // Check array content for business-like strings
        const businessContentScore = this.analyzeArrayContent(elements);
        score += businessContentScore * 0.4; // Up to 0.4 for content
        // Bonus for exported arrays (likely part of public API)
        if (context.exports.includes(name)) {
            score += 0.2;
        }
        // Penalty for very generic names
        const genericNames = ['data', 'items', 'list', 'array', 'values'];
        if (genericNames.includes(name.toLowerCase())) {
            score -= 0.2;
        }
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Analyze array content to determine if it represents business logic
     */
    analyzeArrayContent(elements) {
        if (!elements.length)
            return 0;
        let businesslikeCount = 0;
        const totalStringElements = elements.filter(el => el && (el.type === 'StringLiteral' || el.type === 'TemplateLiteral')).length;
        if (totalStringElements === 0)
            return 0;
        // Check each string element for business-like characteristics
        elements.forEach(element => {
            if (element && element.type === 'StringLiteral') {
                const value = element.value?.toLowerCase() || '';
                // Look for industry names, country codes, business types, etc.
                const businessPatterns = [
                    /^[a-z]{2,3}$/, // Country codes: US, UK, CA
                    /industry|business|company|enterprise/i,
                    /finance|banking|healthcare|legal|retail|automotive/i,
                    /plan|tier|premium|basic|standard|enterprise/i,
                    /admin|manager|user|client|customer/i
                ];
                if (businessPatterns.some(pattern => pattern.test(value))) {
                    businesslikeCount++;
                }
                // Bonus for conventional business naming
                if (value.length > 2 && value.length < 20 && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
                    businesslikeCount += 0.5;
                }
            }
        });
        return businesslikeCount / totalStringElements;
    }
    /**
     * Get types of elements in array for metadata
     */
    getElementTypes(elements) {
        const types = new Set();
        elements.forEach(el => {
            if (el && el.type)
                types.add(el.type);
        });
        return Array.from(types);
    }
    /**
     * Get matching business terms for context
     */
    getMatchingBusinessTerms(name) {
        const config = this.config;
        const businessTerms = config.businessTermPatterns || [];
        return businessTerms
            .filter(pattern => pattern.test(name))
            .map(pattern => pattern.source);
    }
    /**
     * Convert camelCase to config key (snake_case)
     */
    camelToConfigKey(camelCase) {
        return camelCase
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, '');
    }
}
exports.HardcodedArrayDetector = HardcodedArrayDetector;
//# sourceMappingURL=HardcodedArrayDetector.js.map