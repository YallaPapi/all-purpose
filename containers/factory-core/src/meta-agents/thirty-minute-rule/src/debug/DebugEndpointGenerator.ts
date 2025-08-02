/**
 * Debug Endpoint Generator - Automatic /api/debug endpoint creation
 * 
 * Generates debug endpoints for every component by:
 * 1. Analyzing project structure and identifying components
 * 2. Creating health check endpoints for each component
 * 3. Generating isolation test endpoints 
 * 4. Setting up alternative approach endpoints for fallback scenarios
 * 5. Providing systematic debugging procedures with component-specific insights
 * 
 * Following All-Purpose Pattern: NO hardcoded limitations on project types or frameworks
 */

import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { v4 as uuidv4 } from 'uuid';
import {
  ThirtyMinuteRuleConfig,
  ComponentInfo,
  DebugEndpointConfig,
  DebugEndpointGenerationResult,
  GenerationError,
  EndpointParameter
} from '../types/index.js';

export class DebugEndpointGenerator extends EventEmitter {
  private config: ThirtyMinuteRuleConfig;
  private discoveredComponents: Map<string, ComponentInfo> = new Map();
  private generatedEndpoints: Map<string, DebugEndpointConfig[]> = new Map();

  constructor(config: ThirtyMinuteRuleConfig) {
    super();
    
    this.config = {
      debugEndpointPort: config.debugEndpointPort || 3001,
      debugEndpointPrefix: config.debugEndpointPrefix || '/api/debug',
      autoGenerateEndpoints: config.autoGenerateEndpoints !== false,
      componentDiscoveryPatterns: config.componentDiscoveryPatterns || [
        '**/*.js',
        '**/*.ts',
        '**/*.jsx',
        '**/*.tsx',
        '**/*.vue',
        '**/*.py',
        '**/*.go',
        '**/*.java',
        '**/*.cs'
      ],
      ...config
    };
  }

  /**
   * Generate debug endpoints for entire project
   */
  async generateEndpoints(input?: {
    sourceDirectory?: string;
    outputDirectory?: string;
    componentFilter?: string[];
    endpointTypes?: ('health' | 'isolation' | 'fallback' | 'metrics')[];
    customConfiguration?: Record<string, any>;
  }): Promise<DebugEndpointGenerationResult> {
    const startTime = Date.now();
    
    try {
      this.emit('generation:start', {
        input,
        timestamp: new Date().toISOString()
      });

      const sourceDir = input?.sourceDirectory || process.cwd();
      const outputDir = input?.outputDirectory || path.join(sourceDir, 'debug-endpoints');
      
      console.log(`🔍 Analyzing project for components: ${sourceDir}`);

      // Step 1: Discover components in the project
      const components = await this.discoverComponents(sourceDir, input?.componentFilter);
      
      console.log(`📦 Found ${components.length} components`);

      // Step 2: Generate debug endpoints for each component
      const endpointsGenerated: DebugEndpointConfig[] = [];
      const errors: GenerationError[] = [];

      for (const component of components) {
        try {
          const componentEndpoints = await this.generateComponentEndpoints(
            component,
            input?.endpointTypes || ['health', 'isolation', 'fallback', 'metrics']
          );
          
          endpointsGenerated.push(...componentEndpoints);
          this.generatedEndpoints.set(component.componentId, componentEndpoints);
          
          console.log(`✅ Generated ${componentEndpoints.length} endpoints for: ${component.name}`);
          
        } catch (error: any) {
          const generationError: GenerationError = {
            component: component.name,
            error: error.message,
            severity: 'error',
            suggestion: `Check component structure and ensure required metadata is available`
          };
          errors.push(generationError);
          
          console.log(`❌ Failed to generate endpoints for: ${component.name} - ${error.message}`);
        }
      }

      // Step 3: Generate Express.js server code
      if (this.config.autoGenerateEndpoints && endpointsGenerated.length > 0) {
        await this.generateServerCode(outputDir, endpointsGenerated);
      }

      // Step 4: Generate endpoint documentation
      await this.generateEndpointDocumentation(outputDir, endpointsGenerated, components);

      const totalTime = Date.now() - startTime;
      
      const result: DebugEndpointGenerationResult = {
        success: errors.length === 0,
        endpointsGenerated,
        componentsAnalyzed: components,
        errors,
        warnings: this.generateWarnings(components, endpointsGenerated),
        performance: {
          totalTime,
          componentsProcessed: components.length,
          endpointsCreated: endpointsGenerated.length
        }
      };

      this.emit('generation:complete', {
        result,
        timestamp: new Date().toISOString()
      });

      console.log(`🎉 Debug endpoint generation complete in ${totalTime}ms`);
      console.log(`📊 Endpoints generated: ${endpointsGenerated.length}`);
      
      return result;

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      
      this.emit('generation:error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        endpointsGenerated: [],
        componentsAnalyzed: [],
        errors: [{
          error: error.message,
          severity: 'error'
        }],
        warnings: [],
        performance: {
          totalTime,
          componentsProcessed: 0,
          endpointsCreated: 0
        }
      };
    }
  }

  /**
   * Discover components in the project
   */
  private async discoverComponents(
    sourceDir: string,
    componentFilter?: string[]
  ): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = [];

    for (const pattern of this.config.componentDiscoveryPatterns!) {
      const files = await glob(pattern, {
        cwd: sourceDir,
        ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**', 'coverage/**']
      });

      for (const file of files) {
        try {
          const filePath = path.join(sourceDir, file);
          const component = await this.analyzeFileAsComponent(filePath, file);
          
          if (component && (!componentFilter || componentFilter.includes(component.name))) {
            components.push(component);
          }
          
        } catch (error) {
          console.warn(`⚠️  Failed to analyze component: ${file}`, error);
        }
      }
    }

    return this.deduplicateComponents(components);
  }

  /**
   * Analyze a file to extract component information
   */
  private async analyzeFileAsComponent(filePath: string, relativePath: string): Promise<ComponentInfo | null> {
    const content = await fs.readFile(filePath, 'utf8');
    const fileExt = path.extname(filePath);
    const fileName = path.basename(filePath, fileExt);

    // Skip files that are clearly not components
    if (this.shouldSkipFile(content, fileName)) {
      return null;
    }

    const componentId = uuidv4();
    const componentType = this.detectComponentType(content, fileExt);
    const dependencies = this.extractDependencies(content, fileExt);

    const component: ComponentInfo = {
      componentId,
      name: fileName,
      type: componentType,
      path: relativePath,
      dependencies,
      debugEndpoints: [],
      metadata: {
        framework: this.detectFramework(content, fileExt),
        language: this.detectLanguage(fileExt),
        testable: this.isTestable(content, fileExt),
        critical: this.isCriticalComponent(content, fileName),
        configuration: {}
      }
    };

    return component;
  }

  /**
   * Generate debug endpoints for a specific component
   */
  private async generateComponentEndpoints(
    component: ComponentInfo,
    endpointTypes: ('health' | 'isolation' | 'fallback' | 'metrics')[]
  ): Promise<DebugEndpointConfig[]> {
    const endpoints: DebugEndpointConfig[] = [];
    const basePrefix = this.config.debugEndpointPrefix!;
    const componentPath = component.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Health check endpoint
    if (endpointTypes.includes('health')) {
      endpoints.push({
        path: `${basePrefix}/${componentPath}/health`,
        method: 'GET',
        handler: 'healthCheckHandler',
        description: `Health check for ${component.name} component`,
        component: component.name,
        healthCheck: true,
        isolationTest: false,
        parameters: [],
        middleware: ['requestLogger'],
        authentication: false,
        rateLimit: 100
      });
    }

    // Isolation test endpoint
    if (endpointTypes.includes('isolation')) {
      endpoints.push({
        path: `${basePrefix}/${componentPath}/isolation`,
        method: 'POST',
        handler: 'isolationTestHandler',
        description: `Run isolation tests for ${component.name} component`,
        component: component.name,
        healthCheck: false,
        isolationTest: true,
        parameters: [
          {
            name: 'testType',
            type: 'string',
            required: false,
            description: 'Type of isolation test to run',
            defaultValue: 'all'
          },
          {
            name: 'mockDependencies',
            type: 'boolean',
            required: false,
            description: 'Whether to mock component dependencies',
            defaultValue: true
          }
        ],
        middleware: ['requestLogger', 'authCheck'],
        authentication: true,
        rateLimit: 10
      });
    }

    // Fallback mechanism endpoint
    if (endpointTypes.includes('fallback')) {
      endpoints.push({
        path: `${basePrefix}/${componentPath}/fallback`,
        method: 'POST',
        handler: 'fallbackHandler',
        description: `Execute fallback implementation for ${component.name}`,
        component: component.name,
        healthCheck: false,
        isolationTest: false,
        parameters: [
          {
            name: 'fallbackType',
            type: 'string',
            required: true,
            description: 'Type of fallback to execute',
            validation: 'alternative|cached|stub'
          },
          {
            name: 'parameters',
            type: 'object',
            required: false,
            description: 'Parameters for fallback execution',
            defaultValue: {}
          }
        ],
        middleware: ['requestLogger', 'authCheck'],
        authentication: true,
        rateLimit: 20
      });
    }

    // Metrics endpoint
    if (endpointTypes.includes('metrics')) {
      endpoints.push({
        path: `${basePrefix}/${componentPath}/metrics`,
        method: 'GET',
        handler: 'metricsHandler',
        description: `Get performance metrics for ${component.name} component`,
        component: component.name,
        healthCheck: false,
        isolationTest: false,
        parameters: [
          {
            name: 'timeRange',
            type: 'string',
            required: false,
            description: 'Time range for metrics (1h, 24h, 7d)',
            defaultValue: '1h'
          },
          {
            name: 'format',
            type: 'string',
            required: false,
            description: 'Response format (json, prometheus)',
            defaultValue: 'json'
          }
        ],
        middleware: ['requestLogger'],
        authentication: false,
        rateLimit: 50
      });
    }

    // Store endpoints in component metadata
    component.debugEndpoints = endpoints;

    return endpoints;
  }

  /**
   * Generate Express.js server code for debug endpoints
   */
  private async generateServerCode(
    outputDir: string,
    endpoints: DebugEndpointConfig[]
  ): Promise<void> {
    await fs.ensureDir(outputDir);

    // Generate main server file
    const serverCode = this.generateServerTemplate(endpoints);
    await fs.writeFile(path.join(outputDir, 'debug-server.js'), serverCode);

    // Generate individual handler files
    const handlersByComponent = this.groupEndpointsByComponent(endpoints);
    
    for (const [componentName, componentEndpoints] of handlersByComponent) {
      const handlerCode = this.generateHandlerTemplate(componentName, componentEndpoints);
      const handlerFileName = `${componentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-handlers.js`;
      await fs.writeFile(path.join(outputDir, handlerFileName), handlerCode);
    }

    // Generate package.json for debug server
    const packageJson = this.generatePackageJson();
    await fs.writeFile(path.join(outputDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    console.log(`📁 Debug server code generated in: ${outputDir}`);
  }

  /**
   * Generate server template
   */
  private generateServerTemplate(endpoints: DebugEndpointConfig[]): string {
    const handlerImports = Array.from(new Set(
      endpoints.map(e => e.component)
    )).map(component => {
      const fileName = component!.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `const ${component}Handlers = require('./${fileName}-handlers');`;
    }).join('\n');

    const routeRegistrations = endpoints.map(endpoint => {
      const handlerName = `${endpoint.component}Handlers.${endpoint.handler}`;
      const middlewareChain = endpoint.middleware ? 
        endpoint.middleware.map(m => `middleware.${m}`).join(', ') + ', ' : '';
      
      return `app.${endpoint.method.toLowerCase()}('${endpoint.path}', ${middlewareChain}${handlerName});`;
    }).join('\n');

    return `
const express = require('express');
const middleware = require('./middleware');

${handlerImports}

const app = express();
const port = ${this.config.debugEndpointPort};

// Global middleware
app.use(express.json());
app.use(middleware.cors);
app.use(middleware.requestLogger);

// Debug endpoints
${routeRegistrations}

// Error handling middleware
app.use(middleware.errorHandler);

// Health check for debug server itself
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'debug-endpoints',
    version: '1.0.0'
  });
});

app.listen(port, () => {
  console.log(\`🚀 Debug endpoints server running on port $\{port\}\`);
  console.log(\`📊 Total endpoints: ${endpoints.length}\`);
  console.log(\`🔍 Endpoint prefix: ${this.config.debugEndpointPrefix}\`);
});

module.exports = app;
`;
  }

  /**
   * Generate handler template for a component
   */
  private generateHandlerTemplate(componentName: string, endpoints: DebugEndpointConfig[]): string {
    const handlers = endpoints.map(endpoint => {
      const parameters = endpoint.parameters || [];
      const paramValidation = parameters.map(param => {
        return `
  // Validate ${param.name}
  if (${param.required ? `!req.body.${param.name}` : `req.body.${param.name} !== undefined`}) {
    ${param.required ? 
      `return res.status(400).json({ error: 'Missing required parameter: ${param.name}' });` :
      `// Optional parameter validation`
    }
  }`;
      }).join('\n');

      return `
/**
 * ${endpoint.description}
 */
async function ${endpoint.handler}(req, res) {
  try {
    const startTime = Date.now();
    ${paramValidation}

    // TODO: Implement actual ${endpoint.handler} logic for ${componentName}
    // This is a generated placeholder - replace with actual implementation
    
    const result = {
      component: '${componentName}',
      endpoint: '${endpoint.path}',
      status: 'success',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      data: ${endpoint.healthCheck ? 
        '{ healthy: true, checks: [] }' : 
        endpoint.isolationTest ? 
        '{ testsPassed: 0, testsFailed: 0, details: [] }' :
        '{ message: "Implementation placeholder" }'
      }
    };

    res.json(result);
    
  } catch (error) {
    console.error(\`Error in ${endpoint.handler}:\`, error);
    res.status(500).json({
      component: '${componentName}',
      endpoint: '${endpoint.path}',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}`;
    }).join('\n\n');

    const exportStatements = endpoints.map(e => e.handler).join(',\n  ');

    return `
/**
 * Debug handlers for ${componentName} component
 * Generated by 30-Minute Rule Agent
 */

${handlers}

module.exports = {
  ${exportStatements}
};
`;
  }

  /**
   * Generate endpoint documentation
   */
  private async generateEndpointDocumentation(
    outputDir: string,
    endpoints: DebugEndpointConfig[],
    components: ComponentInfo[]
  ): Promise<void> {
    const documentation = `# Debug Endpoints Documentation

Generated by 30-Minute Rule Agent on ${new Date().toISOString()}

## Overview

This debug server provides systematic debugging endpoints for ${components.length} components.

**Server Configuration:**
- Port: ${this.config.debugEndpointPort}
- Endpoint Prefix: ${this.config.debugEndpointPrefix}
- Total Endpoints: ${endpoints.length}

## Components

${components.map(component => `
### ${component.name}

- **Type:** ${component.type}
- **Path:** ${component.path}
- **Framework:** ${component.metadata.framework || 'Unknown'}
- **Language:** ${component.metadata.language || 'Unknown'}
- **Dependencies:** ${component.dependencies.length}
- **Debug Endpoints:** ${component.debugEndpoints.length}

#### Endpoints

${component.debugEndpoints.map(endpoint => `
##### ${endpoint.method} ${endpoint.path}

${endpoint.description}

**Parameters:**
${endpoint.parameters?.length ? 
  endpoint.parameters.map(param => 
    `- \`${param.name}\` (${param.type}${param.required ? ', required' : ', optional'}): ${param.description}`
  ).join('\n') : 
  'None'
}

**Example:**
\`\`\`bash
curl -X ${endpoint.method} \\
  http://localhost:${this.config.debugEndpointPort}${endpoint.path} \\
  ${endpoint.method !== 'GET' ? '-H "Content-Type: application/json" \\\n  -d \'{"example": "data"}\'' : ''}
\`\`\`
`).join('\n')}
`).join('\n')}

## Usage Guide

### Starting the Debug Server

\`\`\`bash
cd debug-endpoints
npm install
npm start
\`\`\`

### Health Checks

All components have health check endpoints that follow the pattern:
\`GET ${this.config.debugEndpointPrefix}/{component}/health\`

### Isolation Testing

Components support isolation testing via:
\`POST ${this.config.debugEndpointPrefix}/{component}/isolation\`

### Fallback Mechanisms

Components can execute fallback implementations via:
\`POST ${this.config.debugEndpointPrefix}/{component}/fallback\`

### Metrics

Performance metrics are available at:
\`GET ${this.config.debugEndpointPrefix}/{component}/metrics\`

## 30-Minute Rule Integration

These debug endpoints are designed to support time-bounded debugging sessions:

1. **Quick Health Verification** - Use health endpoints to rapidly verify component status
2. **Isolated Testing** - Test components in isolation to identify issues quickly
3. **Fallback Execution** - Switch to alternative implementations when debugging exceeds time limits
4. **Performance Monitoring** - Track metrics to identify performance bottlenecks

## Customization

This generated code is a starting point. Customize the handler implementations in:
${Array.from(new Set(endpoints.map(e => e.component))).map(component => 
  `- \`${component!.toLowerCase().replace(/[^a-z0-9]/g, '-')}-handlers.js\``
).join('\n')}
`;

    await fs.writeFile(path.join(outputDir, 'README.md'), documentation);
    console.log(`📚 Documentation generated: ${path.join(outputDir, 'README.md')}`);
  }

  /**
   * Utility methods
   */

  private shouldSkipFile(content: string, fileName: string): boolean {
    // Skip test files, config files, and other non-component files
    const skipPatterns = [
      /\.test\./,
      /\.spec\./,
      /\.config\./,
      /\.min\./,
      /^index$/,
      /^main$/,
      /^app$/
    ];

    return skipPatterns.some(pattern => pattern.test(fileName)) ||
           content.length < 100 || // Skip very small files
           content.includes('// This file is auto-generated');
  }

  private detectComponentType(content: string, fileExt: string): string {
    // Detect component type based on content and file extension
    if (content.includes('React.Component') || content.includes('useState')) return 'React Component';
    if (content.includes('Vue.component') || content.includes('<template>')) return 'Vue Component';
    if (content.includes('class ') && content.includes('extends')) return 'Class Component';
    if (content.includes('function ') && content.includes('export')) return 'Function Component';
    if (content.includes('app.') && content.includes('listen')) return 'Express Server';
    if (content.includes('router.') || content.includes('Router')) return 'Router';
    if (content.includes('model') || content.includes('schema')) return 'Data Model';
    if (content.includes('service') || content.includes('Service')) return 'Service';
    if (content.includes('util') || content.includes('helper')) return 'Utility';
    
    return 'Module';
  }

  private extractDependencies(content: string, fileExt: string): string[] {
    const dependencies: string[] = [];
    
    // Extract import statements
    const importMatches = content.match(/import .+ from ['"](.+)['"];?/g) || [];
    const requireMatches = content.match(/require\(['"](.+)['"]\)/g) || [];
    
    for (const match of importMatches) {
      const dep = match.match(/from ['"](.+)['"]/)?.[1];
      if (dep && !dep.startsWith('.')) {
        dependencies.push(dep);
      }
    }
    
    for (const match of requireMatches) {
      const dep = match.match(/require\(['"](.+)['"]\)/)?.[1];
      if (dep && !dep.startsWith('.')) {
        dependencies.push(dep);
      }
    }
    
    return [...new Set(dependencies)];
  }

  private detectFramework(content: string, fileExt: string): string {
    if (content.includes('react') || content.includes('React')) return 'React';
    if (content.includes('vue') || content.includes('Vue')) return 'Vue.js';
    if (content.includes('angular') || content.includes('Angular')) return 'Angular';
    if (content.includes('express') || content.includes('Express')) return 'Express.js';
    if (content.includes('next') || content.includes('Next')) return 'Next.js';
    if (content.includes('nuxt') || content.includes('Nuxt')) return 'Nuxt.js';
    if (content.includes('fastify')) return 'Fastify';
    if (content.includes('koa')) return 'Koa';
    
    return 'Unknown';
  }

  private detectLanguage(fileExt: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript (JSX)',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript (TSX)',
      '.vue': 'Vue',
      '.py': 'Python',
      '.go': 'Go',
      '.java': 'Java',
      '.cs': 'C#',
      '.php': 'PHP',
      '.rb': 'Ruby'
    };
    
    return languageMap[fileExt] || 'Unknown';
  }

  private isTestable(content: string, fileExt: string): boolean {
    // Component is testable if it exports functions/classes or has clear interfaces
    return content.includes('export') || 
           content.includes('module.exports') ||
           content.includes('class ') ||
           content.includes('function ');
  }

  private isCriticalComponent(content: string, fileName: string): boolean {
    // Critical components are those that handle core functionality
    const criticalPatterns = [
      /auth/i,
      /security/i,
      /payment/i,
      /database/i,
      /config/i,
      /server/i,
      /api/i,
      /router/i
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(fileName) || pattern.test(content)
    );
  }

  private deduplicateComponents(components: ComponentInfo[]): ComponentInfo[] {
    const seen = new Set<string>();
    return components.filter(component => {
      const key = `${component.name}-${component.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private groupEndpointsByComponent(endpoints: DebugEndpointConfig[]): Map<string, DebugEndpointConfig[]> {
    const grouped = new Map<string, DebugEndpointConfig[]>();
    
    for (const endpoint of endpoints) {
      if (!endpoint.component) continue;
      
      if (!grouped.has(endpoint.component)) {
        grouped.set(endpoint.component, []);
      }
      grouped.get(endpoint.component)!.push(endpoint);
    }
    
    return grouped;
  }

  private generateWarnings(components: ComponentInfo[], endpoints: DebugEndpointConfig[]): string[] {
    const warnings: string[] = [];
    
    if (components.length === 0) {
      warnings.push('No components found in the project');
    }
    
    if (endpoints.length === 0) {
      warnings.push('No debug endpoints generated');
    }
    
    const componentsWithoutEndpoints = components.filter(c => c.debugEndpoints.length === 0);
    if (componentsWithoutEndpoints.length > 0) {
      warnings.push(`${componentsWithoutEndpoints.length} components have no debug endpoints`);
    }
    
    return warnings;
  }

  private generatePackageJson(): any {
    return {
      name: 'debug-endpoints-server',
      version: '1.0.0',
      description: 'Generated debug endpoints server by 30-Minute Rule Agent',
      main: 'debug-server.js',
      scripts: {
        start: 'node debug-server.js',
        dev: 'nodemon debug-server.js',
        test: 'echo "No tests specified"'
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5'
      },
      devDependencies: {
        nodemon: '^3.0.2'
      },
      keywords: [
        'debugging',
        'debug-endpoints',
        'thirty-minute-rule',
        'component-isolation',
        'health-checks'
      ],
      author: '30-Minute Rule Agent',
      license: 'MIT'
    };
  }
}