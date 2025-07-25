/**
 * Universal Execution Protocol - Validation Engine
 * 
 * Compliance checker that enforces protocol requirements and fallback logic.
 * Implements the validation matrix from the UEP specification.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { z } from 'zod';
import { 
  UniversalExecutionRequest, 
  ValidationResult, 
  ValidationEngine as IValidationEngine,
  TaskMasterResult,
  CodebaseContext,
  DocumentationResult
} from './ProtocolProcessor';

// Validation matrix configuration
export interface ValidationMatrixEntry {
  component: 'TaskMaster' | 'Context7' | 'Memory' | 'RAG' | 'Protocol';
  conditions: {
    requesterType?: 'agent' | 'human' | 'both';
    taskComplexity?: 'low' | 'medium' | 'high';
    contextRequired?: boolean;
    memoryRequired?: boolean;
  };
  requirement: 'required' | 'optional' | 'forbidden';
  fallbacks: {
    action: 'proceed' | 'warn' | 'block' | 'substitute';
    alternative?: string;
    message: string;
  };
}

// Default validation matrix based on UEP specification
const DEFAULT_VALIDATION_MATRIX: ValidationMatrixEntry[] = [
  {
    component: 'TaskMaster',
    conditions: { requesterType: 'both', taskComplexity: 'high' },
    requirement: 'required',
    fallbacks: {
      action: 'warn',
      alternative: 'Basic task execution without breakdown',
      message: 'TaskMaster unavailable - proceeding without task breakdown'
    }
  },
  {
    component: 'TaskMaster',
    conditions: { requesterType: 'both', taskComplexity: 'medium' },
    requirement: 'optional',
    fallbacks: {
      action: 'proceed',
      message: 'TaskMaster optional for medium complexity tasks'
    }
  },
  {
    component: 'TaskMaster',
    conditions: { requesterType: 'both', taskComplexity: 'low' },
    requirement: 'optional',
    fallbacks: {
      action: 'proceed',
      message: 'TaskMaster optional for low complexity tasks'
    }
  },
  {
    component: 'Context7',
    conditions: { requesterType: 'both', contextRequired: true },
    requirement: 'required',
    fallbacks: {
      action: 'warn',
      alternative: 'Manual context gathering required',
      message: 'Context7 unavailable - manual codebase review required'
    }
  },
  {
    component: 'Context7',
    conditions: { requesterType: 'both', contextRequired: false },
    requirement: 'optional',
    fallbacks: {
      action: 'proceed',
      message: 'Context7 optional for this task type'
    }
  },
  {
    component: 'Memory',
    conditions: { requesterType: 'agent', memoryRequired: true },
    requirement: 'required',
    fallbacks: {
      action: 'block',
      message: 'Working memory required for agent tasks - cannot proceed'
    }
  },
  {
    component: 'Memory',
    conditions: { requesterType: 'human', memoryRequired: false },
    requirement: 'optional',
    fallbacks: {
      action: 'proceed',
      message: 'Working memory optional for human tasks'
    }
  },
  {
    component: 'RAG',
    conditions: { requesterType: 'both' },
    requirement: 'optional',
    fallbacks: {
      action: 'warn',
      alternative: 'Manual documentation lookup',
      message: 'RAG unavailable - manual documentation review recommended'
    }
  },
  {
    component: 'Protocol',
    conditions: { requesterType: 'both' },
    requirement: 'required',
    fallbacks: {
      action: 'block',
      message: 'Protocol validation failed - execution blocked'
    }
  }
];

/**
 * Task complexity analyzer
 */
export class TaskComplexityAnalyzer {
  
  static analyzeComplexity(taskDescription: string, context?: any): 'low' | 'medium' | 'high' {
    const indicators = {
      high: [
        'implement', 'build', 'create system', 'architecture', 'database',
        'integration', 'migration', 'refactor', 'multiple files', 'complex',
        'framework', 'api', 'authentication', 'security', 'performance'
      ],
      medium: [
        'update', 'modify', 'enhance', 'add feature', 'fix bug', 'configure',
        'test', 'document', 'review', 'optimize', 'single file'
      ],
      low: [
        'read', 'check', 'view', 'list', 'show', 'display', 'find',
        'search', 'explain', 'understand', 'simple'
      ]
    };

    const description = taskDescription.toLowerCase();
    
    // Check for high complexity indicators
    if (indicators.high.some(indicator => description.includes(indicator))) {
      return 'high';
    }
    
    // Check for medium complexity indicators
    if (indicators.medium.some(indicator => description.includes(indicator))) {
      return 'medium';
    }
    
    // Default to low for simple tasks
    return 'low';
  }

  static requiresContext(taskDescription: string): boolean {
    const contextIndicators = [
      'file', 'function', 'class', 'component', 'module', 'existing',
      'current', 'modify', 'update', 'integrate', 'refactor', 'codebase'
    ];
    
    return contextIndicators.some(indicator => 
      taskDescription.toLowerCase().includes(indicator)
    );
  }

  static requiresMemory(requesterType: 'agent' | 'human'): boolean {
    // Agents always need memory for context continuity
    // Humans may or may not need memory depending on task
    return requesterType === 'agent';
  }
}

/**
 * Validation Engine Implementation
 */
export class ValidationEngine implements IValidationEngine {
  private validationMatrix: ValidationMatrixEntry[];
  private config: ValidationConfig;

  constructor(
    matrix: ValidationMatrixEntry[] = DEFAULT_VALIDATION_MATRIX,
    config: Partial<ValidationConfig> = {}
  ) {
    this.validationMatrix = matrix;
    this.config = {
      enableStrictMode: false,
      logValidationDetails: true,
      allowOverrides: true,
      enableComplexityAnalysis: true,
      ...config
    };
  }

  /**
   * Main validation entry point
   */
  async validateExecution(
    request: UniversalExecutionRequest, 
    results: {
      taskBreakdown?: TaskMasterResult;
      codebase?: CodebaseContext;
      documentation?: DocumentationResult[];
      memory?: string;
    }
  ): Promise<ValidationResult[]> {
    const validationResults: ValidationResult[] = [];

    try {
      // Analyze task complexity and requirements
      const complexity = TaskComplexityAnalyzer.analyzeComplexity(request.taskDescription, request.context);
      const requiresContext = TaskComplexityAnalyzer.requiresContext(request.taskDescription);
      const requiresMemory = TaskComplexityAnalyzer.requiresMemory(request.requesterType);

      if (this.config.logValidationDetails) {
        console.log(`🔍 UEP Validation: Task complexity: ${complexity}, Context required: ${requiresContext}, Memory required: ${requiresMemory}`);
      }

      // Validate each component against the matrix
      for (const matrixEntry of this.validationMatrix) {
        const validation = await this.validateComponent(
          matrixEntry,
          request,
          results,
          { complexity, requiresContext, requiresMemory }
        );
        
        if (validation) {
          validationResults.push(validation);
        }
      }

      // Additional protocol-level validations
      const protocolValidation = this.validateProtocolCompliance(request, results);
      if (protocolValidation) {
        validationResults.push(protocolValidation);
      }

      return validationResults;

    } catch (error) {
      return [{
        component: 'Protocol',
        required: true,
        present: false,
        result: 'error',
        message: `Validation engine failed: ${error.message}`
      }];
    }
  }

  /**
   * Validate individual component against matrix entry
   */
  private async validateComponent(
    matrixEntry: ValidationMatrixEntry,
    request: UniversalExecutionRequest,
    results: any,
    analysis: {
      complexity: 'low' | 'medium' | 'high';
      requiresContext: boolean;
      requiresMemory: boolean;
    }
  ): Promise<ValidationResult | null> {
    
    // Check if matrix entry applies to current conditions
    if (!this.matchesConditions(matrixEntry.conditions, request, analysis)) {
      return null; // Skip validation for non-matching conditions
    }

    const componentName = matrixEntry.component;
    const isRequired = matrixEntry.requirement === 'required';
    const isPresent = this.checkComponentPresence(componentName, request, results);
    const isOverridden = this.checkOverride(componentName, request);

    let result: ValidationResult['result'] = 'success';
    let message = `${componentName} validation passed`;
    let fallbackUsed: string | undefined;

    // Handle missing required components
    if (isRequired && !isPresent && !isOverridden) {
      const fallback = matrixEntry.fallbacks;
      
      switch (fallback.action) {
        case 'block':
          result = 'blocked';
          message = fallback.message;
          break;
        case 'warn':
          result = 'warning';
          message = fallback.message;
          fallbackUsed = fallback.alternative;
          break;
        case 'proceed':
          result = 'success';
          message = fallback.message;
          fallbackUsed = fallback.alternative;
          break;
        case 'substitute':
          result = 'success';
          message = `${fallback.message} - using ${fallback.alternative}`;
          fallbackUsed = fallback.alternative;
          break;
      }
    }

    // Handle overridden components
    if (isOverridden) {
      if (this.config.allowOverrides) {
        result = 'warning';
        message = `${componentName} validation skipped by override`;
      } else if (this.config.enableStrictMode) {
        result = 'blocked';
        message = `${componentName} override not allowed in strict mode`;
      }
    }

    // Handle forbidden components
    if (matrixEntry.requirement === 'forbidden' && isPresent) {
      result = 'error';
      message = `${componentName} is forbidden for this task type`;
    }

    return {
      component: componentName,
      required: isRequired,
      present: isPresent || isOverridden,
      fallbackUsed,
      result,
      message
    };
  }

  /**
   * Check if matrix conditions match current request
   */
  private matchesConditions(
    conditions: ValidationMatrixEntry['conditions'],
    request: UniversalExecutionRequest,
    analysis: {
      complexity: 'low' | 'medium' | 'high';
      requiresContext: boolean;
      requiresMemory: boolean;
    }
  ): boolean {
    
    // Check requester type
    if (conditions.requesterType && 
        conditions.requesterType !== 'both' && 
        conditions.requesterType !== request.requesterType) {
      return false;
    }

    // Check task complexity
    if (conditions.taskComplexity && conditions.taskComplexity !== analysis.complexity) {
      return false;
    }

    // Check context requirement
    if (conditions.contextRequired !== undefined && 
        conditions.contextRequired !== analysis.requiresContext) {
      return false;
    }

    // Check memory requirement
    if (conditions.memoryRequired !== undefined && 
        conditions.memoryRequired !== analysis.requiresMemory) {
      return false;
    }

    return true;
  }

  /**
   * Check if component is present in results
   */
  private checkComponentPresence(
    component: ValidationMatrixEntry['component'],
    request: UniversalExecutionRequest,
    results: any
  ): boolean {
    
    switch (component) {
      case 'TaskMaster':
        return !!results.taskBreakdown;
      case 'Context7':
        return !!results.codebase;
      case 'Memory':
        return !!results.memory || request.requesterType === 'human';
      case 'RAG':
        return !!results.documentation;
      case 'Protocol':
        return true; // Protocol is always present if we reach validation
      default:
        return false;
    }
  }

  /**
   * Check if component is overridden in request
   */
  private checkOverride(
    component: ValidationMatrixEntry['component'],
    request: UniversalExecutionRequest
  ): boolean {
    
    if (!request.overrides) return false;

    switch (component) {
      case 'TaskMaster':
        return !!request.overrides.skipTaskMaster;
      case 'Context7':
        return !!request.overrides.skipContext7;
      case 'Memory':
        return !!request.overrides.skipMemory;
      case 'RAG':
        return !!request.overrides.skipRAG;
      default:
        return false;
    }
  }

  /**
   * Validate overall protocol compliance
   */
  private validateProtocolCompliance(
    request: UniversalExecutionRequest,
    results: any
  ): ValidationResult | null {
    
    const errors: string[] = [];

    // Check minimum requirements
    if (!request.taskDescription || request.taskDescription.trim().length === 0) {
      errors.push('Task description is required');
    }

    if (!request.requesterType) {
      errors.push('Requester type is required');
    }

    // Check agent-specific requirements
    if (request.requesterType === 'agent' && !request.agentId) {
      errors.push('Agent ID is required for agent requests');
    }

    // Validate enhancement quality
    const componentCount = Object.keys(results).filter(key => results[key]).length;
    if (componentCount === 0) {
      errors.push('At least one enhancement component must be available');
    }

    if (errors.length > 0) {
      return {
        component: 'Protocol',
        required: true,
        present: false,
        result: 'error',
        message: `Protocol compliance failed: ${errors.join(', ')}`
      };
    }

    return {
      component: 'Protocol',
      required: true,
      present: true,
      result: 'success',
      message: 'Protocol compliance validated'
    };
  }

  /**
   * Update validation matrix (for dynamic configuration)
   */
  updateValidationMatrix(newMatrix: ValidationMatrixEntry[]): void {
    this.validationMatrix = newMatrix;
    
    if (this.config.logValidationDetails) {
      console.log(`🔧 UEP: Validation matrix updated with ${newMatrix.length} entries`);
    }
  }

  /**
   * Get current validation matrix
   */
  getValidationMatrix(): ValidationMatrixEntry[] {
    return [...this.validationMatrix];
  }
}

// Configuration interface
export interface ValidationConfig {
  enableStrictMode: boolean;
  logValidationDetails: boolean;
  allowOverrides: boolean;
  enableComplexityAnalysis: boolean;
}

// Factory function
export function createValidationEngine(
  matrix?: ValidationMatrixEntry[],
  config?: Partial<ValidationConfig>
): ValidationEngine {
  return new ValidationEngine(matrix, config);
}

// Export matrix for customization
export { DEFAULT_VALIDATION_MATRIX };