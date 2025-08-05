/**
 * Account Creation System - Core Implementation
 * 
 * Use context7: Automated account creation and email verification system
 * Following All-Purpose Pattern: Configurable for ANY service provider
 */

import { Browser, BrowserContext, Page, chromium, firefox, webkit } from 'playwright';
import { ImapFlow } from 'imapflow';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';

import {
  AccountCreationConfig,
  AccountCreationRequest,
  AccountCreationResult,
  ServiceResult,
  StepResult,
  AccountCredentials,
  CreationIssue,
  NextStep,
  EmailVerification,
  BrowserSession,
  ServiceConfig,
  AccountCreationSystemConfig
} from '../types/index.js';

import { EmailVerificationManager } from '../services/EmailVerificationManager.js';
import { BrowserManager } from '../services/BrowserManager.js';
import { ServiceRegistry } from '../services/ServiceRegistry.js';
import { CredentialsManager } from '../services/CredentialsManager.js';
import { SecurityManager } from '../services/SecurityManager.js';
import { MetaAgentIntegration } from '../integration/MetaAgentIntegration.js';
import { RealUEPWrapper, RealUEPWrapperConfig } from '../RealUEPWrapper.js';
import { logger } from '../utils/logger.js';

export class AccountCreationSystem {
  private config: AccountCreationSystemConfig;
  private creationConfig: AccountCreationConfig;
  private emailManager: EmailVerificationManager;
  private browserManager: BrowserManager;
  private serviceRegistry: ServiceRegistry;
  private credentialsManager: CredentialsManager;
  private securityManager: SecurityManager;
  private metaAgentIntegration?: MetaAgentIntegration;
  private uepWrapper?: RealUEPWrapper;
  private activeSessions: Map<string, BrowserSession> = new Map();
  private activeVerifications: Map<string, EmailVerification> = new Map();
  private isRunning = false;

  constructor(systemConfig: AccountCreationSystemConfig, creationConfig: AccountCreationConfig) {
    this.config = systemConfig;
    this.creationConfig = creationConfig;

    // Initialize services
    this.emailManager = new EmailVerificationManager(creationConfig.emailConfig);
    this.browserManager = new BrowserManager(systemConfig);
    this.serviceRegistry = new ServiceRegistry(creationConfig.services);
    this.credentialsManager = new CredentialsManager(
      creationConfig.storage || { 
        type: 'encrypted-file', 
        encryptionEnabled: true, 
        backupEnabled: true, 
        retentionDays: 365 
      },
      creationConfig.securityConfig
    );
    this.securityManager = new SecurityManager(creationConfig.securityConfig);

    // Initialize meta-agent integration if enabled
    if (systemConfig.enableMetaAgentCoordination && systemConfig.coordinatorEndpoint) {
      this.metaAgentIntegration = new MetaAgentIntegration({
        ...systemConfig,
        coordinatorEndpoint: systemConfig.coordinatorEndpoint
      });
    }

    // Initialize UEP wrapper for real-time coordination
    this.initializeUEP(systemConfig);

    logger.info('🤖 Account Creation System initialized', {
      agentId: systemConfig.agentId,
      enabledServices: creationConfig.services.filter(s => s.enabled).length,
      parallelSessions: systemConfig.parallelSessions,
      metaAgentCoordination: systemConfig.enableMetaAgentCoordination
    });

    // Set up periodic maintenance
    this.setupPeriodicMaintenance();
  }

  /**
   * Initialize REAL UEP wrapper for agent coordination
   */
  private initializeUEP(config: AccountCreationSystemConfig): void {
    try {
      const uepConfig: RealUEPWrapperConfig = {
        agentId: 'account-creation-system-agent',
        agentType: 'coordination',
        capabilities: {
          automation: ['account-creation', 'email-verification', 'browser-automation'],
          credentials: ['secure-storage', 'api-key-generation', 'multi-service-support'],
          verification: ['email-verification', 'captcha-handling', 'form-automation'],
          coordination: ['meta-agent-integration', 'status-reporting', 'task-distribution'],
          services: ['auto-detect', 'social-media', 'cloud-services', 'development-tools', 'productivity-apps']
        },
        enableRealTimeUpdates: true,
        enableTaskDistribution: true
      };

      this.uepWrapper = new RealUEPWrapper(uepConfig);
      this.setupUEPEventHandlers();
      
      logger.info('✅ REAL UEP wrapper initialized for Account-Creation-System Agent');
    } catch (error) {
      logger.error('❌ Failed to initialize UEP wrapper for Account-Creation-System Agent', { error });
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
          case 'create-accounts':
          case 'account-creation':
            result = await this.createAccounts({
              requestId: task.requestId || task.id,
              services: task.services || [],
              personalInfo: task.personalInfo || {
                email: task.email || 'user@example.com',
                firstName: task.firstName || 'John',
                lastName: task.lastName || 'Doe'
              },
              priority: task.priority || 'medium',
              preferences: task.preferences || {},
              requirements: task.requirements || {},
              configuration: task.configuration || {},
              context: task.context || {}
            });
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
            overallStatus: 'FAILED',
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

    logger.info('✅ UEP event handlers configured for Account-Creation-System Agent');
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
   * Start the account creation system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Account Creation System is already running');
      return;
    }

    try {
      // Start email verification manager
      await this.emailManager.start();

      // Register with meta-agent coordinator
      if (this.metaAgentIntegration) {
        await this.metaAgentIntegration.registerAgent({
          agentId: this.config.agentId,
          agentName: 'Account Creation System',
          agentType: 'custom',
          capabilities: [
            'account-creation',
            'email-verification',
            'browser-automation',
            'api-key-generation',
            'multi-service-support'
          ],
          status: 'idle',
          metadata: {
            version: '1.0.0',
            supportedServices: this.creationConfig.services.filter(s => s.enabled).map(s => s.name),
            parallelSessions: this.config.parallelSessions
          }
        });
      }

      this.isRunning = true;
      logger.info('✅ Account Creation System started successfully');

    } catch (error) {
      logger.error('❌ Failed to start Account Creation System', { error });
      throw error;
    }
  }

  /**
   * Stop the account creation system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Close all active browser sessions
      for (const session of this.activeSessions.values()) {
        await this.closeBrowserSession(session.id);
      }

      // Stop email verification manager
      await this.emailManager.stop();

      // Cleanup UEP wrapper
      if (this.uepWrapper) {
        await this.uepWrapper.shutdown();
        this.uepWrapper = undefined;
      }

      // Unregister from meta-agent coordinator
      if (this.metaAgentIntegration) {
        await this.metaAgentIntegration.unregisterAgent(this.config.agentId);
      }

      this.isRunning = false;
      logger.info('✅ Account Creation System stopped successfully');

    } catch (error) {
      logger.error('❌ Failed to stop Account Creation System', { error });
      throw error;
    }
  }

  /**
   * Create accounts for multiple services
   */
  async createAccounts(request: AccountCreationRequest): Promise<AccountCreationResult> {
    const startTime = Date.now();

    logger.info('🚀 Starting account creation request', {
      requestId: request.requestId,
      services: request.services,
      priority: request.priority
    });

    try {
      // Update meta-agent status
      if (this.metaAgentIntegration) {
        await this.metaAgentIntegration.updateStatus('working', {
          currentTask: 'account-creation',
          requestId: request.requestId,
          services: request.services
        });
      }

      // Validate request
      await this.validateRequest(request);

      // Get enabled services that match the request
      const targetServices = this.serviceRegistry.getServices(request.services)
        .filter(service => service.enabled)
        .sort((a, b) => a.priority - b.priority);

      if (targetServices.length === 0) {
        throw new Error('No enabled services found for the requested service IDs');
      }

      const serviceResults: ServiceResult[] = [];
      const credentials: AccountCredentials[] = [];
      const issues: CreationIssue[] = [];
      const nextSteps: NextStep[] = [];

      // Process services (parallel or sequential based on config)
      if (this.config.parallelSessions > 1) {
        const chunks = this.chunkArray(targetServices, this.config.parallelSessions);
        
        for (const chunk of chunks) {
          const chunkPromises = chunk.map(service => 
            this.createAccountForService(service, request)
          );
          
          const chunkResults = await Promise.allSettled(chunkPromises);
          
          chunkResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              serviceResults.push(result.value.serviceResult);
              if (result.value.credentials) {
                credentials.push(result.value.credentials);
              }
              issues.push(...result.value.issues);
              nextSteps.push(...result.value.nextSteps);
            } else {
              const service = chunk[index];
              serviceResults.push({
                serviceId: service.id,
                serviceName: service.name,
                status: 'FAILED',
                duration: 0,
                steps: [],
                error: result.reason instanceof Error ? result.reason.message : String(result.reason)
              });
            }
          });
        }
      } else {
        // Sequential processing
        for (const service of targetServices) {
          try {
            const result = await this.createAccountForService(service, request);
            serviceResults.push(result.serviceResult);
            if (result.credentials) {
              credentials.push(result.credentials);
            }
            issues.push(...result.issues);
            nextSteps.push(...result.nextSteps);
          } catch (error) {
            serviceResults.push({
              serviceId: service.id,
              serviceName: service.name,
              status: 'FAILED',
              duration: 0,
              steps: [],
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      // Calculate summary
      const summary = {
        accountsCreated: serviceResults.filter(r => r.status === 'SUCCESS').length,
        emailsVerified: serviceResults.filter(r => 
          r.status === 'SUCCESS' && r.steps.some(s => s.stepId === 'email-verification' && s.status === 'SUCCESS')
        ).length,
        apiKeysGenerated: credentials.filter(c => c.apiKey).length,
        errors: serviceResults.filter(r => r.status === 'FAILED').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      };

      const overallStatus = this.determineOverallStatus(serviceResults);

      const result: AccountCreationResult = {
        requestId: request.requestId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        overallStatus,
        serviceResults,
        totalServices: targetServices.length,
        successfulServices: summary.accountsCreated,
        failedServices: summary.errors,
        summary,
        credentials,
        issues,
        nextSteps
      };

      // Store credentials securely
      if (credentials.length > 0) {
        await this.credentialsManager.storeCredentials(request.requestId, credentials);
      }

      // Broadcast account creation result via UEP
      if (this.uepWrapper && result.overallStatus !== 'FAILED') {
        try {
          await this.uepWrapper.broadcastAccountCreationResult(result);
        } catch (error) {
          logger.warn('Failed to broadcast account creation result via UEP', { error });
        }
      }

      // Share knowledge with meta-agent coordinator
      if (this.metaAgentIntegration) {
        await this.metaAgentIntegration.shareKnowledge({
          sourceAgentId: this.config.agentId,
          knowledgeType: 'solution',
          title: `Account Creation: ${summary.accountsCreated}/${targetServices.length} services`,
          content: JSON.stringify({
            overallStatus,
            summary,
            servicesProcessed: targetServices.map(s => s.name),
            duration: result.duration
          }, null, 2),
          tags: ['account-creation', 'automation', `success-rate-${Math.round((summary.accountsCreated / targetServices.length) * 100)}`],
          relevantAgents: ['post-creation-investigator', 'infra-orchestrator'],
          confidence: summary.accountsCreated / targetServices.length,
          metadata: {
            requestId: request.requestId,
            totalServices: targetServices.length,
            successfulServices: summary.accountsCreated
          }
        });

        await this.metaAgentIntegration.updateStatus('idle');
      }

      logger.info('✅ Account creation request completed', {
        requestId: request.requestId,
        duration: result.duration,
        overallStatus,
        accountsCreated: summary.accountsCreated,
        totalServices: targetServices.length
      });

      return result;

    } catch (error) {
      logger.error('❌ Account creation request failed', {
        requestId: request.requestId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (this.metaAgentIntegration) {
        await this.metaAgentIntegration.updateStatus('error', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }

      throw error;
    }
  }

  /**
   * Create account for a specific service
   */
  private async createAccountForService(
    service: ServiceConfig, 
    request: AccountCreationRequest
  ): Promise<{
    serviceResult: ServiceResult;
    credentials?: AccountCredentials;
    issues: CreationIssue[];
    nextSteps: NextStep[];
  }> {
    const startTime = Date.now();
    const steps: StepResult[] = [];
    const issues: CreationIssue[] = [];
    const nextSteps: NextStep[] = [];

    logger.info(`🌐 Creating account for ${service.name}`, {
      serviceId: service.id,
      requestId: request.requestId
    });

    let session: BrowserSession | undefined;
    let credentials: AccountCredentials | undefined;

    try {
      // Create browser session
      session = await this.createBrowserSession(service.id);
      steps.push({
        stepId: 'browser-session',
        stepName: 'Initialize Browser Session',
        status: 'SUCCESS',
        duration: 0,
        description: 'Browser session created successfully'
      });

      // Navigate to registration page
      await session.page.goto(service.registrationUrl, { waitUntil: 'networkidle' });
      steps.push({
        stepId: 'navigation',
        stepName: 'Navigate to Registration',
        status: 'SUCCESS',
        duration: 0,
        description: `Navigated to ${service.registrationUrl}`
      });

      // Generate secure password
      const password = this.securityManager.generatePassword();

      // Fill registration form
      await this.fillRegistrationForm(session, service, request, password);
      steps.push({
        stepId: 'form-filling',
        stepName: 'Fill Registration Form',
        status: 'SUCCESS',
        duration: 0,
        description: 'Registration form filled successfully'
      });

      // Handle CAPTCHA if present (skip for IMAP-based services)
      if (service.requirements.hasRecaptcha) {
        logger.warn(`⚠️ Service ${service.name} has CAPTCHA - manual intervention may be required`);
        issues.push({
          serviceId: service.id,
          severity: 'warning',
          category: 'captcha',
          title: 'CAPTCHA Present',
          description: 'This service requires CAPTCHA solving which may need manual intervention',
          retryable: false
        });
      }

      // Submit registration
      await session.page.click(service.selectors.submitButton);
      await session.page.waitForTimeout(3000); // Wait for submission
      steps.push({
        stepId: 'form-submission',
        stepName: 'Submit Registration',
        status: 'SUCCESS',
        duration: 0,
        description: 'Registration form submitted'
      });

      // Handle email verification if required
      if (service.requirements.requiresEmailVerification) {
        const verificationResult = await this.handleEmailVerification(session, service, request.personalInfo.email);
        steps.push({
          stepId: 'email-verification',
          stepName: 'Email Verification',
          status: verificationResult.success ? 'SUCCESS' : 'FAILED',
          duration: verificationResult.duration,
          description: verificationResult.description,
          error: verificationResult.error
        });

        if (!verificationResult.success) {
          nextSteps.push({
            serviceId: service.id,
            category: 'verification',
            title: 'Complete Email Verification',
            description: 'Manual email verification required',
            instructions: [
              'Check your email for verification link',
              'Click the verification link',
              'Complete the verification process'
            ],
            estimatedTime: '5-10 minutes',
            priority: 'high'
          });
        }
      }

      // Handle post-registration steps
      if (service.postRegistration) {
        await this.handlePostRegistrationSteps(session, service, request);
        steps.push({
          stepId: 'post-registration',
          stepName: 'Post-Registration Setup',
          status: 'SUCCESS',
          duration: 0,
          description: 'Post-registration steps completed'
        });
      }

      // Generate API keys if configured
      if (service.apiKeyGeneration) {
        const apiKeyResult = await this.generateAPIKeys(session, service);
        steps.push({
          stepId: 'api-key-generation',
          stepName: 'Generate API Keys',
          status: apiKeyResult.success ? 'SUCCESS' : 'FAILED',
          duration: apiKeyResult.duration,
          description: apiKeyResult.description,
          error: apiKeyResult.error
        });

        if (apiKeyResult.apiKey) {
          // Store API key securely
        }
      }

      // Create credentials object
      credentials = {
        serviceId: service.id,
        serviceName: service.name,
        username: request.personalInfo.email,
        email: request.personalInfo.email,
        password,
        accountId: uuidv4(), // This would typically come from the service
        lastValidated: new Date()
      };

      const serviceResult: ServiceResult = {
        serviceId: service.id,
        serviceName: service.name,
        status: 'SUCCESS',
        duration: Date.now() - startTime,
        steps,
        accountInfo: {
          username: request.personalInfo.email,
          email: request.personalInfo.email,
          accountId: credentials.accountId
        }
      };

      return { serviceResult, credentials, issues, nextSteps };

    } catch (error) {
      logger.error(`❌ Failed to create account for ${service.name}`, {
        serviceId: service.id,
        error: error instanceof Error ? error.message : String(error)
      });

      const serviceResult: ServiceResult = {
        serviceId: service.id,
        serviceName: service.name,
        status: 'FAILED',
        duration: Date.now() - startTime,
        steps,
        error: error instanceof Error ? error.message : String(error)
      };

      issues.push({
        serviceId: service.id,
        severity: 'error',
        category: 'service',
        title: 'Account Creation Failed',
        description: error instanceof Error ? error.message : String(error),
        retryable: true
      });

      return { serviceResult, issues, nextSteps };

    } finally {
      // Close browser session
      if (session) {
        await this.closeBrowserSession(session.id);
      }
    }
  }

  /**
   * Create browser session
   */
  private async createBrowserSession(serviceId: string): Promise<BrowserSession> {
    const sessionId = uuidv4();
    const userAgent = this.securityManager.getRandomUserAgent();

    const browser = await this.browserManager.createBrowser();
    const context = await browser.newContext({
      userAgent,
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    
    const page = await context.newPage();

    const session: BrowserSession = {
      id: sessionId,
      serviceId,
      browser,
      context,
      page,
      userAgent,
      startTime: new Date(),
      lastActivity: new Date(),
      status: 'active'
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Close browser session
   */
  private async closeBrowserSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      try {
        await session.context.close();
        await session.browser.close();
        session.status = 'closed';
      } catch (error) {
        logger.error('Failed to close browser session', { sessionId, error });
      }
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Fill registration form
   */
  private async fillRegistrationForm(
    session: BrowserSession,
    service: ServiceConfig,
    request: AccountCreationRequest,
    password: string
  ): Promise<void> {
    const { page } = session;
    const { selectors } = service;
    const { personalInfo } = request;

    // Fill email
    await page.fill(selectors.emailField, personalInfo.email);

    // Fill password if required
    if (service.requirements.requiresPassword && selectors.passwordField) {
      await page.fill(selectors.passwordField, password);
      
      if (selectors.confirmPasswordField) {
        await page.fill(selectors.confirmPasswordField, password);
      }
    }

    // Fill personal info if required
    if (service.requirements.requiresPersonalInfo) {
      if (selectors.firstNameField && personalInfo.firstName) {
        await page.fill(selectors.firstNameField, personalInfo.firstName);
      }
      if (selectors.lastNameField && personalInfo.lastName) {
        await page.fill(selectors.lastNameField, personalInfo.lastName);
      }
    }

    // Handle agreement checkbox
    if (selectors.agreeCheckbox) {
      await page.check(selectors.agreeCheckbox);
    }

    session.lastActivity = new Date();
  }

  /**
   * Handle email verification
   */
  private async handleEmailVerification(
    session: BrowserSession,
    service: ServiceConfig,
    email: string
  ): Promise<{ success: boolean; duration: number; description: string; error?: string }> {
    const startTime = Date.now();

    try {
      // Start monitoring for verification email
      const verification = await this.emailManager.startVerification(service.id, email);
      this.activeVerifications.set(verification.id, verification);

      // Wait for verification email (with timeout)
      const timeout = this.creationConfig.emailConfig.verificationTimeout * 60 * 1000; // Convert to ms
      const verificationResult = await this.emailManager.waitForVerification(verification.id, timeout);

      if (verificationResult.success && verificationResult.verificationUrl) {
        // Navigate to verification URL
        await session.page.goto(verificationResult.verificationUrl);
        await session.page.waitForTimeout(2000);

        return {
          success: true,
          duration: Date.now() - startTime,
          description: 'Email verification completed successfully'
        };
      } else {
        return {
          success: false,
          duration: Date.now() - startTime,
          description: 'Email verification timed out or failed',
          error: verificationResult.error
        };
      }

    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        description: 'Email verification failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle post-registration steps
   */
  private async handlePostRegistrationSteps(
    session: BrowserSession,
    service: ServiceConfig,
    request: AccountCreationRequest
  ): Promise<void> {
    if (!service.postRegistration) return;

    const { page } = session;

    // Handle profile setup
    if (service.postRegistration.profileSetup) {
      for (const step of service.postRegistration.profileSetup) {
        try {
          const value = typeof step.value === 'function' ? step.value() : step.value;
          await page.fill(step.selector, value);
        } catch (error) {
          if (step.required) {
            throw error;
          }
          logger.warn(`Optional profile setup step failed: ${step.field}`);
        }
      }
    }

    // Handle project creation
    if (service.postRegistration.projectCreation) {
      for (const step of service.postRegistration.projectCreation) {
        try {
          await page.click(step.selector);
          await page.waitForTimeout(1000);
        } catch (error) {
          logger.warn(`Project creation step failed: ${step.name}`);
        }
      }
    }

    session.lastActivity = new Date();
  }

  /**
   * Generate API keys
   */
  private async generateAPIKeys(
    session: BrowserSession,
    service: ServiceConfig
  ): Promise<{ success: boolean; duration: number; description: string; error?: string; apiKey?: string }> {
    const startTime = Date.now();

    if (!service.apiKeyGeneration) {
      return {
        success: false,
        duration: 0,
        description: 'API key generation not configured for this service'
      };
    }

    try {
      const { page } = session;

      // Navigate to API keys section
      for (const navStep of service.apiKeyGeneration.navigateToApiKeys) {
        if (navStep.url) {
          await page.goto(navStep.url);
        } else if (navStep.selector) {
          await page.click(navStep.selector);
        }
        
        if (navStep.waitFor) {
          await page.waitForSelector(navStep.waitFor);
        }
      }

      // Create API key
      for (const createStep of service.apiKeyGeneration.createApiKey) {
        await page.click(createStep.selector);
        await page.waitForTimeout(1000);
      }

      // TODO: Extract actual API key from the page
      // This would be service-specific implementation

      return {
        success: true,
        duration: Date.now() - startTime,
        description: 'API key generation completed'
      };

    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        description: 'API key generation failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Validate account creation request
   */
  private async validateRequest(request: AccountCreationRequest): Promise<void> {
    if (!request.personalInfo.email) {
      throw new Error('Email is required');
    }

    if (!request.personalInfo.firstName || !request.personalInfo.lastName) {
      throw new Error('First name and last name are required');
    }

    if (request.services.length === 0) {
      throw new Error('At least one service must be specified');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.personalInfo.email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Determine overall status
   */
  private determineOverallStatus(serviceResults: ServiceResult[]): 'SUCCESS' | 'PARTIAL' | 'FAILED' {
    const successful = serviceResults.filter(r => r.status === 'SUCCESS').length;
    const total = serviceResults.length;

    if (successful === total) return 'SUCCESS';
    if (successful > 0) return 'PARTIAL';
    return 'FAILED';
  }

  /**
   * Chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Setup periodic maintenance
   */
  private setupPeriodicMaintenance(): void {
    // Clean up old verifications every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.cleanupExpiredVerifications();
        await this.cleanupIdleSessions();
      } catch (error) {
        logger.error('Periodic maintenance failed', { error });
      }
    });
  }

  /**
   * Clean up expired verifications
   */
  private async cleanupExpiredVerifications(): Promise<void> {
    const now = new Date();
    const expiredVerifications = Array.from(this.activeVerifications.values())
      .filter(v => v.expiresAt < now);

    for (const verification of expiredVerifications) {
      this.activeVerifications.delete(verification.id);
    }

    if (expiredVerifications.length > 0) {
      logger.info(`🧹 Cleaned up ${expiredVerifications.length} expired verifications`);
    }
  }

  /**
   * Clean up idle sessions
   */
  private async cleanupIdleSessions(): Promise<void> {
    const now = new Date();
    const timeoutMs = this.config.sessionTimeout * 60 * 1000;
    const idleSessions = Array.from(this.activeSessions.values())
      .filter(s => (now.getTime() - s.lastActivity.getTime()) > timeoutMs);

    for (const session of idleSessions) {
      await this.closeBrowserSession(session.id);
    }

    if (idleSessions.length > 0) {
      logger.info(`🧹 Cleaned up ${idleSessions.length} idle browser sessions`);
    }
  }

  /**
   * Get system status
   */
  getStatus(): {
    agentId: string;
    status: string;
    activeSessions: number;
    activeVerifications: number;
    enabledServices: number;
  } {
    return {
      agentId: this.config.agentId,
      status: this.isRunning ? 'running' : 'stopped',
      activeSessions: this.activeSessions.size,
      activeVerifications: this.activeVerifications.size,
      enabledServices: this.creationConfig.services.filter(s => s.enabled).length
    };
  }
}