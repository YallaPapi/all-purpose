/**
 * Hardcoded Endpoint Detector
 *
 * Use context7: Detects hardcoded API endpoints that violate All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies hardcoded URLs in HTTP calls that should be configurable
 */
import { PatternDetector, DetectionResult } from '../types.js';
export declare class HardcodedEndpointDetector implements PatternDetector {
    readonly id = "hardcoded-endpoints";
    readonly name = "Hardcoded Endpoint Detector";
    readonly description = "Detects hardcoded API endpoints and URLs that should be configurable";
    private readonly httpMethods;
    private readonly urlPatterns;
    private readonly suspiciousEndpointPatterns;
    detect(filePath: string, sourceCode: string): Promise<DetectionResult[]>;
    private analyzeCallExpression;
    private isHttpCall;
    private getCallName;
    private getMemberExpressionName;
    private extractUrlArguments;
    private isHardcodedEndpoint;
    private calculateSuspicionScore;
    private categorizeUrl;
    private generateMessage;
    private generateSuggestion;
    private getCodeSnippet;
}
//# sourceMappingURL=HardcodedEndpointDetector.d.ts.map