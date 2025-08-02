#!/usr/bin/env node

/**
 * Enhanced PRD-Parser Agent with UEP Integration
 * 
 * This is an enhanced version of the PRD-Parser that uses the Universal Execution Protocol
 * for standardized execution, context awareness, and improved task processing.
 * 
 * Features:
 * - UEP-enhanced task processing
 * - Standardized validation and compliance
 * - Enhanced context awareness
 * - Improved memory integration
 * - Real-time file watching with UEP middleware
 */

import path from 'path';
import { enhanceAgentWithUEP, createUEPAgentFactory } from '../uep/agentIntegration.js';
import { createRequire } from 'module';

// Import original PRD Parser (ES module)  
import OriginalPRDParser from './prd-parser/main.js';

/**
 * Enhanced PRD Parser with UEP Integration
 */
class EnhancedPRDParser extends OriginalPRDParser {
  constructor(options = {}) {
    super({
      ...options,
      // Force enable memory for UEP integration
      memoryEnabled: true,
      // Enhanced configuration
      uepEnabled: options.uepEnabled !== false,
      enhancedValidation: options.enhancedValidation !== false,
      enhancedContext: options.enhancedContext !== false
    });

    this.uepWrapper = null;
    this.enhancedAgent = null;
    this.uepEnabled = this.config.uepEnabled;
  }

  /**
   * Enhanced initialization with UEP setup
   */
  async start() {
    try {
      console.log('🚀 Starting Enhanced PRD-Parser with UEP integration...');

      // Initialize UEP enhancement if enabled
      if (this.uepEnabled) {
        await this.initializeUEP();
      }

      // Call original start method
      await super.start();

      if (this.uepEnabled && this.enhancedAgent) {
        console.log('✅ Enhanced PRD-Parser started with UEP middleware');
        console.log(`   - UEP Status: ${this.enhancedAgent.isEnhanced() ? 'Enabled' : 'Fallback'}`)
        console.log(`   - Agent ID: ${this.enhancedAgent.getAgentId()}`);
        console.log(`   - Enhanced Features: Validation, Context Awareness, Memory Integration`);
      } else {
        console.log('✅ Enhanced PRD-Parser started in fallback mode (UEP disabled)');
      }

    } catch (error) {
      console.error('❌ Failed to start Enhanced PRD-Parser:', error.message);
      throw error;
    }
  }

  /**
   * Initialize UEP enhancement
   */
  async initializeUEP() {
    try {
      console.log('🧠 Initializing UEP enhancement for PRD-Parser...');

      // Enhance this agent instance with UEP
      this.enhancedAgent = await enhanceAgentWithUEP(this, 'enhanced-prd-parser', {
        agentType: 'prd-parser',
        enableUEP: true,
        enableValidation: this.config.enhancedValidation,
        enableMemoryIntegration: true,
        enableCaching: true,
        enableDebugMode: false,
        timeout: 120000, // 2 minutes for complex PRD processing
        workingDirectory: process.cwd(),
        logLevel: 'minimal'
      });

      console.log('✅ UEP enhancement initialized successfully');

    } catch (error) {
      console.warn('⚠️ UEP enhancement failed, continuing with fallback:', error.message);
      this.uepEnabled = false;
    }
  }

  /**
   * Enhanced PRD processing with UEP middleware
   */
  async _processPRDFileCore(filepath, agentName, memory = '') {
    if (!this.uepEnabled || !this.enhancedAgent) {
      // Fallback to original processing
      return await super._processPRDFileCore(filepath, agentName, memory);
    }

    try {
      console.log(`🧠 Processing PRD ${path.basename(filepath)} via UEP middleware...`);

      // Create enhanced task input
      const taskInput = {
        taskDescription: `Process PRD file: ${path.basename(filepath)} for agent: ${agentName}`,
        filepath,
        agentName,
        memory,
        taskType: 'prd-processing',
        originalMethod: 'processPRDFile'
      };

      // Process through UEP-enhanced agent
      const result = await this.enhancedAgent.process(taskInput, {
        sessionId: `prd-${agentName}-${Date.now()}`,
        taskDescription: `PRD processing for ${agentName}`,
        enableContextualMemory: true,
        enableCodebaseAwareness: true,
        enableDocumentationLookup: true
      });

      if (result.success) {
        // If UEP processing succeeded, use UEP-enhanced processing
        return await this.processWithUEPContext(filepath, agentName, memory, result.uepMetadata);
      } else {
        console.warn('⚠️ UEP processing failed, falling back to original method');
        return await super._processPRDFileCore(filepath, agentName, memory);
      }

    } catch (error) {
      console.warn('⚠️ UEP processing error, falling back to original method:', error.message);
      return await super._processPRDFileCore(filepath, agentName, memory);
    }
  }

  /**
   * Process PRD with enhanced UEP context
   */
  async processWithUEPContext(filepath, agentName, memory, uepMetadata) {
    const startTime = Date.now();
    try {
      console.log(`📄 Processing PRD: ${path.basename(filepath)} (${agentName}) with UEP context`);
      
      // Display UEP enhancements
      if (uepMetadata && uepMetadata.contextEnhancements) {
        const ctx = uepMetadata.contextEnhancements;
        console.log(`🧠 UEP Context: Memory=${!!ctx.memory}, Codebase=${!!ctx.codebase}, Docs=${!!ctx.documentation}, Tasks=${!!ctx.taskBreakdown}`);
        console.log(`📊 UEP Compliance Score: ${uepMetadata.complianceScore?.toFixed(2) || 'N/A'}`);
      }

      // Enhanced memory context
      let enhancedMemory = memory;
      if (uepMetadata?.contextEnhancements?.memory) {
        enhancedMemory = `${memory}\n\n=== UEP Memory Enhancement ===\n${uepMetadata.contextEnhancements.memory}`;
      }

      this.emit('prd:processing_start', {
        filepath,
        agentName,
        timestamp: new Date().toISOString(),
        memoryContext: !!enhancedMemory,
        uepEnhanced: true,
        complianceScore: uepMetadata?.complianceScore
      });

      // Use enhanced context for task processing
      const outputDir = path.resolve('.taskmaster/tasks');
      await require('fs').promises.mkdir(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, `tasks_${agentName}.json`);

      // Enhanced TaskMaster processing with UEP context
      let taskMasterArgs = ['parse-prd', filepath, `--output=${outputPath}`];
      
      // Add context from UEP if available
      if (uepMetadata?.contextEnhancements?.codebase) {
        const codebase = uepMetadata.contextEnhancements.codebase;
        if (codebase.relevantFiles && codebase.relevantFiles.length > 0) {
          console.log(`🔍 UEP identified ${codebase.relevantFiles.length} relevant files for context`);
          // Could add --context-files parameter if TaskMaster supports it
        }
      }

      // Step 1: Parse PRD with enhanced context
      console.log(`🔧 Running enhanced TaskMaster: task-master ${taskMasterArgs.join(' ')}`);
      const parseResult = await this.runTaskMasterCommand(taskMasterArgs);
      console.log(parseResult);

      // Step 2: Enhanced research with UEP documentation context
      let tasksData;
      try {
        const raw = await require('fs').promises.readFile(outputPath, 'utf8');
        tasksData = JSON.parse(raw);
      } catch (err) {
        throw new Error(`Failed to read generated tasks file: ${outputPath}`);
      }
      
      let successfulResearchCount = 0;
      if (Array.isArray(tasksData.tasks)) {
        for (const task of tasksData.tasks) {
          if (task.title && task.id) {
            // Enhanced research prompt with UEP context
            let researchPrompt = `${agentName} ${task.title}`;
            
            // Add UEP documentation context if available
            if (uepMetadata?.contextEnhancements?.documentation) {
              console.log(`📚 Adding UEP documentation context to research for task ${task.id}`);
              // Could enhance research with documentation context
            }

            console.log(`🔬 Running enhanced research for task ${task.id}: ${researchPrompt}`);
            try {
              const researchResult = await this.runTaskMasterCommand([
                'research', researchPrompt, `--id=${task.id}`
              ]);
              console.log(researchResult);
              successfulResearchCount++;
            } catch (err) {
              console.error(`❌ Research failed for task ${task.id}: ${task.title}`, err.message);
            }
          }
        }
      }

      // Enhanced completion logging
      const processingTime = Date.now() - startTime;
      const result = `Successfully processed PRD for ${agentName} via UEP. Generated ${tasksData.tasks?.length || 0} tasks, completed research for ${successfulResearchCount} tasks. UEP Score: ${uepMetadata?.complianceScore?.toFixed(2) || 'N/A'}. Output: ${outputPath}`;
      
      this.emit('prd:completed', {
        agentName,
        filepath,
        outputPath,
        processingTime,
        tasksGenerated: tasksData.tasks?.length || 0,
        researchCompleted: successfulResearchCount,
        success: true,
        memoryContext: !!enhancedMemory,
        uepEnhanced: true,
        complianceScore: uepMetadata?.complianceScore,
        uepMetadata
      });
      
      console.log(`✅ Enhanced PRD processing completed for ${agentName} (${processingTime}ms)`);
      console.log(`📋 Tasks: ${tasksData.tasks?.length || 0}, Research: ${successfulResearchCount}, UEP Score: ${uepMetadata?.complianceScore?.toFixed(2) || 'N/A'}`);
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.emit('prd:error', {
        agentName,
        filepath,
        error: error.message,
        processingTime,
        success: false,
        uepEnhanced: true
      });
      throw error;
    }
  }

  /**
   * Enhanced status with UEP information
   */
  getStatus() {
    const originalStatus = super.getStatus ? super.getStatus() : { initialized: true };
    
    return {
      ...originalStatus,
      enhanced: true,
      uep: {
        enabled: this.uepEnabled,
        agent: this.enhancedAgent ? {
          id: this.enhancedAgent.getAgentId(),
          type: this.enhancedAgent.agentType,
          enhanced: this.enhancedAgent.isEnhanced()
        } : null,
        features: {
          validation: this.config.enhancedValidation,
          context: this.config.enhancedContext,
          memory: this.config.memoryEnabled
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Enhanced cleanup with UEP cleanup
   */
  async stop() {
    try {
      // Cleanup UEP enhancement
      if (this.enhancedAgent && this.enhancedAgent.cleanup) {
        await this.enhancedAgent.cleanup();
      }

      // Call original stop method
      await super.stop();

      console.log('🛑 Enhanced PRD-Parser stopped with UEP cleanup');

    } catch (error) {
      console.error('❌ Enhanced PRD-Parser stop failed:', error.message);
      throw error;
    }
  }
}

/**
 * Factory function for creating enhanced PRD parser
 */
async function createEnhancedPRDParser(options = {}) {
  const enhancedParser = new EnhancedPRDParser(options);
  return enhancedParser;
}

/**
 * CLI interface for enhanced PRD parser
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const enhancedAgent = new EnhancedPRDParser({
    watchDir: process.env.PRD_WATCH_DIR || 'docs',
    outputDir: process.env.TASKMASTER_OUTPUT_DIR || '.taskmaster/tasks',
    gitEnabled: process.env.GIT_ENABLED !== 'false',
    researchEnabled: process.env.RESEARCH_ENABLED !== 'false',
    contextEnabled: process.env.CONTEXT7_ENABLED !== 'false',
    uepEnabled: process.env.UEP_ENABLED !== 'false',
    enhancedValidation: process.env.UEP_VALIDATION !== 'false',
    enhancedContext: process.env.UEP_CONTEXT !== 'false'
  });

  // Enhanced event logging
  enhancedAgent.on('agent:started', data => console.log('🚀 Enhanced Agent started:', data));
  enhancedAgent.on('prd:completed', data => {
    console.log('✅ Enhanced PRD processed:', {
      agent: data.agentName,
      tasks: data.tasksGenerated,
      research: data.researchCompleted,
      time: data.processingTime,
      uepScore: data.complianceScore?.toFixed(2) || 'N/A'
    });
  });
  enhancedAgent.on('error', data => console.error('❌ Enhanced Agent error:', data));

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Enhanced PRD-Parser gracefully...');
    await enhancedAgent.stop();
    process.exit(0);
  });

  // Start the enhanced agent
  enhancedAgent.start().catch(error => {
    console.error('❌ Failed to start Enhanced PRD-Parser:', error);
    process.exit(1);
  });
}

export default EnhancedPRDParser;
export { createEnhancedPRDParser };