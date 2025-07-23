/**
 * Template System Factory
 *
 * Use context7: Factory for creating configured template systems
 * Following All-Purpose Pattern: Configurable factory that works with ANY project setup
 */
import { TemplateLoader } from './TemplateLoader.js';
import { logger } from '../utils/logger.js';
/**
 * Create a fully configured template system
 */
export async function createTemplateSystem(config = {}) {
    logger.info('Creating template system', { config });
    try {
        // Create template engine with loader
        const engine = await TemplateLoader.create(config.loader);
        // Update default context if provided
        if (config.projectContext) {
            const currentEngine = engine; // Access private members for configuration
            currentEngine.defaultContext = {
                ...currentEngine.defaultContext,
                project: {
                    ...currentEngine.defaultContext?.project,
                    ...config.projectContext
                }
            };
        }
        logger.info('Template system created successfully', {
            templatesLoaded: engine.getRegistry().getStatistics().totalTemplates
        });
        return engine;
    }
    catch (error) {
        logger.error('Failed to create template system', {
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}
/**
 * Create a template system with anti-pattern detection integration
 */
export async function createIntegratedTemplateSystem(projectRoot, config = {}) {
    const engine = await createTemplateSystem({
        ...config,
        projectContext: {
            root: projectRoot,
            ...config.projectContext
        }
    });
    // Helper function for generating replacements
    const generateReplacement = async (detectionResult, additionalContext = {}) => {
        return engine.generateReplacementForPattern(detectionResult, additionalContext);
    };
    return {
        engine,
        generateReplacement
    };
}
/**
 * Quick setup for common project types
 */
export async function createQuickTemplateSystem(projectType, projectRoot = process.cwd()) {
    const configs = {
        react: {
            projectContext: {
                framework: 'react',
                language: 'typescript',
                root: projectRoot
            }
        },
        vue: {
            projectContext: {
                framework: 'vue',
                language: 'typescript',
                root: projectRoot
            }
        },
        angular: {
            projectContext: {
                framework: 'angular',
                language: 'typescript',
                root: projectRoot
            }
        },
        node: {
            projectContext: {
                framework: 'node',
                language: 'typescript',
                root: projectRoot
            }
        },
        generic: {
            projectContext: {
                framework: 'vanilla',
                language: 'javascript',
                root: projectRoot
            }
        }
    };
    const config = configs[projectType] || configs.generic;
    return createTemplateSystem(config);
}
//# sourceMappingURL=factory.js.map