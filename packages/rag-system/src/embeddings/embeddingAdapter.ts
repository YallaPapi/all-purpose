/**
 * Embedding Adapter
 * 
 * Adapts OpenAI embeddings to match vector database dimensions
 * Following All-Purpose Pattern: Configurable for ANY dimension requirements
 */

import { OpenAIEmbeddings, EmbeddingResult, BatchEmbeddingResult } from './openaiEmbeddings';
import { logger, embeddingLogger } from '../utils/logger';

export interface AdapterConfig {
  targetDimension: number;
  sourceModel: string;
  adaptationMethod: 'truncate' | 'pad' | 'normalize';
  preserveNorm: boolean;
}

export interface AdaptedEmbeddingResult {
  text: string;
  embedding: number[];
  originalDimension: number;
  targetDimension: number;
  adaptationMethod: string;
  tokens: number;
  model: string;
}

/**
 * Embedding Adapter Service
 * Converts embeddings to match vector database requirements
 */
export class EmbeddingAdapter {
  private config: AdapterConfig;
  private openaiEmbeddings: OpenAIEmbeddings;

  constructor(config: Partial<AdapterConfig> = {}) {
    this.config = {
      targetDimension: 1024, // Match your Upstash Vector DB
      sourceModel: 'text-embedding-3-small',
      adaptationMethod: 'truncate',
      preserveNorm: true,
      ...config
    };

    this.openaiEmbeddings = new OpenAIEmbeddings({
      model: this.config.sourceModel
    });

    embeddingLogger.info('Embedding Adapter initialized', {
      targetDimension: this.config.targetDimension,
      sourceModel: this.config.sourceModel,
      method: this.config.adaptationMethod
    });
  }

  /**
   * Generate adapted embedding for a single text
   */
  async generateEmbedding(text: string): Promise<AdaptedEmbeddingResult> {
    const results = await this.generateEmbeddings([text]);
    return results.results[0];
  }

  /**
   * Generate adapted embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<{
    results: AdaptedEmbeddingResult[];
    totalTokens: number;
    totalCost: number;
  }> {
    embeddingLogger.info('Generating adapted embeddings', {
      textCount: texts.length,
      targetDimension: this.config.targetDimension
    });

    // Generate original embeddings
    const originalResults = await this.openaiEmbeddings.generateEmbeddings(texts);

    // Adapt each embedding
    const adaptedResults: AdaptedEmbeddingResult[] = originalResults.results.map(result => {
      const adaptedEmbedding = this.adaptEmbedding(result.embedding);
      
      return {
        text: result.text,
        embedding: adaptedEmbedding,
        originalDimension: result.embedding.length,
        targetDimension: this.config.targetDimension,
        adaptationMethod: this.config.adaptationMethod,
        tokens: result.tokens,
        model: result.model
      };
    });

    embeddingLogger.info('Embedding adaptation completed', {
      processed: adaptedResults.length,
      originalDim: adaptedResults[0]?.originalDimension,
      targetDim: adaptedResults[0]?.targetDimension,
      method: this.config.adaptationMethod
    });

    return {
      results: adaptedResults,
      totalTokens: originalResults.totalTokens,
      totalCost: originalResults.totalCost
    };
  }

  /**
   * Adapt a single embedding vector to target dimensions
   */
  private adaptEmbedding(embedding: number[]): number[] {
    const originalDim = embedding.length;
    const targetDim = this.config.targetDimension;

    if (originalDim === targetDim) {
      return [...embedding]; // Already correct size
    }

    let adapted: number[];

    switch (this.config.adaptationMethod) {
      case 'truncate':
        adapted = this.truncateEmbedding(embedding, targetDim);
        break;
      case 'pad':
        adapted = this.padEmbedding(embedding, targetDim);
        break;
      case 'normalize':
        adapted = this.normalizeEmbedding(embedding, targetDim);
        break;
      default:
        throw new Error(`Unknown adaptation method: ${this.config.adaptationMethod}`);
    }

    // Preserve L2 norm if requested
    if (this.config.preserveNorm) {
      adapted = this.preserveL2Norm(embedding, adapted);
    }

    return adapted;
  }

  /**
   * Truncate embedding to target dimension (keep first N dimensions)
   */
  private truncateEmbedding(embedding: number[], targetDim: number): number[] {
    if (embedding.length <= targetDim) {
      return [...embedding];
    }

    // Simple truncation - keep the first N dimensions
    // This preserves the most important components in most embedding models
    return embedding.slice(0, targetDim);
  }

  /**
   * Pad embedding to target dimension (add zeros)
   */
  private padEmbedding(embedding: number[], targetDim: number): number[] {
    if (embedding.length >= targetDim) {
      return embedding.slice(0, targetDim);
    }

    // Pad with zeros
    const padded = [...embedding];
    while (padded.length < targetDim) {
      padded.push(0);
    }

    return padded;
  }

  /**
   * Normalize embedding by averaging into target dimension
   */
  private normalizeEmbedding(embedding: number[], targetDim: number): number[] {
    const originalDim = embedding.length;
    
    if (originalDim === targetDim) {
      return [...embedding];
    }

    if (originalDim < targetDim) {
      // Interpolate to higher dimension
      const normalized: number[] = [];
      const ratio = originalDim / targetDim;
      
      for (let i = 0; i < targetDim; i++) {
        const sourceIndex = i * ratio;
        const lowerIndex = Math.floor(sourceIndex);
        const upperIndex = Math.min(Math.ceil(sourceIndex), originalDim - 1);
        const weight = sourceIndex - lowerIndex;
        
        const value = embedding[lowerIndex] * (1 - weight) + embedding[upperIndex] * weight;
        normalized.push(value);
      }
      
      return normalized;
    } else {
      // Average down to lower dimension
      const normalized: number[] = [];
      const ratio = originalDim / targetDim;
      
      for (let i = 0; i < targetDim; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        
        let sum = 0;
        for (let j = start; j < end && j < originalDim; j++) {
          sum += embedding[j];
        }
        
        normalized.push(sum / (end - start));
      }
      
      return normalized;
    }
  }

  /**
   * Preserve the L2 norm of the original embedding
   */
  private preserveL2Norm(original: number[], adapted: number[]): number[] {
    // Calculate L2 norms
    const originalNorm = Math.sqrt(original.reduce((sum, val) => sum + val * val, 0));
    const adaptedNorm = Math.sqrt(adapted.reduce((sum, val) => sum + val * val, 0));
    
    if (adaptedNorm === 0) {
      return adapted; // Avoid division by zero
    }
    
    // Scale adapted embedding to preserve original norm
    const scale = originalNorm / adaptedNorm;
    return adapted.map(val => val * scale);
  }

  /**
   * Get embedding dimension for current configuration
   */
  getEmbeddingDimension(): number {
    return this.config.targetDimension;
  }

  /**
   * Validate that an embedding matches target dimension
   */
  validateEmbedding(embedding: number[]): { valid: boolean; reason?: string } {
    if (embedding.length !== this.config.targetDimension) {
      return {
        valid: false,
        reason: `Embedding dimension ${embedding.length} doesn't match target ${this.config.targetDimension}`
      };
    }

    if (embedding.some(val => !isFinite(val))) {
      return {
        valid: false,
        reason: 'Embedding contains non-finite values'
      };
    }

    return { valid: true };
  }

  /**
   * Get current configuration
   */
  getConfig(): AdapterConfig {
    return { ...this.config };
  }
}

/**
 * Create embedding adapter with default configuration
 */
export function createEmbeddingAdapter(config?: Partial<AdapterConfig>): EmbeddingAdapter {
  return new EmbeddingAdapter(config);
}

/**
 * Default embedding adapter for current vector database (lazy initialization)
 */
export const defaultEmbeddingAdapter = (() => {
  try {
    return createEmbeddingAdapter({
      targetDimension: 1024, // Match Upstash Vector DB
      sourceModel: 'text-embedding-3-small',
      adaptationMethod: 'truncate',
      preserveNorm: true
    });
  } catch (error) {
    // Return null if not ready - will be created when needed
    return null;
  }
})();