/**
 * Hardcoded Array Detector
 *
 * Use context7: Detects hardcoded arrays that violate All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies industry lists, location restrictions, business type limitations
 */
import { PatternDetector, DetectionResult } from '../types.js';
export declare class HardcodedArrayDetector implements PatternDetector {
    readonly id = "hardcoded-arrays";
    readonly name = "Hardcoded Array Detector";
    readonly description = "Detects hardcoded arrays that suggest business limitations or industry-specific constraints";
    private readonly suspiciousPatterns;
    private readonly commonHardcodedValues;
    detect(filePath: string, sourceCode: string): Promise<DetectionResult[]>;
    private analyzeArrayExpression;
    private calculateSuspicionScore;
    private getVariableContext;
    private generateMessage;
    private generateSuggestion;
    private getCodeSnippet;
}
//# sourceMappingURL=HardcodedArrayDetector.d.ts.map