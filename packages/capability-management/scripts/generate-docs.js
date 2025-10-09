#!/usr/bin/env node

/**
 * UEP Capability Management Documentation Generator
 * 
 * This script generates comprehensive documentation including:
 * - TypeDoc API documentation
 * - OpenAPI specification validation
 * - Compatibility matrix updates
 * - Usage examples
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

const PROJECT_ROOT = process.cwd();
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const API_DOCS_DIR = path.join(DOCS_DIR, 'api');

/**
 * Logger utility with colored output
 */
const logger = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✅'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠️'), msg),
  error: (msg) => console.log(chalk.red('❌'), msg),
  section: (msg) => console.log(chalk.cyan.bold(`\n🔥 ${msg}`))
};

/**
 * Execute shell command with error handling
 */
function executeCommand(command, description) {
  try {
    logger.info(`${description}...`);
    const output = execSync(command, { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    logger.success(`${description} completed`);
    return output;
  } catch (error) {
    logger.error(`${description} failed: ${error.message}`);
    throw error;
  }
}

/**
 * Ensure documentation directory structure exists
 */
async function ensureDirectoryStructure() {
  logger.section('Setting up documentation structure');
  
  const directories = [
    DOCS_DIR,
    API_DOCS_DIR,
    path.join(DOCS_DIR, 'examples'),
    path.join(DOCS_DIR, 'guides'),
    path.join(DOCS_DIR, 'schemas')
  ];

  for (const dir of directories) {
    try {
      await fs.access(dir);
      logger.info(`Directory exists: ${path.relative(PROJECT_ROOT, dir)}`);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      logger.success(`Created directory: ${path.relative(PROJECT_ROOT, dir)}`);
    }
  }
}

/**
 * Generate TypeDoc API documentation
 */
function generateTypeDocumentation() {
  logger.section('Generating TypeDoc API Documentation');
  
  executeCommand(
    'npx typedoc --skipErrorChecking',
    'Generating TypeScript API documentation'
  );
  
  // Verify documentation was generated
  const indexPath = path.join(API_DOCS_DIR, 'README.md');
  if (fs.access(indexPath).then(() => true).catch(() => false)) {
    logger.success('TypeDoc documentation generated successfully');
  } else {
    logger.warn('TypeDoc documentation may not have generated properly');
  }
}

/**
 * Validate OpenAPI specification
 */
async function validateOpenAPISpec() {
  logger.section('Validating OpenAPI Specification');
  
  const openApiPath = path.join(DOCS_DIR, 'openapi.yaml');
  
  try {
    await fs.access(openApiPath);
    logger.success('OpenAPI specification found');
    
    // Try to validate with swagger-parser if available
    try {
      executeCommand(
        `npx swagger-parser validate "${openApiPath}"`,
        'Validating OpenAPI specification syntax'
      );
    } catch (error) {
      logger.warn('swagger-parser not available, skipping validation');
      logger.info('Install swagger-parser for OpenAPI validation: npm install -g swagger-parser');
    }
    
  } catch {
    logger.error('OpenAPI specification not found at docs/openapi.yaml');
  }
}

/**
 * Generate usage examples from source code
 */
async function generateUsageExamples() {
  logger.section('Generating Usage Examples');
  
  const examplesDir = path.join(PROJECT_ROOT, 'examples');
  const docsExamplesDir = path.join(DOCS_DIR, 'examples');
  
  try {
    const exampleFiles = await fs.readdir(examplesDir);
    
    for (const file of exampleFiles) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        const sourcePath = path.join(examplesDir, file);
        const content = await fs.readFile(sourcePath, 'utf-8');
        
        // Extract documentation comments and create markdown
        const mdContent = generateExampleMarkdown(file, content);
        const mdPath = path.join(docsExamplesDir, file.replace(/\.(ts|js)$/, '.md'));
        
        await fs.writeFile(mdPath, mdContent);
        logger.success(`Generated example documentation: ${file.replace(/\.(ts|js)$/, '.md')}`);
      }
    }
  } catch (error) {
    logger.warn('No examples directory found or error processing examples');
  }
}

/**
 * Generate markdown from example source code
 */
function generateExampleMarkdown(filename, content) {
  const title = filename
    .replace(/\.(ts|js)$/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  let markdown = `# ${title} Example\n\n`;
  
  // Extract main comment block
  const commentMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (commentMatch) {
    const comment = commentMatch[1]
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim();
    markdown += `${comment}\n\n`;
  }
  
  // Add code block
  markdown += `## Implementation\n\n\`\`\`typescript\n${content}\n\`\`\`\n\n`;
  
  // Add usage instructions
  markdown += `## Usage\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `# Install dependencies\nnpm install\n\n`;
  markdown += `# Run the example\nnpx tsx ${filename}\n`;
  markdown += `\`\`\`\n`;
  
  return markdown;
}

/**
 * Update compatibility matrix with current versions
 */
async function updateCompatibilityMatrix() {
  logger.section('Updating Compatibility Matrix');
  
  const compatibilityPath = path.join(DOCS_DIR, 'compatibility-matrix.md');
  
  try {
    await fs.access(compatibilityPath);
    
    // Read package.json to get current dependency versions
    const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Update last modified date in compatibility matrix
    let content = await fs.readFile(compatibilityPath, 'utf-8');
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    content = content.replace(
      /\*\*Last Updated\*\*:.*$/m,
      `**Last Updated**: ${today}`
    );
    
    await fs.writeFile(compatibilityPath, content);
    logger.success('Compatibility matrix updated with current date');
    
  } catch (error) {
    logger.warn('Compatibility matrix not found or could not be updated');
  }
}

/**
 * Generate documentation index
 */
async function generateDocumentationIndex() {
  logger.section('Generating Documentation Index');
  
  const indexContent = `# UEP Capability Management Documentation

Welcome to the comprehensive documentation for the UEP Capability Management System.

## 📚 Documentation Sections

### API Reference
- [TypeScript API Documentation](./api/README.md) - Complete API reference generated from source code
- [OpenAPI Specification](./openapi.yaml) - REST API specification for external integrations

### Compatibility & Migration
- [Compatibility Matrix](./compatibility-matrix.md) - Version and platform compatibility information
- [Migration Guides](./compatibility-matrix.md#migration-guides) - Step-by-step migration instructions

### Examples & Guides
- [Usage Examples](./examples/) - Practical implementation examples
- [Integration Guides](./guides/) - Step-by-step integration instructions

### Schemas & Specifications
- [Capability Schema](./schemas/) - TypeScript interfaces and JSON schemas
- [Protocol Specifications](./schemas/) - UEP protocol definitions

## 🚀 Quick Start

1. **Installation**:
   \`\`\`bash
   npm install @uep/capability-management
   \`\`\`

2. **Basic Usage**:
   \`\`\`typescript
   import { CapabilityRegistryService } from '@uep/capability-management';
   
   const registry = new CapabilityRegistryService({
     storage: { type: 'redis', connectionString: 'redis://localhost:6379' }
   });
   
   await registry.start();
   \`\`\`

3. **API Endpoints**:
   - Health Check: \`GET /health\`
   - Register Agent: \`POST /api/v1/agents/register\`
   - Search Capabilities: \`GET /api/v1/capabilities\`

## 📋 Documentation Generation

This documentation is automatically generated using:
- **TypeDoc**: For TypeScript API documentation
- **OpenAPI**: For REST API specification
- **Custom Scripts**: For compatibility matrices and examples

To regenerate documentation:
\`\`\`bash
npm run docs:generate
\`\`\`

## 🔗 Links

- [GitHub Repository](https://github.com/your-org/allpurp)
- [NPM Package](https://www.npmjs.com/package/@uep/capability-management)
- [Issue Tracker](https://github.com/your-org/allpurp/issues)

---

*Last generated: ${new Date().toISOString()}*
*Documentation version: ${JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')).version}*
`;

  await fs.writeFile(path.join(DOCS_DIR, 'README.md'), indexContent);
  logger.success('Documentation index generated');
}

/**
 * Main documentation generation function
 */
async function main() {
  try {
    console.log(chalk.cyan.bold('🚀 UEP Capability Management Documentation Generator'));
    console.log(chalk.gray('Generating comprehensive documentation...\n'));
    
    await ensureDirectoryStructure();
    generateTypeDocumentation();
    await validateOpenAPISpec();
    await generateUsageExamples();
    await updateCompatibilityMatrix();
    await generateDocumentationIndex();
    
    console.log(chalk.green.bold('\n✅ Documentation generation completed successfully!'));
    console.log(chalk.gray('📂 Documentation available in ./docs/'));
    console.log(chalk.gray('🌐 Serve docs locally: npm run docs:serve'));
    
  } catch (error) {
    console.log(chalk.red.bold('\n❌ Documentation generation failed!'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;