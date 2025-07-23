/**
 * Project Analyzer for Five Document Framework Agent
 *
 * Analyzes project structure to extract configuration and setup info
 * Following All-Purpose Pattern: UNLIMITED project types and structures
 */
import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import chalk from 'chalk';
import { spawn } from 'cross-spawn';
export class ProjectAnalyzer {
    /**
     * Analyze project structure and configuration
     */
    async analyzeProject(projectDir) {
        console.log(chalk.blue(`🔍 Analyzing project: ${projectDir}`));
        try {
            const config = {
                name: path.basename(projectDir),
                version: '1.0.0',
                description: '',
                type: 'web'
            };
            // Analyze package.json if it exists
            await this.analyzePackageJson(projectDir, config);
            // Analyze project structure and files
            await this.analyzeProjectStructure(projectDir, config);
            // Detect technology stack
            await this.detectTechnologies(projectDir, config);
            // Analyze environment configuration
            await this.analyzeEnvironments(projectDir, config);
            // Detect integrations
            await this.detectIntegrations(projectDir, config);
            // Analyze existing documentation
            await this.analyzeExistingDocs(projectDir, config);
            console.log(chalk.green('✅ Project analysis complete'));
            return config;
        }
        catch (error) {
            console.error(chalk.red('❌ Project analysis failed:'), error);
            throw error;
        }
    }
    /**
     * Analyze package.json for basic project info
     */
    async analyzePackageJson(projectDir, config) {
        const packageJsonPath = path.join(projectDir, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
            try {
                const packageJson = await fs.readJson(packageJsonPath);
                config.name = packageJson.name || config.name;
                config.version = packageJson.version || config.version;
                config.description = packageJson.description || config.description;
                // Determine project type from package.json
                if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
                    config.type = 'nextjs';
                }
                else if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
                    config.type = 'react';
                }
                else if (packageJson.dependencies?.express) {
                    config.type = 'express';
                }
                else if (packageJson.dependencies?.fastify) {
                    config.type = 'fastify';
                }
                else if (packageJson.type === 'module' || packageJson.main) {
                    config.type = 'library';
                }
                console.log(chalk.blue(`📦 Package: ${config.name}@${config.version}`));
            }
            catch (error) {
                console.warn(chalk.yellow('⚠️  Failed to parse package.json:'), error);
            }
        }
    }
    /**
     * Analyze project structure and files
     */
    async analyzeProjectStructure(projectDir, config) {
        try {
            const files = await glob('**/*', {
                cwd: projectDir,
                ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**'],
                nodir: true
            });
            // Count file types
            const fileTypes = {};
            const directories = new Set();
            files.forEach(file => {
                const ext = path.extname(file).toLowerCase();
                const dir = path.dirname(file);
                if (ext) {
                    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
                }
                if (dir !== '.') {
                    directories.add(dir.split('/')[0]);
                }
            });
            // Store structure info in config
            config.structure = {
                totalFiles: files.length,
                fileTypes,
                directories: Array.from(directories),
                hasTests: directories.has('test') || directories.has('tests') || directories.has('__tests__'),
                hasDocs: directories.has('docs') || directories.has('documentation'),
                hasSource: directories.has('src') || directories.has('lib'),
            };
            console.log(chalk.blue(`📁 Structure: ${files.length} files, ${directories.size} directories`));
        }
        catch (error) {
            console.warn(chalk.yellow('⚠️  Failed to analyze project structure:'), error);
        }
    }
    /**
     * Detect technologies used in the project
     */
    async detectTechnologies(projectDir, config) {
        const technologies = {
            frontend: [],
            backend: [],
            database: [],
            deployment: [],
            testing: []
        };
        try {
            // Check for frontend technologies
            const packageJsonPath = path.join(projectDir, 'package.json');
            if (await fs.pathExists(packageJsonPath)) {
                const packageJson = await fs.readJson(packageJsonPath);
                const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                // Frontend frameworks
                if (allDeps.react)
                    technologies.frontend.push('React');
                if (allDeps.vue)
                    technologies.frontend.push('Vue.js');
                if (allDeps.angular)
                    technologies.frontend.push('Angular');
                if (allDeps.next)
                    technologies.frontend.push('Next.js');
                if (allDeps.nuxt)
                    technologies.frontend.push('Nuxt.js');
                if (allDeps.svelte)
                    technologies.frontend.push('Svelte');
                // Backend frameworks
                if (allDeps.express)
                    technologies.backend.push('Express.js');
                if (allDeps.fastify)
                    technologies.backend.push('Fastify');
                if (allDeps.koa)
                    technologies.backend.push('Koa.js');
                if (allDeps.nestjs)
                    technologies.backend.push('NestJS');
                // Databases
                if (allDeps.mongoose)
                    technologies.database.push('MongoDB');
                if (allDeps.pg)
                    technologies.database.push('PostgreSQL');
                if (allDeps.mysql2)
                    technologies.database.push('MySQL');
                if (allDeps.sqlite3)
                    technologies.database.push('SQLite');
                if (allDeps.redis)
                    technologies.database.push('Redis');
                // Testing frameworks
                if (allDeps.jest)
                    technologies.testing.push('Jest');
                if (allDeps.mocha)
                    technologies.testing.push('Mocha');
                if (allDeps.cypress)
                    technologies.testing.push('Cypress');
                if (allDeps.playwright)
                    technologies.testing.push('Playwright');
                // Deployment/Build tools
                if (allDeps.webpack)
                    technologies.deployment.push('Webpack');
                if (allDeps.vite)
                    technologies.deployment.push('Vite');
                if (allDeps.rollup)
                    technologies.deployment.push('Rollup');
            }
            // Check for config files that indicate technologies
            const configFiles = await glob('*', {
                cwd: projectDir,
                nodir: true
            });
            configFiles.forEach(file => {
                if (file === 'Dockerfile')
                    technologies.deployment.push('Docker');
                if (file === 'vercel.json')
                    technologies.deployment.push('Vercel');
                if (file === 'netlify.toml')
                    technologies.deployment.push('Netlify');
                if (file === '.github')
                    technologies.deployment.push('GitHub Actions');
                if (file === 'tailwind.config.js')
                    technologies.frontend.push('TailwindCSS');
                if (file === 'tsconfig.json')
                    technologies.frontend.push('TypeScript');
            });
            // Remove duplicates and empty arrays
            Object.keys(technologies).forEach(key => {
                const techKey = key;
                if (technologies[techKey]) {
                    technologies[techKey] = [...new Set(technologies[techKey])];
                    if (technologies[techKey].length === 0) {
                        delete technologies[techKey];
                    }
                }
            });
            config.technologies = technologies;
            const totalTechs = Object.values(technologies).reduce((sum, arr) => sum + (arr?.length || 0), 0);
            console.log(chalk.blue(`🔧 Technologies detected: ${totalTechs} total`));
        }
        catch (error) {
            console.warn(chalk.yellow('⚠️  Failed to detect technologies:'), error);
        }
    }
    /**
     * Analyze environment configuration
     */
    async analyzeEnvironments(projectDir, config) {
        const environments = {};
        try {
            // Check for .env files
            const envFiles = await glob('.env*', {
                cwd: projectDir,
                nodir: true
            });
            for (const envFile of envFiles) {
                const envName = envFile === '.env' ? 'development' :
                    envFile.replace('.env.', '').replace('.env', 'development');
                const envPath = path.join(projectDir, envFile);
                const envConfig = {
                    variables: {}
                };
                try {
                    const envContent = await fs.readFile(envPath, 'utf8');
                    const lines = envContent.split('\\n');
                    lines.forEach(line => {
                        const trimmed = line.trim();
                        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                            const [key, ...valueParts] = trimmed.split('=');
                            const value = valueParts.join('=');
                            envConfig.variables[key.trim()] = value.trim();
                        }
                    });
                    environments[envName] = envConfig;
                }
                catch (error) {
                    console.warn(chalk.yellow(`⚠️  Failed to parse ${envFile}:`), error);
                }
            }
            // Check for Vercel configuration
            const vercelJsonPath = path.join(projectDir, 'vercel.json');
            if (await fs.pathExists(vercelJsonPath)) {
                try {
                    const vercelConfig = await fs.readJson(vercelJsonPath);
                    if (vercelConfig.env) {
                        environments.production = environments.production || {};
                        environments.production.variables = {
                            ...environments.production.variables,
                            ...vercelConfig.env
                        };
                    }
                }
                catch (error) {
                    console.warn(chalk.yellow('⚠️  Failed to parse vercel.json:'), error);
                }
            }
            if (Object.keys(environments).length > 0) {
                config.environments = environments;
                console.log(chalk.blue(`🌍 Environments found: ${Object.keys(environments).join(', ')}`));
            }
        }
        catch (error) {
            console.warn(chalk.yellow('⚠️  Failed to analyze environments:'), error);
        }
    }
    /**
     * Detect integrations and external services
     */
    async detectIntegrations(projectDir, config) {
        const integrations = {
            apis: [],
            databases: [],
            services: []
        };
        try {
            // Look for API integrations in package.json
            const packageJsonPath = path.join(projectDir, 'package.json');
            if (await fs.pathExists(packageJsonPath)) {
                const packageJson = await fs.readJson(packageJsonPath);
                const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                // API clients
                if (allDeps.axios) {
                    integrations.apis.push({
                        name: 'HTTP Client',
                        type: 'api-client',
                        version: allDeps.axios
                    });
                }
                if (allDeps.openai) {
                    integrations.apis.push({
                        name: 'OpenAI',
                        type: 'ai-service',
                        version: allDeps.openai
                    });
                }
                // Database clients
                if (allDeps.mongoose) {
                    integrations.databases.push({
                        name: 'MongoDB',
                        type: 'nosql',
                        version: allDeps.mongoose
                    });
                }
                if (allDeps.pg) {
                    integrations.databases.push({
                        name: 'PostgreSQL',
                        type: 'sql',
                        version: allDeps.pg
                    });
                }
                // Services
                if (allDeps['@vercel/analytics']) {
                    integrations.services.push({
                        name: 'Vercel Analytics',
                        type: 'analytics',
                        version: allDeps['@vercel/analytics']
                    });
                }
            }
            // Look for API endpoints in source files
            const sourceFiles = await glob('**/*.{js,ts,jsx,tsx}', {
                cwd: projectDir,
                ignore: ['node_modules/**', '.next/**', 'dist/**']
            });
            const apiEndpoints = new Set();
            for (const file of sourceFiles.slice(0, 50)) { // Limit to prevent performance issues
                try {
                    const content = await fs.readFile(path.join(projectDir, file), 'utf8');
                    // Find API endpoints
                    const endpoints = content.match(/['"`]\/api\/[^'"`]+['"`]/g);
                    if (endpoints) {
                        endpoints.forEach(endpoint => {
                            const match = endpoint.match(/\/api\/[^'"\)]+/);
                            if (match) {
                                apiEndpoints.add(match[0]);
                            }
                        });
                    }
                }
                catch (error) {
                    // Skip files that can't be read
                    continue;
                }
            }
            // Add detected API endpoints
            if (apiEndpoints.size > 0) {
                integrations.apis.push({
                    name: 'Internal API',
                    type: 'internal',
                    endpoints: Array.from(apiEndpoints)
                });
            }
            // Remove empty arrays
            Object.keys(integrations).forEach(key => {
                const intKey = key;
                if (integrations[intKey] && integrations[intKey].length === 0) {
                    delete integrations[intKey];
                }
            });
            if (Object.keys(integrations).length > 0) {
                config.integrations = integrations;
                const totalIntegrations = Object.values(integrations).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                console.log(chalk.blue(`🔌 Integrations detected: ${totalIntegrations} total`));
            }
        }
        catch (error) {
            console.warn(chalk.yellow('⚠️  Failed to detect integrations:'), error);
        }
    }
    /**
     * Analyze existing documentation
     */
    async analyzeExistingDocs(projectDir, config) {
        try {
            const docFiles = await glob('**/*.md', {
                cwd: projectDir,
                ignore: ['node_modules/**', '.git/**']
            });
            if (docFiles.length > 0) {
                config.documentation = config.documentation || {};
                config.documentation.existingDocs = docFiles;
                config.documentation.hasExistingDocs = true;
                // Analyze doc structure
                const docStructure = {};
                for (const docFile of docFiles) {
                    const dir = path.dirname(docFile);
                    if (!docStructure[dir]) {
                        docStructure[dir] = [];
                    }
                    docStructure[dir].push(path.basename(docFile));
                }
                config.documentation.structure = docStructure;
                console.log(chalk.blue(`📚 Existing docs: ${docFiles.length} files`));
            }
        }
        catch (error) {
            console.warn(chalk.yellow('⚠️  Failed to analyze existing documentation:'), error);
        }
    }
    /**
     * Get git information if available
     */
    async getGitInfo(projectDir) {
        try {
            const gitDir = path.join(projectDir, '.git');
            if (await fs.pathExists(gitDir)) {
                // Get current branch
                const result = spawn('git', ['branch', '--show-current'], {
                    cwd: projectDir,
                    stdio: ['ignore', 'pipe', 'ignore']
                });
                return new Promise((resolve) => {
                    let output = '';
                    result.stdout?.on('data', (data) => {
                        output += data.toString();
                    });
                    result.on('close', () => {
                        resolve({
                            currentBranch: output.trim() || 'main',
                            hasGit: true
                        });
                    });
                });
            }
        }
        catch (error) {
            // Git not available or not a git repo
            return undefined;
        }
    }
}
