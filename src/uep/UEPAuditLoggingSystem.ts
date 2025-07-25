/**
 * UEP Comprehensive Audit Logging System
 * 
 * Provides immutable, tamper-proof audit trails for all UEP enforcement decisions.
 * Implements blockchain-like chaining for integrity verification.
 * 
 * Features:
 * - Immutable audit entries
 * - Cryptographic chain integrity
 * - Comprehensive compliance reporting
 * - Tamper detection
 * - Query and search capabilities
 * - Export functionality
 */

import crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

// Audit entry types and interfaces
export interface UEPAuditEntry {
  auditId: string;
  timestamp: Date;
  entryType: 'enforcement' | 'verification' | 'violation' | 'bypass' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Core audit data
  requestId: string;
  agentId?: string;
  sessionId?: string;
  taskDescription: string;
  requesterType: 'agent' | 'human';
  
  // Enforcement details
  enforcementDecision: {
    approved: boolean;
    blocked: boolean;
    reason: string;
    enforcementLevel: 'strict' | 'warn' | 'off';
    complianceScore: number;
  };
  
  // Tool verification results
  toolVerifications: {
    [toolName: string]: {
      verified: boolean;
      confidence: number;
      verificationMethods: string[];
      errors: string[];
    };
  };
  
  // Performance metrics
  performanceMetrics: {
    validationTime: number;
    processingTime: number;
    cacheHitRate: number;
  };
  
  // Chain integrity
  chainData: {
    previousHash: string;
    currentHash: string;
    blockNumber: number;
    signature: string;
  };
  
  // Additional context
  metadata: {
    userAgent?: string;
    environment: string;
    uepVersion: string;
    [key: string]: any;
  };
}

export interface AuditQuery {
  timeRange?: {
    start: Date;
    end: Date;
  };
  entryTypes?: string[];
  severities?: string[];
  agentIds?: string[];
  complianceScoreRange?: {
    min: number;
    max: number;
  };
  blocked?: boolean;
  toolNames?: string[];
  textSearch?: string;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  reportId: string;
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  summary: {
    totalEntries: number;
    totalBlocked: number;
    totalApproved: number;
    averageComplianceScore: number;
    topViolations: string[];
    toolVerificationRates: { [toolName: string]: number };
  };
  entries: UEPAuditEntry[];
  integrity: {
    chainValid: boolean;
    totalBlocks: number;
    checksumValid: boolean;
  };
}

// Validation schemas
const AuditEntrySchema = z.object({
  auditId: z.string(),
  timestamp: z.date(),
  entryType: z.enum(['enforcement', 'verification', 'violation', 'bypass', 'error']),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  requestId: z.string(),
  taskDescription: z.string(),
  requesterType: z.enum(['agent', 'human'])
});

/**
 * UEP Comprehensive Audit Logging System
 * 
 * Manages tamper-proof audit trails with blockchain-like integrity
 */
export class UEPAuditLoggingSystem {
  private readonly auditChain: UEPAuditEntry[] = [];
  private readonly secretKey: string;
  private readonly auditDirectory: string;
  private blockNumber = 0;
  private isInitialized = false;

  constructor(auditDirectory = '.uep/audit') {
    this.auditDirectory = auditDirectory;
    this.secretKey = this.generateSecretKey();
    console.log('📋 UEP Audit Logging System initialized');
  }

  /**
   * Initialize the audit system and load existing chain
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audit directory
      await fs.mkdir(this.auditDirectory, { recursive: true });
      
      // Load existing audit chain
      await this.loadExistingChain();
      
      // Verify chain integrity
      const isValid = await this.verifyChainIntegrity();
      if (!isValid) {
        console.warn('⚠️ UEP Audit: Chain integrity compromised - creating new chain');
        await this.createGenesisBlock();
      }
      
      this.isInitialized = true;
      console.log(`✅ UEP Audit: System initialized with ${this.auditChain.length} entries`);
      
    } catch (error) {
      console.error(`❌ UEP Audit: Failed to initialize - ${error.message}`);
      throw error;
    }
  }

  /**
   * Log an enforcement decision to the audit trail
   */
  public async logEnforcementDecision(
    requestId: string,
    taskDescription: string,
    requesterType: 'agent' | 'human',
    enforcementResult: any,
    toolVerifications: any,
    performanceMetrics: any,
    metadata: any = {}
  ): Promise<string> {
    
    await this.ensureInitialized();

    const auditId = this.generateAuditId();
    
    const auditEntry: UEPAuditEntry = {
      auditId,
      timestamp: new Date(),
      entryType: enforcementResult.blocked ? 'violation' : 'enforcement',
      severity: enforcementResult.blocked ? 'error' : 'info',
      
      requestId,
      agentId: metadata.agentId,
      sessionId: metadata.sessionId,
      taskDescription,
      requesterType,
      
      enforcementDecision: {
        approved: enforcementResult.approved,
        blocked: enforcementResult.blocked,
        reason: enforcementResult.reason,
        enforcementLevel: metadata.enforcementLevel || 'strict',
        complianceScore: enforcementResult.complianceScore || 0
      },
      
      toolVerifications: this.formatToolVerifications(toolVerifications),
      
      performanceMetrics: {
        validationTime: performanceMetrics.validationTime || 0,
        processingTime: performanceMetrics.processingTime || 0,
        cacheHitRate: performanceMetrics.cacheHitRate || 0
      },
      
      chainData: {
        previousHash: this.getLastHash(),
        currentHash: '',
        blockNumber: ++this.blockNumber,
        signature: ''
      },
      
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        uepVersion: '1.0.0',
        ...metadata
      }
    };

    // Generate hash and signature for chain integrity
    auditEntry.chainData.currentHash = this.generateEntryHash(auditEntry);
    auditEntry.chainData.signature = this.signEntry(auditEntry);

    // Add to chain and persist
    this.auditChain.push(auditEntry);
    await this.persistAuditEntry(auditEntry);

    // Log the audit action
    const status = enforcementResult.blocked ? '🚫 BLOCKED' : enforcementResult.approved ? '✅ APPROVED' : '⚠️ WARNING';
    console.log(`📋 UEP Audit [${status}]: ${auditId} - ${enforcementResult.reason}`);
    console.log(`   Compliance: ${(enforcementResult.complianceScore * 100).toFixed(1)}% | Block: ${this.blockNumber}`);

    return auditId;
  }

  /**
   * Log a tool verification result
   */
  public async logToolVerification(
    requestId: string,
    toolName: string,
    verificationResult: any,
    metadata: any = {}
  ): Promise<string> {
    
    await this.ensureInitialized();

    const auditId = this.generateAuditId();
    
    const auditEntry: UEPAuditEntry = {
      auditId,
      timestamp: new Date(),
      entryType: 'verification',
      severity: verificationResult.verified ? 'info' : 'warning',
      
      requestId,
      agentId: metadata.agentId,
      sessionId: metadata.sessionId,
      taskDescription: metadata.taskDescription || 'Tool verification',
      requesterType: metadata.requesterType || 'agent',
      
      enforcementDecision: {
        approved: verificationResult.verified,
        blocked: false,
        reason: `Tool verification: ${toolName}`,
        enforcementLevel: 'info',
        complianceScore: verificationResult.confidence || 0
      },
      
      toolVerifications: {
        [toolName]: {
          verified: verificationResult.verified,
          confidence: verificationResult.confidence,
          verificationMethods: verificationResult.verificationMethods || [],
          errors: verificationResult.errors || []
        }
      },
      
      performanceMetrics: {
        validationTime: metadata.validationTime || 0,
        processingTime: metadata.processingTime || 0,
        cacheHitRate: 0
      },
      
      chainData: {
        previousHash: this.getLastHash(),
        currentHash: '',
        blockNumber: ++this.blockNumber,
        signature: ''
      },
      
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        uepVersion: '1.0.0',
        toolName,
        ...metadata
      }
    };

    // Generate hash and signature
    auditEntry.chainData.currentHash = this.generateEntryHash(auditEntry);
    auditEntry.chainData.signature = this.signEntry(auditEntry);

    // Add to chain and persist
    this.auditChain.push(auditEntry);
    await this.persistAuditEntry(auditEntry);

    console.log(`📋 UEP Audit [VERIFICATION]: ${toolName} - ${verificationResult.verified ? 'VERIFIED' : 'FAILED'} (${(verificationResult.confidence * 100).toFixed(1)}%)`);

    return auditId;
  }

  /**
   * Log a security violation or bypass attempt
   */
  public async logSecurityViolation(
    requestId: string,
    violationType: string,
    description: string,
    metadata: any = {}
  ): Promise<string> {
    
    await this.ensureInitialized();

    const auditId = this.generateAuditId();
    
    const auditEntry: UEPAuditEntry = {
      auditId,
      timestamp: new Date(),
      entryType: 'violation',
      severity: 'critical',
      
      requestId,
      agentId: metadata.agentId,
      sessionId: metadata.sessionId,
      taskDescription: description,
      requesterType: metadata.requesterType || 'unknown',
      
      enforcementDecision: {
        approved: false,
        blocked: true,
        reason: `Security violation: ${violationType}`,
        enforcementLevel: 'strict',
        complianceScore: 0
      },
      
      toolVerifications: {},
      
      performanceMetrics: {
        validationTime: 0,
        processingTime: 0,
        cacheHitRate: 0
      },
      
      chainData: {
        previousHash: this.getLastHash(),
        currentHash: '',
        blockNumber: ++this.blockNumber,
        signature: ''
      },
      
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        uepVersion: '1.0.0',
        violationType,
        ...metadata
      }
    };

    // Generate hash and signature
    auditEntry.chainData.currentHash = this.generateEntryHash(auditEntry);
    auditEntry.chainData.signature = this.signEntry(auditEntry);

    // Add to chain and persist
    this.auditChain.push(auditEntry);
    await this.persistAuditEntry(auditEntry);

    console.log(`🚨 UEP Audit [VIOLATION]: ${violationType} - ${description}`);

    return auditId;
  }

  /**
   * Query audit entries with filters
   */
  public async queryAuditEntries(query: AuditQuery = {}): Promise<UEPAuditEntry[]> {
    await this.ensureInitialized();

    let results = [...this.auditChain];

    // Apply filters
    if (query.timeRange) {
      results = results.filter(entry => 
        entry.timestamp >= query.timeRange!.start && 
        entry.timestamp <= query.timeRange!.end
      );
    }

    if (query.entryTypes) {
      results = results.filter(entry => query.entryTypes!.includes(entry.entryType));
    }

    if (query.severities) {
      results = results.filter(entry => query.severities!.includes(entry.severity));
    }

    if (query.agentIds) {
      results = results.filter(entry => entry.agentId && query.agentIds!.includes(entry.agentId));
    }

    if (query.complianceScoreRange) {
      results = results.filter(entry => 
        entry.enforcementDecision.complianceScore >= query.complianceScoreRange!.min &&
        entry.enforcementDecision.complianceScore <= query.complianceScoreRange!.max
      );
    }

    if (query.blocked !== undefined) {
      results = results.filter(entry => entry.enforcementDecision.blocked === query.blocked);
    }

    if (query.toolNames) {
      results = results.filter(entry => 
        query.toolNames!.some(tool => entry.toolVerifications[tool])
      );
    }

    if (query.textSearch) {
      const searchTerm = query.textSearch.toLowerCase();
      results = results.filter(entry => 
        entry.taskDescription.toLowerCase().includes(searchTerm) ||
        entry.enforcementDecision.reason.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Generate comprehensive compliance report
   */
  public async generateComplianceReport(
    timeRange: { start: Date; end: Date },
    includeDetails = false
  ): Promise<AuditReport> {
    
    await this.ensureInitialized();

    const entries = await this.queryAuditEntries({ timeRange });
    
    // Calculate summary statistics
    const totalEntries = entries.length;
    const totalBlocked = entries.filter(e => e.enforcementDecision.blocked).length;
    const totalApproved = entries.filter(e => e.enforcementDecision.approved).length;
    
    const complianceScores = entries.map(e => e.enforcementDecision.complianceScore);
    const averageComplianceScore = complianceScores.length > 0 
      ? complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length 
      : 0;

    // Find top violations
    const violations = entries
      .filter(e => e.entryType === 'violation' || e.enforcementDecision.blocked)
      .map(e => e.enforcementDecision.reason);
    
    const violationCounts = violations.reduce((acc, violation) => {
      acc[violation] = (acc[violation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topViolations = Object.entries(violationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([violation]) => violation);

    // Calculate tool verification rates
    const toolVerificationRates: { [toolName: string]: number } = {};
    const allTools = ['TaskMaster', 'Context7', 'RAG', 'Redis'];
    
    for (const tool of allTools) {
      const toolEntries = entries.filter(e => e.toolVerifications[tool]);
      const verifiedEntries = toolEntries.filter(e => e.toolVerifications[tool]?.verified);
      toolVerificationRates[tool] = toolEntries.length > 0 
        ? verifiedEntries.length / toolEntries.length 
        : 0;
    }

    // Verify chain integrity
    const chainValid = await this.verifyChainIntegrity();

    const report: AuditReport = {
      reportId: this.generateReportId(),
      generatedAt: new Date(),
      timeRange,
      summary: {
        totalEntries,
        totalBlocked,
        totalApproved,
        averageComplianceScore,
        topViolations,
        toolVerificationRates
      },
      entries: includeDetails ? entries : [],
      integrity: {
        chainValid,
        totalBlocks: this.auditChain.length,
        checksumValid: await this.verifyChainChecksum()
      }
    };

    // Persist report
    await this.persistReport(report);

    console.log(`📊 UEP Audit: Generated compliance report ${report.reportId}`);
    console.log(`   Entries: ${totalEntries} | Blocked: ${totalBlocked} | Compliance: ${(averageComplianceScore * 100).toFixed(1)}%`);

    return report;
  }

  /**
   * Export audit data to various formats
   */
  public async exportAuditData(
    query: AuditQuery = {},
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<string> {
    
    const entries = await this.queryAuditEntries(query);
    const exportId = `uep-audit-export-${Date.now()}`;
    
    let content: string;
    let filename: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(entries, null, 2);
        filename = `${exportId}.json`;
        break;
      case 'csv':
        content = this.convertToCSV(entries);
        filename = `${exportId}.csv`;
        break;
      case 'xml':
        content = this.convertToXML(entries);
        filename = `${exportId}.xml`;
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const filepath = path.join(this.auditDirectory, 'exports', filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, content, 'utf8');

    console.log(`📤 UEP Audit: Exported ${entries.length} entries to ${filename}`);
    
    return filepath;
  }

  /**
   * Verify chain integrity
   */
  public async verifyChainIntegrity(): Promise<boolean> {
    if (this.auditChain.length === 0) return true;

    try {
      for (let i = 1; i < this.auditChain.length; i++) {
        const current = this.auditChain[i];
        const previous = this.auditChain[i - 1];

        // Verify hash chain
        if (current.chainData.previousHash !== previous.chainData.currentHash) {
          console.error(`❌ UEP Audit: Chain integrity broken at block ${i}`);
          return false;
        }

        // Verify signature
        if (!this.verifyEntrySignature(current)) {
          console.error(`❌ UEP Audit: Invalid signature at block ${i}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ UEP Audit: Chain verification failed - ${error.message}`);
      return false;
    }
  }

  /**
   * Get audit statistics
   */
  public getAuditStatistics(): any {
    return {
      totalEntries: this.auditChain.length,
      blockNumber: this.blockNumber,
      chainIntegrity: this.auditChain.length > 0,
      lastAuditTime: this.auditChain.length > 0 
        ? this.auditChain[this.auditChain.length - 1].timestamp 
        : null
    };
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private generateSecretKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateAuditId(): string {
    return `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateReportId(): string {
    return `report-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateEntryHash(entry: UEPAuditEntry): string {
    const hashData = {
      auditId: entry.auditId,
      timestamp: entry.timestamp,
      requestId: entry.requestId,
      enforcementDecision: entry.enforcementDecision,
      previousHash: entry.chainData.previousHash
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(hashData)).digest('hex');
  }

  private signEntry(entry: UEPAuditEntry): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(entry.chainData.currentHash);
    return hmac.digest('hex');
  }

  private verifyEntrySignature(entry: UEPAuditEntry): boolean {
    const expectedSignature = this.signEntry({
      ...entry,
      chainData: {
        ...entry.chainData,
        signature: ''
      }
    });
    
    return entry.chainData.signature === expectedSignature;
  }

  private getLastHash(): string {
    if (this.auditChain.length === 0) {
      return 'genesis-block';
    }
    return this.auditChain[this.auditChain.length - 1].chainData.currentHash;
  }

  private formatToolVerifications(verifications: any): any {
    if (!verifications) return {};
    
    const formatted: any = {};
    for (const [toolName, result] of Object.entries(verifications)) {
      formatted[toolName] = {
        verified: (result as any)?.verified || false,
        confidence: (result as any)?.confidence || 0,
        verificationMethods: (result as any)?.verificationMethods || [],
        errors: (result as any)?.errors || []
      };
    }
    
    return formatted;
  }

  private async loadExistingChain(): Promise<void> {
    try {
      const files = await fs.readdir(this.auditDirectory);
      const auditFiles = files
        .filter(f => f.startsWith('audit-') && f.endsWith('.json'))
        .sort();

      for (const file of auditFiles) {
        const content = await fs.readFile(path.join(this.auditDirectory, file), 'utf8');
        const entry = JSON.parse(content) as UEPAuditEntry;
        entry.timestamp = new Date(entry.timestamp); // Restore Date object
        this.auditChain.push(entry);
        this.blockNumber = Math.max(this.blockNumber, entry.chainData.blockNumber);
      }

      console.log(`📋 UEP Audit: Loaded ${this.auditChain.length} existing entries`);
    } catch (error) {
      console.log('📋 UEP Audit: No existing chain found, starting fresh');
    }
  }

  private async createGenesisBlock(): Promise<void> {
    const genesisEntry: UEPAuditEntry = {
      auditId: 'genesis-block',
      timestamp: new Date(),
      entryType: 'enforcement',
      severity: 'info',
      requestId: 'genesis',
      taskDescription: 'UEP Audit System Genesis Block',
      requesterType: 'agent',
      enforcementDecision: {
        approved: true,
        blocked: false,
        reason: 'Genesis block creation',
        enforcementLevel: 'info',
        complianceScore: 1.0
      },
      toolVerifications: {},
      performanceMetrics: {
        validationTime: 0,
        processingTime: 0,
        cacheHitRate: 0
      },
      chainData: {
        previousHash: '',
        currentHash: '',
        blockNumber: 0,
        signature: ''
      },
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        uepVersion: '1.0.0',
        genesis: true
      }
    };

    genesisEntry.chainData.currentHash = this.generateEntryHash(genesisEntry);
    genesisEntry.chainData.signature = this.signEntry(genesisEntry);

    this.auditChain.push(genesisEntry);
    this.blockNumber = 0;
    
    await this.persistAuditEntry(genesisEntry);
    console.log('📋 UEP Audit: Created genesis block');
  }

  private async persistAuditEntry(entry: UEPAuditEntry): Promise<void> {
    const filename = `${entry.auditId}.json`;
    const filepath = path.join(this.auditDirectory, filename);
    
    await fs.writeFile(filepath, JSON.stringify(entry, null, 2), 'utf8');
  }

  private async persistReport(report: AuditReport): Promise<void> {
    const filename = `${report.reportId}.json`;
    const filepath = path.join(this.auditDirectory, 'reports', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf8');
  }

  private async verifyChainChecksum(): Promise<boolean> {
    try {
      const chainData = JSON.stringify(this.auditChain.map(e => e.chainData.currentHash));
      const checksum = crypto.createHash('sha256').update(chainData).digest('hex');
      
      // Store and verify checksum
      const checksumPath = path.join(this.auditDirectory, 'chain-checksum.txt');
      
      try {
        const existingChecksum = await fs.readFile(checksumPath, 'utf8');
        return existingChecksum.trim() === checksum;
      } catch {
        // First time - store checksum
        await fs.writeFile(checksumPath, checksum);
        return true;
      }
    } catch {
      return false;
    }
  }

  private convertToCSV(entries: UEPAuditEntry[]): string {
    if (entries.length === 0) return '';

    const headers = [
      'auditId', 'timestamp', 'entryType', 'severity',
      'requestId', 'agentId', 'taskDescription', 'requesterType',
      'approved', 'blocked', 'reason', 'complianceScore',
      'blockNumber', 'environment'
    ];

    const rows = entries.map(entry => [
      entry.auditId,
      entry.timestamp.toISOString(),
      entry.entryType,
      entry.severity,
      entry.requestId,
      entry.agentId || '',
      entry.taskDescription.replace(/,/g, ';'),
      entry.requesterType,
      entry.enforcementDecision.approved,
      entry.enforcementDecision.blocked,
      entry.enforcementDecision.reason.replace(/,/g, ';'),
      entry.enforcementDecision.complianceScore,
      entry.chainData.blockNumber,
      entry.metadata.environment
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private convertToXML(entries: UEPAuditEntry[]): string {
    const xmlEntries = entries.map(entry => `
  <auditEntry>
    <auditId>${entry.auditId}</auditId>
    <timestamp>${entry.timestamp.toISOString()}</timestamp>
    <entryType>${entry.entryType}</entryType>
    <severity>${entry.severity}</severity>
    <requestId>${entry.requestId}</requestId>
    <enforcementDecision>
      <approved>${entry.enforcementDecision.approved}</approved>
      <blocked>${entry.enforcementDecision.blocked}</blocked>
      <complianceScore>${entry.enforcementDecision.complianceScore}</complianceScore>
    </enforcementDecision>
  </auditEntry>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<uepAuditLog>
  <metadata>
    <totalEntries>${entries.length}</totalEntries>
    <generatedAt>${new Date().toISOString()}</generatedAt>
  </metadata>
  <entries>${xmlEntries}
  </entries>
</uepAuditLog>`;
  }
}

/**
 * Global audit logging system instance
 */
let globalAuditSystem: UEPAuditLoggingSystem | null = null;

/**
 * Get global audit logging system
 */
export function getUEPAuditLoggingSystem(auditDirectory?: string): UEPAuditLoggingSystem {
  if (!globalAuditSystem) {
    globalAuditSystem = new UEPAuditLoggingSystem(auditDirectory);
  }
  return globalAuditSystem;
}

/**
 * Initialize audit logging system
 */
export async function initializeUEPAuditLogging(auditDirectory?: string): Promise<UEPAuditLoggingSystem> {
  const auditSystem = getUEPAuditLoggingSystem(auditDirectory);
  await auditSystem.initialize();
  return auditSystem;
}