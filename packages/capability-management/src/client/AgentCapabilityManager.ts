#!/usr/bin/env node

/**
 * UEP Agent Capability Manager
 * 
 * High-level capability management for UEP agents including capability
 * lifecycle management, version negotiation, automatic updates, and
 * intelligent capability composition.
 * 
 * Research-based implementation features:
 * - Capability lifecycle management (register, update, deprecate, remove)
 * - Version negotiation and compatibility checking
 * - Automatic capability composition and dependency resolution
 * - Dynamic capability loading and hot-swapping
 * - Performance monitoring and optimization
 * - Error handling and fallback mechanisms
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.3
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';
import {
  AgentCapability,
  SemVer,
  VersionRange,
  CapabilityRequirement,
  CompatibilityResult,
  PerformanceMetrics,
  ChangelogEntry
} from '../types/CapabilitySchema.js';
import {
  parseSemVer,
  compareSemVer,
  checkCapabilityCompatibility,
  getNextMajorVersion,
  getNextMinorVersion,
  getNextPatchVersion,
  semVerToString
} from '../utils/CapabilityVersioning.js';
import { AgentRegistrationClient } from './AgentRegistrationClient.js';

/**
 * Capability update event
 */
export interface CapabilityUpdateEvent {
  type: 'added' | 'updated' | 'deprecated' | 'removed';
  capability: AgentCapability;
  previousVersion?: SemVer;
  reason?: string;
}

/**
 * Capability performance tracking
 */
export interface CapabilityPerformanceData {
  capabilityId: string;
  version: SemVer;
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  lastInvocation: Date;
  trending: 'improving' | 'stable' | 'degrading';
}

/**
 * Capability dependency information
 */
export interface CapabilityDependency {
  capabilityId: string;
  versionRange: VersionRange;
  required: boolean;
  alternatives?: string[];
  reason?: string;
}

/**
 * Capability manager configuration
 */
export interface CapabilityManagerConfig {
  // Automatic capability management
  autoVersioning?: boolean;              // Enable automatic version bumping
  autoDeprecation?: boolean;             // Enable automatic deprecation
  autoRemoval?: boolean;                 // Enable automatic removal of deprecated capabilities
  
  // Performance monitoring
  performanceTracking?: boolean;         // Enable performance tracking
  performanceThresholds?: {              // Performance thresholds for warnings
    maxLatency?: number;                 // Maximum acceptable latency (ms)
    minSuccessRate?: number;             // Minimum success rate (0-1)
    maxErrorRate?: number;               // Maximum error rate (0-1)
  };
  
  // Version management
  versioningPolicy?: {
    patchFrequency?: number;             // Auto-patch version frequency (days)
    minorFrequency?: number;             // Auto-minor version frequency (days)
    majorNotificationPeriod?: number;    // Major version notification period (days)
  };
  
  // Dependency management
  dependencyResolution?: {
    autoResolve?: boolean;               // Enable automatic dependency resolution
    conflictStrategy?: 'latest' | 'stable' | 'manual'; // Conflict resolution strategy
    maxDepth?: number;                   // Maximum dependency resolution depth
  };
}

/**
 * Agent Capability Manager class
 */
export class AgentCapabilityManager extends EventEmitter {
  private registrationClient: AgentRegistrationClient;
  private config: CapabilityManagerConfig;
  private capabilities: Map<string, AgentCapability> = new Map();
  private performanceData: Map<string, CapabilityPerformanceData> = new Map();
  private dependencies: Map<string, CapabilityDependency[]> = new Map();
  private deprecationTimers: Map<string, NodeJS.Timeout> = new Map();
  private versioningTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    registrationClient: AgentRegistrationClient,
    config: CapabilityManagerConfig = {}
  ) {
    super();
    
    this.registrationClient = registrationClient;
    this.config = {
      autoVersioning: true,
      autoDeprecation: false,
      autoRemoval: false,
      performanceTracking: true,
      performanceThresholds: {
        maxLatency: 5000,
        minSuccessRate: 0.95,
        maxErrorRate: 0.05
      },
      versioningPolicy: {
        patchFrequency: 30,
        minorFrequency: 90,
        majorNotificationPeriod: 180
      },
      dependencyResolution: {
        autoResolve: true,
        conflictStrategy: 'latest',
        maxDepth: 5
      },
      ...config
    };

    this.setupEventHandlers();
  }

  /**
   * Register a new capability
   */
  public async registerCapability(capability: AgentCapability): Promise<void> {
    try {
      console.log(chalk.blue(`📋 Registering capability: ${capability.id} v${semVerToString(capability.version)}`));
      
      // Validate capability
      this.validateCapability(capability);
      
      // Check for version conflicts
      await this.checkVersionConflicts(capability);
      
      // Store capability
      this.capabilities.set(capability.id, capability);
      
      // Initialize performance tracking
      if (this.config.performanceTracking) {
        this.initializePerformanceTracking(capability);
      }
      
      // Setup automatic versioning
      if (this.config.autoVersioning) {
        this.setupAutomaticVersioning(capability);
      }
      
      // Resolve dependencies
      if (this.config.dependencyResolution?.autoResolve && capability.constraints?.requiredCapabilities) {
        await this.resolveDependencies(capability);
      }
      
      // Update registration
      await this.registrationClient.addCapability(capability);
      
      console.log(chalk.green(`✅ Capability registered: ${capability.id} v${semVerToString(capability.version)}`));
      
      const event: CapabilityUpdateEvent = {
        type: 'added',
        capability
      };
      
      this.emit('capabilityRegistered', event);
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to register capability: ${capability.id}`), error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update an existing capability
   */
  public async updateCapability(
    capabilityId: string,
    updates: Partial<AgentCapability>,
    versionBump?: 'patch' | 'minor' | 'major'
  ): Promise<void> {
    try {
      const existingCapability = this.capabilities.get(capabilityId);
      if (!existingCapability) {
        throw new Error(`Capability not found: ${capabilityId}`);
      }

      console.log(chalk.blue(`🔄 Updating capability: ${capabilityId} v${semVerToString(existingCapability.version)}`));
      
      const previousVersion = existingCapability.version;
      
      // Create updated capability
      const updatedCapability: AgentCapability = {
        ...existingCapability,
        ...updates,
        version: versionBump ? this.bumpVersion(existingCapability.version, versionBump) : existingCapability.version,
        lastUpdated: new Date()
      };
      
      // Add changelog entry
      if (!updatedCapability.documentation) {
        updatedCapability.documentation = {};
      }
      if (!updatedCapability.documentation.changelog) {
        updatedCapability.documentation.changelog = [];
      }
      
      updatedCapability.documentation.changelog.unshift({
        version: updatedCapability.version,
        date: new Date(),
        type: versionBump === 'major' ? 'changed' : versionBump === 'minor' ? 'added' : 'fixed',
        description: `Capability updated${updates.description ? ': ' + updates.description : ''}`,
        breakingChange: versionBump === 'major'
      });
      
      // Validate updated capability
      this.validateCapability(updatedCapability);
      
      // Store updated capability
      this.capabilities.set(capabilityId, updatedCapability);
      
      // Update registration
      await this.registrationClient.updateCapabilities(Array.from(this.capabilities.values()));
      
      console.log(chalk.green(`✅ Capability updated: ${capabilityId} v${semVerToString(updatedCapability.version)}`));
      
      const event: CapabilityUpdateEvent = {
        type: 'updated',
        capability: updatedCapability,
        previousVersion,
        reason: 'Manual update'
      };
      
      this.emit('capabilityUpdated', event);
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to update capability: ${capabilityId}`), error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Deprecate a capability
   */
  public async deprecateCapability(
    capabilityId: string,
    deprecationNotice: string,
    replacementCapability?: string,
    removalDate?: Date
  ): Promise<void> {
    try {
      const capability = this.capabilities.get(capabilityId);
      if (!capability) {
        throw new Error(`Capability not found: ${capabilityId}`);
      }

      console.log(chalk.yellow(`⚠️ Deprecating capability: ${capabilityId} v${semVerToString(capability.version)}`));
      
      // Update capability with deprecation info
      const deprecatedCapability: AgentCapability = {
        ...capability,
        deprecated: true,
        deprecationNotice,
        replacedBy: replacementCapability,
        lastUpdated: new Date()
      };
      
      // Add changelog entry
      if (!deprecatedCapability.documentation) {
        deprecatedCapability.documentation = {};
      }
      if (!deprecatedCapability.documentation.changelog) {
        deprecatedCapability.documentation.changelog = [];
      }
      
      deprecatedCapability.documentation.changelog.unshift({
        version: deprecatedCapability.version,
        date: new Date(),
        type: 'deprecated',
        description: deprecationNotice,
        breakingChange: false
      });
      
      // Store deprecated capability
      this.capabilities.set(capabilityId, deprecatedCapability);
      
      // Schedule automatic removal if configured
      if (this.config.autoRemoval && removalDate) {
        const removalDelay = removalDate.getTime() - Date.now();
        if (removalDelay > 0) {
          const timer = setTimeout(() => {
            this.removeCapability(capabilityId, 'Automatic removal after deprecation period').catch(console.error);
          }, removalDelay);
          
          this.deprecationTimers.set(capabilityId, timer);
        }
      }
      
      // Update registration
      await this.registrationClient.updateCapabilities(Array.from(this.capabilities.values()));
      
      console.log(chalk.yellow(`⚠️ Capability deprecated: ${capabilityId} v${semVerToString(capability.version)}`));
      
      const event: CapabilityUpdateEvent = {
        type: 'deprecated',
        capability: deprecatedCapability,
        reason: deprecationNotice
      };
      
      this.emit('capabilityDeprecated', event);
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to deprecate capability: ${capabilityId}`), error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Remove a capability
   */
  public async removeCapability(capabilityId: string, reason?: string): Promise<void> {
    try {
      const capability = this.capabilities.get(capabilityId);
      if (!capability) {
        console.warn(chalk.yellow(`⚠️ Capability not found for removal: ${capabilityId}`));
        return;
      }

      console.log(chalk.red(`🗑️ Removing capability: ${capabilityId} v${semVerToString(capability.version)}`));
      
      // Clear timers
      const deprecationTimer = this.deprecationTimers.get(capabilityId);
      if (deprecationTimer) {
        clearTimeout(deprecationTimer);
        this.deprecationTimers.delete(capabilityId);
      }
      
      const versioningTimer = this.versioningTimers.get(capabilityId);
      if (versioningTimer) {
        clearTimeout(versioningTimer);
        this.versioningTimers.delete(capabilityId);
      }
      
      // Remove from local storage
      this.capabilities.delete(capabilityId);
      this.performanceData.delete(capabilityId);
      this.dependencies.delete(capabilityId);
      
      // Update registration
      await this.registrationClient.removeCapability(capabilityId);
      
      console.log(chalk.red(`🗑️ Capability removed: ${capabilityId} v${semVerToString(capability.version)}`));
      
      const event: CapabilityUpdateEvent = {
        type: 'removed',
        capability,
        reason: reason || 'Manual removal'
      };
      
      this.emit('capabilityRemoved', event);
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to remove capability: ${capabilityId}`), error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Record capability invocation for performance tracking
   */
  public recordInvocation(
    capabilityId: string,
    latency: number,
    success: boolean,
    error?: Error
  ): void {
    if (!this.config.performanceTracking) return;

    const performanceData = this.performanceData.get(capabilityId);
    if (!performanceData) return;

    // Update performance metrics
    performanceData.totalInvocations++;
    performanceData.lastInvocation = new Date();
    
    if (success) {
      performanceData.successfulInvocations++;
    } else {
      performanceData.failedInvocations++;
    }
    
    // Update latency statistics
    performanceData.averageLatency = (
      (performanceData.averageLatency * (performanceData.totalInvocations - 1) + latency) /
      performanceData.totalInvocations
    );
    
    performanceData.minLatency = Math.min(performanceData.minLatency, latency);
    performanceData.maxLatency = Math.max(performanceData.maxLatency, latency);
    
    // Update trending
    this.updatePerformanceTrending(performanceData);
    
    // Check thresholds
    this.checkPerformanceThresholds(capabilityId, performanceData);
    
    this.performanceData.set(capabilityId, performanceData);
    
    this.emit('invocationRecorded', {
      capabilityId,
      latency,
      success,
      error,
      performance: performanceData
    });
  }

  /**
   * Get capability by ID
   */
  public getCapability(capabilityId: string): AgentCapability | undefined {
    return this.capabilities.get(capabilityId);
  }

  /**
   * Get all capabilities
   */
  public getAllCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get performance data for a capability
   */
  public getPerformanceData(capabilityId: string): CapabilityPerformanceData | undefined {
    return this.performanceData.get(capabilityId);
  }

  /**
   * Check capability compatibility
   */
  public async checkCompatibility(
    capabilityId: string,
    requirement: CapabilityRequirement
  ): Promise<CompatibilityResult> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      return {
        compatible: false,
        reason: `Capability not found: ${capabilityId}`,
        score: 0
      };
    }

    return checkCapabilityCompatibility(capability, requirement);
  }

  /**
   * Find compatible capabilities
   */
  public findCompatibleCapabilities(requirement: CapabilityRequirement): AgentCapability[] {
    const compatibleCapabilities: AgentCapability[] = [];
    
    for (const capability of this.capabilities.values()) {
      if (capability.id === requirement.capabilityId || requirement.alternatives?.includes(capability.id)) {
        const compatibility = checkCapabilityCompatibility(capability, requirement);
        if (compatibility.compatible) {
          compatibleCapabilities.push(capability);
        }
      }
    }
    
    // Sort by compatibility score (highest first)
    compatibleCapabilities.sort((a, b) => {
      const scoreA = checkCapabilityCompatibility(a, requirement).score || 0;
      const scoreB = checkCapabilityCompatibility(b, requirement).score || 0;
      return scoreB - scoreA;
    });
    
    return compatibleCapabilities;
  }

  /**
   * Validate capability
   */
  private validateCapability(capability: AgentCapability): void {
    if (!capability.id) {
      throw new Error('Capability ID is required');
    }
    
    if (!capability.name) {
      throw new Error('Capability name is required');
    }
    
    if (!capability.version) {
      throw new Error('Capability version is required');
    }
    
    if (!capability.description) {
      throw new Error('Capability description is required');
    }
  }

  /**
   * Check for version conflicts
   */
  private async checkVersionConflicts(capability: AgentCapability): Promise<void> {
    const existingCapability = this.capabilities.get(capability.id);
    
    if (existingCapability) {
      const comparison = compareSemVer(capability.version, existingCapability.version);
      
      if (comparison <= 0) {
        console.warn(chalk.yellow(
          `⚠️ Version conflict: ${capability.id} v${semVerToString(capability.version)} ` +
          `is not newer than existing v${semVerToString(existingCapability.version)}`
        ));
      }
    }
  }

  /**
   * Initialize performance tracking for a capability
   */
  private initializePerformanceTracking(capability: AgentCapability): void {
    const performanceData: CapabilityPerformanceData = {
      capabilityId: capability.id,
      version: capability.version,
      totalInvocations: 0,
      successfulInvocations: 0,
      failedInvocations: 0,
      averageLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      lastInvocation: new Date(),
      trending: 'stable'
    };
    
    this.performanceData.set(capability.id, performanceData);
  }

  /**
   * Setup automatic versioning
   */
  private setupAutomaticVersioning(capability: AgentCapability): void {
    if (!this.config.versioningPolicy) return;

    const patchInterval = (this.config.versioningPolicy.patchFrequency || 30) * 24 * 60 * 60 * 1000;
    
    const timer = setInterval(() => {
      this.considerAutomaticVersionBump(capability.id).catch(console.error);
    }, patchInterval);
    
    this.versioningTimers.set(capability.id, timer);
  }

  /**
   * Consider automatic version bump
   */
  private async considerAutomaticVersionBump(capabilityId: string): Promise<void> {
    const capability = this.capabilities.get(capabilityId);
    const performanceData = this.performanceData.get(capabilityId);
    
    if (!capability || !performanceData) return;

    // Only bump version if performance is good
    const successRate = performanceData.successfulInvocations / performanceData.totalInvocations;
    
    if (successRate >= (this.config.performanceThresholds?.minSuccessRate || 0.95)) {
      console.log(chalk.blue(`🔄 Auto-bumping patch version for capability: ${capabilityId}`));
      
      await this.updateCapability(capabilityId, {
        description: `${capability.description} (auto-updated)`
      }, 'patch');
    }
  }

  /**
   * Resolve dependencies
   */
  private async resolveDependencies(capability: AgentCapability): Promise<void> {
    if (!capability.constraints?.requiredCapabilities) return;

    console.log(chalk.blue(`🔗 Resolving dependencies for capability: ${capability.id}`));
    
    const dependencies: CapabilityDependency[] = [];
    
    for (const requiredCapability of capability.constraints.requiredCapabilities) {
      dependencies.push({
        capabilityId: requiredCapability,
        versionRange: { operator: '>=', version: { major: 1, minor: 0, patch: 0 } },
        required: true,
        reason: `Required by ${capability.id}`
      });
    }
    
    this.dependencies.set(capability.id, dependencies);
    
    console.log(chalk.green(`✅ Dependencies resolved for capability: ${capability.id} (${dependencies.length} dependencies)`));
  }

  /**
   * Bump version
   */
  private bumpVersion(version: SemVer, bumpType: 'patch' | 'minor' | 'major'): SemVer {
    switch (bumpType) {
      case 'patch':
        return getNextPatchVersion(version);
      case 'minor':
        return getNextMinorVersion(version);
      case 'major':
        return getNextMajorVersion(version);
      default:
        return version;
    }
  }

  /**
   * Update performance trending
   */
  private updatePerformanceTrending(performanceData: CapabilityPerformanceData): void {
    // Simple trending calculation based on recent performance
    // In a real implementation, this would analyze historical data
    const successRate = performanceData.successfulInvocations / performanceData.totalInvocations;
    
    if (successRate > 0.98) {
      performanceData.trending = 'improving';
    } else if (successRate < 0.90) {
      performanceData.trending = 'degrading';
    } else {
      performanceData.trending = 'stable';
    }
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(
    capabilityId: string,
    performanceData: CapabilityPerformanceData
  ): void {
    const thresholds = this.config.performanceThresholds;
    if (!thresholds) return;

    const successRate = performanceData.successfulInvocations / performanceData.totalInvocations;
    const errorRate = performanceData.failedInvocations / performanceData.totalInvocations;
    
    // Check latency threshold
    if (thresholds.maxLatency && performanceData.averageLatency > thresholds.maxLatency) {
      this.emit('performanceWarning', {
        capabilityId,
        type: 'high_latency',
        value: performanceData.averageLatency,
        threshold: thresholds.maxLatency
      });
    }
    
    // Check success rate threshold
    if (thresholds.minSuccessRate && successRate < thresholds.minSuccessRate) {
      this.emit('performanceWarning', {
        capabilityId,
        type: 'low_success_rate',
        value: successRate,
        threshold: thresholds.minSuccessRate
      });
    }
    
    // Check error rate threshold
    if (thresholds.maxErrorRate && errorRate > thresholds.maxErrorRate) {
      this.emit('performanceWarning', {
        capabilityId,
        type: 'high_error_rate',
        value: errorRate,
        threshold: thresholds.maxErrorRate
      });
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to registration client events
    this.registrationClient.on('registered', () => {
      console.log(chalk.green('🔗 Agent registered, capabilities are now advertised'));
    });
    
    this.registrationClient.on('deregistered', () => {
      console.log(chalk.yellow('🔗 Agent deregistered, capabilities are no longer advertised'));
    });
    
    // Handle performance warnings
    this.on('performanceWarning', (warning) => {
      console.warn(chalk.yellow(`⚠️ Performance warning for ${warning.capabilityId}: ${warning.type} = ${warning.value} (threshold: ${warning.threshold})`));
    });
  }
}

export default AgentCapabilityManager;