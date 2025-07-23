"use strict";
/**
 * Anti-Pattern Detection Types
 *
 * Universal types for detecting ANY hardcoded limitations in code
 * Following All-Purpose Pattern: NO hardcoded constraints on detection scope
 * Enhanced with Context7 best practices for extensible pattern detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePatternDetector = void 0;
/**
 * Base class for all pattern detectors - implements common functionality
 * Following All-Purpose Pattern: NO hardcoded limitations in base implementation
 */
class BasePatternDetector {
    constructor() {
        this.config = {
            enabled: true,
            severity: 'medium',
            confidence: 0.8,
            customRules: {},
            excludePatterns: [],
            includePatterns: []
        };
    }
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    getConfiguration() {
        return { ...this.config };
    }
    validateNode(node) {
        if (!this.config.enabled)
            return false;
        return this.supportedNodeTypes.includes(node.type);
    }
    /**
     * Helper method to create detection result - ensures consistent format
     */
    createResult(type, node, path, context, overrides = {}) {
        const location = {
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            start: node.start || 0,
            end: node.end || 0
        };
        const baseResult = {
            type,
            severity: this.config.severity || 'medium',
            node,
            path,
            file: context.file,
            location,
            code: this.extractCode(node, context.source),
            description: `${this.name} detected ${type}`,
            recommendation: 'Replace with dynamic configuration from userInput',
            context: {
                parentType: path.parent?.type,
                scope: path.scope?.block?.type,
                exports: this.isExported(path),
                imports: context.imports
            },
            metadata: {
                confidence: this.config.confidence || 0.8,
                impact: 'major',
                fixComplexity: 'moderate',
                tags: [this.name, type]
            }
        };
        return { ...baseResult, ...overrides };
    }
    /**
     * Extract code snippet from source - handles edge cases
     */
    extractCode(node, source) {
        if (!node.start || !node.end)
            return '<unknown>';
        try {
            return source.slice(node.start, node.end);
        }
        catch {
            return '<extraction_failed>';
        }
    }
    /**
     * Check if node is exported - useful for severity assessment
     */
    isExported(path) {
        let parent = path.parent;
        while (parent) {
            if (parent.type === 'ExportNamedDeclaration' ||
                parent.type === 'ExportDefaultDeclaration') {
                return true;
            }
            parent = path.parentPath?.parent;
        }
        return false;
    }
    /**
     * Calculate severity based on context - dynamic severity assessment
     */
    calculateSeverity(node, path, context, baseSeverity = 'medium') {
        let severity = baseSeverity;
        // Increase severity if exported (affects API surface)
        if (this.isExported(path)) {
            severity = this.increaseSeverity(severity);
        }
        // Increase severity if in main/entry files
        if (context.file.includes('main.') || context.file.includes('index.')) {
            severity = this.increaseSeverity(severity);
        }
        // Increase severity for large arrays or high limits
        if (node.type === 'ArrayExpression') {
            const elements = node.elements?.length || 0;
            if (elements > 10)
                severity = this.increaseSeverity(severity);
            if (elements > 20)
                severity = this.increaseSeverity(severity);
        }
        return severity;
    }
    /**
     * Helper to increase severity level
     */
    increaseSeverity(current) {
        const levels = ['info', 'low', 'medium', 'high', 'critical'];
        const currentIndex = levels.indexOf(current);
        return levels[Math.min(currentIndex + 1, levels.length - 1)];
    }
}
exports.BasePatternDetector = BasePatternDetector;
//# sourceMappingURL=types.js.map