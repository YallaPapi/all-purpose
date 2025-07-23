/**
 * Template System Factory
 *
 * Use context7: Factory for creating configured template systems
 * Following All-Purpose Pattern: Configurable factory that works with ANY project setup
 */
import { TemplateEngine } from './TemplateEngine.js';
import { TemplateLoaderConfig } from './TemplateLoader.js';
import { TemplateEngineConfig } from './TemplateEngine.js';
export interface TemplateSystemConfig {
    loader?: TemplateLoaderConfig;
    engine?: Omit<TemplateEngineConfig, 'registry'>;
    projectContext?: {
        name?: string;
        root?: string;
        language?: 'typescript' | 'javascript';
        framework?: string;
    };
}
/**
 * Create a fully configured template system
 */
export declare function createTemplateSystem(config?: TemplateSystemConfig): Promise<TemplateEngine>;
/**
 * Create a template system with anti-pattern detection integration
 */
export declare function createIntegratedTemplateSystem(projectRoot: string, config?: TemplateSystemConfig): Promise<{
    engine: TemplateEngine;
    generateReplacement: (detectionResult: any, additionalContext?: any) => Promise<any>;
}>;
/**
 * Quick setup for common project types
 */
export declare function createQuickTemplateSystem(projectType: 'react' | 'vue' | 'angular' | 'node' | 'generic', projectRoot?: string): Promise<TemplateEngine>;
//# sourceMappingURL=factory.d.ts.map