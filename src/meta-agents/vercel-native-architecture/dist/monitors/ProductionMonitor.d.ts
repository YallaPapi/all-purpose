/**
 * Production Monitor - Monitors Vercel deployments in production
 *
 * Provides unlimited monitoring capabilities with no hardcoded limitations
 * Following All-Purpose Pattern: NO limits on monitoring complexity
 */
import { EventEmitter } from 'events';
import { VercelNativeConfig } from '../types/index.js';
export declare class ProductionMonitor extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: VercelNativeConfig);
    initialize(): Promise<void>;
    /**
     * Configure monitoring for architecture design
     */
    configureMonitoring(design: any, requirements?: any): Promise<any>;
    private generateAnalyticsConfiguration;
    private generateSpeedInsightsConfiguration;
    private generateLogConfiguration;
    private generateAlertConfiguration;
    private generatePerformanceMetrics;
}
export default ProductionMonitor;
//# sourceMappingURL=ProductionMonitor.d.ts.map