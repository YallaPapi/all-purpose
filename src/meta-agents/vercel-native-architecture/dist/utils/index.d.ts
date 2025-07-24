/**
 * Utility Functions for Vercel-Native Architecture Agent
 *
 * Provides unlimited utility capabilities with no hardcoded limitations
 * Following All-Purpose Pattern: NO limits on utility complexity
 */
import { VercelNativeConfig, VercelArchitecture } from '../types/index.js';
/**
 * Validate Vercel configuration
 */
export declare function validateVercelConfig(config: VercelNativeConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * Optimize Vercel configuration for production
 */
export declare function optimizeVercelConfiguration(config: VercelNativeConfig): VercelNativeConfig;
/**
 * Generate Vercel project structure
 */
export declare function generateVercelProjectStructure(outputDirectory: string, architecture: VercelArchitecture): Promise<{
    success: boolean;
    structure: any;
}>;
/**
 * Create Vercel deployment package
 */
export declare function createVercelDeploymentPackage(architecture: VercelArchitecture, options?: any): Promise<{
    success: boolean;
    package: any;
}>;
/**
 * Generate random deployment ID
 */
export declare function generateDeploymentId(): string;
/**
 * Generate project configuration hash
 */
export declare function generateConfigHash(config: any): string;
/**
 * Validate project structure
 */
export declare function validateProjectStructure(projectPath: string): Promise<{
    valid: boolean;
    issues: string[];
}>;
declare const _default: {
    validateVercelConfig: typeof validateVercelConfig;
    optimizeVercelConfiguration: typeof optimizeVercelConfiguration;
    generateVercelProjectStructure: typeof generateVercelProjectStructure;
    createVercelDeploymentPackage: typeof createVercelDeploymentPackage;
    generateDeploymentId: typeof generateDeploymentId;
    generateConfigHash: typeof generateConfigHash;
    validateProjectStructure: typeof validateProjectStructure;
};
export default _default;
//# sourceMappingURL=index.d.ts.map