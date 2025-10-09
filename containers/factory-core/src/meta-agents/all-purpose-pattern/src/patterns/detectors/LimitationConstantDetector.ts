/**
 * Limitation Constant Detector
 * 
 * Detects hardcoded numeric constants that impose business limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded constraint values
 * Context7-enhanced with intelligent limitation pattern recognition
 */

import { Node } from '@babel/types';
import { NodePath } from '@babel/traverse';
import { 
  BasePatternDetector, 
  DetectionResult, 
  DetectionContext, 
  PatternDetectorConfig 
} from '../types';

export interface LimitationConstantDetectorConfig extends PatternDetectorConfig {
  minLimitValue?: number;
  maxLimitValue?: number;
  limitationPatterns?: RegExp[];
  excludeConstants?: number[];
  checkVariableNamesOnly?: boolean;
  includeZeroValues?: boolean;
}

/**
 * Detects hardcoded numeric constants that represent limitations
 * Examples: const maxItems = 50; const limitPerUser = 10; const MAX_INDUSTRIES = 25;
 */
export class LimitationConstantDetector extends BasePatternDetector {
  readonly name = 'LimitationConstantDetector';
  readonly description = 'Detects hardcoded numeric constants that impose business limitations or constraints';
  readonly version = '1.0.0';
  readonly supportedNodeTypes = ['VariableDeclarator', 'Property', 'AssignmentExpression'];

  protected config: LimitationConstantDetectorConfig = {
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

  detect(node: Node, path: NodePath, context: DetectionContext): DetectionResult[] {
    if (!this.validateNode(node)) return [];

    const results: DetectionResult[] = [];

    try {
      // Handle VariableDeclarator nodes
      if (node.type === 'VariableDeclarator') {
        const variableResult = this.detectVariableLimitation(node, path, context);
        if (variableResult) results.push(variableResult);
      }

      // Handle Property nodes (object properties)
      if (node.type === 'Property') {
        const propertyResult = this.detectPropertyLimitation(node, path, context);
        if (propertyResult) results.push(propertyResult);
      }

      // Handle AssignmentExpression nodes
      if (node.type === 'AssignmentExpression') {
        const assignmentResult = this.detectAssignmentLimitation(node, path, context);
        if (assignmentResult) results.push(assignmentResult);
      }

    } catch (error) {
      console.warn(`LimitationConstantDetector error in ${context.file}:`, error);
    }

    return results;
  }

  /**
   * Detect limitation constants in variable declarations
   * Example: const maxUsers = 100; const USER_LIMIT = 50;
   */
  private detectVariableLimitation(
    node: any, 
    path: NodePath, 
    context: DetectionContext
  ): DetectionResult | null {
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

    return this.createResult(
      'limitation_constant',
      node,
      path,
      context,
      {
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
      }
    );
  }

  /**
   * Detect limitation constants in object properties
   * Example: { maxItems: 50, userLimit: 100 }
   */
  private detectPropertyLimitation(
    node: any, 
    path: NodePath, 
    context: DetectionContext
  ): DetectionResult | null {
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

    return this.createResult(
      'limitation_constant',
      node,
      path,
      context,
      {
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
      }
    );
  }

  /**
   * Detect limitation constants in assignments
   * Example: this.maxUsers = 100; limits.itemCount = 50;
   */
  private detectAssignmentLimitation(
    node: any, 
    path: NodePath, 
    context: DetectionContext
  ): DetectionResult | null {
    const { left, right } = node;
    
    if (!right || right.type !== 'NumericLiteral') {
      return null;
    }

    const numericValue = right.value;
    let assignmentName = '';

    // Extract assignment target name
    if (left.type === 'Identifier') {
      assignmentName = left.name;
    } else if (left.type === 'MemberExpression' && left.property) {
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

    return this.createResult(
      'limitation_constant',
      node,
      path,
      context,
      {
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
      }
    );
  }

  /**
   * Determine if a constant should be analyzed based on configuration
   */
  private shouldAnalyzeConstant(name: string, value: number, context: DetectionContext): boolean {
    const config = this.config as LimitationConstantDetectorConfig;

    // Check value range
    if (value < (config.minLimitValue || 1)) return false;
    if (value > (config.maxLimitValue || 100000)) return false;

    // Check excluded constants
    const excludeValues = config.excludeConstants || [];
    if (excludeValues.includes(value)) return false;

    // Check zero values setting
    if (value === 0 && !config.includeZeroValues) return false;

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
  private calculateLimitationScore(name: string, value: number, context: DetectionContext): number {
    let score = 0;
    const config = this.config as LimitationConstantDetectorConfig;

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
  private assessValueSuspicion(value: number): number {
    // Common limiting values that suggest business constraints
    const suspiciousRanges = [
      { min: 5, max: 25, suspicion: 0.8 },   // Very common limits
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
  private analyzeContext(name: string, context: DetectionContext): number {
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
  private assessImpact(value: number, name: string): 'breaking' | 'major' | 'minor' | 'cosmetic' {
    // Very low limits are likely breaking changes
    if (value <= 10) return 'breaking';
    
    // API or user-facing limits are major
    if (name.toLowerCase().includes('user') || name.toLowerCase().includes('api')) {
      return 'major';
    }
    
    // High limits might be minor issues
    if (value >= 1000) return 'minor';
    
    return 'major';
  }

  /**
   * Classify the type of limitation based on name and value
   */
  private classifyLimitationType(name: string, value: number): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('user') || lowerName.includes('account')) return 'user-limit';
    if (lowerName.includes('item') || lowerName.includes('product')) return 'item-limit';
    if (lowerName.includes('rate') || lowerName.includes('throttle')) return 'rate-limit';
    if (lowerName.includes('size') || lowerName.includes('length')) return 'size-limit';
    if (lowerName.includes('time') || lowerName.includes('duration')) return 'time-limit';
    if (lowerName.includes('count') || lowerName.includes('number')) return 'count-limit';
    
    return 'general-limit';
  }

  /**
   * Get matching limitation patterns for context
   */
  private getMatchingLimitationPatterns(name: string): string[] {
    const config = this.config as LimitationConstantDetectorConfig;
    const limitationPatterns = config.limitationPatterns || [];
    
    return limitationPatterns
      .filter(pattern => pattern.test(name))
      .map(pattern => pattern.source);
  }

  /**
   * Convert camelCase to config key (snake_case)
   */
  private camelToConfigKey(camelCase: string): string {
    return camelCase
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}