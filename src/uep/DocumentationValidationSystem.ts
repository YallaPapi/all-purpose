/**
 * Documentation Validation System
 * 
 * Comprehensive validation system for autonomous documentation updates,
 * ensuring quality, consistency, and compliance with established standards.
 * 
 * Integrates with the complete documentation automation pipeline.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  ValidationMessage,
  ValidationRule,
  DocumentType,
  DocumentationCategory 
} from './interfaces/IDocumentationManager';

export interface ValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  autoFix: boolean;
  validateOnSave: boolean;
  validateOnCommit: boolean;
  
  // Rule categories
  contentValidation: boolean;
  structureValidation: boolean;
  formatValidation: boolean;
  linkValidation: boolean;
  spellCheck: boolean;
  grammarCheck: boolean;
  
  // Quality thresholds
  minContentLength: number;
  maxLineLength: number;
  requiredSections: string[];
  
  logLevel: 'silent' | 'minimal' | 'verbose';
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-1
  messages: ValidationMessage[];
  autoFixApplied: boolean;
  executionTime: number;
}

export class DocumentationValidationSystem {
  private config: ValidationConfig;
  private validationRules: Map<string, ValidationRule[]>;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      enabled: true,
      strictMode: false,
      autoFix: true,
      validateOnSave: true,
      validateOnCommit: true,
      contentValidation: true,
      structureValidation: true,
      formatValidation: true,
      linkValidation: true,
      spellCheck: false,
      grammarCheck: false,
      minContentLength: 50,
      maxLineLength: 120,
      requiredSections: [],
      logLevel: 'minimal',
      ...config
    };

    this.validationRules = new Map();
    this.initializeValidationRules();
  }

  async validateDocumentation(filePath: string, content?: string): Promise<ValidationResult> {
    const startTime = Date.now();
    
    if (!this.config.enabled) {
      return {
        valid: true,
        score: 1,
        messages: [],
        autoFixApplied: false,
        executionTime: 0
      };
    }

    const result: ValidationResult = {
      valid: true,
      score: 1,
      messages: [],
      autoFixApplied: false,
      executionTime: 0
    };

    try {
      // Read content if not provided
      if (!content) {
        content = await fs.readFile(filePath, 'utf8');
      }

      // Apply all validation rules
      const messages = await this.applyValidationRules(filePath, content);
      result.messages = messages;

      // Calculate validity and score
      const errors = messages.filter(m => m.severity === 'error');
      const warnings = messages.filter(m => m.severity === 'warning');
      
      result.valid = errors.length === 0;
      result.score = Math.max(0, 1 - (errors.length * 0.2) - (warnings.length * 0.05));

      // Apply auto-fixes if enabled
      if (this.config.autoFix && messages.some(m => m.suggestion)) {
        const fixedContent = await this.applyAutoFixes(content, messages);
        if (fixedContent !== content) {
          await fs.writeFile(filePath, fixedContent, 'utf8');
          result.autoFixApplied = true;
        }
      }

      result.executionTime = Date.now() - startTime;
      
      this.log(`Validation complete: ${filePath} (${result.score.toFixed(2)} score, ${messages.length} issues)`, 'info');

    } catch (error) {
      result.valid = false;
      result.score = 0;
      result.messages.push({
        severity: 'error',
        message: `Validation failed: ${error.message}`,
        suggestion: 'Check file accessibility and format'
      });
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  private initializeValidationRules(): void {
    // README validation rules
    this.validationRules.set(DocumentType.README, [
      {
        rule: 'hasTitle',
        severity: 'error',
        message: 'README must have a title (# heading)',
        autoFix: false
      },
      {
        rule: 'hasDescription',
        severity: 'warning',
        message: 'README should have a description section',
        autoFix: false
      },
      {
        rule: 'hasQuickStart',
        severity: 'warning',
        message: 'README should include quick start instructions',
        autoFix: false
      }
    ]);

    // CHANGELOG validation rules
    this.validationRules.set(DocumentType.CHANGELOG, [
      {
        rule: 'followsKeepAChangelog',
        severity: 'warning',
        message: 'Should follow Keep a Changelog format',
        autoFix: false
      },
      {
        rule: 'hasUnreleasedSection',
        severity: 'info',
        message: 'Should have [Unreleased] section',
        autoFix: true
      }
    ]);

    // Add more validation rules...
    this.log('Validation rules initialized', 'debug');
  }

  private async applyValidationRules(filePath: string, content: string): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];
    const documentType = this.getDocumentTypeFromPath(filePath);
    const rules = this.validationRules.get(documentType) || [];

    // Apply document-specific rules
    for (const rule of rules) {
      const ruleMessages = await this.applyRule(rule, content, filePath);
      messages.push(...ruleMessages);
    }

    // Apply general validation rules
    messages.push(...await this.applyGeneralValidation(content, filePath));

    return messages;
  }

  private async applyRule(rule: ValidationRule, content: string, filePath: string): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];

    switch (rule.rule) {
      case 'hasTitle':
        if (!content.match(/^#\s+.+$/m)) {
          messages.push({
            severity: rule.severity,
            message: rule.message,
            line: 1,
            suggestion: 'Add a title using # heading syntax'
          });
        }
        break;

      case 'hasDescription':
        if (content.length < 200 || !content.includes('\n\n')) {
          messages.push({
            severity: rule.severity,
            message: rule.message,
            suggestion: 'Add a detailed description after the title'
          });
        }
        break;

      // Add more rule implementations...
    }

    return messages;
  }

  private async applyGeneralValidation(content: string, filePath: string): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];

    // Content length validation
    if (this.config.contentValidation) {
      if (content.length < this.config.minContentLength) {
        messages.push({
          severity: 'warning',
          message: `Content is very short (${content.length} characters)`,
          suggestion: 'Consider adding more detailed information'
        });
      }
    }

    // Line length validation
    if (this.config.formatValidation) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.length > this.config.maxLineLength && !line.startsWith('```')) {
          messages.push({
            severity: 'info',
            message: `Line exceeds ${this.config.maxLineLength} characters`,
            line: index + 1,
            suggestion: 'Consider breaking long lines for better readability'
          });
        }
      });
    }

    // Link validation
    if (this.config.linkValidation) {
      const linkMessages = await this.validateLinks(content);
      messages.push(...linkMessages);
    }

    return messages;
  }

  private async validateLinks(content: string): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];

      // Validate internal links
      if (linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
        const absolutePath = path.resolve(path.dirname('.'), linkUrl);
        if (!await fs.pathExists(absolutePath)) {
          messages.push({
            severity: 'warning',
            message: `Broken internal link: ${linkUrl}`,
            suggestion: `Check if file exists: ${absolutePath}`
          });
        }
      }

      // Validate link text
      if (linkText.trim().length === 0) {
        messages.push({
          severity: 'info',
          message: 'Empty link text',
          suggestion: 'Provide descriptive link text'
        });
      }
    }

    return messages;
  }

  private async applyAutoFixes(content: string, messages: ValidationMessage[]): Promise<string> {
    let fixedContent = content;

    for (const message of messages) {
      if (message.suggestion && message.suggestion.includes('Add')) {
        // Apply specific auto-fixes based on suggestions
        // This would implement intelligent auto-fixing logic
        continue;
      }
    }

    return fixedContent;
  }

  private getDocumentTypeFromPath(filePath: string): DocumentType {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('readme')) return DocumentType.README;
    if (fileName.includes('changelog')) return DocumentType.CHANGELOG;
    if (fileName.includes('environment') || fileName.includes('setup')) return DocumentType.ENVIRONMENT_SETUP;
    if (fileName.includes('debug')) return DocumentType.DEBUGGING_GUIDE;
    if (fileName.includes('parameter') || fileName.includes('mapping')) return DocumentType.PARAMETER_MAPPING;
    if (fileName.includes('api')) return DocumentType.API_REFERENCE;
    
    return DocumentType.README;
  }

  private log(message: string, level: 'info' | 'debug' = 'info'): void {
    if (this.config.logLevel === 'silent') return;
    if (this.config.logLevel === 'minimal' && level === 'debug') return;

    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [DocumentationValidationSystem] ${message}`);
  }

  // Public API methods
  
  public async validateAll(directoryPath: string): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();
    
    try {
      const files = await fs.readdir(directoryPath, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.md')) {
          const filePath = path.join(directoryPath, file.name);
          const result = await this.validateDocumentation(filePath);
          results.set(filePath, result);
        }
      }
      
    } catch (error) {
      this.log(`Error validating directory ${directoryPath}: ${error.message}`, 'info');
    }
    
    return results;
  }

  public getValidationSummary(results: Map<string, ValidationResult>): {
    totalFiles: number;
    validFiles: number;
    averageScore: number;
    totalIssues: number;
  } {
    const validResults = Array.from(results.values());
    
    return {
      totalFiles: validResults.length,
      validFiles: validResults.filter(r => r.valid).length,
      averageScore: validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length,
      totalIssues: validResults.reduce((sum, r) => sum + r.messages.length, 0)
    };
  }
}

export default DocumentationValidationSystem;