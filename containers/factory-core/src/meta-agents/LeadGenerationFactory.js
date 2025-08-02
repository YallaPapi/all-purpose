#!/usr/bin/env node

/**
 * Lead Generation Factory
 * 
 * Specialized factory for creating and managing lead generation agents.
 * Inherits from UEP Meta-Agent Factory to leverage core functionality
 * while providing specialized lead generation capabilities.
 * 
 * Features:
 * - Inherits from UEPMetaAgentFactory for core agent management
 * - Specialized for 6 lead generation agent types
 * - Enhanced prospect database integration
 * - Multi-channel outreach coordination
 * - Performance monitoring for lead generation metrics
 * - Compliance management across all channels
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import path from 'path';
import { EventEmitter } from 'events';
import { Command } from 'commander';
import { UEPMetaAgentFactory } from './UEPMetaAgentFactory.js';

/**
 * Lead Generation Factory Configuration
 * Extends the base UEP Meta-Agent Factory configuration
 */
const LEAD_GEN_FACTORY_CONFIG = {
  // Inherit from base factory configuration
  
  // Lead Generation specific configuration
  enableProspectDatabase: true,
  enableMultiChannelCoordination: true,
  enableComplianceTracking: true,
  enableDeliverabilityMonitoring: true,
  
  // Performance targets for lead generation
  targetResponseTime: 1500, // 1.5 seconds for inter-agent communication
  maxDailyOutreach: 10000, // Maximum daily outreach volume
  minDeliverabilityRate: 0.85, // 85% minimum deliverability
  
  // Specialized directories for lead generation
  prospectDatabasePath: path.join(process.cwd(), 'data/prospects'),
  templateDirectory: path.join(process.cwd(), 'templates/outreach'),
  complianceDirectory: path.join(process.cwd(), 'compliance'),
  
  // Agent-specific defaults for lead generation agents
  agentDefaults: {
    'stealth-outreach': {
      maxDailyVolume: 1000,
      enableDomainRotation: true,
      enableAntiDetection: true,
      channels: ['email', 'linkedin', 'twitter', 'sms']
    },
    'intelligence-gathering': {
      refreshInterval: 86400000, // 24 hours
      enableRealTimeUpdates: true,
      dataSources: ['linkedin', 'crunchbase', 'builtwith', 'news'],
      cacheTimeout: 3600000 // 1 hour
    },
    'personalization-engine': {
      aiModel: 'gpt-4',
      variationTarget: 0.95, // 95% unique variations
      enableContextualPersonalization: true,
      maxTokensPerMessage: 500
    },
    'psychology-mapping': {
      enableRoleDetection: true,
      enableUrgencyAnalysis: true,
      psychProfileDatabase: 'psychology-profiles.json'
    },
    'conversion-optimization': {
      enableResponseTriage: true,
      enableAutoScheduling: true,
      meetingBufferMinutes: 15,
      followUpDelayHours: 24
    },
    'compliance-manager': {
      jurisdictions: ['CAN-SPAM', 'GDPR', 'CASL'],
      enableRealTimeValidation: true,
      auditRetentionDays: 365,
      suppressionListPath: 'suppression-lists.json'
    }
  }
};

/**
 * Prospect Database Schema Definition
 */
const PROSPECT_SCHEMA = {
  // Core contact information
  contactInfo: {
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true },
    phone: { type: 'string', required: false },
    linkedinUrl: { type: 'string', required: false },
    twitterHandle: { type: 'string', required: false }
  },
  
  // Company information
  company: {
    name: { type: 'string', required: true },
    domain: { type: 'string', required: false },
    industry: { type: 'string', required: false },
    size: { type: 'string', required: false },
    revenue: { type: 'string', required: false },
    location: { type: 'string', required: false }
  },
  
  // Role and decision-making information
  role: {
    title: { type: 'string', required: true },
    department: { type: 'string', required: false },
    seniority: { type: 'string', required: false },
    decisionMakingPower: { type: 'string', required: false }
  },
  
  // Enrichment data
  enrichment: {
    technicalStack: { type: 'array', default: [] },
    companyNews: { type: 'array', default: [] },
    growthSignals: { type: 'array', default: [] },
    socialActivity: { type: 'object', default: {} },
    psychologyProfile: { type: 'object', default: {} }
  },
  
  // Interaction history
  interactions: {
    channels: { type: 'array', default: [] },
    touchpoints: { type: 'array', default: [] },
    responses: { type: 'array', default: [] },
    meetings: { type: 'array', default: [] },
    status: { type: 'string', default: 'new' }
  },
  
  // Compliance and tracking
  compliance: {
    optInStatus: { type: 'boolean', default: false },
    optOutDate: { type: 'date', default: null },
    suppressionLists: { type: 'array', default: [] },
    jurisdiction: { type: 'string', required: true }
  },
  
  // Metadata
  metadata: {
    createdAt: { type: 'date', default: Date.now },
    updatedAt: { type: 'date', default: Date.now },
    lastEnrichment: { type: 'date', default: null },
    priority: { type: 'string', default: 'medium' },
    score: { type: 'number', default: 0 }
  }
};

/**
 * Lead Generation Factory Implementation
 * Inherits from UEPMetaAgentFactory and extends with lead generation capabilities
 */
class LeadGenerationFactory extends UEPMetaAgentFactory {
  constructor(config = {}) {
    // Merge lead generation config with base factory config
    const mergedConfig = {
      ...LEAD_GEN_FACTORY_CONFIG,
      ...config,
      // Merge agent defaults
      agentDefaults: {
        ...LEAD_GEN_FACTORY_CONFIG.agentDefaults,
        ...(config.agentDefaults || {})
      }
    };
    
    super(mergedConfig);
    
    // Lead generation specific properties
    this.prospectDatabase = new Map();
    this.channelCoordinator = null;
    this.complianceManager = null;
    this.performanceMetrics = {
      totalProspects: 0,
      dailyOutreach: 0,
      deliverabilityRate: 0,
      responseRate: 0,
      meetingBookings: 0,
      conversions: 0
    };
    
    // Bind lead generation specific methods
    this.createLeadGenAgent = this.createLeadGenAgent.bind(this);
    this.addProspect = this.addProspect.bind(this);
    this.getProspect = this.getProspect.bind(this);
    this.updateProspectStatus = this.updateProspectStatus.bind(this);
  }
  
  /**
   * Initialize the Lead Generation Factory
   * Extends the base factory initialization
   */
  async initialize() {
    try {
      console.log('🏭 Initializing Lead Generation Factory...');
      
      // Initialize the base UEP Meta-Agent Factory
      await super.initialize();
      
      // Initialize lead generation specific components
      await this.initializeProspectDatabase();
      await this.initializeChannelCoordinator();
      await this.initializeComplianceManager();
      
      console.log('✅ Lead Generation Factory initialized successfully');
      console.log(`   - Prospect Database: ${this.config.enableProspectDatabase ? 'Enabled' : 'Disabled'}`);
      console.log(`   - Multi-Channel Coordination: ${this.config.enableMultiChannelCoordination ? 'Enabled' : 'Disabled'}`);
      console.log(`   - Compliance Tracking: ${this.config.enableComplianceTracking ? 'Enabled' : 'Disabled'}`);
      console.log(`   - Target Response Time: ${this.config.targetResponseTime}ms`);
      
      this.emit('leadgen:factory:initialized', {
        timestamp: new Date().toISOString(),
        config: this.config,
        prospectSchema: PROSPECT_SCHEMA
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Lead Generation Factory:', error.message);
      throw error;
    }
  }
  
  /**
   * Create a specialized lead generation agent
   * Extends the base createAgent method with lead generation specific logic
   */
  async createLeadGenAgent(agentType, agentId, agentConfig = {}) {
    // Validate agent type for lead generation
    const validAgentTypes = [
      'stealth-outreach',
      'intelligence-gathering', 
      'personalization-engine',
      'psychology-mapping',
      'conversion-optimization',
      'compliance-manager'
    ];
    
    if (!validAgentTypes.includes(agentType)) {
      throw new Error(`Invalid lead generation agent type: ${agentType}. Valid types: ${validAgentTypes.join(', ')}`);
    }
    
    try {
      console.log(`🎯 Creating lead generation agent: ${agentType} (${agentId})`);
      
      // Add lead generation specific configuration
      const leadGenConfig = {
        ...agentConfig,
        // Add prospect database access
        prospectDatabase: this.prospectDatabase,
        prospectSchema: PROSPECT_SCHEMA,
        // Add performance tracking
        performanceMetrics: this.performanceMetrics,
        // Add compliance requirements
        complianceManager: this.complianceManager,
        // Lead generation factory reference
        leadGenFactory: this
      };
      
      // Create the agent using the base factory method
      const agent = await this.createAgent(agentType, agentId, leadGenConfig);
      
      // Set up lead generation specific event forwarding
      this.setupLeadGenEventForwarding(agent, agentId, agentType);
      
      console.log(`✅ Created lead generation agent: ${agentType} (${agentId})`);
      
      this.emit('leadgen:agent:created', {
        agentId,
        agentType,
        timestamp: new Date().toISOString(),
        leadGenConfig
      });
      
      return agent;
      
    } catch (error) {
      console.error(`❌ Failed to create lead generation agent ${agentType} (${agentId}):`, error.message);
      throw error;
    }
  }
  
  /**
   * Initialize the prospect database
   */
  async initializeProspectDatabase() {
    if (!this.config.enableProspectDatabase) {
      return;
    }
    
    console.log('📊 Initializing prospect database...');
    
    // Initialize prospect database with schema validation
    this.prospectDatabase = new Map();
    
    // Set up database event handlers
    this.on('prospect:added', this.handleProspectAdded.bind(this));
    this.on('prospect:updated', this.handleProspectUpdated.bind(this));
    this.on('prospect:interaction', this.handleProspectInteraction.bind(this));
    
    console.log('✅ Prospect database initialized');
  }
  
  /**
   * Initialize multi-channel coordinator
   */
  async initializeChannelCoordinator() {
    if (!this.config.enableMultiChannelCoordination) {
      return;
    }
    
    console.log('📡 Initializing channel coordinator...');
    
    this.channelCoordinator = {
      activeChannels: new Set(),
      channelLimits: new Map(),
      messageQueue: [],
      scheduledMessages: []
    };
    
    console.log('✅ Channel coordinator initialized');
  }
  
  /**
   * Initialize compliance manager
   */
  async initializeComplianceManager() {
    if (!this.config.enableComplianceTracking) {
      return;
    }
    
    console.log('⚖️ Initializing compliance manager...');
    
    this.complianceManager = {
      rules: new Map(),
      suppressionLists: new Map(),
      auditLog: [],
      validationCache: new Map()
    };
    
    console.log('✅ Compliance manager initialized');
  }
  
  /**
   * Add a prospect to the database
   */
  addProspect(prospectData) {
    const prospectId = `prospect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate prospect data against schema
    const validatedProspect = this.validateProspectData(prospectData);
    
    // Add metadata
    validatedProspect.metadata = {
      ...validatedProspect.metadata,
      id: prospectId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store in database
    this.prospectDatabase.set(prospectId, validatedProspect);
    this.performanceMetrics.totalProspects++;
    
    this.emit('prospect:added', {
      prospectId,
      prospect: validatedProspect,
      timestamp: new Date().toISOString()
    });
    
    return prospectId;
  }
  
  /**
   * Get a prospect from the database
   */
  getProspect(prospectId) {
    return this.prospectDatabase.get(prospectId);
  }
  
  /**
   * Update prospect status
   */
  updateProspectStatus(prospectId, status, metadata = {}) {
    const prospect = this.prospectDatabase.get(prospectId);
    if (!prospect) {
      throw new Error(`Prospect not found: ${prospectId}`);
    }
    
    prospect.interactions.status = status;
    prospect.metadata.updatedAt = new Date();
    
    // Add any additional metadata
    Object.assign(prospect.metadata, metadata);
    
    this.prospectDatabase.set(prospectId, prospect);
    
    this.emit('prospect:updated', {
      prospectId,
      status,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Validate prospect data against schema
   */
  validateProspectData(prospectData) {
    // Basic validation - in production, use a proper schema validator
    const validated = {
      contactInfo: {},
      company: {},
      role: {},
      enrichment: {
        technicalStack: [],
        companyNews: [],
        growthSignals: [],
        socialActivity: {},
        psychologyProfile: {}
      },
      interactions: {
        channels: [],
        touchpoints: [],
        responses: [],
        meetings: [],
        status: 'new'
      },
      compliance: {
        optInStatus: false,
        optOutDate: null,
        suppressionLists: [],
        jurisdiction: 'CAN-SPAM'
      },
      metadata: {
        priority: 'medium',
        score: 0
      }
    };
    
    // Copy and validate required fields
    if (prospectData.contactInfo) {
      if (!prospectData.contactInfo.firstName || !prospectData.contactInfo.lastName || !prospectData.contactInfo.email) {
        throw new Error('Missing required contact information: firstName, lastName, email');
      }
      Object.assign(validated.contactInfo, prospectData.contactInfo);
    }
    
    if (prospectData.company) {
      if (!prospectData.company.name) {
        throw new Error('Missing required company name');
      }
      Object.assign(validated.company, prospectData.company);
    }
    
    if (prospectData.role) {
      if (!prospectData.role.title) {
        throw new Error('Missing required role title');
      }
      Object.assign(validated.role, prospectData.role);
    }
    
    // Copy optional data
    if (prospectData.enrichment) {
      Object.assign(validated.enrichment, prospectData.enrichment);
    }
    
    if (prospectData.compliance) {
      Object.assign(validated.compliance, prospectData.compliance);
    }
    
    if (prospectData.metadata) {
      Object.assign(validated.metadata, prospectData.metadata);
    }
    
    return validated;
  }
  
  /**
   * Set up lead generation specific event forwarding
   */
  setupLeadGenEventForwarding(agent, agentId, agentType) {
    if (agent.on && typeof agent.on === 'function') {
      // Lead generation specific events to forward
      const leadGenEvents = [
        'outreach:sent', 'outreach:delivered', 'outreach:opened', 'outreach:clicked',
        'prospect:enriched', 'prospect:scored', 'prospect:qualified',
        'response:received', 'meeting:scheduled', 'meeting:attended',
        'compliance:violation', 'deliverability:issue',
        'intelligence:gathered', 'personalization:generated',
        'psychology:profiled', 'conversion:optimized'
      ];
      
      leadGenEvents.forEach(eventName => {
        agent.on(eventName, (data) => {
          this.emit(`leadgen:${eventName}`, {
            ...data,
            agentId,
            agentType,
            timestamp: new Date().toISOString()
          });
        });
      });
    }
  }
  
  /**
   * Handle prospect added event
   */
  handleProspectAdded(data) {
    console.log(`👤 New prospect added: ${data.prospectId}`);
    // Additional logic for new prospects
  }
  
  /**
   * Handle prospect updated event
   */
  handleProspectUpdated(data) {
    console.log(`👤 Prospect updated: ${data.prospectId} -> ${data.status}`);
    // Additional logic for prospect updates
  }
  
  /**
   * Handle prospect interaction event
   */
  handleProspectInteraction(data) {
    console.log(`👤 Prospect interaction: ${data.prospectId} -> ${data.interactionType}`);
    // Update interaction history and analytics
  }
  
  /**
   * Get lead generation factory statistics
   * Extends the base factory statistics
   */
  getLeadGenStatistics() {
    const baseStats = this.getStatistics();
    
    return {
      ...baseStats,
      leadGeneration: {
        totalProspects: this.performanceMetrics.totalProspects,
        dailyOutreach: this.performanceMetrics.dailyOutreach,
        deliverabilityRate: this.performanceMetrics.deliverabilityRate,
        responseRate: this.performanceMetrics.responseRate,
        meetingBookings: this.performanceMetrics.meetingBookings,
        conversions: this.performanceMetrics.conversions
      },
      prospectDatabase: {
        totalRecords: this.prospectDatabase.size,
        schema: PROSPECT_SCHEMA
      },
      channels: this.channelCoordinator ? {
        active: Array.from(this.channelCoordinator.activeChannels),
        queueSize: this.channelCoordinator.messageQueue.length
      } : null,
      compliance: this.complianceManager ? {
        activeRules: this.complianceManager.rules.size,
        suppressionLists: this.complianceManager.suppressionLists.size,
        auditEntries: this.complianceManager.auditLog.length
      } : null
    };
  }
  
  /**
   * Cleanup lead generation factory
   * Extends the base factory cleanup
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up Lead Generation Factory...');
      
      // Clear prospect database
      if (this.prospectDatabase) {
        this.prospectDatabase.clear();
      }
      
      // Clear channel coordinator
      if (this.channelCoordinator) {
        this.channelCoordinator.messageQueue = [];
        this.channelCoordinator.scheduledMessages = [];
      }
      
      // Clear compliance manager
      if (this.complianceManager) {
        this.complianceManager.auditLog = [];
      }
      
      // Call base factory cleanup
      await super.cleanup();
      
      console.log('✅ Lead Generation Factory cleanup completed');
      
    } catch (error) {
      console.error('❌ Lead Generation Factory cleanup failed:', error.message);
      throw error;
    }
  }
}

/**
 * Factory function for creating Lead Generation Factory
 */
async function createLeadGenerationFactory(config = {}) {
  const factory = new LeadGenerationFactory(config);
  await factory.initialize();
  return factory;
}

/**
 * CLI interface for lead generation factory management
 */
function runLeadGenFactoryCLI() {
  const program = new Command();
  
  program
    .name('lead-generation-factory')
    .description('Lead Generation Factory CLI')
    .version('1.0.0');
  
  program
    .command('start')
    .description('Start the Lead Generation Factory')
    .option('-c, --config <file>', 'Configuration file')
    .option('--log-level <level>', 'Log level (silent, minimal, verbose, debug)', 'minimal')
    .option('--max-outreach <number>', 'Maximum daily outreach volume', '10000')
    .action(async (options) => {
      try {
        const config = {
          logLevel: options.logLevel,
          maxDailyOutreach: parseInt(options.maxOutreach)
        };
        
        const factory = await createLeadGenerationFactory(config);
        
        console.log('🎯 Lead Generation Factory is running');
        console.log('Press Ctrl+C to shutdown gracefully');
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n🛑 Shutting down Lead Generation Factory...');
          await factory.cleanup();
          process.exit(0);
        });
        
        // Keep process alive
        setInterval(() => {}, 1000);
        
      } catch (error) {
        console.error('❌ Failed to start Lead Generation Factory:', error.message);
        process.exit(1);
      }
    });
  
  return program;
}

// Export for usage
export {
  LeadGenerationFactory,
  createLeadGenerationFactory,
  runLeadGenFactoryCLI,
  LEAD_GEN_FACTORY_CONFIG,
  PROSPECT_SCHEMA
};

// Execute CLI if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLeadGenFactoryCLI().then(program => program.parse()).catch(error => {
    console.error('CLI failed:', error);
    process.exit(1);
  });
}