/**
 * Vercel Architecture CLI - Command-line interface for Vercel-Native Architecture Agent
 * 
 * Provides unlimited CLI capabilities with no hardcoded limitations
 * Following All-Purpose Pattern: NO limits on CLI complexity
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import { VercelNativeArchitectureAgent } from '../core/VercelNativeArchitectureAgent.js';
import { VercelNativeConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VercelArchitectureCLI {
  private program: Command;
  private agent: VercelNativeArchitectureAgent | null = null;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('vercel-architecture')
      .description('CLI for Vercel-Native Architecture Agent - The PRODUCTION BUILDER')
      .version('1.0.0');

    // Main build command
    this.program
      .command('build')
      .description('Build complete Vercel-native architecture')
      .option('-n, --name <name>', 'Architecture name')
      .option('-f, --framework <framework>', 'Framework (next.js, react, vue, etc.)')
      .option('-d, --domains <domains...>', 'Custom domains')
      .option('-o, --output <path>', 'Output directory', './vercel-architecture')
      .option('-i, --interactive', 'Interactive mode')
      .option('--no-optimization', 'Skip performance optimizations')
      .option('--no-monitoring', 'Skip monitoring setup')
      .option('--no-meta-agent-coordination', 'Skip meta-agent coordination')
      .action(async (options) => {
        await this.handleBuildCommand(options);
      });

    // Deploy command
    this.program
      .command('deploy')
      .description('Deploy architecture to Vercel')
      .option('-p, --project <path>', 'Project path', '.')
      .option('-e, --environment <env>', 'Environment (production, preview)', 'production')
      .option('--force', 'Force deployment')
      .action(async (options) => {
        await this.handleDeployCommand(options);
      });

    // Optimize command
    this.program
      .command('optimize')
      .description('Optimize existing Vercel deployment')
      .option('-p, --project <path>', 'Project path', '.')
      .option('-f, --focus <area>', 'Optimization focus (performance, cost, security)', 'performance')
      .action(async (options) => {
        await this.handleOptimizeCommand(options);
      });

    // Monitor command
    this.program
      .command('monitor')
      .description('Setup monitoring for Vercel deployment')
      .option('-p, --project <path>', 'Project path', '.')
      .option('--analytics', 'Enable analytics')
      .option('--speed-insights', 'Enable speed insights')
      .option('--custom-alerts', 'Setup custom alerts')
      .action(async (options) => {
        await this.handleMonitorCommand(options);
      });

    // Init command
    this.program
      .command('init')
      .description('Initialize new Vercel architecture project')
      .option('-t, --template <template>', 'Project template')
      .option('-i, --interactive', 'Interactive setup')
      .action(async (options) => {
        await this.handleInitCommand(options);
      });

    // Status command
    this.program
      .command('status')
      .description('Check status of Vercel deployments')
      .option('-p, --project <path>', 'Project path', '.')
      .option('-d, --detailed', 'Show detailed status')
      .action(async (options) => {
        await this.handleStatusCommand(options);
      });

    // Meta-agent coordination command
    this.program
      .command('coordinate')
      .description('Coordinate with other meta-agents')
      .option('-a, --agents <agents...>', 'Specific agents to coordinate with')
      .option('--all', 'Coordinate with all available agents')
      .action(async (options) => {
        await this.handleCoordinateCommand(options);
      });
  }

  async run(args: string[]): Promise<void> {
    try {
      await this.program.parseAsync(args);
    } catch (error: any) {
      console.error(chalk.red('❌ CLI Error:'), error.message);
      process.exit(1);
    }
  }

  private async initializeAgent(outputDirectory: string): Promise<void> {
    if (this.agent) return;

    const config: VercelNativeConfig = {
      agentId: 'vercel-native-architecture',
      version: '1.0.0',
      outputDirectory,
      framework: {
        name: 'auto-detect',
        version: 'latest'
      },
      capabilities: {
        serverlessFunctions: true,
        edgeFunctions: true,
        staticGeneration: true,
        serverSideRendering: true,
        incrementalStaticRegeneration: true,
        edgeMiddleware: true,
        analytics: true,
        speedInsights: true,
        imageOptimization: true,
        fontOptimization: true
      }
    };

    this.agent = new VercelNativeArchitectureAgent(config);
    await this.agent.initialize();
  }

  private async handleBuildCommand(options: any): Promise<void> {
    console.log(chalk.blue('🚀 Building Vercel-native architecture...'));

    try {
      await this.initializeAgent(options.output);

      let buildOptions = options;

      if (options.interactive) {
        buildOptions = await this.promptForBuildOptions(options);
      }

      if (!buildOptions.name || !buildOptions.framework) {
        buildOptions = await this.promptForRequiredOptions(buildOptions);
      }

      const result = await this.agent!.buildVercelArchitecture({
        architectureName: buildOptions.name,
        framework: buildOptions.framework,
        domains: buildOptions.domains || [],
        outputDirectory: buildOptions.output,
        optimization: !buildOptions.noOptimization,
        monitoring: !buildOptions.noMonitoring,
        metaAgentCoordination: !buildOptions.noMetaAgentCoordination
      });

      console.log(chalk.green('✅ Architecture built successfully!'));
      console.log(chalk.gray(`   📁 Output: ${result.architecture.project.outputDirectory}`));
      console.log(chalk.gray(`   🔧 Functions: ${result.architecture.functions.apiFunctions.length} API, ${result.architecture.functions.edgeFunctions.length} Edge`));
      console.log(chalk.gray(`   🌐 Domains: ${result.architecture.domains.length} configured`));
      
      if (result.metaAgentCoordination) {
        console.log(chalk.gray(`   🤝 Meta-agents: ${result.metaAgentCoordination.agentsCoordinated} coordinated`));
      }

    } catch (error: any) {
      console.error(chalk.red('❌ Build failed:'), error.message);
      process.exit(1);
    }
  }

  private async handleDeployCommand(options: any): Promise<void> {
    console.log(chalk.blue('🚀 Deploying to Vercel...'));

    try {
      await this.initializeAgent(options.project);

      // Load existing architecture configuration
      const configPath = path.join(options.project, 'vercel-architecture.json');
      if (!await fs.pathExists(configPath)) {
        throw new Error('No architecture configuration found. Run "build" command first.');
      }

      const architectureConfig = await fs.readJSON(configPath);
      
      const result = await this.agent!.deployToVercel(architectureConfig, {
        environment: options.environment,
        force: options.force
      });

      console.log(chalk.green('✅ Deployment successful!'));
      console.log(chalk.gray(`   🌐 URL: ${result.deploymentUrl}`));
      console.log(chalk.gray(`   ⚡ Functions: ${result.functions.deployed.length} deployed`));
      console.log(chalk.gray(`   📊 Performance: ${result.performance.coldStartTime}ms cold start`));

    } catch (error: any) {
      console.error(chalk.red('❌ Deployment failed:'), error.message);
      process.exit(1);
    }
  }

  private async handleOptimizeCommand(options: any): Promise<void> {
    console.log(chalk.blue('⚡ Optimizing Vercel deployment...'));

    try {
      await this.initializeAgent(options.project);

      // Load existing deployment
      const deploymentInfo = await this.loadDeploymentInfo(options.project);

      const result = await this.agent!.optimizeArchitecture(deploymentInfo, {
        focus: options.focus
      });

      console.log(chalk.green('✅ Optimization complete!'));
      console.log(chalk.gray(`   📈 Build time: -${result.improvements.buildTimeReduction}%`));
      console.log(chalk.gray(`   📦 Bundle size: -${result.improvements.bundleSizeReduction}%`));
      console.log(chalk.gray(`   ⚡ Runtime: +${result.improvements.runtimePerformanceGain}%`));
      console.log(chalk.gray(`   💰 Cost: -${result.costImpact.totalCostReduction}%`));

    } catch (error: any) {
      console.error(chalk.red('❌ Optimization failed:'), error.message);
      process.exit(1);
    }
  }

  private async handleMonitorCommand(options: any): Promise<void> {
    console.log(chalk.blue('📊 Setting up monitoring...'));

    try {
      await this.initializeAgent(options.project);

      const monitoringResult = await this.agent!.setupMonitoring({
        analytics: options.analytics,
        speedInsights: options.speedInsights,
        customAlerts: options.customAlerts
      });

      console.log(chalk.green('✅ Monitoring configured!'));
      console.log(chalk.gray(`   📈 Analytics: ${monitoringResult.analyticsEnabled ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.gray(`   ⚡ Speed Insights: ${monitoringResult.speedInsightsEnabled ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.gray(`   🚨 Alerts: ${monitoringResult.alertsConfigured} configured`));

    } catch (error: any) {
      console.error(chalk.red('❌ Monitoring setup failed:'), error.message);
      process.exit(1);
    }
  }

  private async handleInitCommand(options: any): Promise<void> {
    console.log(chalk.blue('🏗️  Initializing Vercel architecture project...'));

    try {
      let initOptions = options;

      if (options.interactive || !options.template) {
        initOptions = await this.promptForInitOptions(options);
      }

      await this.initializeAgent('./');

      const result = await this.agent!.initializeProject({
        template: initOptions.template,
        name: initOptions.name,
        framework: initOptions.framework
      });

      console.log(chalk.green('✅ Project initialized!'));
      console.log(chalk.gray(`   📁 Directory: ${result.projectDirectory}`));
      console.log(chalk.gray(`   🎯 Template: ${result.template}`));
      console.log(chalk.gray(`   🔧 Framework: ${result.framework}`));

    } catch (error: any) {
      console.error(chalk.red('❌ Initialization failed:'), error.message);
      process.exit(1);
    }
  }

  private async handleStatusCommand(options: any): Promise<void> {
    console.log(chalk.blue('📋 Checking deployment status...'));

    try {
      await this.initializeAgent(options.project);

      const status = await this.agent!.getDeploymentStatus({
        detailed: options.detailed
      });

      console.log(chalk.green('📊 Deployment Status:'));
      console.log(chalk.gray(`   🚀 Active Deployments: ${status.activeDeployments}`));
      console.log(chalk.gray(`   ✅ Healthy Functions: ${status.healthyFunctions}/${status.totalFunctions}`));
      console.log(chalk.gray(`   📈 Uptime: ${status.uptime}%`));
      console.log(chalk.gray(`   ⚡ Avg Response Time: ${status.averageResponseTime}ms`));

      if (options.detailed && status.details) {
        console.log(chalk.blue('\n📋 Detailed Status:'));
        status.details.forEach((detail: any) => {
          console.log(chalk.gray(`   ${detail.name}: ${detail.status} (${detail.responseTime}ms)`));
        });
      }

    } catch (error: any) {
      console.error(chalk.red('❌ Status check failed:'), error.message);
      process.exit(1);
    }
  }

  private async handleCoordinateCommand(options: any): Promise<void> {
    console.log(chalk.blue('🤝 Coordinating with meta-agents...'));

    try {
      await this.initializeAgent('./');

      const agents = options.all ? 
        ['template-engine', 'parameter-flow', 'ioa', '5-document', 'prd-parser', '30-minute-rule'] :
        options.agents || [];

      if (agents.length === 0) {
        const { selectedAgents } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedAgents',
            message: 'Select agents to coordinate with:',
            choices: [
              { name: 'Template Engine Factory Agent', value: 'template-engine' },
              { name: 'Parameter Flow Agent', value: 'parameter-flow' },
              { name: 'IOA (Infrastructure Orchestration Agent)', value: 'ioa' },
              { name: '5-Document Framework Agent', value: '5-document' },
              { name: 'PRD-Parser Agent', value: 'prd-parser' },
              { name: '30-Minute Rule Agent', value: '30-minute-rule' }
            ]
          }
        ]);
        agents.push(...selectedAgents);
      }

      const result = await this.agent!.coordinateWithMetaAgents({
        agents,
        coordinationType: 'full-integration'
      });

      console.log(chalk.green('✅ Meta-agent coordination complete!'));
      console.log(chalk.gray(`   🤝 Agents coordinated: ${result.agentsCoordinated}`));
      console.log(chalk.gray(`   📈 Benefits: ${result.benefits.codeQualityImprovement}% code quality improvement`));
      console.log(chalk.gray(`   ⚡ Speed increase: ${result.benefits.deploymentSpeedIncrease}%`));

    } catch (error: any) {
      console.error(chalk.red('❌ Coordination failed:'), error.message);
      process.exit(1);
    }
  }

  private async promptForBuildOptions(options: any): Promise<any> {
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'Architecture name:',
        default: options.name || 'my-vercel-app'
      },
      {
        type: 'list',
        name: 'framework',
        message: 'Select framework:',
        choices: ['next.js', 'react', 'vue', 'angular', 'svelte', 'nuxt', 'gatsby', 'astro'],
        default: options.framework || 'next.js'
      },
      {
        type: 'input',
        name: 'domains',
        message: 'Custom domains (comma-separated):',
        filter: (input: string) => input ? input.split(',').map(d => d.trim()) : []
      },
      {
        type: 'confirm',
        name: 'optimization',
        message: 'Enable performance optimizations?',
        default: !options.noOptimization
      },
      {
        type: 'confirm',
        name: 'monitoring',
        message: 'Setup monitoring and analytics?',
        default: !options.noMonitoring
      },
      {
        type: 'confirm',
        name: 'metaAgentCoordination',
        message: 'Coordinate with other meta-agents?',
        default: !options.noMetaAgentCoordination
      }
    ];

    const answers = await inquirer.prompt(questions);
    return { ...options, ...answers };
  }

  private async promptForRequiredOptions(options: any): Promise<any> {
    const questions = [];

    if (!options.name) {
      questions.push({
        type: 'input',
        name: 'name',
        message: 'Architecture name:',
        validate: (input: string) => input.trim() !== '' || 'Name is required'
      });
    }

    if (!options.framework) {
      questions.push({
        type: 'list',
        name: 'framework',
        message: 'Select framework:',
        choices: ['next.js', 'react', 'vue', 'angular', 'svelte', 'nuxt', 'gatsby', 'astro']
      });
    }

    if (questions.length > 0) {
      const answers = await inquirer.prompt(questions);
      return { ...options, ...answers };
    }

    return options;
  }

  private async promptForInitOptions(options: any): Promise<any> {
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: 'my-vercel-project'
      },
      {
        type: 'list',
        name: 'template',
        message: 'Select project template:',
        choices: [
          'nextjs-starter',
          'react-spa',
          'vue-app',
          'svelte-kit',
          'nuxt-app',
          'gatsby-site',
          'astro-site',
          'custom'
        ],
        default: options.template || 'nextjs-starter'
      },
      {
        type: 'list',
        name: 'framework',
        message: 'Framework:',
        choices: ['next.js', 'react', 'vue', 'angular', 'svelte', 'nuxt', 'gatsby', 'astro']
      }
    ];

    const answers = await inquirer.prompt(questions);
    return { ...options, ...answers };
  }

  private async loadDeploymentInfo(projectPath: string): Promise<any> {
    const deploymentPath = path.join(projectPath, '.vercel', 'project.json');
    if (await fs.pathExists(deploymentPath)) {
      return await fs.readJSON(deploymentPath);
    }

    // Return mock deployment info for demonstration
    return {
      projectId: 'demo-project',
      deploymentId: 'demo-deployment',
      url: 'https://demo.vercel.app'
    };
  }
}

// CLI Entry Point
export async function runCLI(args: string[]): Promise<void> {
  const cli = new VercelArchitectureCLI();
  await cli.run(args);
}

export default VercelArchitectureCLI;