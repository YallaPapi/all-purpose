/**
 * RAG System Entry Point
 * 
 * Main entry point for the RAG Documentation Memory System
 * Following All-Purpose Pattern: Configurable for ANY project context
 */

import { logger } from './utils/logger';
import { createRAGPipeline } from './integration/ragPipeline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Initialize and test the RAG system
 */
async function initializeRAGSystem(): Promise<void> {
  logger.info('🚀 Starting RAG Documentation Memory System (Vercel-native)');
  
  try {
    // Initialize RAG Pipeline
    const ragPipeline = createRAGPipeline({
      sourceDir: process.cwd(),
      enableFileWatching: true,
      enableIncrementalUpdates: true,
      autoStart: true
    });

    // Setup event listeners
    ragPipeline.on('pipelineStarted', () => {
      logger.info('📚 RAG Pipeline started successfully');
    });

    ragPipeline.on('processingStarted', (progress) => {
      logger.info('🔄 Document processing started', { stage: progress.stage });
    });

    ragPipeline.on('progressUpdated', (progress) => {
      logger.info('📊 Processing progress', {
        stage: progress.stage,
        progress: `${progress.processed}/${progress.total}`,
        currentFile: progress.currentFile
      });
    });

    ragPipeline.on('processingCompleted', (progress) => {
      logger.info('✅ Document processing completed', {
        totalProcessed: progress.processed,
        errors: progress.errors.length,
        processingTime: Date.now() - progress.startTime.getTime()
      });
    });

    ragPipeline.on('processingFailed', ({ progress, error }) => {
      logger.error('❌ Document processing failed', {
        stage: progress.stage,
        processed: progress.processed,
        error
      });
    });

    ragPipeline.on('watcherStarted', () => {
      logger.info('👀 File watcher started - monitoring for changes');
    });

    ragPipeline.on('fileChanged', (event) => {
      logger.info('📝 File change detected', {
        type: event.type,
        file: event.fileName
      });
    });

    // Start the pipeline
    await ragPipeline.start();
    
    logger.info('🎉 RAG system initialized successfully');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down RAG system...');
      await ragPipeline.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Failed to initialize RAG system:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined 
    });
    process.exit(1);
  }
}

/**
 * Test RAG Pipeline operations
 */
async function testRAGPipeline(): Promise<void> {
  logger.info('🧪 Testing RAG Pipeline operations');
  
  try {
    // Create test pipeline with limited scope
    const testPipeline = createRAGPipeline({
      sourceDir: process.cwd(),
      enableFileWatching: false,
      enableIncrementalUpdates: false,
      autoStart: false,
      batchSize: 5
    });

    // Test basic pipeline functionality
    await testPipeline.start();
    
    logger.info('✅ RAG Pipeline started successfully');

    // Get pipeline stats
    const stats = testPipeline.getStats();
    logger.info('✅ Pipeline stats retrieved', stats);

    // Stop the pipeline
    await testPipeline.stop();
    
    logger.info('✅ RAG Pipeline stopped successfully');
    logger.info('🎉 All RAG Pipeline operations tested successfully');

  } catch (error) {
    logger.error('❌ RAG Pipeline operations test failed:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined 
    });
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      testRAGPipeline()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'init':
    default:
      initializeRAGSystem();
      break;
  }
}