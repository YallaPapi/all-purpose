/**
 * Hardcoded UI Text Detector
 *
 * Use context7: Detects hardcoded UI text that violates All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies hardcoded UI messages that should be in localization files
 */
import { PatternDetector, DetectionResult } from '../types.js';
export declare class HardcodedUITextDetector implements PatternDetector {
    readonly id = "hardcoded-ui-text";
    readonly name = "Hardcoded UI Text Detector";
    readonly description = "Detects hardcoded UI text that should be externalized for localization and reuse";
    private readonly uiTextPatterns;
    private readonly businessTermPatterns;
    private readonly alertMethods;
    detect(filePath: string, sourceCode: string): Promise<DetectionResult[]>;
    private analyzeJSXText;
    private analyzeJSXAttribute;
    private analyzeCallExpression;
    private analyzeProperty;
    private calculateTextSuspicionScore;
    private getCallName;
    private generateMessage;
    private generateSuggestion;
    private getCodeSnippet;
}
//# sourceMappingURL=HardcodedUITextDetector.d.ts.map