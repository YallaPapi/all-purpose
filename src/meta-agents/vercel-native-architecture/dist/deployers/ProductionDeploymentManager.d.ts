/**
 * Production Deployment Manager - Manages production deployments to Vercel
 *
 * Handles unlimited complexity production deployment pipelines
 * Following All-Purpose Pattern: NO hardcoded limitations on deployment strategies
 */
import { EventEmitter } from 'events';
import { VercelNativeConfig, VercelArchitecture, DeploymentResult } from '../types/index.js';
export declare class ProductionDeploymentManager extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: VercelNativeConfig);
    initialize(): Promise<void>;
    /**
     * Deploy architecture to Vercel production
     */
    deployArchitecture(architecture: VercelArchitecture, options: any): Promise<DeploymentResult>;
    /**
     * Create deployment configuration
     */
    createDeploymentConfiguration(design: any, strategy?: string): Promise<any>;
}
export default ProductionDeploymentManager;
//# sourceMappingURL=ProductionDeploymentManager.d.ts.map