/**
 * Template Engine Factory Agent - Type Definitions
 * 
 * The CODE BUILDER for Dynamic Systems
 * Following All-Purpose Pattern: NO hardcoded limitations on content types or use cases
 */

import type { EventEmitter } from 'events';

// ==================== CORE CONFIGURATION ====================

export interface TemplateEngineFactoryConfig {
  // Core settings
  projectRoot?: string;
  outputDirectory?: string;
  templateDirectory?: string;
  
  // Template engines - ALL supported, no limitations
  supportedEngines?: ('mustache' | 'handlebars' | 'custom')[];
  defaultEngine?: 'mustache' | 'handlebars' | 'custom';
  
  // Code generation settings
  codeGeneration?: {
    targetLanguage?: 'typescript' | 'javascript' | 'both';
    outputFormat?: 'esm' | 'cjs' | 'both';
    includeTypes?: boolean;
    includeTests?: boolean;
    includeDocumentation?: boolean;
  };
  
  // Dynamic system settings - UNLIMITED configurations
  dynamicSystems?: {
    contextTypes?: string[]; // NO hardcoded limitations
    variationStrategies?: string[]; // UNLIMITED strategies
    fallbackPatterns?: string[]; // UNLIMITED patterns
    validationRules?: string[]; // UNLIMITED rules
  };
  
  // Integration settings
  integration?: {
    allPurposePatternAgent?: boolean;
    infrastructureOrchestrator?: boolean;
    fiveDocumentFramework?: boolean;
    context7Integration?: boolean;
    ragSystemIntegration?: boolean;
  };
  
  // Performance and scaling - NO limitations
  performance?: {
    maxConcurrentGenerations?: number | 'unlimited';
    maxTemplateSize?: number | 'unlimited';
    maxOutputFiles?: number | 'unlimited';
    cacheStrategy?: 'memory' | 'disk' | 'distributed' | 'custom';
  };
  
  // Custom configurations - UNLIMITED extensibility
  customConfiguration?: Record<string, any>;
  pluginConfiguration?: Record<string, any>;
  advancedSettings?: Record<string, any>;
}

// ==================== TEMPLATE SYSTEM TYPES ====================

export interface DynamicTemplateSystem {
  systemId: string;
  name: string;
  description: string;
  version: string;
  
  // System architecture
  architecture: {
    templateEngine: 'mustache' | 'handlebars' | 'custom';
    contextProcessor: string;
    variationGenerator: string;
    fallbackHandler: string;
    validationEngine: string;
  };
  
  // Generated components
  components: {
    templateFiles: GeneratedTemplateFile[];
    contextProcessors: GeneratedContextProcessor[];
    variationGenerators: GeneratedVariationGenerator[];
    fallbackHandlers: GeneratedFallbackHandler[];
    validationEngines: GeneratedValidationEngine[];
    integrationLayerUnits: GeneratedIntegrationUnit[];
  };
  
  // System capabilities - UNLIMITED
  capabilities: {
    supportedContextTypes: string[];
    supportedVariations: string[];
    supportedFallbacks: string[];
    supportedValidations: string[];
    customCapabilities: Record<string, any>;
  };
  
  // Performance characteristics
  performance: {
    expectedRenderTime: number;
    maxConcurrentRenders: number | 'unlimited';
    memoryUsage: string;
    scalabilityFactors: string[];
  };
  
  // Integration points
  integrations: {
    allPurposePatternCompliance: boolean;
    context7Integration: boolean;
    ragSystemCompatible: boolean;
    metaAgentCoordination: Record<string, any>;
  };
}

export interface GeneratedTemplateFile {
  filePath: string;
  fileName: string;
  templateEngine: string;
  content: string;
  contextSchema: Record<string, any>;
  variationSupport: string[];
  fallbackTemplates: string[];
  metadata: {
    generatedBy: string;
    timestamp: string;
    version: string;
    dependencies: string[];
    customMetadata: Record<string, any>;
  };
}

export interface GeneratedContextProcessor {
  processorId: string;
  name: string;
  filePath: string;
  sourceCode: string;
  supportedContextTypes: string[];
  processingRules: ContextProcessingRule[];
  transformationChain: string[];
  validationSchema: Record<string, any>;
  performance: {
    avgProcessingTime: number;
    maxContextSize: number | 'unlimited';
  };
}

export interface GeneratedVariationGenerator {
  generatorId: string;
  name: string;
  filePath: string;
  sourceCode: string;
  variationStrategies: VariationStrategy[];
  supportedParameters: string[];
  outputFormats: string[];
  customizationOptions: Record<string, any>;
}

export interface GeneratedFallbackHandler {
  handlerId: string;
  name: string;
  filePath: string;
  sourceCode: string;
  fallbackStrategies: FallbackStrategy[];
  triggerConditions: string[];
  recoveryPatterns: string[];
  escalationPaths: string[];
}

export interface GeneratedValidationEngine {
  engineId: string;
  name: string;
  filePath: string;
  sourceCode: string;
  validationRules: ValidationRule[];
  supportedSchemas: string[];
  errorHandling: ErrorHandlingStrategy[];
  performanceOptimizations: string[];
}

export interface GeneratedIntegrationUnit {
  unitId: string;
  name: string;
  filePath: string;
  sourceCode: string;
  integrationType: 'meta-agent' | 'external-api' | 'context7' | 'rag-system' | 'custom';
  integrationPoints: string[];
  communicationProtocol: string;
  dataTransformations: string[];
}

// ==================== PROCESSING TYPES ====================

export interface ContextProcessingRule {
  ruleId: string;
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  processingLogic: string;
  conditions: string[];
  transformations: string[];
  validations: string[];
}

export interface VariationStrategy {
  strategyId: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  algorithmType: string;
  implementationCode: string;
  supportedContexts: string[];
  outputFormats: string[];
}

export interface FallbackStrategy {
  strategyId: string;
  name: string;
  description: string;
  triggerConditions: string[];
  fallbackAction: string;
  recoveryProcedure: string;
  escalationRules: string[];
  successCriteria: string[];
}

export interface ValidationRule {
  ruleId: string;
  name: string;
  description: string;
  validationType: 'schema' | 'semantic' | 'business' | 'custom';
  validationLogic: string;
  errorMessages: Record<string, string>;
  severity: 'error' | 'warning' | 'info';
  autoCorrection?: string;
}

export interface ErrorHandlingStrategy {
  strategyId: string;
  name: string;
  errorTypes: string[];
  handlingProcedure: string;
  recoveryActions: string[];
  loggingLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  userNotification?: string;
}

// ==================== GENERATION RESULTS ====================

export interface SystemGenerationResult {
  success: boolean;
  systemId: string;
  generatedSystem: DynamicTemplateSystem;
  
  // Generation details
  generation: {
    startTime: Date;
    endTime: Date;
    duration: number;
    filesGenerated: number;
    linesOfCode: number;
    componentsCreated: number;
  };
  
  // Quality metrics
  quality: {
    codeQualityScore: number;
    testCoverage: number;
    performanceScore: number;
    maintainabilityScore: number;
    allPurposePatternCompliance: number;
  };
  
  // Integration results
  integrations: {
    metaAgentConnections: string[];
    context7Integration: boolean;
    ragSystemCompatibility: boolean;
    externalApiIntegrations: string[];
  };
  
  // Warnings and errors
  warnings: GenerationWarning[];
  errors: GenerationError[];
  recommendations: string[];
  
  // Deployment information
  deployment: {
    readyForProduction: boolean;
    deploymentInstructions: string[];
    environmentRequirements: string[];
    scalingConsiderations: string[];
  };
}

export interface GenerationWarning {
  warningId: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  component: string;
  suggestion: string;
  autoFixAvailable: boolean;
}

export interface GenerationError {
  errorId: string;
  severity: 'recoverable' | 'fatal';
  message: string;
  component: string;
  stackTrace?: string;
  resolution: string;
  prevention: string;
}

// ==================== AGENT CAPABILITIES ====================

export interface TemplateEngineFactoryCapabilities {
  name: string;
  version: string;
  
  // Core capabilities
  coreCapabilities: {
    templateEngines: string[];
    codeGeneration: string[];
    dynamicSystems: string[];
    integrationTypes: string[];
  };
  
  // System generation capabilities - UNLIMITED
  systemGeneration: {
    maxComplexity: 'unlimited';
    supportedPatterns: string[];
    supportedArchitectures: string[];
    supportedDeployments: string[];
  };
  
  // Integration capabilities
  integrations: {
    metaAgentFactory: boolean;
    allPurposePattern: boolean;
    context7: boolean;
    ragSystem: boolean;
    externalApis: string[];
  };
  
  // Performance capabilities - NO limitations
  performance: {
    maxConcurrentSystems: 'unlimited';
    maxSystemComplexity: 'unlimited';
    maxOutputSize: 'unlimited';
    scalingSupport: string[];
  };
  
  // Extensibility - UNLIMITED
  extensibility: {
    customTemplateEngines: boolean;
    customGenerators: boolean;
    customIntegrations: boolean;
    pluginSupport: boolean;
    apiExtensions: string[];
  };
}

// ==================== OPERATION TYPES ====================

export interface SystemGenerationRequest {
  requestId: string;
  systemName: string;
  description: string;
  
  // System specification
  specification: {
    templateEngine: 'mustache' | 'handlebars' | 'custom';
    contentTypes: string[];
    contextTypes: string[];
    variationRequirements: string[];
    fallbackRequirements: string[];
    validationRequirements: string[];
  };
  
  // Integration requirements
  integrationRequirements: {
    metaAgents: string[];
    externalSystems: string[];
    context7Integration: boolean;
    ragSystemCompatible: boolean;
  };
  
  // Quality requirements
  qualityRequirements: {
    performanceTargets: Record<string, any>;
    scalabilityTargets: Record<string, any>;
    maintainabilityTargets: Record<string, any>;
    testingRequirements: string[];
  };
  
  // Custom requirements - UNLIMITED
  customRequirements: Record<string, any>;
  advancedOptions: Record<string, any>;
}

export interface TemplateAnalysisResult {
  analysisId: string;
  templatePath: string;
  templateContent: string;
  
  // Analysis results
  analysis: {
    templateEngine: string;
    contextVariables: string[];
    dynamicElements: string[];
    hardcodedElements: string[];
    complexityScore: number;
    optimizationOpportunities: string[];
  };
  
  // Conversion recommendations
  recommendations: {
    suggestedTemplateEngine: string;
    suggestedVariations: string[];
    suggestedFallbacks: string[];
    suggestedValidations: string[];
    estimatedEffort: string;
  };
  
  // All-Purpose Pattern analysis
  allPurposeAnalysis: {
    complianceScore: number;
    violations: string[];
    improvements: string[];
    unlimitedScalabilityScore: number;
  };
}

// ==================== EVENT TYPES ====================

export interface TemplateEngineFactoryEvents {
  'agent:initialized': { capabilities: TemplateEngineFactoryCapabilities; timestamp: string };
  'agent:error': { error: string; component?: string; timestamp: string };
  
  'system:generation:started': { requestId: string; systemName: string; timestamp: string };
  'system:generation:progress': { requestId: string; progress: number; currentStep: string; timestamp: string };
  'system:generation:completed': { requestId: string; result: SystemGenerationResult; timestamp: string };
  'system:generation:failed': { requestId: string; error: string; timestamp: string };
  
  'template:analysis:started': { templatePath: string; timestamp: string };
  'template:analysis:completed': { templatePath: string; result: TemplateAnalysisResult; timestamp: string };
  
  'integration:connected': { integrationType: string; status: string; timestamp: string };
  'integration:error': { integrationType: string; error: string; timestamp: string };
  
  'quality:check:completed': { systemId: string; qualityScore: number; timestamp: string };
  'performance:benchmark:completed': { systemId: string; benchmarkResults: Record<string, any>; timestamp: string };
}

// ==================== META-AGENT INTEGRATION ====================

export interface MetaAgentIntegration {
  agentId: string;
  agentName: string;
  integrationType: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  
  // Communication interfaces
  interfaces: {
    inputInterface: string;
    outputInterface: string;
    eventInterface: string;
    coordinationInterface: string;
  };
  
  // Data sharing
  dataSharing: {
    sharedDataTypes: string[];
    sharingProtocol: string;
    dataTransformations: string[];
    synchronizationRules: string[];
  };
  
  // Workflow coordination
  workflow: {
    coordinationPatterns: string[];
    dependencyRules: string[];
    executionOrder: string[];
    errorHandling: string[];
  };
}

// ==================== EXPORT DEFAULT ====================

export default TemplateEngineFactoryConfig;