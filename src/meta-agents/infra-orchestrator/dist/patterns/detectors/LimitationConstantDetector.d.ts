/**
 * Limitation Constant Detector
 *
 * Use context7: Detects hardcoded limitation constants that violate All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies hardcoded limits, thresholds, and constraints
 */
import { PatternDetector, DetectionResult } from '../types.js';
export declare class LimitationConstantDetector implements PatternDetector {
    readonly id = "limitation-constants";
    readonly name = "Limitation Constant Detector";
    readonly description = "Detects hardcoded limitation constants that suggest business constraints or arbitrary limits";
    private readonly limitationPatterns;
    private readonly suspiciousValues;
    detect(filePath: string, sourceCode: string): Promise<DetectionResult[]>;
    private analyzeVariableDeclarator;
    private analyzeAssignmentExpression;
    private calculateSuspicionScore;
    private isSuspiciousValue;
    private isTechnicalConstant;
    private isObviousBusinessLimitation;
    private generateMessage;
    private generateSuggestion;
    private getCodeSnippet;
}
//# sourceMappingURL=LimitationConstantDetector.d.ts.map