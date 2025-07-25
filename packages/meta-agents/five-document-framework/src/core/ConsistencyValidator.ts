/**
 * Consistency Validator for Five Document Framework
 * 
 * Validates cross-document consistency and parameter mappings
 * Following All-Purpose Pattern: UNLIMITED validation rules
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import semver from 'semver';

import {
  ConsistencyCheck,
  CrossReferenceCheck,
  ParameterMappingCheck,
  VersionConsistencyCheck,
  FormatConsistencyCheck,
  TemplateContext
} from '../types/index.js';

export class ConsistencyValidator {
  
  /**
   * Validate document consistency
   */
  async validate(
    documentPaths: string[], 
    context: TemplateContext
  ): Promise<ConsistencyCheck> {
    try {
      console.log(chalk.blue('🔍 Validating document consistency...'));

      // Load all documents
      const documents = await this.loadDocuments(documentPaths);

      // Perform consistency checks
      const crossReferences = await this.validateCrossReferences(documents);
      const parameterMappings = await this.validateParameterMappings(documents, context);
      const versionConsistency = await this.validateVersionConsistency(documents, context);
      const formatConsistency = await this.validateFormatConsistency(documents);

      const check: ConsistencyCheck = {
        crossReferences,
        parameterMappings,
        versionConsistency,
        formatConsistency
      };

      this.logConsistencyResults(check);
      
      return check;

    } catch (error) {
      console.error(chalk.red('❌ Consistency validation failed:'), error);
      throw error;
    }
  }

  /**
   * Load documents for validation
   */
  private async loadDocuments(documentPaths: string[]): Promise<Map<string, string>> {
    const documents = new Map<string, string>();

    for (const docPath of documentPaths) {
      try {
        if (await fs.pathExists(docPath)) {
          const content = await fs.readFile(docPath, 'utf8');
          const documentName = path.basename(docPath);
          documents.set(documentName, content);
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to load ${docPath}:`, error));
      }
    }

    return documents;
  }

  /**
   * Validate cross-references between documents
   */
  private async validateCrossReferences(
    documents: Map<string, string>
  ): Promise<CrossReferenceCheck[]> {
    const checks: CrossReferenceCheck[] = [];

    for (const [sourceDoc, content] of documents.entries()) {
      // Find references to other documents
      const references = this.findDocumentReferences(content);

      for (const reference of references) {
        const targetDoc = reference.target;
        const isValid = documents.has(targetDoc) || await this.checkExternalReference(reference);

        checks.push({
          sourceDocument: sourceDoc,
          targetDocument: targetDoc,
          referenceType: reference.type,
          isValid,
          suggestion: isValid ? undefined : `Create or verify ${targetDoc} exists`
        });
      }
    }

    return checks;
  }

  /**
   * Find document references in content
   */
  private findDocumentReferences(content: string): Array<{ target: string; type: string; line?: number }> {
    const references: Array<{ target: string; type: string; line?: number }> = [];
    const lines = content.split('\\n');

    lines.forEach((line, index) => {
      // Markdown link references: [text](document.md)
      const markdownLinks = line.match(/\[([^\]]+)\]\(([^)]+\.md)\)/g);
      if (markdownLinks) {
        markdownLinks.forEach(link => {
          const match = link.match(/\[([^\]]+)\]\(([^)]+\.md)\)/);
          if (match) {
            references.push({
              target: path.basename(match[2]),
              type: 'markdown-link',
              line: index + 1
            });
          }
        });
      }

      // Reference-style links: see ENVIRONMENT_SETUP.md
      const refLinks = line.match(/(?:see|check|refer to|consult)\\s+([A-Z_-]+\\.md)/gi);
      if (refLinks) {
        refLinks.forEach(ref => {
          const match = ref.match(/([A-Z_-]+\\.md)/i);
          if (match) {
            references.push({
              target: match[1],
              type: 'reference-mention',
              line: index + 1
            });
          }
        });
      }

      // API endpoint references: `/api/something`
      const apiRefs = line.match(/`\/api\/[^`]+`/g);
      if (apiRefs) {
        apiRefs.forEach(apiRef => {
          references.push({
            target: apiRef.replace(/`/g, ''),
            type: 'api-reference',
            line: index + 1
          });
        });
      }
    });

    return references;
  }

  /**
   * Check external references (like API endpoints)
   */
  private async checkExternalReference(reference: { target: string; type: string }): Promise<boolean> {
    // For API references, we can't validate without running the server
    // For now, we assume they're valid if they follow the pattern
    if (reference.type === 'api-reference') {
      return reference.target.startsWith('/api/');
    }

    // For file references, check if they exist in common locations
    if (reference.type === 'file-reference') {
      const commonPaths = [
        path.join(process.cwd(), reference.target),
        path.join(process.cwd(), 'docs', reference.target),
        path.join(process.cwd(), 'docs-consolidated', reference.target)
      ];

      for (const checkPath of commonPaths) {
        if (await fs.pathExists(checkPath)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate parameter mappings consistency
   */
  private async validateParameterMappings(
    documents: Map<string, string>,
    context: TemplateContext
  ): Promise<ParameterMappingCheck[]> {
    const checks: ParameterMappingCheck[] = [];

    // Extract parameters mentioned in each document
    const documentParameters = new Map<string, Set<string>>();

    for (const [docName, content] of documents.entries()) {
      const parameters = this.extractParameters(content);
      documentParameters.set(docName, parameters);
    }

    // Find all unique parameters
    const allParameters = new Set<string>();
    documentParameters.forEach(params => {
      params.forEach(param => allParameters.add(param));
    });

    // Check each parameter's consistency
    for (const parameter of allParameters) {
      const mappedIn: string[] = [];
      const missingFrom: string[] = [];

      documentParameters.forEach((params, docName) => {
        if (params.has(parameter)) {
          mappedIn.push(docName);
        } else if (this.shouldParameterBeInDocument(parameter, docName)) {
          missingFrom.push(docName);
        }
      });

      if (mappedIn.length > 0 || missingFrom.length > 0) {
        checks.push({
          parameter,
          mappedIn,
          missingFrom,
          inconsistencies: this.findParameterInconsistencies(parameter, documents)
        });
      }
    }

    return checks;
  }

  /**
   * Extract parameters from document content
   */
  private extractParameters(content: string): Set<string> {
    const parameters = new Set<string>();

    // Environment variables: ${VAR_NAME} or $VAR_NAME
    const envVars = content.match(/\\$\\{?([A-Z_][A-Z0-9_]*)\\}?/g);
    if (envVars) {
      envVars.forEach(match => {
        const varName = match.replace(/[${} ]/g, '');
        parameters.add(varName);
      });
    }

    // Configuration parameters: config.paramName
    const configParams = content.match(/config\\.([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (configParams) {
      configParams.forEach(match => {
        const paramName = match.replace('config.', '');
        parameters.add(paramName);
      });
    }

    // API parameters: frequently mentioned parameter-like words
    const apiParams = content.match(/(?:param|parameter|variable|setting|config)\\s*:?\\s*([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (apiParams) {
      apiParams.forEach(match => {
        const paramMatch = match.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (paramMatch) {
          parameters.add(paramMatch[1]);
        }
      });
    }

    return parameters;
  }

  /**
   * Check if parameter should be in specific document
   */
  private shouldParameterBeInDocument(parameter: string, documentName: string): boolean {
    const parameterDocumentMap: Record<string, string[]> = {
      'ENVIRONMENT_SETUP.md': ['API_KEY', 'DATABASE_URL', 'PORT', 'NODE_ENV'],
      'PARAMETER_MAPPING.md': ['userId', 'requestId', 'apiKey', 'endpoint'],
      'DEBUGGING_GUIDE.md': ['DEBUG', 'LOG_LEVEL', 'VERBOSE']
    };

    const expectedParams = parameterDocumentMap[documentName];
    if (!expectedParams) return false;

    return expectedParams.some(expected => 
      parameter.toLowerCase().includes(expected.toLowerCase()) ||
      expected.toLowerCase().includes(parameter.toLowerCase())
    );
  }

  /**
   * Find parameter inconsistencies
   */
  private findParameterInconsistencies(
    parameter: string, 
    documents: Map<string, string>
  ): string[] {
    const inconsistencies: string[] = [];
    const usages = new Map<string, string[]>();

    // Find how parameter is used in each document
    documents.forEach((content, docName) => {
      const parameterUsages = this.findParameterUsages(parameter, content);
      if (parameterUsages.length > 0) {
        usages.set(docName, parameterUsages);
      }
    });

    // Check for naming inconsistencies
    const allUsages = Array.from(usages.values()).flat();
    const uniqueUsages = [...new Set(allUsages)];
    
    if (uniqueUsages.length > 1) {
      inconsistencies.push(`Parameter referenced as: ${uniqueUsages.join(', ')}`);
    }

    return inconsistencies;
  }

  /**
   * Find parameter usages in content
   */
  private findParameterUsages(parameter: string, content: string): string[] {
    const usages: string[] = [];
    const regex = new RegExp(`\\\\b${parameter}\\\\b|\\\\$\\\\{?${parameter}\\\\}?|config\\\\.${parameter}`, 'gi');
    const matches = content.match(regex);
    
    if (matches) {
      matches.forEach(match => {
        if (!usages.includes(match)) {
          usages.push(match);
        }
      });
    }

    return usages;
  }

  /**
   * Validate version consistency
   */
  private async validateVersionConsistency(
    documents: Map<string, string>,
    context: TemplateContext
  ): Promise<VersionConsistencyCheck> {
    const versions: Record<string, string> = {};
    const suggestions: string[] = [];

    // Extract versions from different sources
    if (context.project.version) {
      versions.project = context.project.version;
    }

    // Check package.json if available
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        versions.packageJson = packageJson.version;
      } catch (error) {
        console.warn(chalk.yellow('⚠️  Failed to read package.json version'));
      }
    }

    // Extract version from CHANGELOG.md
    const changelogContent = documents.get('CHANGELOG.md');
    if (changelogContent) {
      const versionMatch = changelogContent.match(/##\s+\[?([0-9]+\.[0-9]+\.[0-9]+)/);
      if (versionMatch) {
        versions.changelog = versionMatch[1];
      }
    }

    // Check consistency
    const uniqueVersions = [...new Set(Object.values(versions))];
    const isConsistent = uniqueVersions.length <= 1;

    if (!isConsistent) {
      suggestions.push('Update all version references to match the latest version');
      Object.entries(versions).forEach(([source, version]) => {
        suggestions.push(`${source}: ${version}`);
      });
    }

    return {
      ...versions,
      isConsistent,
      suggestions
    };
  }

  /**
   * Validate format consistency
   */
  private async validateFormatConsistency(
    documents: Map<string, string>
  ): Promise<FormatConsistencyCheck[]> {
    const checks: FormatConsistencyCheck[] = [];

    for (const [docName, content] of documents.entries()) {
      const issues: string[] = [];
      
      // Check Markdown formatting
      if (docName.endsWith('.md')) {
        // Check for proper heading hierarchy
        const headings = content.match(/^#+\\s+.+$/gm);
        if (headings) {
          let previousLevel = 0;
          headings.forEach((heading, index) => {
            const level = heading.match(/^#+/)?.[0].length || 0;
            if (level > previousLevel + 1) {
              issues.push(`Heading level skip at line with: "${heading.trim()}"`);
            }
            previousLevel = level;
          });
        }

        // Check for consistent code block formatting
        const codeBlocks = content.match(/```[\\s\\S]*?```/g);
        if (codeBlocks) {
          codeBlocks.forEach(block => {
            if (!block.match(/```\\w+/)) {
              issues.push('Code block missing language specification');
            }
          });
        }

        // Check for consistent list formatting
        const listItems = content.match(/^\\s*[-*+]\\s+/gm);
        if (listItems && listItems.length > 1) {
          const bullets = listItems.map(item => item.trim()[0]);
          const uniqueBullets = [...new Set(bullets)];
          if (uniqueBullets.length > 1) {
            issues.push(`Inconsistent list bullet styles: ${uniqueBullets.join(', ')}`);
          }
        }
      }

      checks.push({
        document: docName,
        format: docName.endsWith('.md') ? 'markdown' : 'text',
        isValid: issues.length === 0,
        issues
      });
    }

    return checks;
  }

  /**
   * Log consistency results
   */
  private logConsistencyResults(check: ConsistencyCheck): void {
    console.log(chalk.blue('\\n📊 Consistency Check Results:'));

    // Cross-references
    const invalidRefs = check.crossReferences.filter(ref => !ref.isValid);
    if (invalidRefs.length > 0) {
      console.log(chalk.yellow(`⚠️  Invalid cross-references: ${invalidRefs.length}`));
      invalidRefs.forEach(ref => {
        console.log(chalk.yellow(`   ${ref.sourceDocument} → ${ref.targetDocument}`));
      });
    } else {
      console.log(chalk.green('✅ All cross-references valid'));
    }

    // Parameter mappings
    const problematicParams = check.parameterMappings.filter(
      param => param.missingFrom.length > 0 || param.inconsistencies.length > 0
    );
    if (problematicParams.length > 0) {
      console.log(chalk.yellow(`⚠️  Parameter mapping issues: ${problematicParams.length}`));
    } else {
      console.log(chalk.green('✅ Parameter mappings consistent'));
    }

    // Version consistency
    if (!check.versionConsistency.isConsistent) {
      console.log(chalk.yellow('⚠️  Version inconsistencies found'));
    } else {
      console.log(chalk.green('✅ Version consistency validated'));
    }

    // Format consistency
    const formatIssues = check.formatConsistency.filter(format => !format.isValid);
    if (formatIssues.length > 0) {
      console.log(chalk.yellow(`⚠️  Format issues: ${formatIssues.length} documents`));
    } else {
      console.log(chalk.green('✅ All document formats valid'));
    }
  }
}