/**
 * Dynamic System Builder - Core system architecture designer
 *
 * Designs complete dynamic template system architectures from requirements
 * Following All-Purpose Pattern: NO hardcoded limitations on system complexity
 */
import { EventEmitter } from 'events';
import { TemplateEngineFactoryConfig, SystemGenerationRequest } from '../types/index.js';
export declare class DynamicSystemBuilder extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: TemplateEngineFactoryConfig);
    initialize(): Promise<void>;
    /**
     * Design complete system architecture from requirements
     */
    designArchitecture(request: SystemGenerationRequest, analysis: any): Promise<any>;
    /**
     * Validate architecture design
     */
    validateArchitecture(architecture: any): Promise<boolean>;
    /**
     * Optimize architecture for performance and scalability
     */
    optimizeArchitecture(architecture: any): Promise<any>;
}
export default DynamicSystemBuilder;
//# sourceMappingURL=DynamicSystemBuilder.d.ts.map