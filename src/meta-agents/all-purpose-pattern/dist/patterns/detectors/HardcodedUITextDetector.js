"use strict";
/**
 * Hardcoded UI Text Detector
 *
 * Detects hardcoded user-facing text that creates business limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded user interface constraints
 * Context7-enhanced with intelligent UI limitation pattern recognition
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardcodedUITextDetector = void 0;
const types_1 = require("../types");
/**
 * Detects hardcoded UI text that imposes business limitations
 * Examples: 'Only available for automotive industry', 'Maximum 10 users', 'US customers only'
 */
class HardcodedUITextDetector extends types_1.BasePatternDetector {
    constructor() {
        super(...arguments);
        this.name = 'HardcodedUITextDetector';
        this.description = 'Detects hardcoded user-facing text that creates business limitations or constraints';
        this.version = '1.0.0';
        this.supportedNodeTypes = ['VariableDeclarator', 'Property', 'AssignmentExpression', 'StringLiteral', 'TemplateLiteral', 'JSXText', 'JSXExpressionContainer'];
        this.config = {
            enabled: true,
            severity: 'medium',
            confidence: 0.7,
            limitationPhrases: [
                // Explicit limitation language
                /only\s+(available|supported|for|in|with|works?)\s+/i,
                /limited\s+to\s+/i,
                /restricted\s+to\s+/i,
                /exclusive\s+(to|for)\s+/i,
                /not\s+(available|supported)\s+(in|for|with)\s+/i,
                // Quantity limitations
                /maximum\s+\d+/i,
                /minimum\s+\d+/i,
                /up\s+to\s+\d+/i,
                /\d+\s+(user|customer|item|product)s?\s+(max|maximum|limit)/i,
                /\d+\s+(user|customer|item|product)s?\s+only/i,
                // Geographic limitations
                /(us|usa|united\s+states)\s+(only|customers?|users?)/i,
                /(uk|canada|australia)\s+(only|customers?|users?)/i,
                /not\s+available\s+(in|for)\s+/i,
                /available\s+in\s+select/i,
                // Industry limitations
                /(automotive|dental|legal|healthcare|finance)\s+(only|customers?|users?|industry)/i,
                /designed\s+for\s+(automotive|dental|legal|healthcare|finance)/i,
                /not\s+suitable\s+for\s+/i,
                // Business model limitations
                /(premium|enterprise|professional)\s+(only|feature|plan|customers?)/i,
                /upgrade\s+to\s+(premium|pro|enterprise)/i,
                /requires\s+(premium|pro|enterprise)/i,
                // Service limitations
                /currently\s+unavailable/i,
                /temporarily\s+disabled/i,
                /coming\s+soon/i,
                /beta\s+feature/i,
                /experimental\s+feature/i
            ],
            businessTermPatterns: [
                // Industry terms
                /automotive|dental|legal|healthcare|finance|retail|manufacturing|tech|saas/i,
                // Geographic terms
                /america|europe|asia|africa|oceania|north|south|east|west/i,
                /us|usa|uk|canada|australia|germany|france|japan|china/i,
                // Business size terms
                /small|medium|large|enterprise|startup|corporation/i,
                // User type terms
                /premium|basic|standard|professional|enterprise|free|paid/i,
                /customer|client|user|member|subscriber|guest/i,
                // Limitation terms
                /limit|max|maximum|min|minimum|restriction|constraint/i
            ],
            excludeGenericText: true,
            minTextLength: 10, // Ignore very short strings
            maxTextLength: 500, // Ignore very long paragraphs
            checkTemplateStrings: true,
            uiContextPatterns: [
                // Variable names that suggest UI context
                /message|text|label|title|description|content/i,
                /error|warning|info|success|alert/i,
                /placeholder|tooltip|hint|help/i,
                /button|link|menu|modal|dialog/i
            ],
            minimumLimitationScore: 0.5,
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
                const variableResult = this.detectVariableUIText(node, path, context);
                if (variableResult)
                    results.push(variableResult);
            }
            // Handle Property nodes (object properties)
            if (node.type === 'Property') {
                const propertyResult = this.detectPropertyUIText(node, path, context);
                if (propertyResult)
                    results.push(propertyResult);
            }
            // Handle AssignmentExpression nodes
            if (node.type === 'AssignmentExpression') {
                const assignmentResult = this.detectAssignmentUIText(node, path, context);
                if (assignmentResult)
                    results.push(assignmentResult);
            }
            // Handle standalone StringLiteral nodes
            if (node.type === 'StringLiteral') {
                const stringResult = this.detectStringUIText(node, path, context);
                if (stringResult)
                    results.push(stringResult);
            }
            // Handle TemplateLiteral nodes
            if (node.type === 'TemplateLiteral' && this.config.checkTemplateStrings) {
                const templateResult = this.detectTemplateUIText(node, path, context);
                if (templateResult)
                    results.push(templateResult);
            }
            // Handle JSX text content
            if (node.type === 'JSXText') {
                const jsxResult = this.detectJSXUIText(node, path, context);
                if (jsxResult)
                    results.push(jsxResult);
            }
            // Handle JSX expression containers
            if (node.type === 'JSXExpressionContainer') {
                const jsxExprResult = this.detectJSXExpressionUIText(node, path, context);
                if (jsxExprResult)
                    results.push(jsxExprResult);
            }
        }
        catch (error) {
            console.warn(`HardcodedUITextDetector error in ${context.file}:`, error);
        }
        return results;
    }
    /**
     * Detect hardcoded UI text in variable declarations
     * Example: const errorMessage = 'Only available for premium users';
     */
    detectVariableUIText(node, path, context) {
        const { id, init } = node;
        if (!id || !init)
            return null;
        const variableName = id.name || '';
        const textInfo = this.extractTextFromValue(init);
        if (!textInfo || !this.shouldAnalyzeText(textInfo.value, variableName, context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(textInfo.value, variableName, context);
        if (limitationScore < (this.config.minimumLimitationScore || 0.5)) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.7);
        return this.createResult('hardcoded_text', node, path, context, {
            severity,
            description: `Hardcoded UI text '${variableName}' contains business limitations: "${this.truncateText(textInfo.value)}"`,
            recommendation: `Replace with dynamic text: const ${variableName} = userInput.messages.${this.camelToConfigKey(variableName)} || translations.get('${this.camelToConfigKey(variableName)}');`,
            context: {
                ...this.createResult('hardcoded_text', node, path, context).context,
                variableName,
                textValue: textInfo.value,
                textType: textInfo.type,
                uiContext: this.identifyUIContext(variableName),
                limitationPhrases: this.findLimitationPhrases(textInfo.value)
            },
            metadata: {
                confidence,
                impact: this.assessTextImpact(textInfo.value, variableName),
                fixComplexity: this.isExported(path) ? 'moderate' : 'simple',
                tags: ['hardcoded-text', 'ui-limitation', 'variable-declaration'],
                limitationScore,
                textLength: textInfo.value.length,
                uiContext: this.identifyUIContext(variableName)
            }
        });
    }
    /**
     * Detect hardcoded UI text in object properties
     * Example: { placeholder: 'Enter US phone number' }
     */
    detectPropertyUIText(node, path, context) {
        const { key, value } = node;
        if (!key || !value)
            return null;
        const propertyName = key.name || key.value || '';
        const textInfo = this.extractTextFromValue(value);
        if (!textInfo || !this.shouldAnalyzeText(textInfo.value, propertyName, context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(textInfo.value, propertyName, context);
        if (limitationScore < (this.config.minimumLimitationScore || 0.5)) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.7);
        return this.createResult('hardcoded_text', node, path, context, {
            severity,
            description: `Hardcoded UI text property '${propertyName}' contains limitations: "${this.truncateText(textInfo.value)}"`,
            recommendation: `Replace with dynamic property: ${propertyName}: userInput.messages.${this.camelToConfigKey(propertyName)}`,
            context: {
                ...this.createResult('hardcoded_text', node, path, context).context,
                propertyName,
                textValue: textInfo.value,
                textType: textInfo.type
            },
            metadata: {
                confidence,
                impact: 'major',
                fixComplexity: 'simple',
                tags: ['hardcoded-text', 'object-property', 'ui-limitation'],
                limitationScore,
                textLength: textInfo.value.length,
                uiContext: this.identifyUIContext(propertyName)
            }
        });
    }
    /**
     * Detect hardcoded UI text in assignments
     * Example: this.warningText = 'Feature only available in premium plan';
     */
    detectAssignmentUIText(node, path, context) {
        const { left, right } = node;
        if (!right)
            return null;
        const textInfo = this.extractTextFromValue(right);
        if (!textInfo)
            return null;
        let assignmentName = '';
        if (left.type === 'Identifier') {
            assignmentName = left.name;
        }
        else if (left.type === 'MemberExpression' && left.property) {
            assignmentName = left.property.name || '';
        }
        if (!this.shouldAnalyzeText(textInfo.value, assignmentName, context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(textInfo.value, assignmentName, context);
        if (limitationScore < (this.config.minimumLimitationScore || 0.5)) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.7);
        return this.createResult('hardcoded_text', node, path, context, {
            severity,
            description: `Hardcoded UI text assignment contains limitations: "${this.truncateText(textInfo.value)}"`,
            recommendation: `Replace with configurable assignment: ${assignmentName} = userInput.messages.${this.camelToConfigKey(assignmentName)}`,
            metadata: {
                confidence,
                impact: 'major',
                fixComplexity: 'simple',
                tags: ['hardcoded-text', 'assignment', 'ui-limitation'],
                limitationScore,
                textLength: textInfo.value.length
            }
        });
    }
    /**
     * Detect hardcoded UI text in string literals
     * Example: return 'Maximum 5 users allowed';
     */
    detectStringUIText(node, path, context) {
        const { value } = node;
        if (typeof value !== 'string')
            return null;
        if (!this.shouldAnalyzeText(value, '', context)) {
            return null;
        }
        // Only detect standalone string literals in likely UI contexts
        const parentType = path.parent?.type;
        if (!this.isLikelyUIContext(parentType, path)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(value, '', context);
        if (limitationScore < 0.7)
            return null; // Higher threshold for standalone strings
        const severity = this.calculateSeverity(node, path, context, 'low');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.7);
        return this.createResult('hardcoded_text', node, path, context, {
            severity,
            description: `Hardcoded UI text string contains limitations: "${this.truncateText(value)}"`,
            recommendation: `Replace with configurable text: userInput.messages.${this.valueToConfigKey(value)}`,
            metadata: {
                confidence,
                impact: 'minor',
                fixComplexity: 'simple',
                tags: ['hardcoded-text', 'string-literal', 'ui-limitation'],
                limitationScore,
                textLength: value.length,
                parentContext: parentType
            }
        });
    }
    /**
     * Detect hardcoded UI text in template literals
     * Example: `Only ${maxUsers} users allowed in ${planType} plan`
     */
    detectTemplateUIText(node, path, context) {
        const { quasis } = node;
        if (!quasis || quasis.length === 0)
            return null;
        // Reconstruct the template pattern for analysis
        const templateText = quasis.map((q) => q.value.raw).join('${...}');
        if (!this.shouldAnalyzeText(templateText, '', context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(templateText, '', context);
        if (limitationScore < 0.6)
            return null;
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.7);
        return this.createResult('hardcoded_text', node, path, context, {
            severity,
            description: `Hardcoded UI template text contains limitations: "${this.truncateText(templateText)}"`,
            recommendation: `Replace with configurable template: userInput.messages.templateName`,
            metadata: {
                confidence,
                impact: 'minor',
                fixComplexity: 'moderate',
                tags: ['hardcoded-text', 'template-literal', 'ui-limitation'],
                limitationScore,
                templatePattern: templateText
            }
        });
    }
    /**
     * Detect hardcoded UI text in JSX text nodes
     * Example: <div>Only available for premium users</div>
     */
    detectJSXUIText(node, path, context) {
        const { value } = node;
        if (typeof value !== 'string')
            return null;
        // Trim whitespace and ignore empty text
        const trimmedValue = value.trim();
        if (!trimmedValue || !this.shouldAnalyzeText(trimmedValue, '', context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(trimmedValue, '', context);
        if (limitationScore < 0.6)
            return null;
        const severity = this.calculateSeverity(node, path, context, 'high');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.7);
        return this.createResult('hardcoded_text', node, path, context, {
            severity,
            description: `Hardcoded JSX text contains limitations: "${this.truncateText(trimmedValue)}"`,
            recommendation: `Replace with dynamic JSX: {userInput.messages.${this.valueToConfigKey(trimmedValue)}}`,
            metadata: {
                confidence,
                impact: 'major',
                fixComplexity: 'simple',
                tags: ['hardcoded-text', 'jsx-text', 'ui-limitation'],
                limitationScore,
                textLength: trimmedValue.length
            }
        });
    }
    /**
     * Detect hardcoded UI text in JSX expression containers
     * Example: <div>{errorMessage}</div> where errorMessage contains limitations
     */
    detectJSXExpressionUIText(node, path, context) {
        const { expression } = node;
        if (!expression || expression.type !== 'StringLiteral')
            return null;
        const textValue = expression.value;
        if (!this.shouldAnalyzeText(textValue, '', context)) {
            return null;
        }
        const limitationScore = this.calculateLimitationScore(textValue, '', context);
        if (limitationScore < 0.6)
            return null;
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(limitationScore, this.config.confidence || 0.7);
        return this.createResult('hardcoded_text', node, path, context, {
            severity,
            description: `Hardcoded JSX expression text contains limitations: "${this.truncateText(textValue)}"`,
            recommendation: `Replace with dynamic expression: {userInput.messages.${this.valueToConfigKey(textValue)}}`,
            metadata: {
                confidence,
                impact: 'major',
                fixComplexity: 'simple',
                tags: ['hardcoded-text', 'jsx-expression', 'ui-limitation'],
                limitationScore,
                textLength: textValue.length
            }
        });
    }
    /**
     * Extract text information from various AST value nodes
     */
    extractTextFromValue(valueNode) {
        if (valueNode.type === 'StringLiteral') {
            return { value: valueNode.value, type: 'string-literal' };
        }
        if (valueNode.type === 'TemplateLiteral') {
            const { quasis } = valueNode;
            if (quasis && quasis.length > 0) {
                const templateText = quasis.map((q) => q.value.raw).join('${...}');
                return { value: templateText, type: 'template-literal' };
            }
        }
        return null;
    }
    /**
     * Determine if text should be analyzed based on configuration
     */
    shouldAnalyzeText(text, name, context) {
        const config = this.config;
        // Check text length limits
        if (text.length < (config.minTextLength || 10))
            return false;
        if (text.length > (config.maxTextLength || 500))
            return false;
        // Exclude generic text if configured
        if (config.excludeGenericText && this.isGenericText(text)) {
            return false;
        }
        return true;
    }
    /**
     * Check if text is generic/common UI text that shouldn't be flagged
     */
    isGenericText(text) {
        const genericPatterns = [
            /^(ok|cancel|yes|no|save|delete|edit|submit|close|back|next|prev|previous)$/i,
            /^(loading|error|success|warning|info)$/i,
            /^(home|about|contact|help|support|faq)$/i,
            /^(login|logout|signup|register|forgot|password)$/i,
            /^(search|filter|sort|view|show|hide)$/i
        ];
        return genericPatterns.some(pattern => pattern.test(text.trim()));
    }
    /**
     * Calculate limitation score for text content
     */
    calculateLimitationScore(text, name, context) {
        let score = 0;
        const config = this.config;
        // Check for explicit limitation phrases
        const limitationPhrases = config.limitationPhrases || [];
        const phraseMatches = limitationPhrases.filter(pattern => pattern.test(text)).length;
        score += Math.min(phraseMatches * 0.4, 0.8);
        // Check for business terms
        const businessTerms = config.businessTermPatterns || [];
        const businessMatches = businessTerms.filter(pattern => pattern.test(text)).length;
        score += Math.min(businessMatches * 0.2, 0.4);
        // Bonus for UI context variable names
        if (this.isUIVariable(name)) {
            score += 0.2;
        }
        // Check for specific limitation indicators
        if (this.containsSpecificLimitations(text)) {
            score += 0.3;
        }
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Check if variable name suggests UI context
     */
    isUIVariable(name) {
        const config = this.config;
        const uiPatterns = config.uiContextPatterns || [];
        return uiPatterns.some(pattern => pattern.test(name));
    }
    /**
     * Check if parent context suggests this is likely UI text
     */
    isLikelyUIContext(parentType, path) {
        if (!parentType)
            return false;
        const likelyContexts = [
            'ReturnStatement', // return 'text'
            'ThrowStatement', // throw new Error('text')
            'CallExpression', // alert('text'), console.log('text')
            'JSXExpressionContainer', // <div>{'text'}</div>
            'Property' // { message: 'text' }
        ];
        if (likelyContexts.includes(parentType))
            return true;
        // Check if this is an argument to a function that typically takes UI text
        if (parentType === 'CallExpression') {
            const callExpression = path.parent;
            const callee = callExpression?.callee;
            if (callee?.name) {
                const uiFunctionNames = ['alert', 'confirm', 'prompt', 'console.log', 'console.error', 'toast', 'notify'];
                return uiFunctionNames.includes(callee.name);
            }
        }
        return false;
    }
    /**
     * Check if text contains specific business limitations
     */
    containsSpecificLimitations(text) {
        const specificPatterns = [
            /\d+\s+(user|customer|item|product)s?\s+(only|max|maximum|limit)/i,
            /(automotive|dental|legal|healthcare|finance)\s+(only|customers?|users?)/i,
            /(us|usa|uk|canada)\s+(only|customers?|users?)/i,
            /(premium|enterprise|professional)\s+(only|feature|plan)/i
        ];
        return specificPatterns.some(pattern => pattern.test(text));
    }
    /**
     * Find limitation phrases in text for context
     */
    findLimitationPhrases(text) {
        const config = this.config;
        const limitationPhrases = config.limitationPhrases || [];
        const matches = [];
        limitationPhrases.forEach(pattern => {
            const match = text.match(pattern);
            if (match) {
                matches.push(match[0]);
            }
        });
        return matches;
    }
    /**
     * Identify UI context from variable name
     */
    identifyUIContext(name) {
        if (/error|warning|danger|alert/i.test(name))
            return 'error-message';
        if (/success|complete|done/i.test(name))
            return 'success-message';
        if (/info|information|notice/i.test(name))
            return 'info-message';
        if (/placeholder|hint|help/i.test(name))
            return 'input-hint';
        if (/title|heading|header/i.test(name))
            return 'title-text';
        if (/button|link|action/i.test(name))
            return 'action-text';
        if (/label|description|content/i.test(name))
            return 'descriptive-text';
        return 'general-ui';
    }
    /**
     * Assess the impact of hardcoded UI text
     */
    assessTextImpact(text, name) {
        // Error messages with limitations are breaking
        if (name.toLowerCase().includes('error') && this.containsSpecificLimitations(text)) {
            return 'breaking';
        }
        // User-facing limitations are major
        if (this.containsSpecificLimitations(text)) {
            return 'major';
        }
        // Other UI text limitations are minor
        return 'minor';
    }
    /**
     * Truncate text for display in descriptions
     */
    truncateText(text, maxLength = 60) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength) + '...';
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
    /**
     * Convert text value to config key
     */
    valueToConfigKey(value) {
        return value
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .toLowerCase()
            .substring(0, 30); // Limit length for config keys
    }
}
exports.HardcodedUITextDetector = HardcodedUITextDetector;
//# sourceMappingURL=HardcodedUITextDetector.js.map