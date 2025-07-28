#!/usr/bin/env node

/**
 * Service Registry CLI Tool
 * Task 220.5: Command-line interface for operational management
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import chalk from 'chalk';
import { ConsulServiceRegistry, ConsulConfig } from '../ConsulServiceRegistry.js';
import { ServiceRegistryMonitor } from '../monitoring/ServiceRegistryMonitor.js';
import { ServiceDiscoveryQuery, AgentStatus } from '../types/AgentRegistration.js';

interface CLIConfig {
  consul: ConsulConfig;
  verbose: boolean;
  format: 'table' | 'json' | 'yaml';
}

class RegistryCLI {
  private config: CLIConfig;
  private registry: ConsulServiceRegistry;
  private monitor: ServiceRegistryMonitor;

  constructor() {
    this.config = {
      consul: {
        host: process.env.CONSUL_HOST || 'localhost',
        port: process.env.CONSUL_PORT || '8500',
        secure: process.env.CONSUL_SECURE === 'true',
        token: process.env.CONSUL_TOKEN,
        promisify: true
      },
      verbose: false,
      format: 'table'
    };

    this.registry = new ConsulServiceRegistry(this.config.consul);
    this.monitor = new ServiceRegistryMonitor(this.registry);
  }

  async run(): Promise<void> {
    const program = new Command();

    program
      .name('registry-cli')
      .description('UEP Service Registry Management CLI')
      .version('1.0.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('-f, --format <format>', 'Output format (table|json|yaml)', 'table')
      .option('--consul-host <host>', 'Consul host', 'localhost')
      .option('--consul-port <port>', 'Consul port', '8500')
      .option('--consul-token <token>', 'Consul ACL token')
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();
        this.config.verbose = opts.verbose;
        this.config.format = opts.format;
        if (opts.consulHost) this.config.consul.host = opts.consulHost;
        if (opts.consulPort) this.config.consul.port = opts.consulPort;
        if (opts.consulToken) this.config.consul.token = opts.consulToken;
      });

    // List agents command
    program
      .command('list')
      .alias('ls')
      .description('List all registered agents')
      .option('-t, --type <type>', 'Filter by agent type')
      .option('-s, --status <status>', 'Filter by status')
      .option('-e, --environment <env>', 'Filter by environment')
      .option('--healthy-only', 'Show only healthy agents')
      .action(async (options) => {
        await this.listAgents(options);
      });

    // Show agent details command
    program
      .command('show <agentId>')
      .description('Show detailed information about an agent')
      .action(async (agentId) => {
        await this.showAgent(agentId);
      });

    // Discover agents command
    program
      .command('discover')
      .description('Discover agents based on query criteria')
      .option('-t, --type <type>', 'Agent type')
      .option('-c, --capabilities <capabilities>', 'Required capabilities (comma-separated)')
      .option('-e, --environment <env>', 'Environment')
      .option('--max-load <load>', 'Maximum load percentage', parseFloat)
      .option('--min-capacity <capacity>', 'Minimum capacity', parseInt)
      .option('--sort-by <field>', 'Sort by field (load|response_time|error_rate|capacity)')
      .option('--sort-order <order>', 'Sort order (asc|desc)', 'asc')
      .option('--limit <limit>', 'Limit results', parseInt)
      .action(async (options) => {
        await this.discoverAgents(options);
      });

    // Health check command
    program
      .command('health [agentId]')
      .description('Check health of agent(s)')
      .action(async (agentId) => {
        await this.checkHealth(agentId);
      });

    // Monitoring command
    program
      .command('monitor')
      .description('Show real-time monitoring information')
      .option('-w, --watch', 'Watch mode (continuous updates)')
      .option('-i, --interval <seconds>', 'Update interval in seconds', parseInt, 5)
      .action(async (options) => {
        await this.showMonitoring(options);
      });

    // Alerts command
    program
      .command('alerts')
      .description('Show active alerts')
      .option('-a, --all', 'Show all alerts (including resolved)')
      .option('-r, --resolve <alertId>', 'Resolve an alert')
      .action(async (options) => {
        await this.manageAlerts(options);
      });

    // Metrics command
    program
      .command('metrics')
      .description('Show registry metrics')
      .option('-p, --prometheus', 'Output in Prometheus format')
      .action(async (options) => {
        await this.showMetrics(options);
      });

    // Export command
    program
      .command('export')
      .description('Export registry data')
      .option('-o, --output <file>', 'Output file')
      .option('--include-history', 'Include event history')
      .action(async (options) => {
        await this.exportData(options);
      });

    // Validate command
    program
      .command('validate')
      .description('Validate registry consistency')
      .option('--fix', 'Attempt to fix issues')
      .action(async (options) => {
        await this.validateRegistry(options);
      });

    // Debug command
    program
      .command('debug')
      .description('Debug registry operations')
      .option('--consul-info', 'Show Consul connection info')
      .option('--agent-details <agentId>', 'Show detailed agent information')
      .action(async (options) => {
        await this.debugRegistry(options);
      });

    try {
      await program.parseAsync(process.argv);
    } catch (error) {
      this.error('Command failed:', error);
      process.exit(1);
    }
  }

  private async listAgents(options: any): Promise<void> {
    try {
      this.verbose('Fetching agents...');
      const agents = await this.registry.getAllAgents();

      // Apply filters
      let filteredAgents = agents;
      
      if (options.type) {
        filteredAgents = filteredAgents.filter(a => a.agentType === options.type);
      }
      
      if (options.status) {
        filteredAgents = filteredAgents.filter(a => a.status === options.status);
      }
      
      if (options.environment) {
        filteredAgents = filteredAgents.filter(a => a.environment === options.environment);
      }
      
      if (options.healthyOnly) {
        filteredAgents = filteredAgents.filter(a => a.status === 'healthy');
      }

      if (this.config.format === 'json') {
        console.log(JSON.stringify(filteredAgents, null, 2));
        return;
      }

      // Table format
      const table = new Table({
        head: ['Agent ID', 'Name', 'Type', 'Status', 'Load', 'Response Time', 'Environment', 'Last Heartbeat'],
        colWidths: [36, 25, 20, 12, 8, 12, 12, 12]
      });

      filteredAgents.forEach(agent => {
        table.push([
          agent.agentId.substring(0, 32) + '...',
          agent.agentName,
          agent.agentType,
          this.colorizeStatus(agent.status),
          `${agent.currentMetrics.currentLoad.toFixed(1)}%`,
          `${agent.currentMetrics.averageResponseTime.toFixed(0)}ms`,
          agent.environment,
          this.formatTime(agent.lastHeartbeat)
        ]);
      });

      console.log(table.toString());
      console.log(`\nTotal: ${filteredAgents.length} agents`);
      
    } catch (error) {
      this.error('Failed to list agents:', error);
    }
  }

  private async showAgent(agentId: string): Promise<void> {
    try {
      this.verbose(`Fetching agent: ${agentId}`);
      const agent = await this.registry.getAgent(agentId);
      
      if (!agent) {
        console.log(chalk.red(`Agent not found: ${agentId}`));
        return;
      }

      if (this.config.format === 'json') {
        console.log(JSON.stringify(agent, null, 2));
        return;
      }

      // Detailed display
      console.log(chalk.bold.blue('Agent Details'));
      console.log(chalk.gray('═'.repeat(50)));
      
      console.log(`ID: ${agent.agentId}`);
      console.log(`Name: ${agent.agentName}`);
      console.log(`Type: ${agent.agentType}`);
      console.log(`Status: ${this.colorizeStatus(agent.status)}`);
      console.log(`Environment: ${agent.environment}`);
      console.log(`Cluster: ${agent.cluster}`);
      console.log(`Namespace: ${agent.namespace}`);
      
      console.log(`\n${chalk.bold('Network:')}`);
      console.log(`  Address: ${agent.network.address}:${agent.network.port}`);
      console.log(`  Protocol: ${agent.network.protocol}`);
      console.log(`  TLS: ${agent.network.tlsEnabled ? 'Yes' : 'No'}`);
      
      console.log(`\n${chalk.bold('Metrics:')}`);
      console.log(`  Load: ${agent.currentMetrics.currentLoad.toFixed(1)}%`);
      console.log(`  Capacity: ${agent.currentMetrics.maxCapacity}`);
      console.log(`  Response Time: ${agent.currentMetrics.averageResponseTime.toFixed(0)}ms`);
      console.log(`  Error Rate: ${(agent.currentMetrics.errorRate * 100).toFixed(2)}%`);
      console.log(`  Queue Length: ${agent.currentMetrics.queueLength}`);
      
      console.log(`\n${chalk.bold('Capabilities:')}`);
      agent.capabilities.forEach(cap => {
        console.log(`  • ${cap.name} v${cap.version}: ${cap.description}`);
      });
      
      console.log(`\n${chalk.bold('Timestamps:')}`);
      console.log(`  Started: ${this.formatTime(agent.startTime)}`);
      console.log(`  Registered: ${this.formatTime(agent.registrationTime)}`);
      console.log(`  Last Heartbeat: ${this.formatTime(agent.lastHeartbeat)}`);
      
    } catch (error) {
      this.error('Failed to show agent:', error);
    }
  }

  private async discoverAgents(options: any): Promise<void> {
    try {
      const query: ServiceDiscoveryQuery = {};
      
      if (options.type) query.agentType = options.type;
      if (options.capabilities) query.capabilities = options.capabilities.split(',');
      if (options.environment) query.environment = options.environment;
      if (options.maxLoad) query.maxLoad = options.maxLoad;
      if (options.minCapacity) query.minCapacity = options.minCapacity;
      if (options.sortBy) query.sortBy = options.sortBy;
      if (options.sortOrder) query.sortOrder = options.sortOrder;
      if (options.limit) query.limit = options.limit;
      
      this.verbose('Discovering agents with query:', query);
      const result = await this.registry.discoverAgents(query);
      
      if (this.config.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold.green(`Found ${result.agents.length}/${result.totalCount} agents (${result.executionTime}ms)`));
      
      if (result.agents.length === 0) {
        console.log(chalk.yellow('No agents match the discovery criteria'));
        return;
      }

      const table = new Table({
        head: ['Agent ID', 'Type', 'Status', 'Load', 'Capabilities'],
        colWidths: [36, 20, 12, 8, 40]
      });

      result.agents.forEach(agent => {
        table.push([
          agent.agentId.substring(0, 32) + '...',
          agent.agentType,
          this.colorizeStatus(agent.status),
          `${agent.currentMetrics.currentLoad.toFixed(1)}%`,
          agent.capabilities.map(c => c.name).join(', ')
        ]);
      });

      console.log(table.toString());
      
    } catch (error) {
      this.error('Failed to discover agents:', error);
    }
  }

  private async checkHealth(agentId?: string): Promise<void> {
    try {
      if (agentId) {
        this.verbose(`Checking health of agent: ${agentId}`);
        const isHealthy = await this.registry.performHealthCheck(agentId);
        console.log(`Agent ${agentId} is ${isHealthy ? chalk.green('healthy') : chalk.red('unhealthy')}`);
      } else {
        this.verbose('Checking health of all agents');
        const agents = await this.registry.getAllAgents();
        
        const table = new Table({
          head: ['Agent ID', 'Name', 'Status', 'Health Check'],
          colWidths: [36, 25, 12, 15]
        });

        for (const agent of agents) {
          try {
            const isHealthy = await this.registry.performHealthCheck(agent.agentId);
            table.push([
              agent.agentId.substring(0, 32) + '...',
              agent.agentName,
              this.colorizeStatus(agent.status),
              isHealthy ? chalk.green('✓ Pass') : chalk.red('✗ Fail')
            ]);
          } catch (error) {
            table.push([
              agent.agentId.substring(0, 32) + '...',
              agent.agentName,
              this.colorizeStatus(agent.status),
              chalk.red('Error')
            ]);
          }
        }

        console.log(table.toString());
      }
    } catch (error) {
      this.error('Failed to check health:', error);
    }
  }

  private async showMonitoring(options: any): Promise<void> {
    try {
      if (options.watch) {
        // Clear screen and show header
        console.clear();
        console.log(chalk.bold.blue('UEP Service Registry - Real-time Monitoring'));
        console.log(chalk.gray('Press Ctrl+C to exit'));
        console.log('═'.repeat(80));

        const displayMetrics = async () => {
          console.log('\n' + chalk.bold('Registry Metrics:'));
          const metrics = this.monitor.getMetrics();
          
          console.log(`Total Agents: ${metrics.totalAgents}`);
          console.log(`Healthy: ${chalk.green(metrics.healthyAgents)} | Unhealthy: ${chalk.red(metrics.unhealthyAgents)}`);
          console.log(`Average Load: ${metrics.averageLoad.toFixed(1)}%`);
          console.log(`Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
          console.log(`Error Rate: ${(metrics.totalErrorRate * 100).toFixed(2)}%`);
          
          const healthStatus = this.monitor.getHealthStatus();
          console.log(`System Status: ${this.colorizeStatus(healthStatus.status)} (Score: ${healthStatus.score})`);
          
          if (healthStatus.issues.length > 0) {
            console.log(`\n${chalk.bold.yellow('Issues:')}`);
            healthStatus.issues.forEach(issue => console.log(`  • ${issue}`));
          }

          const activeAlerts = this.monitor.getActiveAlerts();
          if (activeAlerts.length > 0) {
            console.log(`\n${chalk.bold.red('Active Alerts:')} ${activeAlerts.length}`);
            activeAlerts.slice(0, 3).forEach(alert => {
              console.log(`  • ${alert.severity.toUpperCase()}: ${alert.ruleName}`);
            });
          }

          console.log(`\nLast updated: ${new Date().toLocaleTimeString()}`);
        };

        // Initial display
        await displayMetrics();

        // Set up interval
        const interval = setInterval(displayMetrics, options.interval * 1000);
        
        // Handle Ctrl+C
        process.on('SIGINT', () => {
          clearInterval(interval);
          console.log('\n\nMonitoring stopped.');
          process.exit(0);
        });

      } else {
        // One-time display
        const metrics = this.monitor.getMetrics();
        
        if (this.config.format === 'json') {
          console.log(JSON.stringify(metrics, null, 2));
          return;
        }

        console.log(chalk.bold.blue('Service Registry Metrics'));
        console.log(chalk.gray('═'.repeat(40)));
        
        console.log(`Total Agents: ${metrics.totalAgents}`);
        console.log(`Healthy: ${chalk.green(metrics.healthyAgents)}`);
        console.log(`Unhealthy: ${chalk.red(metrics.unhealthyAgents)}`);
        console.log(`Average Load: ${metrics.averageLoad.toFixed(1)}%`);
        console.log(`Total Capacity: ${metrics.totalCapacity}`);
        console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
        console.log(`Total Error Rate: ${(metrics.totalErrorRate * 100).toFixed(2)}%`);
        console.log(`Registrations/hour: ${metrics.registrationsLastHour}`);
        console.log(`Deregistrations/hour: ${metrics.deregistrationsLastHour}`);
        console.log(`Health Check Failures/hour: ${metrics.healthCheckFailures}`);
        
        console.log(`\n${chalk.bold('Agents by Type:')}`);
        Object.entries(metrics.agentsByType).forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
        
        console.log(`\n${chalk.bold('Agents by Environment:')}`);
        Object.entries(metrics.agentsByEnvironment).forEach(([env, count]) => {
          console.log(`  ${env}: ${count}`);
        });
      }
    } catch (error) {
      this.error('Failed to show monitoring:', error);
    }
  }

  private async manageAlerts(options: any): Promise<void> {
    try {
      if (options.resolve) {
        this.monitor.resolveAlert(options.resolve);
        console.log(chalk.green(`Alert ${options.resolve} resolved`));
        return;
      }

      const alerts = options.all ? this.monitor.getAllAlerts() : this.monitor.getActiveAlerts();
      
      if (this.config.format === 'json') {
        console.log(JSON.stringify(alerts, null, 2));
        return;
      }

      if (alerts.length === 0) {
        console.log(chalk.green('No alerts found'));
        return;
      }

      const table = new Table({
        head: ['Alert ID', 'Rule', 'Severity', 'Status', 'Triggered'],
        colWidths: [20, 30, 10, 10, 20]
      });

      alerts.forEach(alert => {
        table.push([
          alert.id.substring(0, 16) + '...',
          alert.ruleName,
          this.colorizeSeverity(alert.severity),
          alert.resolved ? chalk.green('Resolved') : chalk.red('Active'),
          this.formatTime(alert.timestamp)
        ]);
      });

      console.log(table.toString());
      console.log(`\nTotal: ${alerts.length} alerts`);
      
    } catch (error) {
      this.error('Failed to manage alerts:', error);
    }
  }

  private async showMetrics(options: any): Promise<void> {
    try {
      const metrics = this.monitor.getMetrics();
      
      if (options.prometheus) {
        // Simple Prometheus format
        console.log(`# Registry metrics`);
        console.log(`uep_registry_total_agents ${metrics.totalAgents}`);
        console.log(`uep_registry_healthy_agents ${metrics.healthyAgents}`);
        console.log(`uep_registry_unhealthy_agents ${metrics.unhealthyAgents}`);
        console.log(`uep_registry_average_load ${metrics.averageLoad}`);
        console.log(`uep_registry_total_capacity ${metrics.totalCapacity}`);
        console.log(`uep_registry_average_response_time ${metrics.averageResponseTime}`);
        console.log(`uep_registry_total_error_rate ${metrics.totalErrorRate}`);
        return;
      }

      console.log(JSON.stringify(metrics, null, 2));
      
    } catch (error) {
      this.error('Failed to show metrics:', error);
    }
  }

  private async exportData(options: any): Promise<void> {
    try {
      this.verbose('Exporting registry data...');
      
      const [agents, metrics, alerts, events] = await Promise.all([
        this.registry.getAllAgents(),
        this.monitor.getMetrics(),
        this.monitor.getAllAlerts(),
        options.includeHistory ? this.monitor.getEventHistory(1000) : []
      ]);

      const exportData = {
        timestamp: new Date().toISOString(),
        registry: {
          agents,
          metrics,
          alerts,
          events
        }
      };

      const output = JSON.stringify(exportData, null, 2);
      
      if (options.output) {
        const fs = await import('fs/promises');
        await fs.writeFile(options.output, output);
        console.log(chalk.green(`Registry data exported to: ${options.output}`));
      } else {
        console.log(output);
      }
      
    } catch (error) {
      this.error('Failed to export data:', error);
    }
  }

  private async validateRegistry(options: any): Promise<void> {
    try {
      console.log(chalk.bold.blue('Validating registry consistency...'));
      
      const agents = await this.registry.getAllAgents();
      const issues: string[] = [];

      // Check for duplicate agent IDs
      const agentIds = agents.map(a => a.agentId);
      const duplicateIds = agentIds.filter((id, index) => agentIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        issues.push(`Duplicate agent IDs found: ${duplicateIds.join(', ')}`);
      }

      // Check for stale heartbeats
      const now = Date.now();
      const staleAgents = agents.filter(agent => {
        const heartbeatAge = now - new Date(agent.lastHeartbeat).getTime();
        return heartbeatAge > 300000; // 5 minutes
      });
      
      if (staleAgents.length > 0) {
        issues.push(`${staleAgents.length} agents with stale heartbeats (>5min)`);
      }

      // Check for invalid network configurations
      const invalidNetworkAgents = agents.filter(agent => {
        return !agent.network.address || agent.network.port < 1 || agent.network.port > 65535;
      });
      
      if (invalidNetworkAgents.length > 0) {
        issues.push(`${invalidNetworkAgents.length} agents with invalid network configuration`);
      }

      if (issues.length === 0) {
        console.log(chalk.green('✓ Registry validation passed - no issues found'));
      } else {
        console.log(chalk.red(`✗ Registry validation failed - ${issues.length} issues found:`));
        issues.forEach(issue => console.log(`  • ${issue}`));
        
        if (options.fix) {
          console.log(chalk.yellow('\nAttempting to fix issues...'));
          // Implementation would depend on specific fix strategies
          console.log(chalk.yellow('Fix functionality not yet implemented'));
        }
      }
      
    } catch (error) {
      this.error('Failed to validate registry:', error);
    }
  }

  private async debugRegistry(options: any): Promise<void> {
    try {
      if (options.consulInfo) {
        console.log(chalk.bold.blue('Consul Connection Info:'));
        console.log(`Host: ${this.config.consul.host}`);
        console.log(`Port: ${this.config.consul.port}`);
        console.log(`Secure: ${this.config.consul.secure}`);
        console.log(`Token: ${this.config.consul.token ? '[REDACTED]' : 'None'}`);
      }

      if (options.agentDetails) {
        await this.showAgent(options.agentDetails);
      }
      
    } catch (error) {
      this.error('Failed to debug registry:', error);
    }
  }

  // Utility methods
  private colorizeStatus(status: string): string {
    switch (status) {
      case 'healthy': return chalk.green(status);
      case 'degraded': return chalk.yellow(status);
      case 'unhealthy': return chalk.red(status);
      case 'maintenance': return chalk.blue(status);
      case 'initializing': return chalk.cyan(status);
      default: return chalk.gray(status);
    }
  }

  private colorizeSeverity(severity: string): string {
    switch (severity) {
      case 'critical': return chalk.red(severity);
      case 'warning': return chalk.yellow(severity);
      case 'info': return chalk.blue(severity);
      default: return chalk.gray(severity);
    }
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return Math.floor(diff / 1000) + 's ago';
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + 'm ago';
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + 'h ago';
    } else {
      return date.toLocaleDateString();
    }
  }

  private verbose(message: string, ...args: any[]): void {
    if (this.config.verbose) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  private error(message: string, error: any): void {
    console.error(chalk.red(message), error instanceof Error ? error.message : error);
  }
}

// Main execution
if (require.main === module) {
  const cli = new RegistryCLI();
  cli.run().catch(error => {
    console.error(chalk.red('CLI failed:'), error);
    process.exit(1);
  });
}

export { RegistryCLI };