/**
 * AST Traversal Core Module
 * 
 * Universal AST traversal utilities that work with ANY AST structure
 * Following All-Purpose Pattern: NO hardcoded node type limitations
 * Enhanced with Context7 best practices for AST manipulation
 */

import traverse, { Visitor, NodePath } from '@babel/traverse';
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
    start: { line: number; column: number };
    end: { line: number; column: number };
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
export class ASTTraversal {
  private nodeCount: number = 0;
  private nodeTypes: Record<string, number> = {};
  private findings: TraversalFinding[] = [];

  /**
   * Traverse AST with custom visitor - supports ANY visitor pattern
   * @param ast - AST node to traverse
   * @param visitor - Visitor object or function
   * @param options - Traversal options
   * @returns TraversalResult with statistics and findings
   */
  traverse(
    ast: Node, 
    visitor: Visitor | Function, 
    options: TraversalOptions = {}
  ): TraversalResult {
    const startTime = Date.now();
    this.resetCounters();

    const {
      collectFindings = false,
      trackNodeTypes = true,
      maxDepth,
      customVisitors = {}
    } = options;

    // Create enhanced visitor that tracks statistics
    const enhancedVisitor = this.createEnhancedVisitor(
      visitor,
      { collectFindings, trackNodeTypes, maxDepth, customVisitors }
    );

    try {
      traverse(ast, enhancedVisitor);
    } catch (error) {
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
  findNodes(
    ast: Node, 
    nodeType: string, 
    filter?: (node: Node, path: NodePath) => boolean
  ): TraversalFinding[] {
    const findings: TraversalFinding[] = [];

    const visitor: Visitor = {
      [nodeType]: (path: NodePath) => {
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

    traverse(ast, visitor);
    return findings;
  }

  /**
   * Find nodes by pattern - supports ANY search pattern
   * @param ast - AST to search
   * @param patterns - Object mapping node types to filter functions
   * @returns Array of matching nodes
   */
  findByPattern(
    ast: Node,
    patterns: Record<string, (node: Node, path: NodePath) => boolean>
  ): TraversalFinding[] {
    const findings: TraversalFinding[] = [];

    // Create visitor for each pattern - UNLIMITED pattern support
    const visitor: Visitor = {};
    
    Object.entries(patterns).forEach(([nodeType, filterFn]) => {
      visitor[nodeType] = (path: NodePath) => {
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

    traverse(ast, visitor);
    return findings;
  }

  /**
   * Get all unique node types in AST - discovers ANY node types present
   */
  getNodeTypes(ast: Node): string[] {
    const nodeTypes = new Set<string>();

    traverse(ast, {
      enter(path) {
        nodeTypes.add(path.node.type);
      }
    });

    return Array.from(nodeTypes).sort();
  }

  /**
   * Analyze AST structure - provides comprehensive analysis
   */
  analyzeStructure(ast: Node): {
    nodeTypes: string[];
    complexity: number;
    depth: number;
    statistics: Record<string, number>;
  } {
    const nodeTypes = new Set<string>();
    let maxDepth = 0;
    let currentDepth = 0;
    const statistics: Record<string, number> = {};

    traverse(ast, {
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
  private createEnhancedVisitor(
    baseVisitor: Visitor | Function,
    options: TraversalOptions
  ): Visitor {
    const { collectFindings, trackNodeTypes, maxDepth, customVisitors } = options;
    let currentDepth = 0;

    // Convert function visitor to object if needed
    const visitor: Visitor = typeof baseVisitor === 'function' 
      ? { enter: baseVisitor } 
      : { ...baseVisitor };

    // Add custom visitors - UNLIMITED custom functionality
    Object.entries(customVisitors || {}).forEach(([nodeType, fn]) => {
      const originalVisitor = visitor[nodeType];
      visitor[nodeType] = (path: NodePath) => {
        if (originalVisitor) originalVisitor(path);
        fn(path);
      };
    });

    // Enhance with tracking
    const originalEnter = visitor.enter;
    const originalExit = visitor.exit;

    visitor.enter = (path: NodePath) => {
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

      if (originalEnter) originalEnter(path);
    };

    visitor.exit = (path: NodePath) => {
      currentDepth--;
      if (originalExit) originalExit(path);
    };

    return visitor;
  }

  /**
   * Extract metadata from node - universal metadata extraction
   */
  private extractNodeMetadata(node: Node, path: NodePath): Record<string, any> {
    const metadata: Record<string, any> = {
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
        metadata.name = (node as any).name;
        break;
      case 'Literal':
        metadata.value = (node as any).value;
        metadata.raw = (node as any).raw;
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        metadata.async = (node as any).async;
        metadata.generator = (node as any).generator;
        metadata.params = (node as any).params?.length || 0;
        break;
      case 'VariableDeclaration':
        metadata.kind = (node as any).kind;
        metadata.declarations = (node as any).declarations?.length || 0;
        break;
      // Add more cases as needed - NO hardcoded limitations
    }

    return metadata;
  }

  /**
   * Reset internal counters for new traversal
   */
  private resetCounters(): void {
    this.nodeCount = 0;
    this.nodeTypes = {};
    this.findings = [];
  }
}

/**
 * Convenience functions for common traversal patterns
 */

/**
 * Quick traversal with visitor function
 */
export function traverseAST(ast: Node, visitor: Visitor | Function): TraversalResult {
  const traversal = new ASTTraversal();
  return traversal.traverse(ast, visitor);
}

/**
 * Find all nodes of specific type
 */
export function findNodes(
  ast: Node, 
  nodeType: string, 
  filter?: (node: Node, path: NodePath) => boolean
): TraversalFinding[] {
  const traversal = new ASTTraversal();
  return traversal.findNodes(ast, nodeType, filter);
}

/**
 * Get AST statistics
 */
export function getASTStats(ast: Node): {
  nodeTypes: string[];
  complexity: number;
  depth: number;
  statistics: Record<string, number>;
} {
  const traversal = new ASTTraversal();
  return traversal.analyzeStructure(ast);
}

/**
 * Default traversal instance for convenient access
 */
export const astTraversal = new ASTTraversal();