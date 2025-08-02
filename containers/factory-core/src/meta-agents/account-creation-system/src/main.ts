#!/usr/bin/env node

/**
 * Account Creation System - CLI Interface
 * 
 * Use context7: Command-line interface for automated account creation
 * Following All-Purpose Pattern: Configurable for ANY service provider
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { AccountCreationSystem } from './core/AccountCreationSystem.js';
import { 
  AccountCreationSystemConfig, 
  AccountCreationConfig, 
  AccountCreationRequest,
  PersonalInfo,
  CompanyInfo
} from './types/index.js';
import { defaultServiceConfigs } from './configs/services.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('account-creation-system')
  .description('Automated account creation and email verification across multiple services')
  .version('1.0.0');

program
  .command('create-accounts')
  .description('Create accounts across multiple services')
  .requiredOption('-s, --services <services>', 'Comma-separated list of service IDs')
  .requiredOption('-e, --email <email>', 'Email address for account creation')
  .requiredOption('-f, --first-name <name>', 'First name')
  .requiredOption('-l, --last-name <name>', 'Last name')
  .option('-c, --country <country>', 'Country code', 'US')
  .option('-p, --phone <phone>', 'Phone number (if required)')
  .option('--company-name <name>', 'Company name (if required)')
  .option('--company-size <size>', 'Company size (if required)', 'startup')
  .option('--industry <industry>', 'Industry (if required)', 'technology')
  .option('--priority <priority>', 'Request priority (low, medium, high, urgent)', 'medium')
  .option('--parallel <count>', 'Number of parallel sessions', '3')
  .option('--headless', 'Run browsers in headless mode', true)
  .option('--screenshots', 'Take screenshots on errors', true)
  .action(async (options) => {
    try {
      logger.info('🤖 Starting account creation process...', {
        services: options.services.split(','),
        email: options.email.replace(/(.{2}).*(@.*)/, '$1***$2') // Mask email
      });

      // Validate required environment variables
      if (!process.env.EMAIL_IMAP_HOST || !process.env.EMAIL_IMAP_USERNAME || !process.env.EMAIL_IMAP_PASSWORD) {
        throw new Error('Email configuration required. Set EMAIL_IMAP_HOST, EMAIL_IMAP_USERNAME, EMAIL_IMAP_PASSWORD');
      }

      if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable required for secure credential storage');
      }

      // Create system configuration
      const systemConfig: AccountCreationSystemConfig = {
        agentId: 'account-creation-cli',
        parallelSessions: parseInt(options.parallel),
        sessionTimeout: 30, // 30 minutes
        screenshotOnError: options.screenshots,
        enableHeadless: options.headless,
        enableDevtools: false,
        enableMetaAgentCoordination: false, // CLI mode
        enableRAGIntegration: false,
        knowledgeSharing: false
      };

      // Create account creation configuration
      const creationConfig: AccountCreationConfig = {
        emailConfig: {
          dedicatedEmail: options.email,
          imapConfig: {
            host: process.env.EMAIL_IMAP_HOST!,
            port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
            secure: process.env.EMAIL_IMAP_SECURE !== 'false',
            username: process.env.EMAIL_IMAP_USERNAME!,
            password: process.env.EMAIL_IMAP_PASSWORD!
          },
          emailDomains: [options.email.split('@')[1]],
          verificationTimeout: 15, // 15 minutes
          checkInterval: 10 // 10 seconds
        },
        services: defaultServiceConfigs.filter(service => 
          options.services.split(',').includes(service.id)
        ),
        securityConfig: {
          encryptionKey: process.env.ENCRYPTION_KEY!,
          passwordGeneration: {
            length: 16,
            includeSymbols: true,
            includeNumbers: true,
            includeUppercase: true,
            includeLowercase: true
          },
          maxAttempts: 3,
          cooldownPeriod: 30,
          userAgents: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ]
        },
        storage: {
          type: 'encrypted-file',
          path: './account-credentials.json',
          encryptionEnabled: true,
          backupEnabled: true,
          retentionDays: 365
        }
      };

      // Create personal info
      const personalInfo: PersonalInfo = {
        firstName: options.firstName,
        lastName: options.lastName,
        email: options.email,
        phoneNumber: options.phone,
        country: options.country
      };

      // Create company info if provided
      const companyInfo: CompanyInfo | undefined = options.companyName ? {
        companyName: options.companyName,
        companySize: options.companySize,
        industry: options.industry
      } : undefined;

      // Create account creation request
      const request: AccountCreationRequest = {
        requestId: `cli-${Date.now()}`,
        services: options.services.split(','),
        personalInfo,
        companyInfo,
        priority: options.priority as any
      };

      // Initialize account creation system
      const accountSystem = new AccountCreationSystem(systemConfig, creationConfig);
      await accountSystem.start();

      try {
        // Execute account creation
        const result = await accountSystem.createAccounts(request);

        // Display results
        console.log('\n🎉 Account Creation Results');
        console.log('============================');
        console.log(`Overall Status: ${result.overallStatus}`);
        console.log(`Duration: ${Math.round(result.duration / 1000)}s`);
        console.log(`Successful Services: ${result.successfulServices}/${result.totalServices}`);
        console.log(`Accounts Created: ${result.summary.accountsCreated}`);
        console.log(`Emails Verified: ${result.summary.emailsVerified}`);
        console.log(`API Keys Generated: ${result.summary.apiKeysGenerated}`);

        if (result.serviceResults.length > 0) {
          console.log('\n📋 Service Results:');
          result.serviceResults.forEach(serviceResult => {
            const status = serviceResult.status === 'SUCCESS' ? '✅' : 
                          serviceResult.status === 'FAILED' ? '❌' : '⚠️';
            console.log(`${status} ${serviceResult.serviceName}: ${serviceResult.status}`);
            if (serviceResult.error) {
              console.log(`   Error: ${serviceResult.error}`);
            }
          });
        }

        if (result.credentials.length > 0) {
          console.log('\n🔐 Credentials Summary:');
          result.credentials.forEach(cred => {
            console.log(`• ${cred.serviceName}: ${cred.email}`);
            console.log(`  Account ID: ${cred.accountId || 'N/A'}`);
            console.log(`  API Key: ${cred.apiKey ? 'Generated' : 'Not available'}`);
          });
          console.log(`\n💾 Full credentials saved to: ${creationConfig.storage?.path}`);
        }

        if (result.nextSteps.length > 0) {
          console.log('\n📋 Next Steps:');
          result.nextSteps.slice(0, 5).forEach((step, index) => {
            console.log(`${index + 1}. [${step.priority.toUpperCase()}] ${step.title}`);
            console.log(`   ${step.description}`);
            console.log(`   Estimated time: ${step.estimatedTime}`);
          });
        }

        if (result.overallStatus === 'FAILED') {
          process.exit(1);
        }

      } finally {
        await accountSystem.stop();
      }

    } catch (error) {
      logger.error('❌ Account creation failed', { error });
      console.error('Account creation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('list-services')
  .description('List available service configurations')
  .option('--enabled-only', 'Show only enabled services')
  .action((options) => {
    console.log('\n📋 Available Services');
    console.log('====================');
    
    const services = options.enabledOnly ? 
      defaultServiceConfigs.filter(s => s.enabled) : 
      defaultServiceConfigs;

    services.forEach(service => {
      const status = service.enabled ? '✅' : '❌';
      console.log(`${status} ${service.id} - ${service.name}`);
      console.log(`   Type: ${service.type}`);
      console.log(`   Estimated time: ${service.requirements.estimatedTime} minutes`);
      console.log(`   Email verification: ${service.requirements.requiresEmailVerification ? 'Yes' : 'No'}`);
      console.log(`   CAPTCHA: ${service.requirements.hasRecaptcha ? 'Yes' : 'No'}`);
      console.log('');
    });
  });

program
  .command('validate-config')
  .description('Validate environment configuration')
  .action(() => {
    console.log('\n🔍 Validating Configuration');
    console.log('============================');

    const checks = [
      { name: 'EMAIL_IMAP_HOST', value: process.env.EMAIL_IMAP_HOST },
      { name: 'EMAIL_IMAP_USERNAME', value: process.env.EMAIL_IMAP_USERNAME },
      { name: 'EMAIL_IMAP_PASSWORD', value: process.env.EMAIL_IMAP_PASSWORD, sensitive: true },
      { name: 'ENCRYPTION_KEY', value: process.env.ENCRYPTION_KEY, sensitive: true }
    ];

    let allValid = true;

    checks.forEach(check => {
      const status = check.value ? '✅' : '❌';
      const displayValue = check.sensitive && check.value ? 
        '*'.repeat(check.value.length) : 
        check.value || 'Not set';
      
      console.log(`${status} ${check.name}: ${displayValue}`);
      
      if (!check.value) {
        allValid = false;
      }
    });

    if (allValid) {
      console.log('\n✅ Configuration is valid');
    } else {
      console.log('\n❌ Configuration is invalid - missing required variables');
      process.exit(1);
    }
  });

program
  .command('test-email')
  .description('Test email connectivity')
  .action(async () => {
    try {
      console.log('\n📧 Testing Email Connectivity');
      console.log('==============================');

      if (!process.env.EMAIL_IMAP_HOST || !process.env.EMAIL_IMAP_USERNAME || !process.env.EMAIL_IMAP_PASSWORD) {
        throw new Error('Email configuration required');
      }

      // Import EmailVerificationManager
      const { EmailVerificationManager } = await import('./services/EmailVerificationManager.js');
      
      const emailManager = new EmailVerificationManager({
        dedicatedEmail: process.env.EMAIL_IMAP_USERNAME!,
        imapConfig: {
          host: process.env.EMAIL_IMAP_HOST!,
          port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
          secure: process.env.EMAIL_IMAP_SECURE !== 'false',
          username: process.env.EMAIL_IMAP_USERNAME!,
          password: process.env.EMAIL_IMAP_PASSWORD!
        },
        emailDomains: [],
        verificationTimeout: 5,
        checkInterval: 5
      });

      await emailManager.start();
      console.log('✅ Email connection successful');
      
      const status = emailManager.getStatus();
      console.log(`Connected: ${status.connected}`);
      console.log(`Active verifications: ${status.activeVerifications}`);
      
      await emailManager.stop();
      console.log('📧 Email test completed');

    } catch (error) {
      console.error('❌ Email test failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();