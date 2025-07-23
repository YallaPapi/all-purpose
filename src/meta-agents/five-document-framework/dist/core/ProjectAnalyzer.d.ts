/**
 * Project Analyzer for Five Document Framework Agent
 *
 * Analyzes project structure to extract configuration and setup info
 * Following All-Purpose Pattern: UNLIMITED project types and structures
 */
import { ProjectConfig } from '../types/index.js';
export declare class ProjectAnalyzer {
    /**
     * Analyze project structure and configuration
     */
    analyzeProject(projectDir: string): Promise<ProjectConfig>;
    /**
     * Analyze package.json for basic project info
     */
    private analyzePackageJson;
    /**
     * Analyze project structure and files
     */
    private analyzeProjectStructure;
    /**
     * Detect technologies used in the project
     */
    private detectTechnologies;
    /**
     * Analyze environment configuration
     */
    private analyzeEnvironments;
    /**
     * Detect integrations and external services
     */
    private detectIntegrations;
    /**
     * Analyze existing documentation
     */
    private analyzeExistingDocs;
    /**
     * Get git information if available
     */
    private getGitInfo;
}
