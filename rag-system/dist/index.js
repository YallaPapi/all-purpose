"use strict";
/**
 * RAG System Entry Point
 *
 * Main entry point for the RAG Documentation Memory System
 * Following All-Purpose Pattern: Configurable for ANY project context
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Use context7: Load environment variables FIRST before any other imports
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables immediately
dotenv_1.default.config();
const logger_1 = require("./utils/logger");
const ragPipeline_1 = require("./integration/ragPipeline");
/**
 * Initialize and test the RAG system
 */
async function initializeRAGSystem() {
    logger_1.logger.info('🚀 Starting RAG Documentation Memory System (Vercel-native)');
    try {
        // Use context7: Validate required environment variables first
        const requiredEnvVars = ['OPENAI_API_KEY', 'UPSTASH_VECTOR_REST_URL', 'UPSTASH_VECTOR_REST_TOKEN'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        logger_1.logger.info('✅ Environment variables validated');
        // Initialize RAG Pipeline to process main project documentation
        const ragPipeline = (0, ragPipeline_1.createRAGPipeline)({
            sourceDir: path_1.default.join(process.cwd(), '..'), // Point to main all-purpose project
            enableFileWatching: true,
            enableIncrementalUpdates: true,
            autoStart: true
        });
        // Setup event listeners
        ragPipeline.on('pipelineStarted', () => {
            logger_1.logger.info('📚 RAG Pipeline started successfully');
        });
        ragPipeline.on('processingStarted', (progress) => {
            logger_1.logger.info('🔄 Document processing started', { stage: progress.stage });
        });
        ragPipeline.on('progressUpdated', (progress) => {
            logger_1.logger.info('📊 Processing progress', {
                stage: progress.stage,
                progress: `${progress.processed}/${progress.total}`,
                currentFile: progress.currentFile
            });
        });
        ragPipeline.on('processingCompleted', (progress) => {
            logger_1.logger.info('✅ Document processing completed', {
                totalProcessed: progress.processed,
                errors: progress.errors.length,
                processingTime: Date.now() - progress.startTime.getTime()
            });
        });
        ragPipeline.on('processingFailed', ({ progress, error }) => {
            logger_1.logger.error('❌ Document processing failed', {
                stage: progress.stage,
                processed: progress.processed,
                error
            });
        });
        ragPipeline.on('watcherStarted', () => {
            logger_1.logger.info('👀 File watcher started - monitoring for changes');
        });
        ragPipeline.on('fileChanged', (event) => {
            logger_1.logger.info('📝 File change detected', {
                type: event.type,
                file: event.fileName
            });
        });
        // Start the pipeline
        await ragPipeline.start();
        logger_1.logger.info('🎉 RAG system initialized successfully');
        // Keep the process running
        process.on('SIGINT', async () => {
            logger_1.logger.info('🛑 Shutting down RAG system...');
            await ragPipeline.stop();
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to initialize RAG system:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        process.exit(1);
    }
}
/**
 * Test RAG Pipeline operations
 */
async function testRAGPipeline() {
    logger_1.logger.info('🧪 Testing RAG Pipeline operations');
    try {
        // Create test pipeline with limited scope
        const testPipeline = (0, ragPipeline_1.createRAGPipeline)({
            sourceDir: process.cwd(),
            enableFileWatching: false,
            enableIncrementalUpdates: false,
            autoStart: false,
            batchSize: 5
        });
        // Test basic pipeline functionality
        await testPipeline.start();
        logger_1.logger.info('✅ RAG Pipeline started successfully');
        // Get pipeline stats
        const stats = testPipeline.getStats();
        logger_1.logger.info('✅ Pipeline stats retrieved', stats);
        // Stop the pipeline
        await testPipeline.stop();
        logger_1.logger.info('✅ RAG Pipeline stopped successfully');
        logger_1.logger.info('🎉 All RAG Pipeline operations tested successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ RAG Pipeline operations test failed:', {
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
//# sourceMappingURL=index.js.map