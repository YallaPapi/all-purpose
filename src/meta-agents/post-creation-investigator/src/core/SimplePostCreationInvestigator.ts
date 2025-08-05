/**
 * Simple Post-Creation Investigator Agent
 * Simplified version for immediate integration with orchestrator
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface SimpleInvestigationResult {
  projectPath: string;
  timestamp: Date;
  duration: number;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  score: number;
  issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>;
  filesScanned: number;
  setupRequirements: string[];
  recommendations: string[];
}

export class SimplePostCreationInvestigator {
  async investigate(projectPath: string, projectType: string = 'generic'): Promise<SimpleInvestigationResult> {
    const startTime = Date.now();
    console.log(`🔍 Starting investigation of project: ${projectPath}`);

    const result: SimpleInvestigationResult = {
      projectPath,
      timestamp: new Date(),
      duration: 0,
      overallStatus: 'PASS',
      score: 85,
      issues: [],
      filesScanned: 0,
      setupRequirements: [],
      recommendations: []
    };

    try {
      // Check if project exists
      if (!(await fs.pathExists(projectPath))) {
        result.issues.push({
          type: 'structure',
          severity: 'error',
          message: `Project path does not exist: ${projectPath}`
        });
        result.overallStatus = 'FAIL';
        result.score = 0;
        return result;
      }

      // Scan project structure
      const files = await this.scanProjectFiles(projectPath);
      result.filesScanned = files.length;

      // Basic checks
      await this.checkBasicStructure(projectPath, result);
      await this.checkPackageFiles(projectPath, result);
      await this.checkConfigFiles(projectPath, result);

      // Calculate final status and score
      const errorCount = result.issues.filter(i => i.severity === 'error').length;
      const warningCount = result.issues.filter(i => i.severity === 'warning').length;

      if (errorCount > 0) {
        result.overallStatus = 'FAIL';
        result.score = Math.max(20, 85 - (errorCount * 15) - (warningCount * 5));
      } else if (warningCount > 0) {
        result.overallStatus = 'WARNING';
        result.score = Math.max(60, 85 - (warningCount * 5));
      }

      // Generate setup requirements
      if (errorCount > 0) {
        result.setupRequirements.push('Fix critical issues before deployment');
      }
      if (!await fs.pathExists(path.join(projectPath, 'README.md'))) {
        result.setupRequirements.push('Add README.md with setup instructions');
      }

      // Generate recommendations
      result.recommendations.push('Review generated code for business logic completeness');
      result.recommendations.push('Add comprehensive error handling');
      result.recommendations.push('Consider adding monitoring and logging');

      result.duration = Date.now() - startTime;

      console.log(`✅ Investigation completed: ${result.overallStatus} (Score: ${result.score})`);
      console.log(`📊 Files scanned: ${result.filesScanned}, Issues: ${result.issues.length}`);

      return result;

    } catch (error) {
      result.issues.push({
        type: 'system',
        severity: 'error',
        message: `Investigation failed: ${error instanceof Error ? error.message : String(error)}`
      });
      result.overallStatus = 'FAIL';
      result.score = 0;
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  async quickCheck(projectPath: string): Promise<{ status: string; score: number; issues: number }> {
    console.log(`⚡ Quick check of project: ${projectPath}`);
    
    try {
      if (!(await fs.pathExists(projectPath))) {
        return { status: 'FAIL', score: 0, issues: 1 };
      }

      const hasPackageJson = await fs.pathExists(path.join(projectPath, 'package.json'));
      const hasMainFile = await this.hasMainFile(projectPath);
      
      let score = 50;
      let issues = 0;

      if (hasPackageJson) score += 25;
      else issues++;

      if (hasMainFile) score += 25;
      else issues++;

      const status = issues === 0 ? 'PASS' : (score > 30 ? 'WARNING' : 'FAIL');

      console.log(`⚡ Quick check result: ${status} (Score: ${score})`);
      return { status, score, issues };

    } catch (error) {
      return { status: 'ERROR', score: 0, issues: 1 };
    }
  }

  private async scanProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isFile()) {
          files.push(item.name);
        } else if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          const subFiles = await this.scanProjectFiles(path.join(projectPath, item.name));
          files.push(...subFiles.map(f => path.join(item.name, f)));
        }
      }
    } catch (error) {
      // Silent fail for permission issues
    }

    return files;
  }

  private async checkBasicStructure(projectPath: string, result: SimpleInvestigationResult): Promise<void> {
    const srcExists = await fs.pathExists(path.join(projectPath, 'src'));
    const libExists = await fs.pathExists(path.join(projectPath, 'lib'));
    const indexExists = await fs.pathExists(path.join(projectPath, 'index.js')) || 
                        await fs.pathExists(path.join(projectPath, 'index.ts')) ||
                        await fs.pathExists(path.join(projectPath, 'main.js'));

    if (!srcExists && !libExists && !indexExists) {
      result.issues.push({
        type: 'structure',
        severity: 'warning',
        message: 'No standard source directory (src/) or main file found'
      });
    }
  }

  private async checkPackageFiles(projectPath: string, result: SimpleInvestigationResult): Promise<void> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageContent = await fs.readJson(packageJsonPath);
        
        if (!packageContent.name) {
          result.issues.push({
            type: 'package',
            severity: 'warning',
            message: 'package.json is missing name field'
          });
        }

        if (!packageContent.scripts) {
          result.issues.push({
            type: 'package',
            severity: 'info',
            message: 'package.json has no scripts defined'
          });
        }

      } catch (error) {
        result.issues.push({
          type: 'package',
          severity: 'error',
          message: 'package.json is malformed or unreadable'
        });
      }
    } else {
      result.issues.push({
        type: 'package',
        severity: 'error',
        message: 'package.json is missing'
      });
    }
  }

  private async checkConfigFiles(projectPath: string, result: SimpleInvestigationResult): Promise<void> {
    const configFiles = ['tsconfig.json', '.eslintrc.js', '.eslintrc.json', 'jest.config.js'];
    let configCount = 0;

    for (const configFile of configFiles) {
      if (await fs.pathExists(path.join(projectPath, configFile))) {
        configCount++;
      }
    }

    if (configCount === 0) {
      result.issues.push({
        type: 'config',
        severity: 'info',
        message: 'No standard config files found (tsconfig.json, eslint, jest)'
      });
    }
  }

  private async hasMainFile(projectPath: string): Promise<boolean> {
    const mainFiles = ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts'];
    
    for (const file of mainFiles) {
      if (await fs.pathExists(path.join(projectPath, file))) {
        return true;
      }
      // Check in src directory
      if (await fs.pathExists(path.join(projectPath, 'src', file))) {
        return true;
      }
    }
    
    return false;
  }

  getStatus(): { agentId: string; status: string; investigations: number } {
    return {
      agentId: 'simple-post-creation-investigator',
      status: 'ready',
      investigations: 0
    };
  }
}