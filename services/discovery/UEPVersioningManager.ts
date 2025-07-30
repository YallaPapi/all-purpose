/**
 * UEP Versioning and Capability-Based Discovery Manager
 * 
 * Advanced versioning system for UEP service discovery with semantic versioning,
 * capability-based routing, version compatibility checking, and intelligent
 * discovery algorithms. Supports backward compatibility, version migration,
 * and capability evolution tracking. Based on TaskMaster research findings.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import semver from 'semver';
import { Logger } from '../../shared/utils/Logger';
import { UEPAgentRegistration, UEPAgentCapability } from '../registry/UEPRegistryService';
import UEPDiscoveryClient, { UEPServiceDiscoveryQuery, UEPCapabilityMatch } from './UEPDiscoveryClient';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPVersioningConfig {
  enableVersioning: boolean;
  enableCapabilityEvolution: boolean;
  enableBackwardCompatibility: boolean;
  enableVersionMigration: boolean;
  strictVersioning: boolean;
  compatibilityWindow: string; // e.g., "1.x.x" for major version compatibility
  capabilityMatchingStrategy: 'strict' | 'loose' | 'fuzzy' | 'intelligent';
  versionPreference: 'latest' | 'stable' | 'compatible' | 'specific';
  enableMetrics: boolean;
  enableTracing: boolean;
  cacheVersionData: boolean;
  migrationGracePeriod: number;
}

export interface UEPVersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  releaseDate: Date;
  deprecationDate?: Date;
  endOfLifeDate?: Date;
  stability: 'alpha' | 'beta' | 'rc' | 'stable' | 'deprecated' | 'eol';
  compatibleWith: string[];
  breakingChanges: string[];
  notes?: string;
}

export interface UEPCapabilityEvolution {
  capability: string;
  versionHistory: Array<{
    version: string;
    changes: string[];
    compatibility: 'compatible' | 'breaking' | 'deprecated';
    migrationPath?: string;
    timestamp: Date;
  }>;
  currentVersion: string;
  deprecatedVersions: string[];
  supportedVersions: string[];
}

export interface UEPVersionedDiscoveryQuery extends UEPServiceDiscoveryQuery {
  targetVersion?: string;
  versionRange?: string;
  requireExactVersion?: boolean;
  allowPrerelease?: boolean;
  capabilityVersions?: Record<string, string>;
  compatibility?: 'strict' | 'loose' | 'best-effort';
}

export interface UEPVersionedDiscoveryResult {
  agents: UEPVersionedAgentMatch[];
  versionAnalysis: UEPVersionAnalysis;
  capabilityMatches: UEPVersionedCapabilityMatch[];
  recommendations: UEPVersionRecommendation[];
  migrationSuggestions: UEPMigrationSuggestion[];
}

export interface UEPVersionedAgentMatch {
  agent: UEPAgentRegistration;
  versionInfo: UEPVersionInfo;
  compatibilityScore: number;
  matchReason: string;
  requiredMigrations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface UEPVersionedCapabilityMatch extends UEPCapabilityMatch {
  versionInfo: UEPVersionInfo;
  compatibilityLevel: 'exact' | 'compatible' | 'degraded' | 'incompatible';
  migrationRequired: boolean;
  alternativeVersions: string[];
}

export interface UEPVersionAnalysis {
  requestedVersion: string;
  availableVersions: string[];
  bestMatch: string;
  compatibleVersions: string[];
  deprecatedVersions: string[];
  migrationRequired: boolean;
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface UEPVersionRecommendation {
  type: 'upgrade' | 'downgrade' | 'migrate' | 'alternative';
  fromVersion: string;
  toVersion: string;
  reason: string;
  benefits: string[];
  risks: string[];
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface UEPMigrationSuggestion {
  capability: string;
  fromVersion: string;
  toVersion: string;
  migrationPath: string;
  automatedSteps: string[];
  manualSteps: string[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface UEPVersioningMetrics {
  versionDiscoveryRequests: Counter;
  versionMatchingLatency: Histogram;
  capabilityEvolutionEvents: Counter;
  migrationRecommendations: Counter;
  compatibilityAnalysis: Counter;
  versionDistribution: Gauge;
  deprecationWarnings: Counter;
}

// =============================================================================
// UEP Versioning Manager Core Class
// =============================================================================

export class UEPVersioningManager extends EventEmitter {
  private readonly config: UEPVersioningConfig;
  private readonly logger = new Logger('UEPVersioningManager');
  private readonly tracer = trace.getTracer('uep-versioning-manager', '1.0.0');
  
  // Discovery client
  private readonly discoveryClient: UEPDiscoveryClient;
  
  // Version and capability tracking
  private readonly versionRegistry: Map<string, UEPVersionInfo> = new Map();
  private readonly capabilityEvolution: Map<string, UEPCapabilityEvolution> = new Map();
  private readonly compatibilityMatrix: Map<string, Map<string, boolean>> = new Map();
  
  // Metrics collection
  private readonly metrics: UEPVersioningMetrics;
  
  // Caching
  private readonly versionAnalysisCache: Map<string, UEPVersionAnalysis> = new Map();

  constructor(
    discoveryClient: UEPDiscoveryClient,
    config: Partial<UEPVersioningConfig> = {}
  ) {
    super();
    
    this.discoveryClient = discoveryClient;
    
    this.config = {
      enableVersioning: true,
      enableCapabilityEvolution: true,
      enableBackwardCompatibility: true,
      enableVersionMigration: true,
      strictVersioning: false,
      compatibilityWindow: '1.x.x',
      capabilityMatchingStrategy: 'intelligent',
      versionPreference: 'stable',
      enableMetrics: true,
      enableTracing: true,
      cacheVersionData: true,
      migrationGracePeriod: 2592000000, // 30 days
      ...config
    };

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Setup built-in version knowledge
    this.initializeVersionRegistry();

    this.logger.info('UEP Versioning Manager initialized', {
      enableVersioning: this.config.enableVersioning,
      capabilityMatchingStrategy: this.config.capabilityMatchingStrategy,
      versionPreference: this.config.versionPreference,
      strictVersioning: this.config.strictVersioning
    });
  }

  // =============================================================================
  // Version Registry Management
  // =============================================================================

  private initializeVersionRegistry(): void {
    // Register known UEP protocol versions
    const uepVersions = [
      {
        version: '1.0.0',
        stability: 'stable',
        releaseDate: new Date('2024-01-01'),
        endOfLifeDate: new Date('2025-12-31'),
        compatibleWith: ['1.0.x'],
        breakingChanges: []
      },
      {
        version: '2.0.0',
        stability: 'stable',
        releaseDate: new Date('2024-06-01'),
        compatibleWith: ['2.0.x', '1.9.x'],
        breakingChanges: ['Message format changes', 'New validation rules']
      },
      {
        version: '2.1.0',
        stability: 'stable',
        releaseDate: new Date('2024-09-01'),
        compatibleWith: ['2.x.x'],
        breakingChanges: []
      }
    ];

    for (const versionData of uepVersions) {
      this.registerVersion('uep-protocol', versionData);
    }
  }

  public registerVersion(component: string, versionData: Partial<UEPVersionInfo>): void {
    if (!versionData.version) {
      throw new Error('Version is required');
    }

    const parsed = semver.parse(versionData.version);
    if (!parsed) {
      throw new Error('Invalid semantic version');
    }

    const versionInfo: UEPVersionInfo = {
      version: versionData.version,
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      prerelease: parsed.prerelease.join('.') || undefined,
      build: parsed.build.join('.') || undefined,
      releaseDate: versionData.releaseDate || new Date(),
      stability: versionData.stability || 'stable',
      compatibleWith: versionData.compatibleWith || [],
      breakingChanges: versionData.breakingChanges || [],
      notes: versionData.notes,
      ...versionData
    };

    const key = `${component}:${versionData.version}`;
    this.versionRegistry.set(key, versionInfo);

    this.emit('versionRegistered', {
      component,
      version: versionInfo,
      timestamp: new Date()
    });

    this.logger.debug('Version registered', {
      component,
      version: versionData.version,
      stability: versionInfo.stability
    });
  }

  // =============================================================================
  // Versioned Discovery
  // =============================================================================

  public async discoverWithVersioning(query: UEPVersionedDiscoveryQuery): Promise<UEPVersionedDiscoveryResult> {
    return this.tracer.startActiveSpan('uep.versioning.discover', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'versioning.target_version': query.targetVersion || 'any',
          'versioning.version_range': query.versionRange || 'any',
          'versioning.compatibility': query.compatibility || 'loose'
        });

        // Perform base discovery
        const baseDiscovery = await this.discoveryClient.discoverAgents(query);

        // Analyze versions
        const versionAnalysis = this.analyzeVersions(query, baseDiscovery.agents);

        // Filter and rank agents by version compatibility
        const versionedMatches = await this.createVersionedMatches(
          baseDiscovery.agents,
          query
        );

        // Generate recommendations
        const recommendations = this.generateVersionRecommendations(
          versionAnalysis,
          versionedMatches
        );

        // Generate migration suggestions
        const migrationSuggestions = this.generateMigrationSuggestions(
          query,
          versionedMatches
        );

        // Find capability matches with versioning
        const capabilityMatches = await this.findVersionedCapabilityMatches(
          baseDiscovery.agents,
          query
        );

        const result: UEPVersionedDiscoveryResult = {
          agents: versionedMatches,
          versionAnalysis,
          capabilityMatches,
          recommendations,
          migrationSuggestions
        };

        // Update metrics
        this.metrics.versionDiscoveryRequests.inc({
          strategy: this.config.capabilityMatchingStrategy,
          preference: this.config.versionPreference
        });

        this.metrics.versionMatchingLatency.observe(
          { compatibility: query.compatibility || 'loose' },
          (Date.now() - startTime) / 1000
        );

        span.setAttributes({
          'versioning.matches_found': versionedMatches.length,
          'versioning.recommendations_count': recommendations.length,
          'versioning.duration_ms': Date.now() - startTime
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  private analyzeVersions(query: UEPVersionedDiscoveryQuery, agents: UEPAgentRegistration[]): UEPVersionAnalysis {
    const availableVersions = [...new Set(agents.map(agent => agent.version))].sort(semver.rcompare);
    const requestedVersion = query.targetVersion || 'latest';

    let bestMatch = requestedVersion;
    if (requestedVersion === 'latest') {
      bestMatch = availableVersions[0] || '1.0.0';
    } else if (query.versionRange) {
      const compatible = availableVersions.filter(v => semver.satisfies(v, query.versionRange!));
      bestMatch = compatible[0] || availableVersions[0] || '1.0.0';
    }

    const compatibleVersions = availableVersions.filter(version => {
      if (query.requireExactVersion) {
        return version === requestedVersion;
      }

      if (query.versionRange) {
        return semver.satisfies(version, query.versionRange);
      }

      // Use compatibility window
      return semver.satisfies(version, this.config.compatibilityWindow);
    });

    const deprecatedVersions = availableVersions.filter(version => {
      const versionInfo = this.versionRegistry.get(`uep-protocol:${version}`);
      return versionInfo?.stability === 'deprecated' || versionInfo?.stability === 'eol';
    });

    const migrationRequired = !compatibleVersions.includes(requestedVersion) && 
                             requestedVersion !== 'latest';

    const riskAssessment = this.calculateRiskLevel(
      requestedVersion,
      bestMatch,
      compatibleVersions,
      deprecatedVersions
    );

    return {
      requestedVersion,
      availableVersions,
      bestMatch,
      compatibleVersions,
      deprecatedVersions,
      migrationRequired,
      riskAssessment
    };
  }

  private async createVersionedMatches(
    agents: UEPAgentRegistration[],
    query: UEPVersionedDiscoveryQuery
  ): Promise<UEPVersionedAgentMatch[]> {
    const matches: UEPVersionedAgentMatch[] = [];

    for (const agent of agents) {
      const versionInfo = this.getVersionInfo('uep-protocol', agent.version);
      const compatibilityScore = this.calculateCompatibilityScore(agent, query);
      const matchReason = this.determineMatchReason(agent, query);
      const requiredMigrations = this.identifyRequiredMigrations(agent, query);
      const riskLevel = this.assessRiskLevel(agent, query);

      matches.push({
        agent,
        versionInfo,
        compatibilityScore,
        matchReason,
        requiredMigrations,
        riskLevel
      });
    }

    // Sort by compatibility score (highest first)
    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return matches;
  }

  private async findVersionedCapabilityMatches(
    agents: UEPAgentRegistration[],
    query: UEPVersionedDiscoveryQuery
  ): Promise<UEPVersionedCapabilityMatch[]> {
    if (!query.capabilities) return [];

    const matches: UEPVersionedCapabilityMatch[] = [];

    for (const agent of agents) {
      for (const capability of agent.capabilities) {
        const relevanceScore = this.calculateCapabilityRelevance(capability, query.capabilities);
        
        if (relevanceScore > 0) {
          const versionInfo = this.getVersionInfo('capability', capability.name);
          const compatibilityLevel = this.determineCapabilityCompatibility(capability, query);
          const migrationRequired = this.isCapabilityMigrationRequired(capability, query);
          const alternativeVersions = this.findAlternativeCapabilityVersions(capability);

          matches.push({
            agent,
            matchingCapabilities: [capability],
            score: relevanceScore,
            versionInfo,
            compatibilityLevel,
            migrationRequired,
            alternativeVersions
          });
        }
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  // =============================================================================
  // Compatibility Analysis
  // =============================================================================

  private calculateCompatibilityScore(agent: UEPAgentRegistration, query: UEPVersionedDiscoveryQuery): number {
    let score = 0;

    // Version compatibility (40% weight)
    const versionScore = this.calculateVersionCompatibilityScore(agent.version, query);
    score += versionScore * 0.4;

    // Capability compatibility (30% weight)
    const capabilityScore = this.calculateCapabilityCompatibilityScore(agent, query);
    score += capabilityScore * 0.3;

    // Stability and maturity (20% weight)
    const stabilityScore = this.calculateStabilityScore(agent);
    score += stabilityScore * 0.2;

    // Performance and health (10% weight)
    const performanceScore = this.calculatePerformanceScore(agent);
    score += performanceScore * 0.1;

    return Math.min(1.0, Math.max(0.0, score));
  }

  private calculateVersionCompatibilityScore(version: string, query: UEPVersionedDiscoveryQuery): number {
    if (query.requireExactVersion && query.targetVersion) {
      return version === query.targetVersion ? 1.0 : 0.0;
    }

    if (query.versionRange) {
      return semver.satisfies(version, query.versionRange) ? 1.0 : 0.0;
    }

    if (query.targetVersion && query.targetVersion !== 'latest') {
      const diff = semver.diff(version, query.targetVersion);
      switch (diff) {
        case null: return 1.0; // Same version
        case 'patch': return 0.9;
        case 'minor': return 0.7;
        case 'major': return 0.3;
        default: return 0.1;
      }
    }

    // Default to preferring stable versions
    const versionInfo = this.getVersionInfo('uep-protocol', version);
    switch (versionInfo.stability) {
      case 'stable': return 1.0;
      case 'rc': return 0.8;
      case 'beta': return 0.6;
      case 'alpha': return 0.4;
      case 'deprecated': return 0.2;
      case 'eol': return 0.0;
      default: return 0.5;
    }
  }

  private calculateCapabilityCompatibilityScore(agent: UEPAgentRegistration, query: UEPVersionedDiscoveryQuery): number {
    if (!query.capabilities || query.capabilities.length === 0) {
      return 1.0;
    }

    let totalScore = 0;
    let maxScore = query.capabilities.length;

    for (const requestedCapability of query.capabilities) {
      let bestMatch = 0;

      for (const agentCapability of agent.capabilities) {
        const relevance = this.calculateCapabilityRelevance(agentCapability, [requestedCapability]);
        
        if (query.capabilityVersions && query.capabilityVersions[requestedCapability]) {
          const requiredVersion = query.capabilityVersions[requestedCapability];
          const versionMatch = semver.satisfies(agentCapability.version, requiredVersion);
          bestMatch = Math.max(bestMatch, relevance * (versionMatch ? 1.0 : 0.5));
        } else {
          bestMatch = Math.max(bestMatch, relevance);
        }
      }

      totalScore += bestMatch;
    }

    return maxScore > 0 ? totalScore / maxScore : 1.0;
  }

  private calculateStabilityScore(agent: UEPAgentRegistration): number {
    const versionInfo = this.getVersionInfo('uep-protocol', agent.version);
    const baseScore = versionInfo.stability === 'stable' ? 1.0 : 0.5;
    
    // Factor in agent uptime and health
    const now = Date.now();
    const registrationAge = now - agent.registrationTime.getTime();
    const uptimeScore = Math.min(1.0, registrationAge / (24 * 60 * 60 * 1000)); // 1 day = full score
    
    return (baseScore + uptimeScore) / 2;
  }

  private calculatePerformanceScore(agent: UEPAgentRegistration): number {
    // Calculate based on capabilities performance metrics
    if (agent.capabilities.length === 0) return 0.5;

    let totalPerformance = 0;
    for (const capability of agent.capabilities) {
      const performance = capability.performance;
      const latencyScore = Math.max(0, 1 - (performance.estimatedLatency / 1000)); // Lower latency = higher score
      const throughputScore = Math.min(1, performance.throughputPerSecond / 100); // Higher throughput = higher score
      
      totalPerformance += (latencyScore + throughputScore) / 2;
    }

    return totalPerformance / agent.capabilities.length;
  }

  // =============================================================================
  // Recommendations and Migration
  // =============================================================================

  private generateVersionRecommendations(
    analysis: UEPVersionAnalysis,
    matches: UEPVersionedAgentMatch[]
  ): UEPVersionRecommendation[] {
    const recommendations: UEPVersionRecommendation[] = [];

    // Upgrade recommendations
    if (analysis.migrationRequired) {
      recommendations.push({
        type: 'migrate',
        fromVersion: analysis.requestedVersion,
        toVersion: analysis.bestMatch,
        reason: 'Requested version not available, migration recommended',
        benefits: ['Better compatibility', 'Latest features', 'Security updates'],
        risks: ['Breaking changes possible', 'Testing required'],
        effort: 'medium',
        priority: 'high'
      });
    }

    // Deprecation warnings
    for (const deprecatedVersion of analysis.deprecatedVersions) {
      const usingDeprecated = matches.some(m => m.agent.version === deprecatedVersion);
      if (usingDeprecated) {
        recommendations.push({
          type: 'upgrade',
          fromVersion: deprecatedVersion,
          toVersion: analysis.compatibleVersions[0] || analysis.bestMatch,
          reason: 'Version is deprecated',
          benefits: ['Continued support', 'Security updates'],
          risks: ['Migration effort required'],
          effort: 'high',
          priority: 'critical'
        });
      }
    }

    return recommendations;
  }

  private generateMigrationSuggestions(
    query: UEPVersionedDiscoveryQuery,
    matches: UEPVersionedAgentMatch[]
  ): UEPMigrationSuggestion[] {
    const suggestions: UEPMigrationSuggestion[] = [];

    for (const match of matches) {
      if (match.requiredMigrations.length > 0) {
        for (const migration of match.requiredMigrations) {
          suggestions.push({
            capability: migration,
            fromVersion: query.targetVersion || 'current',
            toVersion: match.agent.version,
            migrationPath: 'automated-with-validation',
            automatedSteps: [
              'Update capability definitions',
              'Validate message formats',
              'Test compatibility'
            ],
            manualSteps: [
              'Review breaking changes',
              'Update integration tests',
              'Deploy with rollback plan'
            ],
            estimatedTime: 240, // 4 hours
            riskLevel: match.riskLevel
          });
        }
      }
    }

    return suggestions;
  }

  // =============================================================================
  // Capability Evolution Tracking
  // =============================================================================

  public trackCapabilityEvolution(capability: string, version: string, changes: string[]): void {
    let evolution = this.capabilityEvolution.get(capability);
    
    if (!evolution) {
      evolution = {
        capability,
        versionHistory: [],
        currentVersion: version,
        deprecatedVersions: [],
        supportedVersions: [version]
      };
      this.capabilityEvolution.set(capability, evolution);
    }

    // Add version to history
    evolution.versionHistory.push({
      version,
      changes,
      compatibility: this.determineCompatibilityLevel(changes),
      timestamp: new Date()
    });

    // Update current version
    if (semver.gt(version, evolution.currentVersion)) {
      evolution.currentVersion = version;
    }

    // Add to supported versions if not already present
    if (!evolution.supportedVersions.includes(version)) {
      evolution.supportedVersions.push(version);
      evolution.supportedVersions.sort(semver.rcompare);
    }

    this.metrics.capabilityEvolutionEvents.inc({
      capability,
      version
    });

    this.emit('capabilityEvolved', {
      capability,
      version,
      changes,
      timestamp: new Date()
    });
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private getVersionInfo(component: string, version: string): UEPVersionInfo {
    const key = `${component}:${version}`;
    let versionInfo = this.versionRegistry.get(key);
    
    if (!versionInfo) {
      // Create default version info
      const parsed = semver.parse(version) || semver.parse('1.0.0')!;
      versionInfo = {
        version,
        major: parsed.major,
        minor: parsed.minor,
        patch: parsed.patch,
        releaseDate: new Date(),
        stability: 'stable',
        compatibleWith: [],
        breakingChanges: []
      };
      this.versionRegistry.set(key, versionInfo);
    }
    
    return versionInfo;
  }

  private calculateCapabilityRelevance(capability: UEPAgentCapability, requested: string[]): number {
    let maxRelevance = 0;

    for (const req of requested) {
      let relevance = 0;

      // Exact name match
      if (capability.name === req) {
        relevance = 1.0;
      }
      // Name contains requested
      else if (capability.name.includes(req)) {
        relevance = 0.8;
      }
      // Tag match
      else if (capability.tags.includes(req)) {
        relevance = 0.6;
      }
      // Category match
      else if (capability.category === req) {
        relevance = 0.4;
      }
      // Fuzzy tag match
      else if (capability.tags.some(tag => tag.includes(req))) {
        relevance = 0.3;
      }

      maxRelevance = Math.max(maxRelevance, relevance);
    }

    return maxRelevance;
  }

  private determineMatchReason(agent: UEPAgentRegistration, query: UEPVersionedDiscoveryQuery): string {
    const reasons: string[] = [];

    if (query.targetVersion && agent.version === query.targetVersion) {
      reasons.push('Exact version match');
    } else if (query.versionRange && semver.satisfies(agent.version, query.versionRange)) {
      reasons.push('Version range match');
    }

    if (query.capabilities) {
      const matchingCaps = agent.capabilities.filter(cap => 
        query.capabilities!.some(req => cap.name.includes(req))
      );
      if (matchingCaps.length > 0) {
        reasons.push(`${matchingCaps.length} capability matches`);
      }
    }

    return reasons.join(', ') || 'General compatibility';
  }

  private identifyRequiredMigrations(agent: UEPAgentRegistration, query: UEPVersionedDiscoveryQuery): string[] {
    const migrations: string[] = [];

    if (query.targetVersion && agent.version !== query.targetVersion) {
      const versionInfo = this.getVersionInfo('uep-protocol', agent.version);
      if (versionInfo.breakingChanges.length > 0) {
        migrations.push(...versionInfo.breakingChanges);
      }
    }

    return migrations;
  }

  private assessRiskLevel(agent: UEPAgentRegistration, query: UEPVersionedDiscoveryQuery): 'low' | 'medium' | 'high' {
    const versionInfo = this.getVersionInfo('uep-protocol', agent.version);
    
    if (versionInfo.stability === 'deprecated' || versionInfo.stability === 'eol') {
      return 'high';
    }

    if (versionInfo.breakingChanges.length > 0) {
      return 'medium';
    }

    if (versionInfo.stability === 'alpha' || versionInfo.stability === 'beta') {
      return 'medium';
    }

    return 'low';
  }

  private calculateRiskLevel(
    requested: string,
    bestMatch: string,
    compatible: string[],
    deprecated: string[]
  ): 'low' | 'medium' | 'high' {
    if (deprecated.includes(bestMatch)) {
      return 'high';
    }

    if (requested !== bestMatch && requested !== 'latest') {
      return 'medium';
    }

    if (compatible.length === 0) {
      return 'high';
    }

    return 'low';
  }

  private determineCapabilityCompatibility(
    capability: UEPAgentCapability,
    query: UEPVersionedDiscoveryQuery
  ): 'exact' | 'compatible' | 'degraded' | 'incompatible' {
    if (!query.capabilityVersions || !query.capabilityVersions[capability.name]) {
      return 'compatible';
    }

    const requiredVersion = query.capabilityVersions[capability.name];
    
    if (capability.version === requiredVersion) {
      return 'exact';
    }

    if (semver.satisfies(capability.version, requiredVersion)) {
      return 'compatible';
    }

    if (semver.lt(capability.version, requiredVersion)) {
      return 'degraded';
    }

    return 'incompatible';
  }

  private isCapabilityMigrationRequired(capability: UEPAgentCapability, query: UEPVersionedDiscoveryQuery): boolean {
    if (!query.capabilityVersions || !query.capabilityVersions[capability.name]) {
      return false;
    }

    const requiredVersion = query.capabilityVersions[capability.name];
    return !semver.satisfies(capability.version, requiredVersion);
  }

  private findAlternativeCapabilityVersions(capability: UEPAgentCapability): string[] {
    const evolution = this.capabilityEvolution.get(capability.name);
    return evolution ? evolution.supportedVersions.filter(v => v !== capability.version) : [];
  }

  private determineCompatibilityLevel(changes: string[]): 'compatible' | 'breaking' | 'deprecated' {
    const breakingKeywords = ['breaking', 'removed', 'deprecated', 'incompatible'];
    const hasBreaking = changes.some(change => 
      breakingKeywords.some(keyword => change.toLowerCase().includes(keyword))
    );

    if (hasBreaking) {
      return changes.some(c => c.toLowerCase().includes('deprecated')) ? 'deprecated' : 'breaking';
    }

    return 'compatible';
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPVersioningMetrics {
    const prefix = 'uep_versioning_';

    return {
      versionDiscoveryRequests: new Counter({
        name: `${prefix}discovery_requests_total`,
        help: 'Total versioned discovery requests',
        labelNames: ['strategy', 'preference']
      }),

      versionMatchingLatency: new Histogram({
        name: `${prefix}matching_latency_seconds`,
        help: 'Version matching latency',
        labelNames: ['compatibility'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
      }),

      capabilityEvolutionEvents: new Counter({
        name: `${prefix}capability_evolution_events_total`,
        help: 'Capability evolution events',
        labelNames: ['capability', 'version']
      }),

      migrationRecommendations: new Counter({
        name: `${prefix}migration_recommendations_total`,
        help: 'Migration recommendations generated',
        labelNames: ['type', 'priority']
      }),

      compatibilityAnalysis: new Counter({
        name: `${prefix}compatibility_analysis_total`,
        help: 'Compatibility analyses performed',
        labelNames: ['result']
      }),

      versionDistribution: new Gauge({
        name: `${prefix}version_distribution`,
        help: 'Distribution of versions in use',
        labelNames: ['component', 'version', 'stability']
      }),

      deprecationWarnings: new Counter({
        name: `${prefix}deprecation_warnings_total`,
        help: 'Deprecation warnings issued',
        labelNames: ['component', 'version']
      })
    };
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getVersionInfo(component: string, version: string): UEPVersionInfo | undefined {
    return this.versionRegistry.get(`${component}:${version}`);
  }

  public getCapabilityEvolution(capability: string): UEPCapabilityEvolution | undefined {
    return this.capabilityEvolution.get(capability);
  }

  public getSupportedVersions(component: string): string[] {
    const versions: string[] = [];
    for (const [key, versionInfo] of this.versionRegistry) {
      if (key.startsWith(`${component}:`)) {
        versions.push(versionInfo.version);
      }
    }
    return versions.sort(semver.rcompare);
  }

  public clearCache(): void {
    this.versionAnalysisCache.clear();
  }

  // =============================================================================
  // Lifecycle Management
  // =============================================================================

  public async shutdown(): Promise<void> {
    this.clearCache();
    this.emit('shutdown');
  }
}

export default UEPVersioningManager;