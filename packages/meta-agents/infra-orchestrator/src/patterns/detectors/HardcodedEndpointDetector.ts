/**
 * Hardcoded Endpoint Detector
 * 
 * Use context7: Detects hardcoded API endpoints that violate All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies hardcoded URLs in HTTP calls that should be configurable
 */

import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import { CallExpression, StringLiteral, MemberExpression } from '@babel/types';
import { PatternDetector, DetectionResult } from '../types.js';

export class HardcodedEndpointDetector implements PatternDetector {
  public readonly id = 'hardcoded-endpoints';
  public readonly name = 'Hardcoded Endpoint Detector';
  public readonly description = 'Detects hardcoded API endpoints and URLs that should be configurable';

  private readonly httpMethods = [
    // Fetch API
    'fetch',
    
    // Axios methods
    'axios', 'axios.get', 'axios.post', 'axios.put', 'axios.delete', 'axios.patch',
    'axios.head', 'axios.options',
    
    // Other HTTP libraries
    'request', 'superagent', 'node-fetch',
    
    // XMLHttpRequest methods
    'XMLHttpRequest', 'xhr.open',
    
    // jQuery
    '$.ajax', '$.get', '$.post', '$.put', '$.delete',
    
    // Angular HTTP
    'http.get', 'http.post', 'http.put', 'http.delete', 'http.patch',
    'httpClient.get', 'httpClient.post', 'httpClient.put', 'httpClient.delete'
  ];

  private readonly urlPatterns = [
    // Full URL patterns
    /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    
    // API endpoint patterns
    /^\/api\//,
    /^\/v[0-9]+\//,
    /^\/graphql/,
    /^\/rest\//,
    
    // Common service patterns
    /amazonaws\.com/,
    /googleapis\.com/,
    /api\..*\.com/,
    /.*\.api\./,
    
    // Environment-specific patterns
    /localhost/,
    /127\.0\.0\.1/,
    /staging\./,
    /dev\./,
    /prod\./,
    /production\./
  ];

  private readonly suspiciousEndpointPatterns = [
    // Environment-specific URLs
    /staging/i,
    /dev/i,
    /prod/i,
    /production/i,
    /test/i,
    /demo/i,
    
    // Hardcoded service URLs
    /stripe\.com/i,
    /paypal\.com/i,
    /auth0\.com/i,
    /firebase/i,
    /aws\.amazon/i,
    /googleapis/i,
    
    // Company-specific patterns
    /\.internal/i,
    /\.corp/i,
    /\.company/i
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
        CallExpression: (path: NodePath<CallExpression>) => {
          const detection = this.analyzeCallExpression(path, filePath, sourceCode);
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

  private analyzeCallExpression(path: NodePath<CallExpression>, filePath: string, sourceCode: string): DetectionResult | null {
    const node = path.node;
    
    // Check if this is an HTTP-related call
    if (!this.isHttpCall(node)) return null;

    // Look for string literal arguments that contain URLs
    const urlArguments = this.extractUrlArguments(node);
    
    for (const urlArg of urlArguments) {
      if (this.isHardcodedEndpoint(urlArg.value)) {
        const suspicionScore = this.calculateSuspicionScore(urlArg.value);
        
        if (suspicionScore > 0.5) {
          const location = node.loc;
          const callName = this.getCallName(node);
          
          return {
            ruleId: this.id,
            severity: suspicionScore > 0.8 ? 'error' : 'warning',
            message: this.generateMessage(callName, urlArg.value),
            filePath,
            lineNumber: location?.start.line || 0,
            columnNumber: location?.start.column || 0,
            codeSnippet: this.getCodeSnippet(sourceCode, location),
            suggestion: this.generateSuggestion(urlArg.value),
            metadata: {
              callName,
              endpoint: urlArg.value,
              suspicionScore,
              urlType: this.categorizeUrl(urlArg.value)
            }
          };
        }
      }
    }

    return null;
  }

  private isHttpCall(node: CallExpression): boolean {
    const callName = this.getCallName(node);
    
    return this.httpMethods.some(method => 
      callName.toLowerCase().includes(method.toLowerCase()) ||
      callName.endsWith('.' + method.split('.').pop())
    );
  }

  private getCallName(node: CallExpression): string {
    if (node.callee.type === 'Identifier') {
      return node.callee.name;
    } else if (node.callee.type === 'MemberExpression') {
      return this.getMemberExpressionName(node.callee);
    }
    return 'unknown';
  }

  private getMemberExpressionName(expr: MemberExpression): string {
    let name = '';
    
    if (expr.object.type === 'Identifier') {
      name = expr.object.name;
    } else if (expr.object.type === 'MemberExpression') {
      name = this.getMemberExpressionName(expr.object);
    }
    
    if (expr.property.type === 'Identifier') {
      name += '.' + expr.property.name;
    }
    
    return name;
  }

  private extractUrlArguments(node: CallExpression): StringLiteral[] {
    const urlArgs: StringLiteral[] = [];
    
    // Check direct string arguments
    for (const arg of node.arguments) {
      if (arg.type === 'StringLiteral') {
        urlArgs.push(arg);
      } else if (arg.type === 'ObjectExpression') {
        // Check for url property in config objects
        for (const prop of arg.properties) {
          if (prop.type === 'ObjectProperty' && 
              prop.key.type === 'Identifier' && 
              prop.key.name === 'url' &&
              prop.value.type === 'StringLiteral') {
            urlArgs.push(prop.value);
          }
        }
      }
    }
    
    return urlArgs;
  }

  private isHardcodedEndpoint(url: string): boolean {
    // Check if it matches URL patterns
    return this.urlPatterns.some(pattern => pattern.test(url));
  }

  private calculateSuspicionScore(url: string): number {
    let score = 0;

    // Base score for being a URL
    if (this.urlPatterns.some(pattern => pattern.test(url))) {
      score += 0.4;
    }

    // Higher score for suspicious patterns
    const suspiciousMatches = this.suspiciousEndpointPatterns.filter(pattern => 
      pattern.test(url)
    );
    score += Math.min(suspiciousMatches.length * 0.3, 0.6);

    // Environment-specific URLs are highly suspicious
    if (/localhost|127\.0\.0\.1|staging|dev|prod|production/.test(url)) {
      score += 0.4;
    }

    // Full URLs are more suspicious than relative paths
    if (/^https?:\/\//.test(url)) {
      score += 0.2;
    }

    // Third-party service URLs
    if (/(amazonaws|googleapis|stripe|paypal|auth0)\.com/.test(url)) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  private categorizeUrl(url: string): string {
    if (/^https?:\/\//.test(url)) return 'absolute';
    if (/^\/api\//.test(url)) return 'api-relative';
    if (/^\//.test(url)) return 'relative';
    if (/localhost|127\.0\.0\.1/.test(url)) return 'local';
    if (/(staging|dev|prod|production)/.test(url)) return 'environment-specific';
    if (/(amazonaws|googleapis)/.test(url)) return 'cloud-service';
    return 'other';
  }

  private generateMessage(callName: string, endpoint: string): string {
    const urlType = this.categorizeUrl(endpoint);
    
    return `Hardcoded endpoint detected in ${callName}: "${endpoint}". ` +
           `This ${urlType} URL should be configurable to follow All-Purpose Pattern.`;
  }

  private generateSuggestion(endpoint: string): string {
    const urlType = this.categorizeUrl(endpoint);
    
    let suggestion = `Consider moving "${endpoint}" to a configuration file or environment variable. `;
    
    switch (urlType) {
      case 'environment-specific':
        suggestion += 'Environment-specific URLs should be configurable to support different deployment contexts.';
        break;
      case 'cloud-service':
        suggestion += 'Cloud service URLs should be configurable to support different providers or regions.';
        break;
      case 'absolute':
        suggestion += 'Absolute URLs should be configurable to support different environments and deployments.';
        break;
      default:
        suggestion += 'This allows the application to work across different environments and deployment scenarios.';
    }
    
    return suggestion;
  }

  private getCodeSnippet(sourceCode: string, location: any): string {
    if (!location) return '';
    
    const lines = sourceCode.split('\n');
    const startLine = Math.max(0, location.start.line - 2);
    const endLine = Math.min(lines.length - 1, location.end.line + 1);
    
    return lines.slice(startLine, endLine + 1).join('\n');
  }
}