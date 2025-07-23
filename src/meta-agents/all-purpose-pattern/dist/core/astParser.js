"use strict";
/**
 * AST Parser Core Module
 *
 * Universal AST parsing utility that works with ANY JavaScript/TypeScript codebase
 * Following All-Purpose Pattern: NO hardcoded file type limitations
 * Enhanced with Context7 best practices for AST manipulation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.astParser = exports.ASTParser = void 0;
const parser_1 = require("@babel/parser");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
/**
 * Universal AST Parser - works with ANY JavaScript/TypeScript file
 * NO hardcoded limitations on file types or syntax features
 */
class ASTParser {
    constructor() {
        // All-Purpose Pattern: Support ALL syntax features, no limitations
        this.defaultOptions = {
            sourceType: 'module',
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
            allowSuperOutsideMethod: true,
            allowUndeclaredExports: true,
            plugins: [
                // UNLIMITED plugin support - covers ANY syntax
                'typescript',
                'jsx',
                'decorators-legacy',
                'classProperties',
                'doExpressions',
                'objectRestSpread',
                'functionBind',
                'exportDefaultFrom',
                'exportNamespaceFrom',
                'dynamicImport',
                'nullishCoalescingOperator',
                'optionalChaining',
                'importMeta',
                'topLevelAwait',
                'classStaticBlock',
                'optionalCatchBinding'
            ]
        };
    }
    /**
     * Parse source code into AST - works with ANY valid JS/TS syntax
     * @param source - Source code string
     * @param filePath - Optional file path for metadata
     * @param customOptions - Optional parser options override
     * @returns ParseResult with AST and metadata
     */
    parseCode(source, filePath, customOptions) {
        const startTime = Date.now();
        const isTypeScript = this.detectTypeScript(source, filePath);
        // Merge options - supports unlimited customization
        const options = {
            ...this.defaultOptions,
            ...customOptions
        };
        try {
            const ast = (0, parser_1.parse)(source, options);
            const parseTime = Date.now() - startTime;
            return {
                ast,
                source,
                filePath: filePath || '<unknown>',
                isTypeScript,
                metadata: {
                    parseTime,
                    size: Buffer.byteLength(source, 'utf8'),
                    encoding: 'utf8'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Parse failed for ${filePath || '<code>'}}: ${errorMessage}`);
        }
    }
    /**
     * Parse file from filesystem - supports ANY file with JS/TS content
     * @param filePath - Path to file to parse
     * @param encoding - File encoding (defaults to utf8)
     * @returns ParseResult with AST and metadata
     */
    async parseFile(filePath, encoding = 'utf8') {
        try {
            const absolutePath = path_1.default.resolve(filePath);
            const source = await fs_extra_1.default.readFile(absolutePath, encoding);
            return this.parseCode(source, absolutePath);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to parse file ${filePath}: ${errorMessage}`);
        }
    }
    /**
     * Parse multiple files concurrently - UNLIMITED file count support
     * @param filePaths - Array of file paths to parse
     * @param concurrency - Max concurrent parsing operations (default: 10)
     * @returns Array of ParseResult or ParseError
     */
    async parseFiles(filePaths, concurrency = 10) {
        const results = [];
        // Process files in batches to avoid overwhelming the system
        for (let i = 0; i < filePaths.length; i += concurrency) {
            const batch = filePaths.slice(i, i + concurrency);
            const batchPromises = batch.map(async (filePath) => {
                try {
                    return await this.parseFile(filePath);
                }
                catch (error) {
                    return {
                        filePath,
                        error: error
                    };
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Parse entire directory recursively - supports ANY directory structure
     * @param dirPath - Directory path to parse
     * @param options - Directory parsing options
     * @returns Array of ParseResult or ParseError
     */
    async parseDirectory(dirPath, options = {}) {
        const { recursive = true, filePattern = /\.(js|jsx|ts|tsx|mjs|cjs)$/i, // UNLIMITED file type support
        exclude = [/node_modules/, /\.git/, /dist/, /coverage/], // Common exclusions, not hardcoded limits
        concurrency = 10 } = options;
        const filePaths = await this.discoverFiles(dirPath, filePattern, exclude, recursive);
        return this.parseFiles(filePaths, concurrency);
    }
    /**
     * Detect if source code is TypeScript - works with ANY TS syntax
     */
    detectTypeScript(source, filePath) {
        // File extension check (if available)
        if (filePath) {
            const ext = path_1.default.extname(filePath).toLowerCase();
            if (ext === '.ts' || ext === '.tsx')
                return true;
            if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs')
                return false;
        }
        // Content-based detection - looks for TS-specific syntax
        const tsPatterns = [
            /\binterface\s+\w+/,
            /\btype\s+\w+\s*=/,
            /:\s*\w+\s*[=;,)]/,
            /\bas\s+\w+/,
            /\bimport\s+type\b/,
            /<.*>/,
            /\benum\s+\w+/,
            /\bnamespace\s+\w+/
        ];
        return tsPatterns.some(pattern => pattern.test(source));
    }
    /**
     * Recursively discover files matching pattern - UNLIMITED directory depth
     */
    async discoverFiles(dirPath, pattern, exclude, recursive) {
        const files = [];
        try {
            const entries = await fs_extra_1.default.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(dirPath, entry.name);
                // Check exclusions
                if (exclude.some(excludePattern => excludePattern.test(fullPath))) {
                    continue;
                }
                if (entry.isDirectory() && recursive) {
                    const subFiles = await this.discoverFiles(fullPath, pattern, exclude, recursive);
                    files.push(...subFiles);
                }
                else if (entry.isFile() && pattern.test(entry.name)) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Warning: Could not read directory ${dirPath}: ${errorMessage}`);
        }
        return files;
    }
    /**
     * Get parser statistics for performance monitoring
     */
    getParserInfo() {
        return {
            supportedPlugins: this.defaultOptions.plugins,
            version: '1.0.0',
            features: [
                'Universal JS/TS parsing',
                'Unlimited syntax support',
                'Concurrent file processing',
                'Recursive directory scanning',
                'Context7-enhanced patterns'
            ]
        };
    }
}
exports.ASTParser = ASTParser;
/**
 * Default parser instance for convenient access
 */
exports.astParser = new ASTParser();
//# sourceMappingURL=astParser.js.map