/**
 * Hardcoded UI Text Detector
 *
 * Use context7: Detects hardcoded UI text that violates All-Purpose Pattern
 * Following All-Purpose Pattern: Identifies hardcoded UI messages that should be in localization files
 */
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
export class HardcodedUITextDetector {
    id = 'hardcoded-ui-text';
    name = 'Hardcoded UI Text Detector';
    description = 'Detects hardcoded UI text that should be externalized for localization and reuse';
    uiTextPatterns = [
        // User-facing messages
        /welcome/i,
        /hello/i,
        /goodbye/i,
        /thank you/i,
        /please/i,
        /sorry/i,
        /error/i,
        /warning/i,
        /success/i,
        /failed/i,
        /loading/i,
        /save/i,
        /cancel/i,
        /submit/i,
        /delete/i,
        /edit/i,
        /create/i,
        /update/i,
        /confirm/i,
        /continue/i,
        /back/i,
        /next/i,
        /previous/i,
        /close/i,
        /open/i,
        // Form labels and messages
        /name/i,
        /email/i,
        /password/i,
        /username/i,
        /phone/i,
        /address/i,
        /required/i,
        /optional/i,
        /invalid/i,
        /valid/i,
        // Status messages
        /pending/i,
        /approved/i,
        /rejected/i,
        /completed/i,
        /processing/i,
        /active/i,
        /inactive/i,
        // Business-specific terms
        /account/i,
        /profile/i,
        /dashboard/i,
        /settings/i,
        /preferences/i,
        /notification/i,
        /subscription/i,
        /billing/i,
        /payment/i,
        /invoice/i
    ];
    businessTermPatterns = [
        // Industry-specific terms that suggest business logic
        /customer/i,
        /client/i,
        /user/i,
        /member/i,
        /subscriber/i,
        /premium/i,
        /enterprise/i,
        /professional/i,
        /basic/i,
        /standard/i,
        /advanced/i,
        /trial/i,
        /demo/i,
        // Business process terms
        /order/i,
        /purchase/i,
        /checkout/i,
        /payment/i,
        /shipping/i,
        /delivery/i,
        /refund/i,
        /return/i,
        // Location-specific terms
        /united states/i,
        /america/i,
        /europe/i,
        /asia/i,
        /canada/i,
        /australia/i
    ];
    alertMethods = [
        'alert', 'confirm', 'prompt', 'console.log', 'console.warn', 'console.error',
        'toast', 'notification', 'showMessage', 'showError', 'showWarning', 'showSuccess'
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
                // JSX text content
                JSXText: (path) => {
                    const detection = this.analyzeJSXText(path, filePath, sourceCode);
                    if (detection) {
                        results.push(detection);
                    }
                },
                // JSX attribute values
                JSXAttribute: (path) => {
                    const detection = this.analyzeJSXAttribute(path, filePath, sourceCode);
                    if (detection) {
                        results.push(detection);
                    }
                },
                // Alert/notification calls
                CallExpression: (path) => {
                    const detection = this.analyzeCallExpression(path, filePath, sourceCode);
                    if (detection) {
                        results.push(detection);
                    }
                },
                // Object properties that might be UI text
                Property: (path) => {
                    const detection = this.analyzeProperty(path, filePath, sourceCode);
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
    analyzeJSXText(path, filePath, sourceCode) {
        const node = path.node;
        const text = node.value.trim();
        if (!text || text.length < 3)
            return null; // Skip whitespace and very short text
        const suspicionScore = this.calculateTextSuspicionScore(text);
        if (suspicionScore > 0.4) {
            const location = node.loc;
            return {
                ruleId: this.id,
                severity: suspicionScore > 0.7 ? 'warning' : 'info', // UI text is usually less critical
                message: this.generateMessage('JSX text', text),
                filePath,
                lineNumber: location?.start.line || 0,
                columnNumber: location?.start.column || 0,
                codeSnippet: this.getCodeSnippet(sourceCode, location),
                suggestion: this.generateSuggestion('JSX text', text),
                metadata: {
                    textType: 'jsx-text',
                    text: text.substring(0, 100), // Limit length for metadata
                    suspicionScore
                }
            };
        }
        return null;
    }
    analyzeJSXAttribute(path, filePath, sourceCode) {
        const node = path.node;
        if (!node.value || node.value.type !== 'StringLiteral')
            return null;
        const attributeName = node.name.type === 'JSXIdentifier' ? node.name.name : '';
        const text = node.value.value;
        // Focus on user-facing attributes
        const userFacingAttributes = ['title', 'alt', 'placeholder', 'aria-label', 'label'];
        if (!userFacingAttributes.includes(attributeName))
            return null;
        const suspicionScore = this.calculateTextSuspicionScore(text);
        if (suspicionScore > 0.4) {
            const location = node.loc;
            return {
                ruleId: this.id,
                severity: suspicionScore > 0.7 ? 'warning' : 'info',
                message: this.generateMessage(`JSX ${attributeName} attribute`, text),
                filePath,
                lineNumber: location?.start.line || 0,
                columnNumber: location?.start.column || 0,
                codeSnippet: this.getCodeSnippet(sourceCode, location),
                suggestion: this.generateSuggestion(`${attributeName} attribute`, text),
                metadata: {
                    textType: 'jsx-attribute',
                    attributeName,
                    text: text.substring(0, 100),
                    suspicionScore
                }
            };
        }
        return null;
    }
    analyzeCallExpression(path, filePath, sourceCode) {
        const node = path.node;
        const callName = this.getCallName(node);
        if (!this.alertMethods.some(method => callName.includes(method)))
            return null;
        // Check string arguments
        for (const arg of node.arguments) {
            if (arg.type === 'StringLiteral') {
                const text = arg.value;
                const suspicionScore = this.calculateTextSuspicionScore(text);
                if (suspicionScore > 0.4) {
                    const location = node.loc;
                    return {
                        ruleId: this.id,
                        severity: suspicionScore > 0.7 ? 'warning' : 'info',
                        message: this.generateMessage(`${callName} call`, text),
                        filePath,
                        lineNumber: location?.start.line || 0,
                        columnNumber: location?.start.column || 0,
                        codeSnippet: this.getCodeSnippet(sourceCode, location),
                        suggestion: this.generateSuggestion(`${callName} message`, text),
                        metadata: {
                            textType: 'alert-call',
                            callName,
                            text: text.substring(0, 100),
                            suspicionScore
                        }
                    };
                }
            }
        }
        return null;
    }
    analyzeProperty(path, filePath, sourceCode) {
        const node = path.node;
        if (!node.value || node.value.type !== 'StringLiteral')
            return null;
        if (node.key.type !== 'Identifier')
            return null;
        const propertyName = node.key.name;
        const text = node.value.value;
        // Focus on properties that likely contain UI text
        const uiPropertyNames = [
            'title', 'label', 'placeholder', 'message', 'text', 'content', 'description',
            'tooltip', 'hint', 'error', 'warning', 'success', 'info'
        ];
        if (!uiPropertyNames.some(name => propertyName.toLowerCase().includes(name)))
            return null;
        const suspicionScore = this.calculateTextSuspicionScore(text);
        if (suspicionScore > 0.4) {
            const location = node.loc;
            return {
                ruleId: this.id,
                severity: suspicionScore > 0.7 ? 'warning' : 'info',
                message: this.generateMessage(`${propertyName} property`, text),
                filePath,
                lineNumber: location?.start.line || 0,
                columnNumber: location?.start.column || 0,
                codeSnippet: this.getCodeSnippet(sourceCode, location),
                suggestion: this.generateSuggestion(`${propertyName} property`, text),
                metadata: {
                    textType: 'object-property',
                    propertyName,
                    text: text.substring(0, 100),
                    suspicionScore
                }
            };
        }
        return null;
    }
    calculateTextSuspicionScore(text) {
        if (!text || text.length < 3)
            return 0;
        let score = 0;
        // Base score for being user-readable text
        if (/^[a-zA-Z\s.,!?-]+$/.test(text)) {
            score += 0.3;
        }
        // Check for UI patterns
        const uiMatches = this.uiTextPatterns.filter(pattern => pattern.test(text));
        score += Math.min(uiMatches.length * 0.2, 0.5);
        // Check for business terms
        const businessMatches = this.businessTermPatterns.filter(pattern => pattern.test(text));
        score += Math.min(businessMatches.length * 0.3, 0.4);
        // Longer text is more likely to be user-facing
        if (text.length > 20)
            score += 0.2;
        if (text.length > 50)
            score += 0.1;
        // Text with sentence structure
        if (/^[A-Z].*[.!?]$/.test(text))
            score += 0.2;
        // Reduce score for technical terms
        if (/^[a-z_]+$/.test(text) || /[{}()[\]]/.test(text)) {
            score *= 0.5;
        }
        return Math.min(score, 1);
    }
    getCallName(node) {
        if (node.callee.type === 'Identifier') {
            return node.callee.name;
        }
        else if (node.callee.type === 'MemberExpression') {
            let name = '';
            if (node.callee.object.type === 'Identifier') {
                name = node.callee.object.name;
            }
            if (node.callee.property.type === 'Identifier') {
                name += '.' + node.callee.property.name;
            }
            return name;
        }
        return 'unknown';
    }
    generateMessage(context, text) {
        const preview = text.length > 50 ? text.substring(0, 47) + '...' : text;
        return `Hardcoded UI text detected in ${context}: "${preview}". ` +
            `Consider externalizing to support localization and All-Purpose Pattern compliance.`;
    }
    generateSuggestion(context, text) {
        return `Consider moving the text "${text}" from ${context} to a localization file, ` +
            `constants file, or configuration system. This allows for easier translation, ` +
            `content updates, and adaptation to different business contexts without code changes.`;
    }
    getCodeSnippet(sourceCode, location) {
        if (!location)
            return '';
        const lines = sourceCode.split('\n');
        const startLine = Math.max(0, location.start.line - 1);
        const endLine = Math.min(lines.length - 1, location.end.line + 1);
        return lines.slice(startLine, endLine + 1).join('\n');
    }
}
//# sourceMappingURL=HardcodedUITextDetector.js.map