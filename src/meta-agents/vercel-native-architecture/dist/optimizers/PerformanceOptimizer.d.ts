/**
 * Performance Optimizer - Optimizes Vercel deployments for maximum performance
 *
 * Applies unlimited performance optimizations with no hardcoded limitations
 * Following All-Purpose Pattern: NO limits on optimization complexity
 */
import { EventEmitter } from 'events';
import { VercelNativeConfig, OptimizationResult } from '../types/index.js';
export declare class PerformanceOptimizer extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: VercelNativeConfig);
    initialize(): Promise<void>;
    /**
     * Apply performance optimizations to architecture design
     */
    applyOptimizations(design: any, requirements?: any): Promise<any>;
    /**
     * Optimize existing deployment
     */
    optimizeDeployment(deployment: any, options: any): Promise<OptimizationResult>;
    private generateBuildOptimizations;
    private generateRuntimeOptimizations;
    private generateCDNConfiguration;
    private generateCacheStrategies;
    private generateCompressionSettings;
}
export default PerformanceOptimizer;
//# sourceMappingURL=PerformanceOptimizer.d.ts.map