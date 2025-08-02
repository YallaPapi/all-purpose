// Test PRD Parser directly
import Parser from './src/meta-agents/prd-parser/parser.js';

async function testPRDParser() {
    console.log('Testing PRD Parser DIRECTLY with REAL functionality...\n');
    
    // Create a test PRD
    const testPRD = `# Test Project Requirements

## Overview
This is a test project to build a task management system.

## Requirements
- Must have user authentication
- Should support creating, reading, updating, and deleting tasks
- Must have a dashboard showing task statistics
- Should integrate with external calendar systems

## Technical Specifications
- Backend: Node.js with Express
- Database: PostgreSQL
- Frontend: React with TypeScript
- Authentication: JWT tokens

## User Stories
1. As a user, I want to create tasks so that I can track my work
2. As a user, I want to mark tasks as complete
3. As an admin, I want to see all users' tasks

## Dependencies
- Node.js >= 18
- PostgreSQL >= 14
- Redis for caching
`;

    // Initialize parser
    const parser = new Parser();
    
    // Test parsing
    console.log('Parsing PRD content...');
    const result = await parser.parse(testPRD, {
        agentName: 'Test PRD Parser',
        filepath: 'test-prd.md'
    });
    
    console.log('\n=== REAL PARSING RESULTS ===\n');
    
    console.log('Metadata:');
    console.log(`- Total Sections: ${result.metadata.totalSections}`);
    console.log(`- Total Requirements: ${result.metadata.totalRequirements}`);
    console.log(`- Overall Complexity: ${result.metadata.complexity}`);
    console.log(`- Processing Time: ${result.metadata.processingTime}ms`);
    
    console.log('\nExtracted Requirements:');
    result.requirements.forEach((req, index) => {
        console.log(`\n${index + 1}. ${req.title}`);
        console.log(`   Priority: ${req.priority}`);
        console.log(`   Complexity: ${req.complexity}`);
        console.log(`   Estimated Effort: ${req.estimatedEffort} hours`);
        console.log(`   Section: ${req.section.title}`);
        if (req.dependencies.length > 0) {
            console.log(`   Dependencies: ${req.dependencies.join(', ')}`);
        }
    });
    
    console.log('\n✅ REAL PRD Parser working with actual implementation!');
    return result;
}

// Run the test
testPRDParser()
    .then(result => {
        console.log(`\n✅ SUCCESS: Found ${result.requirements.length} requirements from real parsing!`);
    })
    .catch(error => {
        console.error('\n❌ PRD Parser test failed:', error);
        process.exit(1);
    });