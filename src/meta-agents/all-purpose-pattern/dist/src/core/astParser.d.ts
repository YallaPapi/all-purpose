/**
 * AST Parser Core Module
 *
 * Universal AST parsing utility that works with ANY JavaScript/TypeScript codebase
 * Following All-Purpose Pattern: NO hardcoded file type limitations
 * Enhanced with Context7 best practices for AST manipulation
 */
import { ParserOptions } from '@babel/parser';
import { Node } from '@babel/types';
export interface ParseResult {
    ast: Node;
    source: string;
    filePath: string;
    isTypeScript: boolean;
    metadata: {
        parseTime: number;
        size: number;
        encoding: string;
    };
}
export interface ParseError {
    filePath: string;
    error: Error;
    source?: string;
}
/**
 * Universal AST Parser - works with ANY JavaScript/TypeScript file
 * NO hardcoded limitations on file types or syntax features
 */
export declare class ASTParser {
    private defaultOptions;
    constructor();
    /**
     * Parse source code into AST - works with ANY valid JS/TS syntax
     * @param source - Source code string
     * @param filePath - Optional file path for metadata
     * @param customOptions - Optional parser options override
     * @returns ParseResult with AST and metadata
     */
    parseCode(source: string, filePath?: string, customOptions?: Partial<ParserOptions>): ParseResult;
    /**
     * Parse file from filesystem - supports ANY file with JS/TS content
     * @param filePath - Path to file to parse
     * @param encoding - File encoding (defaults to utf8)
     * @returns ParseResult with AST and metadata
     */
    parseFile(filePath: string, encoding?: BufferEncoding): Promise<ParseResult>;
    /**
     * Parse multiple files concurrently - UNLIMITED file count support
     * @param filePaths - Array of file paths to parse
     * @param concurrency - Max concurrent parsing operations (default: 10)
     * @returns Array of ParseResult or ParseError
     */
    parseFiles(filePaths: string[], concurrency?: number): Promise<(ParseResult | ParseError)[]>;
    /**
     * Parse entire directory recursively - supports ANY directory structure
     * @param dirPath - Directory path to parse
     * @param options - Directory parsing options
     * @returns Array of ParseResult or ParseError
     */
    parseDirectory(dirPath: string, options?: {
        recursive?: boolean;
        filePattern?: RegExp;
        exclude?: RegExp[];
        concurrency?: number;
    }): Promise<(ParseResult | ParseError)[]>;
    /**
     * Detect if source code is TypeScript - works with ANY TS syntax
     */
    private detectTypeScript;
    /**
     * Recursively discover files matching pattern - UNLIMITED directory depth
     */
    private discoverFiles;
    /**
     * Get parser statistics for performance monitoring
     */
    getParserInfo(): Record<string, any>;
}
/**
 * Default parser instance for convenient access
 */
export declare const astParser: ASTParser;
//# sourceMappingURL=astParser.d.ts.map