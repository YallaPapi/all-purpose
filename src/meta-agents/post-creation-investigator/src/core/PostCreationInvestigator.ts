/**
 * Post-Creation Investigator Agent - Core Implementation
 * 
 * Use context7: Comprehensive project validation and setup requirements investigation
 * Following All-Purpose Pattern: Configurable investigation for ANY project type
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import {
  InvestigationConfig,
  InvestigationResult,
  CategoryResult,
  SetupRequirement,
  Recommendation,
  DetailedResult,
  Issue,
  APIEndpoint,
  DatabaseConnection,
  EnvironmentVariable,
  DependencyCheck,
  PerformanceMetrics,
  SecurityScan,
  InvestigatorMetaAgentConfig
} from '../types/index.js';

import { ProjectStructureAnalyzer } from '../analyzers/ProjectStructureAnalyzer.js';
import { DependencyAnalyzer } from '../analyzers/DependencyAnalyzer.js';
import { EnvironmentAnalyzer } from '../analyzers/EnvironmentAnalyzer.js';
import { APIAnalyzer } from '../analyzers/APIAnalyzer.js';
import { DatabaseAnalyzer } from '../analyzers/DatabaseAnalyzer.js';
import { SecurityAnalyzer } from '../analyzers/SecurityAnalyzer.js';
import { PerformanceAnalyzer } from '../analyzers/PerformanceAnalyzer.js';
import { DeploymentAnalyzer } from '../analyzers/DeploymentAnalyzer.js';
import { ReportGenerator } from '../reporting/ReportGenerator.js';
import { MetaAgentIntegration } from '../integration/MetaAgentIntegration.js';
import { RealUEPWrapper, RealUEPWrapperConfig } from '../RealUEPWrapper.js';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export class PostCreationInvestigator {
  private config: InvestigatorMetaAgentConfig;
  private structureAnalyzer: ProjectStructureAnalyzer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private environmentAnalyzer: EnvironmentAnalyzer;
  private apiAnalyzer: APIAnalyzer;
  private databaseAnalyzer: DatabaseAnalyzer;
  private securityAnalyzer: SecurityAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private deploymentAnalyzer: DeploymentAnalyzer;
  private reportGenerator: ReportGenerator;
  private metaAgentIntegration?: MetaAgentIntegration;
  private uepWrapper?: RealUEPWrapper;

  constructor(config: InvestigatorMetaAgentConfig) {
    this.config = config;

    // Initialize analyzers
    this.structureAnalyzer = new ProjectStructureAnalyzer();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.environmentAnalyzer = new EnvironmentAnalyzer();
    this.apiAnalyzer = new APIAnalyzer();
    this.databaseAnalyzer = new DatabaseAnalyzer();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.deploymentAnalyzer = new DeploymentAnalyzer();
    this.reportGenerator = new ReportGenerator(config);

    // Initialize meta-agent integration if enabled
    if (config.enableMetaAgentCoordination && config.coordinatorEndpoint) {
      this.metaAgentIntegration = new MetaAgentIntegration(config);
    }

    // Initialize UEP wrapper for real-time coordination
    this.initializeUEP(config);

    logger.info('🔍 Post-Creation Investigator Agent initialized', {
      agentId: config.agentId,
      metaAgentCoordination: config.enableMetaAgentCoordination,
      ragIntegration: config.enableRAGIntegration,
      parallelism: config.parallelism
    });
  }

  /**
   * Initialize REAL UEP wrapper for agent coordination
   */
  private initializeUEP(config: InvestigatorMetaAgentConfig): void {
    try {
      const uepConfig: RealUEPWrapperConfig = {
        agentId: 'post-creation-investigator-agent',
        agentType: 'coordination',
        capabilities: {
          investigation: ['comprehensive-analysis', 'project-validation', 'setup-requirements'],
          analysis: ['structure', 'dependencies', 'environment', 'api', 'database', 'security', 'performance', 'deployment'],
          validation: ['quick-validation', 'critical-issues', 'project-scoring'],
          reporting: ['investigation-reports', 'setup-guides', 'recommendations'],
          coordination: ['meta-agent-integration', 'knowledge-sharing', 'status-reporting'],
          projectTypes: ['auto-detect', 'web-app', 'api', 'microservice', 'desktop', 'mobile', 'cli']
        },
        enableRealTimeUpdates: true,
        enableTaskDistribution: true
      };

      this.uepWrapper = new RealUEPWrapper(uepConfig);
      this.setupUEPEventHandlers();
      
      logger.info('✅ REAL UEP wrapper initialized for Post-Creation-Investigator Agent');
    } catch (error) {
      logger.error('❌ Failed to initialize UEP wrapper for Post-Creation-Investigator Agent', { error });
    }
  }

  /**
   * Setup UEP event handlers for task coordination
   */
  private setupUEPEventHandlers(): void {
    if (!this.uepWrapper) return;

    // Handle task assignments
    this.uepWrapper.on('task-assigned', async (task) => {
      logger.info('📋 Received task via UEP', { taskId: task.id, type: task.type });
      
      try {
        let result;
        switch (task.type) {
          case 'investigate-project':
          case 'investigate':
            result = await this.investigate({
              projectPath: task.projectPath,
              projectType: task.projectType,
              skipTests: task.skipTests,
              timeout: task.timeout
            });
            break;
          case 'quick-validation':
            result = await this.quickValidation(task.projectPath, task.projectType);
            break;
          case 'generate-setup-guide':
            result = await this.generateSetupGuide(task.projectPath, task.projectType);
            break;
          case 'get-status':
          case 'status':
            result = this.getStatus();
            break;
          default:
            result = { success: false, error: `Unknown task type: ${task.type}` };
        }

        if (this.uepWrapper) {
          await this.uepWrapper.sendTaskResult(task, result);
        }
      } catch (error) {
        logger.error('❌ Task execution failed', { taskId: task.id, error });
        if (this.uepWrapper) {
          await this.uepWrapper.sendTaskResult(task, { 
            success: false, 
            overallStatus: 'FAIL',
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    });

    // Handle system broadcasts
    this.uepWrapper.on('system-broadcast', (message) => {
      logger.info('📢 Received system broadcast', { 
        type: message.payload.type, 
        from: message.from 
      });
    });

    logger.info('✅ UEP event handlers configured for Post-Creation-Investigator Agent');
  }

  /**
   * Initialize UEP connection (called after construction)
   */
  async initializeUEPConnection(): Promise<void> {
    if (this.uepWrapper) {
      await this.uepWrapper.initialize();
    }
  }

  /**
   * Run comprehensive investigation on a generated project
   */
  async investigate(investigationConfig: InvestigationConfig): Promise<InvestigationResult> {
    const startTime = Date.now();
    const investigationId = uuidv4();

    logger.info('🚀 Starting project investigation', {
      investigationId,
      projectPath: investigationConfig.projectPath,
      projectType: investigationConfig.projectType
    });

    try {
      // Register with meta-agent coordinator
      if (this.metaAgentIntegration) {
        await this.metaAgentIntegration.registerAgent();
        await this.metaAgentIntegration.updateStatus('working', {
          currentTask: 'project-investigation',
          investigationId,
          projectPath: investigationConfig.projectPath
        });
      }

      // Validate project exists
      if (!(await fs.pathExists(investigationConfig.projectPath))) {
        throw new Error(`Project path does not exist: ${investigationConfig.projectPath}`);
      }

      // Run all analysis categories
      const analysisPromises = this.config.parallelism > 1 ? [
        this.analyzeStructure(investigationConfig),
        this.analyzeDependencies(investigationConfig),
        this.analyzeEnvironment(investigationConfig),
        this.analyzeAPI(investigationConfig),
        this.analyzeDatabase(investigationConfig),
        this.analyzeSecurity(investigationConfig),
        this.analyzePerformance(investigationConfig),
        this.analyzeDeployment(investigationConfig)
      ] : [];

      const [
        structureResult,
        dependenciesResult,
        environmentResult,
        apiResult,
        databaseResult,
        securityResult,
        performanceResult,
        deploymentResult
      ] = this.config.parallelism > 1 
        ? await Promise.all(analysisPromises)
        : await this.runSequentialAnalysis(investigationConfig);

      // Generate comprehensive investigation result
      const detailedResults = [
        ...structureResult.details,
        ...dependenciesResult.details,
        ...environmentResult.details,
        ...apiResult.details,
        ...databaseResult.details,
        ...securityResult.details,
        ...performanceResult.details,
        ...deploymentResult.details
      ];

      const categories = {
        structure: structureResult.category,
        dependencies: dependenciesResult.category,
        environment: environmentResult.category,
        api: apiResult.category,
        database: databaseResult.category,
        security: securityResult.category,
        performance: performanceResult.category,
        deployment: deploymentResult.category
      };

      // Calculate overall metrics
      const summary = this.calculateSummary(categories);
      const overallStatus = this.determineOverallStatus(categories, summary);
      const score = this.calculateOverallScore(categories);

      // Generate setup requirements and recommendations
      const setupRequirements = await this.generateSetupRequirements(
        investigationConfig, 
        categories, 
        detailedResults
      );
      
      const recommendations = await this.generateRecommendations(
        investigationConfig, 
        categories, 
        detailedResults
      );

      const result: InvestigationResult = {
        projectPath: investigationConfig.projectPath,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        overallStatus,
        score,
        summary,
        categories,
        setupRequirements,
        recommendations,
        detailedResults
      };

      // Generate and save report
      await this.reportGenerator.generateReport(result, investigationConfig);

      // Broadcast investigation result via UEP
      if (this.uepWrapper && result.overallStatus !== 'FAIL') {
        try {
          await this.uepWrapper.broadcastInvestigationResult(result);
        } catch (error) {
          logger.warn('Failed to broadcast investigation result via UEP', { error });
        }
      }

      // Share knowledge with meta-agent coordinator
      if (this.metaAgentIntegration) {
        await this.metaAgentIntegration.shareKnowledge({
          sourceAgentId: this.config.agentId,
          knowledgeType: 'finding',
          title: `Investigation Report: ${path.basename(investigationConfig.projectPath)}`,
          content: JSON.stringify({
            overallStatus,
            score,
            summary,
            criticalIssues: setupRequirements.filter(req => req.priority === 'critical').length,
            projectType: investigationConfig.projectType
          }, null, 2),
          tags: ['investigation', 'validation', investigationConfig.projectType, `score-${Math.round(score)}`],
          relevantAgents: ['scaffold-generator', 'all-purpose-pattern', 'infra-orchestrator'],
          confidence: score / 100,
          metadata: {
            investigationId,
            projectPath: investigationConfig.projectPath,
            projectType: investigationConfig.projectType,
            duration: result.duration
          }
        });

        await this.metaAgentIntegration.updateStatus('idle');
      }

      logger.info('✅ Project investigation completed', {
        investigationId,
        duration: result.duration,
        overallStatus,
        score,
        setupRequirements: setupRequirements.length,
        recommendations: recommendations.length
      });

      return result;

    } catch (error) {
      logger.error('❌ Project investigation failed', {
        investigationId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (this.metaAgentIntegration) {
        await this.metaAgentIntegration.updateStatus('error', { error: error instanceof Error ? error.message : String(error) });
      }

      throw error;
    }
  }

  /**
   * Run quick validation check (faster, less comprehensive)
   */
  async quickValidation(projectPath: string, projectType: string): Promise<{ status: string; criticalIssues: Issue[]; score: number }> {
    logger.info('⚡ Running quick validation', { projectPath, projectType });

    const config: InvestigationConfig = {
      projectPath,
      projectType: projectType as any,
      skipTests: ['performance', 'security-deep'],
      timeout: 30000 // 30 seconds
    };

    try {
      // Run essential checks only
      const structureResult = await this.analyzeStructure(config);
      const dependenciesResult = await this.analyzeDependencies(config);
      const environmentResult = await this.analyzeEnvironment(config);

      const categories = {
        structure: structureResult.category,
        dependencies: dependenciesResult.category,
        environment: environmentResult.category
      };

      const criticalIssues = [
        ...structureResult.category.issues.filter(issue => issue.severity === 'error'),
        ...dependenciesResult.category.issues.filter(issue => issue.severity === 'error'),
        ...environmentResult.category.issues.filter(issue => issue.severity === 'error')
      ];

      const score = this.calculatePartialScore(categories);
      const status = criticalIssues.length === 0 ? 'PASS' : 'FAIL';

      logger.info('✅ Quick validation completed', { 
        status, 
        criticalIssues: criticalIssues.length, 
        score 
      });

      return { status, criticalIssues, score };

    } catch (error) {
      logger.error('❌ Quick validation failed', { error });
      return { status: 'ERROR', criticalIssues: [], score: 0 };
    }
  }

  /**
   * Generate detailed setup requirements report
   */
  async generateSetupGuide(projectPath: string, projectType: string): Promise<string> {
    const investigation = await this.investigate({
      projectPath,
      projectType: projectType as any
    });

    return this.reportGenerator.generateSetupGuide(investigation);
  }

  /**
   * Analyze project structure
   */
  private async analyzeStructure(config: InvestigationConfig): Promise<{
    category: CategoryResult;
    details: DetailedResult[];
  }> {
    logger.debug('📁 Analyzing project structure');
    return this.structureAnalyzer.analyze(config);
  }

  /**
   * Analyze dependencies
   */
  private async analyzeDependencies(config: InvestigationConfig): Promise<{
    category: CategoryResult;
    details: DetailedResult[];
  }> {
    logger.debug('📦 Analyzing dependencies');
    return this.dependencyAnalyzer.analyze(config);
  }

  /**
   * Analyze environment configuration
   */
  private async analyzeEnvironment(config: InvestigationConfig): Promise<{
    category: CategoryResult;
    details: DetailedResult[];
  }> {
    logger.debug('🔧 Analyzing environment configuration');
    return this.environmentAnalyzer.analyze(config);
  }

  /**
   * Analyze API endpoints
   */
  private async analyzeAPI(config: InvestigationConfig): Promise<{
    category: CategoryResult;
    details: DetailedResult[];
  }> {
    logger.debug('🌐 Analyzing API endpoints');
    return this.apiAnalyzer.analyze(config);
  }

  /**
   * Analyze database connections
   */
  private async analyzeDatabase(config: InvestigationConfig): Promise<{
    category: CategoryResult;
    details: DetailedResult[];
  }> {
    logger.debug('🗄️ Analyzing database connections');
    return this.databaseAnalyzer.analyze(config);
  }

  /**
   * Analyze security
   */
  private async analyzeSecurity(config: InvestigationConfig): Promise<{
    category: CategoryResult;
    details: DetailedResult[];
  }> {
    logger.debug('🔒 Analyzing security');
    return this.securityAnalyzer.analyze(config);
  }

  /**
   * Analyze performance
   */
  private async analyzePerformance(config: InvestigationConfig): Promise<{
    category: CategoryResult;
    details: DetailedResult[];
  }> {
    logger.debug('⚡ Analyzing performance');
    return this.performanceAnalyzer.analyze(config);
  }

  /**
   * Analyze deployment readiness
   */
  private async analyzeDeployment(config: InvestigationConfig): Promise<{
    category: CategoryResult;
    details: DetailedResult[];
  }> {
    logger.debug('🚀 Analyzing deployment readiness');
    return this.deploymentAnalyzer.analyze(config);
  }

  /**
   * Run analysis sequentially (fallback for low parallelism)
   */
  private async runSequentialAnalysis(config: InvestigationConfig) {
    const structureResult = await this.analyzeStructure(config);
    const dependenciesResult = await this.analyzeDependencies(config);
    const environmentResult = await this.analyzeEnvironment(config);
    const apiResult = await this.analyzeAPI(config);
    const databaseResult = await this.analyzeDatabase(config);
    const securityResult = await this.analyzeSecurity(config);
    const performanceResult = await this.analyzePerformance(config);
    const deploymentResult = await this.analyzeDeployment(config);

    return [
      structureResult,
      dependenciesResult,
      environmentResult,
      apiResult,
      databaseResult,
      securityResult,
      performanceResult,
      deploymentResult
    ];
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(categories: Record<string, CategoryResult>) {
    const categoryValues = Object.values(categories);
    
    return {
      totalChecks: categoryValues.reduce((sum, cat) => sum + cat.checks, 0),
      passed: categoryValues.reduce((sum, cat) => sum + cat.passed, 0),
      failed: categoryValues.reduce((sum, cat) => sum + cat.failed, 0),
      warnings: categoryValues.reduce((sum, cat) => sum + cat.warnings, 0),
      critical: categoryValues.reduce((sum, cat) => 
        sum + cat.issues.filter(issue => issue.severity === 'error').length, 0
      )
    };
  }

  /**
   * Determine overall status
   */
  private determineOverallStatus(categories: Record<string, CategoryResult>, summary: any): 'PASS' | 'FAIL' | 'WARNING' {
    if (summary.critical > 0) return 'FAIL';
    if (summary.failed > 0) return 'FAIL';
    if (summary.warnings > 0) return 'WARNING';
    return 'PASS';
  }

  /**
   * Calculate overall score (0-100)
   */
  private calculateOverallScore(categories: Record<string, CategoryResult>): number {
    const weights = {
      structure: 0.15,
      dependencies: 0.15,
      environment: 0.20,
      api: 0.15,
      database: 0.10,
      security: 0.15,
      performance: 0.05,
      deployment: 0.05
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const [categoryName, weight] of Object.entries(weights)) {
      const category = categories[categoryName];
      if (category && category.status !== 'SKIP') {
        weightedScore += category.score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  /**
   * Calculate partial score for quick validation
   */
  private calculatePartialScore(categories: Record<string, CategoryResult>): number {
    const categoryValues = Object.values(categories);
    const avgScore = categoryValues.reduce((sum, cat) => sum + cat.score, 0) / categoryValues.length;
    return Math.round(avgScore);
  }

  /**
   * Generate setup requirements based on analysis
   */
  private async generateSetupRequirements(
    config: InvestigationConfig,
    categories: Record<string, CategoryResult>,
    detailedResults: DetailedResult[]
  ): Promise<SetupRequirement[]> {
    const requirements: SetupRequirement[] = [];

    // Environment requirements
    const envIssues = categories.environment.issues.filter(issue => issue.severity === 'error');
    for (const issue of envIssues) {
      requirements.push({
        id: `env-${uuidv4().substring(0, 8)}`,
        category: 'environment',
        priority: 'critical',
        title: issue.title,
        description: issue.description,
        instructions: [
          issue.suggestion || 'Please resolve this environment issue',
          'Check your .env file and environment variables',
          'Ensure all required services are configured'
        ],
        estimatedTime: '5-15 minutes'
      });
    }

    // API key requirements
    const apiIssues = categories.api.issues.filter(issue => 
      issue.description.toLowerCase().includes('api key') || 
      issue.description.toLowerCase().includes('authentication')
    );
    
    for (const issue of apiIssues) {
      requirements.push({
        id: `api-${uuidv4().substring(0, 8)}`,
        category: 'api-key',
        priority: 'high',
        title: `API Key Required: ${issue.title}`,
        description: issue.description,
        instructions: [
          'Obtain API credentials from the service provider',
          'Add the API key to your environment variables',
          'Test the API connection',
          'Update configuration files if needed'
        ],
        estimatedTime: '10-30 minutes'
      });
    }

    // Database requirements
    const dbIssues = categories.database.issues.filter(issue => issue.severity === 'error');
    for (const issue of dbIssues) {
      requirements.push({
        id: `db-${uuidv4().substring(0, 8)}`,
        category: 'database',
        priority: 'high',
        title: `Database Setup Required: ${issue.title}`,
        description: issue.description,
        instructions: [
          'Set up the required database service',
          'Configure connection credentials',
          'Run database migrations if needed',
          'Test database connectivity'
        ],
        estimatedTime: '15-45 minutes'
      });
    }

    // Dependency requirements
    const depIssues = categories.dependencies.issues.filter(issue => issue.severity === 'error');
    for (const issue of depIssues) {
      requirements.push({
        id: `dep-${uuidv4().substring(0, 8)}`,
        category: 'dependency',
        priority: 'medium',
        title: `Dependency Issue: ${issue.title}`,
        description: issue.description,
        instructions: [
          'Run npm install or yarn install',
          'Check for version conflicts',
          'Update package.json if needed',
          'Clear node_modules and reinstall if necessary'
        ],
        estimatedTime: '5-20 minutes'
      });
    }

    return requirements;
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    config: InvestigationConfig,
    categories: Record<string, CategoryResult>,
    detailedResults: DetailedResult[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Security recommendations
    const securityIssues = categories.security.issues;
    for (const issue of securityIssues) {
      recommendations.push({
        id: `sec-${uuidv4().substring(0, 8)}`,
        type: 'security',
        priority: issue.severity === 'error' ? 'critical' : 'high',
        title: `Security: ${issue.title}`,
        description: issue.description,
        impact: 'Improves application security and reduces vulnerabilities',
        effort: issue.severity === 'error' ? 'high' : 'medium',
        instructions: [
          issue.suggestion || 'Address this security concern',
          'Review security best practices',
          'Consider automated security scanning'
        ]
      });
    }

    // Performance recommendations
    const performanceIssues = categories.performance.issues;
    for (const issue of performanceIssues) {
      recommendations.push({
        id: `perf-${uuidv4().substring(0, 8)}`,
        type: 'performance',
        priority: 'medium',
        title: `Performance: ${issue.title}`,
        description: issue.description,
        impact: 'Improves application speed and user experience',
        effort: 'medium',
        instructions: [
          issue.suggestion || 'Optimize this performance issue',
          'Consider caching strategies',
          'Review bundle size and loading times'
        ]
      });
    }

    // Deployment recommendations
    if (categories.deployment.score < 80) {
      recommendations.push({
        id: `deploy-${uuidv4().substring(0, 8)}`,
        type: 'deployment',
        priority: 'medium',
        title: 'Improve Deployment Readiness',
        description: 'Your project may have deployment configuration issues',
        impact: 'Ensures smooth deployment and production operations',
        effort: 'medium',
        instructions: [
          'Review deployment configuration',
          'Add health check endpoints',
          'Configure environment variables for production',
          'Set up monitoring and logging'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get investigation status
   */
  getStatus(): { agentId: string; status: string; investigations: number } {
    return {
      agentId: this.config.agentId,
      status: 'ready',
      investigations: 0 // Could track this in state
    };
  }

  /**
   * Graceful shutdown with UEP cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down Post-Creation-Investigator Agent...');

    try {
      // Cleanup UEP wrapper
      if (this.uepWrapper) {
        await this.uepWrapper.shutdown();
        this.uepWrapper = undefined;
      }

      logger.info('✅ Post-Creation-Investigator Agent shut down successfully');
    } catch (error) {
      logger.error('❌ Error during Post-Creation-Investigator Agent shutdown', { error });
      throw error;
    }
  }
}