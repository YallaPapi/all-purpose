/**
 * AST Traversal Core Module
 *
 * Universal AST traversal utilities that work with ANY AST structure
 * Following All-Purpose Pattern: NO hardcoded node type limitations
 * Enhanced with Context7 best practices for AST manipulation
 */
import { Visitor, NodePath } from '@babel/traverse';
import { Node } from '@babel/types';
export interface TraversalResult {
    nodeCount: number;
    nodeTypes: Record<string, number>;
    traversalTime: number;
    findings: TraversalFinding[];
}
export interface TraversalFinding {
    type: string;
    node: Node;
    path: NodePath;
    metadata: Record<string, any>;
    location?: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    };
}
export interface TraversalOptions {
    collectFindings?: boolean;
    trackNodeTypes?: boolean;
    maxDepth?: number;
    customVisitors?: Record<string, Function>;
}
/**
 * Universal AST Traversal Engine - works with ANY AST structure
 * NO limitations on node types or traversal patterns
 */
export declare class ASTTraversal {
    private nodeCount;
    private nodeTypes;
    private findings;
    /**
     * Traverse AST with custom visitor - supports ANY visitor pattern
     * @param ast - AST node to traverse
     * @param visitor - Visitor object or function
     * @param options - Traversal options
     * @returns TraversalResult with statistics and findings
     */
    traverse(ast: Node, visitor: Visitor | Function, options?: TraversalOptions): TraversalResult;
    /**
     * Find all nodes of specific type - supports ANY node type
     * @param ast - AST to search
     * @param nodeType - Node type to find (e.g., 'VariableDeclaration')
     * @param filter - Optional filter function
     * @returns Array of matching nodes with metadata
     */
    findNodes(ast: Node, nodeType: string, filter?: (node: Node, path: NodePath) => boolean): TraversalFinding[];
    /**
     * Find nodes by pattern - supports ANY search pattern
     * @param ast - AST to search
     * @param patterns - Object mapping node types to filter functions
     * @returns Array of matching nodes
     */
    findByPattern(ast: Node, patterns: Record<string, (node: Node, path: NodePath) => boolean>): TraversalFinding[];
    /**
     * Get all unique node types in AST - discovers ANY node types present
     */
    getNodeTypes(ast: Node): string[];
    /**
     * Analyze AST structure - provides comprehensive analysis
     */
    analyzeStructure(ast: Node): {
        nodeTypes: string[];
        complexity: number;
        depth: number;
        statistics: Record<string, number>;
    };
    /**
     * Create enhanced visitor with tracking capabilities
     */
    private createEnhancedVisitor;
    /**
     * Extract metadata from node - universal metadata extraction
     */
    private extractNodeMetadata;
    /**
     * Reset internal counters for new traversal
     */
    private resetCounters;
}
/**
 * Convenience functions for common traversal patterns
 */
/**
 * Quick traversal with visitor function
 */
export declare function traverseAST(ast: Node, visitor: Visitor | Function): TraversalResult;
/**
 * Find all nodes of specific type
 */
export declare function findNodes(ast: Node, nodeType: string, filter?: (node: Node, path: NodePath) => boolean): TraversalFinding[];
/**
 * Get AST statistics
 */
export declare function getASTStats(ast: Node): {
    nodeTypes: string[];
    complexity: number;
    depth: number;
    statistics: Record<string, number>;
};
/**
 * Default traversal instance for convenient access
 */
export declare const astTraversal: ASTTraversal;
//# sourceMappingURL=astTraverse.d.ts.map