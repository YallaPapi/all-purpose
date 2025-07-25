/**
 * Document Processing Pipeline
 * 
 * Use context7: File processing with proper chunking and metadata extraction
 * Following All-Purpose Pattern: Configurable for ANY file types and chunk strategies
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import crypto from 'crypto';
import { logger, processingLogger } from '../utils/logger';

export interface ProcessingConfig {
  sourceDir: string;
  filePatterns: string[];
  excludePatterns: string[];
  chunkSize: number;
  chunkOverlap: number;
  maxFileSize: number;
  enableCache: boolean;
  cacheDir: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    filePath: string;
    fileName: string;
    fileType: string;
    chunkIndex: number;
    totalChunks: number;
    startOffset: number;
    endOffset: number;
    contentHash: string;
    lastModified: Date;
    fileSize: number;
    language?: string;
    section?: string;
    title?: string;
  };
}

export interface ProcessingResult {
  chunks: DocumentChunk[];
  processedFiles: number;
  skippedFiles: number;
  errors: string[];
  totalSize: number;
  processingTime: number;
}

export interface FileInfo {
  filePath: string;
  fileName: string;
  fileType: string;
  size: number;
  lastModified: Date;
  contentHash: string;
}

/**
 * Document Processing Service
 * Handles file discovery, content extraction, and intelligent chunking
 */
export class DocumentProcessor {
  private config: ProcessingConfig;
  private processedHashes: Map<string, DocumentChunk[]> = new Map();

  constructor(config: Partial<ProcessingConfig> = {}) {
    this.config = {
      sourceDir: process.cwd(),
      filePatterns: [
        '**/*.md',
        '**/*.txt', 
        '**/*.json',
        '**/*.js',
        '**/*.ts',
        '**/*.tsx',
        '**/*.jsx',
        '**/*.py',
        '**/*.yaml',
        '**/*.yml'
      ],
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/logs/**',
        '**/*.log'
      ],
      chunkSize: 1500, // Use context7: Optimal chunk size for embeddings
      chunkOverlap: 200, // Use context7: Good overlap for context preservation
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      enableCache: true,
      cacheDir: path.join(process.cwd(), '.rag-cache'),
      ...config
    };

    processingLogger.info('Document processor initialized', {
      sourceDir: this.config.sourceDir,
      filePatterns: this.config.filePatterns.length,
      chunkSize: this.config.chunkSize
    });
  }

  /**
   * Process all documents in the configured directory
   */
  async processDocuments(): Promise<ProcessingResult> {
    const startTime = Date.now();
    processingLogger.info('Starting document processing');

    try {
      // Discover files
      const files = await this.discoverFiles();
      processingLogger.info(`Discovered ${files.length} files for processing`);

      const chunks: DocumentChunk[] = [];
      let processedFiles = 0;
      let skippedFiles = 0;
      const errors: string[] = [];
      let totalSize = 0;

      for (const fileInfo of files) {
        try {
          const fileChunks = await this.processFile(fileInfo);
          if (fileChunks.length > 0) {
            chunks.push(...fileChunks);
            processedFiles++;
            totalSize += fileInfo.size;
            
            processingLogger.debug('File processed successfully', {
              file: fileInfo.fileName,
              chunks: fileChunks.length
            });
          } else {
            skippedFiles++;
          }
        } catch (error) {
          const errorMsg = `Failed to process ${fileInfo.filePath}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          processingLogger.error('File processing failed', {
            file: fileInfo.filePath,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const processingTime = Date.now() - startTime;
      
      processingLogger.info('Document processing completed', {
        totalChunks: chunks.length,
        processedFiles,
        skippedFiles,
        errors: errors.length,
        totalSize,
        processingTime
      });

      return {
        chunks,
        processedFiles,
        skippedFiles,
        errors,
        totalSize,
        processingTime
      };

    } catch (error) {
      processingLogger.error('Document processing failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process a single file into chunks
   */
  async processFile(fileInfo: FileInfo): Promise<DocumentChunk[]> {
    // Check cache first
    if (this.config.enableCache && this.processedHashes.has(fileInfo.contentHash)) {
      processingLogger.debug('Using cached chunks', { file: fileInfo.fileName });
      return this.processedHashes.get(fileInfo.contentHash)!;
    }

    // Read and validate file
    const content = await this.readFileContent(fileInfo.filePath);
    if (!content || content.trim().length === 0) {
      processingLogger.debug('Skipping empty file', { file: fileInfo.fileName });
      return [];
    }

    // Extract text based on file type
    const extractedText = await this.extractText(content, fileInfo.fileType);
    if (!extractedText || extractedText.trim().length === 0) {
      processingLogger.debug('No text extracted from file', { file: fileInfo.fileName });
      return [];
    }

    // Create chunks
    const chunks = await this.createChunks(extractedText, fileInfo);
    
    // Cache the result
    if (this.config.enableCache) {
      this.processedHashes.set(fileInfo.contentHash, chunks);
    }

    return chunks;
  }

  /**
   * Discover files matching the configured patterns
   */
  private async discoverFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    for (const pattern of this.config.filePatterns) {
      const fullPattern = path.join(this.config.sourceDir, pattern);
      
      try {
        const matchedFiles = await glob(fullPattern, {
          ignore: this.config.excludePatterns.map(p => path.join(this.config.sourceDir, p)),
          absolute: true,
          nodir: true
        });

        for (const filePath of matchedFiles) {
          try {
            const stats = await fs.stat(filePath);
            
            // Skip files that are too large
            if (stats.size > this.config.maxFileSize) {
              processingLogger.debug('Skipping large file', { 
                file: path.basename(filePath), 
                size: stats.size 
              });
              continue;
            }

            const fileName = path.basename(filePath);
            const fileType = path.extname(filePath).toLowerCase();
            const contentHash = await this.calculateFileHash(filePath);

            files.push({
              filePath,
              fileName,
              fileType,
              size: stats.size,
              lastModified: stats.mtime,
              contentHash
            });

          } catch (error) {
            processingLogger.warn('Failed to get file stats', {
              file: filePath,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      } catch (error) {
        processingLogger.warn('Pattern matching failed', {
          pattern,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return files;
  }

  /**
   * Read file content safely
   */
  private async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      processingLogger.error('Failed to read file', {
        file: filePath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Extract text content based on file type
   */
  private async extractText(content: string, fileType: string): Promise<string> {
    switch (fileType) {
      case '.md':
        return this.extractMarkdownText(content);
      case '.json':
        return this.extractJSONText(content);
      case '.js':
      case '.ts':
      case '.tsx':
      case '.jsx':
        return this.extractCodeText(content);
      case '.py':
        return this.extractCodeText(content);
      case '.yaml':
      case '.yml':
        return this.extractYAMLText(content);
      default:
        return content; // Plain text fallback
    }
  }

  /**
   * Extract meaningful text from markdown
   */
  private extractMarkdownText(content: string): string {
    // Remove code blocks but keep their language info
    const withCodeBlocks = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `[Code block${lang ? ` (${lang})` : ''}]: ${code.trim().substring(0, 200)}...`;
    });

    // Remove inline code formatting but keep content
    const withoutInlineCode = withCodeBlocks.replace(/`([^`]+)`/g, '$1');

    // Clean up markdown formatting
    return withoutInlineCode
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .trim();
  }

  /**
   * Extract text from JSON with structure info
   */
  private extractJSONText(content: string): string {
    try {
      const obj = JSON.parse(content);
      return this.flattenObject(obj).join(' ');
    } catch {
      return content; // Return raw content if parsing fails
    }
  }

  /**
   * Extract text from code files
   */
  private extractCodeText(content: string): string {
    // Extract comments and string literals
    const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
    const strings = content.match(/'[^']*'|"[^"]*"|`[^`]*`/g) || [];
    
    return [...comments, ...strings]
      .map(s => s.replace(/^\/\/\s*|^\/\*\s*|\*\/$/g, '').trim())
      .filter(s => s.length > 10) // Only meaningful text
      .join(' ');
  }

  /**
   * Extract text from YAML
   */
  private extractYAMLText(content: string): string {
    // Simple YAML text extraction - get values after colons
    const lines = content.split('\n');
    const values: string[] = [];
    
    for (const line of lines) {
      if (line.includes(':') && !line.trim().startsWith('#')) {
        const value = line.split(':')[1]?.trim();
        if (value && value !== '' && !value.startsWith('[') && !value.startsWith('{')) {
          values.push(value);
        }
      }
    }
    
    return values.join(' ');
  }

  /**
   * Create chunks from text content
   */
  private async createChunks(text: string, fileInfo: FileInfo): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const totalLength = text.length;
    
    if (totalLength <= this.config.chunkSize) {
      // Single chunk for small files
      chunks.push(this.createChunk(text, fileInfo, 0, 1, 0, totalLength));
    } else {
      // Multiple chunks with overlap
      let startOffset = 0;
      let chunkIndex = 0;
      
      while (startOffset < totalLength) {
        const endOffset = Math.min(startOffset + this.config.chunkSize, totalLength);
        const chunkText = text.substring(startOffset, endOffset);
        
        chunks.push(this.createChunk(chunkText, fileInfo, chunkIndex, -1, startOffset, endOffset));
        
        // Move start position with overlap
        startOffset = endOffset - this.config.chunkOverlap;
        chunkIndex++;
        
        // Prevent infinite loop
        if (startOffset >= endOffset) break;
      }
      
      // Update total chunks count
      chunks.forEach(chunk => {
        chunk.metadata.totalChunks = chunks.length;
      });
    }
    
    return chunks;
  }

  /**
   * Create a single chunk with metadata
   */
  private createChunk(
    content: string, 
    fileInfo: FileInfo, 
    chunkIndex: number, 
    totalChunks: number,
    startOffset: number,
    endOffset: number
  ): DocumentChunk {
    const chunkId = crypto
      .createHash('sha256')
      .update(`${fileInfo.filePath}:${chunkIndex}:${fileInfo.contentHash}`)
      .digest('hex')
      .substring(0, 16);

    return {
      id: chunkId,
      content: content.trim(),
      metadata: {
        filePath: fileInfo.filePath,
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        chunkIndex,
        totalChunks,
        startOffset,
        endOffset,
        contentHash: fileInfo.contentHash,
        lastModified: fileInfo.lastModified,
        fileSize: fileInfo.size,
        language: this.detectLanguage(fileInfo.fileType),
        section: this.extractSection(content),
        title: this.extractTitle(content, fileInfo.fileName)
      }
    };
  }

  /**
   * Calculate file hash for change detection
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Flatten object for text extraction
   */
  private flattenObject(obj: any, prefix = ''): string[] {
    const result: string[] = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result.push(...this.flattenObject(value, newKey));
        } else if (typeof value === 'string' && value.length > 0) {
          result.push(`${newKey}: ${value}`);
        }
      }
    }
    
    return result;
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(fileType: string): string | undefined {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml'
    };
    
    return languageMap[fileType];
  }

  /**
   * Extract section header from content
   */
  private extractSection(content: string): string | undefined {
    // Look for markdown headers
    const headerMatch = content.match(/^#{1,6}\s+(.+)/m);
    if (headerMatch) {
      return headerMatch[1].trim();
    }
    
    // Look for code function/class names
    const functionMatch = content.match(/(?:function|class|def)\s+(\w+)/);
    if (functionMatch) {
      return functionMatch[1];
    }
    
    return undefined;
  }

  /**
   * Extract title from content or filename
   */
  private extractTitle(content: string, fileName: string): string {
    // Try to extract from first line if it looks like a title
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length < 100) {
      // Remove markdown formatting
      const cleanTitle = firstLine.replace(/^#{1,6}\s+/, '').replace(/[*_`]/g, '');
      if (cleanTitle.length > 0) {
        return cleanTitle;
      }
    }
    
    // Fallback to filename without extension
    return path.basename(fileName, path.extname(fileName));
  }

  /**
   * Get current configuration
   */
  getConfig(): ProcessingConfig {
    return { ...this.config };
  }
}

/**
 * Create document processor with default configuration
 */
export function createDocumentProcessor(config?: Partial<ProcessingConfig>): DocumentProcessor {
  return new DocumentProcessor(config);
}

/**
 * Default document processor instance
 */
export const defaultDocumentProcessor = createDocumentProcessor();