/**
 * Hardcoded Array Detector
 *
 * Use context7: Detects hardcoded arrays that violate All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies industry lists, location restrictions, business type limitations
 */
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
export class HardcodedArrayDetector {
    id = 'hardcoded-arrays';
    name = 'Hardcoded Array Detector';
    description = 'Detects hardcoded arrays that suggest business limitations or industry-specific constraints';
    suspiciousPatterns = [
        // Industry patterns
        /industries?/i,
        /sectors?/i,
        /business.*types?/i,
        /categories/i,
        // Location patterns
        /countries/i,
        /states?/i,
        /cities/i,
        /regions?/i,
        /locations?/i,
        /zones?/i,
        // Business limitation patterns
        /plans?/i,
        /tiers?/i,
        /levels?/i,
        /types?/i,
        /options?/i,
        /choices?/i,
        // Status/enum patterns
        /status(es)?/i,
        /roles?/i,
        /permissions?/i,
        /access.*levels?/i
    ];
    commonHardcodedValues = [
        // Industries
        'technology', 'finance', 'healthcare', 'manufacturing', 'retail', 'education',
        'construction', 'agriculture', 'transportation', 'energy', 'media',
        // Countries/Locations
        'usa', 'canada', 'uk', 'germany', 'france', 'japan', 'australia',
        'united states', 'united kingdom',
        // Business types
        'startup', 'enterprise', 'small business', 'corporation', 'nonprofit',
        // Plans/Tiers
        'free', 'basic', 'premium', 'pro', 'enterprise', 'starter'
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
                ArrayExpression: (path) => {
                    const detection = this.analyzeArrayExpression(path, filePath, sourceCode);
                    if (detection) {
                        results.push(detection);
                    }
                }
            });
        }
        catch (error) {
            // Log parse error but don't fail the analysis
            console.warn(`Failed to parse ${filePath}:`, error);
        }
        return results;
    }
    analyzeArrayExpression(path, filePath, sourceCode) {
        const node = path.node;
        const elements = node.elements;
        // Only analyze arrays with string/number literals
        if (elements.length === 0)
            return null;
        const literalElements = elements.filter((el) => el !== null && (el.type === 'StringLiteral' || el.type === 'NumericLiteral'));
        if (literalElements.length < 2)
            return null; // Need at least 2 elements to be suspicious
        // Check if this looks like a hardcoded business constraint
        const suspicionScore = this.calculateSuspicionScore(path, literalElements);
        if (suspicionScore > 0.6) {
            const location = node.loc;
            const variableContext = this.getVariableContext(path);
            return {
                ruleId: this.id,
                severity: suspicionScore > 0.8 ? 'error' : 'warning',
                message: this.generateMessage(variableContext, literalElements),
                filePath,
                lineNumber: location?.start.line || 0,
                columnNumber: location?.start.column || 0,
                codeSnippet: this.getCodeSnippet(sourceCode, location),
                suggestion: this.generateSuggestion(variableContext),
                metadata: {
                    arraySize: elements.length,
                    suspicionScore,
                    variableName: variableContext?.variableName,
                    containsStringLiterals: literalElements.some(el => el.type === 'StringLiteral'),
                    containsNumericLiterals: literalElements.some(el => el.type === 'NumericLiteral')
                }
            };
        }
        return null;
    }
    calculateSuspicionScore(path, elements) {
        let score = 0;
        // Check variable name patterns
        const variableContext = this.getVariableContext(path);
        if (variableContext?.variableName) {
            const nameMatch = this.suspiciousPatterns.some(pattern => pattern.test(variableContext.variableName));
            if (nameMatch)
                score += 0.4;
        }
        // Check array content patterns
        const stringElements = elements.filter(el => el.type === 'StringLiteral');
        if (stringElements.length > 0) {
            const contentMatches = stringElements.filter(el => this.commonHardcodedValues.some(value => el.value.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(el.value.toLowerCase())));
            const contentScore = Math.min(contentMatches.length / stringElements.length, 1) * 0.5;
            score += contentScore;
        }
        // Boost score for larger arrays (more likely to be business constraints)
        if (elements.length >= 5)
            score += 0.2;
        if (elements.length >= 10)
            score += 0.1;
        return Math.min(score, 1);
    }
    getVariableContext(path) {
        let current = path.parent;
        if (current.type === 'VariableDeclarator' && current.id.type === 'Identifier') {
            return {
                variableName: current.id.name,
                parentType: 'VariableDeclarator'
            };
        }
        if (current.type === 'AssignmentExpression' && current.left.type === 'Identifier') {
            return {
                variableName: current.left.name,
                parentType: 'AssignmentExpression'
            };
        }
        // Check for object property (e.g., in object literals)
        const propertyNode = current; // Type assertion for Babel node
        if (propertyNode.key && propertyNode.key.type === 'Identifier' && propertyNode.type === 'Property') {
            return {
                variableName: propertyNode.key.name,
                parentType: 'Property'
            };
        }
        return null;
    }
    generateMessage(context, elements) {
        const variableName = context?.variableName || 'array';
        const elementCount = elements.length;
        return `Potential hardcoded business constraint detected in '${variableName}' (${elementCount} elements). ` +
            `Consider moving to configuration or using dynamic data sources to follow All-Purpose Pattern.`;
    }
    generateSuggestion(context) {
        const variableName = context?.variableName || 'this array';
        return `Consider replacing ${variableName} with a configuration file, environment variable, ` +
            `or database lookup to make the code adaptable to different business contexts.`;
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
//# sourceMappingURL=HardcodedArrayDetector.js.map