#!/usr/bin/env node

/**
 * Documentation Organization Runner
 * 
 * Uses the new autonomous documentation organization system to update
 * all project documentation according to the 5-document framework.
 */

async function runDocumentationOrganizer() {
    console.log('🗂️  Starting Documentation Organization System...');
    
    try {
        // Import our new documentation system
        const { DocumentationOrganizer } = require('./src/uep/DocumentationOrganizer');
        const { DocumentationManager } = require('./src/uep/DocumentationManager');
        const { DocumentationEventListener } = require('./src/uep/DocumentationEventListener');
        const { DocumentationValidationSystem } = require('./src/uep/DocumentationValidationSystem');
        const { DocumentationTemplateEngine } = require('./src/uep/DocumentationTemplateEngine');
        
        console.log('✅ Documentation system modules loaded');
        
        // Initialize the documentation organizer
        const organizer = new DocumentationOrganizer({
            projectRoot: process.cwd(),
            documentationRoot: './docs',
            preserveExisting: true,
            createMissingDirectories: true,
            followNamingConventions: true,
            enableBackups: true,
            backupDirectory: './.docs-backups',
            dryRun: false,
            logLevel: 'verbose'
        });
        
        console.log('📊 Analyzing project structure...');
        const analysis = await organizer.getProjectAnalysis();
        
        console.log(`📈 Project Analysis Results:`);
        console.log(`  - Complexity Score: ${analysis.complexityScore.toFixed(2)}`);
        console.log(`  - Source Directories: ${analysis.sourceDirectories.length}`);
        console.log(`  - Documentation Files: ${analysis.documentationFiles.length}`);
        console.log(`  - Agent Directories: ${analysis.agentDirectories.length}`);
        console.log(`  - Integration Points: ${analysis.integrationPoints.length}`);
        
        // Run the documentation organization
        console.log('🔄 Running documentation organization...');
        const result = await organizer.organizeDocumentation();
        
        console.log(`📋 Organization Results:`);
        console.log(`  - Success: ${result.success ? '✅' : '❌'}`);
        console.log(`  - Files Processed: ${result.summary.filesProcessed}`);
        console.log(`  - Files Created: ${result.summary.filesCreated}`);
        console.log(`  - Files Moved: ${result.summary.filesMoved}`);
        console.log(`  - Directories Created: ${result.summary.directoriesCreated}`);
        console.log(`  - Errors: ${result.summary.errorsCount}`);
        console.log(`  - Improvement Score: ${(result.summary.improvementScore * 100).toFixed(1)}%`);
        console.log(`  - Duration: ${result.summary.duration}ms`);
        
        if (result.changes.length > 0) {
            console.log('\n📝 Changes Made:');
            result.changes.forEach(change => {
                const icon = change.type === 'create' ? '📄' : 
                           change.type === 'move' ? '📋' : 
                           change.type === 'copy' ? '📑' : '🔄';
                console.log(`  ${icon} ${change.type.toUpperCase()}: ${change.from || ''} → ${change.to}`);
                console.log(`     ${change.reason}`);
            });
        }
        
        if (result.errors.length > 0) {
            console.log('\n❌ Errors:');
            result.errors.forEach(error => {
                console.log(`  - ${error.type}: ${error.path} - ${error.message}`);
                if (error.suggestion) {
                    console.log(`    💡 ${error.suggestion}`);
                }
            });
        }
        
        // Initialize validation system
        console.log('\n🔍 Running documentation validation...');
        const validator = new DocumentationValidationSystem({
            enabled: true,
            strictMode: false,
            autoFix: true,
            validateOnSave: true,
            contentValidation: true,
            structureValidation: true,
            formatValidation: true,
            linkValidation: true,
            logLevel: 'minimal'
        });
        
        // Validate all documentation in the docs directory
        const validationResults = await validator.validateAll('./docs');
        const summary = validator.getValidationSummary(validationResults);
        
        console.log(`📊 Validation Results:`);
        console.log(`  - Total Files: ${summary.totalFiles}`);
        console.log(`  - Valid Files: ${summary.validFiles}`);
        console.log(`  - Average Score: ${(summary.averageScore * 100).toFixed(1)}%`);
        console.log(`  - Total Issues: ${summary.totalIssues}`);
        
        // Validate root documentation files
        const rootDocsToValidate = [
            './README.md',
            './CHANGELOG.md', 
            './ENVIRONMENT_SETUP.md'
        ];
        
        console.log('\n📋 Validating root documentation files...');
        for (const docPath of rootDocsToValidate) {
            try {
                const fs = require('fs-extra');
                if (await fs.pathExists(docPath)) {
                    const validation = await validator.validateDocumentation(docPath);
                    const status = validation.valid ? '✅' : '⚠️';
                    console.log(`  ${status} ${docPath}: Score ${(validation.score * 100).toFixed(1)}% (${validation.messages.length} issues)`);
                    
                    if (validation.messages.length > 0) {
                        validation.messages.forEach(msg => {
                            const icon = msg.severity === 'error' ? '❌' : 
                                       msg.severity === 'warning' ? '⚠️' : 'ℹ️';
                            console.log(`     ${icon} ${msg.message}`);
                        });
                    }
                } else {
                    console.log(`  ❌ ${docPath}: File not found`);
                }
            } catch (error) {
                console.log(`  ❌ ${docPath}: Validation error - ${error.message}`);
            }
        }
        
        console.log('\n✅ Documentation organization and validation complete!');
        console.log('\n📈 Summary:');
        console.log(`  - Project documentation has been organized according to the 5-document framework`);
        console.log(`  - ${result.summary.filesCreated} new documentation files created`);
        console.log(`  - ${result.summary.filesMoved} files reorganized for better structure`);
        console.log(`  - ${result.summary.directoriesCreated} directories created for proper organization`);
        console.log(`  - Documentation quality improved by ${(result.summary.improvementScore * 100).toFixed(1)}%`);
        
        return {
            organizationResult: result,
            validationSummary: summary,
            success: result.success && summary.totalIssues < 10
        };
        
    } catch (error) {
        console.error('❌ Documentation organization failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Run the documentation organizer if called directly
if (require.main === module) {
    runDocumentationOrganizer()
        .then(result => {
            console.log('\n🎉 Documentation organization completed successfully!');
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error.message);
            process.exit(1);
        });
}

module.exports = { runDocumentationOrganizer };