/**
 * Pattern Registry
 * 
 * Central registry for managing all pattern detectors
 * Following All-Purpose Pattern: NO hardcoded limitations on detector types
 * Context7-enhanced with dynamic detector management and configuration
 */

import { 
  PatternDetector, 
  PatternRegistry as IPatternRegistry, 
  PatternDetectorConfig 
} from './types';

// Import all available detectors
import { HardcodedArrayDetector } from './detectors/HardcodedArrayDetector';
import { LimitationConstantDetector } from './detectors/LimitationConstantDetector';
import { ConditionalLogicDetector } from './detectors/ConditionalLogicDetector';
import { HardcodedEndpointDetector } from './detectors/HardcodedEndpointDetector';
import { HardcodedUITextDetector } from './detectors/HardcodedUITextDetector';

export interface PatternRegistryConfig {
  autoRegisterBuiltins?: boolean;
  enabledByDefault?: boolean;
  defaultSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  defaultConfidence?: number;
  allowDuplicateNames?: boolean;
  validateDetectors?: boolean;
}

/**
 * Central registry for pattern detectors - manages unlimited detector types
 * Provides registration, configuration, and retrieval of all pattern detectors
 */
export class PatternRegistry implements IPatternRegistry {
  private detectors: Map<string, PatternDetector> = new Map();
  private nodeTypeIndex: Map<string, Set<string>> = new Map();
  private config: PatternRegistryConfig;

  constructor(config: PatternRegistryConfig = {}) {
    this.config = {
      autoRegisterBuiltins: true,
      enabledByDefault: true,
      defaultSeverity: 'medium',
      defaultConfidence: 0.8,
      allowDuplicateNames: false,
      validateDetectors: true,
      ...config
    };

    // Auto-register built-in detectors if enabled
    if (this.config.autoRegisterBuiltins) {
      this.registerBuiltinDetectors();
    }
  }

  /**
   * Register a pattern detector
   * Following All-Purpose Pattern: Accepts ANY detector implementation
   */
  register(detector: PatternDetector): void {
    if (!detector || !detector.name) {
      throw new Error('Detector must have a valid name');
    }

    // Validate detector if enabled
    if (this.config.validateDetectors) {
      this.validateDetector(detector);
    }

    // Check for duplicate names if not allowed
    if (!this.config.allowDuplicateNames && this.detectors.has(detector.name)) {
      throw new Error(`Detector with name '${detector.name}' is already registered`);
    }

    // Register the detector
    this.detectors.set(detector.name, detector);

    // Update node type index for fast lookups
    this.updateNodeTypeIndex(detector);

    console.debug(`Registered pattern detector: ${detector.name} v${detector.version}`);
  }

  /**
   * Unregister a pattern detector by name
   */
  unregister(name: string): void {
    const detector = this.detectors.get(name);
    if (!detector) {
      console.warn(`Detector '${name}' not found for unregistration`);
      return;
    }

    // Remove from main registry
    this.detectors.delete(name);

    // Remove from node type index
    this.removeFromNodeTypeIndex(detector);

    console.debug(`Unregistered pattern detector: ${name}`);
  }

  /**
   * Get a specific detector by name
   */
  get(name: string): PatternDetector | undefined {
    return this.detectors.get(name);
  }

  /**
   * Get all registered detectors
   * Returns copy to prevent external modification
   */
  getAll(): PatternDetector[] {
    return Array.from(this.detectors.values());
  }

  /**
   * Get all detectors that support a specific node type
   * Optimized for fast lookups during AST traversal
   */
  getByNodeType(nodeType: string): PatternDetector[] {
    const detectorNames = this.nodeTypeIndex.get(nodeType);
    if (!detectorNames) {
      return [];
    }

    const detectors: PatternDetector[] = [];
    for (const name of detectorNames) {
      const detector = this.detectors.get(name);
      if (detector) {
        detectors.push(detector);
      }
    }

    return detectors;
  }

  /**
   * Configure a specific detector
   */
  configure(detectorName: string, config: PatternDetectorConfig): void {
    const detector = this.detectors.get(detectorName);
    if (!detector) {
      throw new Error(`Detector '${detectorName}' not found`);
    }

    detector.configure(config);
    console.debug(`Configured detector: ${detectorName}`);
  }

  /**
   * Configure multiple detectors at once
   * Following All-Purpose Pattern: Accepts ANY detector configurations
   */
  configureAll(configs: Record<string, PatternDetectorConfig>): void {
    for (const [detectorName, config] of Object.entries(configs)) {
      try {
        this.configure(detectorName, config);
      } catch (error) {
        console.warn(`Failed to configure detector '${detectorName}':`, error);
      }
    }
  }

  /**
   * Get enabled detectors only
   */
  getEnabled(): PatternDetector[] {
    return this.getAll().filter(detector => {
      const config = detector.getConfiguration();
      return config.enabled !== false;
    });
  }

  /**
   * Get detectors by severity level
   */
  getBySeverity(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): PatternDetector[] {
    return this.getAll().filter(detector => {
      const config = detector.getConfiguration();
      return config.severity === severity;
    });
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalDetectors: number;
    enabledDetectors: number;
    disabledDetectors: number;
    detectorsByType: Record<string, number>;
    supportedNodeTypes: string[];
    averageConfidence: number;
  } {
    const all = this.getAll();
    const enabled = this.getEnabled();
    
    const detectorsByType: Record<string, number> = {};
    let totalConfidence = 0;

    all.forEach(detector => {
      const config = detector.getConfiguration();
      const severity = config.severity || 'medium';
      detectorsByType[severity] = (detectorsByType[severity] || 0) + 1;
      totalConfidence += config.confidence || 0.8;
    });

    return {
      totalDetectors: all.length,
      enabledDetectors: enabled.length,
      disabledDetectors: all.length - enabled.length,
      detectorsByType,
      supportedNodeTypes: Array.from(this.nodeTypeIndex.keys()),
      averageConfidence: all.length > 0 ? totalConfidence / all.length : 0
    };
  }

  /**
   * Enable all detectors
   */
  enableAll(): void {
    this.getAll().forEach(detector => {
      detector.configure({ enabled: true });
    });
  }

  /**
   * Disable all detectors
   */
  disableAll(): void {
    this.getAll().forEach(detector => {
      detector.configure({ enabled: false });
    });
  }

  /**
   * Enable detectors by severity
   */
  enableBySeverity(severities: ('critical' | 'high' | 'medium' | 'low' | 'info')[]): void {
    this.getAll().forEach(detector => {
      const config = detector.getConfiguration();
      const severity = config.severity || 'medium';
      detector.configure({ enabled: severities.includes(severity) });
    });
  }

  /**
   * Reset all detectors to default configuration
   */
  resetAll(): void {
    this.getAll().forEach(detector => {
      detector.configure({
        enabled: this.config.enabledByDefault,
        severity: this.config.defaultSeverity,
        confidence: this.config.defaultConfidence
      });
    });
  }

  /**
   * Export registry configuration
   */
  exportConfiguration(): Record<string, PatternDetectorConfig> {
    const configs: Record<string, PatternDetectorConfig> = {};
    
    this.getAll().forEach(detector => {
      configs[detector.name] = detector.getConfiguration();
    });

    return configs;
  }

  /**
   * Import registry configuration
   */
  importConfiguration(configs: Record<string, PatternDetectorConfig>): void {
    this.configureAll(configs);
  }

  /**
   * Clone registry with same configuration
   */
  clone(): PatternRegistry {
    const clonedRegistry = new PatternRegistry(this.config);
    
    // Clone all detectors (assuming they're stateless)
    this.getAll().forEach(detector => {
      try {
        clonedRegistry.register(detector);
        clonedRegistry.configure(detector.name, detector.getConfiguration());
      } catch (error) {
        console.warn(`Failed to clone detector '${detector.name}':`, error);
      }
    });

    return clonedRegistry;
  }

  /**
   * Register all built-in detectors
   * Following All-Purpose Pattern: Registers ALL available detectors
   */
  private registerBuiltinDetectors(): void {
    const builtinDetectors = [
      new HardcodedArrayDetector(),
      new LimitationConstantDetector(),
      new ConditionalLogicDetector(),
      new HardcodedEndpointDetector(),
      new HardcodedUITextDetector()
    ];

    builtinDetectors.forEach(detector => {
      try {
        this.register(detector);
        
        // Apply default configuration
        detector.configure({
          enabled: this.config.enabledByDefault,
          severity: this.config.defaultSeverity,
          confidence: this.config.defaultConfidence
        });
      } catch (error) {
        console.warn(`Failed to register builtin detector '${detector.name}':`, error);
      }
    });

    console.debug(`Registered ${builtinDetectors.length} built-in pattern detectors`);
  }

  /**
   * Validate a detector implementation
   */
  private validateDetector(detector: PatternDetector): void {
    const requiredProperties = ['name', 'description', 'version', 'supportedNodeTypes'];
    
    for (const prop of requiredProperties) {
      if (!(prop in detector) || !detector[prop as keyof PatternDetector]) {
        throw new Error(`Detector is missing required property: ${prop}`);
      }
    }

    const requiredMethods = ['detect', 'configure', 'getConfiguration', 'validateNode'];
    
    for (const method of requiredMethods) {
      if (typeof detector[method as keyof PatternDetector] !== 'function') {
        throw new Error(`Detector is missing required method: ${method}`);
      }
    }

    // Validate supported node types
    if (!Array.isArray(detector.supportedNodeTypes) || detector.supportedNodeTypes.length === 0) {
      throw new Error('Detector must specify at least one supported node type');
    }
  }

  /**
   * Update node type index for fast lookups
   */
  private updateNodeTypeIndex(detector: PatternDetector): void {
    detector.supportedNodeTypes.forEach(nodeType => {
      if (!this.nodeTypeIndex.has(nodeType)) {
        this.nodeTypeIndex.set(nodeType, new Set());
      }
      this.nodeTypeIndex.get(nodeType)!.add(detector.name);
    });
  }

  /**
   * Remove detector from node type index
   */
  private removeFromNodeTypeIndex(detector: PatternDetector): void {
    detector.supportedNodeTypes.forEach(nodeType => {
      const detectorSet = this.nodeTypeIndex.get(nodeType);
      if (detectorSet) {
        detectorSet.delete(detector.name);
        
        // Clean up empty sets
        if (detectorSet.size === 0) {
          this.nodeTypeIndex.delete(nodeType);
        }
      }
    });
  }
}

/**
 * Default pattern registry instance with all built-in detectors
 * Ready to use out of the box - follows All-Purpose Pattern
 */
export const defaultPatternRegistry = new PatternRegistry({
  autoRegisterBuiltins: true,
  enabledByDefault: true,
  defaultSeverity: 'high',
  defaultConfidence: 0.8,
  allowDuplicateNames: false,
  validateDetectors: true
});

/**
 * Create a custom registry with specific configuration
 */
export function createPatternRegistry(config?: PatternRegistryConfig): PatternRegistry {
  return new PatternRegistry(config);
}

/**
 * Factory function to create registry with only specific detector types
 */
export function createRegistryWithDetectors(detectorNames: string[]): PatternRegistry {
  const registry = new PatternRegistry({ autoRegisterBuiltins: false });
  
  const detectorMap = {
    'HardcodedArrayDetector': HardcodedArrayDetector,
    'LimitationConstantDetector': LimitationConstantDetector,
    'ConditionalLogicDetector': ConditionalLogicDetector,
    'HardcodedEndpointDetector': HardcodedEndpointDetector,
    'HardcodedUITextDetector': HardcodedUITextDetector
  };

  detectorNames.forEach(name => {
    const DetectorClass = detectorMap[name as keyof typeof detectorMap];
    if (DetectorClass) {
      registry.register(new DetectorClass());
    } else {
      console.warn(`Unknown detector type: ${name}`);
    }
  });

  return registry;
}