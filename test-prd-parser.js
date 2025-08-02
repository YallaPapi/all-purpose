// Test script to verify PRD Parser works with real data

import Parser from './src/meta-agents/prd-parser/parser.js';
import fs from 'fs/promises';

async function testPRDParser() {
    console.log('Testing PRD Parser with REAL functionality...\n');
    
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
    
    // Test 1: Parse content directly
    console.log('Test 1: Parsing PRD content...');
    const result = await parser.parse(testPRD);
    
    console.log('\nFull Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.sections) {
        console.log('\nExtracted Sections:');
        console.log(JSON.stringify(result.sections, null, 2));
    }
    
    if (result.requirements) {
        console.log('\nExtracted Requirements:');
        result.requirements.forEach((req, index) => {
            console.log(`${index + 1}. [${req.priority || 'unknown'}] ${req.text || req}`);
        });
    }
    
    // Test 2: Extract entities
    if (result.entities) {
        console.log('\n\nExtracted Entities:');
        console.log('Technologies:', result.entities.technologies);
        console.log('Features:', result.entities.features);
    }
    
    // Test 3: Generate tasks
    console.log('\n\nGenerated Tasks:');
    if (parser.generateTasks) {
        const tasks = await parser.generateTasks(result);
        tasks.forEach((task, index) => {
            console.log(`${index + 1}. ${task.title} (${task.type})`);
        });
    }
    
    return result;
}

// Run the test
testPRDParser()
    .then(result => {
        console.log('\n✅ PRD Parser test completed successfully!');
        console.log(`Found ${result.requirements.length} requirements`);
    })
    .catch(error => {
        console.error('\n❌ PRD Parser test failed:', error);
        process.exit(1);
    });