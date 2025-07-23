/**
 * Result Classifier
 *
 * Use context7: Classification and analysis utilities for detection results
 * Following All-Purpose Pattern: Configurable classification that works with ANY result types
 */
export class ResultClassifier {
    categoryMappings = new Map([
        ['hardcoded-arrays', {
                name: 'Business Logic Constraints',
                description: 'Hardcoded arrays that limit business adaptability',
                examples: ['Industry lists', 'Location restrictions', 'Business type limitations'],
                riskLevel: 'high',
                businessImpact: 'Prevents expansion to new markets, industries, or regions',
                technicalImpact: 'Requires code changes for business expansion'
            }],
        ['limitation-constants', {
                name: 'Business Limitations',
                description: 'Hardcoded constants that impose artificial business limits',
                examples: ['User limits', 'File size limits', 'Feature quotas'],
                riskLevel: 'high',
                businessImpact: 'Constrains product scaling and pricing flexibility',
                technicalImpact: 'Creates deployment and configuration dependencies'
            }],
        ['conditional-logic', {
                name: 'Business Rule Logic',
                description: 'Hardcoded conditional logic based on business values',
                examples: ['Plan-based features', 'Role-based access', 'Status-based behavior'],
                riskLevel: 'medium',
                businessImpact: 'Reduces flexibility in business rule changes',
                technicalImpact: 'Increases maintenance overhead for business changes'
            }],
        ['hardcoded-endpoints', {
                name: 'Infrastructure Dependencies',
                description: 'Hardcoded API endpoints and service URLs',
                examples: ['Environment-specific URLs', 'Third-party service endpoints'],
                riskLevel: 'high',
                businessImpact: 'Limits deployment flexibility and vendor options',
                technicalImpact: 'Creates environment coupling and deployment risks'
            }],
        ['hardcoded-ui-text', {
                name: 'User Experience Constraints',
                description: 'Hardcoded UI text that limits localization and customization',
                examples: ['Error messages', 'Button labels', 'Form placeholders'],
                riskLevel: 'low',
                businessImpact: 'Prevents internationalization and brand customization',
                technicalImpact: 'Increases maintenance cost for UI changes'
            }]
    ]);
    /**
     * Classify and analyze detection results
     */
    classifyResults(results) {
        const byCategory = { businessLogic: 0, infrastructure: 0, userInterface: 0, configuration: 0, other: 0 };
        const bySeverity = { error: 0, warning: 0, info: 0 };
        const byRisk = { high: 0, medium: 0, low: 0 };
        const fileIssues = new Map();
        // Analyze each result
        for (const result of results) {
            // Count by severity
            bySeverity[result.severity]++;
            // Classify by category and risk
            const category = this.categorizeResult(result);
            byCategory[category]++;
            const riskLevel = this.getRiskLevel(result);
            byRisk[riskLevel]++;
            // Track file-level statistics
            const fileStats = fileIssues.get(result.filePath) || { count: 0, riskScore: 0 };
            fileStats.count++;
            fileStats.riskScore += this.calculateRiskScore(result);
            fileIssues.set(result.filePath, fileStats);
        }
        // Generate top files list
        const topFiles = Array.from(fileIssues.entries())
            .map(([filePath, stats]) => ({
            filePath,
            issueCount: stats.count,
            riskScore: stats.riskScore / stats.count // Average risk score
        }))
            .sort((a, b) => b.riskScore - a.riskScore || b.issueCount - a.issueCount)
            .slice(0, 10);
        // Generate recommendations
        const recommendations = this.generateRecommendations(results, byCategory, bySeverity);
        return {
            totalResults: results.length,
            byCategory,
            bySeverity,
            byRisk,
            topFiles,
            recommendations
        };
    }
    /**
     * Get detailed category information
     */
    getCategoryInfo(ruleId) {
        return this.categoryMappings.get(ruleId);
    }
    /**
     * Generate a priority matrix for issues
     */
    generatePriorityMatrix(results) {
        return results.map(result => {
            const riskLevel = this.getRiskLevel(result);
            const category = this.categorizeResult(result);
            let priority;
            let reasoning;
            if (result.severity === 'error' && riskLevel === 'high') {
                priority = 'critical';
                reasoning = 'High-risk error that could impact business operations';
            }
            else if (result.severity === 'error' || riskLevel === 'high') {
                priority = 'high';
                reasoning = result.severity === 'error'
                    ? 'Error-level issue requiring immediate attention'
                    : 'High business impact requiring prompt resolution';
            }
            else if (result.severity === 'warning' && riskLevel === 'medium') {
                priority = 'medium';
                reasoning = 'Moderate impact issue that should be addressed';
            }
            else {
                priority = 'low';
                reasoning = 'Low priority issue for future improvement';
            }
            return { result, priority, reasoning };
        }).sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    /**
     * Generate remediation suggestions for a specific result
     */
    generateRemediationSuggestion(result) {
        const category = this.categoryMappings.get(result.ruleId);
        const suggestions = {
            'hardcoded-arrays': {
                quickFix: 'Move the array to a configuration file or environment variable',
                strategicFix: 'Implement a dynamic data source (database, API, or CMS) for managing lists',
                preventionStrategy: 'Establish code review guidelines to flag hardcoded business data',
                businessJustification: 'Enables rapid expansion to new markets without development cycles'
            },
            'limitation-constants': {
                quickFix: 'Move constants to a configuration file with environment overrides',
                strategicFix: 'Implement a feature flag system with dynamic limit management',
                preventionStrategy: 'Create architectural guidelines separating business rules from code',
                businessJustification: 'Allows flexible pricing models and rapid plan adjustments'
            },
            'conditional-logic': {
                quickFix: 'Extract conditions to configuration-driven rule engine',
                strategicFix: 'Implement a business rules engine with external rule management',
                preventionStrategy: 'Use strategy pattern and dependency injection for business logic',
                businessJustification: 'Enables rapid business rule changes without deployment cycles'
            },
            'hardcoded-endpoints': {
                quickFix: 'Move URLs to environment variables or configuration files',
                strategicFix: 'Implement service discovery and configuration management',
                preventionStrategy: 'Use infrastructure-as-code and environment-specific deployments',
                businessJustification: 'Enables multi-environment deployments and vendor flexibility'
            },
            'hardcoded-ui-text': {
                quickFix: 'Extract text to localization files (i18n)',
                strategicFix: 'Implement a content management system for dynamic text',
                preventionStrategy: 'Establish UI development guidelines requiring externalized text',
                businessJustification: 'Enables internationalization and brand customization'
            }
        };
        return suggestions[result.ruleId] || {
            strategicFix: 'Refactor to use configuration-driven approach',
            preventionStrategy: 'Implement code review guidelines for hardcoded values',
            businessJustification: 'Improves system flexibility and maintainability'
        };
    }
    categorizeResult(result) {
        switch (result.ruleId) {
            case 'hardcoded-arrays':
            case 'limitation-constants':
            case 'conditional-logic':
                return 'businessLogic';
            case 'hardcoded-endpoints':
                return 'infrastructure';
            case 'hardcoded-ui-text':
                return 'userInterface';
            default:
                return 'other';
        }
    }
    getRiskLevel(result) {
        const category = this.categoryMappings.get(result.ruleId);
        if (category) {
            return category.riskLevel;
        }
        // Fallback based on severity
        switch (result.severity) {
            case 'error': return 'high';
            case 'warning': return 'medium';
            case 'info': return 'low';
            default: return 'low';
        }
    }
    calculateRiskScore(result) {
        const severityScore = { error: 3, warning: 2, info: 1 }[result.severity];
        const riskScore = { high: 3, medium: 2, low: 1 }[this.getRiskLevel(result)];
        // Additional factors
        let multiplier = 1;
        // Business-critical files get higher scores
        if (result.filePath.includes('business') || result.filePath.includes('core')) {
            multiplier += 0.5;
        }
        // Main/index files get higher scores
        if (result.filePath.includes('index') || result.filePath.includes('main')) {
            multiplier += 0.3;
        }
        return (severityScore + riskScore) * multiplier;
    }
    generateRecommendations(results, byCategory, bySeverity) {
        const recommendations = [];
        // High-level strategic recommendations
        if (byCategory.businessLogic > 5) {
            recommendations.push('Consider implementing a business rules engine to externalize business logic and enable rapid adaptation to new markets and requirements.');
        }
        if (byCategory.infrastructure > 3) {
            recommendations.push('Implement configuration management and service discovery to improve deployment flexibility and reduce environment coupling.');
        }
        if (bySeverity.error > 0) {
            recommendations.push(`Address ${bySeverity.error} critical error(s) immediately as they pose significant risks to system adaptability.`);
        }
        if (byCategory.userInterface > 10) {
            recommendations.push('Implement internationalization (i18n) infrastructure to support multiple languages and customizable user experiences.');
        }
        // Process improvements
        recommendations.push('Establish code review guidelines that flag hardcoded business values and require configuration-driven alternatives.');
        if (results.length > 20) {
            recommendations.push('Consider implementing automated detection of anti-patterns in your CI/CD pipeline to prevent future violations.');
        }
        return recommendations;
    }
}
//# sourceMappingURL=ResultClassifier.js.map