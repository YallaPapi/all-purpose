/**
 * Template Generation Types
 *
 * Use context7: Base types for Universal Template Generation System
 * Following All-Purpose Pattern: Configurable templates that work with ANY codebase structure
 */
import Handlebars from 'handlebars';
export interface TemplateMetadata {
    id: string;
    name: string;
    description: string;
    category: 'hardcoded-array' | 'limitation-constant' | 'conditional-logic' | 'hardcoded-endpoint' | 'hardcoded-ui-text' | 'generic';
    version: string;
    author?: string;
    created: Date;
    updated: Date;
    tags?: string[];
}
export interface Template {
    metadata: TemplateMetadata;
    source: string;
    compiled?: Handlebars.TemplateDelegate;
    dependencies?: string[];
    examples?: TemplateExample[];
}
export interface TemplateExample {
    name: string;
    description: string;
    context: Record<string, any>;
    expectedOutput: string;
}
export interface TemplateContext {
    config?: Record<string, any>;
    userInputs?: Record<string, any>;
    detectionResult?: {
        filePath: string;
        lineNumber: number;
        columnNumber: number;
        originalCode: string;
        patternType: string;
        metadata?: Record<string, any>;
    };
    project?: {
        name: string;
        root: string;
        packageJson?: Record<string, any>;
        framework?: string;
        language: 'typescript' | 'javascript';
    };
    [key: string]: any;
}
export interface GenerationResult {
    success: boolean;
    generatedCode: string;
    metadata: {
        templateId: string;
        templateVersion: string;
        generationTime: number;
        contextUsed: Record<string, any>;
    };
    errors?: string[];
    warnings?: string[];
}
export interface TemplateValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions?: string[];
}
export interface TemplateRegistryConfig {
    baseTemplatesPath?: string;
    autoReload?: boolean;
    cacheCompiledTemplates?: boolean;
    strictMode?: boolean;
    customHelpers?: Record<string, Function>;
}
export interface HandlebarsHelper {
    name: string;
    helper: Function;
    description: string;
    usage: string;
    examples?: Array<{
        template: string;
        context: Record<string, any>;
        output: string;
    }>;
}
//# sourceMappingURL=types.d.ts.map