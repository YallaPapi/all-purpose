/**
 * UEP Protocol Compiler - Command Line Interface
 * 
 * Provides a command-line interface for compiling UEP protocol definitions
 * into TypeScript validation code, interfaces, and utilities.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ProtocolCompiler, CompilerConfig } from './ProtocolCompiler';
import { ProtocolSchemaRepository, RepositoryConfig } from './ProtocolSchemaRepository';

export interface CLIOptions {
  input?: string;
  output?: string;
  protocol?: string;
  version?: string;
  format?: 'typescript' | 'javascript';
  includeTypes?: boolean;
  includeValidators?: boolean;
  includeInterfaces?: boolean;
  includeUtilities?: boolean;
  includeTests?: boolean;
  includeDocs?: boolean;
  strict?: boolean;
  batch?: boolean;
  verbose?: boolean;
  help?: boolean;
}

export class ProtocolCompilerCLI {
  private repository: ProtocolSchemaRepository;
  private compiler: ProtocolCompiler;

  constructor(repositoryConfig?: RepositoryConfig) {
    this.repository = new ProtocolSchemaRepository(repositoryConfig || {
      basePath: './uep-protocol-schemas',
      gitEnabled: false,
      validationEnabled: true,
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

      if (options.help) {
        this.showHelp();
        return 0;
      }

      if (options.verbose) {
        console.log('UEP Protocol Compiler CLI v1.0.0');
        console.log('Arguments:', options);
      }

      // Initialize compiler with options
      const compilerConfig: CompilerConfig = {
        outputPath: options.output || './generated',
        targetLanguage: options.format || 'typescript',
        moduleSystem: 'commonjs',
        includeTypes: options.includeTypes ?? true,
        includeValidators: options.includeValidators ?? true,
        includeInterfaces: options.includeInterfaces ?? true,
        includeUtilities: options.includeUtilities ?? true,
        includeTests: options.includeTests ?? true,
        strictMode: options.strict ?? true,
        generateDocs: options.includeDocs ?? true,
        minify: false
      };

      this.compiler = new ProtocolCompiler(compilerConfig);

      // Setup event handlers
      if (options.verbose) {
        this.setupEventHandlers();
      }

      if (options.batch) {
        return await this.runBatchCompilation(options);
      } else {
        return await this.runSingleProtocolCompilation(options);
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
   * Compile a single protocol
   */
  private async runSingleProtocolCompilation(options: CLIOptions): Promise<number> {
    let protocol;

    if (options.input) {
      // Load protocol from file
      if (!existsSync(options.input)) {
        console.error(`Protocol file not found: ${options.input}`);
        return 1;
      }

      try {
        const content = readFileSync(options.input, 'utf-8');
        protocol = JSON.parse(content);
      } catch (error) {
        console.error(`Failed to parse protocol file: ${error.message}`);
        return 1;
      }
    } else if (options.protocol) {
      // Load protocol from repository
      protocol = await this.repository.getProtocol(options.protocol, options.version);
      if (!protocol) {
        console.error(`Protocol not found in repository: ${options.protocol}${options.version ? `@${options.version}` : ''}`);
        return 1;
      }
    } else {
      console.error('Either --input or --protocol must be specified');
      return 1;
    }

    console.log(`Compiling protocol: ${protocol.name} (${protocol.id}) v${protocol.version}`);

    const result = await this.compiler.compileProtocol(protocol);

    if (result.success) {
      console.log(`✅ Compilation successful!`);
      console.log(`Generated ${result.generatedFiles.length} files:`);
      
      for (const file of result.generatedFiles) {
        console.log(`  - ${file.path} (${file.type}, ${file.size} bytes)`);
      }

      if (result.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
        for (const warning of result.warnings) {
          console.log(`  - ${warning.code}: ${warning.message}`);
        }
      }

      console.log(`\nStatistics:`);
      console.log(`  - Types generated: ${result.metadata.statistics.typesGenerated}`);
      console.log(`  - Validators generated: ${result.metadata.statistics.validatorsGenerated}`);
      console.log(`  - Interfaces generated: ${result.metadata.statistics.interfacesGenerated}`);
      console.log(`  - Total lines of code: ${result.metadata.statistics.linesOfCode}`);

      return 0;
    } else {
      console.log(`❌ Compilation failed!`);
      console.log(`Errors (${result.errors.length}):`);
      
      for (const error of result.errors) {
        console.log(`  - ${error.code}: ${error.message}`);
        if (error.path) {
          console.log(`    at ${error.path}${error.line ? `:${error.line}` : ''}`);
        }
      }

      return 1;
    }
  }

  /**
   * Compile multiple protocols in batch
   */
  private async runBatchCompilation(options: CLIOptions): Promise<number> {
    console.log('Running batch compilation...');

    const protocols = await this.repository.listProtocols();
    if (protocols.length === 0) {
      console.log('No protocols found in repository');
      return 0;
    }

    console.log(`Found ${protocols.length} protocols to compile`);

    const results = await this.compiler.compileProtocols(protocols);
    let successCount = 0;
    let failureCount = 0;

    for (const [protocolId, result] of results) {
      if (result.success) {
        successCount++;
        console.log(`✅ ${protocolId} - Success (${result.generatedFiles.length} files)`);
      } else {
        failureCount++;
        console.log(`❌ ${protocolId} - Failed (${result.errors.length} errors)`);
        
        if (options.verbose && result.errors.length > 0) {
          for (const error of result.errors.slice(0, 3)) { // Show max 3 errors
            console.log(`    - ${error.code}: ${error.message}`);
          }
          if (result.errors.length > 3) {
            console.log(`    - ... and ${result.errors.length - 3} more errors`);
          }
        }
      }
    }

    console.log(`\nBatch compilation complete:`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${failureCount}`);
    console.log(`  - Total: ${protocols.length}`);

    return failureCount > 0 ? 1 : 0;
  }

  /**
   * Parse command line arguments
   */
  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {};

    for (let i = 0; i < args.length; i++) {
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
        case '--protocol':
        case '-p':
          options.protocol = nextArg;
          i++;
          break;
        case '--version':
        case '-v':
          options.version = nextArg;
          i++;
          break;
        case '--format':
        case '-f':
          if (nextArg === 'typescript' || nextArg === 'javascript') {
            options.format = nextArg;
            i++;
          }
          break;
        case '--no-types':
          options.includeTypes = false;
          break;
        case '--no-validators':
          options.includeValidators = false;
          break;
        case '--no-interfaces':
          options.includeInterfaces = false;
          break;
        case '--no-utilities':
          options.includeUtilities = false;
          break;
        case '--no-tests':
          options.includeTests = false;
          break;
        case '--no-docs':
          options.includeDocs = false;
          break;
        case '--strict':
          options.strict = true;
          break;
        case '--batch':
        case '-b':
          options.batch = true;
          break;
        case '--verbose':
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

  /**
   * Setup event handlers for verbose output
   */
  private setupEventHandlers(): void {
    this.compiler.on('compilation-completed', (event) => {
      console.log(`📦 Compilation completed for ${event.protocol.id}`);
    });

    this.compiler.on('batch-compilation-completed', (event) => {
      console.log(`📦 Batch compilation completed - ${event.results.size} protocols processed`);
    });
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
UEP Protocol Compiler CLI v1.0.0

USAGE:
  uep-protocol-compiler [OPTIONS]

OPTIONS:
  -i, --input <file>        Input protocol definition file (.json)
  -o, --output <dir>        Output directory for generated code (default: ./generated)
  -p, --protocol <id>       Protocol ID to compile from repository
  -v, --version <version>   Specific version of protocol (default: latest)
  -f, --format <format>     Output format: typescript|javascript (default: typescript)
  
  --no-types               Skip generating TypeScript types
  --no-validators          Skip generating validation functions
  --no-interfaces          Skip generating agent interfaces
  --no-utilities           Skip generating utility functions
  --no-tests               Skip generating tests
  --no-docs                Skip generating documentation
  
  --strict                 Enable strict validation mode
  -b, --batch              Compile all protocols in repository
  --verbose                Enable verbose output
  -h, --help               Show this help message

EXAMPLES:
  # Compile protocol from file
  uep-protocol-compiler -i ./my-protocol.json -o ./generated

  # Compile protocol from repository
  uep-protocol-compiler -p meta-agent-prd-parser -v 1.0.0

  # Batch compile all protocols
  uep-protocol-compiler --batch --verbose

  # Compile with minimal output
  uep-protocol-compiler -p my-protocol --no-tests --no-docs

REPOSITORY:
  The compiler looks for protocols in the UEP Protocol Schema Repository.
  Use the repository to manage protocol definitions, versions, and dependencies.

MORE INFO:
  Documentation: https://docs.uep.local/protocol-compiler
  Repository: https://github.com/uep/protocol-schemas
`);
  }
}

/**
 * CLI entry point for direct execution
 */
export async function main(): Promise<void> {
  const cli = new ProtocolCompilerCLI();
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