/**
 * UEP Protocol Documentation Generator - Command Line Interface
 * 
 * Provides command-line tools for generating comprehensive documentation
 * from UEP protocol definitions in multiple formats with customizable themes.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { ProtocolDocumentationGenerator, DocumentationConfig, DocumentationFormat, BrandingConfig, TemplateConfig } from './ProtocolDocumentationGenerator';
import { ProtocolSchemaRepository, ProtocolDefinition } from './ProtocolSchemaRepository';

export interface DocumentationCLIOptions {
  command?: string;
  input?: string;
  output?: string;
  formats?: string[];
  theme?: string;
  customTheme?: string;
  includeExamples?: boolean;
  includeDiagrams?: boolean;
  includeInteractive?: boolean;
  includeTutorials?: boolean;
  includeChangelog?: boolean;
  includeMigration?: boolean;
  generateTOC?: boolean;
  enableSearch?: boolean;
  batch?: boolean;
  watch?: boolean;
  verbose?: boolean;
  help?: boolean;
  config?: string;
  branding?: string;
}

export interface CLIBrandingConfig {
  title?: string;
  description?: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  organization?: string;
  contact?: {
    name: string;
    email: string;
    url?: string;
  };
}

export class DocumentationGeneratorCLI {
  private generator: ProtocolDocumentationGenerator;
  private repository: ProtocolSchemaRepository;
  private config: DocumentationConfig;

  constructor(options: DocumentationCLIOptions = {}) {
    this.config = this.createDefaultConfig(options);
    this.generator = new ProtocolDocumentationGenerator(this.config);
    
    // Initialize repository for batch operations
    this.repository = new ProtocolSchemaRepository({
      basePath: './uep-protocol-schemas',
      gitEnabled: false,
      validationEnabled: false,
      autoVersioning: false,
      backupEnabled: false,
      compressionEnabled: false,
      cachingEnabled: false,
      indexingEnabled: false
    });
  }

  /**
   * Main CLI entry point
   */
  async run(args: string[]): Promise<number> {
    try {
      const options = this.parseArgs(args);

      if (options.help || !options.command) {
        this.showHelp();
        return 0;
      }

      if (options.verbose) {
        console.log('UEP Protocol Documentation Generator CLI v1.0.0');
        console.log('Options:', options);
      }

      // Load custom configuration if provided
      if (options.config) {
        await this.loadConfig(options.config);
      }

      // Load custom branding if provided
      if (options.branding) {
        await this.loadBranding(options.branding);
      }

      switch (options.command) {
        case 'generate':
          return await this.generateDocumentation(options);
        case 'batch':
          return await this.generateBatchDocumentation(options);
        case 'watch':
          return await this.watchAndGenerate(options);
        case 'validate':
          return await this.validateProtocol(options);
        case 'formats':
          return await this.listFormats(options);
        case 'themes':
          return await this.listThemes(options);
        case 'init':
          return await this.initializeConfig(options);
        default:
          console.error(`Unknown command: ${options.command}`);
          this.showHelp();
          return 1;
      }

    } catch (error) {
      console.error('Error:', error.message);
      if (error.stack && options?.verbose) {
        console.error(error.stack);
      }
      return 1;
    }
  }

  /**
   * Generate documentation for a single protocol
   */
  private async generateDocumentation(options: DocumentationCLIOptions): Promise<number> {
    if (!options.input) {
      console.error('Protocol definition file is required (--input)');
      return 1;
    }

    if (!existsSync(options.input)) {
      console.error(`Protocol file not found: ${options.input}`);
      return 1;
    }

    try {
      const content = readFileSync(options.input, 'utf-8');
      const protocol: ProtocolDefinition = JSON.parse(content);

      if (options.verbose) {
        console.log(`Generating documentation for protocol ${protocol.id} v${protocol.version}`);
      }

      // Update config with command line options
      this.updateConfigFromOptions(options);

      const result = await this.generator.generateDocumentation(protocol);

      if (result.success) {
        console.log(`✅ Documentation generated successfully for ${protocol.id}`);
        console.log(`   Generated ${result.generatedFiles.length} files in ${this.config.outputPath}`);
        
        if (options.verbose) {
          console.log('Generated files:');
          for (const file of result.generatedFiles) {
            console.log(`   - ${file.path} (${file.format})`);
          }
        }

        if (result.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          for (const warning of result.warnings) {
            console.log(`   - ${warning.message}`);
          }
        }
      } else {
        console.error(`❌ Documentation generation failed for ${protocol.id}`);
        for (const error of result.errors) {
          console.error(`   Error: ${error.message}`);
        }
        return 1;
      }

      return 0;

    } catch (error) {
      console.error(`Failed to generate documentation: ${error.message}`);
      return 1;
    }
  }

  /**
   * Generate documentation for multiple protocols
   */
  private async generateBatchDocumentation(options: DocumentationCLIOptions): Promise<number> {
    const inputPath = options.input || './uep-protocol-schemas';
    
    if (!existsSync(inputPath)) {
      console.error(`Input directory not found: ${inputPath}`);
      return 1;
    }

    try {
      const protocols = await this.loadProtocolsFromDirectory(inputPath);
      
      if (protocols.length === 0) {
        console.log('No protocol definitions found in the specified directory');
        return 0;
      }

      if (options.verbose) {
        console.log(`Found ${protocols.length} protocols to document`);
      }

      // Update config with command line options
      this.updateConfigFromOptions(options);

      const results = await this.generator.generateBatchDocumentation(protocols);

      let successCount = 0;
      let failureCount = 0;

      console.log('\n📋 Batch Documentation Generation Results:');
      console.log('=' .repeat(50));

      for (const [protocolId, result] of results) {
        if (result.success) {
          successCount++;
          console.log(`✅ ${protocolId} - ${result.generatedFiles.length} files generated`);
          
          if (result.warnings.length > 0) {
            console.log(`   ⚠️  ${result.warnings.length} warnings`);
          }
        } else {
          failureCount++;
          console.log(`❌ ${protocolId} - Generation failed`);
          if (options.verbose) {
            for (const error of result.errors) {
              console.log(`      ${error.message}`);
            }
          }
        }
      }

      console.log('=' .repeat(50));
      console.log(`📊 Summary: ${successCount} successful, ${failureCount} failed`);

      return failureCount > 0 ? 1 : 0;

    } catch (error) {
      console.error(`Batch documentation generation failed: ${error.message}`);
      return 1;
    }
  }

  /**
   * Watch for changes and regenerate documentation
   */
  private async watchAndGenerate(options: DocumentationCLIOptions): Promise<number> {
    const inputPath = options.input || './uep-protocol-schemas';
    
    console.log(`🔍 Watching for changes in: ${inputPath}`);
    console.log('Press Ctrl+C to stop watching');

    // Note: In a real implementation, you would use fs.watch or chokidar
    // For this implementation, we'll simulate watching
    let lastModified = new Map<string, number>();

    const checkForChanges = async () => {
      try {
        const protocols = await this.loadProtocolsFromDirectory(inputPath);
        let hasChanges = false;

        for (const protocol of protocols) {
          const filePath = join(inputPath, `${protocol.id}.json`);
          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            const currentModified = stats.mtime.getTime();
            const previousModified = lastModified.get(protocol.id);

            if (!previousModified || currentModified > previousModified) {
              lastModified.set(protocol.id, currentModified);
              hasChanges = true;
              
              if (previousModified) {
                console.log(`📝 Change detected in ${protocol.id}, regenerating...`);
                await this.generateSingleProtocol(protocol);
              }
            }
          }
        }

        if (!hasChanges && lastModified.size === 0) {
          // Initial generation
          console.log('🚀 Initial documentation generation...');
          await this.generateBatchDocumentation(options);
          
          // Set initial timestamps
          for (const protocol of protocols) {
            const filePath = join(inputPath, `${protocol.id}.json`);
            if (existsSync(filePath)) {
              const stats = statSync(filePath);
              lastModified.set(protocol.id, stats.mtime.getTime());
            }
          }
        }

      } catch (error) {
        console.error(`Watch error: ${error.message}`);
      }
    };

    // Check every 2 seconds (in production, use proper file watching)
    const watchInterval = setInterval(checkForChanges, 2000);
    
    // Initial check
    await checkForChanges();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n⏹️  Stopping watch mode...');
      clearInterval(watchInterval);
      process.exit(0);
    });

    // Keep process alive
    return new Promise(() => {});
  }

  /**
   * Validate protocol definition
   */
  private async validateProtocol(options: DocumentationCLIOptions): Promise<number> {
    if (!options.input) {
      console.error('Protocol definition file is required (--input)');
      return 1;
    }

    if (!existsSync(options.input)) {
      console.error(`Protocol file not found: ${options.input}`);
      return 1;
    }

    try {
      const content = readFileSync(options.input, 'utf-8');
      const protocol: ProtocolDefinition = JSON.parse(content);

      console.log(`🔍 Validating protocol: ${protocol.id}`);

      // Basic validation
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!protocol.id || typeof protocol.id !== 'string') {
        errors.push('Protocol must have a valid ID');
      }

      if (!protocol.version || typeof protocol.version !== 'string') {
        errors.push('Protocol must have a valid version');
      }

      if (!protocol.specification) {
        errors.push('Protocol must have a specification');
      }

      if (!protocol.metadata?.author) {
        warnings.push('Protocol should have author information');
      }

      if (!protocol.specification?.info?.description || protocol.specification.info.description.length < 10) {
        warnings.push('Protocol should have a comprehensive description');
      }

      // Display results
      if (errors.length === 0) {
        console.log('✅ Protocol validation passed');
        
        if (warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          for (const warning of warnings) {
            console.log(`   - ${warning}`);
          }
        }
        
        console.log(`\n📋 Protocol Information:`);
        console.log(`   ID: ${protocol.id}`);
        console.log(`   Version: ${protocol.version}`);
        console.log(`   Status: ${protocol.metadata?.status || 'unknown'}`);
        console.log(`   Author: ${protocol.metadata?.author || 'unknown'}`);
        
        return warnings.length > 0 ? 1 : 0;
      } else {
        console.log('❌ Protocol validation failed');
        for (const error of errors) {
          console.log(`   Error: ${error}`);
        }
        return 1;
      }

    } catch (error) {
      console.error(`Validation failed: ${error.message}`);
      return 1;
    }
  }

  /**
   * List available output formats
   */
  private async listFormats(options: DocumentationCLIOptions): Promise<number> {
    const formats = [
      { type: 'html', description: 'Interactive HTML documentation with navigation and search' },
      { type: 'markdown', description: 'Markdown documentation for README files and wikis' },
      { type: 'pdf', description: 'Print-ready PDF documentation' },
      { type: 'openapi-ui', description: 'Interactive OpenAPI UI (Swagger UI)' },
      { type: 'redoc', description: 'Interactive API documentation with Redoc' },
      { type: 'json', description: 'Structured JSON documentation data' }
    ];

    console.log('📄 Available Documentation Formats:');
    console.log('');

    for (const format of formats) {
      console.log(`${format.type.padEnd(12)} - ${format.description}`);
    }

    console.log('');
    console.log('Usage: --formats html,markdown,pdf');
    console.log('Default: html,markdown');

    return 0;
  }

  /**
   * List available themes
   */
  private async listThemes(options: DocumentationCLIOptions): Promise<number> {
    const themes = [
      { name: 'default', description: 'Clean and modern default theme' },
      { name: 'dark', description: 'Dark theme for reduced eye strain' },
      { name: 'enterprise', description: 'Professional theme for corporate use' },
      { name: 'minimal', description: 'Minimalist theme with clean typography' },
      { name: 'custom', description: 'Use custom theme from specified path' }
    ];

    console.log('🎨 Available Documentation Themes:');
    console.log('');

    for (const theme of themes) {
      console.log(`${theme.name.padEnd(12)} - ${theme.description}`);
    }

    console.log('');
    console.log('Usage: --theme dark');
    console.log('       --theme custom --custom-theme /path/to/theme.css');
    console.log('Default: default');

    return 0;
  }

  /**
   * Initialize configuration files
   */
  private async initializeConfig(options: DocumentationCLIOptions): Promise<number> {
    const configPath = options.output || './documentation-config.json';
    const brandingPath = join(dirname(configPath), 'branding-config.json');

    try {
      // Create default configuration
      const defaultConfig = {
        outputPath: './docs',
        formats: [
          { type: 'html', filename: 'index.html' },
          { type: 'markdown', filename: 'README.md' },
          { type: 'openapi-ui', filename: 'api-docs.html' }
        ],
        theme: 'default',
        includeExamples: true,
        includeDiagrams: true,
        includeInteractive: true,
        includeTutorials: false,
        includeChangelog: true,
        includeMigration: true,
        generateTOC: true,
        enableSearch: true,
        templates: {
          templatePath: './templates',
          customTemplates: {},
          helpers: {},
          partials: {}
        }
      };

      const defaultBranding = {
        title: 'API Documentation',
        description: 'Comprehensive API documentation',
        primaryColor: '#007acc',
        secondaryColor: '#0056b3',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        organization: 'Your Organization',
        contact: {
          name: 'API Team',
          email: 'api@yourorg.com',
          url: 'https://yourorg.com'
        }
      };

      writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      writeFileSync(brandingPath, JSON.stringify(defaultBranding, null, 2));

      console.log('✅ Configuration files initialized:');
      console.log(`   Config: ${configPath}`);
      console.log(`   Branding: ${brandingPath}`);
      console.log('');
      console.log('You can now customize these files and use them with:');
      console.log(`   uep-doc-generator generate --config ${configPath} --branding ${brandingPath}`);

      return 0;

    } catch (error) {
      console.error(`Failed to initialize config: ${error.message}`);
      return 1;
    }
  }

  /**
   * Helper methods
   */
  private createDefaultConfig(options: DocumentationCLIOptions): DocumentationConfig {
    const formats: DocumentationFormat[] = [
      { type: 'html', filename: 'index.html' },
      { type: 'markdown', filename: 'README.md' }
    ];

    const branding: BrandingConfig = {
      title: 'UEP Protocol Documentation',
      description: 'Comprehensive protocol documentation',
      primaryColor: '#007acc',
      secondaryColor: '#0056b3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      organization: 'UEP Protocol Team',
      contact: {
        name: 'Protocol Team',
        email: 'protocols@uep.local'
      }
    };

    const templates: TemplateConfig = {
      templatePath: join(__dirname, 'templates'),
      customTemplates: new Map(),
      helpers: new Map(),
      partials: new Map()
    };

    return {
      outputPath: options.output || './docs',
      formats,
      theme: (options.theme as any) || 'default',
      customThemePath: options.customTheme,
      includeExamples: options.includeExamples ?? true,
      includeDiagrams: options.includeDiagrams ?? true,
      includeInteractive: options.includeInteractive ?? true,
      includeTutorials: options.includeTutorials ?? false,
      includeChangelog: options.includeChangelog ?? true,
      includeMigration: options.includeMigration ?? true,
      generateTOC: options.generateTOC ?? true,
      enableSearch: options.enableSearch ?? true,
      branding,
      templates
    };
  }

  private updateConfigFromOptions(options: DocumentationCLIOptions): void {
    if (options.output) {
      this.config.outputPath = options.output;
    }

    if (options.formats && options.formats.length > 0) {
      this.config.formats = options.formats.map(format => ({
        type: format as any,
        filename: this.getDefaultFilename(format)
      }));
    }

    if (options.theme) {
      this.config.theme = options.theme as any;
    }

    if (options.customTheme) {
      this.config.customThemePath = options.customTheme;
    }

    // Update boolean options
    const booleanOptions = [
      'includeExamples', 'includeDiagrams', 'includeInteractive',
      'includeTutorials', 'includeChangelog', 'includeMigration',
      'generateTOC', 'enableSearch'
    ];

    for (const option of booleanOptions) {
      if (options[option] !== undefined) {
        this.config[option] = options[option];
      }
    }
  }

  private getDefaultFilename(format: string): string {
    const filenames = {
      html: 'index.html',
      markdown: 'README.md',
      pdf: 'documentation.pdf',
      json: 'documentation.json',
      'openapi-ui': 'api-docs.html',
      redoc: 'redoc.html'
    };

    return filenames[format] || `documentation.${format}`;
  }

  private async loadProtocolsFromDirectory(dirPath: string): Promise<ProtocolDefinition[]> {
    const protocols: ProtocolDefinition[] = [];
    
    if (!existsSync(dirPath)) {
      return protocols;
    }

    const files = readdirSync(dirPath);
    
    for (const file of files) {
      if (extname(file) === '.json') {
        try {
          const filePath = join(dirPath, file);
          const content = readFileSync(filePath, 'utf-8');
          const protocol: ProtocolDefinition = JSON.parse(content);
          
          // Basic validation
          if (protocol.id && protocol.version && protocol.specification) {
            protocols.push(protocol);
          }
        } catch (error) {
          console.warn(`Warning: Could not load protocol from ${file}: ${error.message}`);
        }
      }
    }

    return protocols;
  }

  private async generateSingleProtocol(protocol: ProtocolDefinition): Promise<void> {
    try {
      const result = await this.generator.generateDocumentation(protocol);
      
      if (result.success) {
        console.log(`✅ ${protocol.id} documentation regenerated`);
      } else {
        console.error(`❌ ${protocol.id} documentation generation failed`);
      }
    } catch (error) {
      console.error(`Error regenerating ${protocol.id}: ${error.message}`);
    }
  }

  private async loadConfig(configPath: string): Promise<void> {
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      // Merge with current config
      Object.assign(this.config, config);
      
      console.log(`📄 Loaded configuration from: ${configPath}`);
    } catch (error) {
      throw new Error(`Failed to load config file: ${error.message}`);
    }
  }

  private async loadBranding(brandingPath: string): Promise<void> {
    if (!existsSync(brandingPath)) {
      throw new Error(`Branding file not found: ${brandingPath}`);
    }

    try {
      const content = readFileSync(brandingPath, 'utf-8');
      const branding = JSON.parse(content);
      
      // Merge with current branding
      Object.assign(this.config.branding, branding);
      
      console.log(`🎨 Loaded branding from: ${brandingPath}`);
    } catch (error) {
      throw new Error(`Failed to load branding file: ${error.message}`);
    }
  }

  private parseArgs(args: string[]): DocumentationCLIOptions {
    const options: DocumentationCLIOptions = {};

    if (args.length > 0) {
      options.command = args[0];
    }

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--input':
        case '-i':
          options.input = nextArg;
          i++;
          break;
        case '--output':
        case '-o':
          options.output = nextArg;
          i++;
          break;
        case '--formats':
        case '-f':
          options.formats = nextArg.split(',').map(f => f.trim());
          i++;
          break;
        case '--theme':
        case '-t':
          options.theme = nextArg;
          i++;
          break;
        case '--custom-theme':
          options.customTheme = nextArg;
          i++;
          break;
        case '--config':
        case '-c':
          options.config = nextArg;
          i++;
          break;
        case '--branding':
        case '-b':
          options.branding = nextArg;
          i++;
          break;
        case '--include-examples':
          options.includeExamples = true;
          break;
        case '--no-examples':
          options.includeExamples = false;
          break;
        case '--include-diagrams':
          options.includeDiagrams = true;
          break;
        case '--no-diagrams':
          options.includeDiagrams = false;
          break;
        case '--include-interactive':
          options.includeInteractive = true;
          break;
        case '--no-interactive':
          options.includeInteractive = false;
          break;
        case '--include-tutorials':
          options.includeTutorials = true;
          break;
        case '--include-changelog':
          options.includeChangelog = true;
          break;
        case '--no-changelog':
          options.includeChangelog = false;
          break;
        case '--include-migration':
          options.includeMigration = true;
          break;
        case '--no-migration':
          options.includeMigration = false;
          break;
        case '--generate-toc':
          options.generateTOC = true;
          break;
        case '--no-toc':
          options.generateTOC = false;
          break;
        case '--enable-search':
          options.enableSearch = true;
          break;
        case '--no-search':
          options.enableSearch = false;
          break;
        case '--batch':
          options.batch = true;
          break;
        case '--watch':
        case '-w':
          options.watch = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--help':
        case '-h':
          options.help = true;
          break;
      }
    }

    return options;
  }

  private showHelp(): void {
    console.log(`
UEP Protocol Documentation Generator CLI v1.0.0

USAGE:
  uep-doc-generator <command> [OPTIONS]

COMMANDS:
  generate         Generate documentation for a single protocol
  batch            Generate documentation for multiple protocols
  watch            Watch for changes and regenerate documentation
  validate         Validate protocol definition
  formats          List available output formats
  themes           List available themes
  init             Initialize configuration files

OPTIONS:
  -i, --input <file/dir>       Input protocol file or directory
  -o, --output <dir>           Output directory (default: ./docs)
  -f, --formats <list>         Output formats: html,markdown,pdf,openapi-ui,redoc,json
  -t, --theme <name>           Theme: default,dark,enterprise,minimal,custom
  --custom-theme <file>        Path to custom theme CSS file
  -c, --config <file>          Configuration file path
  -b, --branding <file>        Branding configuration file
  --include-examples           Include usage examples (default: true)
  --no-examples                Exclude usage examples
  --include-diagrams           Include diagrams (default: true)
  --no-diagrams                Exclude diagrams
  --include-interactive        Include interactive features (default: true)
  --no-interactive             Exclude interactive features
  --include-tutorials          Include tutorials (default: false)
  --include-changelog          Include changelog (default: true)
  --no-changelog               Exclude changelog
  --include-migration          Include migration guide (default: true)
  --no-migration               Exclude migration guide
  --generate-toc               Generate table of contents (default: true)
  --no-toc                     Exclude table of contents
  --enable-search              Enable search functionality (default: true)
  --no-search                  Disable search functionality
  --batch                      Batch processing mode
  -w, --watch                  Watch for changes and regenerate
  -v, --verbose                Enable verbose output
  -h, --help                   Show this help message

EXAMPLES:
  # Generate HTML and Markdown documentation for a single protocol
  uep-doc-generator generate -i protocol.json -o ./docs -f html,markdown

  # Generate documentation for all protocols in a directory
  uep-doc-generator batch -i ./protocols -o ./docs

  # Generate with custom theme and branding
  uep-doc-generator generate -i protocol.json --theme enterprise -b branding.json

  # Watch for changes and auto-regenerate
  uep-doc-generator watch -i ./protocols -o ./docs

  # Initialize configuration files
  uep-doc-generator init -o ./doc-config.json

  # Validate protocol definition
  uep-doc-generator validate -i protocol.json

  # List available formats and themes
  uep-doc-generator formats
  uep-doc-generator themes

OUTPUT FORMATS:
  html             Interactive HTML with navigation and search
  markdown         Markdown for GitHub/GitLab wikis
  pdf              Print-ready PDF documentation
  openapi-ui       Swagger UI interactive documentation
  redoc            Redoc interactive documentation  
  json             Structured JSON data

THEMES:
  default          Clean and modern (default)
  dark             Dark theme for reduced eye strain
  enterprise       Professional corporate theme
  minimal          Minimalist clean typography
  custom           Use custom CSS theme file

MORE INFO:
  Documentation: https://docs.uep.local/documentation-generator
  Repository: https://github.com/uep/protocol-schemas
`);
  }
}

/**
 * CLI entry point for direct execution
 */
export async function main(): Promise<void> {
  const cli = new DocumentationGeneratorCLI();
  const exitCode = await cli.run(process.argv.slice(2));
  process.exit(exitCode);
}

// Allow direct execution
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}