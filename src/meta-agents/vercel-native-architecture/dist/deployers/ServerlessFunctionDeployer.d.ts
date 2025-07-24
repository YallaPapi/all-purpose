/**
 * Serverless Function Deployer - Deploys serverless functions to Vercel
 *
 * Creates and deploys unlimited complexity serverless function systems
 * Following All-Purpose Pattern: NO hardcoded limitations on function deployment
 */
import { EventEmitter } from 'events';
import { VercelNativeConfig, ApiFunction, EdgeFunction, CronFunction, MiddlewareFunction } from '../types/index.js';
export declare class ServerlessFunctionDeployer extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: VercelNativeConfig);
    initialize(): Promise<void>;
    /**
     * Build all function types from design and specifications
     */
    buildFunctions(design: any, functionSpecs?: any): Promise<{
        apiFunctions: ApiFunction[];
        edgeFunctions: EdgeFunction[];
        cronFunctions: CronFunction[];
        middlewareFunctions: MiddlewareFunction[];
    }>;
    /**
     * Build API functions for serverless deployment
     */
    private buildApiFunctions;
    /**
     * Build Edge functions for global deployment
     */
    private buildEdgeFunctions;
    /**
     * Build Cron functions for scheduled tasks
     */
    private buildCronFunctions;
    /**
     * Build Middleware functions for request/response processing
     */
    private buildMiddlewareFunctions;
    /**
     * Code generation methods
     */
    private generateFunctionCode;
    private generateEdgeFunctionCode;
    private generateCronFunctionCode;
    private generateMiddlewareFunctionCode;
    /**
     * Code templates
     */
    private generateApiFunctionTemplate;
    private generateEdgeFunctionTemplate;
    private generateCronFunctionTemplate;
    private generateMiddlewareTemplate;
    /**
     * Helper methods
     */
    private generateDefaultApiFunctions;
    private selectOptimalRuntime;
    private calculateOptimalTimeout;
    private calculateOptimalMemory;
    private calculateMaxDuration;
    private selectOptimalRegions;
    private calculateOptimalConcurrency;
    private buildDatabaseConnections;
    private buildKVConnections;
    private buildBlobConnections;
    private buildQueueConnections;
    private buildExternalApiConnections;
    private buildAlertRules;
}
export default ServerlessFunctionDeployer;
//# sourceMappingURL=ServerlessFunctionDeployer.d.ts.map