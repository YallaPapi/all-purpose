/**
 * Cache Warming System
 * 
 * Task 45: Persistent cache warming system that builds up cache across sessions
 * Pre-populates common queries, project context, and agent-specific information
 */

import { Worker } from 'worker_threads';
import { CacheManager } from './CacheManager';
import { SemanticSearchAPI } from '../api/searchAPI';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { minimatch } from 'minimatch';

export interface WarmupConfig {
  enabled: boolean;
  projectPath: string;
  warmupManifestPath: string;
  maxConcurrentQueries: number;
  maxWarmupTimeMs: number;
  persistWarmupState: boolean;
  commonQueries: string[];
  agentContexts: Record<string, string[]>;
  filePatterns: {
    high: string[];
    medium: string[];
    low: string[];
  };
  scheduleEnabled: boolean;
  scheduleCron?: string;
  backgroundWarming: boolean;
}

export interface WarmupManifest {
  version: string;
  lastUpdated: string;
  projectPath: string;
  commonQueries: WarmupQuery[];
  agentContexts: Record<string, WarmupQuery[]>;
  fileContexts: WarmupFile[];
  stats: WarmupStats;
}

export interface WarmupQuery {
  query: string;
  priority: 'high' | 'medium' | 'low';
  frequency: number;
  lastUsed: string;
  cacheHit: boolean;
  responseTime: number;
  resultCount: number;
}

export interface WarmupFile {
  filePath: string;
  priority: 'high' | 'medium' | 'low';
  lastModified: string;
  size: number;
  indexed: boolean;
  embeddingCached: boolean;
  contentCached: boolean;
}

export interface WarmupStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  totalFiles: number;
  cachedFiles: number;
  totalWarmupTime: number;
  averageQueryTime: number;
  cacheHitRate: number;
  lastWarmupTime?: string;
}

export interface WarmupProgress {
  phase: 'starting' | 'queries' | 'files' | 'embeddings' | 'completed' | 'failed';
  progress: number;
  completed: number;
  total: number;
  currentItem?: string;
  timeElapsed: number;
  timeRemaining?: number;
  errors: string[];
}

/**
 * Intelligent cache warming system with persistence across sessions
 */
export class CacheWarmer {
  private config: WarmupConfig;
  private cacheManager: CacheManager;
  private searchAPI: SemanticSearchAPI;
  private warmupManifest: WarmupManifest;
  private isWarming = false;
  private currentProgress: WarmupProgress;
  private warmupWorker?: Worker;
  private progressCallbacks: Array<(progress: WarmupProgress) => void> = [];

  constructor(
    cacheManager: CacheManager,
    searchAPI: SemanticSearchAPI,
    config: Partial<WarmupConfig> = {}
  ) {
    this.cacheManager = cacheManager;
    this.searchAPI = searchAPI;
    
    this.config = {
      enabled: true,
      projectPath: process.cwd(),
      warmupManifestPath: path.join(process.cwd(), 'rag-system', '.rag-cache', 'warmup-manifest.json'),
      maxConcurrentQueries: 5,
      maxWarmupTimeMs: 5 * 60 * 1000, // 5 minutes
      persistWarmupState: true,
      commonQueries: [
        'all-purpose pattern methodology',
        'taskmaster usage guide',
        'meta-agent architecture',
        'vercel deployment configuration',
        'project documentation overview',
        'api reference documentation',
        'development setup guide',
        'typescript configuration',
        'cache implementation',
        'observability system'
      ],
      agentContexts: {
        'frontend': [
          'react components',
          'tailwind css styling',
          'ui components',
          'accessibility guidelines',
          'performance optimization'
        ],
        'backend': [
          'api endpoints',
          'database schema',
          'authentication middleware',
          'error handling',
          'testing strategies'
        ],
        'devops': [
          'deployment configuration',
          'ci/cd pipelines',
          'docker containers',
          'monitoring setup',
          'infrastructure'
        ],
        'qa': [
          'test plans',
          'testing frameworks',
          'test automation',
          'quality assurance',
          'bug tracking'
        ],
        'documentation': [
          'markdown documentation',
          'api documentation',
          'user guides',
          'technical specifications',
          'changelog'
        ]
      },
      filePatterns: {
        high: ['**/*.md', '**/README*', '**/CLAUDE*', '**/package.json', '**/tsconfig.json'],
        medium: ['**/*.ts', '**/*.js', '**/*.json', '**/*.yaml', '**/*.yml'],
        low: ['**/*.txt', '**/*.log', '**/*.env*']
      },
      scheduleEnabled: false,
      backgroundWarming: true,
      ...config
    };

    // Initialize empty manifest
    this.warmupManifest = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      projectPath: this.config.projectPath,
      commonQueries: [],
      agentContexts: {},
      fileContexts: [],
      stats: {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        totalFiles: 0,
        cachedFiles: 0,
        totalWarmupTime: 0,
        averageQueryTime: 0,
        cacheHitRate: 0
      }
    };

    this.currentProgress = {
      phase: 'starting',
      progress: 0,
      completed: 0,
      total: 0,
      timeElapsed: 0,
      errors: []
    };

    logger.info('Cache warming system initialized', {
      enabled: this.config.enabled,
      projectPath: this.config.projectPath,
      maxConcurrentQueries: this.config.maxConcurrentQueries,
      backgroundWarming: this.config.backgroundWarming
    });
  }

  /**
   * Start comprehensive cache warming
   */
  async startWarmup(options: {
    skipCommonQueries?: boolean;
    skipAgentContexts?: boolean;
    skipFileIndexing?: boolean;
    priority?: 'high' | 'medium' | 'low' | 'all';
  } = {}): Promise<void> {
    if (this.isWarming) {
      throw new Error('Cache warming is already in progress');
    }

    if (!this.config.enabled) {
      logger.info('Cache warming is disabled');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      logger.info('Starting cache warmup', {
        options,
        projectPath: this.config.projectPath
      });

      // Load existing warmup manifest
      await this.loadWarmupManifest();

      // Initialize progress tracking
      this.currentProgress = {
        phase: 'starting',
        progress: 0,
        completed: 0,
        total: 0,
        timeElapsed: 0,
        errors: []
      };

      this.notifyProgress();

      // Phase 1: Common queries warmup
      if (!options.skipCommonQueries) {
        await this.warmupCommonQueries(options.priority);
      }

      // Phase 2: Agent-specific contexts
      if (!options.skipAgentContexts) {
        await this.warmupAgentContexts(options.priority);
      }

      // Phase 3: File-based context warming
      if (!options.skipFileIndexing) {
        await this.warmupFileContexts(options.priority);
      }

      // Update manifest and persist
      this.warmupManifest.lastUpdated = new Date().toISOString();
      this.warmupManifest.stats.totalWarmupTime = Date.now() - startTime;
      this.warmupManifest.stats.lastWarmupTime = new Date().toISOString();
      
      await this.saveWarmupManifest();

      // Complete
      this.currentProgress.phase = 'completed';
      this.currentProgress.progress = 100;
      this.currentProgress.timeElapsed = Date.now() - startTime;
      this.notifyProgress();

      logger.info('Cache warmup completed successfully', {
        totalTime: Date.now() - startTime,
        successfulQueries: this.warmupManifest.stats.successfulQueries,
        failedQueries: this.warmupManifest.stats.failedQueries,
        cachedFiles: this.warmupManifest.stats.cachedFiles
      });

    } catch (error) {
      this.currentProgress.phase = 'failed';
      this.currentProgress.errors.push(error instanceof Error ? error.message : String(error));
      this.notifyProgress();

      logger.error('Cache warmup failed', {
        error: error instanceof Error ? error.message : String(error),
        timeElapsed: Date.now() - startTime
      });
      
      throw error;
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm up common queries
   */
  private async warmupCommonQueries(priority?: string): Promise<void> {
    this.currentProgress.phase = 'queries';
    
    const queries = this.config.commonQueries.filter(query => {
      if (!priority || priority === 'all') return true;
      
      // Filter by priority (you could extend this with query priorities)
      return true;
    });

    this.currentProgress.total = queries.length;
    this.currentProgress.completed = 0;
    this.notifyProgress();

    logger.info('Warming up common queries', { queryCount: queries.length });

    const batchSize = this.config.maxConcurrentQueries;
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (query, batchIndex) => {
          const startTime = Date.now();
          try {
            this.currentProgress.currentItem = query;
            this.notifyProgress();

            // Check if already cached
            const cached = await this.cacheManager.getCachedSearch(query);
            
            if (!cached) {
              // Perform search to populate cache
              const result = await this.searchAPI.search({ query });
              
              // Cache the result
              await this.cacheManager.setCachedSearch(query, result);
              
              // Record in manifest
              const warmupQuery: WarmupQuery = {
                query,
                priority: 'high',
                frequency: 1,
                lastUsed: new Date().toISOString(),
                cacheHit: false,
                responseTime: Date.now() - startTime,
                resultCount: result.results.length
              };

              this.warmupManifest.commonQueries.push(warmupQuery);
              this.warmupManifest.stats.successfulQueries++;
            } else {
              // Update existing entry
              const existingQuery = this.warmupManifest.commonQueries.find(q => q.query === query);
              if (existingQuery) {
                existingQuery.frequency++;
                existingQuery.lastUsed = new Date().toISOString();
                existingQuery.cacheHit = true;
              }
            }

            this.currentProgress.completed++;
            this.notifyProgress();

          } catch (error) {
            logger.warn('Failed to warm up query', {
              query,
              error: error instanceof Error ? error.message : String(error)
            });
            
            this.warmupManifest.stats.failedQueries++;
            this.currentProgress.errors.push(`Query "${query}": ${error instanceof Error ? error.message : String(error)}`);
            this.currentProgress.completed++;
            this.notifyProgress();
          }
        })
      );

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Warm up agent-specific contexts
   */
  private async warmupAgentContexts(priority?: string): Promise<void> {
    logger.info('Warming up agent contexts');

    for (const [agentType, queries] of Object.entries(this.config.agentContexts)) {
      if (!this.warmupManifest.agentContexts[agentType]) {
        this.warmupManifest.agentContexts[agentType] = [];
      }

      for (const query of queries) {
        try {
          const startTime = Date.now();
          
          // Check if already cached
          const cached = await this.cacheManager.getCachedSearch(query);
          
          if (!cached) {
            // Perform search with agent-specific context
            const result = await this.searchAPI.search({
              query,
              filters: { contentType: [agentType] }
            });
            
            // Cache the result
            await this.cacheManager.setCachedSearch(query, result, { contentType: [agentType] });
            
            // Record in manifest
            const warmupQuery: WarmupQuery = {
              query,
              priority: 'medium',
              frequency: 1,
              lastUsed: new Date().toISOString(),
              cacheHit: false,
              responseTime: Date.now() - startTime,
              resultCount: result.results.length
            };

            this.warmupManifest.agentContexts[agentType].push(warmupQuery);
          }

        } catch (error) {
          logger.warn('Failed to warm up agent context', {
            agentType,
            query,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  }

  /**
   * Warm up file contexts by discovering and caching file content
   */
  private async warmupFileContexts(priority?: string): Promise<void> {
    this.currentProgress.phase = 'files';
    logger.info('Warming up file contexts');

    // Discover files based on priority patterns
    const files = await this.discoverFiles(priority);
    
    this.currentProgress.total = files.length;
    this.currentProgress.completed = 0;
    this.notifyProgress();

    const batchSize = this.config.maxConcurrentQueries;
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (file) => {
          try {
            this.currentProgress.currentItem = file.filePath;
            this.notifyProgress();

            // Check if file content is already cached
            const cached = this.cacheManager.getCachedFileContent(file.filePath);
            
            if (!cached) {
              // Read and process file
              const content = await fs.readFile(file.filePath, 'utf-8');
              
              // Create processed file object
              const processedFile = {
                content,
                chunks: this.chunkContent(content),
                metadata: {
                  filePath: file.filePath,
                  fileName: path.basename(file.filePath),
                  fileType: path.extname(file.filePath),
                  lastModified: new Date(file.lastModified),
                  size: file.size,
                  chunkCount: Math.ceil(content.length / 1000)
                }
              };

              // Cache the processed file
              this.cacheManager.setCachedFileContent(file.filePath, processedFile);
              
              // Update file in manifest
              file.contentCached = true;
              this.warmupManifest.stats.cachedFiles++;
            }

            this.currentProgress.completed++;
            this.notifyProgress();

          } catch (error) {
            logger.warn('Failed to warm up file context', {
              filePath: file.filePath,
              error: error instanceof Error ? error.message : String(error)
            });
            
            this.currentProgress.errors.push(`File "${file.filePath}": ${error instanceof Error ? error.message : String(error)}`);
            this.currentProgress.completed++;
            this.notifyProgress();
          }
        })
      );
    }

    // Update manifest with file contexts
    this.warmupManifest.fileContexts = files;
    this.warmupManifest.stats.totalFiles = files.length;
  }

  /**
   * Discover files based on patterns and priorities
   */
  private async discoverFiles(priority?: string): Promise<WarmupFile[]> {
    const files: WarmupFile[] = [];
    
    // Get patterns based on priority
    let patterns: string[] = [];
    if (!priority || priority === 'all') {
      patterns = [...this.config.filePatterns.high, ...this.config.filePatterns.medium, ...this.config.filePatterns.low];
    } else {
      patterns = this.config.filePatterns[priority as keyof typeof this.config.filePatterns] || [];
    }

    // Recursively scan project directory
    await this.scanDirectory(this.config.projectPath, patterns, files, priority as any);
    
    return files;
  }

  /**
   * Recursively scan directory for files matching patterns
   */
  private async scanDirectory(
    dirPath: string, 
    patterns: string[], 
    files: WarmupFile[], 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip node_modules, .git, etc.
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', '.next', 'logs'].includes(entry.name)) {
            await this.scanDirectory(fullPath, patterns, files, priority);
          }
          continue;
        }

        // Check if file matches any pattern
        const relativePath = path.relative(this.config.projectPath, fullPath);
        const matches = patterns.some(pattern => minimatch(relativePath, pattern));
        
        if (matches) {
          const stats = await fs.stat(fullPath);
          
          files.push({
            filePath: fullPath,
            priority,
            lastModified: stats.mtime.toISOString(),
            size: stats.size,
            indexed: false,
            embeddingCached: false,
            contentCached: false
          });
        }
      }
    } catch (error) {
      logger.warn('Error scanning directory', {
        dirPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Chunk content for better caching
   */
  private chunkContent(content: string, chunkSize = 1000): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Load warmup manifest from disk
   */
  private async loadWarmupManifest(): Promise<void> {
    if (!this.config.persistWarmupState) {
      return;
    }

    try {
      const manifestData = await fs.readFile(this.config.warmupManifestPath, 'utf-8');
      this.warmupManifest = JSON.parse(manifestData);
      
      logger.info('Loaded warmup manifest', {
        version: this.warmupManifest.version,
        lastUpdated: this.warmupManifest.lastUpdated,
        commonQueries: this.warmupManifest.commonQueries.length,
        fileContexts: this.warmupManifest.fileContexts.length
      });
    } catch (error) {
      logger.debug('Could not load warmup manifest, starting fresh', {
        manifestPath: this.config.warmupManifestPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Save warmup manifest to disk
   */
  private async saveWarmupManifest(): Promise<void> {
    if (!this.config.persistWarmupState) {
      return;
    }

    try {
      // Ensure cache directory exists
      const manifestDir = path.dirname(this.config.warmupManifestPath);
      await fs.mkdir(manifestDir, { recursive: true });

      await fs.writeFile(
        this.config.warmupManifestPath, 
        JSON.stringify(this.warmupManifest, null, 2)
      );
      
      logger.debug('Saved warmup manifest', {
        manifestPath: this.config.warmupManifestPath,
        queries: this.warmupManifest.commonQueries.length,
        files: this.warmupManifest.fileContexts.length
      });
    } catch (error) {
      logger.warn('Failed to save warmup manifest', {
        error: error instanceof Error ? error.message : String(error),
        manifestPath: this.config.warmupManifestPath
      });
    }
  }

  /**
   * Add progress callback
   */
  onProgress(callback: (progress: WarmupProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Notify progress to all callbacks
   */
  private notifyProgress(): void {
    for (const callback of this.progressCallbacks) {
      try {
        callback({ ...this.currentProgress });
      } catch (error) {
        logger.warn('Error in progress callback', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Get current warmup progress
   */
  getProgress(): WarmupProgress {
    return { ...this.currentProgress };
  }

  /**
   * Get warmup statistics
   */
  getStats(): WarmupStats {
    return { ...this.warmupManifest.stats };
  }

  /**
   * Get warmup manifest
   */
  getManifest(): WarmupManifest {
    return { ...this.warmupManifest };
  }

  /**
   * Check if warming is in progress
   */
  isWarmingUp(): boolean {
    return this.isWarming;
  }

  /**
   * Stop current warmup process
   */
  async stopWarmup(): Promise<void> {
    if (!this.isWarming) {
      return;
    }

    logger.info('Stopping cache warmup');
    
    if (this.warmupWorker) {
      await this.warmupWorker.terminate();
      this.warmupWorker = undefined;
    }

    this.isWarming = false;
    this.currentProgress.phase = 'failed';
    this.currentProgress.errors.push('Warmup stopped by user');
    this.notifyProgress();
  }
}

/**
 * Create cache warmer with project-specific configuration
 */
export function createCacheWarmer(
  cacheManager: CacheManager,
  searchAPI: SemanticSearchAPI,
  config?: Partial<WarmupConfig>
): CacheWarmer {
  return new CacheWarmer(cacheManager, searchAPI, config);
}