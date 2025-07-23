/**
 * Limitation Constant Detector
 *
 * Use context7: Detects hardcoded limitation constants that violate All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies hardcoded limits, thresholds, and constraints
 */
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
export class LimitationConstantDetector {
    id = 'limitation-constants';
    name = 'Limitation Constant Detector';
    description = 'Detects hardcoded limitation constants that suggest business constraints or arbitrary limits';
    limitationPatterns = [
        // Quantity/Size limitations
        /^MAX_/i,
        /^MIN_/i,
        /^LIMIT/i,
        /^THRESHOLD/i,
        /.*_LIMIT$/i,
        /.*_MAX$/i,
        /.*_MIN$/i,
        /.*_THRESHOLD$/i,
        // Business limitations
        /MAX.*USERS?/i,
        /MAX.*ITEMS?/i,
        /MAX.*FILES?/i,
        /MAX.*SIZE/i,
        /MAX.*COUNT/i,
        /MAX.*LENGTH/i,
        // Plan/Tier limitations
        /FREE.*LIMIT/i,
        /BASIC.*LIMIT/i,
        /PREMIUM.*LIMIT/i,
        /TRIAL.*LIMIT/i,
        /.*_QUOTA$/i,
        // Time-based limitations
        /TIMEOUT/i,
        /EXPIRY/i,
        /TTL/i,
        /DURATION/i,
        /INTERVAL/i,
        // Feature flags that look like business constraints
        /ENABLED.*COUNT/i,
        /ALLOWED.*COUNT/i,
        /PERMITTED.*SIZE/i
    ];
    suspiciousValues = [
        // Common business limitation values
        5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
        // Trial/demo limitations
        3, 7, 14, 30, 90,
        // File size limitations (MB)
        1, 2, 5, 10, 25, 50, 100
    ];
    async detect(filePath, sourceCode) {
        const results = [];
        try {
            const ast = parse(sourceCode, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx', 'decorators-legacy'],
                allowImportExportEverywhere: true,
                allowReturnOutsideFunction: true
            });
            traverse(ast, {
                VariableDeclarator: (path) => {
                    const detection = this.analyzeVariableDeclarator(path, filePath, sourceCode);
                    if (detection) {
                        results.push(detection);
                    }
                },
                AssignmentExpression: (path) => {
                    const detection = this.analyzeAssignmentExpression(path, filePath, sourceCode);
                    if (detection) {
                        results.push(detection);
                    }
                }
            });
        }
        catch (error) {
            console.warn(`Failed to parse ${filePath}:`, error);
        }
        return results;
    }
    analyzeVariableDeclarator(path, filePath, sourceCode) {
        const node = path.node;
        // Check if it's a numeric literal assignment
        if (node.init?.type !== 'NumericLiteral')
            return null;
        if (node.id.type !== 'Identifier')
            return null;
        const variableName = node.id.name;
        const value = node.init.value;
        const suspicionScore = this.calculateSuspicionScore(variableName, value);
        if (suspicionScore > 0.5) {
            const location = node.loc;
            return {
                ruleId: this.id,
                severity: suspicionScore > 0.8 ? 'error' : 'warning',
                message: this.generateMessage(variableName, value, 'variable'),
                filePath,
                lineNumber: location?.start.line || 0,
                columnNumber: location?.start.column || 0,
                codeSnippet: this.getCodeSnippet(sourceCode, location),
                suggestion: this.generateSuggestion(variableName, value),
                metadata: {
                    variableName,
                    value,
                    suspicionScore,
                    declarationType: 'variable'
                }
            };
        }
        return null;
    }
    analyzeAssignmentExpression(path, filePath, sourceCode) {
        const node = path.node;
        // Check if it's a numeric literal assignment
        if (node.right.type !== 'NumericLiteral')
            return null;
        if (node.left.type !== 'Identifier')
            return null;
        const variableName = node.left.name;
        const value = node.right.value;
        const suspicionScore = this.calculateSuspicionScore(variableName, value);
        if (suspicionScore > 0.5) {
            const location = node.loc;
            return {
                ruleId: this.id,
                severity: suspicionScore > 0.8 ? 'error' : 'warning',
                message: this.generateMessage(variableName, value, 'assignment'),
                filePath,
                lineNumber: location?.start.line || 0,
                columnNumber: location?.start.column || 0,
                codeSnippet: this.getCodeSnippet(sourceCode, location),
                suggestion: this.generateSuggestion(variableName, value),
                metadata: {
                    variableName,
                    value,
                    suspicionScore,
                    declarationType: 'assignment'
                }
            };
        }
        return null;
    }
    calculateSuspicionScore(variableName, value) {
        let score = 0;
        // Check variable name patterns
        const nameMatch = this.limitationPatterns.some(pattern => pattern.test(variableName));
        if (nameMatch)
            score += 0.6;
        // Check for suspicious values
        if (this.suspiciousValues.includes(value)) {
            score += 0.3;
        }
        else if (this.isSuspiciousValue(value)) {
            score += 0.2;
        }
        // Penalize very technical constants (likely configuration, not business limits)
        if (this.isTechnicalConstant(variableName, value)) {
            score *= 0.5;
        }
        // Boost score for obvious business limitation names
        if (this.isObviousBusinessLimitation(variableName)) {
            score += 0.2;
        }
        return Math.min(score, 1);
    }
    isSuspiciousValue(value) {
        // Round numbers that look like business constraints
        if (value > 0 && value <= 10000) {
            // Check if it's a "round" number
            const str = value.toString();
            const roundPatterns = [
                /^[1-9]$/, // Single digits
                /^[1-9]0$/, // 10, 20, 30, etc.
                /^[1-9]00$/, // 100, 200, 300, etc.
                /^[1-9]000$/, // 1000, 2000, etc.
                /^[1-9][05]$/, // 15, 25, 35, etc.
                /^[1-9][05]0$/, // 150, 250, etc.
            ];
            return roundPatterns.some(pattern => pattern.test(str));
        }
        return false;
    }
    isTechnicalConstant(variableName, value) {
        const technicalPatterns = [
            /PORT/i,
            /TIMEOUT/i,
            /BUFFER/i,
            /SOCKET/i,
            /HTTP/i,
            /TCP/i,
            /UDP/i,
            /SSL/i,
            /TLS/i,
            /VERSION/i
        ];
        // Technical constants often have specific technical values
        const technicalValues = [
            80, 443, 3000, 8080, 8000, 5000, // Ports
            30000, 60000, 120000, // Timeouts in ms
            1024, 2048, 4096, 8192 // Buffer sizes
        ];
        return technicalPatterns.some(pattern => pattern.test(variableName)) ||
            technicalValues.includes(value);
    }
    isObviousBusinessLimitation(variableName) {
        const businessPatterns = [
            /FREE.*LIMIT/i,
            /TRIAL.*LIMIT/i,
            /MAX.*USER/i,
            /MAX.*PLAN/i,
            /QUOTA/i,
            /SUBSCRIPTION.*LIMIT/i
        ];
        return businessPatterns.some(pattern => pattern.test(variableName));
    }
    generateMessage(variableName, value, type) {
        return `Potential hardcoded business limitation detected: '${variableName} = ${value}'. ` +
            `This appears to be a business constraint that should be configurable to follow All-Purpose Pattern.`;
    }
    generateSuggestion(variableName, value) {
        return `Consider moving '${variableName}' to a configuration file, environment variable, ` +
            `or database setting. This allows the limitation to be adjusted without code changes ` +
            `and makes the system adaptable to different business contexts or deployment environments.`;
    }
    getCodeSnippet(sourceCode, location) {
        if (!location)
            return '';
        const lines = sourceCode.split('\n');
        const startLine = Math.max(0, location.start.line - 2);
        const endLine = Math.min(lines.length - 1, location.end.line);
        return lines.slice(startLine, endLine + 1).join('\n');
    }
}
//# sourceMappingURL=LimitationConstantDetector.js.map