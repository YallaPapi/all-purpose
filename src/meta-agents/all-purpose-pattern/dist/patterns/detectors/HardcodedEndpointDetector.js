"use strict";
/**
 * Hardcoded Endpoint Detector
 *
 * Detects hardcoded URLs, API endpoints, and service endpoints that create limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded service dependencies
 * Context7-enhanced with intelligent endpoint pattern recognition
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardcodedEndpointDetector = void 0;
const types_1 = require("../types");
/**
 * Detects hardcoded endpoints that impose service limitations
 * Examples: 'https://api.stripe.com', 'wss://pusher.example.com', '/api/specific-service'
 */
class HardcodedEndpointDetector extends types_1.BasePatternDetector {
    constructor() {
        super(...arguments);
        this.name = 'HardcodedEndpointDetector';
        this.description = 'Detects hardcoded URLs and API endpoints that create service dependencies and limitations';
        this.version = '1.0.0';
        this.supportedNodeTypes = ['VariableDeclarator', 'Property', 'AssignmentExpression', 'StringLiteral', 'TemplateLiteral'];
        this.config = {
            enabled: true,
            severity: 'high',
            confidence: 0.8,
            endpointPatterns: [
                // Full URL patterns
                /^https?:\/\/[a-zA-Z0-9][\w\-\.]*\.[a-zA-Z]{2,}(?:\/.*)?$/,
                /^wss?:\/\/[a-zA-Z0-9][\w\-\.]*\.[a-zA-Z]{2,}(?:\/.*)?$/,
                /^ftp:\/\/[a-zA-Z0-9][\w\-\.]*\.[a-zA-Z]{2,}(?:\/.*)?$/,
                // API path patterns
                /^\/api\/[a-zA-Z0-9][\w\-\/]*$/,
                /^\/v[0-9]+\/[a-zA-Z0-9][\w\-\/]*$/,
                /^\/graphql\/?$/,
                /^\/webhook[s]?\/[a-zA-Z0-9][\w\-\/]*$/,
                // Service-specific patterns
                /stripe\.com/i,
                /paypal\.com/i,
                /amazonaws\.com/i,
                /azure\.com/i,
                /googleapis\.com/i,
                /twilio\.com/i,
                /sendgrid\.com/i,
                /mailgun\.com/i,
                /pusher\.com/i,
                /auth0\.com/i,
                /firebase\.com/i,
                /vercel\.app/i,
                /netlify\.app/i,
                /heroku\.com/i,
                // Protocol patterns for service dependencies
                /^[a-zA-Z0-9]+:\/\//
            ],
            excludePatterns: [
                // Common legitimate patterns to exclude
                /^https?:\/\/localhost/,
                /^https?:\/\/127\.0\.0\.1/,
                /^https?:\/\/0\.0\.0\.0/,
                /^\/$/,
                /^\/public/,
                /^\/static/,
                /^\/assets/,
                /^\/images/,
                /^\/css/,
                /^\/js/,
                /^\//, // Generic root path
                /example\.com/i,
                /test\.com/i,
                /placeholder/i,
                /dummy/i,
                /mock/i
            ],
            includeLocalhost: false, // Usually localhost is for development
            includeRelativePaths: true, // Include relative API paths
            checkVariableNames: true, // Check variable names for endpoint-like patterns
            minimumSuspicionScore: 0.5,
            protocolWhitelist: ['http:', 'https:', 'ws:', 'wss:', 'ftp:'],
            customRules: {},
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
                const variableResult = this.detectVariableEndpoint(node, path, context);
                if (variableResult)
                    results.push(variableResult);
            }
            // Handle Property nodes (object properties)
            if (node.type === 'Property') {
                const propertyResult = this.detectPropertyEndpoint(node, path, context);
                if (propertyResult)
                    results.push(propertyResult);
            }
            // Handle AssignmentExpression nodes
            if (node.type === 'AssignmentExpression') {
                const assignmentResult = this.detectAssignmentEndpoint(node, path, context);
                if (assignmentResult)
                    results.push(assignmentResult);
            }
            // Handle standalone StringLiteral nodes (in function calls, etc.)
            if (node.type === 'StringLiteral') {
                const stringResult = this.detectStringEndpoint(node, path, context);
                if (stringResult)
                    results.push(stringResult);
            }
            // Handle TemplateLiteral nodes
            if (node.type === 'TemplateLiteral') {
                const templateResult = this.detectTemplateEndpoint(node, path, context);
                if (templateResult)
                    results.push(templateResult);
            }
        }
        catch (error) {
            console.warn(`HardcodedEndpointDetector error in ${context.file}:`, error);
        }
        return results;
    }
    /**
     * Detect hardcoded endpoints in variable declarations
     * Example: const API_URL = 'https://api.stripe.com/v1';
     */
    detectVariableEndpoint(node, path, context) {
        const { id, init } = node;
        if (!id || !init)
            return null;
        const variableName = id.name || '';
        const endpointInfo = this.extractEndpointFromValue(init);
        if (!endpointInfo || !this.shouldAnalyzeEndpoint(endpointInfo.value, variableName, context)) {
            return null;
        }
        const suspicionScore = this.calculateSuspicionScore(endpointInfo, variableName, context);
        if (suspicionScore < (this.config.minimumSuspicionScore || 0.5)) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'high');
        const confidence = Math.min(suspicionScore, this.config.confidence || 0.8);
        return this.createResult('hardcoded_endpoint', node, path, context, {
            severity,
            description: `Hardcoded endpoint '${variableName}' = '${endpointInfo.value}' creates service dependency`,
            recommendation: `Replace with configurable endpoint: const ${variableName} = userInput.endpoints.${this.camelToConfigKey(variableName)} || process.env.${this.camelToEnvKey(variableName)};`,
            context: {
                ...this.createResult('hardcoded_endpoint', node, path, context).context,
                variableName,
                endpointValue: endpointInfo.value,
                endpointType: endpointInfo.type,
                protocol: endpointInfo.protocol,
                domain: endpointInfo.domain,
                path: endpointInfo.path
            },
            metadata: {
                confidence,
                impact: this.assessImpact(endpointInfo, variableName),
                fixComplexity: this.isExported(path) ? 'moderate' : 'simple',
                tags: ['hardcoded-endpoint', 'service-dependency', 'variable-declaration'],
                suspicionScore,
                endpointType: endpointInfo.type,
                serviceProvider: this.identifyServiceProvider(endpointInfo.value)
            }
        });
    }
    /**
     * Detect hardcoded endpoints in object properties
     * Example: { baseURL: 'https://api.example.com' }
     */
    detectPropertyEndpoint(node, path, context) {
        const { key, value } = node;
        if (!key || !value)
            return null;
        const propertyName = key.name || key.value || '';
        const endpointInfo = this.extractEndpointFromValue(value);
        if (!endpointInfo || !this.shouldAnalyzeEndpoint(endpointInfo.value, propertyName, context)) {
            return null;
        }
        const suspicionScore = this.calculateSuspicionScore(endpointInfo, propertyName, context);
        if (suspicionScore < (this.config.minimumSuspicionScore || 0.5)) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(suspicionScore, this.config.confidence || 0.8);
        return this.createResult('hardcoded_endpoint', node, path, context, {
            severity,
            description: `Hardcoded endpoint property '${propertyName}' = '${endpointInfo.value}' creates service limitation`,
            recommendation: `Replace with dynamic property: ${propertyName}: userInput.endpoints.${this.camelToConfigKey(propertyName)}`,
            context: {
                ...this.createResult('hardcoded_endpoint', node, path, context).context,
                propertyName,
                endpointValue: endpointInfo.value,
                endpointType: endpointInfo.type
            },
            metadata: {
                confidence,
                impact: 'major',
                fixComplexity: 'simple',
                tags: ['hardcoded-endpoint', 'object-property', 'service-dependency'],
                suspicionScore,
                endpointType: endpointInfo.type,
                serviceProvider: this.identifyServiceProvider(endpointInfo.value)
            }
        });
    }
    /**
     * Detect hardcoded endpoints in assignments
     * Example: this.apiUrl = 'https://api.service.com';
     */
    detectAssignmentEndpoint(node, path, context) {
        const { left, right } = node;
        if (!right)
            return null;
        const endpointInfo = this.extractEndpointFromValue(right);
        if (!endpointInfo)
            return null;
        let assignmentName = '';
        if (left.type === 'Identifier') {
            assignmentName = left.name;
        }
        else if (left.type === 'MemberExpression' && left.property) {
            assignmentName = left.property.name || '';
        }
        if (!this.shouldAnalyzeEndpoint(endpointInfo.value, assignmentName, context)) {
            return null;
        }
        const suspicionScore = this.calculateSuspicionScore(endpointInfo, assignmentName, context);
        if (suspicionScore < (this.config.minimumSuspicionScore || 0.5)) {
            return null;
        }
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(suspicionScore, this.config.confidence || 0.8);
        return this.createResult('hardcoded_endpoint', node, path, context, {
            severity,
            description: `Hardcoded endpoint assignment '${assignmentName}' = '${endpointInfo.value}' creates dependency`,
            recommendation: `Replace with configurable assignment: ${assignmentName} = userInput.endpoints.${this.camelToConfigKey(assignmentName)}`,
            metadata: {
                confidence,
                impact: 'major',
                fixComplexity: 'simple',
                tags: ['hardcoded-endpoint', 'assignment', 'service-dependency'],
                suspicionScore,
                endpointType: endpointInfo.type,
                serviceProvider: this.identifyServiceProvider(endpointInfo.value)
            }
        });
    }
    /**
     * Detect hardcoded endpoints in string literals (function calls, etc.)
     * Example: fetch('https://api.example.com/data')
     */
    detectStringEndpoint(node, path, context) {
        const { value } = node;
        if (typeof value !== 'string')
            return null;
        const endpointInfo = this.parseEndpoint(value);
        if (!endpointInfo || !this.shouldAnalyzeEndpoint(endpointInfo.value, '', context)) {
            return null;
        }
        // Only detect standalone string literals that are likely endpoints
        const parentType = path.parent?.type;
        if (!this.isLikelyEndpointContext(parentType)) {
            return null;
        }
        const suspicionScore = this.calculateSuspicionScore(endpointInfo, '', context);
        if (suspicionScore < 0.7)
            return null; // Higher threshold for standalone strings
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(suspicionScore, this.config.confidence || 0.8);
        return this.createResult('hardcoded_endpoint', node, path, context, {
            severity,
            description: `Hardcoded endpoint string '${endpointInfo.value}' in ${parentType}`,
            recommendation: `Replace with configurable endpoint: userInput.endpoints.${this.valueToConfigKey(endpointInfo.value)}`,
            metadata: {
                confidence,
                impact: 'minor',
                fixComplexity: 'simple',
                tags: ['hardcoded-endpoint', 'string-literal', 'function-call'],
                suspicionScore,
                endpointType: endpointInfo.type,
                serviceProvider: this.identifyServiceProvider(endpointInfo.value),
                parentContext: parentType
            }
        });
    }
    /**
     * Detect hardcoded endpoints in template literals
     * Example: `https://api.${domain}.com/v1/users`
     */
    detectTemplateEndpoint(node, path, context) {
        const { quasis } = node;
        if (!quasis || quasis.length === 0)
            return null;
        // Reconstruct the template pattern for analysis
        const templatePattern = quasis.map((q) => q.value.raw).join('${...}');
        const endpointInfo = this.parseEndpoint(templatePattern);
        if (!endpointInfo || !this.shouldAnalyzeEndpoint(endpointInfo.value, '', context)) {
            return null;
        }
        const suspicionScore = this.calculateSuspicionScore(endpointInfo, '', context);
        if (suspicionScore < 0.6)
            return null;
        const severity = this.calculateSeverity(node, path, context, 'medium');
        const confidence = Math.min(suspicionScore, this.config.confidence || 0.8);
        return this.createResult('hardcoded_endpoint', node, path, context, {
            severity,
            description: `Hardcoded endpoint template '${templatePattern}' creates service dependency`,
            recommendation: `Replace with fully configurable template: userInput.endpoints.templateName`,
            metadata: {
                confidence,
                impact: 'minor',
                fixComplexity: 'moderate',
                tags: ['hardcoded-endpoint', 'template-literal', 'service-dependency'],
                suspicionScore,
                endpointType: endpointInfo.type,
                templatePattern
            }
        });
    }
    /**
     * Extract endpoint information from various AST value nodes
     */
    extractEndpointFromValue(valueNode) {
        if (valueNode.type === 'StringLiteral') {
            return this.parseEndpoint(valueNode.value);
        }
        if (valueNode.type === 'TemplateLiteral') {
            const { quasis } = valueNode;
            if (quasis && quasis.length > 0) {
                const templatePattern = quasis.map((q) => q.value.raw).join('${...}');
                return this.parseEndpoint(templatePattern);
            }
        }
        return null;
    }
    /**
     * Parse an endpoint string to extract components
     */
    parseEndpoint(value) {
        const config = this.config;
        const endpointPatterns = config.endpointPatterns || [];
        const isEndpoint = endpointPatterns.some(pattern => pattern.test(value));
        if (!isEndpoint)
            return null;
        try {
            // Try to parse as URL
            const url = new URL(value);
            return {
                value,
                type: 'full-url',
                protocol: url.protocol,
                domain: url.hostname,
                path: url.pathname
            };
        }
        catch {
            // Not a valid URL, check for other patterns
            if (value.startsWith('/')) {
                return {
                    value,
                    type: 'relative-path',
                    path: value
                };
            }
            return {
                value,
                type: 'unknown',
            };
        }
    }
    /**
     * Determine if an endpoint should be analyzed based on configuration
     */
    shouldAnalyzeEndpoint(value, name, context) {
        const config = this.config;
        // Check exclude patterns
        const excludePatterns = config.excludePatterns || [];
        if (excludePatterns.some(pattern => pattern.test(value))) {
            return false;
        }
        // Check localhost setting
        if (!config.includeLocalhost && value.includes('localhost')) {
            return false;
        }
        // Check relative paths setting
        if (!config.includeRelativePaths && value.startsWith('/')) {
            return false;
        }
        return true;
    }
    /**
     * Calculate suspicion score for an endpoint
     */
    calculateSuspicionScore(endpointInfo, name, context) {
        let score = 0;
        // Base score for being a recognized endpoint pattern
        score += 0.3;
        // Score based on endpoint type
        if (endpointInfo.type === 'full-url') {
            score += 0.3;
        }
        else if (endpointInfo.type === 'relative-path') {
            score += 0.2;
        }
        // Score based on service provider detection
        const provider = this.identifyServiceProvider(endpointInfo.value);
        if (provider && provider !== 'unknown') {
            score += 0.4;
        }
        // Score based on variable naming
        if (this.isEndpointVariable(name)) {
            score += 0.2;
        }
        // Bonus for HTTPS (more likely to be production endpoint)
        if (endpointInfo.protocol === 'https:') {
            score += 0.1;
        }
        // Bonus for API paths
        if (endpointInfo.path && endpointInfo.path.includes('/api/')) {
            score += 0.2;
        }
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Check if variable name suggests it contains an endpoint
     */
    isEndpointVariable(name) {
        const endpointVariablePatterns = [
            /url|uri|endpoint|link|href/i,
            /api|service|server|host/i,
            /base|root|origin/i,
            /webhook|callback/i
        ];
        return endpointVariablePatterns.some(pattern => pattern.test(name));
    }
    /**
     * Check if parent context suggests this is likely an endpoint
     */
    isLikelyEndpointContext(parentType) {
        const likelyContexts = [
            'CallExpression', // fetch('url'), axios.get('url')
            'Property', // { url: 'value' }
            'AssignmentExpression' // variable = 'url'
        ];
        return parentType ? likelyContexts.includes(parentType) : false;
    }
    /**
     * Identify service provider from endpoint
     */
    identifyServiceProvider(endpoint) {
        const providers = [
            { pattern: /stripe\.com/i, name: 'Stripe' },
            { pattern: /paypal\.com/i, name: 'PayPal' },
            { pattern: /amazonaws\.com/i, name: 'AWS' },
            { pattern: /azure\.com/i, name: 'Azure' },
            { pattern: /googleapis\.com/i, name: 'Google' },
            { pattern: /twilio\.com/i, name: 'Twilio' },
            { pattern: /sendgrid\.com/i, name: 'SendGrid' },
            { pattern: /mailgun\.com/i, name: 'Mailgun' },
            { pattern: /pusher\.com/i, name: 'Pusher' },
            { pattern: /auth0\.com/i, name: 'Auth0' },
            { pattern: /firebase\.com/i, name: 'Firebase' },
            { pattern: /vercel\.app/i, name: 'Vercel' },
            { pattern: /netlify\.app/i, name: 'Netlify' },
            { pattern: /heroku\.com/i, name: 'Heroku' }
        ];
        for (const provider of providers) {
            if (provider.pattern.test(endpoint)) {
                return provider.name;
            }
        }
        return 'unknown';
    }
    /**
     * Assess the impact of a hardcoded endpoint
     */
    assessImpact(endpointInfo, name) {
        // Production service endpoints are breaking
        const provider = this.identifyServiceProvider(endpointInfo.value);
        if (provider && provider !== 'unknown') {
            return 'breaking';
        }
        // HTTPS endpoints are major
        if (endpointInfo.protocol === 'https:') {
            return 'major';
        }
        // API endpoints are major
        if (endpointInfo.path && endpointInfo.path.includes('/api/')) {
            return 'major';
        }
        return 'minor';
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
     * Convert camelCase to environment variable key (UPPER_SNAKE_CASE)
     */
    camelToEnvKey(camelCase) {
        return camelCase
            .replace(/([A-Z])/g, '_$1')
            .toUpperCase()
            .replace(/^_/, '');
    }
    /**
     * Convert endpoint value to config key
     */
    valueToConfigKey(value) {
        return value
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .toLowerCase();
    }
}
exports.HardcodedEndpointDetector = HardcodedEndpointDetector;
//# sourceMappingURL=HardcodedEndpointDetector.js.map