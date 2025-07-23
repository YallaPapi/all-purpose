/**
 * Result Classifier
 *
 * Use context7: Classification and analysis utilities for detection results
 * Following All-Purpose Pattern: Configurable classification that works with ANY result types
 */
import { DetectionResult } from './types.js';
export interface ClassificationReport {
    totalResults: number;
    byCategory: {
        businessLogic: number;
        infrastructure: number;
        userInterface: number;
        configuration: number;
        other: number;
    };
    bySeverity: {
        error: number;
        warning: number;
        info: number;
    };
    byRisk: {
        high: number;
        medium: number;
        low: number;
    };
    topFiles: Array<{
        filePath: string;
        issueCount: number;
        riskScore: number;
    }>;
    recommendations: string[];
}
export interface IssueCategory {
    name: string;
    description: string;
    examples: string[];
    riskLevel: 'high' | 'medium' | 'low';
    businessImpact: string;
    technicalImpact: string;
}
export declare class ResultClassifier {
    private readonly categoryMappings;
    /**
     * Classify and analyze detection results
     */
    classifyResults(results: DetectionResult[]): ClassificationReport;
    /**
     * Get detailed category information
     */
    getCategoryInfo(ruleId: string): IssueCategory | undefined;
    /**
     * Generate a priority matrix for issues
     */
    generatePriorityMatrix(results: DetectionResult[]): Array<{
        result: DetectionResult;
        priority: 'critical' | 'high' | 'medium' | 'low';
        reasoning: string;
    }>;
    /**
     * Generate remediation suggestions for a specific result
     */
    generateRemediationSuggestion(result: DetectionResult): {
        quickFix?: string;
        strategicFix: string;
        preventionStrategy: string;
        businessJustification: string;
    };
    private categorizeResult;
    private getRiskLevel;
    private calculateRiskScore;
    private generateRecommendations;
}
//# sourceMappingURL=ResultClassifier.d.ts.map