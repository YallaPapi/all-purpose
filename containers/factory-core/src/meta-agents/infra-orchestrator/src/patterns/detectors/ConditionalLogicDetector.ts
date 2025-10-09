/**
 * Conditional Logic Detector
 * 
 * Use context7: Detects hardcoded conditional logic that violates All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies if/switch statements based on hardcoded business values
 */

import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import { IfStatement, SwitchStatement, BinaryExpression, StringLiteral, NumericLiteral, SwitchCase } from '@babel/types';
import { PatternDetector, DetectionResult } from '../types.js';

export class ConditionalLogicDetector implements PatternDetector {
  public readonly id = 'conditional-logic';
  public readonly name = 'Conditional Logic Detector';
  public readonly description = 'Detects hardcoded conditional logic that suggests business rule constraints';

  private readonly businessValuePatterns = [
    // Plan/tier comparisons
    'free', 'basic', 'premium', 'pro', 'enterprise', 'starter', 'trial',
    
    // User types/roles
    'admin', 'user', 'guest', 'moderator', 'owner', 'member',
    
    // Status values
    'active', 'inactive', 'pending', 'approved', 'rejected', 'suspended',
    'enabled', 'disabled', 'published', 'draft', 'archived',
    
    // Countries/regions
    'usa', 'us', 'canada', 'uk', 'eu', 'asia', 'europe',
    'united states', 'united kingdom',
    
    // Industries/business types
    'retail', 'finance', 'healthcare', 'technology', 'manufacturing',
    'education', 'nonprofit', 'government', 'startup',
    
    // Business size indicators
    'small', 'medium', 'large', 'enterprise', 'sme',
    
    // Feature flags that sound like business rules
    'beta', 'alpha', 'experimental', 'legacy', 'new'
  ];

  private readonly suspiciousNumericValues = [
    // Common business thresholds
    1, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000,
    // Percentage values
    0.1, 0.25, 0.5, 0.75, 1.0
  ];

  async detect(filePath: string, sourceCode: string): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    
    try {
      const ast = parse(sourceCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true
      });

      traverse(ast, {
        IfStatement: (path: NodePath<IfStatement>) => {
          const detection = this.analyzeIfStatement(path, filePath, sourceCode);
          if (detection) {
            results.push(detection);
          }
        },
        
        SwitchStatement: (path: NodePath<SwitchStatement>) => {
          const detection = this.analyzeSwitchStatement(path, filePath, sourceCode);
          if (detection) {
            results.push(detection);
          }
        }
      });

    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error);
    }

    return results;
  }

  private analyzeIfStatement(path: NodePath<IfStatement>, filePath: string, sourceCode: string): DetectionResult | null {
    const node = path.node;
    
    const hardcodedValues = this.extractHardcodedValues(node.test);
    
    if (hardcodedValues.length > 0) {
      const suspicionScore = this.calculateSuspicionScore(hardcodedValues);
      
      if (suspicionScore > 0.5) {
        const location = node.loc;
        
        return {
          ruleId: this.id,
          severity: suspicionScore > 0.8 ? 'error' : 'warning',
          message: this.generateMessage('if statement', hardcodedValues),
          filePath,
          lineNumber: location?.start.line || 0,
          columnNumber: location?.start.column || 0,
          codeSnippet: this.getCodeSnippet(sourceCode, location),
          suggestion: this.generateSuggestion('conditional logic', hardcodedValues),
          metadata: {
            statementType: 'if',
            hardcodedValues,
            suspicionScore
          }
        };
      }
    }

    return null;
  }

  private analyzeSwitchStatement(path: NodePath<SwitchStatement>, filePath: string, sourceCode: string): DetectionResult | null {
    const node = path.node;
    
    // Analyze switch cases for hardcoded values
    const hardcodedValues: Array<string | number> = [];
    
    node.cases.forEach(switchCase => {
      if (switchCase.test?.type === 'StringLiteral') {
        hardcodedValues.push(switchCase.test.value);
      } else if (switchCase.test?.type === 'NumericLiteral') {
        hardcodedValues.push(switchCase.test.value);
      }
    });

    if (hardcodedValues.length > 1) { // Need at least 2 cases to be suspicious
      const suspicionScore = this.calculateSuspicionScore(hardcodedValues);
      
      if (suspicionScore > 0.5) {
        const location = node.loc;
        
        return {
          ruleId: this.id,
          severity: suspicionScore > 0.8 ? 'error' : 'warning',
          message: this.generateMessage('switch statement', hardcodedValues),
          filePath,
          lineNumber: location?.start.line || 0,
          columnNumber: location?.start.column || 0,
          codeSnippet: this.getCodeSnippet(sourceCode, location),
          suggestion: this.generateSuggestion('switch statement', hardcodedValues),
          metadata: {
            statementType: 'switch',
            hardcodedValues,
            suspicionScore,
            caseCount: node.cases.length
          }
        };
      }
    }

    return null;
  }

  private extractHardcodedValues(testExpression: any): Array<string | number> {
    const values: Array<string | number> = [];
    
    if (testExpression.type === 'BinaryExpression') {
      // Check both sides of binary expression
      if (testExpression.right?.type === 'StringLiteral') {
        values.push(testExpression.right.value);
      } else if (testExpression.right?.type === 'NumericLiteral') {
        values.push(testExpression.right.value);
      }
      
      if (testExpression.left?.type === 'StringLiteral') {
        values.push(testExpression.left.value);
      } else if (testExpression.left?.type === 'NumericLiteral') {
        values.push(testExpression.left.value);
      }
      
      // Recursively check nested binary expressions
      if (testExpression.left?.type === 'BinaryExpression') {
        values.push(...this.extractHardcodedValues(testExpression.left));
      }
      if (testExpression.right?.type === 'BinaryExpression') {
        values.push(...this.extractHardcodedValues(testExpression.right));
      }
    } else if (testExpression.type === 'LogicalExpression') {
      // Handle && and || operators
      values.push(...this.extractHardcodedValues(testExpression.left));
      values.push(...this.extractHardcodedValues(testExpression.right));
    }
    
    return values;
  }

  private calculateSuspicionScore(hardcodedValues: Array<string | number>): number {
    let score = 0;

    // Check string values against business patterns
    const stringValues = hardcodedValues.filter(v => typeof v === 'string') as string[];
    if (stringValues.length > 0) {
      const businessMatches = stringValues.filter(value => 
        this.businessValuePatterns.some(pattern => 
          value.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(value.toLowerCase())
        )
      );
      
      const stringScore = Math.min(businessMatches.length / stringValues.length, 1) * 0.6;
      score += stringScore;
    }

    // Check numeric values against suspicious patterns
    const numericValues = hardcodedValues.filter(v => typeof v === 'number') as number[];
    if (numericValues.length > 0) {
      const suspiciousNumbers = numericValues.filter(value => 
        this.suspiciousNumericValues.includes(value) ||
        this.isSuspiciousNumber(value)
      );
      
      const numericScore = Math.min(suspiciousNumbers.length / numericValues.length, 1) * 0.4;
      score += numericScore;
    }

    // Boost score based on the number of hardcoded values (more = more suspicious)
    if (hardcodedValues.length >= 3) score += 0.2;
    if (hardcodedValues.length >= 5) score += 0.1;

    return Math.min(score, 1);
  }

  private isSuspiciousNumber(value: number): boolean {
    // Check for round numbers that look like business thresholds
    if (typeof value === 'number' && value > 0 && value <= 10000) {
      const str = value.toString();
      const roundPatterns = [
        /^[1-9]$/, // Single digits
        /^[1-9]0$/, // 10, 20, 30, etc.
        /^[1-9]00$/, // 100, 200, 300, etc.
        /^[1-9]000$/, // 1000, 2000, etc.
      ];
      
      return roundPatterns.some(pattern => pattern.test(str));
    }
    
    return false;
  }

  private generateMessage(statementType: string, hardcodedValues: Array<string | number>): string {
    const valuePreview = hardcodedValues.slice(0, 3).map(v => 
      typeof v === 'string' ? `"${v}"` : v
    ).join(', ');
    
    const moreText = hardcodedValues.length > 3 ? ` (and ${hardcodedValues.length - 3} more)` : '';
    
    return `Potential hardcoded business logic detected in ${statementType} comparing against: ${valuePreview}${moreText}. ` +
           `Consider using configuration or enums to follow All-Purpose Pattern.`;
  }

  private generateSuggestion(statementType: string, hardcodedValues: Array<string | number>): string {
    return `Consider replacing hardcoded values in ${statementType} with configuration-driven logic. ` +
           `Use enums, configuration files, or database lookups to make business rules adaptable ` +
           `without code changes. This allows the system to work across different business contexts.`;
  }

  private getCodeSnippet(sourceCode: string, location: any): string {
    if (!location) return '';
    
    const lines = sourceCode.split('\n');
    const startLine = Math.max(0, location.start.line - 2);
    const endLine = Math.min(lines.length - 1, location.end.line + 1);
    
    return lines.slice(startLine, endLine + 1).join('\n');
  }
}