"use strict";
/**
 * AST Traversal Core Module
 *
 * Universal AST traversal utilities that work with ANY AST structure
 * Following All-Purpose Pattern: NO hardcoded node type limitations
 * Enhanced with Context7 best practices for AST manipulation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.astTraversal = exports.ASTTraversal = void 0;
exports.traverseAST = traverseAST;
exports.findNodes = findNodes;
exports.getASTStats = getASTStats;
const traverse_1 = __importDefault(require("@babel/traverse"));
/**
 * Universal AST Traversal Engine - works with ANY AST structure
 * NO limitations on node types or traversal patterns
 */
class ASTTraversal {
    constructor() {
        this.nodeCount = 0;
        this.nodeTypes = {};
        this.findings = [];
    }
    /**
     * Traverse AST with custom visitor - supports ANY visitor pattern
     * @param ast - AST node to traverse
     * @param visitor - Visitor object or function
     * @param options - Traversal options
     * @returns TraversalResult with statistics and findings
     */
    traverse(ast, visitor, options = {}) {
        const startTime = Date.now();
        this.resetCounters();
        const { collectFindings = false, trackNodeTypes = true, maxDepth, customVisitors = {} } = options;
        // Create enhanced visitor that tracks statistics
        const enhancedVisitor = this.createEnhancedVisitor(visitor, { collectFindings, trackNodeTypes, maxDepth, customVisitors });
        try {
            (0, traverse_1.default)(ast, enhancedVisitor);
        }
        catch (error) {
            console.warn(`Traversal warning: ${error.message}`);
        }
        const traversalTime = Date.now() - startTime;
        return {
            nodeCount: this.nodeCount,
            nodeTypes: { ...this.nodeTypes },
            traversalTime,
            findings: [...this.findings]
        };
    }
    /**
     * Find all nodes of specific type - supports ANY node type
     * @param ast - AST to search
     * @param nodeType - Node type to find (e.g., 'VariableDeclaration')
     * @param filter - Optional filter function
     * @returns Array of matching nodes with metadata
     */
    findNodes(ast, nodeType, filter) {
        const findings = [];
        const visitor = {
            [nodeType]: (path) => {
                if (!filter || filter(path.node, path)) {
                    findings.push({
                        type: nodeType,
                        node: path.node,
                        path,
                        metadata: this.extractNodeMetadata(path.node, path),
                        location: path.node.loc ? {
                            start: path.node.loc.start,
                            end: path.node.loc.end
                        } : undefined
                    });
                }
            }
        };
        (0, traverse_1.default)(ast, visitor);
        return findings;
    }
    /**
     * Find nodes by pattern - supports ANY search pattern
     * @param ast - AST to search
     * @param patterns - Object mapping node types to filter functions
     * @returns Array of matching nodes
     */
    findByPattern(ast, patterns) {
        const findings = [];
        // Create visitor for each pattern - UNLIMITED pattern support
        const visitor = {};
        Object.entries(patterns).forEach(([nodeType, filterFn]) => {
            visitor[nodeType] = (path) => {
                if (filterFn(path.node, path)) {
                    findings.push({
                        type: nodeType,
                        node: path.node,
                        path,
                        metadata: this.extractNodeMetadata(path.node, path),
                        location: path.node.loc ? {
                            start: path.node.loc.start,
                            end: path.node.loc.end
                        } : undefined
                    });
                }
            };
        });
        (0, traverse_1.default)(ast, visitor);
        return findings;
    }
    /**
     * Get all unique node types in AST - discovers ANY node types present
     */
    getNodeTypes(ast) {
        const nodeTypes = new Set();
        (0, traverse_1.default)(ast, {
            enter(path) {
                nodeTypes.add(path.node.type);
            }
        });
        return Array.from(nodeTypes).sort();
    }
    /**
     * Analyze AST structure - provides comprehensive analysis
     */
    analyzeStructure(ast) {
        const nodeTypes = new Set();
        let maxDepth = 0;
        let currentDepth = 0;
        const statistics = {};
        (0, traverse_1.default)(ast, {
            enter(path) {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
                const nodeType = path.node.type;
                nodeTypes.add(nodeType);
                statistics[nodeType] = (statistics[nodeType] || 0) + 1;
            },
            exit() {
                currentDepth--;
            }
        });
        return {
            nodeTypes: Array.from(nodeTypes).sort(),
            complexity: nodeTypes.size,
            depth: maxDepth,
            statistics
        };
    }
    /**
     * Create enhanced visitor with tracking capabilities
     */
    createEnhancedVisitor(baseVisitor, options) {
        const { collectFindings, trackNodeTypes, maxDepth, customVisitors } = options;
        let currentDepth = 0;
        // Convert function visitor to object if needed
        const visitor = typeof baseVisitor === 'function'
            ? { enter: baseVisitor }
            : { ...baseVisitor };
        // Add custom visitors - UNLIMITED custom functionality
        Object.entries(customVisitors || {}).forEach(([nodeType, fn]) => {
            const originalVisitor = visitor[nodeType];
            visitor[nodeType] = (path) => {
                if (originalVisitor)
                    originalVisitor(path);
                fn(path);
            };
        });
        // Enhance with tracking
        const originalEnter = visitor.enter;
        const originalExit = visitor.exit;
        visitor.enter = (path) => {
            currentDepth++;
            // Respect max depth limit if specified
            if (maxDepth && currentDepth > maxDepth) {
                path.skip();
                return;
            }
            // Track node types
            if (trackNodeTypes) {
                this.nodeCount++;
                const nodeType = path.node.type;
                this.nodeTypes[nodeType] = (this.nodeTypes[nodeType] || 0) + 1;
            }
            // Collect findings if requested
            if (collectFindings) {
                this.findings.push({
                    type: path.node.type,
                    node: path.node,
                    path,
                    metadata: this.extractNodeMetadata(path.node, path),
                    location: path.node.loc ? {
                        start: path.node.loc.start,
                        end: path.node.loc.end
                    } : undefined
                });
            }
            if (originalEnter)
                originalEnter(path);
        };
        visitor.exit = (path) => {
            currentDepth--;
            if (originalExit)
                originalExit(path);
        };
        return visitor;
    }
    /**
     * Extract metadata from node - universal metadata extraction
     */
    extractNodeMetadata(node, path) {
        const metadata = {
            type: node.type,
            start: node.start,
            end: node.end
        };
        // Add parent information
        if (path.parent) {
            metadata.parent = {
                type: path.parent.type,
                key: path.key
            };
        }
        // Add scope information if available
        if (path.scope) {
            metadata.scope = {
                type: path.scope.block?.type,
                bindings: Object.keys(path.scope.bindings || {})
            };
        }
        // Add specific properties based on node type - UNLIMITED extensibility
        switch (node.type) {
            case 'Identifier':
                metadata.name = node.name;
                break;
            case 'Literal':
                metadata.value = node.value;
                metadata.raw = node.raw;
                break;
            case 'FunctionDeclaration':
            case 'FunctionExpression':
                metadata.async = node.async;
                metadata.generator = node.generator;
                metadata.params = node.params?.length || 0;
                break;
            case 'VariableDeclaration':
                metadata.kind = node.kind;
                metadata.declarations = node.declarations?.length || 0;
                break;
            // Add more cases as needed - NO hardcoded limitations
        }
        return metadata;
    }
    /**
     * Reset internal counters for new traversal
     */
    resetCounters() {
        this.nodeCount = 0;
        this.nodeTypes = {};
        this.findings = [];
    }
}
exports.ASTTraversal = ASTTraversal;
/**
 * Convenience functions for common traversal patterns
 */
/**
 * Quick traversal with visitor function
 */
function traverseAST(ast, visitor) {
    const traversal = new ASTTraversal();
    return traversal.traverse(ast, visitor);
}
/**
 * Find all nodes of specific type
 */
function findNodes(ast, nodeType, filter) {
    const traversal = new ASTTraversal();
    return traversal.findNodes(ast, nodeType, filter);
}
/**
 * Get AST statistics
 */
function getASTStats(ast) {
    const traversal = new ASTTraversal();
    return traversal.analyzeStructure(ast);
}
/**
 * Default traversal instance for convenient access
 */
exports.astTraversal = new ASTTraversal();
//# sourceMappingURL=astTraverse.js.map