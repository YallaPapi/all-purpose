"use strict";
/**
 * Limitation Constant Detector
 *
 * Detects hardcoded numeric constants that impose business limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded constraint values
 * Context7-enhanced with intelligent limitation pattern recognition
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LimitationConstantDetector = void 0;
const types_1 = require("../types");
/**
 * Detects hardcoded numeric constants that represent limitations
 * Examples: const maxItems = 50; const limitPerUser = 10; const MAX_INDUSTRIES = 25;
 */
class LimitationConstantDetector extends types_1.BasePatternDetector {
    constructor() {
        super(...arguments);
        this.name = 'LimitationConstantDetector';
        this.description = 'Detects hardcoded numeric constants that impose business limitations or constraints';
        this.version = '1.0.0';
        this.supportedNodeTypes = ['VariableDeclarator', 'Property', 'AssignmentExpression'];
        this.config = {
            enabled: true,
            severity: 'high',
            confidence: 0.8,
            minLimitValue: 1, // Values < 1 might be valid constants (0, -1, etc.)
            maxLimitValue: 100000, // UNLIMITED but reasonable for detection
            limitationPatterns: [
                // Explicit limitation words
                /^(max|maximum|min|minimum|limit|limits)(_|[A-Z])/i,
                /^(cap|ceiling|floor|threshold|quota|budget)/i,
                /(limit|max|min|restriction|constraint|boundary)$/i,
                // Count/quantity limitations
                /^(count|total|number|num|qty|quantity)(_|[A-Z])/i,
                /(count|total|number|num|qty|quantity)$/i,
                // Business-specific limitations
                /^(user|customer|client|account)(_|[A-Z]).*(limit|max|count)/i,
                /^(item|product|service|feature)(_|[A-Z]).*(limit|max|count)/i,
                /^(industry|location|region|country)(_|[A-Z]).*(limit|max|count)/i,
                // Size limitations
                /^(size|length|width|height|depth)(_|[A-Z])/i,
                /(size|length|width|height|depth)$/i,
                // Time limitations  
                /^(timeout|duration|interval|delay)(_|[A-Z])/i,
                /(timeout|duration|interval|delay)$/i,
                // Rate limitations
                /^(rate|frequency|speed|throttle)(_|[A-Z])/i,
                /(rate|frequency|speed|throttle)$/i
            ],
            excludeConstants: [
                // Common non-limitation constants
                100, 200, 300, 400, 500, // HTTP status codes
                1000, 2000, 3000, 5000, 8000, 9000, // Port numbers
                24, 60, 3600, 86400, // Time constants (hours, minutes, seconds, day)
                0, 1, 2, 10, // Very common programming constants
            ],
            checkVariableNamesOnly: false, // Also check values for suspiciously limiting numbers
            includeZeroValues: false, // Usually zero is a valid default, not a limitation
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
                const variableResult = this.detectVariableLimitation(node, path, context);
                if (variableResult)
                    results.push(variableResult);
            }
            // Handle Property nodes (object properties)
            if (node.type === 'Property') {
                const propertyResult = this.detectPropertyLimitation(node, path, context);
                if (propertyResult)
                    results.push(propertyResult);
            }
            // Handle AssignmentExpression nodes
            if (node.type === 'AssignmentExpression') {
                const assignmentResult = this.detectAssignmentLimitation(node, path, context);
                if (assignmentResult)
                    results.push(assignmentResult);
            }
        }
        catch (error) {
            console.warn(`LimitationConstantDetector error in ${context.file}:`, error);
        }
        return results;
    }
    /**
     * Detect limitation constants in variable declarations
     * Example: const maxUsers = 100; const USER_LIMIT = 50;
     */
    detectVariableLimitation(node, path, context) {
        const { id, init } = node;
        if (!id || !init || init.type !== 'NumericLiteral') {
            return null;
        }
        const variableName = id.name || '';
        const numericValue = init.value;
        if (!this.shouldAnalyzeConstant(variableName, numericValue, context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(variableName, numericValue, context);
        if (limitationScore < 0.5) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'high');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.8);
        return this.createResult('limitation_constant', node, path, context, {
            severity,
            description: `Hardcoded limitation constant '${variableName}' = ${numericValue} imposes business constraints`,
            recommendation: `Remove hardcoded limit or make configurable: const ${variableName} = userInput.${this.camelToConfigKey(variableName)} || DEFAULT_VALUE;`,
            context: {
                ...this.createResult('limitation_constant', node, path, context).context,
                variableName,
                numericValue,
                limitationPatterns: this.getMatchingLimitationPatterns(variableName),
                isUpperCase: variableName === variableName.toUpperCase()
            },
            metadata: {
                confidence,
                impact: this.assessImpact(numericValue, variableName),
                fixComplexity: this.isExported(path) ? 'moderate' : 'simple',
                tags: ['limitation-constant', 'business-constraint', 'variable-declaration'],
                limitationScore,
                numericValue,
                limitationType: this.classifyLimitationType(variableName, numericValue)
            }
        });
    }
    /**
     * Detect limitation constants in object properties
     * Example: { maxItems: 50, userLimit: 100 }
     */
    detectPropertyLimitation(node, path, context) {
        const { key, value } = node;
        if (!key || !value || value.type !== 'NumericLiteral') {
            return null;
        }
        const propertyName = key.name || key.value || '';
        const numericValue = value.value;
        if (!this.shouldAnalyzeConstant(propertyName, numericValue, context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(propertyName, numericValue, context);
        if (limitationScore < 0.5) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.8);
        return this.createResult('limitation_constant', node, path, context, {
            severity,
            description: `Hardcoded limitation property '${propertyName}' = ${numericValue} creates business constraints`,
            recommendation: `Replace with configurable property: ${propertyName}: userInput.${this.camelToConfigKey(propertyName)} || DEFAULT_VALUE`,
            context: {
                ...this.createResult('limitation_constant', node, path, context).context,
                propertyName,
                numericValue,
                limitationPatterns: this.getMatchingLimitationPatterns(propertyName)
            },
            metadata: {
                confidence,
                impact: this.assessImpact(numericValue, propertyName),
                fixComplexity: 'simple',
                tags: ['limitation-constant', 'object-property', 'business-constraint'],
                limitationScore,
                numericValue,
                limitationType: this.classifyLimitationType(propertyName, numericValue)
            }
        });
    }
    /**
     * Detect limitation constants in assignments
     * Example: this.maxUsers = 100; limits.itemCount = 50;
     */
    detectAssignmentLimitation(node, path, context) {
        const { left, right } = node;
        if (!right || right.type !== 'NumericLiteral') {
            return null;
        }
        const numericValue = right.value;
        let assignmentName = '';
        // Extract assignment target name
        if (left.type === 'Identifier') {
            assignmentName = left.name;
        }
        else if (left.type === 'MemberExpression' && left.property) {
            assignmentName = left.property.name || '';
        }
        if (!this.shouldAnalyzeConstant(assignmentName, numericValue, context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(assignmentName, numericValue, context);
        if (limitationScore < 0.5) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.8);
        return this.createResult('limitation_constant', node, path, context, {
            severity,
            description: `Hardcoded limitation assignment '${assignmentName}' = ${numericValue} imposes constraints`,
            recommendation: `Replace with configurable assignment: ${assignmentName} = userInput.${this.camelToConfigKey(assignmentName)} || DEFAULT_VALUE`,
            metadata: {
                confidence,
                impact: this.assessImpact(numericValue, assignmentName),
                fixComplexity: 'simple',
                tags: ['limitation-constant', 'assignment', 'business-constraint'],
                limitationScore,
                numericValue,
                limitationType: this.classifyLimitationType(assignmentName, numericValue)
            }
        });
    }
    /**
     * Determine if a constant should be analyzed based on configuration
     */
    shouldAnalyzeConstant(name, value, context) {
        const config = this.config;
        // Check value range
        if (value < (config.minLimitValue || 1))
            return false;
        if (value > (config.maxLimitValue || 100000))
            return false;
        // Check excluded constants
        const excludeValues = config.excludeConstants || [];
        if (excludeValues.includes(value))
            return false;
        // Check zero values setting
        if (value === 0 && !config.includeZeroValues)
            return false;
        // Check if only variable names should be considered
        if (config.checkVariableNamesOnly) {
            const limitationPatterns = config.limitationPatterns || [];
            return limitationPatterns.some(pattern => pattern.test(name));
        }
        return true;
    }
    /**
     * Calculate limitation score (0-1) based on naming and value patterns
     */
    calculateLimitationScore(name, value, context) {
        let score = 0;
        const config = this.config;
        // Check variable name against limitation patterns
        const limitationPatterns = config.limitationPatterns || [];
        const nameMatches = limitationPatterns.filter(pattern => pattern.test(name)).length;
        score += Math.min(nameMatches * 0.4, 0.8); // Up to 0.8 for name matches
        // Check for suspiciously limiting values
        const valueSuspicion = this.assessValueSuspicion(value);
        score += valueSuspicion * 0.3; // Up to 0.3 for suspicious values
        // Bonus for ALL_CAPS naming (often constants)
        if (name === name.toUpperCase() && name.includes('_')) {
            score += 0.2;
        }
        // Bonus for exported constants (likely part of public API)
        if (context.exports.includes(name)) {
            score += 0.1;
        }
        // Check context for business-related terms
        const contextScore = this.analyzeContext(name, context);
        score += contextScore * 0.1;
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Assess how suspicious a numeric value is as a business limitation
     */
    assessValueSuspicion(value) {
        // Common limiting values that suggest business constraints
        const suspiciousRanges = [
            { min: 5, max: 25, suspicion: 0.8 }, // Very common limits
            { min: 25, max: 100, suspicion: 0.6 }, // Common business limits
            { min: 100, max: 1000, suspicion: 0.4 }, // Moderate limits
            { min: 1000, max: 10000, suspicion: 0.2 } // Large but still suspicious
        ];
        for (const range of suspiciousRanges) {
            if (value >= range.min && value <= range.max) {
                return range.suspicion;
            }
        }
        // Round numbers are more suspicious
        if (value % 10 === 0 || value % 100 === 0) {
            return 0.3;
        }
        // Powers of 2 are often technical, less suspicious as business limits
        if (Number.isInteger(Math.log2(value))) {
            return 0.1;
        }
        return 0;
    }
    /**
     * Analyze surrounding context for business-related terms
     */
    analyzeContext(name, context) {
        const businessTerms = [
            'user', 'customer', 'client', 'account', 'subscription',
            'item', 'product', 'service', 'feature', 'license',
            'industry', 'location', 'region', 'country', 'market',
            'plan', 'tier', 'package', 'quota', 'allowance'
        ];
        const lowerName = name.toLowerCase();
        const matchingTerms = businessTerms.filter(term => lowerName.includes(term));
        return Math.min(matchingTerms.length * 0.3, 1.0);
    }
    /**
     * Assess the impact of a limitation based on value and context
     */
    assessImpact(value, name) {
        // Very low limits are likely breaking changes
        if (value <= 10)
            return 'breaking';
        // API or user-facing limits are major
        if (name.toLowerCase().includes('user') || name.toLowerCase().includes('api')) {
            return 'major';
        }
        // High limits might be minor issues
        if (value >= 1000)
            return 'minor';
        return 'major';
    }
    /**
     * Classify the type of limitation based on name and value
     */
    classifyLimitationType(name, value) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('user') || lowerName.includes('account'))
            return 'user-limit';
        if (lowerName.includes('item') || lowerName.includes('product'))
            return 'item-limit';
        if (lowerName.includes('rate') || lowerName.includes('throttle'))
            return 'rate-limit';
        if (lowerName.includes('size') || lowerName.includes('length'))
            return 'size-limit';
        if (lowerName.includes('time') || lowerName.includes('duration'))
            return 'time-limit';
        if (lowerName.includes('count') || lowerName.includes('number'))
            return 'count-limit';
        return 'general-limit';
    }
    /**
     * Get matching limitation patterns for context
     */
    getMatchingLimitationPatterns(name) {
        const config = this.config;
        const limitationPatterns = config.limitationPatterns || [];
        return limitationPatterns
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
exports.LimitationConstantDetector = LimitationConstantDetector;
//# sourceMappingURL=LimitationConstantDetector.js.map