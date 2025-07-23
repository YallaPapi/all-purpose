/**
 * Five Document Framework Agent - Type Definitions
 *
 * Following All-Purpose Pattern: NO hardcoded limitations
 * Supports UNLIMITED project types and configurations
 */
export interface ProjectConfig {
    name?: string;
    version?: string;
    description?: string;
    type?: string;
    technologies?: {
        frontend?: string[];
        backend?: string[];
        database?: string[];
        deployment?: string[];
        testing?: string[];
        [key: string]: string[] | undefined;
    };
    environments?: {
        development?: EnvironmentConfig;
        staging?: EnvironmentConfig;
        production?: EnvironmentConfig;
        [envName: string]: EnvironmentConfig | undefined;
    };
    integrations?: {
        apis?: ApiIntegration[];
        databases?: DatabaseIntegration[];
        services?: ServiceIntegration[];
        [key: string]: Integration[] | undefined;
    };
    documentation?: {
        style?: 'technical' | 'business' | 'hybrid' | string;
        audience?: string[];
        includeExamples?: boolean;
        includeTroubleshooting?: boolean;
        customSections?: DocumentSection[];
        [key: string]: any;
    };
    [key: string]: any;
}
export interface EnvironmentConfig {
    url?: string;
    variables?: Record<string, string>;
    requirements?: string[];
    setupSteps?: string[];
    verificationSteps?: string[];
    [key: string]: any;
}
export interface Integration {
    name: string;
    type: string;
    url?: string;
    version?: string;
    configuration?: Record<string, any>;
    [key: string]: any;
}
export interface ApiIntegration extends Integration {
    endpoints?: string[];
    authentication?: string;
    rateLimits?: Record<string, any>;
}
export interface DatabaseIntegration extends Integration {
    connectionString?: string;
    migrations?: boolean;
    backup?: boolean;
}
export interface ServiceIntegration extends Integration {
    region?: string;
    scaling?: Record<string, any>;
    monitoring?: boolean;
}
export interface DocumentSection {
    title: string;
    content: string;
    order?: number;
    required?: boolean;
    template?: string;
    variables?: Record<string, any>;
}
export interface DocumentGenerationConfig {
    documents?: {
        changelog?: boolean;
        environmentSetup?: boolean;
        debuggingGuide?: boolean;
        parameterMapping?: boolean;
        taskMasterReadme?: boolean;
        [documentName: string]: boolean | undefined;
    };
    outputDir?: string;
    templateDir?: string;
    overwriteExisting?: boolean;
    backupExisting?: boolean;
    validateConsistency?: boolean;
    customTemplates?: Record<string, string>;
    templateVariables?: Record<string, any>;
    integrateWithTaskMaster?: boolean;
    integrateWithRAG?: boolean;
    integrateWithGit?: boolean;
    [key: string]: any;
}
export interface DocumentGenerationResult {
    success: boolean;
    documentsGenerated: DocumentResult[];
    errors: GenerationError[];
    warnings: string[];
    performance: {
        totalTime: number;
        documentsProcessed: number;
        templatesUsed: number;
    };
}
export interface DocumentResult {
    documentType: string;
    filePath: string;
    templateUsed: string;
    variablesApplied: Record<string, any>;
    size: number;
    checksum?: string;
    lastModified: Date;
}
export interface GenerationError {
    documentType: string;
    error: string;
    severity: 'error' | 'warning' | 'info';
    suggestion?: string;
    filePath?: string;
}
export interface ConsistencyCheck {
    crossReferences: CrossReferenceCheck[];
    parameterMappings: ParameterMappingCheck[];
    versionConsistency: VersionConsistencyCheck;
    formatConsistency: FormatConsistencyCheck[];
}
export interface CrossReferenceCheck {
    sourceDocument: string;
    targetDocument: string;
    referenceType: string;
    isValid: boolean;
    suggestion?: string;
}
export interface ParameterMappingCheck {
    parameter: string;
    mappedIn: string[];
    missingFrom: string[];
    inconsistencies: string[];
}
export interface VersionConsistencyCheck {
    packageJson?: string;
    changelog?: string;
    environmentSetup?: string;
    isConsistent: boolean;
    suggestions: string[];
}
export interface FormatConsistencyCheck {
    document: string;
    format: 'markdown' | 'json' | 'yaml' | string;
    isValid: boolean;
    issues: string[];
}
export interface TemplateContext {
    project: ProjectConfig;
    generation: DocumentGenerationConfig;
    timestamp: Date;
    version: string;
    helpers: {
        formatDate: (date: Date) => string;
        capitalize: (str: string) => string;
        slugify: (str: string) => string;
        joinArray: (arr: string[], separator?: string) => string;
        hasProperty: (obj: any, prop: string) => boolean;
        [helperName: string]: (...args: any[]) => any;
    };
    computed: {
        hasEnvironments: boolean;
        hasIntegrations: boolean;
        hasCustomSections: boolean;
        technologyList: string[];
        environmentList: string[];
        [key: string]: any;
    };
    [key: string]: any;
}
export interface FiveDocumentFrameworkConfig {
    projectConfig: ProjectConfig;
    generationConfig: DocumentGenerationConfig;
    templateDir?: string;
    outputDir?: string;
    validateConsistency?: boolean;
    onDocumentGenerated?: (result: DocumentResult) => void;
    onError?: (error: GenerationError) => void;
    onComplete?: (result: DocumentGenerationResult) => void;
    [eventName: string]: ((...args: any[]) => void) | any;
}
export interface MetaAgentIntegration {
    prdParser?: {
        enabled: boolean;
        parseRequirements: boolean;
        extractTechnologies: boolean;
    };
    scaffoldGenerator?: {
        enabled: boolean;
        updateOnScaffold: boolean;
        templateSync: boolean;
    };
    infrastructureOrchestrator?: {
        enabled: boolean;
        complianceChecks: boolean;
        templateGeneration: boolean;
    };
    allPurposePattern?: {
        enabled: boolean;
        antiPatternDetection: boolean;
        universalityValidation: boolean;
    };
    [agentName: string]: {
        enabled: boolean;
        [option: string]: any;
    } | undefined;
}
