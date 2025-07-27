/**
 * Cache Invalidation System
 * 
 * Task 44: File-based and semantic cache invalidation with intelligent pattern matching
 * Watches file changes and invalidates related cache entries across all layers
 */

import chokidar from 'chokidar';
import { CacheManager } from './CacheManager';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';
import { minimatch } from 'minimatch';
import path from 'path';
import fs from 'fs/promises';

export interface InvalidationConfig {
  watchPatterns: string[];
  ignorePatterns: string[];
  debounceMs: number;
  enableSemanticInvalidation: boolean;
  similarityThreshold: number;
  maxInvalidationBatch: number;
  persistInvalidationLog: boolean;
  logPath?: string;
}

export interface InvalidationEvent {
  id: string;
  timestamp: number;
  type: 'file-change' | 'file-delete' | 'pattern' | 'manual' | 'semantic';
  filePath?: string;
  pattern?: string;
  reason: string;
  invalidatedKeys: string[];
  affectedCacheLayers: string[];
}

export interface InvalidationStats {
  totalEvents: number;
  fileChangeEvents: number;
  patternEvents: number;
  manualEvents: number;
  semanticEvents: number;
  totalKeysInvalidated: number;
  averageKeysPerEvent: number;
  lastEventTime?: number;
}

/**
 * Intelligent cache invalidation system with file watching and semantic matching
 */
export class CacheInvalidator {
  private config: InvalidationConfig;
  private cacheManager: CacheManager;
  private watcher?: chokidar.FSWatcher;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private stats: InvalidationStats;
  private eventLog: InvalidationEvent[] = [];
  private readonly maxLogSize = 1000;

  constructor(cacheManager: CacheManager, config: Partial<InvalidationConfig> = {}) {
    this.cacheManager = cacheManager;
    this.config = {
      watchPatterns: ['**/*.{ts,js,md,json,txt,py,yaml,yml}'],
      ignorePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/logs/**',
        '**/.rag-cache/**'
      ],
      debounceMs: 1000,
      enableSemanticInvalidation: true,
      similarityThreshold: 0.7,
      maxInvalidationBatch: 100,
      persistInvalidationLog: true,
      logPath: path.join(process.cwd(), 'rag-system', 'logs', 'cache-invalidation.log'),
      ...config
    };

    this.stats = {
      totalEvents: 0,
      fileChangeEvents: 0,
      patternEvents: 0,
      manualEvents: 0,
      semanticEvents: 0,
      totalKeysInvalidated: 0,
      averageKeysPerEvent: 0
    };

    logger.info('Cache invalidation system initialized', {
      watchPatterns: this.config.watchPatterns,
      ignorePatterns: this.config.ignorePatterns,
      semanticInvalidation: this.config.enableSemanticInvalidation
    });
  }

  /**
   * Start watching files for changes
   */
  async startWatching(basePath = process.cwd()): Promise<void> {
    try {
      if (this.watcher) {
        await this.stopWatching();
      }

      // Load existing invalidation log if it exists
      await this.loadInvalidationLog();

      logger.info('Starting file watcher for cache invalidation', {
        basePath,
        patterns: this.config.watchPatterns
      });

      this.watcher = chokidar.watch(this.config.watchPatterns, {
        ignored: this.config.ignorePatterns,
        ignoreInitial: true,
        persistent: true,
        cwd: basePath,
        awaitWriteFinish: {
          stabilityThreshold: this.config.debounceMs / 2,
          pollInterval: 100
        }
      });

      // Set up event handlers
      this.watcher.on('change', (filePath) => {
        this.handleFileChange(filePath, 'change');
      });

      this.watcher.on('unlink', (filePath) => {
        this.handleFileChange(filePath, 'delete');
      });

      this.watcher.on('add', (filePath) => {
        this.handleFileChange(filePath, 'add');
      });

      this.watcher.on('error', (error) => {
        logger.error('File watcher error', {
          error: error instanceof Error ? error.message : String(error)
        });
      });

      this.watcher.on('ready', () => {
        logger.info('File watcher ready for cache invalidation');
      });

    } catch (error) {
      logger.error('Error starting file watcher', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Stop watching files
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
      logger.info('File watcher stopped');
    }

    // Clear any pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Persist invalidation log
    await this.persistInvalidationLog();
  }

  /**
   * Handle file change events with debouncing
   */
  private handleFileChange(filePath: string, changeType: 'change' | 'delete' | 'add'): void {
    const key = `${filePath}:${changeType}`;
    
    // Clear existing timer for this file
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
      try {
        await this.processFileChange(filePath, changeType);
        this.debounceTimers.delete(key);
      } catch (error) {
        logger.error('Error processing file change', {
          filePath,
          changeType,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.debounceMs);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Process file change and invalidate related cache entries
   */
  private async processFileChange(filePath: string, changeType: 'change' | 'delete' | 'add'): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.debug('Processing file change for cache invalidation', {
        filePath,
        changeType
      });

      const invalidatedKeys: string[] = [];
      const affectedLayers: string[] = [];

      // 1. Direct file invalidation
      await this.cacheManager.invalidateFile(filePath);
      invalidatedKeys.push(`file:${filePath}`);
      affectedLayers.push('redis', 'memory');

      // 2. Pattern-based invalidation
      const fileBasename = path.basename(filePath);
      const fileDir = path.dirname(filePath);
      const fileExt = path.extname(filePath);

      // Invalidate by file extension
      await this.cacheManager.invalidatePattern(fileExt);
      invalidatedKeys.push(`pattern:${fileExt}`);

      // Invalidate by directory
      await this.cacheManager.invalidatePattern(fileDir);
      invalidatedKeys.push(`pattern:${fileDir}`);

      // 3. Semantic invalidation (if enabled and file has content)
      if (this.config.enableSemanticInvalidation && changeType !== 'delete') {
        try {
          await this.performSemanticInvalidation(filePath);
          invalidatedKeys.push(`semantic:${filePath}`);
          affectedLayers.push('semantic');
        } catch (error) {
          logger.warn('Semantic invalidation failed', {
            filePath,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // 4. Special case invalidations
      await this.handleSpecialCases(filePath, changeType, invalidatedKeys);

      // Record invalidation event
      const event: InvalidationEvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        type: changeType === 'delete' ? 'file-delete' : 'file-change',
        filePath,
        reason: `File ${changeType}`,
        invalidatedKeys: [...new Set(invalidatedKeys)], // Remove duplicates
        affectedCacheLayers: [...new Set(affectedLayers)]
      };

      this.recordEvent(event);

      logger.info('Cache invalidation completed for file change', {
        filePath,
        changeType,
        invalidatedKeys: event.invalidatedKeys.length,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Error during file change processing', {
        filePath,
        changeType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Perform semantic invalidation based on file content similarity
   */
  private async performSemanticInvalidation(filePath: string): Promise<void> {
    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract meaningful terms from content
      const terms = this.extractSemanticTerms(content);
      
      // Invalidate cache entries that might be semantically related
      for (const term of terms.slice(0, 10)) { // Limit to avoid over-invalidation
        if (term.length > 3) { // Only meaningful terms
          await this.cacheManager.invalidatePattern(term);
        }
      }

    } catch (error) {
      // File might not be readable or might be binary
      logger.debug('Could not perform semantic invalidation', {
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Extract semantic terms from file content
   */
  private extractSemanticTerms(content: string): string[] {
    // Extract meaningful terms using simple heuristics
    const terms: string[] = [];
    
    // Common code/documentation patterns
    const patterns = [
      // Function/method names
      /(?:function|const|let|var|def|class)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      // Import/require statements
      /(?:import|require|from)\s+['"`]([^'"`]+)['"`]/g,
      // Class names
      /class\s+([A-Z][a-zA-Z0-9_]*)/g,
      // Interface names
      /interface\s+([A-Z][a-zA-Z0-9_]*)/g,
      // Type names
      /type\s+([A-Z][a-zA-Z0-9_]*)/g,
      // Key-value pairs in configs
      /["']([a-zA-Z][a-zA-Z0-9_-]+)["']\s*:/g,
      // Markdown headers
      /#+\s+([^#\n]+)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const term = match[1].trim().toLowerCase();
        if (term.length > 2 && !terms.includes(term)) {
          terms.push(term);
        }
      }
    }

    return terms;
  }

  /**
   * Handle special case invalidations for specific file types
   */
  private async handleSpecialCases(
    filePath: string, 
    changeType: string, 
    invalidatedKeys: string[]
  ): Promise<void> {
    const filename = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // Package.json changes - invalidate all node_modules related caches
    if (filename === 'package.json') {
      await this.cacheManager.invalidatePattern('node_modules');
      invalidatedKeys.push('special:node_modules');
    }

    // Configuration file changes
    if (['.env', '.env.local', '.env.production'].includes(filename) || 
        filename.includes('config') ||
        ['.yaml', '.yml', '.json'].includes(ext)) {
      await this.cacheManager.invalidatePattern('config');
      invalidatedKeys.push('special:config');
    }

    // Documentation changes
    if (ext === '.md' || filename.includes('readme') || filename.includes('doc')) {
      await this.cacheManager.invalidatePattern('documentation');
      invalidatedKeys.push('special:documentation');
    }

    // TypeScript/JavaScript changes - invalidate related compiled outputs
    if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
      const baseName = path.basename(filePath, ext);
      await this.cacheManager.invalidatePattern(baseName);
      invalidatedKeys.push(`special:compiled:${baseName}`);
    }
  }

  /**
   * Manually invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string, reason = 'Manual invalidation'): Promise<void> {
    try {
      const startTime = Date.now();
      
      await this.cacheManager.invalidatePattern(pattern);

      const event: InvalidationEvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        type: 'pattern',
        pattern,
        reason,
        invalidatedKeys: [`pattern:${pattern}`],
        affectedCacheLayers: ['redis', 'memory']
      };

      this.recordEvent(event);

      logger.info('Manual pattern invalidation completed', {
        pattern,
        reason,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Error during manual pattern invalidation', {
        pattern,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Manually invalidate specific file
   */
  async invalidateFile(filePath: string, reason = 'Manual invalidation'): Promise<void> {
    try {
      const startTime = Date.now();
      
      await this.cacheManager.invalidateFile(filePath);

      const event: InvalidationEvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        type: 'manual',
        filePath,
        reason,
        invalidatedKeys: [`file:${filePath}`],
        affectedCacheLayers: ['redis', 'memory']
      };

      this.recordEvent(event);

      logger.info('Manual file invalidation completed', {
        filePath,
        reason,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Error during manual file invalidation', {
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(reason = 'Manual clear all'): Promise<void> {
    try {
      const startTime = Date.now();
      
      await this.cacheManager.clearCache();

      const event: InvalidationEvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        type: 'manual',
        reason,
        invalidatedKeys: ['all'],
        affectedCacheLayers: ['redis', 'memory']
      };

      this.recordEvent(event);

      logger.info('All caches cleared', {
        reason,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Error clearing all caches', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get invalidation statistics
   */
  getStats(): InvalidationStats {
    const totalEvents = this.eventLog.length;
    const totalKeys = this.eventLog.reduce((sum, event) => sum + event.invalidatedKeys.length, 0);
    
    return {
      ...this.stats,
      totalEvents,
      totalKeysInvalidated: totalKeys,
      averageKeysPerEvent: totalEvents > 0 ? totalKeys / totalEvents : 0,
      lastEventTime: totalEvents > 0 ? this.eventLog[totalEvents - 1].timestamp : undefined
    };
  }

  /**
   * Get recent invalidation events
   */
  getRecentEvents(limit = 20): InvalidationEvent[] {
    return this.eventLog.slice(-limit).reverse();
  }

  /**
   * Record invalidation event
   */
  private recordEvent(event: InvalidationEvent): void {
    this.eventLog.push(event);
    
    // Trim log if it gets too large
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.splice(0, this.eventLog.length - this.maxLogSize);
    }

    // Update stats
    this.stats.totalEvents++;
    this.stats.totalKeysInvalidated += event.invalidatedKeys.length;
    
    switch (event.type) {
      case 'file-change':
      case 'file-delete':
        this.stats.fileChangeEvents++;
        break;
      case 'pattern':
        this.stats.patternEvents++;
        break;
      case 'manual':
        this.stats.manualEvents++;
        break;
      case 'semantic':
        this.stats.semanticEvents++;
        break;
    }

    // Persist log if enabled
    if (this.config.persistInvalidationLog) {
      // Persist asynchronously to avoid blocking
      this.persistInvalidationLog().catch(error => {
        logger.warn('Failed to persist invalidation log', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return createHash('sha1')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Load invalidation log from disk
   */
  private async loadInvalidationLog(): Promise<void> {
    if (!this.config.persistInvalidationLog || !this.config.logPath) {
      return;
    }

    try {
      const logData = await fs.readFile(this.config.logPath, 'utf-8');
      const parsedLog = JSON.parse(logData);
      
      if (Array.isArray(parsedLog.events)) {
        this.eventLog = parsedLog.events.slice(-this.maxLogSize);
        logger.info('Loaded invalidation log from disk', {
          events: this.eventLog.length,
          logPath: this.config.logPath
        });
      }
    } catch (error) {
      // Log file doesn't exist or is corrupted - start fresh
      logger.debug('Could not load invalidation log, starting fresh', {
        logPath: this.config.logPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Persist invalidation log to disk
   */
  private async persistInvalidationLog(): Promise<void> {
    if (!this.config.persistInvalidationLog || !this.config.logPath) {
      return;
    }

    try {
      // Ensure log directory exists
      const logDir = path.dirname(this.config.logPath);
      await fs.mkdir(logDir, { recursive: true });

      const logData = {
        timestamp: new Date().toISOString(),
        events: this.eventLog,
        stats: this.getStats()
      };

      await fs.writeFile(this.config.logPath, JSON.stringify(logData, null, 2));
      
      logger.debug('Persisted invalidation log', {
        events: this.eventLog.length,
        logPath: this.config.logPath
      });
    } catch (error) {
      logger.warn('Failed to persist invalidation log', {
        error: error instanceof Error ? error.message : String(error),
        logPath: this.config.logPath
      });
    }
  }
}

/**
 * Create cache invalidator with project-specific configuration
 */
export function createCacheInvalidator(
  cacheManager: CacheManager, 
  config?: Partial<InvalidationConfig>
): CacheInvalidator {
  return new CacheInvalidator(cacheManager, config);
}