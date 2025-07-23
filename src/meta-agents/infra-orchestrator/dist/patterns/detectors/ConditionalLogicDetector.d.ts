/**
 * Conditional Logic Detector
 *
 * Use context7: Detects hardcoded conditional logic that violates All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies if/switch statements based on hardcoded business values
 */
import { PatternDetector, DetectionResult } from '../types.js';
export declare class ConditionalLogicDetector implements PatternDetector {
    readonly id = "conditional-logic";
    readonly name = "Conditional Logic Detector";
    readonly description = "Detects hardcoded conditional logic that suggests business rule constraints";
    private readonly businessValuePatterns;
    private readonly suspiciousNumericValues;
    detect(filePath: string, sourceCode: string): Promise<DetectionResult[]>;
    private analyzeIfStatement;
    private analyzeSwitchStatement;
    private extractHardcodedValues;
    private calculateSuspicionScore;
    private isSuspiciousNumber;
    private generateMessage;
    private generateSuggestion;
    private getCodeSnippet;
}
//# sourceMappingURL=ConditionalLogicDetector.d.ts.map