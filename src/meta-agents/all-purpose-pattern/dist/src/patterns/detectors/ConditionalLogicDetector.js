"use strict";
/**
 * Conditional Logic Detector
 *
 * Detects if/switch statements based on hardcoded business values
 * Following All-Purpose Pattern: Identifies ANY hardcoded conditional constraints
 * Context7-enhanced with intelligent business logic pattern recognition
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalLogicDetector = void 0;
const types_1 = require("../types");
/**
 * Detects conditional logic that imposes business limitations
 * Examples: if (industry === 'automotive'), switch(userType) { case 'premium': ... }
 */
class ConditionalLogicDetector extends types_1.BasePatternDetector {
    constructor() {
        super(...arguments);
        this.name = 'ConditionalLogicDetector';
        this.description = 'Detects if/switch statements based on hardcoded business values that create limitations';
        this.version = '1.0.0';
        this.supportedNodeTypes = ['IfStatement', 'SwitchStatement', 'ConditionalExpression'];
        this.config = {
            enabled: true,
            severity: 'high',
            confidence: 0.8,
            businessValuePatterns: [
                // Industry patterns
                /^(automotive|dental|legal|healthcare|finance|retail|manufacturing|tech|technology)$/i,
                // Location patterns
                /^(us|usa|uk|ca|canada|au|australia|de|germany|fr|france)$/i,
                /^(north|south|east|west|central)$/i,
                /^(america|europe|asia|africa|oceania)$/i,
                // Business type patterns
                /^(premium|basic|standard|enterprise|professional|starter|pro)$/i,
                /^(small|medium|large|enterprise)$/i,
                /^(b2b|b2c|saas|ecommerce|marketplace)$/i,
                // User type patterns
                /^(admin|user|guest|member|customer|client|manager)$/i,
                /^(free|paid|trial|subscriber)$/i,
                // Status patterns
                /^(active|inactive|pending|approved|rejected|suspended)$/i,
                /^(enabled|disabled|on|off)$/i,
                // Size/Scale patterns
                /^(tiny|small|medium|large|huge|unlimited)$/i,
                /^(local|regional|national|global|international)$/i
            ],
            excludeVariableNames: [
                // Common non-business variables to ignore
                'debug', 'development', 'production', 'test', 'env', 'mode',
                'true', 'false', 'null', 'undefined',
                'success', 'error', 'loading', 'complete'
            ],
            minCasesForSwitchDetection: 2,
            checkComparisonOperators: ['===', '==', '!==', '!='],
            includeNestedConditions: true,
            detectTernaryOperators: true,
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
            // Handle IfStatement nodes
            if (node.type === 'IfStatement') {
                const ifResult = this.detectIfStatement(node, path, context);
                if (ifResult)
                    results.push(ifResult);
            }
            // Handle SwitchStatement nodes
            if (node.type === 'SwitchStatement') {
                const switchResult = this.detectSwitchStatement(node, path, context);
                if (switchResult)
                    results.push(switchResult);
            }
            // Handle ConditionalExpression nodes (ternary operators)
            if (node.type === 'ConditionalExpression' && this.config.detectTernaryOperators) {
                const ternaryResult = this.detectTernaryExpression(node, path, context);
                if (ternaryResult)
                    results.push(ternaryResult);
            }
        }
        catch (error) {
            console.warn(`ConditionalLogicDetector error in ${context.file}:`, error);
        }
        return results;
    }
    /**
     * Detect hardcoded business logic in if statements
     * Example: if (industry === 'automotive') { ... }
     */
    detectIfStatement(node, path, context) {
        const { test } = node;
        if (!test)
            return null;
        const businessLogicInfo = this.analyzeCondition(test, context);
        if (!businessLogicInfo)
            return null;
        const businessScore = this.calculateBusinessScore(businessLogicInfo, context);
        if (businessScore < 0.5)
            return null;
        const severity = this.calculateSeverity(node, path, context, 'high');
        const confidence = Math.min(businessScore, this.config.confidence || 0.8);
        return this.createResult('conditional_logic', node, path, context, {
            severity,
            description: `Hardcoded if statement checks business value '${businessLogicInfo.value}' creating limitations`,
            recommendation: `Replace with dynamic condition: if (userInput.${this.camelToConfigKey(businessLogicInfo.variable)} === userInput.${this.camelToConfigKey(businessLogicInfo.value)}) { ... }`,
            context: {
                ...this.createResult('conditional_logic', node, path, context).context,
                conditionType: 'if-statement',
                businessVariable: businessLogicInfo.variable,
                businessValue: businessLogicInfo.value,
                operator: businessLogicInfo.operator,
                hasElse: !!node.alternate
            },
            metadata: {
                confidence,
                impact: this.assessImpact(businessLogicInfo, node),
                fixComplexity: node.alternate ? 'moderate' : 'simple',
                tags: ['conditional-logic', 'if-statement', 'business-limitation'],
                businessScore,
                conditionComplexity: this.assessConditionComplexity(test)
            }
        });
    }
    /**
     * Detect hardcoded business logic in switch statements
     * Example: switch(userType) { case 'premium': ... case 'basic': ... }
     */
    detectSwitchStatement(node, path, context) {
        const { discriminant, cases } = node;
        if (!discriminant || !cases || cases.length < (this.config.minCasesForSwitchDetection || 2)) {
            return null;
        }
        const discriminantName = this.extractVariableName(discriminant) || '';
        const caseValues = this.extractCaseValues(cases);
        if (!this.shouldAnalyzeSwitch(discriminantName, caseValues, context)) {
            return null;
        }
        const businessScore = this.calculateSwitchBusinessScore(discriminantName, caseValues, context);
        if (businessScore < 0.5)
            return null;
        const severity = this.calculateSeverity(node, path, context, 'high');
        const confidence = Math.min(businessScore, this.config.confidence || 0.8);
        return this.createResult('conditional_logic', node, path, context, {
            severity,
            description: `Hardcoded switch statement on '${discriminantName}' with ${caseValues.length} business-specific cases`,
            recommendation: `Replace with dynamic mapping: const handler = userInput.${this.camelToConfigKey(discriminantName)}Handlers[${discriminantName}]; if (handler) handler();`,
            context: {
                ...this.createResult('conditional_logic', node, path, context).context,
                conditionType: 'switch-statement',
                discriminant: discriminantName,
                caseValues: caseValues,
                caseCount: cases.length,
                hasDefault: cases.some((c) => c.test === null)
            },
            metadata: {
                confidence,
                impact: caseValues.length > 5 ? 'breaking' : 'major',
                fixComplexity: cases.length > 10 ? 'complex' : 'moderate',
                tags: ['conditional-logic', 'switch-statement', 'business-limitation'],
                businessScore,
                caseCount: cases.length,
                businessValues: caseValues
            }
        });
    }
    /**
     * Detect hardcoded business logic in ternary expressions
     * Example: userType === 'premium' ? premiumFeatures : basicFeatures
     */
    detectTernaryExpression(node, path, context) {
        const { test } = node;
        if (!test)
            return null;
        const businessLogicInfo = this.analyzeCondition(test, context);
        if (!businessLogicInfo)
            return null;
        const businessScore = this.calculateBusinessScore(businessLogicInfo, context);
        if (businessScore < 0.6)
            return null; // Higher threshold for ternary
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(businessScore, this.config.confidence || 0.8);
        return this.createResult('conditional_logic', node, path, context, {
            severity,
            description: `Hardcoded ternary expression checks business value '${businessLogicInfo.value}'`,
            recommendation: `Replace with dynamic ternary: userInput.${this.camelToConfigKey(businessLogicInfo.variable)} === userInput.${this.camelToConfigKey(businessLogicInfo.value)} ? ... : ...`,
            context: {
                ...this.createResult('conditional_logic', node, path, context).context,
                conditionType: 'ternary-expression',
                businessVariable: businessLogicInfo.variable,
                businessValue: businessLogicInfo.value,
                operator: businessLogicInfo.operator
            },
            metadata: {
                confidence,
                impact: 'minor',
                fixComplexity: 'simple',
                tags: ['conditional-logic', 'ternary-expression', 'business-limitation'],
                businessScore
            }
        });
    }
    /**
     * Analyze a condition to extract business logic patterns
     */
    analyzeCondition(test, context) {
        // Handle binary expressions (===, ==, !==, !=)
        if (test.type === 'BinaryExpression') {
            const { left, right, operator } = test;
            if (!this.config.checkComparisonOperators?.includes(operator)) {
                return null;
            }
            let variable = '';
            let value = '';
            // Extract variable and value from comparison
            if (left.type === 'Identifier' && right.type === 'StringLiteral') {
                variable = left.name;
                value = right.value;
            }
            else if (left.type === 'StringLiteral' && right.type === 'Identifier') {
                variable = right.name;
                value = left.value;
            }
            else if (left.type === 'MemberExpression' && right.type === 'StringLiteral') {
                variable = this.extractVariableName(left) || '';
                value = right.value;
            }
            else if (left.type === 'StringLiteral' && right.type === 'MemberExpression') {
                variable = this.extractVariableName(right) || '';
                value = left.value;
            }
            if (variable && value && this.isBusinessValue(variable, value, context)) {
                return { variable, value, operator };
            }
        }
        // Handle member expressions (object.property checks)
        if (test.type === 'MemberExpression') {
            const variable = this.extractVariableName(test) || '';
            if (variable && this.isBusinessVariable(variable, context)) {
                return { variable, value: 'truthy-check', operator: 'truthy' };
            }
        }
        return null;
    }
    /**
     * Extract variable name from various AST node types
     */
    extractVariableName(node) {
        if (node.type === 'Identifier') {
            return node.name;
        }
        if (node.type === 'MemberExpression') {
            const object = this.extractVariableName(node.object);
            const property = node.property?.name || '';
            return object ? `${object}.${property}` : property;
        }
        return null;
    }
    /**
     * Extract case values from switch statement cases
     */
    extractCaseValues(cases) {
        return cases
            .filter(c => c.test && c.test.type === 'StringLiteral')
            .map(c => c.test.value)
            .filter(value => typeof value === 'string');
    }
    /**
     * Determine if a switch statement should be analyzed
     */
    shouldAnalyzeSwitch(discriminant, caseValues, context) {
        const config = this.config;
        // Check excluded variables
        const excludeNames = config.excludeVariableNames || [];
        if (excludeNames.some(excluded => discriminant.toLowerCase().includes(excluded.toLowerCase()))) {
            return false;
        }
        // Check if case values look like business logic
        return caseValues.some(value => this.isBusinessValue(discriminant, value, context));
    }
    /**
     * Check if a variable-value combination represents business logic
     */
    isBusinessValue(variable, value, context) {
        const config = this.config;
        // Check if variable name suggests business logic
        if (!this.isBusinessVariable(variable, context)) {
            return false;
        }
        // Check if value matches business patterns
        const businessPatterns = config.businessValuePatterns || [];
        return businessPatterns.some(pattern => pattern.test(value));
    }
    /**
     * Check if a variable name suggests business logic
     */
    isBusinessVariable(variable, context) {
        const businessVariablePatterns = [
            /industry|industries|sector|business/i,
            /country|region|location|territory/i,
            /type|kind|category|classification/i,
            /plan|tier|level|package/i,
            /user|customer|client|account/i,
            /role|permission|access/i,
            /status|state|mode/i,
            /size|scale|scope/i
        ];
        return businessVariablePatterns.some(pattern => pattern.test(variable));
    }
    /**
     * Calculate business logic score for conditions
     */
    calculateBusinessScore(businessInfo, context) {
        let score = 0;
        // Score based on variable name
        if (this.isBusinessVariable(businessInfo.variable, context)) {
            score += 0.4;
        }
        // Score based on value patterns
        const config = this.config;
        const businessPatterns = config.businessValuePatterns || [];
        const valueMatches = businessPatterns.filter(pattern => pattern.test(businessInfo.value)).length;
        score += Math.min(valueMatches * 0.3, 0.6);
        // Bonus for exact operator matches (=== is more suspicious than ==)
        if (businessInfo.operator === '===') {
            score += 0.1;
        }
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Calculate business logic score for switch statements
     */
    calculateSwitchBusinessScore(discriminant, caseValues, context) {
        let score = 0;
        // Score based on discriminant variable name
        if (this.isBusinessVariable(discriminant, context)) {
            score += 0.3;
        }
        // Score based on case values
        const config = this.config;
        const businessPatterns = config.businessValuePatterns || [];
        const businessValueCount = caseValues.filter(value => businessPatterns.some(pattern => pattern.test(value))).length;
        const businessValueRatio = businessValueCount / caseValues.length;
        score += businessValueRatio * 0.7;
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Assess the impact of conditional business logic
     */
    assessImpact(businessInfo, node) {
        // Industry/location checks are typically breaking
        if (businessInfo.variable.toLowerCase().includes('industry') ||
            businessInfo.variable.toLowerCase().includes('country')) {
            return 'breaking';
        }
        // User type checks are major
        if (businessInfo.variable.toLowerCase().includes('user') ||
            businessInfo.variable.toLowerCase().includes('type')) {
            return 'major';
        }
        // If statement with else is more impactful
        if (node.alternate) {
            return 'major';
        }
        return 'minor';
    }
    /**
     * Assess the complexity of a condition
     */
    assessConditionComplexity(test) {
        if (test.type === 'BinaryExpression') {
            return 'simple';
        }
        if (test.type === 'LogicalExpression') {
            return 'moderate';
        }
        return 'complex';
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
exports.ConditionalLogicDetector = ConditionalLogicDetector;
//# sourceMappingURL=ConditionalLogicDetector.js.map