/**
 * Utility Functions for Vercel-Native Architecture Agent
 *
 * Provides unlimited utility capabilities with no hardcoded limitations
 * Following All-Purpose Pattern: NO limits on utility complexity
 */
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
/**
 * Validate Vercel configuration
 */
export function validateVercelConfig(config) {
    const errors = [];
    if (!config.agentId) {
        errors.push('Agent ID is required');
    }
    if (!config.version) {
        errors.push('Version is required');
    }
    if (!config.framework || !config.framework.name) {
        errors.push('Framework configuration is required');
    }
    if (!config.capabilities) {
        errors.push('Capabilities configuration is required');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Optimize Vercel configuration for production
 */
export function optimizeVercelConfiguration(config) {
    const optimized = { ...config };
    // Enable all production optimizations
    if (optimized.capabilities) {
        optimized.capabilities = {
            ...optimized.capabilities,
            serverlessFunctions: true,
            edgeFunctions: true,
            staticGeneration: true,
            serverSideRendering: true,
            incrementalStaticRegeneration: true,
            edgeMiddleware: true,
            analytics: true,
            speedInsights: true,
            imageOptimization: true,
            fontOptimization: true
        };
    }
    return optimized;
}
/**
 * Generate Vercel project structure
 */
export async function generateVercelProjectStructure(outputDirectory, architecture) {
    const structure = {
        directories: [],
        files: [],
        configurations: []
    };
    try {
        // Create base directories
        const baseDirs = [
            'api',
            'pages',
            'components',
            'styles',
            'public',
            'lib',
            'types',
            'middleware',
            'edge-functions'
        ];
        for (const dir of baseDirs) {
            const dirPath = path.join(outputDirectory, dir);
            await fs.ensureDir(dirPath);
            structure.directories.push(dirPath);
        }
        // Generate vercel.json configuration
        const vercelConfig = generateVercelConfig(architecture);
        const vercelConfigPath = path.join(outputDirectory, 'vercel.json');
        await fs.writeJSON(vercelConfigPath, vercelConfig, { spaces: 2 });
        structure.configurations.push({ path: vercelConfigPath, type: 'vercel-config' });
        // Generate package.json if it doesn't exist
        const packageJsonPath = path.join(outputDirectory, 'package.json');
        if (!await fs.pathExists(packageJsonPath)) {
            const packageJson = generatePackageJson(architecture);
            await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
            structure.files.push({ path: packageJsonPath, type: 'package-config' });
        }
        // Generate next.config.js for Next.js projects
        if (architecture.framework.name.toLowerCase() === 'next.js') {
            const nextConfigPath = path.join(outputDirectory, 'next.config.js');
            const nextConfig = generateNextConfig(architecture);
            await fs.writeFile(nextConfigPath, nextConfig);
            structure.configurations.push({ path: nextConfigPath, type: 'next-config' });
        }
        // Generate tsconfig.json for TypeScript projects
        const tsconfigPath = path.join(outputDirectory, 'tsconfig.json');
        const tsconfig = generateTsConfig();
        await fs.writeJSON(tsconfigPath, tsconfig, { spaces: 2 });
        structure.configurations.push({ path: tsconfigPath, type: 'typescript-config' });
        return { success: true, structure };
    }
    catch (error) {
        throw new Error(`Failed to generate project structure: ${error.message}`);
    }
}
/**
 * Create Vercel deployment package
 */
export async function createVercelDeploymentPackage(architecture, options = {}) {
    const deploymentPackage = {
        id: `deploy-${Date.now()}`,
        architecture: architecture.name,
        framework: architecture.framework.name,
        functions: {
            api: architecture.functions.apiFunctions.length,
            edge: architecture.functions.edgeFunctions.length,
            cron: architecture.functions.cronFunctions.length,
            middleware: architecture.functions.middlewareFunctions.length
        },
        domains: architecture.domains,
        environment: Object.keys(architecture.environment || {}).length,
        deployment: {
            strategy: architecture.deployment.strategy,
            environments: architecture.deployment.environments,
            autoDeployment: architecture.deployment.autoDeployment
        },
        monitoring: {
            analytics: architecture.monitoring.analyticsConfiguration.settings.enabled,
            speedInsights: architecture.monitoring.speedInsightsConfiguration.settings.enabled,
            logging: architecture.monitoring.logConfiguration.settings.level
        },
        security: {
            httpsEnforcement: architecture.security.settings.httpsEnforcement,
            corsEnabled: !!architecture.security.settings.corsConfiguration,
            cspEnabled: !!architecture.security.settings.cspConfiguration
        },
        performance: {
            optimization: architecture.performance,
            caching: architecture.caching || {}
        },
        createdAt: new Date().toISOString(),
        ...options
    };
    return { success: true, package: deploymentPackage };
}
/**
 * Generate vercel.json configuration
 */
function generateVercelConfig(architecture) {
    return {
        version: 2,
        name: architecture.project.name,
        regions: architecture.project.regions || ['iad1'],
        functions: generateFunctionsConfig(architecture),
        routes: generateRoutesConfig(architecture),
        headers: generateHeadersConfig(architecture),
        redirects: architecture.routing?.redirects || [],
        rewrites: architecture.routing?.rewrites || [],
        env: architecture.environment || {},
        github: {
            silent: true
        },
        builds: generateBuildsConfig(architecture)
    };
}
/**
 * Generate functions configuration for vercel.json
 */
function generateFunctionsConfig(architecture) {
    const functions = {};
    // API functions configuration
    architecture.functions.apiFunctions.forEach(func => {
        functions[func.path] = {
            runtime: func.runtime,
            memory: func.configuration.memory,
            maxDuration: func.configuration.maxDuration,
            regions: func.configuration.regions
        };
    });
    // Edge functions configuration
    architecture.functions.edgeFunctions.forEach(func => {
        functions[func.path] = {
            runtime: 'edge',
            regions: func.configuration.regions
        };
    });
    return functions;
}
/**
 * Generate routes configuration
 */
function generateRoutesConfig(architecture) {
    const routes = [];
    // Static routes
    if (architecture.routing?.staticRoutes) {
        architecture.routing.staticRoutes.forEach(route => {
            routes.push({
                src: route.path,
                dest: route.filePath,
                headers: route.configuration.headers
            });
        });
    }
    // Dynamic routes
    if (architecture.routing?.dynamicRoutes) {
        architecture.routing.dynamicRoutes.forEach(route => {
            routes.push({
                src: route.pattern,
                dest: route.functionPath,
                methods: route.configuration.methods
            });
        });
    }
    return routes;
}
/**
 * Generate headers configuration
 */
function generateHeadersConfig(architecture) {
    const headers = [];
    // Security headers
    if (architecture.security.settings.httpsEnforcement) {
        headers.push({
            source: '/(.*)',
            headers: [
                {
                    key: 'Strict-Transport-Security',
                    value: 'max-age=31536000; includeSubDomains'
                }
            ]
        });
    }
    // CORS headers
    if (architecture.security.settings.corsConfiguration) {
        const cors = architecture.security.settings.corsConfiguration;
        headers.push({
            source: '/api/(.*)',
            headers: [
                {
                    key: 'Access-Control-Allow-Origin',
                    value: cors.origin.join(', ')
                },
                {
                    key: 'Access-Control-Allow-Methods',
                    value: cors.methods.join(', ')
                },
                {
                    key: 'Access-Control-Allow-Headers',
                    value: cors.allowedHeaders.join(', ')
                }
            ]
        });
    }
    return headers;
}
/**
 * Generate builds configuration
 */
function generateBuildsConfig(architecture) {
    const builds = [];
    // Framework-specific builds
    if (architecture.framework.name.toLowerCase() === 'next.js') {
        builds.push({
            src: 'next.config.js',
            use: '@vercel/next'
        });
    }
    else if (architecture.framework.name.toLowerCase() === 'react') {
        builds.push({
            src: 'package.json',
            use: '@vercel/static-build',
            config: {
                buildCommand: 'npm run build',
                outputDirectory: 'dist'
            }
        });
    }
    return builds;
}
/**
 * Generate package.json for project
 */
function generatePackageJson(architecture) {
    const basePackage = {
        name: architecture.project.name,
        version: '1.0.0',
        description: `Vercel-native ${architecture.framework.name} application`,
        scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint'
        },
        dependencies: {},
        devDependencies: {}
    };
    // Framework-specific dependencies
    if (architecture.framework.name.toLowerCase() === 'next.js') {
        basePackage.dependencies = {
            next: 'latest',
            react: 'latest',
            'react-dom': 'latest'
        };
        basePackage.devDependencies = {
            '@types/node': 'latest',
            '@types/react': 'latest',
            '@types/react-dom': 'latest',
            typescript: 'latest'
        };
    }
    // Vercel integrations
    if (architecture.monitoring.analyticsConfiguration.settings.enabled) {
        basePackage.dependencies['@vercel/analytics'] = 'latest';
    }
    if (architecture.monitoring.speedInsightsConfiguration.settings.enabled) {
        basePackage.dependencies['@vercel/speed-insights'] = 'latest';
    }
    return basePackage;
}
/**
 * Generate next.config.js content
 */
function generateNextConfig(architecture) {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;`;
}
/**
 * Generate tsconfig.json
 */
function generateTsConfig() {
    return {
        compilerOptions: {
            target: 'es5',
            lib: ['dom', 'dom.iterable', 'es6'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            forceConsistentCasingInFileNames: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'node',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve',
            incremental: true,
            plugins: [
                {
                    name: 'next'
                }
            ],
            paths: {
                '@/*': ['./src/*']
            }
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules']
    };
}
/**
 * Generate random deployment ID
 */
export function generateDeploymentId() {
    return `deploy-${uuidv4().substring(0, 8)}`;
}
/**
 * Generate project configuration hash
 */
export function generateConfigHash(config) {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return Buffer.from(configString).toString('base64').substring(0, 16);
}
/**
 * Validate project structure
 */
export async function validateProjectStructure(projectPath) {
    const issues = [];
    // Check for required files
    const requiredFiles = ['package.json'];
    for (const file of requiredFiles) {
        const filePath = path.join(projectPath, file);
        if (!await fs.pathExists(filePath)) {
            issues.push(`Missing required file: ${file}`);
        }
    }
    // Check for framework-specific files
    const nextConfigPath = path.join(projectPath, 'next.config.js');
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        if (packageJson.dependencies?.next && !await fs.pathExists(nextConfigPath)) {
            issues.push('Next.js project missing next.config.js');
        }
    }
    return {
        valid: issues.length === 0,
        issues
    };
}
export default {
    validateVercelConfig,
    optimizeVercelConfiguration,
    generateVercelProjectStructure,
    createVercelDeploymentPackage,
    generateDeploymentId,
    generateConfigHash,
    validateProjectStructure
};
//# sourceMappingURL=index.js.map